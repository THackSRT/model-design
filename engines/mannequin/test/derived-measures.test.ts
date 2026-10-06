import { readFileSync } from 'node:fs';
import { type MeasurementSet, measurementSetJsonSchema } from '@atelier/contracts-ts';
import { beforeAll, describe, expect, it } from 'vitest';
import {
  DERIVED_BOUNDS,
  DERIVED_KEYS,
  type DerivedKey,
  deriveMeasurements,
  type FittedMannequin,
  loadMannequinEngine,
  type MannequinEngine,
  sideLandmarks,
} from '../src/index.js';

/*
 * Les onze mesures que le mannequin lit sur son corps (tâche 1.61a), comparées à des tailles du tableau de
 * @freesewing/models (fixture `freesewing-sizes.json`, sa source et sa version y sont écrites). Ce tableau n'est
 * pas une enquête : il extrapole un corps moyen à chaque tour de cou. Les tolérances ci-dessous sont donc des
 * bornes de vraisemblance, justifiées mesure par mesure ; celles marquées `open` sont des écarts connus,
 * signalés en point ouvert : le mannequin n'est pas forcé vers la table.
 */
const DATA = new URL('../assets/makehuman.mhz', import.meta.url);

interface FreeSewingSize {
  sex: 'female' | 'male';
  [measure: string]: number | string;
}

const fixture = JSON.parse(
  readFileSync(new URL('./fixtures/freesewing-sizes.json', import.meta.url), 'utf8'),
) as { version: string; license: string; sizes: Record<string, FreeSewingSize> };

/**
 * Rapport hauteur de taille / stature. FreeSewing n'a pas de stature : on la déduit de waistToFloor avec le rapport
 * des deux mannequins (0,622 pour la femme, 0,634 pour l'homme, hauteur de l'anneau de taille), arrondi.
 */
const WAIST_HEIGHT_RATIO = 0.63;

const n = (size: FreeSewingSize, key: string): number => size[key] as number;

/** MeasurementSet comme dans docs/suivi/essais/tuniques/drape-run.mjs : poitrine, taille, bassin (seat), cou, bras, poignet. */
function measurementsOf(size: FreeSewingSize): MeasurementSet {
  return {
    sex: size.sex,
    statureMm: Math.round(n(size, 'waistToFloor') / WAIST_HEIGHT_RATIO / 10) * 10,
    chestGirthMm: n(size, 'chest'),
    waistGirthMm: n(size, 'waist'),
    hipGirthMm: n(size, 'seat'),
    neckGirthMm: n(size, 'neck'),
    upperArmGirthMm: n(size, 'biceps'),
    wristGirthMm: n(size, 'wrist'),
  };
}

/** Valeur FreeSewing de chaque mesure du contrat (correspondance : docs/composants/contrats.md). */
const referenceOf = (s: FreeSewingSize): Record<DerivedKey, number> => ({
  highBustGirthMm: n(s, 'highBust'),
  upperHipGirthMm: n(s, 'hips'),
  waistGirthBackMm: n(s, 'waistBack'),
  hipGirthBackMm: n(s, 'seatBack'),
  shoulderSlopeDeg: n(s, 'shoulderSlope'),
  waistToArmpitMm: n(s, 'waistToArmpit'),
  waistToUpperHipMm: n(s, 'waistToHips'),
  crotchLengthMm: n(s, 'crossSeam'),
  frontCrotchLengthMm: n(s, 'crossSeamFront'),
  waistToThighMm: n(s, 'waistToUpperLeg'),
  kneeHeightMm: n(s, 'waistToFloor') - n(s, 'waistToKnee'),
});

/** Écart toléré avec la table, en part de la valeur FreeSewing ; `open` : écart connu, point ouvert. */
interface Tolerance {
  rel: number;
  open?: true;
  why: string;
}

const TOLERANCES: Record<Exclude<DerivedKey, 'shoulderSlopeDeg'>, Tolerance> = {
  highBustGirthMm: {
    rel: 0.16,
    why: "tronc seul sous le creux ; pour les fortes poitrines l'anneau de poitrine du moteur englobe la racine des bras, le tronc est plus étroit que le tour demandé (écart −13 % à +6 %)",
  },
  upperHipGirthMm: {
    rel: 0.14,
    why: "tronc à mi-hauteur entre taille et bassin ; la table donne des hanches hautes plus serrées chez l'homme (écart −6 % à +11 %)",
  },
  waistGirthBackMm: {
    rel: 0.16,
    why: 'arc arrière entre les points les plus latéraux ; chez la femme ils sont en arrière du milieu du tronc (ventre en avant) : part dos de 44 % du tour pour 50,7 % dans la table (écart −14 % à 0 %)',
  },
  hipGirthBackMm: {
    rel: 0.1,
    why: 'même définition au tour de bassin (écart −8 % à +3 %)',
  },
  waistToArmpitMm: {
    rel: 0.45,
    open: true,
    why: "creux du corps au repos (bras à 47°) à 21 à 24 cm au-dessus de la taille pour toutes les tailles, alors que la table va de 15 à 22 cm : nul chez l'homme, jusqu'à +40 % chez la petite femme",
  },
  waistToUpperHipMm: {
    rel: 0.27,
    open: true,
    why: "crête iliaque à mi-hauteur taille-bassin (la table : waistToHips = la moitié de waistToSeat) ; l'anneau de bassin du moteur est 11 à 23 % plus près de la taille que waistToSeat (écart −23 % à −12 %)",
  },
  crotchLengthMm: {
    rel: 0.3,
    open: true,
    why: 'chemin dans le plan sagittal de la taille à la taille ; la table (exposant 0,6 sur le cou) donne une fourche plus longue que le maillage : −8 % à −25 %, surtout chez l’homme',
  },
  frontCrotchLengthMm: {
    rel: 0.24,
    open: true,
    why: "même chemin, de la taille devant au milieu de l'arche entre les jambes (écart −19 % à −11 %)",
  },
  waistToThighMm: {
    rel: 0.16,
    why: "tour de cuisse au dixième de la longueur de cuisse sous l'entrejambe (écart −14 % à +10 %)",
  },
  kneeHeightMm: {
    rel: 0.25,
    open: true,
    why: 'centre de la zone de genou (pli du jarret) ; la table ne fait varier waistToFloor − waistToKnee que de 3 % de F28 à F46 quand la stature déduite croît de 23 % (écart +1 % à +19 %)',
  },
};

describe('mesures lues sur le corps, tailles du tableau FreeSewing', () => {
  let engine: MannequinEngine;
  const fits = new Map<string, FittedMannequin>();
  const fitOf = (name: string): FittedMannequin => {
    let fitted = fits.get(name);
    if (!fitted) {
      fitted = engine.fit(measurementsOf(fixture.sizes[name] as FreeSewingSize));
      fits.set(name, fitted);
    }
    return fitted;
  };
  beforeAll(async () => {
    engine = await loadMannequinEngine(async () => new Uint8Array(readFileSync(DATA)));
  });

  it('la fixture vient de @freesewing/models 4.10.2 (MIT), modèles nommés par le tour de cou en cm', () => {
    expect(fixture.version).toBe('4.10.2');
    expect(fixture.license).toBe('MIT');
    for (const [name, size] of Object.entries(fixture.sizes)) {
      expect(n(size, 'neck')).toBe(Number(name.slice(-2)) * 10);
      expect(name.startsWith(size.sex === 'female' ? 'cisFemale' : 'cisMale')).toBe(true);
    }
  });

  it.each(Object.keys(fixture.sizes))('%s : chaque mesure reste dans sa tolérance', (name) => {
    const derived = deriveMeasurements(fitOf(name));
    const reference = referenceOf(fixture.sizes[name] as FreeSewingSize);
    for (const [key, tolerance] of Object.entries(TOLERANCES)) {
      const mine = derived[key as DerivedKey];
      const wanted = reference[key as DerivedKey];
      const gap = Math.abs(mine - wanted) / wanted;
      expect(
        gap,
        `${name} ${key} : ${mine} contre ${wanted} — ${tolerance.why}`,
      ).toBeLessThanOrEqual(tolerance.rel);
    }
  });

  it("la pente d'épaule est celle du mannequin, 15° à 30° : la table la fixe à 13° pour toutes les tailles", () => {
    // Point ouvert : le contour de l'épaule du maillage descend de 22 à 24° entre le point d'encolure et
    // l'acromion ; la valeur de la table (constante, sans lien avec la taille) n'est pas une référence.
    for (const name of Object.keys(fixture.sizes)) {
      const slope = deriveMeasurements(fitOf(name)).shoulderSlopeDeg;
      expect(slope).toBeGreaterThanOrEqual(15);
      expect(slope).toBeLessThanOrEqual(30);
    }
  });

  it("l'écart des deux acromions est la carrure de la table à 14 % près", () => {
    // La table mesure par le dos (un arc, plus long que la corde) : seul l'ordre de grandeur est comparable.
    // C'est la seule référence de la table qui dépende de la taille pour valider l'acromion.
    for (const name of Object.keys(fixture.sizes)) {
      const { left, right } = sideLandmarks(fitOf(name));
      const chord = left.acromion[0] - right.acromion[0];
      const wanted = n(fixture.sizes[name] as FreeSewingSize, 'shoulderToShoulder');
      expect(Math.abs(chord - wanted) / wanted, name).toBeLessThanOrEqual(0.14);
    }
  });

  it('rend des entiers dans les bornes du contrat', () => {
    for (const name of Object.keys(fixture.sizes)) {
      const derived = deriveMeasurements(fitOf(name));
      expect(Object.keys(derived).sort()).toEqual([...DERIVED_KEYS].sort());
      for (const key of DERIVED_KEYS) {
        const [min, max] = DERIVED_BOUNDS[key];
        expect(Number.isInteger(derived[key])).toBe(true);
        expect(derived[key]).toBeGreaterThanOrEqual(min);
        expect(derived[key]).toBeLessThanOrEqual(max);
      }
    }
  });

  it('garde les valeurs lues sur les deux tailles de base de FreeSewing (garde-fou, à 1 mm près)', () => {
    // Relevé de 1.61a : à mettre à jour, avec relecture, seulement si la définition d'une mesure change voulu.
    const expected: Record<string, number[]> = {
      cisFemaleAdult34: [758, 926, 327, 536, 22, 225, 106, 663, 330, 300, 485],
      cisMaleAdult38: [1013, 931, 409, 537, 24, 210, 107, 653, 333, 298, 589],
    };
    for (const [name, values] of Object.entries(expected)) {
      const derived = deriveMeasurements(fitOf(name));
      DERIVED_KEYS.forEach((key, i) => {
        expect(
          Math.abs(derived[key] - (values[i] as number)),
          `${name} ${key}`,
        ).toBeLessThanOrEqual(1);
      });
    }
  });
});

describe('contrat : bornes des mesures lues', () => {
  it('les bornes du mannequin sont celles de measurement-set.schema.json', () => {
    const properties = measurementSetJsonSchema.properties as unknown as Record<
      string,
      { type: string; minimum: number; maximum: number }
    >;
    for (const key of DERIVED_KEYS) {
      expect(properties[key]?.type).toBe('integer');
      expect([properties[key]?.minimum, properties[key]?.maximum]).toEqual([
        ...DERIVED_BOUNDS[key],
      ]);
    }
  });
});
