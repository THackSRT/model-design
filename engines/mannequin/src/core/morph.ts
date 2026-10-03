/*
 * Morphing : cibles MakeHuman (déplacements de sommets), morphologie de base (« macros »)
 * et cibles de mensuration par paires croissante / décroissante.
 */
import type { MacroParams, MhData } from './types.js';

/** Données nécessaires au morphing. */
type MorphData = Pick<MhData, 'base' | 'targets' | 'q'>;

/** Ajoute la cible `name`, au poids `w`, aux positions. Cible inconnue ou poids nul : rien. */
export function addTarget(data: MorphData, pos: Float32Array, name: string, w: number): void {
  if (!w) return;
  const t = data.targets[name];
  if (!t) return;
  const k = w * data.q;
  const { idx, d } = t;
  for (let i = 0; i < idx.length; i++) {
    const j = (idx[i] as number) * 3;
    pos[j] = (pos[j] as number) + (d[3 * i] as number) * k;
    pos[j + 1] = (pos[j + 1] as number) + (d[3 * i + 1] as number) * k;
    pos[j + 2] = (pos[j + 2] as number) + (d[3 * i + 2] as number) * k;
  }
}

/** Répartit une valeur 0..1 sur trois cibles : min / moyen / max. */
export const tri = (v: number): [number, number, number] =>
  v < 0.5 ? [1 - 2 * v, 2 * v, 0] : [0, 2 - 2 * v, 2 * v - 1];

/** Part de la cible « jeune » (1 jusqu'à 25 ans, 0 à 90 ans). */
export const youngShare = (age: number): number =>
  age <= 25 ? 1 : Math.max(0, Math.min(1, (90 - age) / 65));

const SEXES = ['male', 'female'] as const;
const AGES = ['young', 'old'] as const;
const MUSCLES = ['minmuscle', 'averagemuscle', 'maxmuscle'] as const;
const WEIGHTS = ['minweight', 'averageweight', 'maxweight'] as const;
const RACES = ['african', 'asian', 'caucasian'] as const;

/** Morphologie de base : p = { gender 0..1 (1 = homme), age (ans), muscle 0..1, weight 0..1, origines }. */
export function macro(data: MorphData, p: MacroParams): Float32Array {
  const pos = Float32Array.from(data.base);
  const sex = { male: p.gender, female: 1 - p.gender };
  const young = youngShare(p.age);
  const age = { young, old: 1 - young };
  const muscle = tri(p.muscle);
  const weight = tri(p.weight);
  const rs = p.african + p.asian + p.caucasian || 1;
  const race = { african: p.african / rs, asian: p.asian / rs, caucasian: p.caucasian / rs };
  for (const g of SEXES) {
    for (const a of AGES) {
      const ga = sex[g] * age[a];
      if (!ga) continue;
      MUSCLES.forEach((m, mi) => {
        WEIGHTS.forEach((w, wi) => {
          const share = ga * (muscle[mi] as number) * (weight[wi] as number);
          addTarget(data, pos, `macrodetails/universal-${g}-${a}-${m}-${w}`, share);
        });
      });
      for (const r of RACES) addTarget(data, pos, `macrodetails/${r}-${g}-${a}`, ga * race[r]);
    }
  }
  return pos;
}

/**
 * Poitrine féminine : cibles MakeHuman `breast/` (locales à la poitrine), interpolées selon l'âge, la
 * musculature et la corpulence comme les macros. `cup` (0..1) pose le bonnet maximal, `firmness` (0..1) la
 * fermeté maximale ; les poids sont ceux de la part féminine du corps (rien pour un corps masculin).
 */
export function addBreast(
  data: MorphData,
  pos: Float32Array,
  p: MacroParams,
  shape: { cup: number; firmness: number },
): void {
  const female = 1 - p.gender;
  if (!female) return;
  const young = youngShare(p.age);
  const age = { young, old: 1 - young };
  const muscle = tri(p.muscle);
  const weight = tri(p.weight);
  for (const a of AGES) {
    MUSCLES.forEach((m, mi) => {
      WEIGHTS.forEach((w, wi) => {
        const share = female * age[a] * (muscle[mi] as number) * (weight[wi] as number);
        const base = `breast/female-${a}-${m}-${w}`;
        addTarget(data, pos, `${base}-maxcup-averagefirmness`, share * shape.cup);
        addTarget(data, pos, `${base}-averagecup-maxfirmness`, share * shape.firmness);
      });
    });
  }
}

/** Cibles de mensuration : clé de zone → préfixe de la paire `-incr` / `-decr`. */
export const PAIRS: Record<string, string> = {
  neck: 'measure/measure-neck-circ',
  chest: 'measure/measure-bust-circ',
  underbust: 'measure/measure-underbust-circ',
  waist: 'measure/measure-waist-circ',
  hip: 'measure/measure-hips-circ',
  bicep: 'measure/measure-upperarm-circ',
  wrist: 'measure/measure-wrist-circ',
  thigh: 'measure/measure-thigh-circ',
  knee: 'measure/measure-knee-circ',
  calf: 'measure/measure-calf-circ',
  ankle: 'measure/measure-ankle-circ',
  upperleg: 'measure/measure-upperleg-height',
  lowerleg: 'measure/measure-lowerleg-height',
  upperarm: 'measure/measure-upperarm-length',
  lowerarm: 'measure/measure-lowerarm-length',
  shoulder: 'measure/measure-shoulder-dist',
  napetowaist: 'measure/measure-napetowaist-dist',
  belly: 'stomach/stomach-pregnant',
  seat: 'buttocks/buttocks-volume',
};

/** Applique la paire de cibles `key` à la valeur v (signée : positive = croissante). */
export function applyPair(data: MorphData, pos: Float32Array, key: string, v: number): void {
  if (!v) return;
  addTarget(data, pos, `${PAIRS[key]}-${v > 0 ? 'incr' : 'decr'}`, Math.abs(v));
}
