import type {
  EdgeSheet,
  GrainSheet,
  ModelSheet,
  PanelSheet,
  PlacementSheet,
} from '../core/sheet.js';

/**
 * Fiche de couture de Brian (FreeSewing 4.10.2), le bloc de base homme : devant, dos et manche. Chaque bord est une
 * plage de points nommés sur `paths.seam`, dans le sens du contour ; les bords d'une pièce se suivent et la couvrent
 * exactement une fois (le moteur le contrôle à chaque tracé).
 *
 * L'épaule et l'emmanchure s'arrêtent aux points `s3ArmholeSplit` et `s3CollarSplit`, non à `shoulder` et `hps` :
 * les options `s3Armhole` et `s3Collar` déplacent la couture d'épaule, et ces deux points la suivent. Aux valeurs
 * par défaut (et sous 10 %, seuil de Brian) ils sont confondus avec `shoulder` et `hps`. Ainsi la fiche reste valable
 * aux bornes de toutes les options, sur les cinq tailles de validation (test).
 *
 * Patron (GarmentSpec 1.1) : devant et dos coupés au pli, manche en paire, quatre coutures, crans d'emmanchure. Le
 * repère de chaque pièce : x = 0 sur son axe, y = 0 au point d'encolure (`hps`) ou au sommet de la tête de manche
 * (`sleeveTop`, la manche de FreeSewing a son origine à la ligne de biceps).
 */

/** Devant et dos suivent le même parcours ; seuls le milieu et les noms de ses points changent. */
function body(
  centerNeck: string,
  centerHem: string,
  centerRole: 'centerFront' | 'centerBack',
): EdgeSheet[] {
  return [
    { id: centerRole, semanticRole: centerRole, role: 'fold', from: centerNeck, to: centerHem },
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

/**
 * Pose du devant et du dos : pièce dépliée au milieu du corps, comme le corsage de référence du patronage et les tuniques de
 * `docs/suivi/essais/tuniques/spec3d.mjs`. Le drapé met à la hauteur du repère le bord le plus proche de l'ancre : l'ancre
 * est le coin d'ourlet sur l'axe (`cfHem`, `cbHem`), le bord qu'il suit est l'ourlet, le même devant et dos. La taille du
 * patron (`cfWaist`, `cbWaist` : `hpsToWaistBack` sous le point d'encolure) est à la taille du corps : le décalage de
 * l'ancre, du taille à l'ourlet, vient du tracé (`lengthBonus` comprise). Un ancrage au point d'encolure ferait suivre
 * l'encolure, plus creuse au devant qu'au dos : l'ourlet du devant se poserait près de 47 mm plus haut (taille 42).
 */
const bodyPlacement = (facing: 'front' | 'back', prefix: 'cf' | 'cb'): PlacementSheet => ({
  zone: 'torso',
  bodySide: 'center',
  facing,
  landmark: 'waist',
  anchorPoint: `${prefix}Hem`,
  levelPoint: `${prefix}Waist`,
  offsetMm: 0,
  clearanceMm: 30,
});

/** Droit fil du devant et du dos : parallèle au pli, au cinquième de la largeur, du cinquième aux quatre cinquièmes. */
const BODY_GRAIN: GrainSheet = { xFraction: 0.2, lowFraction: 0.2, highFraction: 0.8 };

function bodyPanel(
  name: string,
  facing: 'front' | 'back',
  notches: PanelSheet['notches'],
): PanelSheet {
  return {
    name,
    quantity: 1,
    cutOnFold: true,
    placement: bodyPlacement(facing, facing === 'front' ? 'cf' : 'cb'),
    grain: BODY_GRAIN,
    notches,
  };
}

export const BRIAN_SHEET: ModelSheet = {
  garmentType: 'tunic',
  parts: [
    {
      part: 'brian.front',
      id: 'front',
      frame: { axis: 'cfNeck', top: 'hps' },
      // Cran simple à la carrure d'emmanchure et à la pointe d'épaule, où tombent ceux de la tête de manche.
      panel: bodyPanel('Devant', 'front', [
        { edge: 'armhole', at: 'armholePitch' },
        { edge: 'armhole', at: 's3ArmholeSplit' },
      ]),
      edges: body('cfNeck', 'cfHem', 'centerFront'),
    },
    {
      part: 'brian.back',
      id: 'back',
      frame: { axis: 'cbNeck', top: 'hps' },
      // Cran double au dos, par convention.
      panel: bodyPanel('Dos', 'back', [{ edge: 'armhole', at: 'armholePitch', count: 2 }]),
      edges: body('cbNeck', 'cbHem', 'centerBack'),
    },
    {
      part: 'library.sleeve',
      id: 'sleeve',
      frame: { axis: 'sleeveTop', top: 'sleeveTop' },
      panel: {
        name: 'Manche',
        quantity: 2,
        cutOnFold: false,
        // Copie droite telle que dessinée, le devant à droite ; sommet de la tête de manche sur le repère d'épaule.
        placement: {
          zone: 'arm',
          bodySide: 'right',
          facing: 'outer',
          landmark: 'shoulder',
          offsetMm: 0,
          clearanceMm: 30,
        },
        grain: { xFraction: 0, lowFraction: 0.2, highFraction: 0.8 },
      },
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
  seams: [
    // FreeSewing dimensionne le côté sur le devant et le dos l'un contre l'autre : 0,00 mm d'écart aux bornes (essai).
    {
      id: 'side',
      a: [{ part: 'front', edge: 'side' }],
      b: [{ part: 'back', edge: 'side' }],
      align: 'same',
      toleranceMm: 0.5,
    },
    // Même longueur par défaut ; s3Collar déplace la couture d'épaule et sépare les deux épaules (jusqu'à 6,5 mm à ses
    // bornes, mesuré sur les 20 tailles) : au-delà de ± 2 mm le tracé est rejeté, comme tout écart non déclaré.
    {
      id: 'shoulder',
      a: [{ part: 'front', edge: 'shoulder' }],
      b: [{ part: 'back', edge: 'shoulder' }],
      align: 'same',
      toleranceMm: 2,
    },
    // Tête de manche contre l'emmanchure du devant, puis celle du dos parcourue de l'épaule à l'aisselle. FreeSewing
    // ajuste la tête à ± 2 mm de la longueur qu'il vise (`sleevecapTarget` : les emmanchures, plus `sleevecapEase`) ;
    // l'embu est la longueur visée moins les emmanchures de la fiche, jamais l'écart mesuré.
    {
      id: 'armhole',
      a: [{ part: 'sleeve', edge: 'sleeveCap' }],
      b: [
        { part: 'front', edge: 'armhole' },
        { part: 'back', edge: 'armhole', reversed: true },
      ],
      align: 'same',
      ease: { store: 'library.sleeve.sleevecapTarget' },
      toleranceMm: 2,
    },
    // Dessous de bras : la manche est symétrique, le côté droit (devant) se coud au gauche, du poignet à l'aisselle.
    {
      id: 'underarm',
      a: [{ part: 'sleeve', edge: 'underarmRight' }],
      b: [{ part: 'sleeve', edge: 'underarmLeft' }],
      align: 'opposite',
      toleranceMm: 0.5,
    },
  ],
};
