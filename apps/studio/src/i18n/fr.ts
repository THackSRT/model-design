/** Catalogue français. Toute phrase de l'interface passe par une clé ; jamais de concaténation. */
export const fr = {
  'app.title': 'Studio de patron',
  'app.subtitle': 'Phase 1 · jupe droite',
  'measurements.title': 'Mesures du client',
  'measurements.sex': 'Morphologie',
  'measurements.sex.female': 'Femme',
  'measurements.sex.male': 'Homme',
  'measurements.statureMm': 'Stature',
  'measurements.chestGirthMm': 'Tour de poitrine',
  'measurements.waistGirthMm': 'Tour de taille',
  'measurements.hipGirthMm': 'Tour de bassin',
  'skirt.title': 'Jupe droite',
  'skirt.length': 'Longueur',
  'skirt.waistEase': 'Aisance taille',
  'skirt.hipEase': 'Aisance bassin',
  'skirt.hemFlare': 'Évasement de l’ourlet',
  'action.generate': 'Calculer le patron',
  'status.idle': 'Saisissez les mesures puis calculez.',
  'status.working': 'Calcul en cours…',
  'pattern.title': 'Patron',
  'pattern.version': 'Version {number}',
  'mannequin.title': 'Mannequin',
  'mannequin.label': 'Mannequin ajusté aux mesures, glisser pour tourner',
  'problem./problems/pattern-impossible': 'Patron impossible avec ces mesures.',
  'problem./problems/engine-unavailable':
    'Le moteur de patronage ne répond pas. Réessayez dans un instant.',
  'problem./problems/network': 'Le service est injoignable. Vérifiez qu’il est démarré.',
  'problem.default': 'Le calcul a échoué.',
  'unit.cm': 'cm',
} as const;

export type MessageKey = keyof typeof fr;
