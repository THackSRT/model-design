// Généré par tools/contracts/generate.mjs depuis contracts/ — ne pas modifier à la main.

/**
 * Enveloppe CloudEvents 1.0 de tous les événements de la plateforme.
 */
export interface CloudEventEnvelope {
  specversion: '1.0';
  id: string;
  /**
   * Service éditeur, ex. /services/designs
   */
  source: string;
  type: string;
  subject?: string;
  time: string;
  datacontenttype: 'application/json';
  data: {};
}
