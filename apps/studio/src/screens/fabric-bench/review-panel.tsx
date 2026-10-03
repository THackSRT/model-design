import {
  COMMENT_MAX_LENGTH,
  type PresetBenchState,
  type Verdict,
  VERDICTS,
} from '@atelier/features';
import { ChoiceGroup, Message, NumberField, Panel, TextArea } from '@atelier/ui-web';
import {
  benchErrorMessage,
  propertyName,
  propertyUnit,
  verdictLabel,
  tBench,
} from '../../i18n/bench.js';

type Property = keyof PresetBenchState['estimated'];

export interface ReviewPanelProps {
  preset: PresetBenchState;
  onVerdict: (verdict: Verdict) => void;
  onCorrected: (property: Property, value: number | undefined) => void;
  onComment: (comment: string) => void;
}

const verdictOptions = () =>
  VERDICTS.map((verdict) => ({ value: verdict, label: verdictLabel(verdict) }));
const isVerdict = (value: string): value is Verdict =>
  (VERDICTS as readonly string[]).includes(value);

function CorrectedFields({ preset, onCorrected }: ReviewPanelProps) {
  const properties = Object.keys(preset.estimated) as Property[];
  return (
    <fieldset className="bench-corrected">
      <legend>{tBench('fabricBench.review.corrected')}</legend>
      {properties.map((property) => {
        const error = preset.correctedErrors[property];
        return (
          <NumberField
            key={property}
            label={propertyName(property)}
            unit={propertyUnit(property)}
            step={0.01}
            value={preset.correctedDraft?.[property]}
            error={error && benchErrorMessage(error, propertyUnit(property))}
            onChange={(value) => onCorrected(property, value)}
          />
        );
      })}
    </fieldset>
  );
}

/** Le commentaire est un texte libre : affiché dans un champ, jamais interprété comme du HTML. */
function CommentField({ preset, onComment }: ReviewPanelProps) {
  const count = [...preset.comment].length; // en points de code, comme le contrat
  return (
    <>
      <TextArea
        label={tBench('fabricBench.comment.label')}
        value={preset.comment}
        counter={tBench('fabricBench.comment.counter', { count, max: COMMENT_MAX_LENGTH })}
        error={
          preset.commentError &&
          tBench('fabricBench.comment.tooLong', { max: preset.commentError.max })
        }
        onChange={onComment}
      />
      <p className="bench-tip">{tBench('fabricBench.comment.reminder')}</p>
    </>
  );
}

/** Verdict proposé, verdict rendu, valeurs corrigées et commentaire du préréglage choisi. */
export function ReviewPanel(props: ReviewPanelProps) {
  const { preset, onVerdict } = props;
  return (
    <Panel title={tBench('fabricBench.review.title')}>
      <Message>
        {tBench('fabricBench.review.suggested', { verdict: verdictLabel(preset.suggestedVerdict) })}
      </Message>
      <ChoiceGroup
        legend={tBench('fabricBench.review.verdict')}
        options={verdictOptions()}
        value={preset.verdict}
        onChange={(value) => isVerdict(value) && onVerdict(value)}
      />
      {preset.verdict === 'corrected' && <CorrectedFields {...props} />}
      <CommentField {...props} />
    </Panel>
  );
}
