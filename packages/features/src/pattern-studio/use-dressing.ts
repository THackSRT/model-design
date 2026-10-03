import type { GarmentRequest, GarmentSpec } from '@atelier/contracts-ts';
import type { TightZone } from '@atelier/mannequin';
import { useEffect, useState } from 'react';
import { type DressingState, initialDressingState, type MannequinFitter } from './fitter.js';

/** Patron à porter : sa spécification et le type de vêtement. */
export interface DressingInput {
  spec: GarmentSpec;
  garmentType: string;
  /** Longueur de manche finie, en mm (mesure « longueur de manche » du corsage à manches). */
  sleeveLengthMm?: number;
}

/** Longueur de manche finie de la demande du vêtement ; absente sans manches ou hors corsage. */
export function sleeveLengthOf(garment: GarmentRequest): number | undefined {
  return garment.type === 'bodice' ? garment.params.sleeve?.lengthMm : undefined;
}

/** Zones trop justes en mm entiers : les écarts et hauteurs sont les seuls chiffres montrés. */
export function roundZones(zones: readonly TightZone[]): TightZone[] {
  return zones.map((z) => ({
    fromMm: Math.round(z.fromMm),
    toMm: Math.round(z.toMm),
    shortfallMm: Math.round(z.shortfallMm),
  }));
}

/**
 * Habille le corps ajusté (dans le Worker) avec le patron calculé. Un changement de corps ou de
 * patron relance l'habillage ; seule la dernière demande compte. `ready` : le corps est celui que
 * le Worker garde (pas d'ajustement en cours).
 */
export function useDressing(
  fitter: MannequinFitter,
  bodyReady: boolean,
  mannequin: unknown,
  input: DressingInput | undefined,
): DressingState {
  const [state, setState] = useState<DressingState>(initialDressingState);
  useEffect(() => {
    if (!bodyReady || !mannequin || !input) {
      setState(initialDressingState);
      return undefined;
    }
    let current = true;
    setState({ status: 'working' });
    fitter
      .dress(
        input.spec,
        input.garmentType,
        ...(input.sleeveLengthMm === undefined ? [] : [{ sleeveLengthMm: input.sleeveLengthMm }]),
      )
      .then(
        (garment) =>
          current &&
          setState({
            status: 'ready',
            garment: { ...garment, tightZones: roundZones(garment.tightZones) },
          }),
        () => current && setState({ status: 'failed' }),
      );
    return () => {
      current = false;
    };
  }, [fitter, bodyReady, mannequin, input]);
  return state;
}
