import { FABRIC_BOUNDS, type PresetBenchState } from '@atelier/features';
import { Message, Panel } from '@atelier/ui-web';
import { propertyName, propertyUnit, quantity, toleranceLabel, tBench } from '../../i18n/bench.js';

type Property = keyof PresetBenchState['estimated'];

const status = (within: boolean) =>
  tBench(within ? 'fabricBench.status.within' : 'fabricBench.status.outside');

function Row({ preset, property }: { preset: PresetBenchState; property: Property }) {
  const deviation = preset.deviations.find((d) => d.property === property);
  const { minimum, maximum } = FABRIC_BOUNDS[property];
  return (
    <tr data-within={deviation ? deviation.withinTolerance : undefined}>
      <th scope="row">{propertyName(property)}</th>
      <td>{quantity(property, preset.estimated[property])}</td>
      <td>{deviation ? quantity(property, deviation.measured) : tBench('fabricBench.none')}</td>
      <td>
        {deviation
          ? tBench('fabricBench.deviation', { value: deviation.relativeDeviation })
          : tBench('fabricBench.none')}
      </td>
      <td>{toleranceLabel(property)}</td>
      <td>{deviation ? status(deviation.withinTolerance) : tBench('fabricBench.none')}</td>
      <td>
        {tBench('fabricBench.bounds', {
          min: minimum,
          max: maximum,
          unit: propertyUnit(property),
        }).trim()}
      </td>
    </tr>
  );
}

function Notices({ preset }: { preset: PresetBenchState }) {
  const { extrapolated, candidate, derived } = preset;
  const drapeComparison = preset.drapeComparisons.estimated;
  return (
    <>
      {extrapolated.warp && <Message>{tBench('fabricBench.extrapolated.warp')}</Message>}
      {extrapolated.weft && <Message>{tBench('fabricBench.extrapolated.weft')}</Message>}
      {derived.bendingWeightSource === 'estimated' && (
        <Message>{tBench('fabricBench.bendingWeightEstimated')}</Message>
      )}
      {candidate.outOfBounds.map((property) => (
        <Message key={property}>
          {tBench('fabricBench.outOfBounds', { property: propertyName(property) })}
        </Message>
      ))}
      {drapeComparison && (
        <Message>
          {tBench('fabricBench.drapeComparison', {
            measured: drapeComparison.measured,
            simulated: drapeComparison.simulated,
            status: status(drapeComparison.withinTolerance),
          })}
        </Message>
      )}
    </>
  );
}

/** Estimée, mesurée, écart, conformité et bornes du contrat de chaque grandeur du préréglage choisi. */
export function ComparisonPanel({ preset }: { preset: PresetBenchState }) {
  const properties = Object.keys(preset.estimated) as Property[];
  return (
    <Panel title={tBench('fabricBench.comparison.title')}>
      {preset.deviations.length === 0 && <p>{tBench('fabricBench.comparison.empty')}</p>}
      <table className="bench-table">
        <thead>
          <tr>
            <th scope="col">{tBench('fabricBench.col.property')}</th>
            <th scope="col">{tBench('fabricBench.col.estimated')}</th>
            <th scope="col">{tBench('fabricBench.col.measured')}</th>
            <th scope="col">{tBench('fabricBench.col.deviation')}</th>
            <th scope="col">{tBench('fabricBench.col.tolerance')}</th>
            <th scope="col">{tBench('fabricBench.col.status')}</th>
            <th scope="col">{tBench('fabricBench.col.bounds')}</th>
          </tr>
        </thead>
        <tbody>
          {properties.map((property) => (
            <Row key={property} preset={preset} property={property} />
          ))}
        </tbody>
      </table>
      <Notices preset={preset} />
    </Panel>
  );
}
