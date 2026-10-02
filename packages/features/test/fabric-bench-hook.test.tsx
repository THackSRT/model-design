import { FABRIC_PRESETS } from '@atelier/drape';
import { act } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { CusickRun, CusickRunner } from '../src/fabric-bench/cusick-runner.js';
import { cusickRun, heavyWeighing, poplinDraft } from './fabric-bench-fixtures.js';
import { POPLIN, runnerOf, setup } from './fabric-bench-harness.js';

describe('banc d’essai des tissus : état initial', () => {
  it('sept préréglages à reprendre, rien de touché', () => {
    const { result } = setup();
    const { presets, dirty, canExport, importStatus, selected } = result.current.state;
    expect(presets.map((p) => p.preset)).toEqual(Object.keys(FABRIC_PRESETS));
    expect(presets).toHaveLength(7);
    expect(presets.every((p) => p.verdict === 'to-review' && !p.touched)).toBe(true);
    expect(presets[0]?.estimated).toEqual(FABRIC_PRESETS['cotton-poplin']);
    expect(selected).toBe(POPLIN);
    expect([dirty, canExport, importStatus]).toEqual([false, false, 'idle']);
    expect(result.current.state.createdAt).toBe('2026-10-02T10:00:00.000Z');
  });

  it('l’essai de drapé n’est pas disponible sans exécuteur', async () => {
    const { result, poplin } = setup();
    expect(result.current.state.drapeTestAvailable).toBe(false);
    await act(() => result.current.actions.runDrape(POPLIN, 'estimated'));
    expect(poplin().drapes.estimated.status).toBe('idle');
  });

  it('select change le préréglage affiché', () => {
    const { result } = setup();
    act(() => result.current.actions.select('denim'));
    expect(result.current.state.selected).toBe('denim');
  });
});

describe('saisie des essais', () => {
  it('une saisie partielle n’alimente pas les mesures', () => {
    const { result, poplin } = setup();
    act(() => result.current.actions.setField(POPLIN, 'stretchWarp.stripWidthMm', 50));
    expect(poplin().measurements).toEqual({});
    expect(poplin().derived).toEqual({});
    expect(poplin().errors['stretchWarp.hangingMassG']).toEqual({ code: 'required' });
    expect(poplin().draft['stretchWarp.stripWidthMm']).toBe(50);
  });

  it('une saisie touche la revue : date UTC et modifications non exportées', () => {
    const { result, poplin } = setup();
    act(() => result.current.actions.setField(POPLIN, 'stretchWarp.stripWidthMm', 50));
    expect(poplin().touched).toBe(true);
    expect(poplin().reviewedAt).toBe('2026-10-02T10:00:00.000Z');
    expect(result.current.state.dirty).toBe(true);
  });

  it('des essais complets donnent grandeurs déduites et écarts', () => {
    const { poplin, fill } = setup();
    fill(poplinDraft);
    const p = poplin();
    expect(p.errors).toEqual({});
    expect(p.derived.weightGPerM2).toBeCloseTo(120, 6);
    expect(p.derived.stretchWarpPercent).toBeCloseTo(2.04, 2);
    expect(p.deviations.map((d) => d.property)).toEqual([
      'weightGPerM2',
      'thicknessMm',
      'stretchWarpPercent',
      'bendingRigidityMicroNm',
      'frictionCoefficient',
    ]);
    expect(p.deviations.every((d) => d.withinTolerance)).toBe(true);
    expect(p.candidate.fabric.weightGPerM2).toBeCloseTo(120, 6);
    expect(p.extrapolated).toEqual({ warp: false, weft: false });
  });

  it('signale une extrapolation de l’allongement par sens', () => {
    const { poplin, fill } = setup();
    fill({ ...poplinDraft, 'stretchWarp.hangingMassG': 200 });
    expect(poplin().extrapolated.warp).toBe(true);
  });

  it('une longueur chargée plus courte que la longueur au repos est une erreur', () => {
    const { poplin, fill } = setup();
    fill({ ...poplinDraft, 'stretchWarp.loadedLengthMm': 190 });
    expect(poplin().errors['stretchWarp.loadedLengthMm']).toEqual({ code: 'loaded-shorter' });
    expect(poplin().measurements.stretchWarp).toBeUndefined();
  });

  it('une lecture hors bornes est indexée', () => {
    const { poplin, fill } = setup();
    fill({ 'thickness.readingsMm.0': 0.2, 'thickness.readingsMm.2': 50 });
    expect(poplin().errors['thickness.readingsMm.2']).toEqual({
      code: 'range',
      min: 0.01,
      max: 10,
    });
  });
});

describe('verdict', () => {
  it('propose to-review sans mesure, validated dans la tolérance, corrected au-delà', () => {
    const { poplin, fill } = setup();
    expect(poplin().suggestedVerdict).toBe('to-review');
    fill(poplinDraft);
    expect(poplin().suggestedVerdict).toBe('validated');
    fill(heavyWeighing);
    expect(poplin().suggestedVerdict).toBe('corrected');
    expect(poplin().verdict).toBe('to-review');
  });

  it('setVerdict corrected préremplit avec les valeurs candidates à 3 chiffres', () => {
    const { result, poplin, fill } = setup();
    fill({ ...poplinDraft, ...heavyWeighing, 'weighing.sampleMassG': 2.0123 });
    act(() => result.current.actions.setVerdict(POPLIN, 'corrected'));
    expect(poplin().verdict).toBe('corrected');
    expect(poplin().correctedDraft?.weightGPerM2).toBe(201);
    expect(poplin().corrected).toEqual(poplin().correctedDraft);
    expect(poplin().corrected?.thicknessMm).toBe(0.205);
    expect(result.current.state.canExport).toBe(true);
  });

  it('refuse une valeur corrigée hors bornes et bloque l’export', () => {
    const { result, saver, poplin, fill } = setup();
    fill(poplinDraft);
    act(() => result.current.actions.setVerdict(POPLIN, 'corrected'));
    act(() => result.current.actions.setCorrected(POPLIN, 'weightGPerM2', 9999));
    expect(poplin().correctedErrors.weightGPerM2).toEqual({ code: 'range', min: 20, max: 800 });
    expect(poplin().corrected).toBeUndefined();
    expect(result.current.state.canExport).toBe(false);
    act(() => result.current.actions.exportReport());
    expect(saver.save).not.toHaveBeenCalled();
    act(() => result.current.actions.setCorrected(POPLIN, 'weightGPerM2', 130));
    expect(result.current.state.canExport).toBe(true);
  });

  it('quitter corrected retire les valeurs corrigées', () => {
    const { result, poplin, fill } = setup();
    fill(poplinDraft);
    act(() => result.current.actions.setVerdict(POPLIN, 'corrected'));
    act(() => result.current.actions.setVerdict(POPLIN, 'validated'));
    expect(poplin().correctedDraft).toBeUndefined();
    expect(poplin().corrected).toBeUndefined();
  });

  it('un commentaire de plus de 500 caractères est une erreur qui bloque l’export', () => {
    const { result, poplin } = setup();
    act(() => result.current.actions.setComment(POPLIN, 'x'.repeat(500)));
    expect(poplin().commentError).toBeUndefined();
    expect(result.current.state.canExport).toBe(true);
    act(() => result.current.actions.setComment(POPLIN, 'x'.repeat(501)));
    expect(poplin().commentError).toEqual({ code: 'too-long', max: 500 });
    expect(result.current.state.canExport).toBe(false);
  });
});

describe('essais de drapé simulés', () => {
  it('passe de running à ready, avec le tissu estimé puis le tissu candidat', async () => {
    const run = vi.fn<CusickRunner['run']>(async () => cusickRun(0.42));
    const { result, poplin, fill } = setup(runnerOf(run));
    expect(result.current.state.drapeTestAvailable).toBe(true);
    fill(heavyWeighing);
    let pending!: Promise<void>;
    act(() => {
      pending = result.current.actions.runDrape(POPLIN, 'candidate');
    });
    expect(poplin().drapes.candidate.status).toBe('running');
    await act(() => pending);
    expect(poplin().drapes.candidate.status).toBe('ready');
    expect(poplin().drapes.candidate.run?.drapeCoefficient).toBe(0.42);
    expect(run).toHaveBeenLastCalledWith(poplin().candidate.fabric);
    await act(() => result.current.actions.runDrape(POPLIN, 'estimated'));
    expect(run).toHaveBeenLastCalledWith(FABRIC_PRESETS[POPLIN]);
  });

  it('ignore un résultat qui arrive après une modification des valeurs simulées', async () => {
    let resolve!: (r: CusickRun) => void;
    const run = vi.fn(() => new Promise<CusickRun>((r) => (resolve = r)));
    const { result, poplin, fill } = setup(runnerOf(run));
    let pending!: Promise<void>;
    act(() => {
      pending = result.current.actions.runDrape(POPLIN, 'candidate');
    });
    fill(heavyWeighing);
    expect(poplin().drapes.candidate.status).toBe('idle');
    resolve(cusickRun());
    await act(() => pending);
    expect(poplin().drapes.candidate).toEqual({ status: 'idle' });
  });

  it('un échec du runner donne failed', async () => {
    const { result, poplin } = setup(runnerOf(async () => Promise.reject(new Error('boum'))));
    await act(() => result.current.actions.runDrape(POPLIN, 'estimated'));
    expect(poplin().drapes.estimated.status).toBe('failed');
    expect(result.current.state.dirty).toBe(false);
  });

  it('compare le coefficient de drapé mesuré à chaque essai prêt', async () => {
    const { result, poplin, fill } = setup(runnerOf(async () => cusickRun(0.5)));
    fill({ 'drape.drapeCoefficient': 0.7 });
    expect(poplin().drapeComparisons).toEqual({ estimated: undefined, candidate: undefined });
    await act(() => result.current.actions.runDrape(POPLIN, 'estimated'));
    expect(poplin().drapeComparisons.estimated).toEqual({
      measured: 0.7,
      simulated: 0.5,
      withinTolerance: false,
    });
    expect(poplin().drapeComparisons.candidate).toBeUndefined();
    await act(() => result.current.actions.runDrape(POPLIN, 'candidate'));
    expect(poplin().drapeComparisons.candidate?.simulated).toBe(0.5);
    expect(poplin().suggestedVerdict).toBe('corrected');
  });

  it('candidateSource dit d’où vient le tissu de l’essai candidat', () => {
    const { result, poplin, fill } = setup();
    expect(poplin().candidateSource).toBe('candidate');
    fill(poplinDraft);
    act(() => result.current.actions.setVerdict(POPLIN, 'corrected'));
    expect(poplin().candidateSource).toBe('corrected');
    act(() => result.current.actions.setCorrected(POPLIN, 'weightGPerM2', 9999));
    expect(poplin().candidateSource).toBe('candidate');
  });
});
