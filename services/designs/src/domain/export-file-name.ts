export type ExportFileFormat = 'svg' | 'pdf-a4-tiled' | 'dxf-aama';

export const EXPORT_EXTENSION: Record<ExportFileFormat, string> = {
  svg: 'svg',
  'pdf-a4-tiled': 'pdf',
  'dxf-aama': 'dxf',
};

/** Taille réduite à [a-z0-9-] en minuscules ; les séquences d'autres caractères deviennent un tiret. */
export function reduceSizeLabel(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** `<garmentType>-v<n>[-<taille>].<ext>` : uniquement des valeurs contrôlées, jamais le nom du modèle. */
export function exportFileName(input: {
  garmentType: string;
  versionNumber: number;
  sizeLabel?: string;
  format: ExportFileFormat;
}): string {
  const size = input.sizeLabel ? reduceSizeLabel(input.sizeLabel) : '';
  const base = `${input.garmentType}-v${input.versionNumber}${size ? `-${size}` : ''}`;
  return `${base}.${EXPORT_EXTENSION[input.format]}`;
}
