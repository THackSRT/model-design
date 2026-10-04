// Assemblage à plat (vue de face ou de dos) : le corps est la pièce tracée et son miroir, les manches viennent
// de la pièce de manche, les découpes, bandes, pattes et galons des opérations.
// Thèmes : « line » (trait blanc sur anthracite, comme l'image de référence) ou « color » (teintes des tissus).
import { regions } from './ops.mjs'
import { pt, add, sub, mul, norm, cubic, offset, inset, d, f, mirror, mirrorAll, length, pointAt, dist, bbox, pointInPolygon } from './geom.mjs'
import { THEMES, patternDefs, stripesBand, greekBand, embroideryAlong, shade, luminance } from './motifs.mjs'

const W = { outline: 3.4, seam: 2.3, stitch: 1.5, fine: 1.2 }
const DASH = 'stroke-dasharray="5.2 3.4"'
const rev = (a) => a.slice().reverse()
const both = (pts) => [pts, mirrorAll(pts)]

function kit(T) {
  const stroke = (pts, w = W.seam, extra = '', closed = false, color = T.ink) =>
    `<path d="${d(pts, closed)}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round" ${extra}/>`
  const stitch = (pts, closed = false) => stroke(pts, W.stitch, DASH, closed, T.stitch)
  return { stroke, stitch }
}

/** Remplissage d'une matière : motif pour un imprimé, teinte en couleur, fond en trait. */
function fillFor(id, st, key, T) {
  const m = st.doc.materials[key] ?? { tone: 'main' }
  if (m.tone === 'bogolan' || m.tone === 'geo') return `url(#${id}-${m.tone})`
  if (m.tone === 'light') return `url(#${id}-weave)`
  return T.name === 'line' ? T.bg : m.color ?? '#999'
}

/** Manche à plat : courte, écartée comme un tee-shirt ; longue, tombante, avec poignet. */
export function flatSleeve(st, P) {
  const S = P.edges.shoulder[0]
  const A = P.edges.armhole[0]
  const sl = st.sleeve
  const B = (sl.lm.bicepsRight.x - sl.lm.bicepsLeft.x) / 2
  const hemHalf = (sl.edges.hem[1].x - sl.edges.hem[0].x) / 2
  const l = sl.edges.hem[0].y
  const short = sl.totalMm < 420
  let u, n, O, Wo, Wi, cap
  if (short) {
    const phi = (60 * Math.PI) / 180
    u = pt(Math.sin(phi), Math.cos(phi))
    n = pt(Math.cos(phi), -Math.sin(phi))
    const Ls = sl.totalMm
    Wo = add(S, mul(u, Ls))
    const La = (Wo.x - A.x) * u.x + (Wo.y - A.y) * u.y
    Wi = add(A, mul(u, La))
    O = add(S, mul(u, 0.32 * Ls))
    cap = cubic(S, add(add(S, mul(u, 0.1 * Ls)), mul(n, 3.5)), add(O, mul(u, -0.12 * Ls)), O, 24)
  } else {
    const phi = (9 * Math.PI) / 180
    u = pt(Math.sin(phi), Math.cos(phi))
    n = pt(Math.cos(phi), -Math.sin(phi))
    const wTop = Math.max(0.5 * B, hemHalf + 8)
    O = add(A, mul(n, wTop))
    const midHem = add(add(A, mul(n, wTop / 2)), mul(u, l))
    Wo = add(midHem, mul(n, hemHalf / 2))
    Wi = add(midHem, mul(n, -hemHalf / 2))
    const sh = P.edges.shoulder
    const sDir = norm(sub(S, sh[sh.length - 1]))
    const k = dist(S, O)
    cap = cubic(S, add(S, mul(sDir, 0.3 * k)), sub(O, mul(u, 0.45 * k)), O, 30)
  }
  const outline = [...cap, Wo, Wi, A]
  const fill = [...cap, Wo, Wi, A, ...P.edges.armhole.slice(1, -1)]
  const out = { outline, fill, Wo, Wi, O, A, u, n, short }
  const fin = st.sleeveFinish
  if (!fin) out.hemStitch = [add(Wo, mul(norm(sub(O, Wo)), 14)), add(Wi, mul(norm(sub(A, Wi)), 14))]
  if (fin?.kind === 'band') {
    const Bo = add(Wo, mul(norm(sub(O, Wo)), fin.heightMm))
    const Bi = add(Wi, mul(norm(sub(A, Wi)), fin.heightMm))
    out.band = { poly: [Bo, Wo, Wi, Bi], seam: [Bo, Bi], material: fin.material }
  }
  if (fin?.kind === 'cuff') {
    const ins = (hemHalf - fin.flatWidth) / 2
    const Co = add(Wo, mul(n, -ins))
    const Ci = add(Wi, mul(n, ins))
    out.cuff = { poly: [Co, add(Co, mul(u, fin.heightMm)), add(Ci, mul(u, fin.heightMm)), Ci], style: fin.style, hc: fin.heightMm, material: fin.material }
    out.pleats = [0.32, 0.5].map((t) => {
      const p = add(Wi, mul(sub(Wo, Wi), t))
      return [p, add(p, mul(u, -55))]
    })
  }
  const sTop = dist(O, Wo)
  const along = norm(sub(Wo, O))
  const [a, b] = short ? [0.08, 0.42] : [0.2, 0.75]
  out.highlights = [[add(add(O, mul(along, sTop * a)), mul(n, short ? -24 : -16)), add(add(O, mul(along, sTop * b)), mul(n, short ? -24 : -22))]]
  return out
}

function button(p, size, T, fill) {
  const r = size / 2
  return `<circle cx="${f(p.x)}" cy="${f(p.y)}" r="${f(r)}" fill="${fill}" stroke="${T.ink}" stroke-width="1.8"/>` +
    [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => `<circle cx="${f(p.x + a * r * 0.32)}" cy="${f(p.y + b * r * 0.32)}" r="${f(Math.max(0.7, r * 0.14))}" fill="${T.ink}"/>`).join('')
}

function sleeveSvg(id, st, sv, mirrorIt, T, view) {
  const { stroke, stitch } = kit(T)
  const m = (pts) => (mirrorIt ? mirrorAll(pts) : pts)
  const main = fillFor(id, st, 'main', T)
  let s = `<path d="${d(m(sv.fill), true)}" fill="${main}"/>`
  if (sv.band) {
    s += `<path d="${d(m(sv.band.poly), true)}" fill="${fillFor(id, st, sv.band.material, T)}"/>`
    s += stroke(m(sv.band.seam))
    s += stitch(m(offset(sv.band.seam, mirrorIt ? -5 : 5)))
  }
  for (const h of sv.highlights) s += `<path d="${d(m(h))}" stroke="${T.hl}" stroke-opacity="${T.hlOpacity}" stroke-width="5" stroke-linecap="round" fill="none"/>`
  if (sv.pleats) for (const p of sv.pleats) s += stroke(m(p), W.fine)
  if (sv.hemStitch) s += stitch(m(sv.hemStitch))
  s += stroke(m(sv.outline), W.outline)
  if (sv.cuff) {
    const c = m(sv.cuff.poly)
    s += `<path d="${d(c, true)}" fill="${fillFor(id, st, sv.cuff.material ?? 'main', T)}" stroke="${T.ink}" stroke-width="${W.outline}" stroke-linejoin="round"/>`
    s += stitch(inset(c, 5), true)
    const mid = pointAt([c[0], c[1]], sv.cuff.hc / 2)
    const toInner = norm(sub(c[3], c[0]))
    if (view === 'front') {
      const btn = add(mid, mul(toInner, 16))
      if (sv.cuff.style === 'french') s += `<rect x="${f(btn.x - 7)}" y="${f(btn.y - 7)}" width="14" height="14" rx="3" fill="${main}" stroke="${T.ink}" stroke-width="1.8"/><circle cx="${f(btn.x)}" cy="${f(btn.y)}" r="2.4" fill="${T.ink}"/>`
      else s += button(btn, 12, T, main)
    } else {
      // Dos de la manche : fente de poignet et sa patte, au tiers du poignet côté dessous de bras
      const base = add(c[0], mul(sub(c[3], c[0]), 0.62))
      const up = mul(norm(sub(m([sv.O])[0], m([sv.Wo])[0])), 1)
      const top = add(base, mul(up, 120))
      const w = mul(toInner, 9)
      const strip = [sub(base, w), add(base, w), add(top, w), sub(top, w)]
      s += `<path d="${d(strip, true)}" fill="${main}" stroke="${T.ink}" stroke-width="${W.seam}" stroke-linejoin="round"/>`
      s += stitch(inset(strip, 3), true)
      s += button(add(base, mul(up, 70)), 9, T, main)
    }
  }
  return s
}

/** Demi-contour du corps (de l'ourlet milieu à l'encolure milieu), avec fente de côté éventuelle. */
export function halfBody(st, P) {
  const e = P.edges
  const H = e.hem[e.hem.length - 1]
  const tail = [...e.side.slice(1), ...e.armhole.slice(1), ...e.shoulder.slice(1), ...e.neckline.slice(1)]
  if (!st.flat.slit) return { half: [...e.hem, ...tail] }
  const T = pt(H.x, H.y - st.flat.slit.heightMm)
  const Hf = pt(H.x - 7, H.y)
  return { half: [...e.hem.slice(0, -1), Hf, T, ...tail], backCorner: [T, pt(H.x + 3, H.y), Hf], T }
}

export function flatSvg(st, { id = 'g', view = 'front', theme = 'line', caption = true, transparent = false } = {}) {
  const T = THEMES[theme]
  const { stroke, stitch } = kit(T)
  const g = st.doc
  const front = view === 'front'
  const P = front ? st.front : st.back
  const pal = { light: g.materials.light?.color }
  const main = fillFor(id, st, 'main', T)
  const mainColor = g.materials.main.color ?? '#999'
  const inside = T.inside ?? shade(mainColor, luminance(mainColor) > 0.5 ? -0.18 : 0.12)
  const sv = flatSleeve(st, P)
  const { half, backCorner, T: slitTop } = halfBody(st, P)
  const body = [...half, ...rev(mirrorAll(half)).slice(1, -1)]
  const { regs, seams } = regions(st, front ? 'front' : 'back')
  let s = ''
  if (front) {
    const fNeck = st.front.edges.neckline
    const bNeck = st.back.edges.neckline
    const neckInside = [...bNeck, ...rev(mirrorAll(bNeck)).slice(1), ...fNeck.slice(1).map(mirror), ...rev(fNeck).slice(1, -1)]
    s += `<path d="${d(neckInside, true)}" fill="${inside}" stroke="${T.ink}" stroke-width="${W.outline}" stroke-linejoin="round"/>`
    s += stitch(offset(bNeck, 6)) + stitch(mirrorAll(offset(bNeck, 6)))
  }
  if (backCorner) for (const c of both(backCorner)) s += `<path d="${d(c, true)}" fill="${main}" stroke="${T.ink}" stroke-width="${W.seam}" stroke-linejoin="round"/>`
  s += sleeveSvg(id, st, sv, false, T, view) + sleeveSvg(id, st, sv, true, T, view)
  s += `<path d="${d(body, true)}" fill="${main}"/>`
  for (const r of regs) {
    const tone = g.materials[r.material]?.tone ?? 'main'
    if (tone === 'main') continue
    const fl = fillFor(id, st, r.material, T)
    for (const p of both(r.poly)) s += `<path d="${d(p, true)}" fill="${fl}" stroke="${fl}" stroke-width="1.6"/>`
  }
  // Surpiqûre des découpes, du côté de la pièce principale
  for (const sm of seams) {
    const insidePoly = regs.find((r) => r.name === sm.inside).poly
    const L = length(sm.seam)
    const sign = pointInPolygon(pointAt(offset(sm.seam, 6), L / 2), insidePoly) ? -1 : 1
    for (const [i, p] of both(sm.seam).entries()) {
      s += stroke(p)
      if (sm.topstitch) s += stitch(offset(p, (i === 0 ? 5 : -5) * sign))
    }
  }
  // Ombres douces le long des côtés (thème couleur)
  if (theme === 'color') {
    const sideX = P.edges.side[0].x
    for (const k of [1, -1]) s += `<path d="M${f(k * (sideX - 30))} ${f(P.lm.armhole.y + 60)}L${f(k * (sideX - 42))} ${f((front ? st.front.lm.cfHem.y : st.back.lm.cbHem.y) - 80)}" stroke="${T.hl}" stroke-opacity="0.22" stroke-width="7" stroke-linecap="round"/>`
  }
  if (st.sleeve.totalMm >= 420) for (const p of both(offset(P.edges.armhole, 6))) s += stitch(p)
  const neck = P.edges.neckline
  if (!(front && st.flat.neckShape === 'v')) for (const p of both(offset(neck, 7))) s += stitch(p)
  const hemY = (front ? st.front.lm.cfHem : st.back.lm.cbHem).y
  const sideX = P.edges.hem[P.edges.hem.length - 1].x - (st.flat.slit ? 8 : 2)
  s += stitch([pt(-sideX, hemY - 12), pt(sideX, hemY - 12)])
  if (slitTop) for (const t of both([pt(slitTop.x - 9, slitTop.y), pt(slitTop.x - 1, slitTop.y)])) s += stroke(t, 4)
  if (front && st.flat.neckSlit) {
    const { top, lengthMm } = st.flat.neckSlit
    s += `<path d="${d([pt(-7, top), pt(0, top + lengthMm), pt(7, top)], true)}" fill="${inside}" stroke="${T.ink}" stroke-width="${W.seam}" stroke-linejoin="round"/>`
    s += stitch([pt(-14, top + 4), pt(0, top + lengthMm + 10), pt(14, top + 4)])
  }
  if (front) {
    for (const pk of st.flat.pockets) {
      s += `<path d="${d(pk.poly, true)}" fill="${fillFor(id, st, pk.material, T)}" stroke="${T.ink}" stroke-width="${W.seam}" stroke-linejoin="round"/>`
      s += stitch(inset(pk.poly, 5), true)
      s += stitch([add(pk.poly[0], pt(4, 20)), add(pk.poly[1], pt(-4, 20))])
    }
    let trims = ''
    for (const t of st.flat.trims) trims += t.motif === 'greek' ? greekBand(t.pts, t.widthMm, T, g.materials[t.material]?.color) : stripesBand(id, t.pts, t.widthMm, T)
    s += `<g clip-path="url(#${id}-clip)">${trims}</g>`
    if (st.flat.embroidery) s += embroiderySvg(st, theme === 'color' ? g.materials.brod?.color ?? T.embroidery : T.embroidery)
    if (st.flat.placket) {
      const { top, lengthMm, widthMm, buttons, buttonMm, material } = st.flat.placket
      const w2 = widthMm / 2
      const rect = [pt(-w2, top), pt(w2, top), pt(w2, top + lengthMm), pt(-w2, top + lengthMm)]
      const pf = fillFor(id, st, material, T)
      s += `<path d="${d(rect, true)}" fill="${pf}" stroke="${T.ink}" stroke-width="${W.seam}" stroke-linejoin="round"/>`
      s += stitch(inset(rect, 4), true)
      const btnFill = theme === 'color' ? '#f2f0ea' : pf
      for (let i = 0; i < buttons; i++) s += button(pt(0, top + 20 + ((lengthMm - 45) * i) / Math.max(1, buttons - 1)), buttonMm ?? 13, T, btnFill)
    }
  }
  s += `<path d="${d(body, true)}" fill="none" stroke="${T.ink}" stroke-width="${W.outline}" stroke-linejoin="round"/>`
  const all = [...body, ...sv.outline, ...mirrorAll(sv.outline), ...(sv.cuff ? [...sv.cuff.poly, ...mirrorAll(sv.cuff.poly)] : [])]
  const bb = bbox(all)
  const mx = 70
  const top = bb.y0 - 70
  const width = bb.x1 - bb.x0 + 2 * mx
  const height = bb.y1 - top + (caption ? 150 : 60)
  const x0 = bb.x0 - mx
  const cap = caption ? captionSvg(st, x0 + mx, bb.y1 + 75, T, view) : ''
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${f(x0)} ${f(top)} ${f(width)} ${f(height)}" width="${Math.round(width * 1.25)}" height="${Math.round(height * 1.25)}">
  <defs>${patternDefs(id, T, pal)}<clipPath id="${id}-clip"><path d="${d(body, true)}"/></clipPath></defs>
  ${transparent ? '' : `<rect x="${f(x0)}" y="${f(top)}" width="${f(width)}" height="${f(height)}" fill="${T.bg}"/>`}
  ${s}
  ${cap}
</svg>`
  return { svg, width, height }
}

function embroiderySvg(st, color) {
  const { widthMm, withPlacket } = st.flat.embroidery
  const neck = st.front.edges.neckline
  const pk = st.flat.placket
  const w2 = pk ? pk.widthMm / 2 : 0
  const stopAt = neck.findIndex((p) => p.x <= w2 + 1)
  let path = neck.slice(0, stopAt > 0 ? stopAt : neck.length)
  if (withPlacket && pk) {
    const last = path[path.length - 1]
    const y1 = pk.top + pk.lengthMm
    path = [...path, pt(w2, Math.max(last.y, pk.top)), pt(w2, y1 - 6), pt(w2 * 0.4, y1 + 6), pt(0, y1 + 9)]
  }
  const fine = []
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1]
    const b = path[i]
    const nseg = Math.max(1, Math.ceil(dist(a, b) / 3))
    for (let k = 0; k < nseg; k++) fine.push(add(a, mul(sub(b, a), k / nseg)))
  }
  fine.push(path[path.length - 1])
  return embroideryAlong(fine, widthMm, 1, color) + embroideryAlong(mirrorAll(fine), widthMm, -1, color)
}

function captionSvg(st, x, y, T, view) {
  const g = st.doc
  const e = st.front.edges
  const chest = Math.round((4 * e.side[e.side.length - 1].x) / 10)
  const len = Math.round(st.front.lm.cfHem.y / 10)
  const sleeve = Math.round(st.sleeve.totalMm / 10)
  const mats = Object.values(g.materials).map((m) => m.name).join(' · ')
  const font = "font-family=\"Inter, 'Helvetica Neue', Arial, sans-serif\""
  return `<text x="${f(x)}" y="${f(y)}" fill="${T.title}" ${font} font-size="24" font-weight="600">${g.id} · ${g.title} — ${view === 'front' ? 'face' : 'dos'}</text>
  <text x="${f(x)}" y="${f(y + 32)}" fill="${T.caption}" ${font} font-size="16">Taille 42 homme · tour de poitrine fini ${chest} cm · longueur ${len} cm · manche ${sleeve} cm · ${mats}</text>`
}
