// Mêmes entrées, Node 22 (V8 12.4) contre Chromium 141 (V8 14.1) : contours identiques au bit près ?
import { DESIGNS, sizeMeasurements } from './lib/designs.mjs'
import { extractContour } from './lib/adapter.mjs'
import { buildScenarios } from './lib/scenarios.mjs'
import { launch, openPage } from './page-lib.mjs'

const sizes = ['cisFemaleAdult28', 'cisFemaleAdult34', 'cisFemaleAdult40', 'cisFemaleAdult46', 'cisMaleAdult42']
const models = ['Teagan', 'Bella', 'Titan', 'Penelope', 'Sandy', 'Tiberius']
const scen = {}
for (const m of models) scen[m] = buildScenarios(DESIGNS[m], { random: 20 }).filter((s) => s.group !== 'une option' || s.name.endsWith('=max')).slice(0, 40)
const compute = (DESIGNSRef, sizeMeasurementsRef, extractRef, m, size, options) => {
  const p = new DESIGNSRef[m]({ measurements: sizeMeasurementsRef(size), options, sa: 0 })
  p.draft()
  const out = {}
  for (const [pn, part] of Object.entries(p.parts[0])) {
    if (part.hidden) continue
    const c = extractRef(part, part.paths.seam ? 'seam' : 'outline')
    if (!c.ok) continue
    out[pn] = c.segments.map((s) => [s.length, c.vertices[s.a].x, c.vertices[s.a].y, c.vertices[s.b].x, c.vertices[s.b].y, s.cp1?.x ?? 0, s.cp1?.y ?? 0, s.cp2?.x ?? 0, s.cp2?.y ?? 0])
  }
  return out
}
const nodeRes = {}
for (const m of models) for (const size of sizes) for (const sc of scen[m]) nodeRes[`${m}|${size}|${sc.name}`] = compute(DESIGNS, sizeMeasurements, extractContour, m, size, sc.options)
const browser = await launch()
const { page, ctx } = await openPage(browser, 1280, 900)
const jobs = []
for (const m of models) for (const size of sizes) for (const sc of scen[m]) jobs.push({ key: `${m}|${size}|${sc.name}`, m, size, options: sc.options })
const brRes = await page.evaluate(({ jobs }) => {
  const out = {}
  for (const j of jobs) {
    try {
      const p = new FS.DESIGNS[j.m]({ measurements: FS.sizeMeasurements(j.size), options: j.options, sa: 0 })
      p.draft()
      const o = {}
      for (const [pn, part] of Object.entries(p.parts[0])) {
        if (part.hidden) continue
        const c = FS.adapter.extractContour(part, part.paths.seam ? 'seam' : 'outline')
        if (!c.ok) continue
        o[pn] = c.segments.map((s) => [s.length, c.vertices[s.a].x, c.vertices[s.a].y, c.vertices[s.b].x, c.vertices[s.b].y, s.cp1?.x ?? 0, s.cp1?.y ?? 0, s.cp2?.x ?? 0, s.cp2?.y ?? 0])
      }
      out[j.key] = o
    } catch (e) { out[j.key] = { error: String(e) } }
  }
  return out
}, { jobs })
await ctx.close()
await browser.close()
let n = 0, identical = 0, maxDiff = 0, worst = ''
const rounded = { 6: 0, 4: 0, 3: 0, 2: 0 }
const perModel = {}
const rnd = (o, d) => JSON.stringify(o, (k, v) => (typeof v === 'number' ? Math.round(v * 10 ** d) / 10 ** d : v))
for (const [k, a] of Object.entries(nodeRes)) {
  n++
  const b = brRes[k]
  for (const d of Object.keys(rounded)) if (rnd(a, d) === rnd(b, d)) rounded[d]++
  const mdl = k.split('|')[0]
  perModel[mdl] ??= { n: 0, identical: 0 }
  perModel[mdl].n++
  if (JSON.stringify(a) === JSON.stringify(b)) perModel[mdl].identical++
  if (JSON.stringify(a) === JSON.stringify(b)) { identical++; continue }
  for (const pn of Object.keys(a)) {
    const sa = a[pn]; const sb = b?.[pn]
    if (!sb || sa.length !== sb.length) { maxDiff = Infinity; worst = `${k} ${pn} (nombre de segments)`; continue }
    sa.forEach((row, i) => row.forEach((v, j) => { const d = Math.abs(v - sb[i][j]); if (d > maxDiff) { maxDiff = d; worst = `${k} ${pn} seg ${i} col ${j}` } }))
  }
}
console.log(`${n} tracés comparés (6 modèles x 5 tailles x scénarios) : identiques au bit près ${identical}/${n} ; écart max ${maxDiff.toExponential(2)} mm ${worst}`)

console.log('identiques après arrondi à 10^-d mm :', JSON.stringify(Object.fromEntries(Object.entries(rounded).map(([d, c]) => [d + ' décimales', `${c}/${n}`]))))
console.log('par modèle (identiques au bit près) :', JSON.stringify(perModel))
