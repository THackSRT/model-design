/** Version du moteur : à changer avec tout changement de calcul (elle entre dans l'empreinte des résultats). */
export const ENGINE_VERSION = '0.1.0';

/**
 * Version de FreeSewing épinglée (ADR 0019), sans `^` dans `package.json` : un test vérifie qu'elle est celle des
 * paquets installés. Une montée de version est un travail à part, avec le banc des fiches ; elle change aussi
 * `ENGINE_VERSION`.
 */
export const FREESEWING_VERSION = '4.10.2';
