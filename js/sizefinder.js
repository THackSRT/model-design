/*
 * « Trouver ma taille » : questionnaire → mesures estimées → taille recommandée,
 * avec l'avatar du client habillé dans la taille choisie. Composant réutilisable
 * (onglet de l'atelier et widget boutique).
 *
 * SizeFinder.mount(root, { product, onApply, compact })
 *   product = { name, order: ['S','M',…], style, sizesFor(sex) -> { S: mesures, … } }
 *   onApply(estimation) : appelé par « Utiliser ces mesures pour le sur-mesure » (facultatif)
 */
(function () {
  const SF = {};
  const KEY = 'atelier-profil-v1';
  const fmt = (v) => (Math.round(v * 10) / 10).toLocaleString('fr-FR');
  const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;');

  const DEFAULT = { sex: 'homme', age: 30, height: 176, weight: 75, belly: 0, hips: 0, chest: 0, shoulders: 0, pref: 'normal' };

  function load() {
    try { return Object.assign({}, DEFAULT, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { return Object.assign({}, DEFAULT); }
  }
  function store(p) { try { localStorage.setItem(KEY, JSON.stringify(p)); } catch (e) { /* stockage indisponible */ } }

  /* Pictogrammes de silhouette (trait) pour chaque réponse. */
  function picto(key, v) {
    const k = v + 1; // 0,1,2
    let d;
    if (key === 'belly') { // profil
      const b = [0, 3.5, 8][k];
      d = `M20 4a4 4 0 1 0 0.1 0M17 12 C12 16 12 30 13 40 C13 46 14 50 15 58 M22 12 C27 15 29 20 27 25 C26 28 ${25 + b} 31 ${25 + b} 37 C${25 + b} 43 25 46 24 50 C23 53 22 56 22 58`;
    } else if (key === 'hips') { // face
      const h = [-1.5, 1.5, 4.5][k];
      d = `M20 4a4 4 0 1 0 0.1 0M9 14 L31 14 M9 14 C9 22 12 28 13 32 C${12 - h} 38 ${11 - h} 44 ${12 - h} 50 L15 58 M31 14 C31 22 28 28 27 32 C${28 + h} 38 ${29 + h} 44 ${28 + h} 50 L25 58`;
    } else if (key === 'chest') { // profil, poitrine
      const c = [1, 3.5, 7][k];
      d = `M20 4a4 4 0 1 0 0.1 0M17 12 C12 16 12 30 13 40 C13 46 14 50 15 58 M22 12 C${25 + c} 15 ${28 + c} 20 ${26 + c * 0.6} 26 C25 30 24 34 24 38 C24 44 23 50 22 58`;
    } else { // épaules, face
      const s = [-3, 0, 3.5][k];
      d = `M20 4a4 4 0 1 0 0.1 0M${10 - s} 15 C${14 - s} 12 17 12 18 10 M${30 + s} 15 C${26 + s} 12 23 12 22 10 M${10 - s} 15 C${10 - s} 24 13 30 13 36 C12 44 13 50 14 58 M${30 + s} 15 C${30 + s} 24 27 30 27 36 C28 44 27 50 26 58`;
    }
    return `<svg viewBox="0 0 40 60" aria-hidden="true"><path d="${d}" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  }

  SF.mount = function (root, opts) {
    const product = opts.product;
    let p = load();
    let shown = null;         // taille affichée sur l'avatar
    let last = null;
    const id = (s) => root.querySelector(`[data-id="${s}"]`);

    root.classList.add('sf');
    root.innerHTML = `
      <section class="sf-q" aria-label="Votre profil">
        <h3 class="sf-h">Votre profil</h3>
        <div class="seg" role="group" aria-label="Vous êtes">
          <button type="button" class="seg-b" data-sex="homme">Homme</button>
          <button type="button" class="seg-b" data-sex="femme">Femme</button>
        </div>
        <div class="sf-nums">
          <label class="field"><span>Âge</span><span class="num"><input data-id="age" type="number" min="12" max="95" inputmode="numeric"><span>ans</span></span></label>
          <label class="field"><span>Taille</span><span class="num"><input data-id="height" type="number" min="120" max="215" inputmode="numeric"><span>cm</span></span></label>
          <label class="field"><span>Poids</span><span class="num"><input data-id="weight" type="number" min="30" max="200" inputmode="numeric"><span>kg</span></span></label>
        </div>
        ${Estimator.QUESTIONS.map((q) => `
          <div class="sf-qq" role="group" aria-label="${q.label}">
            <span class="sf-ql">${q.label}</span>
            <div class="sf-opts">${q.opts.map((o, i) => `<button type="button" class="sf-opt" data-q="${q.key}" data-v="${i - 1}">${picto(q.key, i - 1)}<span>${o}</span></button>`).join('')}</div>
          </div>`).join('')}
        <div class="sf-qq" role="group" aria-label="Coupe préférée">
          <span class="sf-ql">Vous aimez porter vos vêtements</span>
          <div class="seg seg3">${Object.entries(Recommender.PREFS).map(([k, v]) => `<button type="button" class="seg-b" data-pref="${k}">${v}</button>`).join('')}</div>
        </div>
        <p class="sf-note">Vos réponses restent enregistrées sur cet appareil et servent pour tous les articles.</p>
      </section>
      <section class="sf-r" aria-live="polite">
        <div class="sf-top">
          <div><span class="sf-kicker">Taille recommandée</span><div class="sf-best" data-id="best">–</div></div>
          <div class="sf-conf"><span class="st" data-id="conf"></span><p data-id="advice"></p></div>
          ${opts.onChoose ? '<button type="button" class="btn primary" data-id="choose">Choisir cette taille</button>' : ''}
        </div>
        <div class="sf-sizes" data-id="sizes" role="group" aria-label="Essayer une taille"></div>
        <div class="sf-grid">
          <div class="sf-fit" data-id="fit"></div>
          <div class="sf-3d"><div class="sf-3d-host" data-id="host"></div><div class="views-labels sf-labels" data-id="labels"></div><p class="sf-note sf-drag">Glissez sur l’avatar pour le faire tourner.</p></div>
        </div>
        <details class="sf-est">
          <summary>Mesures estimées à partir de vos réponses</summary>
          <div class="tbl-wrap"><table><tbody data-id="est"></tbody></table></div>
          <p class="sf-note" data-id="warn"></p>
          ${opts.onApply ? '<button type="button" class="btn" data-id="apply">Utiliser ces mesures pour le sur-mesure</button>' : ''}
        </details>
      </section>`;

    const sync = () => {
      root.querySelectorAll('[data-sex]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.sex === p.sex)));
      root.querySelectorAll('[data-pref]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.pref === p.pref)));
      root.querySelectorAll('.sf-opt').forEach((b) => b.setAttribute('aria-pressed', String(+b.dataset.v === +p[b.dataset.q])));
      for (const k of ['age', 'height', 'weight']) if (document.activeElement !== id(k)) id(k).value = p[k];
    };

    let raf = 0;
    const draw3D = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        if (!window.Viewer3D || !Viewer3D.available()) { id('host').innerHTML = '<p class="nogl">Aperçu 3D indisponible (three.js / WebGL).</p>'; return; }
        if (!SF._v3) SF._v3 = Viewer3D.init(id('host'), id('labels'));
        Viewer3D.attach(id('host'), id('labels'));
        Viewer3D.setOptions({ garment: true, lines: false, duo: true });
        const sizeM = last.sizes[shown];
        Viewer3D.update({ body: Body.build(last.est.m), pat: Garment3D.patternData(sizeM, product.style), m: Object.assign({}, sizeM, { stature: last.est.m.stature }), s: product.style });
      });
    };

    const renderFit = () => {
      const r = last.reco.results.find((x) => x.size === shown);
      const cls = { 'idéal': 'ok', 'ajusté': 'warn', 'ample': 'warn', 'trop serré': 'bad', 'trop ample': 'bad', 'trop court': 'bad', 'trop long': 'warn' };
      id('fit').innerHTML = `<h4 class="sf-h4">Taille ${shown} sur vous</h4>` + r.zones.map((z) => `
        <div class="sf-row">
          <div class="sf-zone"><b>${z.zone}</b><span>${esc(z.text)}</span></div>
          <div class="sf-bar ${z.kind}" title="${z.verdict}"><i style="left:${((z.pos + 1) / 2) * 100}%" class="${cls[z.verdict]}"></i></div>
          <span class="st ${cls[z.verdict]}">${z.verdict}</span>
        </div>`).join('') +
        `<div class="sf-scale"><span>serré / court</span><span>idéal</span><span>ample / long</span></div>`;
      root.querySelectorAll('.sf-size').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.size === shown)));
      if (id('choose')) id('choose').textContent = `Choisir la taille ${shown}`;
      draw3D();
    };

    /* Phrase de synthèse : ce qui s'écarte de l'idéal dans la taille conseillée. */
    const summary = (r) => {
      const off = r.zones.filter((z) => z.verdict !== 'idéal');
      if (!off.length) return `La taille ${r.size} respecte l'aisance voulue sur toutes les zones.`;
      const parts = off.map((z) => (z.kind === 'longueur' ? `${z.zone.toLowerCase()} : ${z.text}` : `${z.verdict} ${z.zone.replace(/ \(.*\)/, '').toLowerCase() === 'tour de bras' ? 'aux bras' : 'en ' + z.zone.toLowerCase()}`));
      return `Meilleur compromis. À noter : ${parts.join(' ; ')}.`;
    };

    const compute = () => {
      const est = Estimator.estimate(p);
      const sizes = product.sizesFor(p.sex);
      const reco = Recommender.recommend(est.m, { order: product.order, sizes, style: product.style }, p.pref);
      last = { est, sizes, reco };
      shown = reco.best;
      id('best').textContent = reco.best;
      const cc = { 'élevée': 'ok', moyenne: 'ok', 'entre deux tailles': 'warn', faible: 'bad' }[reco.confidence];
      id('conf').className = 'st ' + cc;
      id('conf').textContent = 'confiance ' + reco.confidence;
      id('advice').textContent = reco.advice || summary(reco.results.find((r) => r.size === reco.best));
      const worst = Math.max(...reco.results.map((r) => r.total), 1);
      id('sizes').innerHTML = reco.results.map((r) => `<button type="button" class="sf-size${r.size === reco.best ? ' best' : ''}" data-size="${r.size}" title="Adéquation de la taille ${r.size} à votre profil — cliquez pour l’essayer">
        <b>${r.size}</b><span class="sf-score"><i style="width:${Math.max(6, 100 - (r.total / worst) * 100)}%"></i></span>${r.size === reco.best ? '<em>conseillée</em>' : ''}</button>`).join('');
      id('est').innerHTML = Object.keys(Estimator.LABELS).map((k) => `<tr><td>${Estimator.LABELS[k]}</td><td class="n">${fmt(est.m[k])} cm</td><td class="n sf-err">± ${fmt(est.err[k])}</td></tr>`).join('');
      id('warn').textContent = (est.warnings.length ? 'Attention : ' + est.warnings.join(' ; ') + '. ' : '') +
        `Erreur moyenne mesurée sur ${window.ANTHRO_MODEL[p.sex].n.toLocaleString('fr-FR')} personnes (${window.ANTHRO_MODEL.source}).`;
      renderFit();
      store(p);
    };

    root.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b || !root.contains(b)) return;
      if (b.dataset.sex) { p.sex = b.dataset.sex; if (p.sex === 'femme' && p.height === 176 && p.weight === 75) { p.height = 165; p.weight = 62; } }
      else if (b.dataset.pref) p.pref = b.dataset.pref;
      else if (b.dataset.q) p[b.dataset.q] = +b.dataset.v;
      else if (b.dataset.size) { shown = b.dataset.size; renderFit(); return; }
      else if (b.dataset.id === 'apply') { opts.onApply && opts.onApply(last.est, last.reco.best); return; }
      else if (b.dataset.id === 'choose') { opts.onChoose && opts.onChoose(shown, last); return; }
      else return;
      sync(); compute();
    });
    root.addEventListener('change', (e) => {
      const k = e.target.dataset && e.target.dataset.id;
      if (!['age', 'height', 'weight'].includes(k)) return;
      const lim = { age: [12, 95], height: [120, 215], weight: [30, 200] }[k];
      const v = parseFloat(String(e.target.value).replace(',', '.'));
      p[k] = isFinite(v) ? Math.min(lim[1], Math.max(lim[0], v)) : p[k];
      sync(); compute();
    });

    sync(); compute();
    return { refresh: () => { if (last) draw3D(); } };
  };

  /* Recommandation sans interface, à partir du profil enregistré (bandeau fiche produit). */
  SF.quick = function (product) {
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { saved = null; }
    if (!saved) return null;
    const p = Object.assign({}, DEFAULT, saved);
    const est = Estimator.estimate(p);
    return Recommender.recommend(est.m, { order: product.order, sizes: product.sizesFor(p.sex), style: product.style }, p.pref);
  };

  window.SizeFinder = SF;
})();
