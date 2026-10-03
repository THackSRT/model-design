import { ColorGarment, ColorGarmentTight, ColorMannequin } from '@atelier/design-tokens';
import { Button, Message, Panel } from '@atelier/ui-web';
import { MannequinOutline, type SilhouetteView } from '@atelier/viewer3d/outline';
import { Suspense, useMemo } from 'react';
import { t } from '../../i18n/t.js';
import { LazyDrapedView, LazyMannequinView } from './lazy-mannequin-view.js';
import type { PatternStudioViewProps } from './view.js';

/** Vêtement drapé à montrer à la place de l'habillage géométrique, sur le même corps (même pose des bras). */
export interface DrapedProps {
  model: ArrayBuffer;
}

const OUTLINE_VIEWS: readonly SilhouetteView[] = ['front', 'side', 'back'];
const DISPLAYS = ['3d', 'outline'] as const;

function DisplayToggle({ state, actions }: PatternStudioViewProps) {
  return (
    <div role="group" aria-label={t('mannequin.display')} className="studio-toggle">
      {DISPLAYS.map((display) => (
        <Button
          key={display}
          emphasis={state.display === display ? 'high' : 'normal'}
          aria-pressed={state.display === display}
          onClick={() => actions.setDisplay(display)}
        >
          {t(`mannequin.display.${display}`)}
        </Button>
      ))}
      {state.dressing.garment && (
        <Button
          aria-pressed={state.showGarment}
          emphasis={state.showGarment ? 'high' : 'normal'}
          onClick={() => actions.setShowGarment(!state.showGarment)}
        >
          {t('garment.show')}
        </Button>
      )}
    </div>
  );
}

function DrapedBodyView({ model, state }: DrapedProps & Pick<PatternStudioViewProps, 'state'>) {
  const { mannequin, mannequinStatus } = state;
  const meshes = useMemo(() => (mannequin ? [mannequin.body] : []), [mannequin]);
  if (mannequinStatus === 'failed') return <Message tone="danger">{t('drape.bodyFailed')}</Message>;
  if (meshes.length === 0) return <Message>{t('drape.bodyFitting')}</Message>;
  return (
    <Suspense fallback={<Message>{t('mannequin.loading3d')}</Message>}>
      <LazyDrapedView model={model} meshes={meshes} />
    </Suspense>
  );
}

function MannequinBody({
  state,
  draped,
}: Pick<PatternStudioViewProps, 'state'> & { draped?: DrapedProps }) {
  const meshes = useMemo(() => (state.mannequin ? [state.mannequin.body] : []), [state.mannequin]);
  const worn = state.showGarment ? state.dressing.garment : undefined;
  const layer = useMemo(
    () =>
      worn
        ? {
            mesh: worn,
            color: ColorGarment,
            tightColor: ColorGarmentTight,
            tightZones: worn.tightZones,
          }
        : undefined,
    [worn],
  );
  const labels = {
    front: t('mannequin.view.front'),
    side: t('mannequin.view.side'),
    back: t('mannequin.view.back'),
  };
  const body = meshes[0];
  if (draped && state.display === '3d') return <DrapedBodyView {...draped} state={state} />;
  if (!body) return null;
  return state.display === 'outline' ? (
    <MannequinOutline mesh={body} garment={worn} views={OUTLINE_VIEWS} labels={labels} />
  ) : (
    <Suspense fallback={<Message>{t('mannequin.loading3d')}</Message>}>
      <LazyMannequinView
        meshes={meshes}
        garment={layer}
        color={ColorMannequin}
        label={t('mannequin.label')}
        webglUnavailableLabel={t('mannequin.webglUnavailable')}
      />
    </Suspense>
  );
}

/** Zones où le vêtement est trop juste : seuls l'écart et les hauteurs sont montrés (mm). */
function TightZones({ state }: Pick<PatternStudioViewProps, 'state'>) {
  const zones = state.dressing.garment?.tightZones ?? [];
  if (zones.length === 0) return null;
  return (
    <ul className="studio-tight-zones">
      {zones.map((zone) => (
        <li key={`${zone.fromMm}-${zone.toMm}`}>
          {t('garment.tightZone', {
            shortfallMm: zone.shortfallMm,
            fromMm: zone.fromMm,
            toMm: zone.toMm,
          })}
        </li>
      ))}
    </ul>
  );
}

export function MannequinPanel(props: PatternStudioViewProps) {
  const { state } = props;
  return (
    <Panel title={t('mannequin.title')}>
      <DisplayToggle {...props} />
      {state.mannequinStatus === 'fitting' && <Message>{t('mannequin.fitting')}</Message>}
      {state.mannequinStatus === 'failed' && (
        <Message tone="danger">{t('mannequin.failed')}</Message>
      )}
      {state.dressing.status === 'working' && <Message>{t('garment.dressing')}</Message>}
      {state.dressing.status === 'failed' && (
        <Message tone="danger">{t('garment.dressingFailed')}</Message>
      )}
      {!(props.draped && state.display === '3d') && <TightZones state={state} />}
      <div className="studio-viewer">
        <MannequinBody state={state} draped={props.draped} />
      </div>
    </Panel>
  );
}
