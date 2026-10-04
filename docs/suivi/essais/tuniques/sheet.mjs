// Planche de patrons prête à couper : trait plein = coupe (valeurs de couture comprises), tirets = couture,
// crans simples et doubles, pli, droit fil, marques de pose. Deux thèmes : écran (anthracite) et impression.
import { cutPieces, marksFor, SA } from './cut.mjs'
import { pt, add, mul, d, f, bbox, offset, mirrorAll, mirror, dedupe } from './geom.mjs'
import { patternDefs, THEMES } from './motifs.mjs'
import { skylinePack } from './marker.mjs'

export const SHEET_THEMES = {
  screen: { bg: '#252525', ink: '#f1f1ee', grey: '#9a9a96', mark: '#e6c46a', fillMain: '#2c2c2c', printFills: false, defsTheme: THEMES.line, fs: 1 },
  print: { bg: '#ffffff', ink: '#111111', grey: '#555555', mark: '#b07800', fillMain: '#ffffff', printFills: true, defsTheme: THEMES.color, fs: 0.36 },
}
const FONT = "font-family=\"Inter, 'Helvetica Neue', Arial, sans-serif\""
const rev = (a) => a.slice().reverse()

function tint(id, st, key, S) {
  const tone = st.doc.materials[key]?.tone ?? 'main'
  if (S.printFills) return { fill: S.fillMain, op: 1 }
  if (tone === 'bogolan' || tone === 'geo') return { fill: `url(#${id}-${tone})`, op: 0.55 }
  if (tone === 'light') return { fill: `url(#${id}-weave)`, op: 0.8 }
  return { fill: S.fillMain, op: 1 }
}

/** Faut-il déplier le devant (marques différentes à gauche et à droite) ? */
function unfold(st, piece) {
  return piece.marksFrom === 'front' && piece.fold && marksFor(st, piece).some((m) => (m.pts ?? [m.p]).some((p) => p && p.x < -1))
}

/** Contenu SVG d'une pièce dans ses propres coordonnées (mm). */
export function pieceContent(id, st, piece, S, { labels = true } = {}) {
  const g = st.doc
  const full = unfold(st, piece)
  const net = full ? dedupe([...piece.poly, ...rev(mirrorAll(piece.poly))], true) : piece.poly
  const cutL = full ? dedupe([...piece.cutPoly, ...rev(mirrorAll(piece.cutPoly))], true) : piece.cutPoly
  const b = bbox(cutL)
  const t = tint(id, st, piece.material, S)
  const cid = `${id}-k${Math.abs(Math.round(b.x0 * 7 + b.y1 * 13 + piece.name.length * 101))}`
  let s = `<clipPath id="${cid}"><path d="${d(cutL, true)}"/></clipPath>`
  s += `<path d="${d(cutL, true)}" fill="${S.fillMain}"/>`
  if (t.fill !== S.fillMain) s += `<path d="${d(net, true)}" fill="${t.fill}" fill-opacity="${t.op}"/>`
  s += `<path d="${d(net, true)}" fill="none" stroke="${S.ink}" stroke-width="1.2" stroke-dasharray="6 4"/>`
  s += `<path d="${d(cutL, true)}" fill="none" stroke="${S.ink}" stroke-width="2" stroke-linejoin="round"/>`
  if (piece.fold) {
    const ys = piece.poly.filter((p) => Math.abs(p.x) < 0.01).map((p) => p.y)
    const y0 = Math.min(...ys)
    const y1 = Math.max(...ys)
    s += `<path d="M0 ${f(y0)}V${f(y1)}" stroke="${S.ink}" stroke-width="1.4" stroke-dasharray="14 4 2 4"/>`
    if (!full) {
      s += `<path d="M0 ${f(y0 + 0.2 * (y1 - y0))}H-24V${f(y0 + 0.8 * (y1 - y0))}H0" fill="none" stroke="${S.ink}" stroke-width="1.4"/>`
      s += `<path d="M0 ${f(y0 + 0.2 * (y1 - y0))}l-8 -4.5v9zM0 ${f(y0 + 0.8 * (y1 - y0))}l-8 -4.5v9z" fill="${S.ink}"/>`
      s += `<text transform="translate(-31 ${f((y0 + y1) / 2)}) rotate(-90)" text-anchor="middle" fill="${S.ink}" ${FONT} font-size="${f(12 * Math.max(S.fs, 0.5))}">pli</text>`
    }
  }
  const pb = bbox(net)
  for (const y of piece.foldLines ?? []) s += `<path d="M${f(pb.x0)} ${f(pb.y0 + y)}H${f(pb.x1)}" stroke="${S.ink}" stroke-width="1.1" stroke-dasharray="10 4 2 4"/>`
  if (piece.kind === 'placket') s += `<path d="M${f((pb.x0 + pb.x1) / 2)} ${f(pb.y0)}V${f(pb.y1)}" stroke="${S.ink}" stroke-width="1.1" stroke-dasharray="10 4 2 4"/>`
  let mk = ''
  for (const m of marksFor(st, piece)) {
    if (m.type === 'line') mk += `<path d="${d(m.pts)}" fill="none" stroke="${S.mark}" stroke-width="${m.solid ? 2.4 : 2}" ${m.solid ? '' : 'stroke-dasharray="6 4"'}/>`
    if (m.type === 'poly') mk += `<path d="${d(m.pts, true)}" fill="none" stroke="${S.mark}" stroke-width="2" stroke-dasharray="6 4"/>`
    if (m.type === 'button') mk += `<path d="M${f(m.p.x - 6)} ${f(m.p.y - 6)}L${f(m.p.x + 6)} ${f(m.p.y + 6)}M${f(m.p.x + 6)} ${f(m.p.y - 6)}L${f(m.p.x - 6)} ${f(m.p.y + 6)}" stroke="${S.mark}" stroke-width="2"/>`
    if (m.type === 'zone') {
      const band = [...m.along, ...rev(offset(m.along, m.width))]
      mk += `<path d="${d(band, true)}" fill="${S.mark}" fill-opacity="0.18" stroke="${S.mark}" stroke-width="1.3" stroke-dasharray="6 4"/>`
    }
  }
  s += `<g clip-path="url(#${cid})">${mk}</g>`
  const notches = full ? [...piece.notches, ...piece.notches.map((n) => ({ ...n, p: mirror(n.p), t: pt(-n.t.x, n.t.y) }))] : piece.notches
  for (const n of notches) {
    const nn = pt(n.t.y, -n.t.x)
    for (let k = 0; k < n.count; k++) {
      const c = add(n.p, mul(n.t, (k - (n.count - 1) / 2) * 6))
      const a = add(c, mul(nn, -(SA.seam + 3)))
      const e = add(c, mul(nn, SA.seam + 3))
      s += `<path d="M${f(a.x)} ${f(a.y)}L${f(e.x)} ${f(e.y)}" stroke="${S.ink}" stroke-width="2"/>`
    }
  }
  const bw = pb.x1 - pb.x0
  const bh = pb.y1 - pb.y0
  const cx = piece.fold && !full ? pb.x0 + Math.min(bw * 0.62, bw - 30) : pb.x0 + bw / 2
  const cy = pb.y0 + bh / 2
  const vertical = piece.grain === 'v' ? true : bh >= bw
  const half = Math.max(20, (vertical ? bh : bw) * 0.3)
  const g0 = vertical ? pt(cx, cy - half) : pt(cx - half, cy)
  const g1 = vertical ? pt(cx, cy + half) : pt(cx + half, cy)
  const ang = vertical ? 90 : 0
  s += `<path d="M${f(g0.x)} ${f(g0.y)}L${f(g1.x)} ${f(g1.y)}" stroke="${S.ink}" stroke-width="1.5"/>`
  s += `<path d="M0 0l-11 -5v10z" fill="${S.ink}" transform="translate(${f(g1.x)} ${f(g1.y)}) rotate(${ang})"/>`
  s += `<path d="M0 0l-11 -5v10z" fill="${S.ink}" transform="translate(${f(g0.x)} ${f(g0.y)}) rotate(${ang + 180})"/>`
  const small = bw < 260 || bh < 150
  if (labels) {
    const lx = small ? b.x0 : vertical ? cx + 12 : cx
    const ly = small ? b.y1 + 22 * S.fs : vertical ? cy - 6 : cy - 66 * S.fs
    const anchor = small || vertical ? 'start' : 'middle'
    const cutTxt = full ? `${piece.cut} — marques gauche et droite` : piece.cut
    const mat = g.materials[piece.material]?.name ?? ''
    s += `<text x="${f(lx)}" y="${f(ly)}" text-anchor="${anchor}" fill="${S.ink}" ${FONT} font-size="${f((small ? 13 : 17) * S.fs)}" font-weight="600">${piece.name}</text>`
    s += `<text x="${f(lx)}" y="${f(ly + (small ? 16 : 21) * S.fs)}" text-anchor="${anchor}" fill="${S.grey}" ${FONT} font-size="${f((small ? 11.5 : 13) * S.fs)}">Couper ${cutTxt} · T42</text>`
    s += `<text x="${f(lx)}" y="${f(ly + (small ? 31 : 39) * S.fs)}" text-anchor="${anchor}" fill="${S.grey}" ${FONT} font-size="${f((small ? 11.5 : 13) * S.fs)}">${mat}</text>`
  }
  return { svg: s, bbox: b, full, small }
}

/** Rangement en étagères, plus grandes pièces d'abord. */
export function pack(items, maxW, gap = 46) {
  const order = items.map((it, i) => ({ ...it, i })).sort((a, b) => b.h - a.h)
  let x = 0
  let y = 0
  let rowH = 0
  const pos = []
  for (const it of order) {
    if (x > 0 && x + it.w > maxW) {
      x = 0
      y += rowH + gap
      rowH = 0
    }
    pos[it.i] = { x: x + (it.fold ? 40 : 0), y }
    x += it.w + gap + (it.fold ? 40 : 0)
    rowH = Math.max(rowH, it.h)
  }
  return { pos, height: y + rowH }
}

/** Disposition des pièces (mm) : contenu placé, taille totale. */
export function layoutPieces(id, st, S, maxW = 1750, packer = 'shelf') {
  const pieces = cutPieces(st)
  const contents = pieces.map((p) => pieceContent(id, st, p, S))
  const dims = contents.map((c, i) => ({ w: Math.max(c.bbox.x1 - c.bbox.x0, c.small ? 190 : 0), h: c.bbox.y1 - c.bbox.y0 + (c.small ? 52 : 0), fold: pieces[i].fold && !c.full }))
  let pos
  let height
  if (packer === 'skyline') {
    // Rangement serré pour l'impression : la place du repère de pli (40 mm) est comprise dans la largeur.
    const items = dims.map((dm, i) => ({ i, w: dm.w + (dm.fold ? 40 : 0) + 12, h: dm.h + 12, fold: false })).sort((a, b) => b.h * b.w - a.h * a.w)
    const placed = skylinePack(items, maxW, 0)
    pos = []
    for (const p of placed) pos[p.i] = { x: p.x + (dims[p.i].fold ? 40 : 0), y: p.y }
    height = Math.max(...placed.map((p) => p.y + p.h))
  } else ({ pos, height } = pack(dims, maxW))
  let body = ''
  const boxes = []
  contents.forEach((c, i) => {
    body += `<g transform="translate(${f(pos[i].x - c.bbox.x0)} ${f(pos[i].y - c.bbox.y0)})">${c.svg}</g>`
    boxes.push({ x0: pos[i].x - (pieces[i].fold && !c.full ? 40 : 0), y0: pos[i].y, x1: pos[i].x + dims[i].w, y1: pos[i].y + dims[i].h })
  })
  return { pieces, body, height, width: maxW, boxes }
}

export function sheetSvg(st, { id = 's', theme = 'screen' } = {}) {
  const g = st.doc
  const S = SHEET_THEMES[theme]
  const { pieces, body, height, width } = layoutPieces(id, st, S)
  const W = width + 120
  const top = 120
  const listY = top + height + 70
  const lines = pieces.map((p) => `${p.name} — ${p.cut} — ${g.materials[p.material]?.name ?? ''}`)
  const inter = pieces.filter((p) => /entoilage/.test(p.cut)).map((p) => p.name)
  const trims = st.trims.map((t) => `${t.name} ${t.widthMm} mm : ${Math.ceil(t.lengthMm / 50) * 5 + 10} cm`)
  const extras = [...trims, st.buttons ? `Boutons : ${st.buttons}` : null, inter.length ? `Entoilage thermocollant : ${inter.join(', ')}` : null].filter(Boolean)
  const colW = (W - 120) / 2
  const listRows = Math.max(Math.ceil(lines.length / 2), 1)
  const H = listY + 40 + listRows * 24 + (extras.length ? 30 + extras.length * 24 : 0) + 60
  const list = lines.map((t, i) => `<text x="${60 + (i % 2) * colW}" y="${listY + 40 + Math.floor(i / 2) * 24}" fill="${S.ink}" ${FONT} font-size="15">${t}</text>`).join('')
  const extraY = listY + 40 + listRows * 24 + 20
  const ex = extras.map((t, i) => `<text x="60" y="${extraY + i * 24}" fill="${S.mark}" ${FONT} font-size="15">${t}</text>`).join('')
  const scale = `<g transform="translate(${W - 60 - 100} 60)"><path d="M0 0H100M0 -6V6M100 -6V6M50 -4V4" stroke="${S.ink}" stroke-width="2"/><text x="50" y="-12" text-anchor="middle" fill="${S.grey}" ${FONT} font-size="13">10 cm</text></g>`
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
  <defs>${patternDefs(id, S.defsTheme, { light: g.materials.light?.color })}</defs>
  <rect width="${W}" height="${H}" fill="${S.bg}"/>
  <text x="60" y="58" fill="${S.ink}" ${FONT} font-size="26" font-weight="600">Patrons · ${g.id} · ${g.title}</text>
  <text x="60" y="88" fill="${S.grey}" ${FONT} font-size="15">Taille 42 homme · trait plein : coupe · tirets : couture · valeurs de couture comprises : 1 cm, ourlets 2,5 cm · crans : simple devant, double dos</text>
  ${scale}
  <g transform="translate(60 ${top})">${body}</g>
  <text x="60" y="${listY}" fill="${S.ink}" ${FONT} font-size="18" font-weight="600">Pièces à couper (${pieces.length})</text>
  ${list}
  ${ex}
</svg>`
  return { svg, pieces }
}
