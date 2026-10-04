// Noyau du banc d'essai, commun à Node et au navigateur (même code, regroupé tel quel par esbuild).
// Aucune API propre à Node : seulement `performance.now()`.
import { DESIGNS, sizeMeasurements } from './designs.mjs'

export const OPTION_TYPES = ['pct', 'deg', 'bool', 'list', 'count', 'mm', 'constant']

/** Type d'une option FreeSewing : pct, deg, bool, list, count, mm ; sinon valeur fixe (« constant »). */
export function optionType(o) {
  if (o === null || typeof o !== 'object') return 'constant'
  for (const k of ['pct', 'deg', 'bool', 'count', 'mm']) if (typeof o[k] !== 'undefined') return k
  if (Array.isArray(o.list)) return 'list'
  return 'constant'
}

/** Décrit un modèle sans le tracer : mesures, pièces, options par type. */
export function describeDesign(Design) {
  const cfg = Design.patternConfig
  const counts = Object.fromEntries(OPTION_TYPES.map((t) => [t, 0]))
  for (const o of Object.values(cfg.options)) counts[optionType(o)]++
  const parts = Object.keys(cfg.parts)
  const hidden = Object.keys(cfg.partHide).filter((k) => cfg.partHide[k])
  return {
    requiredMeasurements: [...cfg.measurements],
    optionalMeasurements: [...cfg.optionalMeasurements],
    parts,
    hiddenParts: hidden,
    visibleParts: parts.filter((p) => !hidden.includes(p)),
    draftOrder: [...cfg.draftOrder],
    optionCounts: counts,
    optionTotal: Object.keys(cfg.options).length,
    plugins: Object.keys(cfg.plugins),
  }
}

/** Générateur pseudo-aléatoire reproductible (mulberry32) : mêmes scénarios dans Node et dans Chromium. */
export function mulberry32(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Scénario « curseur » par modèle : groupes de mesures qui varient ensemble (± 8 %) et une option qui parcourt
 * toute sa plage. Les groupes évitent les jeux de mesures incohérents (ex. seat et seatBack de Titan).
 */
export const PLAN = {
  Bella: { groups: [['chest'], ['waist', 'waistBack'], ['underbust']], option: 'chestEase' },
  Penelope: { groups: [['waist'], ['seat']], option: 'seatEase' },
  Sandy: { groups: [['waist'], ['hips']], option: 'lengthBonus' },
  Titan: { groups: [['waist', 'waistBack'], ['seat', 'seatBack']], option: 'seatEase' },
  Teagan: { groups: [['chest'], ['waist'], ['hips']], option: 'chestEase' },
  Tiberius: { groups: [['chest'], ['waist'], ['hips']], option: 'lengthBonus' },
}

export function makeSettings(name, base, rng, extra = {}) {
  const plan = PLAN[name]
  const measurements = { ...base }
  for (const group of plan.groups) {
    const f = 1 + (rng() * 2 - 1) * 0.08
    for (const m of group) if (typeof measurements[m] === 'number') measurements[m] = base[m] * f
  }
  const def = DESIGNS[name].patternConfig.options[plan.option]
  const kind = optionType(def)
  const lo = def.min ?? 0
  const hi = def.max ?? 100
  const v = lo + rng() * (hi - lo)
  const options = { [plan.option]: kind === 'pct' ? v / 100 : v }
  return { measurements, options, sa: 0, complete: true, paperless: false, ...extra }
}

export const median = (sorted) => sorted[Math.floor(sorted.length / 2)]
export const pctile = (sorted, p) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))]
export function stats(values) {
  const s = [...values].sort((a, b) => a - b)
  const sum = s.reduce((x, y) => x + y, 0)
  return {
    n: s.length,
    min: s[0],
    median: median(s),
    p95: pctile(s, 0.95),
    p99: pctile(s, 0.99),
    max: s[s.length - 1],
    mean: sum / s.length,
  }
}

const text = (m) => {
  if (m instanceof Error) return `${m.name}: ${m.message}`
  if (Array.isArray(m)) return m.map(text).join(' | ')
  if (typeof m === 'string') return m
  try {
    return JSON.stringify(m)
  } catch {
    return String(m)
  }
}

/** Récupère messages d'erreur et d'avertissement d'un tracé : journaux (pattern et jeu) et drapeaux (flag.warn/error). */
export function collectMessages(pattern, into) {
  const stores = [pattern.store, ...pattern.setStores]
  for (const store of stores) {
    for (const level of ['error', 'warn']) {
      for (const m of store.logs?.[level] ?? []) {
        const key = `${level}\u0000${text(m).slice(0, 240)}`
        into.set(key, (into.get(key) ?? 0) + 1)
      }
    }
    const flags = store.plugins?.['plugin-annotations']?.flags ?? {}
    for (const level of ['error', 'warn']) {
      for (const id of Object.keys(flags[level] ?? {})) {
        const key = `flag-${level}\u0000${id}`
        into.set(key, (into.get(key) ?? 0) + 1)
      }
    }
  }
}

/** Plugin minuscule : chronomètre chaque pièce (hooks prePartDraft / postPartDraft). */
export function partTimer(into) {
  let t0 = 0
  return {
    name: 'bench-part-timer',
    version: '0',
    hooks: {
      prePartDraft: (pattern) => {
        t0 = performance.now()
        void pattern
      },
      postPartDraft: (pattern) => {
        const name = pattern.activePart
        into[name] = (into[name] ?? 0) + (performance.now() - t0)
      },
    },
  }
}

/** Premier tracé « à froid » : à lancer dans un processus (ou une page) neuf, un seul modèle. */
export function coldRun(Design, base) {
  const t0 = performance.now()
  const pattern = new Design({ measurements: base, sa: 0, complete: true, paperless: false })
  const t1 = performance.now()
  pattern.draft()
  const t2 = performance.now()
  const svg = pattern.render()
  const t3 = performance.now()
  return { constructMs: t1 - t0, firstDraftMs: t2 - t1, firstTotalMs: t2 - t0, firstRenderMs: t3 - t2, svgBytes: svg.length }
}

/** Tracés à chaud : `warmup` tracés écartés, puis `n` mesurés (construction, tracé, rendu, tracé par pièce). */
export function hotRun(name, { n = 200, warmup = 30, seed = 1234, sizeName = 'cisFemaleAdult36' } = {}) {
  const Design = DESIGNS[name]
  const base = sizeMeasurements(sizeName)
  const rng = mulberry32(seed)
  const messages = new Map()
  const construct = []
  const draft = []
  const total = []
  const render = []
  const perPart = {}
  const warmCurve = []
  let lastPattern
  for (let i = 0; i < warmup + n; i++) {
    const settings = makeSettings(name, base, rng)
    const timers = {}
    const t0 = performance.now()
    const pattern = new Design(settings)
    pattern.use(partTimer(timers))
    const t1 = performance.now()
    pattern.draft()
    const t2 = performance.now()
    pattern.render()
    const t3 = performance.now()
    if (i < 10) warmCurve.push(+(t2 - t0).toFixed(2))
    if (i >= warmup) {
      construct.push(t1 - t0)
      draft.push(t2 - t1)
      total.push(t2 - t0)
      render.push(t3 - t2)
      for (const [part, ms] of Object.entries(timers)) (perPart[part] ??= []).push(ms)
      collectMessages(pattern, messages)
    }
    lastPattern = pattern
  }
  return {
    n,
    warmup,
    seed,
    construct: stats(construct),
    draft: stats(draft),
    total: stats(total),
    render: stats(render),
    perPart: Object.fromEntries(Object.entries(perPart).map(([k, v]) => [k, stats(v)])),
    warmCurveMs: warmCurve,
    messages: [...messages.entries()].map(([k, count]) => {
      const [level, msg] = k.split('\u0000')
      return { level, message: msg, occurrences: count, perDraft: +(count / n).toFixed(2) }
    }),
    lastParts: Object.keys(lastPattern.parts[0]),
  }
}

/** Coût d'un tracé par taille, réglages par défaut : `reps` tracés après 5 de chauffe, médiane et p95 (construction + tracé). */
export function sizeSweep(name, sizes, reps = 30) {
  const Design = DESIGNS[name]
  const out = {}
  for (const size of sizes) {
    const base = sizeMeasurements(size)
    const times = []
    for (let i = 0; i < 5 + reps; i++) {
      const t0 = performance.now()
      new Design({ measurements: base, sa: 0 }).draft()
      if (i >= 5) times.push(performance.now() - t0)
    }
    const st = stats(times)
    out[size] = { median: st.median, p95: st.p95, max: st.max }
  }
  return out
}

export function benchAll({ names = Object.keys(DESIGNS), n = 200, warmup = 30 } = {}) {
  const out = {}
  for (const name of names) out[name] = { describe: describeDesign(DESIGNS[name]), hot: hotRun(name, { n, warmup }) }
  return out
}
