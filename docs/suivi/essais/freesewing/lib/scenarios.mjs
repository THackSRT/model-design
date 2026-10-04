// Scénarios de validation d'une fiche : options aux bornes, combinaisons aléatoires, mesures décalées.
import { optionType, mulberry32 } from './bench-lib.mjs'

export const VALIDATION_SIZES = ['cisFemaleAdult28', 'cisFemaleAdult34', 'cisFemaleAdult40', 'cisFemaleAdult46', 'cisMaleAdult42']

/** Domaine de chaque option modifiable : type, valeurs de bornes, valeur par défaut, menu. */
export function optionDomains(Design) {
  const out = []
  for (const [name, o] of Object.entries(Design.patternConfig.options)) {
    const type = optionType(o)
    if (type === 'constant') continue
    const menu = typeof o.menu === 'function' ? 'fn' : o.menu
    const d = { name, type, menu }
    if (type === 'pct') Object.assign(d, { dflt: o.pct / 100, values: [o.min / 100, o.max / 100], min: o.min / 100, max: o.max / 100 })
    else if (type === 'deg' || type === 'count' || type === 'mm') Object.assign(d, { dflt: o[type], values: [o.min, o.max], min: o.min, max: o.max })
    else if (type === 'bool') Object.assign(d, { dflt: o.bool, values: [!o.bool] })
    else if (type === 'list') Object.assign(d, { dflt: o.dflt, values: o.list.filter((v) => v !== o.dflt) })
    out.push(d)
  }
  return out
}

/** Un jeu de scénarios nommés : { name, options } (les mesures et la taille s'ajoutent à l'appel). */
export function buildScenarios(Design, { random = 300, seed = 4242 } = {}) {
  const doms = optionDomains(Design)
  const sc = [{ name: 'défaut', group: 'défaut', options: {} }]
  for (const d of doms) {
    if (d.type === 'bool') sc.push({ name: `${d.name}=${!d.dflt}`, group: 'une option', main: d.menu === 'fit' || d.menu === 'style', options: { [d.name]: !d.dflt } })
    else if (d.type === 'list') for (const v of d.values) sc.push({ name: `${d.name}=${v}`, group: 'une option', main: d.menu === 'fit' || d.menu === 'style', options: { [d.name]: v } })
    else for (const [i, v] of d.values.entries()) sc.push({ name: `${d.name}=${i === 0 ? 'min' : 'max'}`, group: 'une option', main: d.menu === 'fit' || d.menu === 'style', options: { [d.name]: v } })
  }
  // toutes les options « principales » (menus fit et style) à leur minimum, puis à leur maximum
  for (const [label, idx] of [['min', 0], ['max', 1]]) {
    const o = {}
    for (const d of doms) if ((d.menu === 'fit' || d.menu === 'style') && (d.type === 'pct' || d.type === 'deg' || d.type === 'count')) o[d.name] = d.values[idx]
    sc.push({ name: `fit+style tout au ${label}`, group: 'coin', main: true, options: o })
  }
  // idem avec toutes les options (y compris avancées)
  for (const [label, idx] of [['min', 0], ['max', 1]]) {
    const o = {}
    for (const d of doms) if (d.type === 'pct' || d.type === 'deg' || d.type === 'count') o[d.name] = d.values[idx]
    sc.push({ name: `toutes options au ${label}`, group: 'coin', main: false, options: o })
  }
  const rng = mulberry32(seed)
  for (let i = 0; i < random; i++) {
    const o = {}
    for (const d of doms) {
      if (rng() < 0.5) continue
      if (d.type === 'bool') o[d.name] = rng() < 0.5
      else if (d.type === 'list') o[d.name] = d.values.concat([d.dflt])[Math.floor(rng() * (d.values.length + 1))]
      else if (d.type === 'count') o[d.name] = Math.round(d.min + rng() * (d.max - d.min))
      else o[d.name] = d.min + rng() * (d.max - d.min)
    }
    sc.push({ name: `aléatoire ${i + 1}`, group: 'aléatoire', options: o })
  }
  return sc
}

/** Décale les mesures (hors angles) d'un facteur : sert aux essais de robustesse sur les mesures. */
export function scaleMeasurements(m, factor) {
  const out = { ...m }
  for (const k of Object.keys(out)) if (k !== 'shoulderSlope') out[k] = out[k] * factor
  return out
}
