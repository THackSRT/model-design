import type { FileSaver } from '@atelier/features';

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
    URL.revokeObjectURL(url);
  },
};
