// Généré par tools/contracts/generate.mjs depuis contracts/ — ne pas modifier à la main.

/**
 * Mesures brutes d'un tissu, saisies par un modéliste au banc d'essai des tissus, telles que lues sur les instruments (ADR 0015). Chaque essai est facultatif ; stretchWarp et bendingWarp portent sur une bande découpée dans le sens de la chaîne (droit fil), stretchWeft et bendingWeft dans le sens de la trame (travers du fil). Les grandeurs physiques en sont déduites par le moteur de drapé ; elles ne sont jamais saisies directement. Mesures d'un tissu, jamais d'une personne.
 */
export interface FabricBenchMeasurements {
  weighing?: FabricWeighing;
  thickness?: FabricThicknessTest;
  stretchWarp?: StripStretchTest;
  stretchWeft?: StripStretchTest;
  bendingWarp?: CantileverBendingTest;
  bendingWeft?: CantileverBendingTest;
  friction?: InclinedPlaneFrictionTest;
  drape?: MeasuredDrape;
}
/**
 * Pesée d'un échantillon découpé. Grammage déduit : masse / aire × 1 000 000, en g/m².
 */
export interface FabricWeighing {
  /**
   * Masse de l'échantillon, en grammes.
   */
  sampleMassG: number;
  /**
   * Aire de l'échantillon, en millimètres carrés (50 × 50 mm au moins, 1 m² au plus).
   */
  sampleAreaMm2: number;
}
/**
 * Épaisseur au pied à coulisse ou au micromètre, mâchoires serrées sans écraser le tissu. Épaisseur déduite : moyenne des lectures, en mm.
 */
export interface FabricThicknessTest {
  /**
   * Lectures en différents points de l'échantillon, en millimètres.
   *
   * @minItems 1
   * @maxItems 32
   */
  readingsMm: [number, ...number[]];
}
/**
 * Allongement d'une bande suspendue sous une masse connue. Deux repères tracés sur la bande, distance mesurée avant et après la mise en charge. Allongement déduit, ramené à la charge de référence de Fabric (10 N sur 50 mm de large) par proportionnalité (hypothèse linéaire, ADR 0015).
 */
export interface StripStretchTest {
  /**
   * Largeur de la bande, en millimètres (50 mm recommandés).
   */
  stripWidthMm: number;
  /**
   * Distance entre les repères avant la mise en charge (bande suspendue, sans masse), en millimètres (200 mm recommandés).
   */
  gaugeLengthMm: number;
  /**
   * Distance entre les repères sous la masse, en millimètres ; au moins gaugeLengthMm.
   */
  loadedLengthMm: number;
  /**
   * Masse suspendue à la bande, pince comprise, en grammes (1 000 g donnent 9,81 N, proche de la charge de référence).
   */
  hangingMassG: number;
}
/**
 * Flexion au porte-à-faux (ASTM D1388, option A ; ISO 9073-7) : bande de 25 × 200 mm poussée au-delà du bord d'une plateforme jusqu'à ce que sa pointe touche un plan incliné à 41,5°. Longueur de flexion c = porte-à-faux / 2 ; rigidité de flexion B = grammage × g × c³ (ADR 0015).
 */
export interface CantileverBendingTest {
  /**
   * Longueurs en porte-à-faux lues sur la règle, en millimètres (quatre recommandées : chaque extrémité, chaque face).
   *
   * @minItems 1
   * @maxItems 32
   */
  overhangLengthsMm: [number, ...number[]];
}
/**
 * Frottement au plan incliné : un patin lesté recouvert du tissu, posé sur une planche recouverte de la surface d'appui, qu'on incline lentement jusqu'au glissement. Coefficient déduit : moyenne des tan θ (frottement statique, ADR 0015).
 */
export interface InclinedPlaneFrictionTest {
  /**
   * Angles de la planche au moment du glissement, en degrés par rapport à l'horizontale.
   *
   * @minItems 1
   * @maxItems 32
   */
  slideAnglesDeg: [number, ...number[]];
  /**
   * Surface d'appui : dress-form-cover (housse d'un buste de couture), skin-substitute (peau synthétique), same-fabric (le tissu lui-même), other. Le moteur de drapé modélise le frottement du tissu sur le corps.
   */
  counterSurface: 'dress-form-cover' | 'skin-substitute' | 'same-fabric' | 'other';
}
/**
 * Coefficient de drapé mesuré au drapomètre de Cusick (BS 5058, ISO 9073-9), si l'atelier en a un : DC = (aire de l'ombre − aire du disque) / (aire de l'éprouvette − aire du disque).
 */
export interface MeasuredDrape {
  /**
   * Coefficient de drapé, sans unité (0 : tombe à la verticale ; 1 : reste plat).
   */
  drapeCoefficient: number;
  /**
   * Diamètre de l'éprouvette circulaire, en millimètres. Seul l'essai de 300 mm est comparable à l'essai simulé.
   */
  specimenDiameterMm: 300;
  /**
   * Diamètre du disque support, en millimètres.
   */
  discDiameterMm: 180;
}
