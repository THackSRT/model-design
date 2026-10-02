import { ENGINE_VERSION } from '@atelier/drape';
import { act } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { BenchDraft } from '../src/fabric-bench/measurement-draft.js';
import { checkSchema } from '../src/fabric-bench/schema-check.js';
import { cusickRun, poplinDraft } from './fabric-bench-fixtures.js';
import { lastSaved, POPLIN, runnerOf, setup } from './fabric-bench-harness.js';

describe('export et import du rapport', () => {
  async function exported(extra: BenchDraft = {}) {
    const ctx = setup(runnerOf(async () => cusickRun(0.5)));
    ctx.fill({ ...poplinDraft, ...extra });
    act(() => ctx.result.current.actions.setComment(POPLIN, 'tissu de test'));
    act(() => ctx.result.current.actions.setVerdict(POPLIN, 'validated'));
    await act(() => ctx.result.current.actions.runDrape(POPLIN, 'estimated'));
    act(() => ctx.result.current.actions.exportReport());
    return { ...ctx, ...(await lastSaved(ctx.saver)) };
  }

  it('enregistre un JSON conforme au contrat, nommé par la date', async () => {
    const { result, blob, name, text } = await exported();
    expect(name).toBe('rapport-tissus-2026-10-02.json');
    expect(blob.type).toBe('application/json');
    const report = JSON.parse(text) as { engineVersion: string; reviews: { preset: string }[] };
    expect(checkSchema(report, 'fabricValidationReport')).toBeUndefined();
    expect(report.engineVersion).toBe(ENGINE_VERSION);
    expect(report.reviews.map((r) => r.preset)).toEqual([POPLIN]);
    expect(result.current.state.dirty).toBe(false);
  });

  it('n’exporte rien tant qu’aucune revue n’est touchée', () => {
    const { result, saver } = setup();
    act(() => result.current.actions.exportReport());
    expect(saver.save).not.toHaveBeenCalled();
  });

  it('réimporter un rapport redonne le même état et le même rapport', async () => {
    const first = await exported();
    const second = setup(runnerOf(async () => cusickRun(0.5)));
    act(() => second.result.current.actions.importReport(first.text));
    expect(second.result.current.state.importStatus).toBe('imported');
    expect(second.result.current.state.importNotices).toEqual([]);
    expect(second.result.current.state.dirty).toBe(false);
    expect(second.result.current.state.presets).toEqual(first.result.current.state.presets);
    act(() => second.result.current.actions.exportReport());
    expect((await lastSaved(second.saver)).text).toBe(first.text);
  });

  it('un rapport d’une autre version du moteur : avis, essais simulés écartés', async () => {
    const first = await exported();
    const report = JSON.parse(first.text) as { engineVersion: string };
    report.engineVersion = '0.0.1';
    const { result, poplin } = setup();
    act(() => result.current.actions.importReport(JSON.stringify(report)));
    expect(result.current.state.importNotices).toEqual([
      { code: 'simulations-dropped', engineVersion: '0.0.1' },
    ]);
    expect(poplin().drapes.estimated).toEqual({ status: 'idle' });
    expect(poplin().verdict).toBe('validated');
  });

  it('sans simulation, une autre version du moteur n’émet aucun avis', async () => {
    const { result, saver, fill } = setup();
    fill(poplinDraft);
    act(() => result.current.actions.exportReport());
    const report = JSON.parse((await lastSaved(saver)).text) as { engineVersion: string };
    report.engineVersion = '0.0.1';
    act(() => result.current.actions.importReport(JSON.stringify(report)));
    expect(result.current.state.importStatus).toBe('imported');
    expect(result.current.state.importNotices).toEqual([]);
  });

  it('une estimation qui a changé repasse la revue à to-review, mesures et commentaire gardés', async () => {
    const first = await exported();
    const report = JSON.parse(first.text) as { reviews: { estimated: { weightGPerM2: number } }[] };
    const [review] = report.reviews;
    if (review) review.estimated.weightGPerM2 += 10;
    const { result, poplin } = setup();
    act(() => result.current.actions.importReport(JSON.stringify(report)));
    expect(result.current.state.importNotices).toEqual([
      { code: 'estimate-changed', preset: POPLIN },
    ]);
    expect(poplin().verdict).toBe('to-review');
    expect(poplin().comment).toBe('tissu de test');
    expect(poplin().measurements.weighing).toBeDefined();
    // L'essai simulé porte sur le tissu du préréglage courant (celui du moteur) : il reste valable.
    expect(poplin().drapes.estimated.status).toBe('ready');
  });

  it('un rapport invalide laisse l’état intact', async () => {
    const { result, fill } = setup();
    fill(poplinDraft);
    const before = result.current.state.presets;
    act(() => result.current.actions.importReport('pas du JSON'));
    expect(result.current.state.importStatus).toBe('failed');
    expect(result.current.state.importError).toEqual({ code: 'not-json' });
    expect(result.current.state.presets).toBe(before);
    expect(result.current.state.dirty).toBe(true);
  });

  it('recalcule derived depuis les mesures brutes à l’import', async () => {
    const first = await exported();
    const report = JSON.parse(first.text) as { reviews: { derived: { weightGPerM2: number } }[] };
    const [review] = report.reviews;
    if (review) review.derived.weightGPerM2 = 999;
    const { result, poplin } = setup();
    act(() => result.current.actions.importReport(JSON.stringify(report)));
    expect(result.current.state.importStatus).toBe('imported');
    expect(poplin().derived.weightGPerM2).toBeCloseTo(120, 6);
  });
});
