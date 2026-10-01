/*
 * Habillage rapide : maillage du vêtement porté, sans simulation physique. Pour chaque hauteur
 * couverte, la section du corps est agrandie jusqu'au tour fini lu sur le patron (anneau.ts) ; les
 * anneaux sont reliés en tubes. Approximation géométrique : ni plis, ni tombé, ni pression du tissu.
 */
import type { GarmentSpec } from '@atelier/contracts-ts';
import { hullPerimeter } from '../core/geometry.js';
import { buildMesh, type PlacedRing, type Tube } from './mesh.js';
import { planFor, type GarmentLandmarks, type TubeSpec } from './plans.js';
import { directions, solveRing } from './ring.js';
import { createSectioner, type BodySectioner } from './section.js';
import type { DressOptions, GarmentMesh, TightZone } from './types.js';

/** Corps ajusté, tel que `fit` le rend (cm), avec ses repères (mm). */
export interface DressableBody {
  body: { positions: Float32Array; normals: Float32Array; index: ArrayLike<number> };
  landmarksMm: GarmentLandmarks;
}

/** Vêtement demandé : seul le type compte ici (les cotes viennent du patron). */
export interface DressGarment {
  type: string;
}

const DEFAULT_RINGS = 48;
const DEFAULT_SEGMENTS = 72;
/** Écart sous lequel une zone n'est pas signalée : bruit de mesure du maillage (mm). */
const TIGHT_MIN_MM = 1;

interface Sample {
  hMm: number;
  shortfallMm: number;
}

interface BuiltTube {
  tube: Tube;
  tight: Sample[];
}

/** Anneaux d'un tube, calculés du bas vers le haut pour savoir si les bras sont déjà soudés au tronc. */
function buildTube(
  spec: TubeSpec,
  sect: BodySectioner,
  dirs: ReturnType<typeof directions>,
): BuiltTube {
  const rings: PlacedRing[] = [];
  const tight: Sample[] = [];
  let armsSeen = false;
  for (const hMm of spec.heightsMm.slice().reverse()) {
    const parts = sect.at(hMm / 10);
    if (parts.length >= 3) armsSeen = true;
    const { hull } = hullPerimeter(spec.select(parts));
    if (hull.length < 3) continue;
    const solved = solveRing(hull, dirs, spec.girthMm(hMm) / 10);
    rings.push({ yCm: hMm / 10, points: solved.points });
    const attached = spec.relaxAboveArmpit && armsSeen && parts.length <= 1;
    if (!attached && solved.shortfallCm * 10 > TIGHT_MIN_MM) {
      tight.push({ hMm, shortfallMm: solved.shortfallCm * 10 });
    }
  }
  return { tube: { rings: rings.reverse(), closed: spec.closed }, tight };
}

/** Regroupe les hauteurs trop justes contiguës en zones. `stepMm` : écart entre deux anneaux. */
export function toZones(samples: Sample[], stepMm: number): TightZone[] {
  const sorted = samples.slice().sort((a, b) => a.hMm - b.hMm);
  const zones: TightZone[] = [];
  for (const s of sorted) {
    const last = zones[zones.length - 1];
    if (last && s.hMm - last.toMm <= 1.5 * stepMm) {
      last.toMm = s.hMm;
      last.shortfallMm = Math.max(last.shortfallMm, s.shortfallMm);
    } else {
      zones.push({ fromMm: s.hMm, toMm: s.hMm, shortfallMm: s.shortfallMm });
    }
  }
  return zones;
}

const whole = (value: number | undefined, fallback: number, min: number): number =>
  Math.max(min, Math.round(value ?? fallback));

/**
 * Habille le mannequin ajusté : maillage du vêtement (cm) et zones « trop justes » (mm). Pur et
 * déterministe ; tableaux neufs à chaque appel.
 */
export function dressMannequin(
  fitted: DressableBody,
  spec: GarmentSpec,
  garment: DressGarment,
  options: DressOptions = {},
): GarmentMesh {
  const count = whole(options.rings, DEFAULT_RINGS, 4);
  const dirs = directions(whole(options.segments, DEFAULT_SEGMENTS, 12));
  const sect = createSectioner(fitted.body.positions, fitted.body.index);
  const plans = planFor(garment.type, spec, fitted.landmarksMm, count);
  const built = plans.map((p) => buildTube(p, sect, dirs));
  const heights = plans.flatMap((p) => p.heightsMm);
  const stepMm = (Math.max(...heights) - Math.min(...heights)) / (count - 1);
  return {
    ...buildMesh(built.map((b) => b.tube)),
    tightZones: toZones(
      built.flatMap((b) => b.tight),
      stepMm,
    ),
  };
}
