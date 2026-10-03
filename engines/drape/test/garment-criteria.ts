import type { GarmentSpec } from '@atelier/contracts-ts';
import {
  buildAvatar,
  drapeGarment,
  loadAvatarEngine,
  placeGarment,
  type AvatarShape,
  type DrapeOutcome,
} from '../src/node.js';
import {
  DRAPE_SETTINGS,
  meshGarment,
  PENETRATION_TOLERANCE_MM,
  SEAM_TOLERANCE_MM,
  type MeshQuality,
} from '../src/index.js';
import {
  bandBottom,
  edgeHeights,
  shoulderShiftMm,
  fixture,
  hemVertices,
  jobOf,
  MEASUREMENTS,
  median,
  seamGaps,
  shoulderGap,
  sleeveTop,
  startStrainP95,
} from './drape-helpers.js';

// Critères d'un drapé par vêtement (ADR 0013, « Critères » et « Budget »), mesurés pour une qualité donnée. Les
// seuils sont ceux des tests en brouillon ; seuls le nombre de pas et la borne de temps suivent la qualité.

export type GarmentName =
  'straight-skirt' | 'circle-skirt' | 'trousers' | 'bodice' | 'bodice-with-sleeves';

export const GARMENTS: GarmentName[] = [
  'straight-skirt',
  'circle-skirt',
  'trousers',
  'bodice',
  'bodice-with-sleeves',
];

/** Un critère mesuré : `max` demande valeur ≤ limite, `min` valeur ≥ limite. */
export interface Criterion {
  id: string;
  value: number;
  limit: number;
  kind: 'max' | 'min';
}

export interface Measured {
  name: GarmentName;
  quality: MeshQuality;
  seconds: number;
  problem?: string;
  criteria: Criterion[];
}

/** Borne du temps réel d'un drapé, s : 15 en brouillon, 60 en standard (architecture 5.4, ADR 0013). */
export const TIME_LIMIT_S: Record<MeshQuality, number> = { draft: 15, standard: 60 };

const ARMS_90 = { armAngleDeg: 90 };
const SKIRT_LENGTH_MM = 650;
const HIP_RADIUS_MM = MEASUREMENTS.hipGirthMm / (2 * Math.PI);
const STRAIGHT_HIP_MM = 826;
const FLAT_EASE_MM = 3;

const armsOf = (): { armAngleDeg?: number } => ARMS_90;

const max = (id: string, value: number, limit: number): Criterion => ({
  id,
  value,
  limit,
  kind: 'max',
});
const min = (id: string, value: number, limit: number): Criterion => ({
  id,
  value,
  limit,
  kind: 'min',
});
/** Fourchette [lo, hi] : deux critères. */
const within = (id: string, value: number, lo: number, hi: number): Criterion[] => [
  min(`${id} ≥`, value, lo),
  max(`${id} ≤`, value, hi),
];

function commonCriteria(out: DrapeOutcome, quality: MeshQuality, seconds: number): Criterion[] {
  const failed = Number.NaN;
  const ok = out.ok;
  return [
    min('succès', ok ? 1 : 0, 1),
    min('convergé', ok && out.result.converged ? 1 : 0, 1),
    max('pas', ok ? out.result.simulatedSteps : failed, DRAPE_SETTINGS[quality].maxSteps),
    max(
      'pénétration (mm)',
      ok ? out.diagnostics.maxPenetrationMm : failed,
      PENETRATION_TOLERANCE_MM,
    ),
    max('écart de couture (mm)', ok ? out.diagnostics.maxStitchGapMm : failed, SEAM_TOLERANCE_MM),
    min('aisance min (mm)', ok ? out.result.ease.minMm : failed, -FLAT_EASE_MM),
    max('temps réel (s)', seconds, TIME_LIMIT_S[quality]),
  ];
}

const waistlineMedian = (spec: GarmentSpec, out: DrapeOutcome): number =>
  median(edgeHeights(spec, out, ['waistline'], 'role'));

function straightSkirt(spec: GarmentSpec, out: DrapeOutcome, avatar: AvatarShape): Criterion[] {
  const ease: number[] = [];
  if (out.ok) {
    for (let v = 0; v < out.easeMm.length; v++) {
      if (Math.abs((out.positionsMm[3 * v + 1] as number) - STRAIGHT_HIP_MM) < 15)
        ease.push(out.easeMm[v] as number);
    }
  }
  const waist = avatar.landmarksMm.waist;
  return [
    ...within('aisance médiane au bassin (mm)', median(ease), 0, 25 - 1e-9),
    ...within('taille (mm)', waistlineMedian(spec, out) - waist, -40, 10),
  ];
}

function circleSkirt(spec: GarmentSpec, out: DrapeOutcome, avatar: AvatarShape, q: MeshQuality) {
  const mesh = meshGarment(spec, q);
  const start = placeGarment(mesh, spec, avatar);
  const startCriteria = [
    max('départ : allongement p95', startStrainP95(mesh, start), 0.25),
    max('départ : coutures (mm)', seamGaps(start, mesh.cloth.stitches), 120),
  ];
  if (!out.ok) return [...startCriteria, min('taille, ourlet', Number.NaN, 0)];
  const p = out.positionsMm;
  const hem = hemVertices(mesh, spec);
  const cx = hem.reduce((s, v) => s + (p[3 * v] as number), 0) / hem.length;
  const cz = hem.reduce((s, v) => s + (p[3 * v + 2] as number), 0) / hem.length;
  const radius = median(
    hem.map((v) => Math.hypot((p[3 * v] as number) - cx, (p[3 * v + 2] as number) - cz)),
  );
  const bottom = bandBottom(mesh, p);
  const hemHeight = median(hem.map((v) => p[3 * v + 1] as number));
  return [
    ...startCriteria,
    ...within('bas de ceinture (mm)', bottom - avatar.landmarksMm.waist, -40, 10),
    min('rayon ourlet / hanche', radius / HIP_RADIUS_MM, 1.5),
    min(
      'chute : (bas de ceinture − ourlet) / longueur',
      (bottom - hemHeight) / SKIRT_LENGTH_MM,
      0.8,
    ),
  ];
}

function trousers(spec: GarmentSpec, out: DrapeOutcome, avatar: AvatarShape, q: MeshQuality) {
  const mesh = meshGarment(spec, q);
  const start = placeGarment(mesh, spec, avatar);
  const criteria = [max('départ : coutures (mm)', seamGaps(start, mesh.cloth.stitches), 120)];
  if (!out.ok) return criteria;
  let crossed = -Infinity;
  let checked = 0;
  for (const piece of mesh.pieces) {
    const sign = piece.side === 'left' ? 1 : -1;
    for (let v = piece.vertexStart; v < piece.vertexStart + piece.vertexCount; v++) {
      if ((out.positionsMm[3 * v + 1] as number) >= avatar.landmarksMm.crotch) continue;
      checked++;
      crossed = Math.max(crossed, -sign * (out.positionsMm[3 * v] as number));
    }
  }
  return [
    ...criteria,
    ...within('taille (mm)', waistlineMedian(spec, out) - avatar.landmarksMm.waist, -60, 10),
    max('jambe croisée : −x signé max (mm)', crossed, 10 - 1e-9),
    min('sommets sous l’entrejambe', checked, 501),
  ];
}

function bodice(spec: GarmentSpec, out: DrapeOutcome, avatar: AvatarShape, q: MeshQuality) {
  const start = placeGarment(meshGarment(spec, q), spec, avatar);
  const criteria = [max('départ : épaules (mm)', shoulderGap(spec, start, q), 80)];
  if (!out.ok) return criteria;
  const shoulders = edgeHeights(spec, out, ['shoulder']);
  const hem = median(edgeHeights(spec, out, ['hem-1', 'hem-2']));
  const lm = avatar.landmarksMm;
  return [
    ...criteria,
    min('épaule la plus basse − shoulder (mm)', Math.min(...shoulders) - lm.shoulder, -20),
    max('épaule la plus haute − neck (mm)', Math.max(...shoulders) - lm.neck, 20),
    max(
      '|bas − (waist + Δépaule)| (mm)',
      Math.abs(hem - lm.waist - shoulderShiftMm(avatar, MEASUREMENTS)),
      40,
    ),
  ];
}

function sleeves(spec: GarmentSpec, out: DrapeOutcome, avatar: AvatarShape, q: MeshQuality) {
  const base = bodice(spec, out, avatar, q);
  return [...base, max('|haut de manche| (mm)', Math.abs(sleeveTop(out, avatar)), 40 - 1e-9)];
}

/** Drape un vêtement de référence et mesure tous ses critères. */
export async function measureGarment(name: GarmentName, quality: MeshQuality): Promise<Measured> {
  await loadAvatarEngine();
  const spec = fixture(name);
  const arms = armsOf();
  const avatar = buildAvatar(MEASUREMENTS, arms);
  const t0 = performance.now();
  const out = drapeGarment(jobOf(spec, { avatar: arms, quality }));
  const seconds = (performance.now() - t0) / 1000;
  const byGarment: Record<GarmentName, () => Criterion[]> = {
    'straight-skirt': () => straightSkirt(spec, out, avatar),
    'circle-skirt': () => circleSkirt(spec, out, avatar, quality),
    trousers: () => trousers(spec, out, avatar, quality),
    bodice: () => bodice(spec, out, avatar, quality),
    'bodice-with-sleeves': () => sleeves(spec, out, avatar, quality),
  };
  return {
    name,
    quality,
    seconds,
    ...(out.ok ? {} : { problem: out.problem.type }),
    criteria: [...commonCriteria(out, quality, seconds), ...byGarment[name]()],
  };
}

/** Marge d'un critère : positive si tenu. */
export const marginOf = (c: Criterion): number =>
  c.kind === 'max' ? c.limit - c.value : c.value - c.limit;

export const holds = (c: Criterion): boolean => marginOf(c) >= 0;

/** Tableau texte des marges d'un vêtement (une ligne par critère). */
export function marginTable(m: Measured): string {
  const lines = m.criteria.map((c) => {
    const rel = c.kind === 'max' ? '≤' : '≥';
    const status = holds(c) ? 'ok' : 'ÉCHEC';
    return `| ${c.id} | ${c.value.toFixed(3)} | ${rel} ${c.limit.toFixed(3)} | ${marginOf(c).toFixed(3)} | ${status} |`;
  });
  return [
    `${m.name} (${m.quality}, ${m.seconds.toFixed(1)} s)${m.problem ? ` problème ${m.problem}` : ''}`,
    ...lines,
  ].join('\n');
}
