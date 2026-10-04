// Exports du patron : SVG à l'échelle 1, PDF en pages A4 à assembler, DXF de type AAMA (calques 1, 4, 7, 8, 14, 15).
import { layoutPieces, SHEET_THEMES } from './sheet.mjs'
import { cutPieces, marksFor, SA } from './cut.mjs'
import { patternDefs } from './motifs.mjs'
import { bbox, f, add, mul, pt } from './geom.mjs'

const FONT = "font-family=\"Inter, 'Helvetica Neue', Arial, sans-serif\""

/** Disposition des pièces à l'échelle 1, thème impression. */
export function layout1x1(st, id = 'x', maxW = 760) {
  const S = SHEET_THEMES.print
  const lay = layoutPieces(id, st, S, maxW, 'skyline')
  const defs = patternDefs(id, S.defsTheme, { light: st.doc.materials.light?.color })
  return { ...lay, defs, S }
}

/** SVG unique à l'échelle 1 (unités : mm). */
export function svg1x1(st) {
  const { body, width, height, defs } = layout1x1(st, 'u')
  const W = width + 80
  const H = height + 140
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}mm" height="${H}mm" viewBox="0 0 ${W} ${H}">
<defs>${defs}</defs><rect width="${W}" height="${H}" fill="#fff"/>
<text x="40" y="40" ${FONT} font-size="12" font-weight="600">${st.doc.id} · ${st.doc.title} · taille 42 · échelle 1</text>
<g transform="translate(40 90)">${body}</g></svg>`
}

function countUsed(rows, cols, used) {
  let n = 0
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) if (used(r, c)) n++
  return n
}

/** Boîtes des pièces dans la disposition à l'échelle 1 (mm). */
function layout1x1Boxes(st) {
  return layout1x1(st, 'b').boxes
}

/** Page HTML imprimable : couverture puis pages A4 numérotées par rangée (A, B…) et colonne (1, 2…). */
export function a4Html(st) {
  const { body, width, height, defs } = layout1x1(st, 'a')
  const TW = 190
  const TH = 277
  const ox = -10 // marge de départ, mm
  const oy = -10
  const cols = Math.ceil((width + 20) / TW)
  const rows = Math.ceil((height + 20) / TH)
  const label = (r, c) => `${String.fromCharCode(65 + r)}${c + 1}`
  const marks = (x, y) => `<path d="M${x - 5} ${y}H${x + 5}M${x} ${y - 5}V${y + 5}" stroke="#000" stroke-width="0.25"/>`
  let pages = ''
  // Couverture : plan d'assemblage, carré témoin
  let map = ''
  const k = Math.min(150 / (cols * TW), 150 / (rows * TH))
  const boxes = layout1x1Boxes(st)
  const used = (r, c) => boxes.some((b) => b.x1 > ox + c * TW && b.x0 < ox + (c + 1) * TW && b.y1 > oy + r * TH && b.y0 < oy + (r + 1) * TH)
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) map += `<rect fill="#000" fill-opacity="${used(r, c) ? 0 : 0.12}" x="${f(c * TW * k)}" y="${f(r * TH * k)}" width="${f(TW * k)}" height="${f(TH * k)}" stroke="#888" stroke-width="0.3"/><text x="${f((c + 0.5) * TW * k)}" y="${f((r + 0.5) * TH * k + 2)}" text-anchor="middle" ${FONT} font-size="5" fill="#888">${label(r, c)}</text>`
  pages += `<section class="page"><svg width="190mm" height="277mm" viewBox="0 0 190 277">
    <text x="0" y="10" ${FONT} font-size="7" font-weight="600">${st.doc.id} · ${st.doc.title}</text>
    <text x="0" y="18" ${FONT} font-size="4">Patron taille 42 homme · ${countUsed(rows, cols, used)} pages A4 à imprimer à 100 %, sans mise à l'échelle.</text>
    <text x="0" y="29" ${FONT} font-size="4">Grille de ${rows} rangées × ${cols} colonnes ; cases grisées : pages vides, non fournies.</text>
    <text x="0" y="24" ${FONT} font-size="4">Assembler les pages bord à bord en faisant coïncider les croix ; vérifier le carré de 10 cm.</text>
    <rect x="0" y="36" width="100" height="100" fill="none" stroke="#000" stroke-width="0.4"/><text x="50" y="88" text-anchor="middle" ${FONT} font-size="6">10 cm × 10 cm</text>
    <defs>${defs}</defs>
    <g transform="translate(0 150)"><g transform="scale(${f(k)}) translate(${-ox} ${-oy})" opacity="0.6">${body}</g>${map}</g>
  </svg></section>`
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!used(r, c)) continue
      const vx = ox + c * TW
      const vy = oy + r * TH
      pages += `<section class="page"><svg width="190mm" height="277mm" viewBox="${vx} ${vy} ${TW} ${TH}">
        <defs>${defs}</defs>${body}
        <rect x="${vx}" y="${vy}" width="${TW}" height="${TH}" fill="none" stroke="#bbb" stroke-width="0.2"/>
        ${marks(vx, vy)}${marks(vx + TW, vy)}${marks(vx, vy + TH)}${marks(vx + TW, vy + TH)}
        <text x="${vx + TW - 3}" y="${vy + TH - 3}" text-anchor="end" ${FONT} font-size="6" fill="#999">${label(r, c)}</text>
      </svg></section>`
    }
  }
  return `<!doctype html><html><head><meta charset="utf-8"><style>
  @page { size: A4; margin: 10mm; }
  html, body { margin: 0; }
  .page { width: 190mm; height: 277mm; page-break-after: always; overflow: hidden; }
  .page:last-child { page-break-after: auto; }
  </style></head><body>${pages}</body></html>`
}

// --- DXF (R12, ASCII), calques AAMA : 1 contour, 4 crans, 7 droit fil, 8 lignes internes, 14 couture, 15 texte.
function dxfPolyline(pts, layer, closed) {
  let s = `0\nPOLYLINE\n8\n${layer}\n66\n1\n70\n${closed ? 1 : 0}\n`
  for (const p of pts) s += `0\nVERTEX\n8\n${layer}\n10\n${f(p.x)}\n20\n${f(-p.y)}\n`
  return s + `0\nSEQEND\n8\n${layer}\n`
}
const dxfLine = (a, b, layer) => `0\nLINE\n8\n${layer}\n10\n${f(a.x)}\n20\n${f(-a.y)}\n11\n${f(b.x)}\n21\n${f(-b.y)}\n`
const dxfText = (p, h, text, layer = 15) => `0\nTEXT\n8\n${layer}\n10\n${f(p.x)}\n20\n${f(-p.y)}\n40\n${h}\n1\n${text}\n`

export function dxf(st) {
  const pieces = cutPieces(st)
  let blocks = ''
  let inserts = ''
  let x = 0
  pieces.forEach((p, i) => {
    const name = `P${i + 1}`
    const b = bbox(p.cutPoly)
    let e = dxfPolyline(p.cutPoly, 1, true) + dxfPolyline(p.poly, 14, true)
    const cx = (b.x0 + b.x1) / 2
    e += dxfLine(pt(cx, b.y0 + 0.25 * (b.y1 - b.y0)), pt(cx, b.y0 + 0.75 * (b.y1 - b.y0)), 7)
    for (const n of p.notches) {
      const nn = pt(n.t.y, -n.t.x)
      for (let k = 0; k < n.count; k++) {
        const c = add(n.p, mul(n.t, (k - (n.count - 1) / 2) * 6))
        e += dxfLine(c, add(c, mul(nn, SA.seam)), 4)
        e += dxfLine(c, add(c, mul(nn, -SA.seam)), 4)
      }
    }
    for (const m of marksFor(st, p)) {
      if (m.type === 'line') e += dxfPolyline(m.pts, 8, false)
      if (m.type === 'poly') e += dxfPolyline(m.pts, 8, true)
    }
    const tp = pt(cx, (b.y0 + b.y1) / 2)
    e += dxfText(tp, 6, `Piece Name: ${p.name}`, 1) + dxfText(add(tp, pt(0, 9)), 5, 'Size: 42', 1) + dxfText(add(tp, pt(0, 17)), 5, `Quantity: ${p.cut}`, 1) + dxfText(add(tp, pt(0, 25)), 5, `Material: ${st.doc.materials[p.material]?.name ?? ''}`, 1)
    blocks += `0\nBLOCK\n8\n0\n2\n${name}\n70\n0\n10\n0\n20\n0\n3\n${name}\n${e}0\nENDBLK\n8\n0\n`
    inserts += `0\nINSERT\n8\n0\n2\n${name}\n10\n${f(x - b.x0)}\n20\n0\n`
    x += b.x1 - b.x0 + 50
  })
  const layers = [1, 4, 7, 8, 14, 15].map((l) => `0\nLAYER\n2\n${l}\n70\n0\n62\n7\n6\nCONTINUOUS\n`).join('')
  return `0\nSECTION\n2\nHEADER\n9\n$ACADVER\n1\nAC1009\n9\n$INSUNITS\n70\n4\n0\nENDSEC\n0\nSECTION\n2\nTABLES\n0\nTABLE\n2\nLAYER\n70\n6\n${layers}0\nENDTAB\n0\nENDSEC\n0\nSECTION\n2\nBLOCKS\n${blocks}0\nENDSEC\n0\nSECTION\n2\nENTITIES\n${inserts}0\nENDSEC\n0\nEOF\n`
}
