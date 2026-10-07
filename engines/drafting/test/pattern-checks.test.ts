import { describe, expect, it } from 'vitest';
import { ContourError, SeamError, SheetError } from '../src/core/errors.js';
import { draftPart } from '../src/core/part.js';
import { assemblePattern } from '../src/core/pattern.js';
import type { Pattern, PatternEdge } from '../src/core/pattern-types.js';
import type { ModelSheet, PartSheet, PlacementSheet } from '../src/core/sheet.js';
import type { PathOp, PointMm, TracedPart } from '../src/core/types.js';
import { demoParts, demoSheet, p, placement } from './demo-garment.js';
import { lengthOfEdge } from './spec-helpers.js';

const ease = 3.4;
const sheet = demoSheet(ease, 6);
const build = (s: ModelSheet = sheet): Pattern => assemblePattern(s, demoParts(s), {});
const panelOf = (pattern: Pattern, id: string) =>
  pattern.panels.find((panel) => panel.id === id) as Pattern['panels'][number];

const lengthOf = (edge: PatternEdge): number =>
  lengthOfEdge({
    id: edge.id,
    from: [edge.piece.p0.xMm, edge.piece.p0.yMm],
    to: [edge.piece.p1.xMm, edge.piece.p1.yMm],
    ...(edge.piece.kind === 'curve'
      ? {
          controls: [
            [edge.piece.c1.xMm, edge.piece.c1.yMm],
            [edge.piece.c2.xMm, edge.piece.c2.yMm],
          ] as [[number, number], [number, number]],
        }
      : {}),
  });

/** Distance de début de cran depuis le début de la suite des bords `edges` de la pièce, pour le cran sur le bord `edgeId`. */
function along(edges: PatternEdge[], edgeId: string, distanceMm: number): number {
  let before = 0;
  for (const edge of edges) {
    if (edge.id === edgeId) return before + distanceMm;
    before += lengthOf(edge);
  }
  return Number.NaN;
}

describe('crans : déclarés à un sommet, reportés de l’autre côté de la couture', () => {
  const pattern = build();
  const front = panelOf(pattern, 'front');
  const sleeve = panelOf(pattern, 'sleeve');
  const arms = front.edges.filter((e) => e.semanticRole === 'armhole');
  const cap = sleeve.edges.filter((e) => e.semanticRole === 'sleeveCap');

  it('pose sur le devant un cran au début de l’emmanchure et un double à sa fin, sur le bon sous-bord', () => {
    expect(front.notches).toHaveLength(2);
    expect(front.notches[0]).toEqual({ edgeId: 'arm-1', distanceMm: 0, count: 1 });
    const last = arms[arms.length - 1] as PatternEdge;
    expect(front.notches[1]).toMatchObject({ edgeId: last.id, count: 2 });
    expect(front.notches[1]?.distanceMm).toBeCloseTo(lengthOf(last), 2);
  });

  it('reporte chaque cran sur la tête de manche à la même fraction de la couture, embu compris', () => {
    expect(sleeve.notches).toHaveLength(2);
    expect(sleeve.notches.map((n) => n.count)).toEqual([1, 2]);
    const armLength = arms.reduce((sum, e) => sum + lengthOf(e), 0);
    const capLength = cap.reduce((sum, e) => sum + lengthOf(e), 0);
    const [start, middle] = sleeve.notches;
    expect(
      along(
        cap,
        (start as (typeof sleeve.notches)[number]).edgeId,
        (start as (typeof sleeve.notches)[number]).distanceMm,
      ),
    ).toBeCloseTo(0, 2);
    // Le cran de la fin de l'emmanchure du devant est à mi-couture (devant et dos sont égaux) : à la moitié de la tête.
    const position = along(
      cap,
      (middle as (typeof sleeve.notches)[number]).edgeId,
      (middle as (typeof sleeve.notches)[number]).distanceMm,
    );
    expect(position / capLength).toBeCloseTo(armLength / (2 * armLength), 3);
    expect(position).toBeGreaterThan(armLength);
  });

  it('ne reporte rien sur le dos : ses coutures n’appellent que les crans du devant, vers la manche', () => {
    expect(panelOf(pattern, 'back').notches).toEqual([]);
  });

  it('place le cran d’une jonction de sous-bords sur le premier, au bout de sa longueur', () => {
    const [, second] = sleeve.notches;
    const edge = sleeve.edges.find((e) => e.id === second?.edgeId) as PatternEdge;
    // À mi-couture la tête n'a pas de sommet : le cran tombe à l'intérieur d'un sous-bord, jamais au-delà de sa longueur.
    expect(second?.distanceMm).toBeLessThanOrEqual(lengthOf(edge) + 1e-6);
    expect(second?.distanceMm).toBeGreaterThan(0);
  });
});

describe('pose : ancre sur l’axe, décalage tiré des hauteurs de la pièce', () => {
  const withPlacement = (change: Partial<PlacementSheet>): Pattern => {
    const changed: ModelSheet = {
      ...sheet,
      parts: sheet.parts.map((part) =>
        part.id === 'front'
          ? { ...part, panel: { ...part.panel, placement: { ...placement('front'), ...change } } }
          : part,
      ),
    };
    return build(changed);
  };
  const frontPlacement = (pattern: Pattern) => panelOf(pattern, 'front').placement;

  it('prend pour ancre le point nommé de l’axe, et pour décalage celui de la fiche plus la hauteur de l’ancre sur le point de niveau', () => {
    // `b` (0, 200) est à 100 mm sous `d` (100, 100) : l'ancre est 100 mm sous le point qui est au repère.
    expect(frontPlacement(build())).toMatchObject({
      anchorMm: { xMm: 0, yMm: -200 },
      offsetMm: -100,
      landmark: 'waist',
    });
    expect(frontPlacement(withPlacement({ offsetMm: 30 })).offsetMm).toBe(-70);
  });

  it('prend l’origine du repère et le décalage de la fiche quand elle ne nomme ni ancre ni point de niveau', () => {
    const plain = panelOf(build(), 'sleeve').placement;
    expect(plain).toMatchObject({ anchorMm: { xMm: 0, yMm: 0 }, offsetMm: 0 });
    const level = frontPlacement(withPlacement({ levelPoint: undefined, offsetMm: -12 }));
    expect(level).toMatchObject({ anchorMm: { xMm: 0, yMm: -200 }, offsetMm: -12 });
  });

  it('borne le décalage aux limites du contrat (± 500 mm) : une pièce plus basse se pose un peu trop haut', () => {
    expect(frontPlacement(withPlacement({ offsetMm: -450 })).offsetMm).toBe(-500);
    expect(
      frontPlacement(withPlacement({ anchorPoint: 'o', levelPoint: 'b', offsetMm: 400 })).offsetMm,
    ).toBe(500);
  });

  it('refuse un point de pose que la pièce n’a pas, ou une ancre qui n’est pas sur l’axe', () => {
    const missing = (): unknown => withPlacement({ levelPoint: 'nowhere' });
    expect(missing).toThrow(SheetError);
    expect(missing).toThrow(
      'sheet part front: placement point "nowhere" does not exist in the part',
    );
    const offAxis = (): unknown => withPlacement({ anchorPoint: 'c' });
    expect(offAxis).toThrow('sheet part front: the anchor point is not on the axis of the part');
  });
});

describe('contrôles de la fiche et du tracé', () => {
  const parts = demoParts(sheet);
  const failure = (run: () => unknown): Error => {
    try {
      run();
    } catch (error) {
      return error as Error;
    }
    throw new Error('aucune erreur levée');
  };
  const withPart = (index: number, change: (part: PartSheet) => PartSheet): ModelSheet => ({
    ...sheet,
    parts: sheet.parts.map((part, i) => (i === index ? change(part) : part)),
  });

  it('refuse une couture qui cite un bord que la fiche n’a pas', () => {
    const wrong: ModelSheet = {
      ...sheet,
      seams: [
        {
          id: 'arm',
          a: [{ part: 'sleeve', edge: 'nope' }],
          b: [{ part: 'front', edge: 'arm' }],
          align: 'same',
          toleranceMm: 1,
        },
      ],
    };
    const error = failure(() => assemblePattern(wrong, parts, {}));
    expect(error).toBeInstanceOf(SheetError);
    expect(error.message).toBe('sheet seam arm: edge "sleeve#nope" is not in the sheet');
  });

  it('refuse un bord cousu dans deux coutures : la découpe de la seconde défairait la première', () => {
    const twice: ModelSheet = {
      ...sheet,
      seams: [
        ...sheet.seams,
        {
          id: 'again',
          a: [{ part: 'front', edge: 'side' }],
          b: [{ part: 'back', edge: 'hem' }],
          align: 'same',
          toleranceMm: 100,
        },
      ],
    };
    expect(failure(() => assemblePattern(twice, parts, {})).message).toBe(
      'sheet seam again: edge "front#side" is sewn in more than one seam',
    );
  });

  it('refuse un cran sur un bord inconnu ou à un point qui n’est pas un sommet du bord', () => {
    const unknown = withPart(0, (part) => ({
      ...part,
      panel: { ...part.panel, notches: [{ edge: 'nope', at: 'd' }] },
    }));
    expect(failure(() => assemblePattern(unknown, parts, {})).message).toBe(
      'sheet part front: notch on unknown edge "nope"',
    );
    const elsewhere = withPart(0, (part) => ({
      ...part,
      panel: { ...part.panel, notches: [{ edge: 'arm', at: 'o' }] },
    }));
    expect(failure(() => assemblePattern(elsewhere, parts, {}))).toBeInstanceOf(SheetError);
    expect(failure(() => assemblePattern(elsewhere, parts, {})).message).toContain(
      'notch point "o" is not a vertex of edge "arm"',
    );
  });

  it('refuse un tracé qui n’est pas celui de la fiche : pièce absente, ou bords différents', () => {
    expect(failure(() => assemblePattern(sheet, parts.slice(0, 2), {})).message).toBe(
      'sheet part sleeve: the draft does not hold this part',
    );
    const renamed = withPart(1, (part) => ({
      ...part,
      edges: part.edges.map((e) => (e.id === 'hem' ? { ...e, id: 'bottom' } : e)),
    }));
    expect(failure(() => assemblePattern(renamed, parts, {})).message).toBe(
      'sheet part back: the drafted edges are not those of the sheet',
    );
  });

  it('refuse une pièce coupée au pli sans bord de pli, ou un pli sur une pièce qui ne l’est pas', () => {
    const noFold = withPart(0, (part) => ({
      ...part,
      edges: part.edges.map((e) => (e.id === 'fold' ? { ...e, role: 'seam' as const } : e)),
    }));
    expect(failure(() => assemblePattern(noFold, demoParts(noFold), {})).message).toBe(
      'sheet part front: a panel cut on the fold needs exactly one fold edge',
    );
    const flat = withPart(0, (part) => ({ ...part, panel: { ...part.panel, cutOnFold: false } }));
    expect(failure(() => assemblePattern(flat, demoParts(flat), {})).message).toBe(
      'sheet part front: a fold edge on a panel that is not cut on the fold',
    );
  });

  it('refuse un pli qui n’est pas sur l’axe de la pièce : le repère de la fiche est faux', () => {
    const off = withPart(0, (part) => ({ ...part, frame: { axis: 'c', top: 'o' } }));
    const error = failure(() => assemblePattern(off, demoParts(off), {}));
    expect(error).toBeInstanceOf(ContourError);
    expect(error.message).toBe(
      'part demo.front: the fold edge is not a straight line on the axis of the part',
    );
  });

  it('refuse un contour dans le mauvais sens (pièce symétrique de celle que la fiche décrit)', () => {
    const mirrorOp = (op: PathOp): PathOp => {
      const flip = (q: PointMm): PointMm => p(-q.xMm, q.yMm);
      if (op.type === 'close') return op;
      if (op.type === 'curve')
        return { type: 'curve', cp1: flip(op.cp1), cp2: flip(op.cp2), to: flip(op.to) };
      return { type: op.type, to: flip(op.to) };
    };
    const [front, ...rest] = parts;
    const traced: TracedPart = {
      name: 'demo.front',
      hidden: false,
      points: Object.fromEntries(
        Object.entries(front?.points ?? {}).map(([name, q]) => [name, p(-q.xMm, q.yMm)]),
      ),
      seam: demoSeam().map(mirrorOp),
    };
    const mirrored = draftPart(sheet.parts[0] as PartSheet, traced);
    const error = failure(() => assemblePattern(sheet, [mirrored, ...rest], {}));
    expect(error).toBeInstanceOf(ContourError);
    expect(error.message).toBe('part demo.front: the contour is not counter-clockwise');
  });

  it('refuse des identifiants de bords qui se confondent une fois les bords coupés (`arm` et `arm-1`)', () => {
    const clash = withPart(0, (part) => ({
      ...part,
      edges: part.edges.map((e) => (e.id === 'top' ? { ...e, id: 'arm-1' } : e)),
    }));
    expect(failure(() => assemblePattern(clash, demoParts(clash), {})).message).toBe(
      'sheet part front: edge identifiers are not unique once the edges are cut',
    );
  });

  it('lève une erreur de couture typée, qui nomme la couture et ne porte aucune mesure', () => {
    const wrong = demoSheet(ease + 50, 6);
    const error = failure(() => assemblePattern(wrong, demoParts(wrong), {})) as SeamError;
    expect(error).toBeInstanceOf(SeamError);
    expect(error).toMatchObject({ code: 'seam', seam: 'arm' });
    expect(error.message).toBe(
      'seam arm: the length gap between the two sides differs from the declared ease by more than 6 mm',
    );
  });
});

/** Contour du devant de démonstration, relu depuis son tracé. */
function demoSeam(): PathOp[] {
  return [
    { type: 'move', to: p(0, 0) },
    { type: 'line', to: p(0, 200) },
    { type: 'line', to: p(100, 200) },
    { type: 'line', to: p(100, 100) },
    { type: 'curve', cp1: p(100, 60), cp2: p(90, 30), to: p(60, 0) },
    { type: 'line', to: p(0, 0) },
    { type: 'close' },
  ];
}
