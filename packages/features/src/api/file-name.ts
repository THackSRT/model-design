import type { ExportFormat } from '@atelier/contracts-ts';

const EXTENSIONS: Record<ExportFormat, string> = {
  svg: 'svg',
  'pdf-a4-tiled': 'pdf',
  'dxf-aama': 'dxf',
};

// Motif strict : le nom vient d'un en-tête réseau, jamais pris tel quel (pas de chemin, de guillemet ni d'autre extension).
const CONTENT_DISPOSITION = /^attachment; filename="([a-z0-9-]+\.(?:svg|pdf|dxf))"$/;

/** Nom du fichier téléchargé : celui de Content-Disposition s'il est sûr, sinon `patron.<ext>`. */
export function exportFileName(header: string | null, format: ExportFormat): string {
  const match = header === null ? null : CONTENT_DISPOSITION.exec(header);
  return match?.[1] ?? `patron.${EXTENSIONS[format]}`;
}
