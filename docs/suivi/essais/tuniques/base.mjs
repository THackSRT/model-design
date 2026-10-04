// Base de l'essai : tracé de Brian (bloc homme FreeSewing), puis bords nommés par rôle, comme une fiche de couture.
import { Brian } from '@freesewing/brian'
import * as models from '@freesewing/models'
import { pt, cubic } from './geom.mjs'

// Fiche de couture de Brian : plages de points nommés → rôle du bord (sens du contour paths.seam).
const FICHE = {
  front: [
    ['cfNeck', 'cfHem', 'cf'],
    ['cfHem', 'hem', 'hem'],
    ['hem', 'armhole', 'side'],
    ['armhole', 'shoulder', 'armhole'],
    ['shoulder', 'hps', 'shoulder'],
    ['hps', 'cfNeck', 'neckline'],
  ],
  back: [
    ['cbNeck', 'cbHem', 'cb'],
    ['cbHem', 'hem', 'hem'],
    ['hem', 'armhole', 'side'],
    ['armhole', 'shoulder', 'armhole'],
    ['shoulder', 'hps', 'shoulder'],
    ['hps', 'cbNeck', 'neckline'],
  ],
  sleeve: [
    ['bicepsLeft', 'wristLeft', 'underarmL'],
    ['wristLeft', 'wristRight', 'hem'],
    ['wristRight', 'bicepsRight', 'underarmR'],
    ['bicepsRight', 'bicepsLeft', 'cap'],
  ],
}

const EPS = 0.01
const nameOf = (points, p, wanted) =>
  wanted.find((k) => points[k] && Math.abs(points[k].x - p.x) < EPS && Math.abs(points[k].y - p.y) < EPS)

/** Contour d'une pièce découpé en bords nommés selon la fiche. */
function edgesOf(part, fiche) {
  const wanted = [...new Set(fiche.flatMap(([a, b]) => [a, b]))]
  const verts = [] // { p, name }
  let cur = null
  for (const op of part.paths.seam.ops) {
    if (op.type === 'move' || op.type === 'line') {
      cur = pt(op.to.x, op.to.y)
      verts.push({ p: cur, name: nameOf(part.points, op.to, wanted) })
    } else if (op.type === 'curve') {
      const seg = cubic(cur, op.cp1, op.cp2, pt(op.to.x, op.to.y), 20)
      seg.slice(1, -1).forEach((p) => verts.push({ p }))
      cur = seg[seg.length - 1]
      verts.push({ p: cur, name: nameOf(part.points, op.to, wanted) })
    }
  }
  const edges = {}
  for (const [from, to, role] of fiche) {
    const i0 = verts.findIndex((v) => v.name === from)
    let i1 = verts.findIndex((v, i) => i > i0 && v.name === to)
    if (i1 < 0) i1 = verts.findIndex((v) => v.name === to) // retour au point de départ
    if (i0 < 0 || i1 < 0) throw new Error(`fiche : bord ${role} introuvable (${from} → ${to})`)
    edges[role] = i1 > i0 ? verts.slice(i0, i1 + 1).map((v) => v.p) : [...verts.slice(i0), ...verts.slice(1, i1 + 1)].map((v) => v.p)
  }
  return edges
}

const P = (part, name) => pt(part.points[name].x, part.points[name].y)

/** Trace Brian et renvoie les trois pièces de base avec bords par rôle et repères. */
export function draftBase({ size = 'cisMaleAdult42', options = {} } = {}) {
  const measurements = models[size]
  const t0 = performance.now()
  const pattern = new Brian({ measurements, options, sa: 0 }).draft()
  const ms = performance.now() - t0
  const logs = pattern.store?.logs ?? {}
  const parts = pattern.parts[0]
  const fr = parts['brian.front']
  const bk = parts['brian.back']
  const sl = parts['library.sleeve']
  return {
    size,
    measurements,
    draftMs: ms,
    errors: logs.error?.length ?? 0,
    front: {
      edges: edgesOf(fr, FICHE.front),
      lm: Object.fromEntries(['cfNeck', 'hps', 'shoulder', 'armholePitch', 'armholeHollow', 'armhole', 'hem', 'cfHem', 'cfWaist', 'cfHips'].map((k) => [k, P(fr, k)])),
    },
    back: {
      edges: edgesOf(bk, FICHE.back),
      lm: Object.fromEntries(['cbNeck', 'hps', 'shoulder', 'armholePitch', 'armhole', 'hem', 'cbHem', 'waist'].map((k) => [k, P(bk, k)])),
    },
    sleeve: {
      edges: edgesOf(sl, FICHE.sleeve),
      lm: Object.fromEntries(['sleeveTop', 'bicepsLeft', 'bicepsRight', 'wristLeft', 'wristRight', 'frontPitch', 'backPitch'].map((k) => [k, P(sl, k)])),
    },
  }
}
