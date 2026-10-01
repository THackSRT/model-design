// Généré par tools/contracts/generate.mjs depuis contracts/ — ne pas modifier à la main.

/**
 * Cran demandé sur la pièce panelId : un emplacement (NotchPlacement de GarmentSpec : edgeId, distanceMm, count) sur la ligne de couture d'un de ses bords.
 */
export type NotchRequest = NotchPlacement & {
  panelId: string;
};
/**
 * Taille écrite sur chaque pièce et dans le nom du fichier. Jamais de nom de client.
 */
export type SizeLabel = string;
/**
 * Référence du modèle écrite sur chaque pièce (ex. « MOD-002 »). Jamais de nom de client.
 */
export type SizeLabel1 = string;

/**
 * Demande d'export des pièces de coupe d'une version de modèle, à l'échelle 1:1. La spécification de patron est celle de la version : le client ne l'envoie pas. La réponse est le fichier lui-même.
 */
export interface DesignExportRequest {
  /**
   * svg : une planche à l'échelle 1:1 (unités mm). pdf-a4-tiled : la même planche découpée en pages A4 à assembler, précédées d'un plan d'assemblage avec un carré de contrôle de 100 mm. dxf-aama : DXF R12 selon AAMA-DXF (ASTM D6673), une taille, pour les logiciels de CAO et les tables de coupe.
   */
  format: 'svg' | 'pdf-a4-tiled' | 'dxf-aama';
  finishing?: FinishingOptions;
  sizeLabel?: SizeLabel;
  reference?: SizeLabel1;
}
/**
 * Comment finir les pièces d'un patron : valeurs de couture et crans. Longueurs en millimètres. Absent : valeurs par défaut du moteur (10 mm partout, 30 mm aux ourlets, crans aux raccords de couture).
 */
export interface FinishingOptions {
  seamAllowances?: SeamAllowances;
  /**
   * Crans demandés en plus des crans automatiques.
   *
   * @maxItems 200
   */
  notches?: NotchRequest[];
  /**
   * none : aucun cran automatique. seam-junctions : un cran à chaque jonction de deux bords cousus presque alignés (écart de direction inférieur à 30°), par exemple la ligne de hanches d'une couture de côté, et un cran aux deux extrémités de chaque pince (pince franchie par la ligne de coupe).
   */
  autoNotches?: 'none' | 'seam-junctions';
}
/**
 * Priorité : byEdge, puis byRole, puis defaultMm. Un bord de pliure (role fold) n'a jamais de valeur de couture. Si seamAllowances est absent, le moteur applique defaultMm = 10 et byRole.hem = 30.
 */
export interface SeamAllowances {
  defaultMm?: number;
  byRole?: RoleAllowances;
  /**
   * @maxItems 500
   */
  byEdge?: EdgeAllowance[];
}
/**
 * Valeur de couture par rôle de bord (voir Edge.role de GarmentSpec). Un bord sans rôle est traité comme une couture (seam).
 */
export interface RoleAllowances {
  seam?: number;
  hem?: number;
  waistline?: number;
  opening?: number;
}
export interface EdgeAllowance {
  panelId: string;
  edgeId: string;
  allowanceMm: number;
}
/**
 * Emplacement d'un cran, seule définition partagée par Panel.notches (Notch) et la fabrication (NotchRequest) : sur la ligne de couture du bord edgeId, à distanceMm de son début (from), mesurée le long du bord. Ouvert pour être étendu (allOf) ; Notch et NotchRequest le ferment.
 */
export interface NotchPlacement {
  edgeId: string;
  distanceMm: number;
  /**
   * Cran simple, double (dos, par convention) ou triple.
   */
  count?: number;
}
