/*
 * Recommandation de taille : compare le corps du client aux cotes finies de chaque taille
 * (calculées depuis les patrons du modèle) et note chaque zone selon la coupe préférée.
 */
(function () {
  const R = {};
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  R.PREFS = { ajuste: 'Ajustée', normal: 'Normale', ample: 'Ample' };
  const SHIFT = { ajuste: -4, normal: 0, ample: 5 };

  /* Cotes finies du vêtement pour une taille (tableau des mesures « à plat » de la marque). */
  R.garmentDims = function (sizeM, style) {
    const pat = Garment3D.patternData(sizeM, style);
    const b = pat.base;
    return {
      pat,
      chest: sizeM.chest + sizeM.ease,
      tunicAt: (d) => 4 * (b.W + b.flare * clamp((d - b.ahd) / (b.L - b.ahd), 0, 1)),
      hem: 4 * (b.W + b.flare),
      tunicLength: sizeM.tunicLength,
      sleeve: pat.sleeveWidth,
      sleeveLength: sizeM.sleeveLength,
      waistElastic: Math.round(sizeM.waist * 0.9),
      waistNominal: sizeM.waist,
      pantsHip: sizeM.hip + 4,
      thigh: pat.thighC,
      knee: pat.kneeC,
      pantsHem: pat.hemC,
      outseam: sizeM.outseam,
    };
  };

  function circ(zone, ease, lo, hi, min, weight, extra) {
    let verdict, pen = 0;
    if (ease < min) { verdict = 'trop serré'; pen = 6 * (min - ease) + (lo - min); }
    else if (ease < lo) { verdict = 'ajusté'; pen = lo - ease; }
    else if (ease <= hi) { verdict = 'idéal'; }
    else if (ease <= hi + 8) { verdict = 'ample'; pen = 0.5 * (ease - hi); }
    else { verdict = 'trop ample'; pen = 0.5 * (ease - hi) + 2 * (ease - hi - 8); }
    const mid = (lo + hi) / 2, half = Math.max(2, (hi - min));
    return Object.assign({
      zone, kind: 'tour', ease, verdict, penalty: pen * weight,
      pos: clamp((ease - mid) / half, -1, 1),
      text: `${ease >= 0 ? '+' : '−'}${Math.abs(Math.round(ease * 10) / 10).toLocaleString('fr-FR')} cm d'aisance`,
    }, extra || {});
  }

  function length(zone, diff, lo, hi, weight, texts) {
    let verdict = 'idéal', pen = 0;
    if (diff < lo) { verdict = 'trop court'; pen = 2 * (lo - diff); }
    else if (diff > hi) { verdict = 'trop long'; pen = diff - hi; }
    return { zone, kind: 'longueur', diff, verdict, penalty: pen * weight, pos: clamp((diff - (lo + hi) / 2) / Math.max(4, hi - lo), -1, 1), text: texts(diff) };
  }

  const cm = (v) => Math.abs(Math.round(v * 10) / 10).toLocaleString('fr-FR') + ' cm';

  /* Évalue une taille pour un client. body = mesures du client, g = garmentDims(taille). */
  R.evaluate = function (body, g, pref) {
    const sh = SHIFT[pref] || 0;
    const L = Body.landmarks(body);
    const hemY = L.neckBase - g.tunicLength;
    const zones = [
      circ('Poitrine', g.chest - body.chest, 8 + sh, 15 + sh, 4, 3),
      circ('Taille (tunique)', g.tunicAt(L.neckBase - L.waist) - body.waist, 5 + sh, 32 + sh, 2, 1.5),
    ];
    if (hemY < L.hip) zones.push(circ('Bassin (tunique)', g.tunicAt(L.neckBase - L.hip) - body.hip, 5 + sh / 2, 22 + sh, 1.5, 2.2));
    zones.push(circ('Tour de bras', g.sleeve - body.bicep, 6 + sh / 2, 14 + sh, 3, 1));
    // élastique de ceinture : se tend jusqu'au tour de taille nominal + 10 %
    zones.push(circ('Taille (pantalon)', g.waistNominal * 1.06 - body.waist, 0, 9, -3, 1.2, {
      text: body.waist < g.waistElastic * 0.95 ? 'ceinture lâche, serrer le cordon' : body.waist > g.waistNominal * 1.1 ? 'élastique trop tendu' : 'élastique à l’aise',
    }));
    zones.push(circ('Bassin (pantalon)', g.pantsHip - body.hip, 3 + sh / 2, 8 + sh, 1, 2.5));
    zones.push(circ('Cuisse', g.thigh - body.thigh, 6 + sh / 2, 15 + sh, 3, 1.5));
    zones.push(length('Longueur pantalon', g.outseam - body.outseam, -1.5, 2.5, 0.8,
      (d) => (Math.abs(d) < 0.5 ? 'tombe à la cheville' : d > 0 ? `${cm(d)} plus long : ourlet à reprendre si besoin` : `${cm(d)} plus court que la cheville`)));
    const below = L.crotch - hemY;
    zones.push(length('Longueur tunique', below, 8, 26, 0.7,
      (d) => (d >= 0 ? `arrive ${cm(d)} sous l’entrejambe` : `s’arrête ${cm(d)} au-dessus de l’entrejambe`)));
    const total = zones.reduce((a, z) => a + z.penalty, 0);
    return { zones, total, blocking: zones.filter((z) => z.verdict === 'trop serré' || z.verdict === 'trop court') };
  };

  /*
   * Recommande une taille. product = { sizes: { S: mesures, … }, style } ; pref = ajuste | normal | ample.
   */
  R.recommend = function (body, product, pref) {
    const results = product.order.map((size) => {
      const g = R.garmentDims(product.sizes[size], product.style);
      return Object.assign({ size, dims: g }, R.evaluate(body, g, pref));
    });
    const ranked = results.slice().sort((a, b) => a.total - b.total);
    const best = ranked[0], second = ranked[1];
    const gap = second ? second.total - best.total : 99;
    let confidence = gap > 6 ? 'élevée' : gap > 2 ? 'moyenne' : 'entre deux tailles';
    let advice = '';
    if (best.blocking.length) {
      confidence = 'faible';
      advice = `Aucune taille standard ne convient parfaitement (${best.blocking.map((z) => z.zone.toLowerCase()).join(', ')}) : le sur-mesure est conseillé.`;
    } else if (confidence === 'entre deux tailles' && second) {
      const bigger = product.order.indexOf(second.size) > product.order.indexOf(best.size);
      advice = `Hésitation avec la taille ${second.size} : prenez-la si vous préférez une coupe plus ${bigger ? 'ample' : 'ajustée'}.`;
    }
    return { best: best.size, confidence, advice, results, ranked };
  };

  window.Recommender = R;
})();
