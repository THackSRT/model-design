// Opérations génériques de l'essai : chacune lit des rôles de bords et des repères, jamais un nom de vêtement.
// Un document = base (options de Brian) + liste d'opérations ; le même code sert aux cinq tuniques.
import { draftBase } from './base.mjs'
import { pt, add, sub, mul, norm, cubic, smooth, length, pointAt, slice, offset, dist, xAtY, crossings, splitPolygon, pointInPolygon } from './geom.mjs'

const clone = (o) => JSON.parse(JSON.stringify(o))
const rev = (a) => a.slice().reverse()

/** Contour fermé d'une demi-pièce de corps (devant ou dos) à partir de ses bords. */
export function bodyPolygon(piece, centre) {
  const e = piece.edges
  return [...e[centre], ...e.hem.slice(1), ...e.side.slice(1), ...e.armhole.slice(1), ...e.shoulder.slice(1), ...e.neckline.slice(1, -1)]
}

/** Contour fermé de la manche. */
export function sleevePolygon(sl) {
  const e = sl.edges
  return [...e.underarmL, ...e.hem.slice(1), ...e.underarmR.slice(1), ...e.cap.slice(1, -1)]
}

/** Point d'un chemin décrit par repères : bord + fraction, repère + décalage, ou coordonnées. */
function resolvePoint(st, piece, spec) {
  const P = st[piece]
  if (spec.edge && (spec.y != null || spec.x != null)) {
    const e = P.edges[spec.edge]
    const key = spec.y != null ? 'y' : 'x'
    const v = spec[key]
    for (let i = 1; i < e.length; i++) {
      const a = e[i - 1]
      const b = e[i]
      if ((a[key] - v) * (b[key] - v) <= 0 && a[key] !== b[key]) {
        const t = (v - a[key]) / (b[key] - a[key])
        return pt(a.x + t * (b.x - a.x) + (spec.dx ?? 0), a.y + t * (b.y - a.y) + (spec.dy ?? 0))
      }
    }
    throw new Error(`repère : ${key} = ${v} hors du bord ${spec.edge}`)
  }
  if (spec.edge) {
    const e = P.edges[spec.edge]
    const L = length(e)
    const s = (spec.mm ?? spec.t * L)
    return pointAt(spec.fromEnd ? rev(e) : e, s)
  }
  const halfWidth = P.lm.armhole.x
  const x = spec.xPct != null ? spec.xPct * halfWidth : spec.x ?? 0
  const y = spec.ref ? P.lm[spec.ref].y + (spec.dy ?? 0) : spec.y ?? 0
  return pt(x + (spec.dx ?? 0), y)
}

/** Polyligne d'un chemin, prolongée de 15 mm aux deux bouts pour croiser franchement le contour. */
export function resolvePath(st, piece, spec, extend = 15) {
  const pts = spec.points.map((p) => resolvePoint(st, piece, p))
  const line = spec.smooth ? smooth(pts, 16) : pts
  if (!extend) return line
  const a = norm(sub(line[0], line[1]))
  const b = norm(sub(line[line.length - 1], line[line.length - 2]))
  return [add(line[0], mul(a, extend)), ...line, add(line[line.length - 1], mul(b, extend))]
}

// --- Opérations -------------------------------------------------------------------------------------------

const OPS = {
  /** Encolure ronde ou en V : écarte le point d'encolure le long de l'épaule, creuse le milieu devant. */
  neckline(st, { lowerMm = 0, widenMm = 0, shape = 'round', vDepthMm = 160, backLowerMm = 0, facingMm = 55 }) {
    for (const piece of ['front', 'back']) {
      const P = st[piece]
      const sh = P.edges.shoulder // épaule → encolure
      const L = length(sh)
      const newHps = pointAt(sh, L - widenMm)
      P.edges.shoulder = slice(sh, 0, L - widenMm)
      const centreKey = piece === 'front' ? 'cfNeck' : 'cbNeck'
      const c0 = P.lm[centreKey]
      const down = norm(pt(-(sh[sh.length - 1].y - sh[0].y), sh[sh.length - 1].x - sh[0].x)) // perpendiculaire à l'épaule
      const dir = down.y < 0 ? mul(down, -1) : down
      let centre
      let curve
      if (piece === 'front' && shape === 'v') {
        centre = pt(0, vDepthMm)
        curve = cubic(newHps, add(newHps, mul(dir, 25)), add(centre, mul(norm(sub(newHps, centre)), 40)), centre, 24)
      } else {
        centre = pt(0, c0.y + (piece === 'front' ? lowerMm : backLowerMm))
        const k1 = 0.55 * (centre.y - newHps.y)
        curve = cubic(newHps, add(newHps, mul(dir, k1)), add(centre, pt(0.62 * newHps.x, 0)), centre, 28)
      }
      P.edges.neckline = curve
      P.lm.hps = newHps
      P.lm[centreKey] = centre
      P.edges[piece === 'front' ? 'cf' : 'cb'][0] = centre
      // Parementure : encolure + décalage vers l'intérieur de la pièce.
      const inner = offset(curve, facingMm)
      st.pieces.push({
        name: piece === 'front' ? "Parementure d'encolure devant" : "Parementure d'encolure dos",
        poly: [...curve, ...rev(inner)].map((p) => pt(Math.max(0, p.x), p.y)),
        cut: '1 au pli', material: 'main', fold: true, kind: 'facing',
      })
    }
    st.flat.neckShape = shape
  },

  /** Longueur totale de manche, mesurée depuis le haut de la tête de manche. */
  sleeveLength(st, { totalMm }) {
    const S = st.sleeve
    const yCut = S.lm.sleeveTop.y + totalMm
    const cut = (line) => {
      const out = [line[0]]
      for (let i = 1; i < line.length; i++) {
        const a = line[i - 1]
        const b = line[i]
        if ((a.y - yCut) * (b.y - yCut) <= 0 && a.y !== b.y) {
          out.push(pt(a.x + ((yCut - a.y) / (b.y - a.y)) * (b.x - a.x), yCut))
          return out
        }
        out.push(b)
      }
      return out
    }
    S.edges.underarmL = cut(S.edges.underarmL)
    const r = cut(rev(S.edges.underarmR))
    S.edges.underarmR = rev(r)
    S.edges.hem = [S.edges.underarmL[S.edges.underarmL.length - 1], S.edges.underarmR[0]]
    S.totalMm = totalMm
  },

  /** Poignet : la manche raccourcit de la hauteur du poignet, une pièce rectangulaire s'ajoute. */
  cuff(st, { heightMm = 60, style = 'barrel', easeMm = 60, overlapMm = 20, material = 'main' }) {
    OPS.sleeveLength(st, { totalMm: (st.sleeve.totalMm ?? length([st.sleeve.lm.sleeveTop, pt(0, st.sleeve.edges.hem[0].y)])) - heightMm + 12 })
    const len = st.m.wrist + easeMm + overlapMm
    const h = style === 'french' ? 4 * heightMm : 2 * heightMm
    st.pieces.push({ name: 'Poignet', poly: [pt(0, 0), pt(len, 0), pt(len, h), pt(0, h)], cut: '2 + 2 entoilage', material, kind: 'cuff', fold: false, foldLine: style === 'french' ? [h / 4, h / 2, (3 * h) / 4] : [h / 2] })
    st.sleeveFinish = { kind: 'cuff', heightMm, style, material, flatWidth: (st.m.wrist + easeMm) / 2 }
    st.marks.sleeve.push({ kind: 'slit', at: 0.25, lengthMm: 120, label: 'fente de poignet' })
    // Fente de poignet : patte capucin (dessus) et sous-patte, par manche
    st.pieces.push({ name: 'Patte de fente de poignet', poly: [pt(0, 0), pt(70, 0), pt(70, 150), pt(35, 165), pt(0, 150)], cut: '2 (une paire)', material, kind: 'placket', foldLine: [] })
    st.pieces.push({ name: 'Sous-patte de fente', poly: [pt(0, 0), pt(44, 0), pt(44, 130), pt(0, 130)], cut: '2 (une paire)', material, kind: 'placket', foldLine: [] })
    st.buttons += style === 'french' ? 0 : 2
  },

  /** Bande rapportée parallèle à un bord (ourlet du corps ou bas de manche). */
  band(st, { edge, heightMm, material, name }) {
    if (edge === 'hem') {
      for (const piece of ['front', 'back']) {
        const y = st[piece].lm[piece === 'front' ? 'cfHem' : 'cbHem'].y - heightMm
        st.cuts[piece].push({ path: [pt(-20, y), pt(st[piece].lm.armhole.x + 40, y)], inside: { name: `${name} ${piece === 'front' ? 'devant' : 'dos'}`, material }, insideRef: pt(10, y + heightMm / 2), outsideName: piece === 'front' ? 'Devant' : 'Dos' })
      }
      st.flat.hemBand = { heightMm, material }
    } else {
      const yHem = st.sleeve.edges.hem[0].y
      st.cuts.sleeve.push({ path: [pt(-400, yHem - heightMm), pt(400, yHem - heightMm)], inside: { name, material }, insideRef: pt(0, yHem - heightMm / 2), outsideName: 'Manche' })
      st.sleeveFinish = { kind: 'band', heightMm, material }
    }
  },

  /** Découpe : coupe une pièce le long d'un chemin tracé d'un bord à l'autre ; la partie repérée change de matière. */
  decoupe(st, { piece = 'front', path, inside, insideRef, outsideName = 'Devant', topstitch = true }) {
    const line = resolvePath(st, piece, path)
    st.cuts[piece].push({ path: line, inside, insideRef: resolvePoint(st, piece, insideRef), outsideName, topstitch })
  },

  /** Patte de boutonnage au milieu devant, depuis l'encolure. */
  placket(st, { lengthMm, widthMm = 30, buttons = 3, material = 'main', buttonMm = 13 }) {
    const top = st.front.lm.cfNeck.y
    st.flat.placket = { top, lengthMm, widthMm, buttons, material, buttonMm }
    const w = 2 * widthMm + 20
    const h = lengthMm + 30
    st.pieces.push({ name: 'Patte dessus', poly: [pt(0, 0), pt(w, 0), pt(w, h), pt(0, h)], cut: '1 + entoilage', material, kind: 'placket', foldLine: [] })
    st.pieces.push({ name: 'Patte dessous', poly: [pt(0, 0), pt(w, 0), pt(w, h), pt(0, h)], cut: '1 + entoilage', material, kind: 'placket', foldLine: [] })
    st.marks.front.push({ kind: 'slit', x: 0, y0: top, y1: top + lengthMm, label: 'fente de patte' })
    for (let i = 0; i < buttons; i++) st.marks.front.push({ kind: 'button', x: 0, y: top + 20 + ((lengthMm - 45) * i) / Math.max(1, buttons - 1) })
    st.buttons += buttons
  },

  /** Poche plaquée, posée par repères ; side = 'left' (gauche du porteur) ou 'right'. */
  pocket(st, { side = 'left', xPct = 0.55, ref = 'armhole', dy = -40, widthMm = 120, heightMm = 135, shape = 'straight', material = 'main' }) {
    const cx = xPct * st.front.lm.armhole.x * (side === 'left' ? 1 : -1)
    const y0 = st.front.lm[ref].y + dy
    const w2 = widthMm / 2
    const poly = shape === 'point'
      ? [pt(cx - w2, y0), pt(cx + w2, y0), pt(cx + w2, y0 + heightMm - 25), pt(cx, y0 + heightMm), pt(cx - w2, y0 + heightMm - 25)]
      : [pt(cx - w2, y0), pt(cx + w2, y0), pt(cx + w2, y0 + heightMm), pt(cx - w2, y0 + heightMm)]
    st.flat.pockets.push({ poly, material })
    st.marks.front.push({ kind: 'outline', poly, label: 'poche' })
    const h = heightMm + 30
    const piecePoly = shape === 'point'
      ? [pt(0, 0), pt(widthMm, 0), pt(widthMm, h - 25), pt(widthMm / 2, h), pt(0, h - 25)]
      : [pt(0, 0), pt(widthMm, 0), pt(widthMm, h), pt(0, h)]
    st.pieces.push({ name: 'Poche', poly: piecePoly, cut: '1', material, kind: 'pocket', foldLine: [30] })
  },

  /** Galon cousu en surface le long d'un chemin ; mesure la longueur à acheter. */
  trim(st, { side = 'both', path, widthMm = 40, motif, material, name = 'Galon' }) {
    const line = resolvePath(st, 'front', path, 0)
    const sides = side === 'both' ? ['left', 'right'] : [side]
    for (const s of sides) {
      const pts = s === 'left' ? line : line.map((p) => pt(-p.x, p.y))
      st.flat.trims.push({ pts, widthMm, motif, material })
      st.marks.front.push({ kind: 'line', pts, label: name })
    }
    st.trims.push({ name, material, widthMm, lengthMm: sides.length * length(line) })
  },

  /** Broderie le long de l'encolure (et de la patte) : zone décorative, posée sur le patron. */
  embroidery(st, { widthMm = 32, motif = 'feuilles', withPlacket = true }) {
    st.flat.embroidery = { widthMm, motif, withPlacket }
    st.marks.front.push({ kind: 'zone', along: 'neckline', widthMm, label: 'zone de broderie' })
  },

  /** Fente d'encolure au milieu devant, avec sa parementure. */
  neckSlit(st, { lengthMm = 80, facingWidthMm = 70 }) {
    const top = st.front.lm.cfNeck.y
    st.flat.neckSlit = { top, lengthMm }
    st.marks.front.push({ kind: 'slit', x: 0, y0: top, y1: top + lengthMm, label: "fente d'encolure" })
    const w = facingWidthMm
    st.pieces.push({ name: 'Parementure de fente', poly: [pt(0, 0), pt(w, 0), pt(w, lengthMm + 40), pt(w / 2, lengthMm + 60), pt(0, lengthMm + 40)], cut: '1', material: 'main', kind: 'facing', foldLine: [] })
  },

  /** Fentes de côté depuis l'ourlet. */
  slit(st, { heightMm = 100 }) {
    st.flat.slit = { heightMm }
    st.marks.front.push({ kind: 'notch', at: 'side', fromHemMm: heightMm, label: 'arrêt de fente' })
    st.marks.back.push({ kind: 'notch', at: 'side', fromHemMm: heightMm, label: 'arrêt de fente' })
  },
}

/** Rejoue un document : tracé de la base puis opérations dans l'ordre. */
export function build(doc) {
  const base = draftBase({ size: doc.size, options: doc.base })
  const st = {
    doc,
    m: base.measurements,
    draftMs: base.draftMs,
    errors: base.errors,
    front: clone(base.front),
    back: clone(base.back),
    sleeve: clone(base.sleeve),
    cuts: { front: [], back: [], sleeve: [] },
    pieces: [],
    marks: { front: [], back: [], sleeve: [] },
    trims: [],
    buttons: 0,
    flat: { pockets: [], trims: [] },
    sleeveFinish: null,
  }
  st.sleeve.totalMm = st.sleeve.edges.hem[0].y - st.sleeve.lm.sleeveTop.y
  const t0 = performance.now()
  for (const o of doc.ops) {
    if (!OPS[o.op]) throw new Error(`opération inconnue : ${o.op}`)
    OPS[o.op](st, o)
  }
  st.opsMs = performance.now() - t0
  return st
}

/**
 * Pièces d'une base après ses découpes, dans l'ordre : chaque découpe coupe la pièce qu'elle traverse ;
 * la partie qui contient le repère « inside » prend le nom et la matière de la découpe.
 */
export function regions(st, piece) {
  const base = { front: 'Devant', back: 'Dos', sleeve: 'Manche' }[piece]
  const poly = piece === 'sleeve' ? sleevePolygon(st.sleeve) : bodyPolygon(st[piece], piece === 'front' ? 'cf' : 'cb')
  const regs = [{ poly, name: base, material: 'main' }]
  const seams = []
  for (const c of st.cuts[piece]) {
    const i = regs.findIndex((r) => crossings(r.poly, c.path).length >= 2)
    if (i < 0) throw new Error(`découpe sans pièce traversée (${piece}, ${c.inside.name})`)
    const { a, b, seam } = splitPolygon(regs[i].poly, c.path)
    const inA = pointInPolygon(c.insideRef, a)
    const outside = { ...regs[i], poly: inA ? b : a }
    const inside = { poly: inA ? a : b, name: c.inside.name, material: c.inside.material }
    regs.splice(i, 1, outside, inside)
    seams.push({ seam, topstitch: c.topstitch !== false, inside: c.inside.name })
  }
  return { regs, seams }
}

export { xAtY, dist }
