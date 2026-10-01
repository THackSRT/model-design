// Généré par tools/contracts/generate.mjs depuis contracts/ — ne pas modifier à la main.

/**
 * Données de l'événement drape.failed : le drapé drapeId n'a pas pu être calculé. Un type d'erreur stable, aucun texte libre ni mesure.
 */
export interface DrapeFailed {
  drapeId: string;
  designId: string;
  versionNumber: number;
  organizationId: string;
  /**
   * placement-missing : une pièce sans Panel.placement ; placement-failed : pose initiale impossible ; seam-not-closed : couture encore ouverte à la fin ; body-penetration : tissu dans le corps à la fin ; too-large : plus de 40 pièces, 2 000 bords ou 30 000 sommets ; internal : erreur du moteur.
   */
  type:
    | '/problems/drape-placement-missing'
    | '/problems/drape-placement-failed'
    | '/problems/drape-seam-not-closed'
    | '/problems/drape-body-penetration'
    | '/problems/drape-too-large'
    | '/problems/drape-internal';
  /**
   * Vrai si la même demande peut réussir plus tard (erreur passagère) ; faux si elle échouera encore.
   */
  retryable: boolean;
}
