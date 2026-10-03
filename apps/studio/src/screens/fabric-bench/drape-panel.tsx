import {
  CUSICK_DISC_DIAMETER_MM,
  CUSICK_SPECIMEN_DIAMETER_MM,
  DRAPE_COEFFICIENT_TOLERANCE,
} from '@atelier/drape';
import type { DrapeComparison, DrapeTest, DrapeWhich, PresetBenchState } from '@atelier/features';
import { Button, Message, Panel } from '@atelier/ui-web';
import { useId } from 'react';
import { tBench } from '../../i18n/bench.js';
import { DISC_RADIUS_MM, outlinePoints, SPECIMEN_RADIUS_MM, VIEW_BOX } from './drape-shape.js';

const DIMENSIONS = { disc: CUSICK_DISC_DIAMETER_MM, specimen: CUSICK_SPECIMEN_DIAMETER_MM };

/** Vue de dessus : disque de support, éprouvette à plat en pointillés, ombre du tissu drapé. */
function TopView({ points, label }: { points: string; label: string }) {
  const id = useId();
  return (
    <svg
      className="bench-drape-view"
      viewBox={VIEW_BOX}
      role="img"
      aria-labelledby={`${id}-t ${id}-d`}
    >
      <title id={`${id}-t`}>{tBench('fabricBench.drape.shadowTitle', { test: label })}</title>
      <desc id={`${id}-d`}>{tBench('fabricBench.drape.shadowDesc', DIMENSIONS)}</desc>
      <circle className="bench-drape-specimen" r={SPECIMEN_RADIUS_MM} />
      {points && <polygon className="bench-drape-shadow" points={points} />}
      <circle className="bench-drape-disc" r={DISC_RADIUS_MM} />
    </svg>
  );
}

interface ResultProps {
  test: DrapeTest;
  label: string;
  comparison?: DrapeComparison | undefined;
}

function Result({ test, label, comparison }: ResultProps) {
  const run = test.run;
  if (test.status !== 'ready' || !run) return null;
  const points = outlinePoints(run.outlineMm);
  return (
    <>
      <TopView points={points} label={label} />
      {!points && <Message>{tBench('fabricBench.drape.noOutline')}</Message>}
      <p className="bench-drape-coefficient">
        {tBench('fabricBench.drape.coefficient', { value: run.drapeCoefficient })}
      </p>
      {!run.converged && <Message>{tBench('fabricBench.drape.notConverged')}</Message>}
      {comparison && (
        <Message>
          {tBench('fabricBench.drape.measured', {
            measured: comparison.measured,
            tolerance: DRAPE_COEFFICIENT_TOLERANCE,
            status: tBench(
              comparison.withinTolerance
                ? 'fabricBench.status.within'
                : 'fabricBench.status.outside',
            ),
          })}
        </Message>
      )}
    </>
  );
}

interface TestProps {
  which: DrapeWhich;
  preset: PresetBenchState;
  onRun: (which: DrapeWhich) => void;
}

function Test({ which, preset, onRun }: TestProps) {
  const test = preset.drapes[which];
  const label = tBench(
    which === 'candidate' && preset.candidateSource === 'corrected'
      ? 'fabricBench.drape.test.corrected'
      : `fabricBench.drape.test.${which}`,
  );
  const running = test.status === 'running';
  return (
    <figure className="bench-drape-test" data-status={test.status}>
      <figcaption>{label}</figcaption>
      {test.status === 'idle' && <p className="bench-tip">{tBench('fabricBench.drape.idle')}</p>}
      {running && <Message>{tBench('fabricBench.drape.running')}</Message>}
      {test.status === 'failed' && (
        <Message tone="danger">{tBench('fabricBench.drape.failed')}</Message>
      )}
      <Result test={test} label={label} comparison={preset.drapeComparisons[which]} />
      <Button disabled={running} onClick={() => onRun(which)}>
        {tBench(test.status === 'ready' ? 'fabricBench.drape.rerun' : 'fabricBench.drape.run')}
      </Button>
    </figure>
  );
}

/** Essai de drapé de Cusick simulé : valeurs estimées et valeurs candidates côte à côte, avec leur coefficient. */
export function DrapePanel({ preset, onRun }: Omit<TestProps, 'which'>) {
  return (
    <Panel title={tBench('fabricBench.drape.title')}>
      <p className="bench-tip">{tBench('fabricBench.drape.intro', DIMENSIONS)}</p>
      <div className="bench-drape">
        <Test which="estimated" preset={preset} onRun={onRun} />
        <Test which="candidate" preset={preset} onRun={onRun} />
      </div>
    </Panel>
  );
}
