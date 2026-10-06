import { describe, expect, it } from 'vitest';
import { draftModel } from '../src/index.js';
import { BASE_OPTION_SETS, VALIDATION_SIZES, sizeRequest } from './helpers.js';

/** Budget de la fiche 1.55a (ADR 0021) : un tracé de Brian, contrôles compris, en moins de 10 ms à chaud. */
const BUDGET_MS = 10;
/** Tracés d'échauffement : le compilateur de V8 n'optimise le code de FreeSewing qu'après quelques dizaines d'appels. */
const WARM_UP = 30;
/** Tracés mesurés par série ; on en prend la médiane. */
const RUNS = 20;
/** Séries au plus : la première dont la médiane tient dans le budget suffit (voir plus bas). */
const MAX_SERIES = 3;

/** Un tracé : tailles et options varient, comme dans l'usage ; chaque appel est un tracé neuf. */
function draftNumber(index: number): void {
  const size = VALIDATION_SIZES[
    index % VALIDATION_SIZES.length
  ] as (typeof VALIDATION_SIZES)[number];
  const options = BASE_OPTION_SETS[index % BASE_OPTION_SETS.length] ?? {};
  draftModel(sizeRequest(size, options));
}

/**
 * Temps de processeur du fil courant (Node 22.19 et suivants), à défaut du processus entier. Le fil seul : les fils
 * auxiliaires de V8 (compilation, ramasse-miettes) travaillent en parallèle et gonflent le temps du processus sans
 * allonger le tracé.
 */
const cpuUsage = (previous?: NodeJS.CpuUsage): NodeJS.CpuUsage =>
  typeof process.threadCpuUsage === 'function'
    ? process.threadCpuUsage(previous)
    : process.cpuUsage(previous);

/** Temps d'un tracé en millisecondes : de processeur, et mural (pour le message d'échec). */
function measure(index: number): { cpuMs: number; wallMs: number } {
  const cpuBefore = cpuUsage();
  const wallBefore = performance.now();
  draftNumber(index);
  const wallMs = performance.now() - wallBefore;
  const cpu = cpuUsage(cpuBefore);
  return { cpuMs: (cpu.user + cpu.system) / 1000, wallMs };
}

const median = (values: number[]): number =>
  [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)] as number;

describe('budget de temps', () => {
  // Le test mesure le temps de processeur : le tracé est un calcul synchrone sur un seul fil, dont le temps mural
  // double ou triple quand la machine fait autre chose (`pnpm check` lance les projets en parallèle) sans que le calcul
  // change. Mesuré sur quatre cœurs partagés, médianes de 20 tracés : temps mural 5 à 9 ms au repos et jusqu'à 24 ms
  // avec quatre boucles actives ; temps du processus entier 5 à 11 ms ; temps du fil 4 à 6,5 ms au repos et jusqu'à
  // 8,7 ms sous charge. Une médiane gonflée par une pointe de charge ne doit pas faire échouer : jusqu'à trois séries,
  // et la meilleure compte. Un tracé vraiment plus lent que le budget le serait dans toutes.
  it(`trace Brian en moins de ${BUDGET_MS} ms à chaud (médiane de ${RUNS} tracés après ${WARM_UP} d’échauffement)`, () => {
    for (let i = 0; i < WARM_UP; i++) draftNumber(i);
    const series: { cpuMs: number; wallMs: number }[] = [];
    for (let s = 0; s < MAX_SERIES; s++) {
      const runs = Array.from({ length: RUNS }, (_, i) => measure(WARM_UP + s * RUNS + i));
      series.push({
        cpuMs: median(runs.map((r) => r.cpuMs)),
        wallMs: median(runs.map((r) => r.wallMs)),
      });
      if ((series.at(-1)?.cpuMs ?? Infinity) < BUDGET_MS) break;
    }
    const details = series
      .map((s) => `processeur ${s.cpuMs.toFixed(2)} ms (mur ${s.wallMs.toFixed(2)} ms)`)
      .join(' ; ');
    expect(Math.min(...series.map((s) => s.cpuMs)), details).toBeLessThan(BUDGET_MS);
  });
});
