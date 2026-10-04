// Adaptateur FreeSewing -> structure de couture (bords nommés, coutures, pinces, plan de coupe).
// Fonctions pures sur des pièces déjà tracées : ni Node, ni DOM. Importé par les scripts de validation et par la page.
import { Bezier } from '@freesewing/core'

export const TOL_MM = 0.01 // tolérance de rapprochement point <-> sommet (mm)
const ZERO_LEN = 1e-6 // segment « nul » : ignoré

const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y)
const near = (a, b, tol = TOL_MM) => Math.abs(a.x - b.x) <= tol && Math.abs(a.y - b.y) <= tol

/** Longueur d'une opération de tracé (ligne ou courbe de Bézier cubique) à partir du point p0. */
export function opLength(p0, op) {
  if (op.type === 'curve') {
    return new Bezier(
      { x: p0.x, y: p0.y },
      { x: op.cp1.x, y: op.cp1.y },
      { x: op.cp2.x, y: op.cp2.y },
      { x: op.to.x, y: op.to.y },
    ).length()
  }
  return dist(p0, op.to)
}

/**
 * Découpe le contour `paths.<pathName>` d'une pièce en segments.
 * Sortie : sommets (x, y), segments { i, type, a, b, length, cp1?, cp2? } (a et b = indices de sommets).
 * Un contour fermé identifie son dernier sommet au premier. Les segments de longueur nulle sont ignorés.
 */
export function extractContour(part, pathName = 'seam') {
  const path = part?.paths?.[pathName]
  const out = { ok: false, closed: false, issues: [], vertices: [], segments: [], moves: 0, rawOps: 0 }
  if (!path) {
    out.issues.push(`pas de paths.${pathName}`)
    return out
  }
  out.rawOps = path.ops.length
  let cur = null
  let start = null
  let hadClose = false
  for (const op of path.ops) {
    if (op.type === 'noop') continue
    if (op.type === 'move') {
      out.moves++
      if (cur === null) {
        cur = op.to
        start = op.to
        out.vertices.push({ x: op.to.x, y: op.to.y })
      } else if (!near(cur, op.to)) {
        out.issues.push('sous-chemin : deuxième « move » éloigné du point courant')
        return out
      }
      continue
    }
    if (cur === null) {
      out.issues.push('opération de tracé avant le premier « move »')
      return out
    }
    const target = op.type === 'close' ? start : op.to
    if (op.type === 'close') hadClose = true
    const len = op.type === 'close' ? dist(cur, start) : opLength(cur, op)
    if (len > ZERO_LEN) {
      const seg = { i: out.segments.length, type: op.type === 'curve' ? 'curve' : 'line', a: out.vertices.length - 1, b: out.vertices.length, length: len }
      if (op.type === 'curve') {
        seg.cp1 = { x: op.cp1.x, y: op.cp1.y }
        seg.cp2 = { x: op.cp2.x, y: op.cp2.y }
      }
      out.segments.push(seg)
      out.vertices.push({ x: target.x, y: target.y })
    }
    cur = target
    if (hadClose) break
  }
  if (out.segments.length < 2) {
    out.issues.push('contour de moins de deux segments')
    return out
  }
  // Fermeture : le dernier sommet se confond avec le premier.
  const first = out.vertices[0]
  const last = out.vertices[out.vertices.length - 1]
  if (near(first, last)) {
    out.closed = true
    out.vertices.pop()
    out.segments[out.segments.length - 1].b = 0
  } else out.issues.push('contour non fermé')
  // Aire signée en repère y vers le haut (y' = -y) : positive = sens trigonométrique, comme l'exige GarmentSpec.
  if (out.closed) {
    let area = 0
    const cubicAt = (p0, p1, p2, p3, t) => {
      const u = 1 - t
      return { x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x, y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y }
    }
    for (const sg of out.segments) {
      const a = out.vertices[sg.a]
      const b = out.vertices[sg.b]
      const pts = sg.type === 'curve' ? Array.from({ length: 13 }, (_, i) => cubicAt(a, sg.cp1, sg.cp2, b, i / 12)) : [a, b]
      for (let i = 0; i + 1 < pts.length; i++) area += pts[i].x * -pts[i + 1].y - pts[i + 1].x * -pts[i].y
    }
    out.signedAreaYUp = area / 2
  }
  out.ok = out.issues.length === 0
  return out
}

/** Pour chaque sommet : tous les noms de points FreeSewing qui s'y trouvent (à TOL_MM près). */
export function nameVertices(contour, points, tol = TOL_MM) {
  const entries = Object.entries(points)
  return contour.vertices.map((v) => entries.filter(([, p]) => near(p, v, tol)).map(([k]) => k))
}

/** Pour chaque segment : noms des points de contrôle (courbes). */
export function nameControls(contour, points, tol = TOL_MM) {
  const entries = Object.entries(points)
  const find = (c) => entries.filter(([, p]) => near(p, c, tol)).map(([k]) => k)
  return contour.segments.map((s) => (s.type === 'curve' ? { cp1: find(s.cp1), cp2: find(s.cp2) } : null))
}

/** Indices de tous les sommets qui coïncident avec le point (un contour peut repasser par le même point : pince de largeur nulle). */
export function vertexCandidates(contour, point, tol = TOL_MM) {
  if (!point || typeof point.x !== 'number') return []
  const out = []
  contour.vertices.forEach((v, i) => {
    if (near(v, point, tol)) out.push(i)
  })
  return out
}

/** Indice du premier sommet qui coïncide avec le point nommé, ou -1. */
export function vertexAt(contour, point, tol = TOL_MM) {
  const c = vertexCandidates(contour, point, tol)
  return c.length ? c[0] : -1
}

/** Segments parcourus de l'indice de sommet a à b, dans le sens du contour (avec rebouclage). */
export function segmentsBetween(contour, a, b) {
  const n = contour.segments.length
  const startSeg = contour.segments.findIndex((s) => s.a === a)
  if (startSeg < 0 || a === b) return null
  const list = []
  for (let k = 0; k < n; k++) {
    const s = contour.segments[(startSeg + k) % n]
    list.push(s)
    if (s.b === b) return list
  }
  return null
}

/**
 * Chemin avant le plus court entre deux points nommés, quand chacun peut tomber sur plusieurs sommets
 * (le contour repasse par le même point). Renvoie { a, b, segs } ou null.
 */
export function bestPath(contour, pa, pb) {
  let best = null
  for (const a of vertexCandidates(contour, pa)) {
    for (const b of vertexCandidates(contour, pb)) {
      const segs = segmentsBetween(contour, a, b)
      if (segs && (!best || segs.length < best.segs.length)) best = { a, b, segs }
    }
  }
  return best
}

const sum = (segs) => segs.reduce((t, s) => t + s.length, 0)

/**
 * Résout les bords et pinces de la fiche d'une pièce sur la pièce tracée.
 * Renvoie { edges, darts, issues, coverage } ; chaque bord : { ok, from, to, lengthMm, netMm, segs }.
 */
export function resolvePart(spec, part) {
  const res = { edges: {}, darts: {}, issues: [], contourOk: false, coverage: { covered: 0, total: 0 } }
  const contour = extractContour(part)
  if (!contour.ok) {
    res.issues.push({ level: 'error', code: 'contour', message: contour.issues.join(' ; ') })
    return res
  }
  res.contour = contour
  res.contourOk = true
  const points = part.points
  const used = new Set()
  // Bords
  for (const e of spec.edges) {
    const r = { id: e.id, role: e.role, ok: false, optional: !!e.optional }
    const pa = points[e.from]
    const pb = points[e.to]
    if (!pa || !pb) {
      r.issue = `point absent : ${!pa ? e.from : e.to}`
    } else {
      const ca = vertexCandidates(contour, pa)
      const cb = vertexCandidates(contour, pb)
      if (!ca.length || !cb.length) r.issue = `point hors contour : ${!ca.length ? e.from : e.to}`
      else {
        const bp = bestPath(contour, pa, pb)
        if (!bp) r.issue = `pas de chemin de ${e.from} à ${e.to}`
        else {
          const segs = bp.segs
          r.ok = true
          r.a = bp.a
          r.b = bp.b
          r.segs = segs.map((s) => s.i)
          r.lengthMm = sum(segs)
          segs.forEach((s) => used.add(s.i))
          // « via » : sommets attendus à l'intérieur du bord (documentation et contrôle)
          for (const v of e.via ?? []) {
            const iv = vertexCandidates(contour, points[v])
            if (iv.length && !iv.some((k) => segs.some((s) => s.a === k || s.b === k))) r.issue = `${v} hors du bord ${e.id}`
          }
        }
      }
    }
    if (!r.ok && !e.optional) res.issues.push({ level: 'error', code: 'edge', edge: e.id, message: `bord « ${e.id} » : ${r.issue}` })
    res.edges[e.id] = r
  }
  // Pinces : posées dans un bord hôte ; présentes si le sommet de pince est sur le contour.
  for (const [id, d] of Object.entries(spec.darts ?? {})) {
    const r = { id, host: d.host, present: false }
    const leg1 = bestPath(contour, points[d.from], points[d.apex])
    const leg2 = bestPath(contour, points[d.apex], points[d.to])
    if (leg1 && leg2 && leg1.b === leg2.a) {
      r.present = true
      r.leg1Mm = sum(leg1.segs)
      r.leg2Mm = sum(leg2.segs)
      r.legsMm = r.leg1Mm + r.leg2Mm
      r.legSegs = [leg1.segs.map((x) => x.i), leg2.segs.map((x) => x.i)]
      r.widthMm = dist(points[d.from], points[d.to])
      r.depthMm = Math.max(dist(points[d.apex], points[d.from]), dist(points[d.apex], points[d.to]))
    }
    if (!r.present && !d.optional) res.issues.push({ level: 'error', code: 'dart', dart: id, message: `pince « ${id} » absente du contour` })
    res.darts[id] = r
  }
  // Longueur nette des bords : on retire les jambes des pinces qu'ils portent.
  for (const e of Object.values(res.edges)) {
    if (!e.ok) continue
    e.netMm = e.lengthMm
    for (const d of Object.values(res.darts)) if (d.host === e.id && d.present) e.netMm -= d.legsMm
  }
  // Couverture : tous les segments du contour appartiennent à un bord.
  res.coverage = { covered: used.size, total: contour.segments.length }
  const missing = contour.segments.filter((s) => !used.has(s.i))
  if (missing.length) {
    res.issues.push({ level: 'error', code: 'coverage', message: `${missing.length} segment(s) du contour sans bord (n° ${missing.map((s) => s.i).join(', ')})` })
  }
  // Un bord ne doit pas en recouvrir un autre.
  const seen = new Map()
  for (const e of Object.values(res.edges)) {
    if (!e.ok) continue
    for (const i of e.segs) {
      if (seen.has(i)) res.issues.push({ level: 'error', code: 'overlap', message: `segment ${i} dans « ${seen.get(i)} » et « ${e.id} »` })
      else seen.set(i, e.id)
    }
  }
  return res
}

const sleeveEaseOf = (store, key) => {
  const v = store?.get?.(key, undefined)
  return typeof v === 'number' ? v : 0
}

/** Lit le plan de coupe d'une pièce dans store.cutlist. */
export function readCutlist(store, partName) {
  const cl = store?.cutlist?.[partName]
  if (!cl) return null
  const materials = {}
  for (const [mat, list] of Object.entries(cl.materials ?? {})) {
    materials[mat] = list.map((m) => ({ cut: m.cut, onFold: !!m.onFold, identical: !!m.identical, onBias: !!m.onBias }))
  }
  return { materials, grainDeg: typeof cl.grain === 'number' ? cl.grain : null, grainOrigin: cl.grainOrigin ?? null, cutOnFold: !!cl.cutOnFold }
}

/**
 * Résout toute la fiche sur un patron tracé : bords, pinces, paires de coutures (écarts en mm), cibles, plan de coupe.
 * `pattern` : instance FreeSewing déjà dessinée (`pattern.draft()` appelé).
 * Une pièce masquée par une option (`optionalPart`, ex. la manche de Bella) est « absente » : ce n'est pas une erreur.
 */
export function resolveFiche(fiche, pattern, set = 0) {
  const parts = pattern.parts?.[set] ?? {}
  const store = pattern.setStores?.[set]
  const out = { design: fiche.design, parts: {}, pairs: [], targets: [], issues: [], cut: {} }
  for (const spec of fiche.parts) {
    const part = parts[spec.part]
    if (!part || part.hidden) {
      out.parts[spec.part] = { absent: true, edges: {}, darts: {}, issues: [] }
      if (!spec.optionalPart) out.issues.push({ level: 'error', code: part ? 'hidden' : 'part', part: spec.part, message: part ? `${spec.part} est masquée` : `pièce absente : ${spec.part}` })
      continue
    }
    const r = resolvePart(spec, part)
    out.parts[spec.part] = r
    for (const i of r.issues) out.issues.push({ ...i, part: spec.part })
    // plan de coupe lu dans le patron, comparé à la fiche
    const cl = readCutlist(store, spec.part)
    out.cut[spec.part] = { fiche: spec.cut, cutlist: cl }
    if (!cl) out.issues.push({ level: 'warn', code: 'cutlist', part: spec.part, message: 'aucune entrée dans store.cutlist' })
    else {
      const fab = cl.materials[spec.cut.fabric ?? 'fabric']?.[0]
      const wantFold = spec.cut.mode === 'pli'
      if (!fab) out.issues.push({ level: 'warn', code: 'cutlist', part: spec.part, message: `store.cutlist sans « ${spec.cut.fabric ?? 'fabric'} »` })
      else {
        if (fab.cut !== spec.cut.quantity) out.issues.push({ level: 'warn', code: 'cutlist-count', part: spec.part, message: `fiche : ${spec.cut.quantity} pièce(s), store.cutlist : ${fab.cut}` })
        if (fab.onFold !== wantFold) out.issues.push({ level: 'warn', code: 'cutlist-fold', part: spec.part, message: `fiche : ${wantFold ? 'au pli' : 'en double'}, store.cutlist : onFold=${fab.onFold}` })
      }
    }
    // cibles : longueur d'un bord comparée à une mesure du jeu ou à une valeur du store du modèle
    for (const t of spec.targets ?? []) {
      const e = r.edges[t.edge]
      const row = { id: `${spec.part}#${t.edge}`, source: t.measurement ?? t.storeKey, tolMm: t.tolMm ?? 2 }
      const ref = t.measurement ? pattern.settings?.[set]?.measurements?.[t.measurement] : store?.get?.(t.storeKey, undefined)
      if (e?.ok && typeof ref === 'number') {
        let len = e.netMm
        // corrections : le contour peut être raccourci (taille abaissée de Titan) : on remplace un tronçon par son idéal
        for (const term of t.adjust ?? []) {
          const [kind, [p, q]] = Object.entries(term)[0]
          const pp = parts[spec.part].points
          const d = dist(pp[p], pp[q])
          len += kind === 'plus' ? d : -d
        }
        row.refMm = ref
        row.lenMm = len
        row.diffMm = len - ref
        row.ok = Math.abs(row.diffMm) <= row.tolMm
      } else row.ok = null
      out.targets.push(row)
    }
  }
  const lenOf = (ref) => {
    const [pn, eid] = ref.replace(/^~/, '').split('#')
    const e = out.parts[pn]?.edges?.[eid]
    return e?.ok ? e.netMm : null
  }
  const absentRef = (ref) => out.parts[ref.replace(/^~/, '').split('#')[0]]?.absent === true
  for (const p of fiche.pairs ?? []) {
    const row = { id: p.id, role: p.role, kind: p.kind ?? 'couture', label: p.label ?? p.id, a: p.a, b: p.b, tolMm: p.tolMm ?? 2 }
    if ([...p.a, ...p.b].some(absentRef)) {
      row.ok = null
      row.absent = true
    } else {
      const la = p.a.map(lenOf)
      const lb = p.b.map(lenOf)
      if (la.some((v) => v === null) || lb.some((v) => v === null)) {
        row.ok = null
        row.missing = [...p.a.filter((_, i) => la[i] === null), ...p.b.filter((_, i) => lb[i] === null)]
      } else {
        row.lenA = la.reduce((t, v) => t + v, 0)
        row.lenB = lb.reduce((t, v) => t + v, 0)
        row.diffMm = row.lenA - row.lenB
        row.expectedMm = p.expected?.easeStoreKey ? sleeveEaseOf(store, p.expected.easeStoreKey) : (p.expected?.diffMm ?? 0)
        row.matchesZero = Math.abs(row.diffMm) <= row.tolMm
        row.matchesExpected = Math.abs(row.diffMm - row.expectedMm) <= row.tolMm
        row.ok = row.matchesZero || row.matchesExpected
      }
    }
    out.pairs.push(row)
  }
  // Pinces : paires internes (les deux jambes d'une pince) calculées à partir des pinces résolues.
  for (const [pn, r] of Object.entries(out.parts)) {
    for (const d of Object.values(r.darts ?? {})) {
      if (!d.present) continue
      const spec = fiche.parts.find((x) => x.part === pn)?.darts?.[d.id]
      out.pairs.push({
        id: `${pn}#dart-${d.id}`,
        role: 'pince',
        kind: 'pince',
        label: spec?.label ?? `Pince ${d.id}`,
        a: [`${pn}#${d.id}.jambe1`],
        b: [`${pn}#${d.id}.jambe2`],
        lenA: d.leg1Mm,
        lenB: d.leg2Mm,
        diffMm: d.leg1Mm - d.leg2Mm,
        expectedMm: 0,
        tolMm: 2,
        matchesZero: Math.abs(d.leg1Mm - d.leg2Mm) <= 2,
        ok: Math.abs(d.leg1Mm - d.leg2Mm) <= 2,
      })
    }
  }
  out.ok = out.issues.every((i) => i.level !== 'error') && out.pairs.every((p) => p.ok !== false) && out.targets.every((t) => t.ok !== false)
  return out
}
