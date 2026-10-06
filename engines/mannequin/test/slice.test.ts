import { describe, expect, it } from 'vitest';
import {
  bandTriangles,
  chainHull,
  chainLength,
  largestLoop,
  planarArea,
  sliceMesh,
} from '../src/core/slice.js';
import { type Point2, prism, type Solid } from './helpers/prism.js';

const square = (side: number): Point2[] => [
  [0, 0],
  [side, 0],
  [side, side],
  [0, side],
];

/** Cube de côté `side` posé sur l'origine. */
const cube = (side: number): Solid => prism(square(side), side, (a, b, c) => [a, b, c]);

/** Deux solides indépendants dans un même maillage. */
function together(a: Solid, b: Solid): Solid {
  const shift = a.pos.length / 3;
  return {
    pos: Float32Array.from([...a.pos, ...b.pos]),
    tris: Uint16Array.from([...a.tris, ...Array.from(b.tris, (i) => i + shift)]),
  };
}

describe('sliceMesh', () => {
  it("coupe un cube en un contour fermé de la longueur et de l'aire du carré", () => {
    const { pos, tris } = cube(2);
    const chains = sliceMesh(pos, tris, 1, 1);
    expect(chains).toHaveLength(1);
    const [loop] = chains;
    expect(loop?.closed).toBe(true);
    expect(chainLength(loop as NonNullable<typeof loop>)).toBeCloseTo(8, 5);
    expect(planarArea(loop?.points ?? [], 0, 2)).toBeCloseTo(4, 5);
    expect(loop?.points.every((p) => Math.abs(p[1] - 1) < 1e-6)).toBe(true);
  });

  it('rend le même contour pour les trois axes de coupe', () => {
    const { pos, tris } = cube(2);
    for (const axis of [0, 1, 2] as const) {
      const [loop] = sliceMesh(pos, tris, axis, 1);
      expect(chainLength(loop as NonNullable<typeof loop>)).toBeCloseTo(8, 5);
    }
  });

  it('rend un contour par solide et ne dépend pas de l’ordre des triangles', () => {
    const solids = together(
      cube(2),
      prism(square(1), 1, (a, b, c) => [a + 5, b, c]),
    );
    const reversed = Uint16Array.from(
      Array.from({ length: solids.tris.length / 3 }, (_, t) => t)
        .reverse()
        .flatMap((t) => [...solids.tris.slice(3 * t, 3 * t + 3)]),
    );
    for (const tris of [solids.tris, reversed]) {
      const chains = sliceMesh(solids.pos, tris, 1, 0.5);
      expect(chains.map((c) => chainLength(c)).sort()).toEqual(
        [4, 8].map((v) => expect.closeTo(v, 5)),
      );
    }
  });

  it('rend rien quand le plan ne rencontre pas le maillage', () => {
    const { pos, tris } = cube(2);
    expect(sliceMesh(pos, tris, 1, 3)).toEqual([]);
    expect(sliceMesh(pos, tris, 1, -1)).toEqual([]);
  });

  it('compte un sommet exactement dans le plan comme en dessous', () => {
    const { pos, tris } = cube(2);
    // plan du fond : les sommets du fond sont « en dessous », la coupe longe le bord du fond
    const [bottom] = sliceMesh(pos, tris, 1, 0);
    expect(bottom?.closed).toBe(true);
    expect(chainLength(bottom as NonNullable<typeof bottom>)).toBeCloseTo(8, 5);
    // plan du dessus : tous les sommets sont en dessous, rien n'est coupé
    expect(sliceMesh(pos, tris, 1, 2)).toEqual([]);
  });

  it('rend une chaîne ouverte quand le plan rencontre un bord du maillage', () => {
    const pos = Float32Array.from([0, 0, 0, 2, 0, 0, 0, 2, 0]);
    const [chain] = sliceMesh(pos, [0, 1, 2], 1, 1);
    expect(chain?.closed).toBe(false);
    expect(chain?.points).toHaveLength(2);
    expect(chainLength(chain as NonNullable<typeof chain>)).toBeCloseTo(1, 5);
  });
});

describe('contours', () => {
  const lShape: Point2[] = [
    [0, 0],
    [4, 0],
    [4, 1],
    [1, 1],
    [1, 4],
    [0, 4],
  ];
  const slab = prism(lShape, 3, (a, b, c) => [a, c, b]);
  const [loop] = sliceMesh(slab.pos, slab.tris, 1, 1.5);

  it("mesure l'aire et le périmètre d'un contour concave", () => {
    expect(planarArea(loop?.points ?? [], 0, 2)).toBeCloseTo(7, 5);
    expect(chainLength(loop as NonNullable<typeof loop>)).toBeCloseTo(16, 5);
  });

  it("l'enveloppe convexe enjambe le creux, comme un mètre ruban", () => {
    const hull = chainHull(loop as NonNullable<typeof loop>, 0, 2);
    expect(hull.per).toBeCloseTo(4 + 1 + Math.hypot(3, 3) + 1 + 4, 5);
  });

  it('choisit le plus grand des contours fermés', () => {
    const both = together(
      cube(2),
      prism(square(1), 1, (a, b, c) => [a + 5, b, c]),
    );
    const chains = sliceMesh(both.pos, both.tris, 1, 0.5);
    expect(
      chainLength(largestLoop(chains, 0, 2) as NonNullable<ReturnType<typeof largestLoop>>),
    ).toBeCloseTo(8, 5);
    expect(largestLoop([], 0, 2)).toBeUndefined();
  });
});

describe('bandTriangles', () => {
  it('ne garde que les triangles dont la hauteur recoupe la bande', () => {
    const { pos, tris } = cube(2);
    const all = bandTriangles(pos, tris, -1, 3);
    expect(all).toHaveLength(tris.length);
    // une bande sous le cube ne recoupe aucun triangle ; une bande dans la hauteur du cube recoupe les parois
    expect(bandTriangles(pos, tris, -3, -1)).toEqual([]);
    const middle = bandTriangles(pos, tris, 0.9, 1.1);
    expect(middle.length).toBeGreaterThan(0);
    expect(middle.length).toBeLessThan(tris.length);
    expect(sliceMesh(pos, middle, 1, 1).map((c) => chainLength(c))).toEqual(
      sliceMesh(pos, tris, 1, 1).map((c) => chainLength(c)),
    );
  });
});
