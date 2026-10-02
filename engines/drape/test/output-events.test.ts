import { jsonSchemas, type DrapeJob } from '@atelier/contracts-ts';
import { beforeAll, describe, expect, it } from 'vitest';
import {
  FAILURE_TYPES,
  buildGlb,
  cacheKeyOf,
  canonicalJson,
  completedEvent,
  drapeGarment,
  failedEvent,
  loadAvatarEngine,
  modelKeyOf,
  type DrapeSuccess,
} from '../src/node.js';
import { FABRIC_PRESETS, type DrapeProblemType } from '../src/index.js';
import { fixture, jobOf } from './drape-helpers.js';
import { errorsOf, type Schema } from './schema-check.js';

const spec = fixture('straight-skirt');
const KEY = /^drapes\/[0-9a-f-]{36}\/[a-f0-9]{64}[.]glb$/;
const completedSchema = jsonSchemas.drapeCompleted as unknown as Schema;
const failedSchema = jsonSchemas.drapeFailed as unknown as Schema;

describe('clé de cache', () => {
  const job = jobOf(spec);

  it('est un SHA-256 hexadécimal et ne dépend pas de l’ordre des champs', () => {
    const key = cacheKeyOf(job);
    expect(key).toMatch(/^[a-f0-9]{64}$/);
    const reordered = {
      quality: job.quality,
      fabric: job.fabric,
      avatar: job.avatar,
      measurements: Object.fromEntries(Object.entries(job.measurements).reverse()),
      spec: job.spec,
      drapeId: job.drapeId,
      organizationId: job.organizationId,
      designId: job.designId,
      versionNumber: job.versionNumber,
    } as DrapeJob;
    expect(cacheKeyOf(reordered)).toBe(key);
  });

  it('ne dépend pas des identifiants du travail, mais de chaque entrée du calcul', () => {
    const key = cacheKeyOf(job);
    expect(cacheKeyOf(jobOf(spec, { drapeId: '00000000-0000-4000-8000-0000000000ff' }))).toBe(key);
    const variants: Partial<DrapeJob>[] = [
      { quality: 'standard' },
      { fabric: { preset: 'cotton-poplin', weightGPerM2: 111 } },
      { fabric: { preset: 'denim' } },
      { measurements: { ...job.measurements, waistGirthMm: 650 } },
      { avatar: { ...job.avatar, bodyFat: 0.9 } as DrapeJob['avatar'] },
      { spec: { ...spec, id: 'autre' } as DrapeJob['spec'] },
    ];
    const keys = variants.map((v) => cacheKeyOf(jobOf(spec, v)));
    expect(new Set([key, ...keys]).size).toBe(variants.length + 1);
  });

  it('résout le tissu : un préréglage et ses valeurs explicites donnent la même clé', () => {
    const weight = FABRIC_PRESETS['cotton-poplin'].weightGPerM2;
    const explicit = jobOf(spec, { fabric: { preset: 'cotton-poplin', weightGPerM2: weight } });
    expect(cacheKeyOf(explicit)).toBe(cacheKeyOf(job));
  });

  it('forme la clé d’objet du contrat', () => {
    expect(modelKeyOf(job.organizationId, cacheKeyOf(job))).toMatch(KEY);
    expect(canonicalJson({ b: 1, a: [{ d: undefined, c: 2 }] })).toBe('{"a":[{"c":2}],"b":1}');
  });
});

describe('événements', () => {
  const job = jobOf(spec);
  let out: DrapeSuccess;
  beforeAll(async () => {
    await loadAvatarEngine();
    const result = drapeGarment(job, { maxSteps: 12 });
    if (!result.ok) throw new Error(result.problem.type);
    out = result;
  });

  it('drape.completed valide son schéma, sans mesure', () => {
    const glb = buildGlb(out);
    const event = completedEvent(job, out, glb, cacheKeyOf(job));
    expect(errorsOf(event, completedSchema)).toEqual([]);
    expect(event.result.modelKey).toMatch(KEY);
    expect(event.result.sizeBytes).toBe(glb.length);
    expect(event.result.engineVersion).toBe(out.result.engineVersion);
    expect(JSON.stringify(event)).not.toContain('statureMm');
  });

  it('le validateur refuse un événement faux', () => {
    const event = completedEvent(job, out, buildGlb(out), cacheKeyOf(job));
    const bad = { ...event, result: { ...event.result, modelKey: 'x' } };
    expect(errorsOf(bad, completedSchema)).not.toEqual([]);
  });

  it('drape.failed valide son schéma pour chaque problème du moteur', () => {
    const problems = Object.keys(FAILURE_TYPES) as DrapeProblemType[];
    expect(problems).toHaveLength(6);
    for (const type of problems) {
      const event = failedEvent(job, { type, panelId: 'front' });
      expect(errorsOf(event, failedSchema)).toEqual([]);
      expect(event.retryable).toBe(false);
    }
    expect(failedEvent(job, { type: 'invalid-input' }).type).toBe('/problems/drape-internal');
    expect(failedEvent(job, { type: 'seam-not-closed' }).type).toBe(
      '/problems/drape-seam-not-closed',
    );
  });
});
