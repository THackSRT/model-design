import type { EdgeSheet, ModelSheet } from '../core/sheet.js';

/**
 * Fiche de couture de Brian (FreeSewing 4.10.2), le bloc de base homme : devant, dos et manche. Chaque bord est une
 * plage de points nommés sur `paths.seam`, dans le sens du contour ; les bords d'une pièce se suivent et la couvrent
 * exactement une fois (le moteur le contrôle à chaque tracé).
 *
 * L'épaule et l'emmanchure s'arrêtent aux points `s3ArmholeSplit` et `s3CollarSplit`, non à `shoulder` et `hps` :
 * les options `s3Armhole` et `s3Collar` déplacent la couture d'épaule, et ces deux points la suivent. Aux valeurs
 * par défaut (et sous 10 %, seuil de Brian) ils sont confondus avec `shoulder` et `hps`. Ainsi la fiche reste valable
 * aux bornes de toutes les options, sur les cinq tailles de validation (test).
 */

/** Devant et dos suivent le même parcours ; seuls le milieu et les noms de ses points changent. */
function body(
  centerNeck: string,
  centerHem: string,
  centerRole: 'centerFront' | 'centerBack',
): EdgeSheet[] {
  return [
    { id: centerRole, semanticRole: centerRole, from: centerNeck, to: centerHem },
    { id: 'hem', semanticRole: 'hem', from: centerHem, to: 'hem' },
    { id: 'side', semanticRole: 'side', from: 'hem', to: 'armhole' },
    {
      id: 'armhole',
      semanticRole: 'armhole',
      from: 'armhole',
      to: 's3ArmholeSplit',
      via: ['armholeHollow', 'armholePitch'],
    },
    { id: 'shoulder', semanticRole: 'shoulder', from: 's3ArmholeSplit', to: 's3CollarSplit' },
    { id: 'neckline', semanticRole: 'neckline', from: 's3CollarSplit', to: centerNeck },
  ];
}

export const BRIAN_SHEET: ModelSheet = {
  parts: [
    { part: 'brian.front', id: 'front', edges: body('cfNeck', 'cfHem', 'centerFront') },
    { part: 'brian.back', id: 'back', edges: body('cbNeck', 'cbHem', 'centerBack') },
    {
      part: 'library.sleeve',
      id: 'sleeve',
      edges: [
        { id: 'underarmLeft', semanticRole: 'underarm', from: 'bicepsLeft', to: 'wristLeft' },
        { id: 'sleeveHem', semanticRole: 'sleeveHem', from: 'wristLeft', to: 'wristRight' },
        { id: 'underarmRight', semanticRole: 'underarm', from: 'wristRight', to: 'bicepsRight' },
        {
          id: 'sleeveCap',
          semanticRole: 'sleeveCap',
          from: 'bicepsRight',
          to: 'bicepsLeft',
          via: ['capQ1', 'capQ2', 'capQ3', 'capQ4'],
        },
      ],
    },
  ],
};
