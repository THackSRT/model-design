// Motifs de surface et de galon, en deux thèmes : « line » (trait blanc sur anthracite, comme l'image de
// référence) et « color » (teintes des tissus sur fond papier).
import { pt, add, mul, norm, sub, length, pointAt, tangentAt, offset, d, f } from './geom.mjs'

export const THEMES = {
  line: { name: 'line', bg: '#252525', ink: '#f1f1ee', stitch: '#f1f1ee', inside: '#2e2e2e', hl: '#8b8b8b', hlOpacity: 0.55, caption: '#a9a9a4', title: '#f1f1ee', embroidery: '#cfcfca' },
  color: { name: 'color', bg: '#ebe9e4', ink: '#1d1d1f', stitch: '#8a8a88', inside: null, hl: '#ffffff', hlOpacity: 0.3, caption: '#5b5b58', title: '#1d1d1f', embroidery: '#8f908d' },
}
// Rétrocompatibilité (planches de patrons)
export const INK = THEMES.line.ink
export const BG = THEMES.line.bg

/** Définitions SVG des motifs de surface (unités : mm du dessin). `pal` : couleurs des tissus imprimés. */
export function patternDefs(id, T = THEMES.line, pal = {}) {
  const line = T.name === 'line'
  const bog = line ? { base: T.bg, mark: T.ink, accent: T.ink } : { base: '#1d1a17', mark: '#efe6d3', accent: '#d39b2a', ...pal.bogolan }
  const geo = line ? { base: T.bg, mark: T.ink, fill: T.ink, op: 0.55 } : { base: '#1b1b1d', mark: '#f0ece4', fill: '#e46f1f', op: 1, ...pal.geo }
  return `
  <pattern id="${id}-bogolan" patternUnits="userSpaceOnUse" width="64" height="64">
    <rect width="64" height="64" fill="${bog.base}"/>
    <polyline points="0,8 8,2 16,8 24,2 32,8 40,2 48,8 56,2 64,8" fill="none" stroke="${bog.mark}" stroke-width="1.6"/>
    <line x1="0" y1="14" x2="64" y2="14" stroke="${bog.mark}" stroke-width="1.2"/>
    ${[4, 20, 36, 52].map((x) => `<rect x="${x}" y="18" width="7" height="7" fill="${bog.mark}"/>`).join('')}
    <line x1="0" y1="30" x2="64" y2="30" stroke="${bog.mark}" stroke-width="1.2"/>
    ${[8, 40].map((x) => `<path d="M${x - 5} 35 L${x + 5} 45 M${x + 5} 35 L${x - 5} 45" stroke="${bog.mark}" stroke-width="1.6"/><ellipse cx="${x + 16}" cy="40" rx="5.4" ry="4.2" fill="${line ? 'none' : bog.accent}" stroke="${line ? bog.mark : bog.accent}" stroke-width="1.4"/><circle cx="${x + 16}" cy="40" r="1.3" fill="${line ? bog.mark : bog.base}"/>`).join('')}
    <line x1="0" y1="50" x2="64" y2="50" stroke="${bog.mark}" stroke-width="1.2"/>
    ${Array.from({ length: 8 }, (_, i) => `<circle cx="${4 + i * 8}" cy="57" r="1.6" fill="${bog.mark}"/>`).join('')}
  </pattern>
  <pattern id="${id}-geo" patternUnits="userSpaceOnUse" width="36" height="36">
    <rect width="36" height="36" fill="${geo.base}"/>
    <path d="M0 18 L9 2 L18 18 Z M18 18 L27 2 L36 18 Z" fill="${line ? 'none' : geo.fill}" stroke="${geo.mark}" stroke-width="1.4"/>
    <path d="M9 34 L18 20 L27 34 Z" fill="${line ? geo.fill : geo.mark}" fill-opacity="${geo.op}" stroke="${geo.mark}" stroke-width="1.2"/>
    <path d="M0 20 L0 34 M36 20 L36 34" stroke="${geo.mark}" stroke-width="1.2"/>
    <circle cx="4" cy="30" r="1.4" fill="${line ? geo.mark : geo.fill}"/><circle cx="32" cy="30" r="1.4" fill="${line ? geo.mark : geo.fill}"/>
  </pattern>
  <pattern id="${id}-dots" patternUnits="userSpaceOnUse" width="6" height="6">
    <circle cx="1.5" cy="1.5" r="1" fill="${line ? T.bg : '#2a2a2a'}"/><circle cx="4.5" cy="4.5" r="0.8" fill="${line ? T.bg : '#2a2a2a'}"/>
  </pattern>
  <pattern id="${id}-weave" patternUnits="userSpaceOnUse" width="7" height="7">
    <rect width="7" height="7" fill="${line ? '#3a3c40' : pal.light ?? '#dfe7f1'}"/><path d="M0 7 L7 0" stroke="${line ? '#4a4d52' : '#c9d3df'}" stroke-width="0.8"/>
  </pattern>`
}

/** Galon rayé : noir, blanc à motif, noir, blanc à motif, noir, le long du chemin. */
export function stripesBand(id, pts, width, T = THEMES.line) {
  const parts = [
    [0.16, '#121212'],
    [0.26, 'light'],
    [0.16, '#121212'],
    [0.26, 'light'],
    [0.16, '#121212'],
  ]
  let a = -width / 2
  let out = ''
  for (const [k, fill] of parts) {
    const b = a + k * width
    const poly = [...offset(pts, a), ...offset(pts, b).reverse()]
    if (fill === 'light') out += `<path d="${d(poly, true)}" fill="#e2e0da"/><path d="${d(poly, true)}" fill="url(#${id}-dots)"/>`
    else out += `<path d="${d(poly, true)}" fill="${fill}"/>`
    a = b
  }
  out += `<path d="${d(offset(pts, -width / 2))}" fill="none" stroke="${T.ink}" stroke-width="1.6"/><path d="${d(offset(pts, width / 2))}" fill="none" stroke="${T.ink}" stroke-width="1.6"/>`
  return out
}

/** Galon grecque : fond clair, rangée de crochets carrés reliés au filet du bas, deux filets. */
export function greekBand(pts, width, T = THEMES.line, ink = '#1d2a44') {
  const L = length(pts)
  const h = width * 0.66
  const a = h / 4
  const map = (s, lvl) => {
    const p = pointAt(pts, s)
    const tg = tangentAt(pts, s)
    return add(p, mul(pt(tg.y, -tg.x), (2 - lvl) * a))
  }
  const cell = [[0, 0], [0, 4], [4, 4], [4, 1], [1.8, 1], [1.8, 2.6], [3, 2.6]]
  let path = ''
  for (let s0 = a * 0.5; s0 + 5 * a <= L; s0 += 5 * a) {
    path += cell.map(([x, lvl], i) => {
      const q = map(s0 + x * a, lvl)
      return `${i ? 'L' : 'M'}${f(q.x)} ${f(q.y)}`
    }).join('')
  }
  const poly = [...offset(pts, -width / 2), ...offset(pts, width / 2).reverse()]
  return `<path d="${d(poly, true)}" fill="#f1f0ec"/>` +
    `<path d="${path}" fill="none" stroke="${ink}" stroke-width="1.6" stroke-linejoin="miter" stroke-linecap="square"/>` +
    `<path d="${d(offset(pts, 2 * a))}" fill="none" stroke="${ink}" stroke-width="1.6"/>` +
    `<path d="${d(offset(pts, -width / 2))}" fill="none" stroke="${T.ink}" stroke-width="1.6"/>` +
    `<path d="${d(offset(pts, width / 2))}" fill="none" stroke="${T.ink}" stroke-width="1.6"/>`
}

/** Broderie le long d'un chemin : filet intérieur, tige, feuilles alternées, points. */
export function embroideryAlong(pts, width, side = 1, color = THEMES.line.embroidery) {
  const L = length(pts)
  let out = ''
  const inner = offset(pts, side * 3)
  const stem = offset(pts, side * (width * 0.5))
  out += `<path d="${d(inner)}" fill="none" stroke="${color}" stroke-width="2.2"/>`
  out += `<path d="${d(stem)}" fill="none" stroke="${color}" stroke-width="1.1"/>`
  for (let s = 6, i = 0; s < L - 4; s += 9, i++) {
    const p = pointAt(stem, s)
    const tg = tangentAt(stem, s)
    const nrm = pt(tg.y * side, -tg.x * side)
    const dir = i % 2 ? 1 : -1
    const tip = add(p, add(mul(nrm, dir * width * 0.36), mul(tg, 5)))
    const c1 = add(p, add(mul(nrm, dir * width * 0.32), mul(tg, -3)))
    const c2 = add(p, add(mul(nrm, dir * width * 0.06), mul(tg, 7)))
    out += `<path d="M${f(p.x)} ${f(p.y)} Q${f(c1.x)} ${f(c1.y)} ${f(tip.x)} ${f(tip.y)} Q${f(c2.x)} ${f(c2.y)} ${f(p.x)} ${f(p.y)}Z" fill="${color}" fill-opacity="0.9" stroke="${color}" stroke-width="0.6"/>`
    if (i % 2 === 0) {
      const dot = add(p, mul(nrm, width * 0.47))
      out += `<circle cx="${f(dot.x)}" cy="${f(dot.y)}" r="1.3" fill="${color}"/>`
    }
  }
  return out
}

/** Assombrit (k < 0) ou éclaircit (k > 0) une couleur #rrggbb. */
export function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16)
  const c = [n >> 16, (n >> 8) & 255, n & 255].map((v) => Math.round(k < 0 ? v * (1 + k) : v + (255 - v) * k))
  return '#' + c.map((v) => v.toString(16).padStart(2, '0')).join('')
}

export function luminance(hex) {
  const n = parseInt(hex.slice(1), 16)
  return (0.2126 * (n >> 16) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255
}

export { norm, sub }
