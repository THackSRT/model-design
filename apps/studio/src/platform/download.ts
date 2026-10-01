import type { FileSaver } from '@atelier/features';

const REVOKE_DELAY_MS = 1000;

/** Enregistre un fichier par un lien temporaire (Blob) ; l'URL d'objet est libérée aussitôt. */
export const browserFileSaver: FileSaver = {
  save(blob, fileName) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.rel = 'noopener';
    document.body.append(link);
    link.click();
    link.remove();
    // Libération différée : certains navigateurs lisent l'URL après le clic ; 1 s suffit au démarrage.
    setTimeout(() => URL.revokeObjectURL(url), REVOKE_DELAY_MS);
  },
};
