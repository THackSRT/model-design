/*
 * Questionnaire → mesures du corps.
 * Régressions entraînées sur ANSUR II (tools/fit_anthropometry.py) : stature, poids, âge
 * et 4 réponses de silhouette (-1 / 0 / +1) donnent les 14 mesures de l'avatar et des patrons.
 */
(function () {
  const E = {};

  E.QUESTIONS = [
    { key: 'belly', label: 'Ventre', opts: ['Plat', 'Moyen', 'Rond'] },
    { key: 'hips', label: 'Hanches et fessier', opts: ['Étroits', 'Moyens', 'Larges'] },
    { key: 'chest', label: 'Poitrine / torse', opts: ['Menu', 'Moyen', 'Fort'] },
    { key: 'shoulders', label: 'Épaules', opts: ['Étroites', 'Moyennes', 'Larges'] },
  ];

  E.LABELS = {
    neck: 'Tour de cou', shoulder: "Longueur d'épaule", chest: 'Tour de poitrine', waist: 'Tour de taille',
    hip: 'Tour de bassin', bicep: 'Tour de bras', wrist: 'Tour de poignet', armLength: 'Longueur de bras',
    thigh: 'Tour de cuisse', knee: 'Tour de genou', calf: 'Tour de mollet', ankle: 'Tour de cheville',
    outseam: 'Taille → cheville', rise: 'Hauteur montant',
  };

  E.available = () => !!window.ANTHRO_MODEL;

  /*
   * q = { sex, age, height (cm), weight (kg), belly, hips, chest, shoulders }  (réponses -1/0/1, 0 si inconnu)
   * Retourne { m: mesures (cm) prêtes pour Body.build, err: erreur moyenne par mesure, warnings }.
   */
  E.estimate = function (q) {
    const sex = q.sex === 'femme' ? 'femme' : 'homme';
    const M = window.ANTHRO_MODEL[sex];
    const h = +q.height, w = +q.weight, age = +q.age;
    const bmi = w / (h / 100) ** 2;
    const x = [1, h, w, bmi, age, age * age / 100, h * bmi / 100, +q.belly || 0, +q.hips || 0, +q.chest || 0, +q.shoulders || 0];
    const m = { sex, stature: h }, err = {};
    for (const [k, t] of Object.entries(M.targets)) {
      m[k] = Math.round(t.coef.reduce((a, c, i) => a + c * x[i], 0) * 2) / 2;
      err[k] = (+q.belly || +q.hips || +q.chest || +q.shoulders) ? (t.mae + t.maeBase) / 2 : t.maeBase;
    }
    // silhouette de l'avatar
    const pick = (v, a, b, c) => (v < 0 ? a : v > 0 ? c : b);
    m.belly = pick(+q.belly, 0.05, 0.2, 0.6) + Math.max(0, Math.min(0.3, (bmi - 27) * 0.04));
    m.seat = pick(+q.hips, 0.2, 0.4, 0.75);
    m.bust = sex === 'femme' ? pick(+q.chest, 0.35, 0.6, 0.9) : 0;
    const warnings = [];
    const R = M.range;
    if (h < R.stature[0] || h > R.stature[1]) warnings.push(`stature hors de la plage des données (${R.stature[0]}–${R.stature[1]} cm)`);
    if (w < R.poids[0] || w > R.poids[1]) warnings.push(`poids hors de la plage des données (${R.poids[0]}–${R.poids[1]} kg)`);
    if (age < R.age[0] || age > R.age[1]) warnings.push(`âge hors de la plage des données (${R.age[0]}–${R.age[1]} ans)`);
    return { m, err, bmi, warnings };
  };

  window.Estimator = E;
})();
