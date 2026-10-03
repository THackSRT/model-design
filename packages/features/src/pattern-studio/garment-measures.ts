import { defaultLengthMm, type LengthKind } from './garment-defaults.js';
import {
  DRAFTED_GARMENT_TYPES,
  garmentFields,
  sleeveFields,
  type DraftedGarmentType,
  type GarmentField,
  type ParamValues,
} from './garment-fields.js';
import type { FieldError, FieldErrors, MeasurementKey, StudioForm } from './form.js';

/**
 * Mesures finies du vêtement (cm) : ce que le tailleur lit sur le vêtement terminé. Le contrat, lui, attend des
 * aisances ; `paramsByType` et `sleeveCm` gardent les aisances et longueurs envoyées, et ces fonctions les
 * déduisent des mesures finies (aisance = mesure finie - mesure du corps).
 */
export type FinishedKey =
  'waistGirthMm' | 'hipGirthMm' | 'bustGirthMm' | 'lengthMm' | 'sleeveLengthMm';

/** `auto` : proposée depuis le corps ; `manual` : saisie, jamais écrasée par un recalcul. */
export interface FieldState {
  value: number | undefined;
  source: 'auto' | 'manual';
}
export type FinishedStates = Partial<Record<FinishedKey, FieldState>>;
export type FinishedByType = Partial<Record<DraftedGarmentType, FinishedStates>>;

interface GirthDef {
  key: FinishedKey;
  kind: 'girth';
  body: MeasurementKey;
  easeParam: string;
}
interface LengthDef {
  key: FinishedKey;
  kind: 'length';
  lengthKind: LengthKind;
  sleeve: boolean;
}
type Def = GirthDef | LengthDef;

const girth = (key: FinishedKey, easeParam: string): GirthDef => ({
  key,
  kind: 'girth',
  body: key as MeasurementKey,
  easeParam,
});
const length = (lengthKind: LengthKind, sleeve = false): LengthDef => ({
  key: sleeve ? 'sleeveLengthMm' : 'lengthMm',
  kind: 'length',
  lengthKind,
  sleeve,
});
const waist = girth('waistGirthMm', 'waistEaseMm');

const DEFS: Record<DraftedGarmentType, Def[]> = {
  'straight-skirt': [waist, girth('hipGirthMm', 'hipEaseMm'), length('skirt')],
  'circle-skirt': [waist, length('skirt')],
  trousers: [waist, girth('hipGirthMm', 'hipEaseMm'), length('trousers')],
  bodice: [girth('bustGirthMm', 'bustEaseMm'), waist, length('sleeve', true)],
};

/** Mesures finies du type, dans l'ordre d'affichage ; la manche seulement si elle est demandée. */
export function finishedKeys(type: DraftedGarmentType, withSleeve: boolean): FinishedKey[] {
  return DEFS[type].filter((d) => withSleeve || d.key !== 'sleeveLengthMm').map((d) => d.key);
}

const toMm = (cm: number) => Math.round(cm * 10);
const toCm = (mm: number) => mm / 10;
const bodyMm = (form: StudioForm, key: MeasurementKey) => {
  const cm = form.measurementsCm[key];
  return cm === undefined ? undefined : toMm(cm);
};
const typeOf = (form: StudioForm) => form.garmentType as DraftedGarmentType;
const isSleeve = (def: Def) => def.kind === 'length' && def.sleeve;
const paramOf = (def: Def) => (def.kind === 'girth' ? def.easeParam : 'lengthMm');

function fieldOf(def: Def, type: DraftedGarmentType, param: string): GarmentField | undefined {
  const fields = isSleeve(def) ? sleeveFields() : garmentFields(type);
  return fields.find((f) => f.param === param);
}

/** Valeur proposée (cm) depuis le corps : corps + aisance par défaut du contrat, ou longueur estimée et bornée. */
function autoValue(form: StudioForm, type: DraftedGarmentType, def: Def): number | undefined {
  if (def.kind === 'girth') {
    const body = bodyMm(form, def.body);
    const ease = fieldOf(def, type, def.easeParam)?.default;
    return body === undefined || ease === undefined ? undefined : toCm(body + ease);
  }
  const mm = defaultLengthMm(def.lengthKind, {
    statureMm: bodyMm(form, 'statureMm'),
    waistHeightMm: bodyMm(form, 'waistHeightMm'),
    armLengthMm: bodyMm(form, 'armLengthMm'),
  });
  const bounds = fieldOf(def, type, 'lengthMm');
  if (mm === undefined || !bounds) return undefined;
  return toCm(Math.min(bounds.maximum, Math.max(bounds.minimum, mm)));
}

function setInput(form: StudioForm, type: DraftedGarmentType, def: Def, input: number | undefined) {
  if (isSleeve(def)) return { ...form, sleeveCm: { ...form.sleeveCm, lengthMm: input } };
  const params = { ...form.paramsByType[type], [paramOf(def)]: input };
  return { ...form, paramsByType: { ...form.paramsByType, [type]: params } };
}

/** Écrit la valeur finie dans la saisie envoyée : longueur telle quelle, aisance = fini - corps. */
function writeThrough(form: StudioForm, type: DraftedGarmentType, def: Def, state: FieldState) {
  const { value } = state;
  if (value === undefined && state.source === 'auto') return form;
  if (def.kind === 'length') return setInput(form, type, def, value);
  const body = bodyMm(form, def.body);
  if (body === undefined) return form; // sans corps, l'aisance enregistrée reste telle quelle
  return setInput(form, type, def, value === undefined ? undefined : toCm(toMm(value) - body));
}

const autoState = (): FieldState => ({ value: undefined, source: 'auto' });

/** Tous les champs à `auto` : l'état de départ, avant `syncFinished`. */
export function initialFinished(): FinishedByType {
  return Object.fromEntries(
    DRAFTED_GARMENT_TYPES.map((type) => [
      type,
      Object.fromEntries(DEFS[type].map((d) => [d.key, autoState()])),
    ]),
  );
}

function syncType(form: StudioForm, type: DraftedGarmentType): StudioForm {
  let next = form;
  const states: FinishedStates = { ...form.finished[type] };
  for (const def of DEFS[type]) {
    const current = states[def.key] ?? autoState();
    const state: FieldState =
      current.source === 'auto' ? { value: autoValue(form, type, def), source: 'auto' } : current;
    states[def.key] = state;
    next = writeThrough(next, type, def, state);
  }
  return { ...next, finished: { ...next.finished, [type]: states } };
}

/**
 * Recalcule les champs `auto` de tous les types depuis le corps (changer une mesure ou le type) ; les champs
 * `manual` gardent leur valeur et leur aisance est refaite pour le corps courant.
 */
export function syncFinished(form: StudioForm): StudioForm {
  return DRAFTED_GARMENT_TYPES.reduce(syncType, form);
}

/** État d'une mesure finie (`auto` sans valeur si elle n'est pas encore calculée). */
export const finishedStateOf = (
  form: StudioForm,
  type: DraftedGarmentType,
  key: FinishedKey,
): FieldState => form.finished[type]?.[key] ?? autoState();

function setState(form: StudioForm, key: FinishedKey, state: FieldState): StudioForm {
  const type = typeOf(form);
  const finished = { ...form.finished, [type]: { ...form.finished[type], [key]: state } };
  return syncFinished({ ...form, finished });
}

/** Saisie d'une mesure finie (cm) du type courant : le champ passe à `manual`. */
export function withFinished(form: StudioForm, key: FinishedKey, cm: number | undefined) {
  return setState(form, key, { value: cm, source: 'manual' });
}

/** Remet un champ (ou tous ceux du type courant) à `auto`, à sa valeur proposée. */
export function withRecalculated(form: StudioForm, key?: FinishedKey): StudioForm {
  const keys = key ? [key] : finishedKeys(typeOf(form), true);
  return keys.reduce((f, k) => setState(f, k, autoState()), form);
}

/** Saisie d'une mesure du corps : les champs `auto` suivent, les `manual` gardent leur valeur. */
export function withMeasurement(form: StudioForm, key: MeasurementKey, cm: number | undefined) {
  return syncFinished({ ...form, measurementsCm: { ...form.measurementsCm, [key]: cm } });
}

/** Valeur finie (cm) qui correspond à la saisie envoyée : longueur telle quelle, corps + aisance. */
function valueFromInput(form: StudioForm, def: Def, inputs: ParamValues): number | undefined {
  const input = inputs[paramOf(def)];
  if (def.kind === 'length' || input === undefined) return input;
  const body = bodyMm(form, def.body);
  return body === undefined ? undefined : toCm(body + toMm(input));
}

/** Un paramètre lié à une mesure finie (longueur, aisance) saisi tel quel rend le champ `manual`. */
function manualFromInputs(form: StudioForm, def: Def, inputs: ParamValues): StudioForm {
  const type = typeOf(form);
  const state: FieldState = { value: valueFromInput(form, def, inputs), source: 'manual' };
  return {
    ...form,
    finished: { ...form.finished, [type]: { ...form.finished[type], [def.key]: state } },
  };
}

/** Saisie d'un paramètre du type courant (aisance ou longueur : le champ fini correspondant passe à `manual`). */
export function withParam(form: StudioForm, param: string, value: number | undefined) {
  const type = typeOf(form);
  const params = { ...form.paramsByType[type], [param]: value };
  const next = { ...form, paramsByType: { ...form.paramsByType, [type]: params } };
  const def = DEFS[type].find((d) => !isSleeve(d) && paramOf(d) === param);
  return def ? manualFromInputs(next, def, params) : next;
}

/** Saisie d'un paramètre des manches. */
export function withSleeveParam(form: StudioForm, param: string, value: number | undefined) {
  const next = { ...form, sleeveCm: { ...form.sleeveCm, [param]: value } };
  const def = DEFS.bodice.find(isSleeve);
  return param === 'lengthMm' && def ? manualFromInputs(next, def, next.sleeveCm) : next;
}

/** Version rechargée : tout est `manual` (aucun changement silencieux), valeurs lues de la saisie. */
export function finishedFromParams(form: StudioForm): FinishedByType {
  const result: FinishedByType = {};
  for (const type of DRAFTED_GARMENT_TYPES) {
    const states: FinishedStates = {};
    for (const def of DEFS[type]) {
      const inputs = (isSleeve(def) ? form.sleeveCm : form.paramsByType[type]) ?? {};
      states[def.key] = { value: valueFromInput(form, def, inputs), source: 'manual' };
    }
    result[type] = states;
  }
  return result;
}

/** Un champ du formulaire de mesures finies, pour l'écran. */
export interface FinishedField {
  key: FinishedKey;
  valueCm: number | undefined;
  source: FieldState['source'];
  error?: FieldError;
}

/** Clé d'erreur d'une mesure finie : celle de la longueur du contrat, ou `finished.<mesure>` pour un tour. */
export function finishedErrorKey(key: FinishedKey): string {
  if (key === 'lengthMm') return 'lengthMm';
  return key === 'sleeveLengthMm' ? 'sleeve.lengthMm' : `finished.${key}`;
}

/** Champs de mesures finies du type courant, avec leur origine et leur erreur. */
export function finishedFields(form: StudioForm, errors: FieldErrors): FinishedField[] {
  const type = typeOf(form);
  if (!(type in DEFS)) return [];
  return finishedKeys(type, form.withSleeve).map((key) => {
    const state = finishedStateOf(form, type, key);
    const error = errors[finishedErrorKey(key)];
    return { key, valueCm: state.value, source: state.source, ...(error ? { error } : {}) };
  });
}

/**
 * Erreur d'aisance reportée sur la mesure finie (`easeRange` : sous le corps + aisance minimale, ou au-dessus du
 * maximum). Une mesure finie vide n'envoie pas d'aisance : le service applique la sienne.
 */
export function liftFinishedErrors(type: DraftedGarmentType, errors: FieldErrors): FieldErrors {
  const lifted = { ...errors };
  for (const def of DEFS[type]) {
    if (def.kind !== 'girth') continue;
    const problem = lifted[def.easeParam];
    if (problem?.code !== 'range') continue;
    lifted[finishedErrorKey(def.key)] = {
      code: 'easeRange',
      minMm: problem.minMm,
      maxMm: problem.maxMm,
    };
    Reflect.deleteProperty(lifted, def.easeParam);
  }
  return lifted;
}
