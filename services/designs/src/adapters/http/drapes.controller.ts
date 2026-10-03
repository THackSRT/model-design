import type { DrapeRequest } from '@atelier/contracts-ts';
import { isUuid } from '@atelier/kernel';
import { contractValidator } from '@atelier/service-kit';
import { Readable } from 'node:stream';
import type { ReadableStream as WebReadableStream } from 'node:stream/web';
import {
  Body,
  Controller,
  Get,
  Header,
  Inject,
  Param,
  Post,
  Res,
  StreamableFile,
} from '@nestjs/common';
import type { DesignsUseCases } from '../../application/use-cases/index.js';
import type { DesignId } from '../../domain/design.js';
import type { DrapeId } from '../../domain/drape.js';
import type { OrganizationContext } from './organization-context.js';
import { presentDrape } from './presenters.js';
import { failWith } from './problems.js';
import { ORGANIZATION_CONTEXT, USE_CASES } from './tokens.js';

const validDrapeRequest = contractValidator<DrapeRequest>('drapeRequest');

interface ReplyLike {
  status(code: number): unknown;
  setHeader(name: string, value: string): unknown;
}

const designIdOf = (raw: string): DesignId =>
  isUuid(raw) ? (raw as DesignId) : failWith({ kind: 'design-not-found' });

const drapeIdOf = (raw: string): DrapeId =>
  isUuid(raw) ? (raw as DrapeId) : failWith({ kind: 'drape-not-found' });

const versionNumberOf = (raw: string): number => {
  const n = Number(raw);
  return Number.isSafeInteger(n) && n >= 1 ? n : failWith({ kind: 'version-not-found' });
};

/**
 * Drapés d'une version (ADR 0013), dont le téléchargement du modèle 3D (`…/model`, lu dans le stockage objet).
 * Jamais de mesure dans une réponse ni dans un journal : seul l'événement destiné au moteur les porte.
 */
@Controller('v1/designs/:designId/versions/:number/drapes')
export class DrapesController {
  constructor(
    @Inject(USE_CASES) private readonly useCases: DesignsUseCases,
    @Inject(ORGANIZATION_CONTEXT) private readonly organization: OrganizationContext,
  ) {}

  @Post()
  @Header('Cache-Control', 'no-store')
  async request(
    @Param('designId') designId: string,
    @Param('number') number: string,
    @Body() body: unknown,
    @Res({ passthrough: true }) reply: ReplyLike,
  ) {
    const request = validDrapeRequest(body);
    if (request.isErr()) return failWith(request.error);
    const id = designIdOf(designId);
    const n = versionNumberOf(number);
    const result = await this.useCases.requestVersionDrape({
      organizationId: this.organization.current(),
      designId: id,
      number: n,
      request: request.value,
    });
    if (result.isErr()) return failWith(result.error);
    const { drape, created } = result.value;
    reply.status(created ? 202 : 200);
    if (created) reply.setHeader('Location', `/v1/designs/${id}/versions/${n}/drapes/${drape.id}`);
    return presentDrape(drape);
  }

  @Get(':drapeId')
  @Header('Cache-Control', 'no-store')
  async get(
    @Param('designId') designId: string,
    @Param('number') number: string,
    @Param('drapeId') drapeId: string,
  ) {
    const drape = await this.useCases.getVersionDrape({
      organizationId: this.organization.current(),
      designId: designIdOf(designId),
      number: versionNumberOf(number),
      drapeId: drapeIdOf(drapeId),
    });
    return drape.isOk() ? presentDrape(drape.value) : failWith(drape.error);
  }

  @Get(':drapeId/model')
  @Header('Cache-Control', 'private, no-store')
  @Header('X-Content-Type-Options', 'nosniff')
  async model(
    @Param('designId') designId: string,
    @Param('number') number: string,
    @Param('drapeId') drapeId: string,
  ): Promise<StreamableFile> {
    const model = await this.useCases.getVersionDrapeModel({
      organizationId: this.organization.current(),
      designId: designIdOf(designId),
      number: versionNumberOf(number),
      drapeId: drapeIdOf(drapeId),
    });
    if (model.isErr()) return failWith(model.error);
    const { body, sizeBytes } = model.value;
    return new StreamableFile(Readable.fromWeb(body as WebReadableStream<Uint8Array>), {
      type: 'model/gltf-binary',
      ...(sizeBytes === undefined ? {} : { length: sizeBytes }),
    });
  }
}
