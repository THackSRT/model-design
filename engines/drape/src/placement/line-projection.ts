// Repérage d'un point par rapport à une ligne d'ancrage (chaîne de segments) : abscisse s et distance signée d.
//
// La chaîne contient aussi, comme segments « vides », la corde qui franchit chaque pince enjambée. Le repérage brut
// (σ, d) se fait sur cette chaîne complète ; il retrouve ainsi les x et y d'une ligne droite, y compris sous la
// pince. L'abscisse s retire ensuite, de σ, la largeur de la pince à la profondeur d du point pour les points à droite
// de la pince (elle tombe à 0 à la pointe) : les deux côtés de la pince y coïncident, la ligne d'ancrage la saute, et
// sous la pointe la pièce garde sa largeur.
//
// Les bouts de la ligne sont prolongés en droite, dans la direction de la courbe au bout (estimée sur trois points :
// la corde du premier segment d'une courbe maillée dévierait de plusieurs degrés, soit des dizaines de mm à 650 mm).

const TINY = 1e-9;

// Lecture sans vérification d'indice : les tableaux typés sont dimensionnés par construction.
const f = (a: Float64Array, i: number): number => a[i] as number;

/** Largeur d'une pince selon la profondeur : abscisses brutes de ses deux côtés, à des profondeurs croissantes. */
export interface DartTable {
  depthLeft: Float64Array;
  sigmaLeft: Float64Array;
  depthRight: Float64Array;
  sigmaRight: Float64Array;
}

/** Chaîne de segments orientée dans le sens des x croissants à l'ancre ; s = 0 à l'ancre. */
export interface AnchorLine {
  /** 4 valeurs par segment : ax, ay, bx, by (cordes de pince comprises). */
  segments: Float64Array;
  /** 1 pour la corde d'une pince. */
  gap: Uint8Array;
  /** Abscisse brute du début de chaque segment, depuis le début de la chaîne. */
  starts: Float64Array;
  lengths: Float64Array;
  /** Longueur de la chaîne sans les pinces enjambées. */
  length: number;
  /** Abscisse brute (σ) de l'ancre. */
  anchorSigma: number;
  /** Étendue de s sur la ligne : s du début de la chaîne et s de sa fin (largeur des pinces comprise entre elles et l'ancre retirée). */
  range: [number, number];
  /** Directions unitaires des prolongements : début (tx, ty) puis fin (tx, ty), dans le sens de la chaîne. */
  ends: Float64Array;
  darts: DartTable[];
}

type Dir = [number, number];

/** Dérivée en p0 de la parabole passant par p0, p1, p2 (abscisses curvilignes 0, h1, h1 + h2), normalisée. */
function tangentAt(p: readonly number[], fallback: Dir): Dir {
  const [x0, y0, x1, y1, x2, y2] = p as [number, number, number, number, number, number];
  const h1 = Math.sqrt((x1 - x0) * (x1 - x0) + (y1 - y0) * (y1 - y0));
  const h2 = Math.sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1));
  if (h1 < TINY || h2 < TINY) return fallback;
  const c0 = -(2 * h1 + h2) / (h1 * (h1 + h2));
  const c1 = (h1 + h2) / (h1 * h2);
  const c2 = -h1 / (h2 * (h1 + h2));
  const tx = c0 * x0 + c1 * x1 + c2 * x2;
  const ty = c0 * y0 + c1 * y1 + c2 * y2;
  const len = Math.sqrt(tx * tx + ty * ty);
  return len < TINY ? fallback : [tx / len, ty / len];
}

function unit(q: readonly number[]): Dir {
  const dx = (q[2] as number) - (q[0] as number);
  const dy = (q[3] as number) - (q[1] as number);
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  return [dx / len, dy / len];
}

/** Vrai si le segment p finit où le segment q commence, et que ni l'un ni l'autre n'est une corde de pince. */
function joined(p: readonly number[], q: readonly number[]): boolean {
  return (
    p[4] !== 1 &&
    q[4] !== 1 &&
    Math.abs((p[2] as number) - (q[0] as number)) < TINY &&
    Math.abs((p[3] as number) - (q[1] as number)) < TINY
  );
}

/** Directions des prolongements aux deux bouts d'une chaîne de segments [ax, ay, bx, by, corde]. */
export function endDirections(chain: readonly number[][]): Float64Array {
  const first = chain[0] as number[];
  const last = chain[chain.length - 1] as number[];
  const second = chain[1];
  const before = chain[chain.length - 2];
  let start = unit(first);
  let end = unit(last);
  if (second && joined(first, second)) {
    const p = [first[0], first[1], first[2], first[3], second[2], second[3]] as number[];
    start = tangentAt(p, start);
  }
  if (before && joined(before, last)) {
    const p = [last[2], last[3], last[0], last[1], before[0], before[1]] as number[];
    const back = tangentAt(p, [-end[0], -end[1]]);
    end = [-back[0], -back[1]];
  }
  return Float64Array.of(start[0], start[1], end[0], end[1]);
}

/** Segment m vu depuis p : origine retenue, direction, abscisse de l'origine et position le long (mm). */
function reach(
  line: AnchorLine,
  m: number,
  p: readonly [number, number],
): { ox: number; oy: number; tx: number; ty: number; base: number; along: number } {
  const len = f(line.lengths, m);
  const o = 4 * m;
  let [ox, oy] = [f(line.segments, o), f(line.segments, o + 1)];
  let [tx, ty] = [(f(line.segments, o + 2) - ox) / len, (f(line.segments, o + 3) - oy) / len];
  let base = f(line.starts, m);
  const along = (p[0] - ox) * tx + (p[1] - oy) * ty;
  if (m === 0 && along < 0) {
    [tx, ty] = [f(line.ends, 0), f(line.ends, 1)];
    return { ox, oy, tx, ty, base, along: Math.min(0, (p[0] - ox) * tx + (p[1] - oy) * ty) };
  }
  if (m === line.lengths.length - 1 && along > len) {
    [ox, oy] = [f(line.segments, o + 2), f(line.segments, o + 3)];
    [tx, ty] = [f(line.ends, 2), f(line.ends, 3)];
    base += len;
    return { ox, oy, tx, ty, base, along: Math.max(0, (p[0] - ox) * tx + (p[1] - oy) * ty) };
  }
  return { ox, oy, tx, ty, base, along: Math.max(0, Math.min(len, along)) };
}

/**
 * Repérage brut de (px, py) sur la chaîne complète : `out[0]` = σ depuis le début de la chaîne, `out[1]` = distance
 * signée d (positive du côté droit de la ligne orientée, soit vers le bas pour une ligne horizontale vers les x
 * croissants ; 0 à 1e-3 mm près).
 */
export function projectRaw(line: AnchorLine, px: number, py: number, out: Float64Array): void {
  let best = Infinity;
  for (let m = 0; m < line.lengths.length; m++) {
    if (f(line.lengths, m) < TINY) continue;
    const r = reach(line, m, [px, py]);
    const ex = px - r.ox - r.along * r.tx;
    const ey = py - r.oy - r.along * r.ty;
    const d2 = ex * ex + ey * ey;
    if (d2 >= best) continue;
    best = d2;
    const dist = Math.sqrt(d2);
    out[0] = r.base + r.along;
    out[1] = dist < 1e-3 ? 0 : (ex * r.ty - ey * r.tx >= 0 ? 1 : -1) * dist;
  }
}

/** Abscisse brute du côté d'une pince à la profondeur d (interpolation linéaire, bornée aux extrémités). */
function sigmaAt(depth: Float64Array, sigma: Float64Array, d: number): number {
  const n = depth.length;
  let i = 0;
  while (i < n - 2 && d > f(depth, i + 1)) i++;
  const span = f(depth, i + 1) - f(depth, i);
  const t = span < TINY ? 0 : Math.max(0, Math.min(1, (d - f(depth, i)) / span));
  return f(sigma, i) + t * (f(sigma, i + 1) - f(sigma, i));
}

/** Largeur des pinces entre le point (σ, d) et l'ancre, à la profondeur d (0 hors de leur pointe). */
function dartReduction(line: AnchorLine, sigma: number, d: number): number {
  let removed = 0;
  for (const t of line.darts) {
    const apex = Math.min(
      t.depthLeft[t.depthLeft.length - 1] as number,
      t.depthRight[t.depthRight.length - 1] as number,
    );
    if (d >= apex) continue;
    const left = sigmaAt(t.depthLeft, t.sigmaLeft, d);
    const right = sigmaAt(t.depthRight, t.sigmaRight, d);
    const mid = (left + right) / 2;
    if ((sigma - mid) * (line.anchorSigma - mid) < 0) removed += right - left;
  }
  return removed;
}

/**
 * Repère (px, py) sur la ligne : `out[0]` = abscisse s depuis l'ancre (largeur des pinces entre le point et l'ancre
 * retirée), `out[1]` = distance signée d.
 */
export function projectOnLine(line: AnchorLine, px: number, py: number, out: Float64Array): void {
  projectRaw(line, px, py, out);
  const away = f(out, 0) - line.anchorSigma;
  const removed = dartReduction(line, f(out, 0), f(out, 1));
  out[0] = away > 0 ? away - removed : away + removed;
}

/** Table d'une pince : profondeur et abscisse brute de chaque point de ses deux côtés, profondeurs croissantes. */
export function dartTable(line: AnchorLine, left: number[], right: number[]): DartTable {
  const side = (xy: number[]): { depth: Float64Array; sigma: Float64Array } => {
    const out = new Float64Array(2);
    const pts = Array.from({ length: xy.length / 2 }, (_, i) => {
      projectRaw(line, xy[2 * i] as number, xy[2 * i + 1] as number, out);
      return { sigma: f(out, 0), depth: f(out, 1) };
    }).sort((a, b) => a.depth - b.depth);
    return {
      depth: Float64Array.from(pts, (p) => p.depth),
      sigma: Float64Array.from(pts, (p) => p.sigma),
    };
  };
  const l = side(left);
  const r = side(right);
  return { depthLeft: l.depth, sigmaLeft: l.sigma, depthRight: r.depth, sigmaRight: r.sigma };
}

/** Virage signé (rad, petit angle : produit vectoriel des directions unitaires, positif à gauche) entre les segments m et m + 1. */
function turnAfter(line: AnchorLine, m: number): number {
  if (m + 1 >= line.lengths.length || line.gap[m] === 1 || line.gap[m + 1] === 1) return 0;
  const [a, b] = [4 * m, 4 * (m + 1)];
  const [la, lb] = [f(line.lengths, m), f(line.lengths, m + 1)];
  if (la < TINY || lb < TINY) return 0;
  const [ax, ay] = [
    (f(line.segments, a + 2) - f(line.segments, a)) / la,
    (f(line.segments, a + 3) - f(line.segments, a + 1)) / la,
  ];
  const [bx, by] = [
    (f(line.segments, b + 2) - f(line.segments, b)) / lb,
    (f(line.segments, b + 3) - f(line.segments, b + 1)) / lb,
  ];
  return ax * by - ay * bx;
}

/**
 * Abscisse lissée du point sur la courbe parallèle à la ligne, à la distance d : σ + d × (virage cumulé jusqu'au
 * point). Une courbe parallèle à une ligne courbe a pour longueur celle de la ligne plus d fois son virage ; le
 * repérage brut (σ) la perd : tous les points du coin d'un sommet de la chaîne, vus du côté extérieur, auraient le même
 * σ. Dans ce coin, le virage partiel est tiré de la composante du point le long du segment (petit angle).
 * `out[0]` = abscisse lissée depuis l'ancre (pinces non retirées), `out[1]` = d.
 */
export function projectSmooth(line: AnchorLine, px: number, py: number, out: Float64Array): void {
  projectRaw(line, px, py, out);
  const sigma = f(out, 0);
  const d = f(out, 1);
  const here = turningAt(line, sigma, [px, py], d);
  const anchor = turningAt(line, line.anchorSigma, undefined, 0);
  out[0] = sigma + d * here - (line.anchorSigma + d * anchor);
}

/** Virage cumulé jusqu'à l'abscisse brute σ ; `p` : point dont le coin du sommet de la chaîne donne un virage partiel. */
function turningAt(
  line: AnchorLine,
  sigma: number,
  p: readonly [number, number] | undefined,
  d: number,
): number {
  let m = 0;
  while (m < line.lengths.length - 1 && f(line.starts, m) + f(line.lengths, m) < sigma - TINY) m++;
  let turn = 0;
  for (let j = 0; j < m; j++) turn += turnAfter(line, j);
  const len = f(line.lengths, m);
  if (!p || len < TINY || m >= line.lengths.length - 1) return turn;
  return turn + cornerTurn(line, m, p, d);
}

/** Virage partiel d'un point dans le coin de la fin du segment m (petit angle), 0 hors du coin. */
function cornerTurn(line: AnchorLine, m: number, p: readonly [number, number], d: number): number {
  const len = f(line.lengths, m);
  const o = 4 * m;
  const tx = (f(line.segments, o + 2) - f(line.segments, o)) / len;
  const ty = (f(line.segments, o + 3) - f(line.segments, o + 1)) / len;
  const beyond = (p[0] - f(line.segments, o + 2)) * tx + (p[1] - f(line.segments, o + 3)) * ty;
  const own = turnAfter(line, m);
  if (beyond <= TINY || Math.abs(d) <= TINY || d * own <= 0) return 0;
  const part = Math.min(Math.abs(own), beyond / Math.abs(d));
  return own > 0 ? part : -part;
}
