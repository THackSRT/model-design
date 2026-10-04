// Coud et drape les tuniques avec le moteur du dépôt (engines/drape, XPBD) sur le mannequin MakeHuman ajusté.
// Sorties : out3d/tunique-N.json (positions, triangles, coordonnées à plat par pièce), .glb, et un résumé.
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { build } from './ops.mjs'
import { GARMENTS } from './garments.mjs'
import { toGarmentSpec } from './spec3d.mjs'

const R = process.env.ATELIER_REPO
if (!R) throw new Error('ATELIER_REPO : chemin du dépôt model-design, moteurs compilés (voir LISEZMOI.md)')
const node = await import(`${R}/engines/drape/dist/node.js`)
const require = createRequire(`${R}/package.json`)
const Ajv2020 = require('ajv/dist/2020').default ?? require('ajv/dist/2020')
const addFormats = (() => { try { return require('ajv-formats') } catch { return null } })()

const out = new URL('./out3d/', import.meta.url).pathname
await mkdir(out, { recursive: true })
await node.loadAvatarEngine(async () => new Uint8Array(await readFile(`${R}/engines/mannequin/assets/makehuman.mhz`)))

// Mesures du modèle FreeSewing cisMaleAdult42 (mm) ; stature choisie pour des proportions proches du tracé.
const statureMm = +(process.env.STATURE ?? 1860)
const measurements = { sex: 'male', statureMm, chestGirthMm: 1105, waistGirthMm: 882, hipGirthMm: 1084, neckGirthMm: 420, upperArmGirthMm: 387, wristGirthMm: 184 }
const avatar = { armAngleDeg: 90, age: 35, morphotype: { african: 1, asian: 0, caucasian: 0 } }
const t0 = performance.now()
const shape = node.buildAvatar(measurements, avatar)
console.log('mannequin', Math.round(performance.now() - t0), 'ms · repères', JSON.stringify(shape.landmarksMm))

// Validation contre le schéma du contrat
const schema = JSON.parse(await readFile(`${R}/contracts/schemas/garment-spec.schema.json`, 'utf8'))
const ajv = new Ajv2020({ allErrors: true, strict: false })
if (addFormats) addFormats(ajv)
const validate = ajv.compile(schema)

const fabrics = { 1: 'bazin', 2: 'cotton-poplin', 3: 'cotton-poplin', 4: 'linen', 5: 'bazin' }
const only = process.argv[2] ? process.argv[2].split(',').map(Number) : null
const quality = process.env.QUALITY ?? 'draft'
const summary = []
for (const g of GARMENTS) {
  if (only && !only.includes(g.id)) continue
  const st = build(g)
  const spec = toGarmentSpec(st, { landmarks: shape.landmarksMm })
  await writeFile(`${out}spec-${g.id}.json`, JSON.stringify(spec, null, 1))
  if (!validate(spec)) {
    console.log(g.id, 'SCHÉMA', JSON.stringify(validate.errors.slice(0, 4)))
    continue
  }
  const t1 = performance.now()
  const res = node.drapeGarment({
    drapeId: '00000000-0000-4000-8000-00000000000' + g.id, organizationId: '00000000-0000-4000-8000-000000000010',
    designId: '00000000-0000-4000-8000-000000000020', versionNumber: 1,
    spec, measurements, avatar, fabric: { preset: fabrics[g.id] }, quality,
  })
  const ms = Math.round(performance.now() - t1)
  if (!res.ok) {
    console.log(g.id, g.title, 'ÉCHEC', ms, 'ms', JSON.stringify(res.problem), JSON.stringify(res.diagnostics ?? {}).slice(0, 400))
    summary.push({ id: g.id, ok: false, ms, problem: res.problem })
    continue
  }
  const r = res.result
  const seamsWorst = (res.mesh.seams ?? []).reduce((m, s) => Math.max(m, s.mismatchMm ?? 0), 0)
  console.log(g.id, g.title, 'OK', ms, 'ms · pas', r.simulatedSteps, 'convergé', r.converged, '· tension max', r.maxStrainPercent, '% · sommets', res.positionsMm.length / 3, '· écart de longueur max des coutures', seamsWorst.toFixed(1), 'mm')
  const pieces = res.mesh.pieces.map((p) => ({ panelId: p.panelId, copy: p.copy, side: p.side, mirrored: p.mirrored, unfolded: p.unfolded, shiftXMm: p.shiftXMm, vertexStart: p.vertexStart, vertexCount: p.vertexCount, triangleStart: p.triangleStart, triangleCount: p.triangleCount }))
  await writeFile(`${out}tunique-${g.id}.json`, JSON.stringify({
    id: g.id, title: g.title, fabric: fabrics[g.id], quality, ms, result: r,
    positions: Array.from(res.positionsMm, (v) => Math.round(v * 10) / 10),
    flat: Array.from(res.mesh.cloth.flatMm, (v) => Math.round(v * 10) / 10),
    triangles: Array.from(res.mesh.cloth.triangles),
    ease: res.easeMm ? Array.from(res.easeMm, (v) => Math.round(v)) : null,
    strain: res.strain ? Array.from(res.strain, (v) => Math.round(v * 10) / 10) : null,
    pieces,
  }))
  await writeFile(`${out}tunique-${g.id}.glb`, node.buildGlb(res))
  summary.push({ id: g.id, ok: true, ms, steps: r.simulatedSteps, converged: r.converged, maxStrainPercent: r.maxStrainPercent, vertices: res.positionsMm.length / 3 })
}
// Corps du mannequin pour le rendu (mm, y vers le haut, z vers l'avant)
const body = shape.body
await writeFile(`${out}mannequin.json`, JSON.stringify({ positions: Array.from(body.positionsMm ?? body.positions, (v) => Math.round(v * 10) / 10), index: Array.from(body.triangles ?? body.index), landmarks: shape.landmarksMm }))
await writeFile(`${out}resume-${quality}.json`, JSON.stringify(summary, null, 2))
