import { DRAPE_ARM_ANGLE_DEG, type MannequinFitter } from '@atelier/features';
import type { StudioFitter } from '../../platform/worker-fitter.js';
import type { FittedMannequin } from '@atelier/mannequin';
import { useEffect, useState } from 'react';

type Measurements = Parameters<MannequinFitter['fit']>[0];

export interface DrapedBody {
  status: 'idle' | 'fitting' | 'ready' | 'failed';
  mannequin?: FittedMannequin;
}

const idle: DrapedBody = { status: 'idle' };

/**
 * Corps ajusté aux mesures de la version drapée, bras à l'angle du drapé : n'est calculé que pendant
 * l'affichage du drapé. Le corps par défaut (habillage géométrique) n'est pas touché.
 */
export function useDrapedBody(
  fitter: StudioFitter,
  measurements: Measurements | undefined,
  shown: boolean,
): DrapedBody {
  const [body, setBody] = useState(idle);
  useEffect(() => {
    if (!shown || !measurements) {
      setBody(idle);
      return undefined;
    }
    let current = true;
    setBody({ status: 'fitting' });
    fitter.fitForView(measurements, { armAngleDeg: DRAPE_ARM_ANGLE_DEG }).then(
      (mannequin) => current && setBody({ status: 'ready', mannequin }),
      () => current && setBody({ status: 'failed' }),
    );
    return () => {
      current = false;
    };
  }, [fitter, measurements, shown]);
  return body;
}
