import { describe, expect, it } from 'vitest';
import { exportFileName, reduceSizeLabel } from '../../src/domain/export-file-name.js';

describe('nom de fichier d’export', () => {
  it('réduit la taille à [a-z0-9-] en minuscules', () => {
    expect(reduceSizeLabel('M/L 2')).toBe('m-l-2');
    expect(reduceSizeLabel('"><script>')).toBe('script');
  });

  it('construit le nom depuis le type, la version, la taille et le format', () => {
    const base = { garmentType: 'straight-skirt', versionNumber: 1 };
    expect(exportFileName({ ...base, format: 'svg' })).toBe('straight-skirt-v1.svg');
    expect(exportFileName({ ...base, sizeLabel: '38', format: 'pdf-a4-tiled' })).toBe(
      'straight-skirt-v1-38.pdf',
    );
    expect(exportFileName({ ...base, sizeLabel: 'M/L 2', format: 'dxf-aama' })).toBe(
      'straight-skirt-v1-m-l-2.dxf',
    );
  });
});
