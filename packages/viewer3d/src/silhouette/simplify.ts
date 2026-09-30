export type Vec = readonly [number, number];

/** Distance d'un point au segment [a, b]. */
function distanceToSegment(p: Vec, a: Vec, b: Vec): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len2 = dx * dx + dy * dy;
  const t =
    len2 === 0 ? 0 : Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len2));
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
}

function farthest(points: readonly Vec[], from: number, to: number): [number, number] {
  const a = points[from];
  const b = points[to];
  let best = -1;
  let at = from;
  if (!a || !b) return [best, at];
  for (let i = from + 1; i < to; i++) {
    const d = distanceToSegment(points[i] as Vec, a, b);
    if (d > best) [best, at] = [d, i];
  }
  return [best, at];
}

/** Douglas-Peucker d'une ligne ouverte : garde les extrémités et les sommets à plus de `tolerance`. */
export function simplifyLine(points: readonly Vec[], tolerance: number): Vec[] {
  if (points.length < 3) return [...points];
  const keep = new Uint8Array(points.length);
  keep[0] = 1;
  keep[points.length - 1] = 1;
  const stack: [number, number][] = [[0, points.length - 1]];
  for (let range = stack.pop(); range; range = stack.pop()) {
    const [from, to] = range;
    const [distance, at] = farthest(points, from, to);
    if (distance <= tolerance) continue;
    keep[at] = 1;
    stack.push([from, at], [at, to]);
  }
  return points.filter((_, i) => keep[i] === 1);
}

/** Point le plus éloigné du premier : second ancrage d'une boucle fermée. */
function oppositeIndex(points: readonly Vec[]): number {
  const [x0, y0] = points[0] ?? [0, 0];
  let best = 0;
  let at = 0;
  points.forEach(([x, y], i) => {
    const d = (x - x0) ** 2 + (y - y0) ** 2;
    if (d > best) [best, at] = [d, i];
  });
  return at;
}

/** Douglas-Peucker d'une boucle fermée : coupée en deux au point le plus éloigné du départ. */
export function simplifyLoop(points: readonly Vec[], tolerance: number): Vec[] {
  if (points.length < 4) return [...points];
  const split = oppositeIndex(points);
  const first = simplifyLine(points.slice(0, split + 1), tolerance);
  const second = simplifyLine([...points.slice(split), points[0] as Vec], tolerance);
  return [...first, ...second.slice(1, -1)];
}
