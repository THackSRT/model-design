/*
 * Catalogue : modèles, barèmes de tailles et style d'origine.
 * Partagé par l'atelier (index.html) et le widget boutique (boutique.html).
 */
(function () {
  const MODEL = { ref: 'MOD-001', name: 'Ensemble kaftan à chevrons' };

  // Barèmes de départ (cm) ; chaque mesure reste modifiable pour le sur-mesure.
  const SIZES = {
    homme: {
      S:  { stature: 172, neck: 38, shoulder: 14.5, chest: 92,  waist: 78,  hip: 94,  bicep: 30, wrist: 16.5, armLength: 59, thigh: 53, knee: 36, calf: 35, ankle: 22, outseam: 102, rise: 26, hemCirc: 36, tunicLength: 78 },
      M:  { stature: 176, neck: 40, shoulder: 15,   chest: 100, waist: 86,  hip: 100, bicep: 32, wrist: 17,   armLength: 60, thigh: 57, knee: 38, calf: 37, ankle: 23, outseam: 104, rise: 27, hemCirc: 38, tunicLength: 80 },
      L:  { stature: 178, neck: 42, shoulder: 15.5, chest: 108, waist: 94,  hip: 106, bicep: 34, wrist: 17.5, armLength: 61, thigh: 61, knee: 40, calf: 39, ankle: 24, outseam: 106, rise: 28, hemCirc: 40, tunicLength: 82 },
      XL: { stature: 180, neck: 44, shoulder: 16,   chest: 116, waist: 102, hip: 112, bicep: 36, wrist: 18,   armLength: 62, thigh: 65, knee: 42, calf: 41, ankle: 25, outseam: 107, rise: 29, hemCirc: 42, tunicLength: 84 },
    },
    femme: {
      S:  { stature: 163, neck: 33,   shoulder: 12,   chest: 86,  waist: 68, hip: 94,  bicep: 26, wrist: 15,   armLength: 55, thigh: 54, knee: 35, calf: 34, ankle: 21,   outseam: 95.5, rise: 24.5, hemCirc: 36, tunicLength: 80 },
      M:  { stature: 165, neck: 34,   shoulder: 12.5, chest: 92,  waist: 74, hip: 100, bicep: 28, wrist: 15.5, armLength: 56, thigh: 58, knee: 37, calf: 35, ankle: 21.5, outseam: 96.5, rise: 25, hemCirc: 38, tunicLength: 82 },
      L:  { stature: 167, neck: 35.5, shoulder: 13,   chest: 100, waist: 82, hip: 108, bicep: 31, wrist: 16,   armLength: 57, thigh: 62, knee: 39, calf: 37, ankle: 22.5, outseam: 97.5, rise: 25.5, hemCirc: 40, tunicLength: 84 },
      XL: { stature: 167, neck: 37,   shoulder: 13.5, chest: 108, waist: 92, hip: 116, bicep: 34, wrist: 17,   armLength: 57, thigh: 66, knee: 41, calf: 39, ankle: 23.5, outseam: 98, rise: 26, hemCirc: 42, tunicLength: 86 },
    },
  };
  const MORPH0 = {
    homme: { belly: 0.15, seat: 0.35, bust: 0 },
    femme: { belly: 0.1, seat: 0.6, bust: 0.6 },
  };
  const COMMON = { sleeveLength: 22, ease: 12, sideSlit: 12 };

  // Relevé sur la photo de référence (proportions ramenées en cm pour une taille M).
  const STYLE0 = {
    fabric: '#442721', accent: '#f2efe8', shoe: '#c98f5a',
    chevCount: 3, chevWidth: 20, chevBand: 4.3, chevGap: 1.8, chevDrop: 5, chevTop: 18.6, placketGap: 5,
    texture: true, shoes: true, showBody: true,
  };

  window.Catalog = {
    MODEL, SIZES, MORPH0, COMMON, STYLE0,
    SIZE_ORDER: ['S', 'M', 'L', 'XL'],
    /* Mesures (corps + longueurs du modèle) correspondant à une taille du barème. */
    sizeMeasures: (sex, size) => Object.assign({ sex }, COMMON, SIZES[sex][size], MORPH0[sex]),
  };
})();
