// Preuve de concept : pièces FreeSewing + fiche de couture -> GarmentSpec (contrat du dépôt, contracts/schemas/garment-spec.schema.json).
// Un bord du contrat est une ligne ou une seule courbe de Bézier ; une couture relie exactement deux bords.
// Les bords FreeSewing sont des chaînes de courbes (emmanchure = 2 courbes, tête de manche = 5) : chaque couture est donc
// découpée en sous-bords appariés par fractions de longueur (algorithme de de Casteljau), l'embu se répartissant au prorata.
import { Bezier } from '@freesewing/core'

export const SEAM_TOLERANCE_MM = 0.5 // tolérance de couture du moteur de référence (checks.py)
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y)
const lerp = (a, b, t) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t })
const rnd = (v) => Math.round(v * 1000) / 1000 // millimètres, 0,001 près (comme les points arrondis du moteur de référence)

/* ---------- Pièces de géométrie (coordonnées FreeSewing, y vers le bas) ---------- */
function mkLine(p0, p1) {
  return { type: 'line', p0, p1, len: dist(p0, p1) }
}
function mkCurve(p0, c1, c2, p1) {
  return { type: 'curve', p0, c1, c2, p1, len: new Bezier(p0, c1, c2, p1).length() }
}
function pieceFromSeg(c, s) {
  const a = c.vertices[s.a]
  const b = c.vertices[s.b]
  return s.type === 'curve' ? mkCurve({ x: a.x, y: a.y }, { x: s.cp1.x, y: s.cp1.y }, { x: s.cp2.x, y: s.cp2.y }, { x: b.x, y: b.y }) : mkLine({ x: a.x, y: a.y }, { x: b.x, y: b.y })
}
/** Coupe une pièce à la distance s (mm) de son début ; les extrémités sont reprises telles quelles (continuité exacte). */
function splitPiece(p, s) {
  if (p.type === 'line') {
    const m = lerp(p.p0, p.p1, s / p.len)
    return [mkLine(p.p0, m), mkLine(m, p.p1)]
  }
  const b = new Bezier(p.p0, p.c1, p.c2, p.p1)
  let lo = 0
  let hi = 1
  for (let i = 0; i < 64; i++) {
    const mid = (lo + hi) / 2
    if (b.split(0, mid).length() < s) lo = mid
    else hi = mid
  }
  const { left, right } = b.split((lo + hi) / 2)
  const P = (q) => ({ x: q.x, y: q.y })
  const m = P(left.points[3])
  return [mkCurve(p.p0, P(left.points[1]), P(left.points[2]), m), mkCurve(m, P(right.points[1]), P(right.points[2]), p.p1)]
}

/* ---------- Construction ---------- */
function groupsOf(spec, fres) {
  const c = fres.contour
  const legOf = new Map() // indice de segment -> { dartId, leg }
  for (const dt of Object.values(fres.darts ?? {})) if (dt.present) dt.legSegs.forEach((segs, n) => segs.forEach((i) => legOf.set(i, { dartId: dt.id, leg: n + 1 })))
  const groups = []
  for (const e of spec.edges) {
    const er = fres.edges[e.id]
    if (!er?.ok) continue
    let cur = null
    for (const i of er.segs) {
      const dl = legOf.get(i)
      const piece = pieceFromSeg(c, c.segments[i])
      if (dl) {
        const key = `dart-${dl.dartId}-${dl.leg}`
        if (!cur || cur.key !== key) {
          cur = { edgeId: e.id, key, role: 'seam', dart: dl, pieces: [] }
          groups.push(cur)
        }
      } else if (!cur || cur.dart) {
        cur = { edgeId: e.id, key: e.id, role: e.specRole ?? 'seam', pieces: [] }
        groups.push(cur)
      }
      cur.pieces.push(piece)
    }
  }
  // un bord coupé par une pince donne plusieurs groupes : suffixe -1, -2…
  const byEdge = {}
  for (const g of groups) if (!g.dart) (byEdge[g.edgeId] ??= []).push(g)
  for (const list of Object.values(byEdge)) if (list.length > 1) list.forEach((g, i) => (g.key = `${g.edgeId}-${i + 1}`))
  return groups
}

/** Découpe deux parcours de bords à l'union de leurs fractions de longueur ; renvoie les paires de sous-bords. */
function cutPair(aWalk, bWalk) {
  const flat = (walk) => {
    const list = []
    let w = 0
    for (const e of walk) {
      const pcs = e.reversed ? [...e.group.pieces].reverse() : e.group.pieces
      for (const p of pcs) {
        list.push({ group: e.group, piece: p, reversed: e.reversed, w0: w, w1: w + p.len })
        w += p.len
      }
    }
    return { list, total: w }
  }
  const A = flat(aWalk)
  const B = flat(bWalk)
  const fr = [0, 1]
  for (const S of [A, B]) for (const x of S.list) fr.push(x.w0 / S.total, x.w1 / S.total)
  fr.sort((p, q) => p - q)
  const bps = []
  for (const f of fr) if (!bps.length || f - bps[bps.length - 1] > 2e-5) bps.push(f) // 2e-5 de la longueur : environ 0,01 mm
  bps[bps.length - 1] = 1
  const nearest = (f) => {
    let best = 0
    for (let i = 1; i < bps.length; i++) if (Math.abs(bps[i] - f) < Math.abs(bps[best] - f)) best = i
    return best
  }
  const side = (S) => {
    const replaced = new Map()
    const walkPieces = []
    for (const x of S.list) {
      const i0 = nearest(x.w0 / S.total)
      const i1 = nearest(x.w1 / S.total)
      const cuts = bps
        .slice(i0 + 1, i1)
        .map((f) => f * S.total - x.w0)
        .map((sLen) => (x.reversed ? x.piece.len - sLen : sLen))
        .sort((p, q) => p - q)
      let rest = x.piece
      let used = 0
      const subs = []
      for (const d of cuts) {
        const [L, R] = splitPiece(rest, d - used)
        subs.push(L)
        rest = R
        used = d
      }
      subs.push(rest)
      replaced.set(x.piece, subs)
      walkPieces.push(...(x.reversed ? [...subs].reverse() : subs))
    }
    return { replaced, walkPieces }
  }
  const sa = side(A)
  const sb = side(B)
  if (sa.walkPieces.length !== sb.walkPieces.length) throw new Error(`découpe incohérente : ${sa.walkPieces.length} sous-bords contre ${sb.walkPieces.length}`)
  for (const S of [A, B]) {
    const done = new Set()
    for (const x of S.list) {
      if (done.has(x.group)) continue
      done.add(x.group)
      const rep = (S === A ? sa : sb).replaced
      x.group.pieces = x.group.pieces.flatMap((p) => rep.get(p) ?? [p])
    }
  }
  return sa.walkPieces.map((p, k) => ({ a: p, b: sb.walkPieces[k] }))
}

const groupOf = (panel, piece) => panel.groups.find((g) => g.pieces.includes(piece))

/** Construit la GarmentSpec. `resolved` = adapter.resolveFiche(fiche, pattern). */
export function toGarmentSpec(fiche, pattern, resolved, { version = '4.10.2' } = {}) {
  const panels = new Map()
  const partToPanel = {}
  for (const spec of fiche.parts) {
    const fres = resolved.parts[spec.part]
    if (!fres || fres.absent || !fres.contourOk) continue
    panels.set(spec.panel, { id: spec.panel, spec, name: spec.label, groups: groupsOf(spec, fres), fres, part: pattern.parts[0][spec.part] })
    partToPanel[spec.part] = spec.panel
  }
  const walk = (refs, reverseAll) => {
    let entries = []
    for (const ref of refs) {
      const rev = ref.startsWith('~')
      const [pn, eid] = ref.replace(/^~/, '').split('#')
      const panel = panels.get(partToPanel[pn])
      if (!panel) return null
      let groups = panel.groups.filter((g) => g.edgeId === eid && !g.dart)
      if (rev) groups = [...groups].reverse()
      for (const g of groups) entries.push({ group: g, reversed: rev, panel })
    }
    if (reverseAll) entries = entries.reverse().map((e) => ({ ...e, reversed: !e.reversed }))
    return entries
  }
  const seamDefs = [] // { id, a:{panel,piece,side?}, b:{…} }
  for (const p of fiche.pairs ?? []) {
    if (p.kind === 'miroir') {
      const w = walk(p.a, false)
      if (!w) continue
      const all = w.flatMap((e) => e.group.pieces.map((piece) => ({ panel: e.panel, piece })))
      all.forEach(({ panel, piece }, k) => seamDefs.push({ id: all.length > 1 ? `${p.id}-${k + 1}` : p.id, pair: p.id, a: { panel, piece, side: 'left' }, b: { panel, piece, side: 'right' } }))
      continue
    }
    const aw = walk(p.a, false)
    const bw = walk(p.b, p.align === 'opposite')
    if (!aw || !bw) continue
    const pairs = cutPair(aw, bw)
    const totalGap = pairs.reduce((t, { a, b }) => t + a.len - b.len, 0)
    pairs.forEach(({ a, b }, k) => seamDefs.push({ id: pairs.length > 1 ? `${p.id}-${k + 1}` : p.id, pair: p.id, declareEase: Math.abs(totalGap) > SEAM_TOLERANCE_MM, a: { piece: a }, b: { piece: b } }))
  }
  // pinces : les deux jambes se cousent ensemble (sens opposés)
  for (const panel of panels.values()) {
    const ids = [...new Set(panel.groups.filter((g) => g.dart).map((g) => g.dart.dartId))]
    for (const id of ids) {
      const l1 = panel.groups.find((g) => g.dart?.dartId === id && g.dart.leg === 1)
      const l2 = panel.groups.find((g) => g.dart?.dartId === id && g.dart.leg === 2)
      if (!l1 || !l2) continue
      const pairs = cutPair([{ group: l1, reversed: false, panel }], [{ group: l2, reversed: true, panel }])
      const totalGap = pairs.reduce((t, { a, b }) => t + a.len - b.len, 0)
      pairs.forEach(({ a, b }, k) => seamDefs.push({ id: `${panel.id}-dart-${id}${pairs.length > 1 ? '-' + (k + 1) : ''}`, pair: `${panel.id}#dart-${id}`, declareEase: Math.abs(totalGap) > SEAM_TOLERANCE_MM, a: { piece: a }, b: { piece: b } }))
    }
  }
  // identifiants finaux des sous-bords et pièce de chaque sous-bord (un côté d'une couture peut mêler plusieurs pièces)
  const idOf = new Map()
  const panelOf = new Map()
  for (const panel of panels.values()) {
    for (const g of panel.groups) {
      g.pieces.forEach((piece, i) => {
        idOf.set(piece, g.pieces.length === 1 ? g.key : `${g.key}-${i + 1}`)
        panelOf.set(piece, panel)
      })
    }
  }
  // pièces en coordonnées du contrat : y vers le haut, contour trigonométrique
  const pt = (q) => [rnd(q.x), rnd(-q.y)]
  const outPanels = []
  const problems = []
  for (const panel of panels.values()) {
    const edges = []
    for (const g of panel.groups) {
      for (const piece of g.pieces) {
        const e = { id: idOf.get(piece), from: pt(piece.p0), to: pt(piece.p1) }
        if (piece.type === 'curve') e.controls = [pt(piece.c1), pt(piece.c2)]
        e.role = g.role
        edges.push(e)
      }
    }
    // fermeture et aire signée
    let area = 0
    for (let i = 0; i < edges.length; i++) {
      const e = edges[i]
      const n = edges[(i + 1) % edges.length]
      if (Math.hypot(e.to[0] - n.from[0], e.to[1] - n.from[1]) > 1e-6) problems.push(`${panel.id} : ${e.id} ne rejoint pas ${n.id}`)
      const pts = e.controls ? new Bezier({ x: e.from[0], y: e.from[1] }, { x: e.controls[0][0], y: e.controls[0][1] }, { x: e.controls[1][0], y: e.controls[1][1] }, { x: e.to[0], y: e.to[1] }).getLUT(12) : [{ x: e.from[0], y: e.from[1] }, { x: e.to[0], y: e.to[1] }]
      for (let j = 0; j + 1 < pts.length; j++) area += pts[j].x * pts[j + 1].y - pts[j + 1].x * pts[j].y
    }
    if (area <= 0) problems.push(`${panel.id} : contour hors du sens trigonométrique (aire ${(area / 2).toFixed(0)})`)
    const out = { id: panel.id, name: panel.name, edges, quantity: panel.spec.cut.quantity, cutOnFold: panel.spec.cut.mode === 'pli' }
    // droit fil : bornes de la macro grainline, sinon du repère de pli
    const paths = panel.part?.paths ?? {}
    const gk = Object.keys(paths).find((k) => k.startsWith('__macro_grainline')) ?? Object.keys(paths).find((k) => k.startsWith('__macro_cutonfold'))
    if (gk) {
      const pts = paths[gk].ops.filter((o) => o.to).map((o) => o.to)
      if (pts.length >= 2) out.grainline = [pt(pts[0]), pt(pts[pts.length - 1])]
    }
    outPanels.push(out)
  }
  const len = (e) => (e.controls ? new Bezier({ x: e.from[0], y: e.from[1] }, { x: e.controls[0][0], y: e.controls[0][1] }, { x: e.controls[1][0], y: e.controls[1][1] }, { x: e.to[0], y: e.to[1] }).length() : Math.hypot(e.to[0] - e.from[0], e.to[1] - e.from[1]))
  const edgeOf = (panelId, id) => outPanels.find((p) => p.id === panelId)?.edges.find((e) => e.id === id)
  const outSeams = []
  for (const s of seamDefs) {
    let a = { panelId: panelOf.get(s.a.piece).id, edgeId: idOf.get(s.a.piece) }
    let b = { panelId: panelOf.get(s.b.piece).id, edgeId: idOf.get(s.b.piece) }
    if (s.a.side) {
      a.side = s.a.side
      b.side = s.b.side
    }
    const ea = edgeOf(a.panelId, a.edgeId)
    const eb = edgeOf(b.panelId, b.edgeId)
    if (!ea || !eb) throw new Error(`couture ${s.id} : sous-bord introuvable (${a.panelId}/${a.edgeId} ${ea ? 'ok' : 'absent'} ; ${b.panelId}/${b.edgeId} ${eb ? 'ok' : 'absent'})`)
    const la = len(ea)
    const lb = len(eb)
    let ease = la - lb
    if (ease < 0 && !s.a.side) {
      ;[a, b] = [b, a]
      ease = -ease
    }
    const seam = { id: s.id, a, b }
    if (s.declareEase && ease > 0.0005) seam.easeMm = rnd(ease)
    outSeams.push(seam)
  }
  const spec = {
    specVersion: '1.0',
    unit: 'mm',
    engine: { name: 'freesewing-adapter-poc', version: `freesewing-${version}` },
    garment: { type: fiche.garmentType ?? fiche.design },
    panels: outPanels,
    seams: outSeams,
  }
  return { spec, problems, lenOf: len }
}

/** Contrôles du moteur de référence (engines/patterning/src/patterning/core/checks.py), repris tels quels. */
export function checkSpec(spec) {
  const errors = []
  const lenOf = (e) => (e.controls ? new Bezier({ x: e.from[0], y: e.from[1] }, { x: e.controls[0][0], y: e.controls[0][1] }, { x: e.controls[1][0], y: e.controls[1][1] }, { x: e.to[0], y: e.to[1] }).length() : Math.hypot(e.to[0] - e.from[0], e.to[1] - e.from[1]))
  for (const p of spec.panels) {
    p.edges.forEach((e, i) => {
      const n = p.edges[(i + 1) % p.edges.length]
      if (Math.hypot(e.to[0] - n.from[0], e.to[1] - n.from[1]) > 1e-6) errors.push(`pièce ${p.id} : ${e.id} ne rejoint pas ${n.id}`)
    })
    let area = 0
    for (const e of p.edges) {
      const pts = e.controls ? new Bezier({ x: e.from[0], y: e.from[1] }, { x: e.controls[0][0], y: e.controls[0][1] }, { x: e.controls[1][0], y: e.controls[1][1] }, { x: e.to[0], y: e.to[1] }).getLUT(12) : [{ x: e.from[0], y: e.from[1] }, { x: e.to[0], y: e.to[1] }]
      for (let j = 0; j + 1 < pts.length; j++) area += pts[j].x * pts[j + 1].y - pts[j + 1].x * pts[j].y
    }
    if (area <= 0) errors.push(`pièce ${p.id} : contour hors du sens trigonométrique`)
    if (p.edges.length < 3) errors.push(`pièce ${p.id} : moins de 3 bords`)
    const ids = new Set(p.edges.map((e) => e.id))
    if (ids.size !== p.edges.length) errors.push(`pièce ${p.id} : identifiants de bords en double`)
  }
  for (const s of spec.seams) {
    const a = spec.panels.find((p) => p.id === s.a.panelId)?.edges.find((e) => e.id === s.a.edgeId)
    const b = spec.panels.find((p) => p.id === s.b.panelId)?.edges.find((e) => e.id === s.b.edgeId)
    if (!a || !b) {
      errors.push(`couture ${s.id} : bord introuvable`)
      continue
    }
    const gap = lenOf(a) - lenOf(b)
    if (Math.abs(gap - (s.easeMm ?? 0)) > SEAM_TOLERANCE_MM) errors.push(`couture ${s.id} : écart de ${gap.toFixed(2)} mm, embu attendu ${(s.easeMm ?? 0).toFixed(2)} mm`)
  }
  return errors
}
