// Pièces prêtes à couper : valeur de couture par bord (ourlets 2,5 cm, coutures 1 cm, pli 0), crans
// (découpes, côtés, emmanchures simple devant / double dos, tête de manche), marques de pose, entoilages.
import { regions } from './ops.mjs'
import { pt, add, sub, mul, norm, length, pointAt, tangentAt, mirrorAll, dedupe, signedArea, dist, bbox } from './geom.mjs'

export const SA = { seam: 10, hem: 25, fold: 0 }
const rev = (a) => a.slice().reverse()

/** Abscisse curviligne du point d'une polyligne le plus proche de p. */
function arcOf(line, p) {
  let best = Infinity
  let sBest = 0
  let acc = 0
  for (let i = 1; i < line.length; i++) {
    const a = line[i - 1]
    const b = line[i]
    const ab = sub(b, a)
    const L = Math.hypot(ab.x, ab.y) || 1e-9
    const t = Math.max(0, Math.min(1, ((p.x - a.x) * ab.x + (p.y - a.y) * ab.y) / (L * L)))
    const q = add(a, mul(ab, t))
    const dd = dist(q, p)
    if (dd < best) {
      best = dd
      sBest = acc + t * L
    }
    acc += L
  }
  return sBest
}

function onBoundary(p, poly, tol = 0.6) {
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]
    const b = poly[(i + 1) % poly.length]
    const ab = sub(b, a)
    const L2 = ab.x * ab.x + ab.y * ab.y || 1
    const t = Math.max(0, Math.min(1, ((p.x - a.x) * ab.x + (p.y - a.y) * ab.y) / L2))
    if (dist(p, add(a, mul(ab, t))) < tol) return true
  }
  return false
}

/** Décalage à largeur variable par segment, avec onglets (biseau si l'onglet est trop long). */
export function offsetVar(poly, sa) {
  const n = poly.length
  const out = signedArea(poly) > 0 ? 1 : -1
  const lines = poly.map((a, i) => {
    const b = poly[(i + 1) % n]
    const t = norm(sub(b, a))
    const o = mul(pt(t.y, -t.x), out * sa[i])
    return { a: add(a, o), b: add(b, o), t }
  })
  const res = []
  for (let i = 0; i < n; i++) {
    const L1 = lines[(i - 1 + n) % n]
    const L2 = lines[i]
    const den = L1.t.x * L2.t.y - L1.t.y * L2.t.x
    const lim = 4 * Math.max(sa[i], sa[(i - 1 + n) % n], 1)
    if (Math.abs(den) < 1e-6) {
      res.push(L1.b, L2.a)
      continue
    }
    const q = sub(L2.a, L1.a)
    const u = (q.x * L2.t.y - q.y * L2.t.x) / den
    const x = add(L1.a, mul(L1.t, u))
    if (dist(x, poly[i]) > lim) res.push(L1.b, L2.a)
    else res.push(x)
  }
  return dedupe(res, true)
}

function classify(poly, { fold, hemY, hemSa }) {
  return poly.map((a, i) => {
    const b = poly[(i + 1) % poly.length]
    if (fold && Math.abs(a.x) < 0.01 && Math.abs(b.x) < 0.01) return SA.fold
    if (hemY != null && Math.abs(a.y - hemY) < 0.6 && Math.abs(b.y - hemY) < 0.6) return hemSa
    return SA.seam
  })
}

const notchAt = (line, s, count = 1) => ({ p: pointAt(line, s), t: tangentAt(line, s), count })

/** Toutes les pièces à couper d'un document rejoué, avec valeurs de couture, crans et marques. */
export function cutPieces(st) {
  const g = st.doc
  const out = []
  const hasCuff = st.sleeveFinish?.kind === 'cuff'
  for (const base of ['front', 'back']) {
    const P = st[base]
    const hemY = P.lm[base === 'front' ? 'cfHem' : 'cbHem'].y
    const { regs, seams } = regions(st, base)
    // Repères de crans du corps : milieu de chaque découpe, taille au côté, carrure d'emmanchure.
    const sideX = P.edges.side[0].x
    const waistY = base === 'front' ? P.lm.cfWaist.y : P.lm.waist.y
    const pitch = P.lm.armholePitch
    const bodyNotches = [
      ...seams.map((s) => notchAt(s.seam, length(s.seam) / 2)),
      { p: pt(sideX, waistY), t: pt(0, 1), count: 1 },
      notchAt(P.edges.armhole, arcOf(P.edges.armhole, pitch), base === 'front' ? 1 : 2),
    ]
    if (st.flat.slit) bodyNotches.push({ p: pt(sideX, hemY - st.flat.slit.heightMm), t: pt(0, 1), count: 1 })
    for (const r of regs) {
      const poly = dedupe(r.poly, true)
      const fold = poly.some((p, i) => Math.abs(p.x) < 0.01 && Math.abs(poly[(i + 1) % poly.length].x) < 0.01)
      const sa = classify(poly, { fold, hemY, hemSa: SA.hem })
      out.push({
        name: r.name, base, poly, sa, cutPoly: offsetVar(poly, sa), fold,
        cut: fold ? '1 au pli' : '2 (une paire)', material: r.material,
        notches: bodyNotches.filter((nn) => onBoundary(nn.p, poly)), grain: 'v', kind: 'body',
        marksFrom: base,
      })
    }
  }
  // Manche : crans de tête de manche à la même distance de l'aisselle que les crans d'emmanchure.
  const sl = st.sleeve
  const { regs: sregs, seams: sseams } = regions(st, 'sleeve')
  const cap = sl.edges.cap // bicepsRight (devant) → bicepsLeft (dos)
  const capL = length(cap)
  const fA = length(st.front.edges.armhole)
  const bA = length(st.back.edges.armhole)
  const ease = (capL - fA - bA) / 2
  const sFront = arcOf(st.front.edges.armhole, st.front.lm.armholePitch)
  const sBack = arcOf(st.back.edges.armhole, st.back.lm.armholePitch)
  const top = arcOf(cap, sl.lm.sleeveTop)
  const sleeveNotches = [
    notchAt(cap, sFront + ease * (sFront / fA), 1),
    notchAt(cap, capL - (sBack + ease * (sBack / bA)), 2),
    notchAt(cap, top, 1),
    ...sseams.map((s) => notchAt(s.seam, length(s.seam) * 0.3)),
  ]
  const hemY = sl.edges.hem[0].y
  for (const r of sregs) {
    const poly = dedupe(r.poly, true)
    const sa = classify(poly, { fold: false, hemY, hemSa: hasCuff ? SA.seam : SA.hem })
    out.push({
      name: r.name, base: 'sleeve', poly, sa, cutPoly: offsetVar(poly, sa), fold: false, cut: '2 (une paire)', material: r.material,
      notches: sleeveNotches.filter((nn) => onBoundary(nn.p, poly)), grain: 'v', kind: 'body', marksFrom: 'sleeve',
      capInfo: r.name === 'Manche' ? { capL, armholes: fA + bA, ease: capL - fA - bA } : null,
    })
  }
  for (const p of st.pieces) {
    const poly = dedupe(p.poly, true)
    const fold = !!p.fold
    const sa = classify(poly, { fold })
    const long = ['cuff', 'placket'].includes(p.kind)
    out.push({ name: p.name, base: null, poly, sa, cutPoly: offsetVar(poly, sa), fold, cut: p.cut, material: p.material, notches: [], grain: long ? 'long' : 'v', foldLines: p.foldLine ?? [], kind: p.kind })
  }
  return out
}

/** Marques de pose d'une pièce, dans ses coordonnées (devant : poche, galons, boutons, fentes, broderie). */
export function marksFor(st, piece) {
  const m = []
  if (piece.marksFrom === 'front') {
    for (const k of st.marks.front) {
      if (k.kind === 'line') m.push({ type: 'line', pts: k.pts, label: k.label })
      if (k.kind === 'outline') m.push({ type: 'poly', pts: k.poly, label: k.label })
      if (k.kind === 'button') m.push({ type: 'button', p: pt(k.x, k.y) })
      if (k.kind === 'slit') m.push({ type: 'line', pts: [pt(k.x, k.y0), pt(k.x, k.y1)], label: k.label, solid: true })
      if (k.kind === 'zone') m.push({ type: 'zone', along: st.front.edges.neckline, width: k.widthMm, label: k.label })
    }
  }
  if (piece.marksFrom === 'sleeve' && piece.name === 'Manche') {
    for (const k of st.marks.sleeve) {
      if (k.kind === 'slit') {
        const h = st.sleeve.edges.hem
        const x = h[0].x + k.at * (h[1].x - h[0].x)
        m.push({ type: 'line', pts: [pt(x, h[0].y), pt(x, h[0].y - k.lengthMm)], label: k.label, solid: true })
      }
    }
  }
  return m
}

export { bbox, rev, mirrorAll }
