import { EXPORT_FORMATS, type CutPiecesActions, type CutPiecesState } from '@atelier/features';
import { Button, Message, Panel } from '@atelier/ui-web';
import { problemMessage, t } from '../../i18n/t.js';

export interface CutPiecesPanelProps {
  state: CutPiecesState;
  actions: CutPiecesActions;
}

/** Dessinée depuis le JSON des pièces (jamais depuis le SVG exporté, qui n'entre pas dans la page). */
function CutPiecesDrawing({ layout }: { layout: NonNullable<CutPiecesState['layout']> }) {
  return (
    <svg
      className="studio-cut"
      viewBox={layout.viewBox}
      role="img"
      aria-label={t('cutPieces.title')}
    >
      {layout.pieces.map((piece) => (
        <g key={piece.id}>
          <path className="studio-cut-line" d={piece.cutPath} />
          <path className="studio-seam-line" d={piece.seamPath} />
          <path className="studio-notch" d={piece.notchesPath} />
          <path className="studio-grain" d={piece.grainPath} />
          {piece.foldPath && <path className="studio-fold" d={piece.foldPath} />}
          <text x={piece.labelAt[0]} y={piece.labelAt[1]} textAnchor="middle">
            {t('cutPieces.label', { name: piece.label.name, quantity: piece.label.quantity })}
            {piece.label.cutOnFold && (
              <tspan x={piece.labelAt[0]} dy="1.2em">
                {t('cutPieces.onFold')}
              </tspan>
            )}
          </text>
        </g>
      ))}
    </svg>
  );
}

function Downloads({ state, actions }: CutPiecesPanelProps) {
  const working = EXPORT_FORMATS.some((format) => state.exports[format].status === 'working');
  const failed = EXPORT_FORMATS.map((format) => state.exports[format].problem).find(Boolean);
  return (
    <div role="group" aria-label={t('export.title')} className="studio-toggle">
      {EXPORT_FORMATS.map((format) => (
        <Button
          key={format}
          disabled={state.exports[format].status === 'working'}
          onClick={() => actions.download(format)}
        >
          {t(`export.${format}`)}
        </Button>
      ))}
      {working && <Message>{t('export.working')}</Message>}
      {failed && <Message tone="danger">{problemMessage(failed.type)}</Message>}
    </div>
  );
}

/** Pièces de coupe de la version calculée et téléchargements (SVG 1:1, PDF A4, DXF-AAMA). */
export function CutPiecesPanel(props: CutPiecesPanelProps) {
  const { state } = props;
  if (state.status === 'idle') return null;
  return (
    <Panel title={t('cutPieces.title')}>
      {state.status === 'working' && <Message>{t('cutPieces.working')}</Message>}
      {state.status === 'failed' && state.problem && (
        <Message tone="danger">{problemMessage(state.problem.type)}</Message>
      )}
      {state.layout && state.status === 'ready' && (
        <>
          <p>{t('cutPieces.count', { count: state.layout.pieces.length })}</p>
          <CutPiecesDrawing layout={state.layout} />
          <Downloads {...props} />
        </>
      )}
    </Panel>
  );
}
