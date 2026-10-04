// Plan de coupe par tissu : laize pliée en deux (pli à gauche, lisières à droite), droit fil parallèle aux
// lisières, pièces « au pli » contre le pli, rangement « skyline » en bas à gauche sur les boîtes englobantes.
import { cutPieces } from './cut.mjs'
import { bbox, d, f } from './geom.mjs'

const GAP = 6

export function skylinePack(items, width, gap = GAP) {
  let sky = [{ x: 0, w: width, y: 0 }]
  const placed = []
  for (const it of items) {
    let best = null
    const xs = it.fold ? [0] : sky.map((s) => s.x)
    for (const x of xs) {
      if (x + it.w > width + 0.01) continue
      let y = 0
      for (const s of sky) if (s.x < x + it.w && s.x + s.w > x) y = Math.max(y, s.y)
      if (!best || y < best.y - 0.01 || (Math.abs(y - best.y) < 0.01 && x < best.x)) best = { x, y }
    }
    if (!best) throw new Error(`pièce trop large pour la laize : ${it.name} (${Math.round(it.w)} mm)`)
    placed.push({ ...it, ...best })
    const top = best.y + it.h + gap
    const next = []
    for (const s of sky) {
      const a = s.x
      const b = s.x + s.w
      if (b <= best.x || a >= best.x + it.w) next.push(s)
      else {
        if (a < best.x) next.push({ x: a, w: best.x - a, y: s.y })
        if (b > best.x + it.w) next.push({ x: best.x + it.w, w: b - best.x - it.w, y: s.y })
      }
    }
    next.push({ x: best.x, w: it.w, y: top })
    sky = next.sort((p, q) => p.x - q.x)
  }
  return placed
}

/** Plan de coupe d'une matière. laizeMm : largeur du tissu déplié. */
export function cutPlan(st, material, { laizeMm = 1500 } = {}) {
  const width = laizeMm / 2
  const items = cutPieces(st)
    .filter((p) => p.material === material)
    .map((p) => {
      const b = bbox(p.cutPoly)
      return { name: p.name, poly: p.cutPoly, fold: p.fold, cut: p.cut, b, w: b.x1 - b.x0 + (p.fold ? 0 : GAP), h: b.y1 - b.y0 }
    })
    .sort((a, b) => (a.fold !== b.fold ? (a.fold ? -1 : 1) : b.w * b.h - a.w * a.h))
  const placed = skylinePack(items, width)
  const lengthMm = Math.max(0, ...placed.map((p) => p.y + p.h))
  const metrage = Math.ceil((lengthMm + 100) / 100) / 10 // marge de 10 cm, arrondi au décimètre supérieur
  return { material, laizeMm, width, placed, lengthMm, metrage }
}

/** Dessin du plan : longueur du tissu à l'horizontale, pli en haut, lisières en bas ; numéros et légende. */
export function cutPlanSvg(plan, { name, ink = '#f1f1ee', bg = '#252525', fabric = '#3a3a3a', k = 0.42, title = '' } = {}) {
  const L = Math.max(plan.lengthMm, 400)
  const legendH = 18 * Math.ceil(plan.placed.length / 3) + 20
  const Wd = Math.max(L * k + 120, 980)
  const Hd = plan.width * k + 110 + legendH
  const font = "font-family=\"Inter, 'Helvetica Neue', Arial, sans-serif\""
  let pieces = ''
  let legend = ''
  plan.placed.forEach((p, i) => {
    const pts = p.poly.map((q) => ({ x: 40 + (p.y + (q.y - p.b.y0)) * k, y: 70 + (p.x + (q.x - p.b.x0)) * k }))
    pieces += `<path d="${d(pts, true)}" fill="${bg}" fill-opacity="0.6" stroke="${ink}" stroke-width="1.2"/>`
    const cx = 40 + (p.y + p.h / 2) * k
    const cy = 70 + (p.x + (p.b.x1 - p.b.x0) / 2) * k
    pieces += `<circle cx="${f(cx)}" cy="${f(cy)}" r="9" fill="${ink}"/><text x="${f(cx)}" y="${f(cy + 4)}" text-anchor="middle" fill="${bg}" ${font} font-size="11" font-weight="700">${i + 1}</text>`
    const single = /^1( |$)/.test(p.cut) && !p.fold
    legend += `<text x="${40 + (i % 3) * 300}" y="${f(80 + plan.width * k + 36 + Math.floor(i / 3) * 18)}" fill="${ink}" ${font} font-size="12">${i + 1}. ${p.name}${single ? ' (une épaisseur)' : ''}</text>`
  })
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${f(Wd)} ${f(Hd)}" width="${f(Wd)}" height="${f(Hd)}">
  <rect width="100%" height="100%" fill="${bg}"/>
  <text x="40" y="28" fill="${ink}" ${font} font-size="15" font-weight="600">${title || 'Plan de coupe'} — ${name}</text>
  <text x="40" y="48" fill="${ink}" fill-opacity="0.7" ${font} font-size="12">Laize ${plan.laizeMm / 10} cm pliée en deux · longueur ${(plan.lengthMm / 10).toFixed(0)} cm · métrage conseillé ${plan.metrage.toFixed(2).replace('.', ',')} m</text>
  <rect x="40" y="70" width="${f(L * k)}" height="${f(plan.width * k)}" fill="${fabric}" stroke="${ink}" stroke-width="1"/>
  <text x="${f(46 + L * k)}" y="76" fill="${ink}" ${font} font-size="10">pli</text>
  <text x="${f(46 + L * k)}" y="${f(70 + plan.width * k)}" fill="${ink}" ${font} font-size="10">lisières</text>
  ${pieces}
  <path d="M40 70H${f(40 + L * k)}" stroke="${ink}" stroke-width="2" stroke-dasharray="12 4 2 4"/>
  ${legend}
</svg>`
}
