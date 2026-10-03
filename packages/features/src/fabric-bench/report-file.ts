import {
  fabricValidationReportJsonSchema,
  type FabricValidationReport,
} from '@atelier/contracts-ts';
import { err, ok, type Result } from '@atelier/kernel';

import { checkSchema } from './schema-check.js';

/** Taille maximale d'un rapport importé, en octets (fichier non fiable, ADR 0015). */
export const FABRIC_REPORT_MAX_BYTES = 262_144;

export type ReportImportError =
  | { code: 'too-large'; maxBytes: number }
  | { code: 'not-json' }
  | { code: 'unsupported-version' }
  | { code: 'invalid'; path: string; keyword: string }
  | { code: 'duplicate-preset'; preset: string };

/** Version de rapport du contrat, lue dans le schéma. */
const REPORT_VERSION: unknown = (
  fabricValidationReportJsonSchema.properties.schemaVersion as { const: unknown }
).const;

function parseJson(text: string): { value: unknown } | undefined {
  try {
    return { value: JSON.parse(text) as unknown };
  } catch {
    return undefined;
  }
}

function firstDuplicate(report: FabricValidationReport): string | undefined {
  const seen = new Set<string>();
  for (const review of report.reviews) {
    if (seen.has(review.preset)) return review.preset;
    seen.add(review.preset);
  }
  return undefined;
}

const hasOtherVersion = (value: unknown): boolean =>
  typeof value === 'object' &&
  value !== null &&
  Object.hasOwn(value, 'schemaVersion') &&
  (value as { schemaVersion: unknown }).schemaVersion !== REPORT_VERSION;

/** Lit un rapport importé : refus s'il n'est pas strictement conforme au contrat. */
export function parseFabricValidationReport(
  text: string,
): Result<FabricValidationReport, ReportImportError> {
  if (new TextEncoder().encode(text).length > FABRIC_REPORT_MAX_BYTES) {
    return err({ code: 'too-large', maxBytes: FABRIC_REPORT_MAX_BYTES });
  }
  const parsed = parseJson(text);
  if (!parsed) return err({ code: 'not-json' });
  if (hasOtherVersion(parsed.value)) return err({ code: 'unsupported-version' });
  const violation = checkSchema(parsed.value, 'fabricValidationReport');
  if (violation) return err({ code: 'invalid', ...violation });
  const report = parsed.value as FabricValidationReport;
  const preset = firstDuplicate(report);
  return preset === undefined ? ok(report) : err({ code: 'duplicate-preset', preset });
}

/** JSON stable du rapport : deux espaces, saut de ligne final. */
export function serializeFabricValidationReport(report: FabricValidationReport): string {
  return `${JSON.stringify(report, null, 2)}\n`;
}
