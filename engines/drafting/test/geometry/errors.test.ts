import { describe, expect, it } from 'vitest';
import {
  GeometryError,
  boundingBox,
  flattenPath,
  outsetPolygonPerEdge,
  point,
  pointAt,
  resamplePolyline,
  sampleCubic,
  splitPolygon,
} from '../../src/geometry.js';
import type { GeometryErrorCode } from '../../src/geometry.js';
import { pts } from './support.js';

/** Coordonnées « de mesure » : aucune ne doit se retrouver dans un message (donnée personnelle). */
const SECRET = pts([987.654321, 123.456789], [321.987654, 456.123789], [555.5555, 777.7777]);

function thrown(run: () => unknown): GeometryError {
  try {
    run();
  } catch (error) {
    if (error instanceof GeometryError) return error;
    throw error;
  }
  throw new Error('aucune erreur levée');
}

describe('GeometryError', () => {
  it('est une Error qui porte son code, avec un nom écrit en dur', () => {
    const error = new GeometryError('no-crossing', 'message');
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(GeometryError);
    expect(error.name).toBe('GeometryError');
    expect(error.code).toBe('no-crossing');
    expect(error.message).toBe('message');
  });

  it('accompagne chaque refus d’un code et d’un message en anglais, sans coordonnée ni longueur', () => {
    const [first, second, third] = SECRET;
    const curve = {
      from: first ?? point(0, 0),
      cp1: second ?? point(0, 0),
      cp2: third ?? point(0, 0),
      to: first ?? point(0, 0),
    };
    const cases: ReadonlyArray<readonly [GeometryErrorCode, () => unknown]> = [
      ['invalid-argument', () => pointAt([], 987.654321)],
      ['invalid-argument', () => boundingBox([])],
      ['invalid-argument', () => resamplePolyline(SECRET, -123.456789)],
      ['invalid-argument', () => sampleCubic(curve, 123.456789)],
      [
        'invalid-argument',
        () => flattenPath([{ type: 'curve', cp1: curve.cp1, cp2: curve.cp2, to: curve.to }]),
      ],
      ['invalid-argument', () => outsetPolygonPerEdge(SECRET, [987.654321])],
      ['no-crossing', () => splitPolygon(SECRET, pts([5000, 5000], [5001, 5001]))],
    ];
    for (const [code, run] of cases) {
      const error = thrown(run);
      expect(error.code).toBe(code);
      expect(error.message).toMatch(/^[a-z][a-z0-9 ,'-]+$/);
      for (const digits of ['987', '654', '123', '456', '321', '555', '777']) {
        expect(error.message).not.toContain(digits);
      }
    }
  });
});
