// Tunique rejouée → GarmentSpec du dépôt (contrat garment-spec 1.0) pour le moteur de drapé.
// Pièces de base seulement (devant et dos au pli, manche en paire) : découpes, bandes, galons et broderie
// restent dans la texture, posée par les coordonnées à plat. Conventions reprises du corsage à manches de référence.
import { length, pointAt, dist, pt } from './geom.mjs'

const Y = (p) => [Math.round(p.x * 100) / 100, Math.round(-p.y * 100) / 100] // y vers le haut

/** Découpe une polyligne en n morceaux de même longueur ; renvoie n polylignes. */
function splitEqual(line, n) {
  const L = length(line)
  const cuts = Array.from({ length: n + 1 }, (_, i) => (L * i) / n)
  const parts = []
  for (let k = 0; k < n; k++) {
    const s0 = cuts[k]
    const s1 = cuts[k + 1]
    const pts = [pointAt(line, s0)]
    let acc = 0
    for (let i = 1; i < line.length; i++) {
      acc += dist(line[i - 1], line[i])
      if (acc > s0 + 0.01 && acc < s1 - 0.01) pts.push(line[i])
    }
    pts.push(pointAt(line, s1))
    parts.push(pts)
  }
  return parts
}

/** Bords en segments de droite le long d'une polyligne (identifiants id-1, id-2…), au plus `maxSeg` mm chacun. */
function lineEdges(id, line, role, maxSeg = 40) {
  const n = Math.max(1, Math.ceil(length(line) / maxSeg))
  return splitEqual(line, n).map((pts, i) => ({ id: `${id}-${i + 1}`, from: Y(pts[0]), to: Y(pts[pts.length - 1]), role }))
}

/** Bords d'un groupe apparié : n morceaux, chacun un segment de droite (corde du morceau). */
function pairedEdges(id, line, n, role = 'seam') {
  return splitEqual(line, n).map((pts, i) => ({ id: `${id}-${i + 1}`, from: Y(pts[0]), to: Y(pts[pts.length - 1]), role }))
}

const rev = (a) => a.slice().reverse()

/** Pièce de corps (devant ou dos) au pli : contour antihoraire en y vers le haut. */
function bodyPanel(st, base, N) {
  const P = st[base]
  const e = P.edges
  const centre = base === 'front' ? e.cf : e.cb
  const hemPts = e.hem
  const H = hemPts[hemPts.length - 1]
  const A = e.side[e.side.length - 1]
  const slit = st.flat.slit?.heightMm
  const edges = []
  edges.push({ id: 'fold', from: Y(centre[0]), to: Y(centre[centre.length - 1]), role: 'fold' })
  edges.push({ id: 'hem', from: Y(hemPts[0]), to: Y(H), role: 'hem' })
  if (slit) {
    const T = pt(H.x, H.y - slit)
    edges.push({ id: 'slit', from: Y(H), to: Y(T), role: 'opening' })
    edges.push({ id: 'side', from: Y(T), to: Y(A), role: 'seam' })
  } else edges.push({ id: 'side', from: Y(H), to: Y(A), role: 'seam' })
  edges.push(...pairedEdges('armhole', e.armhole, N))
  const sh = e.shoulder
  edges.push({ id: 'shoulder', from: Y(sh[0]), to: Y(sh[sh.length - 1]), role: 'seam' })
  edges.push(...lineEdges('neck', e.neckline, 'opening', 30))
  const hemY = -hemPts[0].y
  return {
    id: base,
    name: base === 'front' ? 'Devant' : 'Dos',
    quantity: 1,
    cutOnFold: true,
    edges,
    grainline: [[60, hemY + 100], [60, hemY + 500]],
    hemY,
  }
}

/** Manche (paire), tête coupée au sommet ; prolongée du poignet s'il y en a un. */
function sleevePanel(st, N) {
  const sl = st.sleeve
  const e = sl.edges
  let L = e.underarmL // bicepsLeft → bas gauche
  let R = e.underarmR // bas droit → bicepsRight
  const cuff = st.sleeveFinish?.kind === 'cuff' ? st.sleeveFinish.heightMm - 12 : 0
  if (cuff > 0) {
    const ext = (a, b) => {
      const d = dist(a, b)
      return pt(b.x + ((b.x - a.x) / d) * cuff, b.y + ((b.y - a.y) / d) * cuff)
    }
    L = [L[0], ext(L[0], L[L.length - 1])]
    R = [ext(R[R.length - 1], R[0]), R[R.length - 1]]
  }
  const cap = e.cap // bicepsRight (devant) → bicepsLeft (dos)
  // Sommet de tête : point le plus haut (y le plus petit en y vers le bas)
  let iTop = 0
  cap.forEach((p, i) => {
    if (p.y < cap[iTop].y) iTop = i
  })
  const capFront = cap.slice(0, iTop + 1)
  const capBack = cap.slice(iTop)
  const edges = [
    { id: 'underarm-back', from: Y(L[0]), to: Y(L[L.length - 1]), role: 'seam' },
    { id: 'hem', from: Y(L[L.length - 1]), to: Y(R[0]), role: 'hem' },
    { id: 'underarm-front', from: Y(R[0]), to: Y(R[R.length - 1]), role: 'seam' },
    ...pairedEdges('cap-front', capFront, N),
    ...pairedEdges('cap-back', capBack, N),
  ]
  const top = cap[iTop]
  return {
    id: 'sleeve',
    name: 'Manche',
    quantity: 2,
    edges,
    grainline: [[0, -top.y - 60], [0, -top.y - 300]],
    top: Y(top),
    lengthMm: -top.y + Math.max(L[L.length - 1].y, R[0].y),
  }
}

/**
 * GarmentSpec + placement. `landmarks` : repères du mannequin (hauteurs en mm) pour poser l'ourlet de sorte
 * que le point d'encolure du patron tombe à la base du cou.
 */
export function toGarmentSpec(st, { landmarks, N = 8, clearanceMm = 30 } = {}) {
  const front = bodyPanel(st, 'front', N)
  const back = bodyPanel(st, 'back', N)
  const sleeve = sleevePanel(st, N)
  // Hauteur voulue de l'ourlet : base du cou (repère « neck » moins 25 mm) moins la profondeur de l'ourlet sous l'encolure.
  const hpsH = landmarks.neck - 25
  const place = (panel, facing) => {
    const hemH = hpsH + panel.hemY // hemY est négatif (sous le point d'encolure)
    const lm = ['crotch', 'hip', 'waist'].map((k) => [k, hemH - landmarks[k]]).sort((a, b) => Math.abs(a[1]) - Math.abs(b[1]))[0]
    return { zone: 'torso', bodySide: 'center', facing, anchor: { point: [0, panel.hemY], landmark: lm[0], offsetMm: Math.round(lm[1]) }, clearanceMm }
  }
  const panels = [
    { id: front.id, name: front.name, quantity: 1, cutOnFold: true, edges: front.edges, grainline: front.grainline, placement: place(front, 'front') },
    { id: back.id, name: back.name, quantity: 1, cutOnFold: true, edges: back.edges, grainline: back.grainline, placement: place(back, 'back') },
    {
      id: sleeve.id, name: sleeve.name, quantity: 2, edges: sleeve.edges, grainline: sleeve.grainline,
      placement: { zone: 'arm', bodySide: 'right', facing: 'outer', anchor: { point: sleeve.top, landmark: 'shoulder', offsetMm: 0 }, clearanceMm },
    },
  ]
  const seams = [
    { id: 'side', a: { panelId: 'front', edgeId: 'side' }, b: { panelId: 'back', edgeId: 'side' } },
    { id: 'shoulder', a: { panelId: 'front', edgeId: 'shoulder' }, b: { panelId: 'back', edgeId: 'shoulder' } },
    { id: 'underarm', a: { panelId: 'sleeve', edgeId: 'underarm-front' }, b: { panelId: 'sleeve', edgeId: 'underarm-back' } },
  ]
  for (let j = 1; j <= N; j++) {
    // Devant : même sens (aisselle → épaule) ; dos : tête du sommet vers l'aisselle, emmanchure de l'aisselle vers l'épaule.
    seams.push({ id: `armhole-front-${j}`, a: { panelId: 'sleeve', edgeId: `cap-front-${j}` }, b: { panelId: 'front', edgeId: `armhole-${j}` } })
    seams.push({ id: `armhole-back-${j}`, a: { panelId: 'sleeve', edgeId: `cap-back-${j}` }, b: { panelId: 'back', edgeId: `armhole-${N + 1 - j}` } })
  }
  return {
    specVersion: '1.0',
    unit: 'mm',
    engine: { name: 'patterning', version: '0.6.0' },
    garment: { type: 'tunic' },
    panels,
    seams,
  }
}
