/*
 * Habillage rapide : maillage du vêtement porté, sans simulation physique. Pour chaque hauteur
 * couverte, la section du corps est agrandie jusqu'au tour fini lu sur le patron (anneau.ts) ; les
 * anneaux sont reliés en tubes. Approximation géométrique : ni plis, ni tombé, ni pression du tissu.
 */
import type { GarmentSpec } from '@atelier/contracts-ts';
import { hullPerimeter } from '../core/geometry.js';
import { armDrop, armsRaised, sleeveFits, type DressArms, type SleeveGrid } from './arms.js';
import { buildMesh, type PlacedRing, type Tube } from './mesh.js';
import { girthAt, sleeveProfile } from './pattern.js';
import { planFor, type GarmentLandmarks, type TubeSpec } from './plans.js';
import { directions, solveRing } from './ring.js';
import {
  createSectioner,
  type BodySectioner,
  type DropPoint,
  type SectionPart,
} from './section.js';
import type { DressOptions, GarmentMesh, TightZone } from './types.js';

/** Corps ajusté, tel que `fit` le rend (cm), avec ses repères (mm). */
export interface DressableBody {
  body: { positions: Float32Array; normals: Float32Array; index: ArrayLike<number> };
  landmarksMm: GarmentLandmarks;
  /**
   * Pivots et axes des bras du corps posé (`FittedMannequin.armsMm`). Bras levés (à 45° et plus de la
   * verticale) : les points de bras sont écartés des coupes du corsage ; avec des manches au patron, elles
   * suivent ces axes. Absent : bras supposés le long du corps, pas de manches.
   */
  armsMm?: DressArms;
}

/** Vêtement demandé : seul le type compte ici (les cotes viennent du patron). */
export interface DressGarment {
  type: string;
}

const DEFAULT_RINGS = 48;
const DEFAULT_SEGMENTS = 72;
/** Écart sous lequel une zone n'est pas signalée : bruit de mesure du maillage (mm). */
const TIGHT_MIN_MM = 1;
/** Points de coupe de bras à partir desquels la coupe traverse un bras entier (et non son seul dessous). */
const ARM_SECTION_MIN = 12;

interface Sample {
  hMm: number;
  shortfallMm: number;
}

interface BuiltTube {
  tube: Tube;
  tight: Sample[];
}

/** Suit du bas vers le haut les coupes : vrai quand les bras sont soudés au tronc (au-dessus de l'aisselle). */
function armWatch(drop?: DropPoint): (parts: SectionPart[], dropped: number) => boolean {
  let seen = false;
  return (parts, dropped) => {
    if (drop ? dropped >= ARM_SECTION_MIN : parts.length >= 3) seen = true;
    return seen && (drop !== undefined || parts.length <= 1);
  };
}

/**
 * Anneaux d'un tube, calculés du bas vers le haut pour savoir si les bras sont déjà soudés au tronc :
 * bras le long du corps, quand une coupe a trois parties ; bras levés, quand une coupe traverse un bras.
 */
function buildTube(
  spec: TubeSpec,
  sect: BodySectioner,
  dirs: ReturnType<typeof directions>,
  arms?: DressArms,
): BuiltTube {
  const rings: PlacedRing[] = [];
  const tight: Sample[] = [];
  const drop = spec.relaxAboveArmpit && armsRaised(arms) ? armDrop(arms) : undefined;
  const watch = armWatch(drop);
  for (const hMm of spec.heightsMm.slice().reverse()) {
    const { parts, dropped } = sect.cut(hMm / 10, drop);
    const welded = watch(parts, dropped);
    const { hull } = hullPerimeter(spec.select(parts));
    if (hull.length < 3) continue;
    const solved = solveRing(hull, dirs, spec.girthMm(hMm) / 10);
    rings.push({ yCm: hMm / 10, points: solved.points });
    const attached = spec.relaxAboveArmpit && welded;
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

/** Manches du patron (une par bras) autour des axes des bras ; aucune sans manche au patron ni bras connus. */
function sleevesOf(fitted: DressableBody, spec: GarmentSpec, grid: SleeveGrid): Tube[] {
  const profile = sleeveProfile(spec);
  if (!profile || !armsRaised(fitted.armsMm)) return [];
  const shape = {
    lengthMm: grid.lengthMm ?? profile.lengthMm,
    girthMm: (fromHemMm: number) => girthAt([profile.panel], profile.panel.yMin + fromHemMm),
  };
  return sleeveFits(fitted.armsMm, fitted.body.positions, shape, grid).map((f) => f.tube);
}

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
  const built = plans.map((p) => buildTube(p, sect, dirs, fitted.armsMm));
  const heights = plans.flatMap((p) => p.heightsMm);
  const stepMm = (Math.max(...heights) - Math.min(...heights)) / (count - 1);
  return {
    ...buildMesh([
      ...built.map((b) => b.tube),
      ...(garment.type === 'bodice'
        ? sleevesOf(fitted, spec, { dirs, count, lengthMm: options.sleeveLengthMm })
        : []),
    ]),
    tightZones: toZones(
      built.flatMap((b) => b.tight),
      stepMm,
    ),
  };
}
