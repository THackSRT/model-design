// Géométrie plane de l'essai : polylignes en mm, y vers le bas. Fonctions pures, sans dépendance.

export const pt = (x, y) => ({ x, y })
export const add = (a, b) => pt(a.x + b.x, a.y + b.y)
export const sub = (a, b) => pt(a.x - b.x, a.y - b.y)
export const mul = (a, k) => pt(a.x * k, a.y * k)
export const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y)
export const lerp = (a, b, t) => pt(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t)
export const norm = (a) => {
  const l = Math.hypot(a.x, a.y) || 1
  return pt(a.x / l, a.y / l)
}
export const perp = (a) => pt(-a.y, a.x)
export const mirror = (p) => pt(-p.x, p.y)
export const mirrorAll = (pts) => pts.map(mirror)

/** Courbe de Bézier cubique échantillonnée (n segments). */
export function cubic(p0, c1, c2, p3, n = 24) {
  const out = []
  for (let i = 0; i <= n; i++) {
    const t = i / n
    const u = 1 - t
    out.push(
      pt(
        u * u * u * p0.x + 3 * u * u * t * c1.x + 3 * u * t * t * c2.x + t * t * t * p3.x,
        u * u * u * p0.y + 3 * u * u * t * c1.y + 3 * u * t * t * c2.y + t * t * t * p3.y,
      ),
    )
  }
  return out
}

/** Spline de Catmull-Rom passant par les points donnés (chemin lisse). */
export function smooth(points, n = 12) {
  if (points.length < 3) return points.slice()
  const out = [points[0]]
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = points[Math.min(points.length - 1, i + 2)]
    const c1 = add(p1, mul(sub(p2, p0), 1 / 6))
    const c2 = sub(p2, mul(sub(p3, p1), 1 / 6))
    out.push(...cubic(p1, c1, c2, p2, n).slice(1))
  }
  return out
}

/** Chemin FreeSewing (move, line, curve) en polyligne. */
export function flattenOps(ops, n = 24) {
  const out = []
  let cur = null
  for (const op of ops) {
    if (op.type === 'move') {
      cur = pt(op.to.x, op.to.y)
      out.push(cur)
    } else if (op.type === 'line') {
      cur = pt(op.to.x, op.to.y)
      out.push(cur)
    } else if (op.type === 'curve') {
      const seg = cubic(cur, op.cp1, op.cp2, pt(op.to.x, op.to.y), n)
      out.push(...seg.slice(1))
      cur = seg[seg.length - 1]
    }
  }
  return out
}

export function length(pts) {
  let s = 0
  for (let i = 1; i < pts.length; i++) s += dist(pts[i - 1], pts[i])
  return s
}

/** Point à l'abscisse curviligne s (bornée). */
export function pointAt(pts, s) {
  if (s <= 0) return pts[0]
  let acc = 0
  for (let i = 1; i < pts.length; i++) {
    const d = dist(pts[i - 1], pts[i])
    if (acc + d >= s) return lerp(pts[i - 1], pts[i], d ? (s - acc) / d : 0)
    acc += d
  }
  return pts[pts.length - 1]
}

/** Tangente unitaire à l'abscisse s. */
export function tangentAt(pts, s) {
  const a = pointAt(pts, Math.max(0, s - 1))
  const b = pointAt(pts, s + 1)
  return norm(sub(b, a))
}

/** Portion d'une polyligne entre deux abscisses curvilignes. */
export function slice(pts, s0, s1) {
  const out = [pointAt(pts, s0)]
  let acc = 0
  for (let i = 1; i < pts.length; i++) {
    acc += dist(pts[i - 1], pts[i])
    if (acc > s0 && acc < s1) out.push(pts[i])
  }
  out.push(pointAt(pts, s1))
  return out
}

/** Rééchantillonnage régulier (pas en mm). */
export function resample(pts, step) {
  const L = length(pts)
  const n = Math.max(1, Math.round(L / step))
  return Array.from({ length: n + 1 }, (_, i) => pointAt(pts, (L * i) / n))
}

/** Décalage d'une polyligne de d (côté gauche du sens de parcours, y vers le bas). */
export function offset(pts, d) {
  return pts.map((p, i) => {
    const a = pts[Math.max(0, i - 1)]
    const b = pts[Math.min(pts.length - 1, i + 1)]
    const t = norm(sub(b, a))
    return add(p, mul(pt(t.y, -t.x), d))
  })
}

export function signedArea(poly) {
  let s = 0
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]
    const b = poly[(i + 1) % poly.length]
    s += a.x * b.y - b.x * a.y
  }
  return s / 2
}

/** Décalage d'un polygone fermé avec onglets aux angles (d > 0 vers l'intérieur, d < 0 vers l'extérieur). */
export function insetMiter(poly, dd) {
  const sign = signedArea(poly) > 0 ? -1 : 1
  const n = poly.length
  return poly.map((p, i) => {
    const a = poly[(i - 1 + n) % n]
    const b = poly[(i + 1) % n]
    const t1 = norm(sub(p, a))
    const t2 = norm(sub(b, p))
    const n1 = pt(t1.y, -t1.x)
    const n2 = pt(t2.y, -t2.x)
    const bis = norm(add(n1, n2))
    const k = 1 / Math.max(0.35, bis.x * n1.x + bis.y * n1.y)
    return add(p, mul(bis, sign * dd * k))
  })
}

/** Décalage vers l'intérieur d'un polygone fermé (surpiqûre). */
export function inset(poly, d) {
  const closed = [...poly, poly[0], poly[1]]
  const sign = signedArea(poly) > 0 ? -1 : 1
  return offset(closed, sign * d).slice(1, poly.length + 1)
}

export function segIntersect(a, b, c, d) {
  const r = sub(b, a)
  const s = sub(d, c)
  const den = r.x * s.y - r.y * s.x
  if (Math.abs(den) < 1e-12) return null
  const q = sub(c, a)
  const t = (q.x * s.y - q.y * s.x) / den
  const u = (q.x * r.y - q.y * r.x) / den
  if (t < -1e-9 || t > 1 + 1e-9 || u < -1e-9 || u > 1 + 1e-9) return null
  return { t, u, p: add(a, mul(r, t)) }
}

/** Intersections d'une polyligne ouverte avec le contour d'un polygone, dans l'ordre de la polyligne. */
export function crossings(poly, cut) {
  const hits = []
  for (let i = 0; i < cut.length - 1; i++) {
    for (let j = 0; j < poly.length; j++) {
      const h = segIntersect(cut[i], cut[i + 1], poly[j], poly[(j + 1) % poly.length])
      if (h) hits.push({ s: i + h.t, edge: j, u: h.u, p: h.p })
    }
  }
  return hits.sort((a, b) => a.s - b.s)
}

/**
 * Découpe un polygone par une polyligne qui traverse son contour (premier et dernier croisement).
 * Renvoie les deux polygones et la ligne de couture (portion intérieure de la découpe).
 */
export function splitPolygon(poly, cut) {
  const hits = crossings(poly, cut)
  if (hits.length < 2) throw new Error(`découpe : ${hits.length} croisement(s) avec le contour`)
  const h1 = hits[0]
  const h2 = hits[hits.length - 1]
  const seam = [h1.p]
  for (let i = Math.floor(h1.s) + 1; i <= Math.floor(h2.s); i++) seam.push(cut[i])
  seam.push(h2.p)
  const walk = (from, to) => {
    const out = [from.p]
    const n = poly.length
    if (from.edge === to.edge && to.u > from.u) return [from.p, to.p]
    let k = (from.edge + 1) % n
    for (let guard = 0; guard <= n; guard++) {
      out.push(poly[k])
      if (k === to.edge) break
      k = (k + 1) % n
    }
    out.push(to.p)
    return out
  }
  const a = dedupe([...walk(h1, h2), ...seam.slice(1, -1).reverse()], true)
  const b = dedupe([...walk(h2, h1), ...seam.slice(1, -1)], true)
  return { a, b, seam: dedupe(seam) }
}

/** Retire les points consécutifs confondus (à 0,05 mm près), y compris en bouclant pour un polygone. */
export function dedupe(pts, closed = false) {
  const out = []
  for (const p of pts) if (!out.length || dist(out[out.length - 1], p) > 0.05) out.push(p)
  while (closed && out.length > 2 && dist(out[0], out[out.length - 1]) <= 0.05) out.pop()
  return out
}

export function pointInPolygon(p, poly) {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i]
    const b = poly[j]
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) inside = !inside
  }
  return inside
}

export function bbox(pts) {
  const xs = pts.map((p) => p.x)
  const ys = pts.map((p) => p.y)
  return { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) }
}

/** Abscisse x du contour d'un polygone à la hauteur y (plus grande valeur, côté droit). */
export function xAtY(poly, y, side = 'max') {
  const xs = []
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]
    const b = poly[(i + 1) % poly.length]
    if ((a.y - y) * (b.y - y) <= 0 && a.y !== b.y) xs.push(a.x + ((y - a.y) / (b.y - a.y)) * (b.x - a.x))
  }
  if (!xs.length) return null
  return side === 'max' ? Math.max(...xs) : Math.min(...xs)
}

export const f = (v) => +v.toFixed(2)

/** Chemin SVG d'une polyligne. */
export function d(pts, closed = false) {
  if (!pts.length) return ''
  const body = pts.map((p, i) => `${i ? 'L' : 'M'}${f(p.x)} ${f(p.y)}`).join('')
  return closed ? body + 'Z' : body
}
