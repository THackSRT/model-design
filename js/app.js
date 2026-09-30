/* Interface : état du modèle, contrôles, rendu des vues et exports. */
(function () {
  const MODEL = { ref: 'MOD-001', name: 'Ensemble kaftan à chevrons' };

  const SIZES = {
    S:  { chest: 92,  neck: 38, shoulder: 14.5, bicep: 30, waist: 78,  hip: 94,  outseam: 102, rise: 26, hemCirc: 36, tunicLength: 78 },
    M:  { chest: 100, neck: 40, shoulder: 15,   bicep: 32, waist: 86,  hip: 100, outseam: 104, rise: 27, hemCirc: 38, tunicLength: 80 },
    L:  { chest: 108, neck: 42, shoulder: 15.5, bicep: 34, waist: 94,  hip: 106, outseam: 106, rise: 28, hemCirc: 40, tunicLength: 82 },
    XL: { chest: 116, neck: 44, shoulder: 16,   bicep: 36, waist: 102, hip: 112, outseam: 107, rise: 29, hemCirc: 42, tunicLength: 84 },
  };
  const COMMON = { sleeveLength: 22, ease: 12, sideSlit: 12 };

  // Relevé sur la photo de référence (proportions ramenées en cm pour une taille M).
  const STYLE0 = {
    fabric: '#442721', accent: '#f2efe8', shoe: '#c98f5a',
    chevCount: 3, chevWidth: 20, chevBand: 4.3, chevGap: 1.8, chevDrop: 5, chevTop: 18.6, placketGap: 5,
    texture: true, shoes: true, showBody: true,
  };

  const MEAS = {
    tunic: [
      ['chest', 'Tour de poitrine', 70, 150, 0.5],
      ['neck', 'Tour de cou', 32, 52, 0.5],
      ['shoulder', "Longueur d'épaule", 11, 20, 0.5],
      ['bicep', 'Tour de bras', 22, 48, 0.5],
      ['tunicLength', 'Longueur tunique', 60, 110, 1],
      ['sleeveLength', 'Longueur manche', 12, 30, 0.5],
      ['ease', 'Aisance poitrine', 4, 24, 1],
      ['sideSlit', 'Fentes de côté', 0, 25, 1],
    ],
    pants: [
      ['waist', 'Tour de taille', 60, 140, 0.5],
      ['hip', 'Tour de bassin', 80, 150, 0.5],
      ['outseam', 'Longueur côté', 85, 120, 0.5],
      ['rise', 'Hauteur montant', 22, 34, 0.5],
      ['hemCirc', 'Tour de bas', 28, 52, 0.5],
    ],
  };
  const STYLE_CTRLS = [
    ['chevCount', 'Nombre de chevrons', 0, 5, 1, ''],
    ['chevWidth', 'Largeur chevron', 12, 28, 0.5, ' cm'],
    ['chevBand', 'Épaisseur bande', 2, 6.5, 0.1, ' cm'],
    ['chevGap', 'Espace entre bandes', 0.6, 3.5, 0.1, ' cm'],
    ['chevDrop', 'Profondeur du V', 1.5, 9, 0.5, ' cm'],
    ['chevTop', 'Hauteur sous encolure', 12, 26, 0.5, ' cm'],
    ['placketGap', 'Écart des passepoils', 3, 8, 0.5, ' cm'],
  ];

  const KEY = 'atelier-mod001-v1';
  const $ = (id) => document.getElementById(id);
  const fmt = (v, d = 1) => G.fmt(v, d);

  function fresh() {
    return { size: 'M', m: Object.assign({}, COMMON, SIZES.M), s: Object.assign({}, STYLE0), tab: 'croquis', zoom: 5, fabricW: 150 };
  }
  let state = fresh();
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (saved && saved.m && saved.s) state = Object.assign(fresh(), saved, { m: Object.assign(fresh().m, saved.m), s: Object.assign(fresh().s, saved.s) });
  } catch (e) { /* stockage indisponible */ }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* ignoré */ } };

  let embedded = true;
  try { embedded = window.self !== window.top; } catch (e) { embedded = true; }

  /* ---------- Contrôles ---------- */

  function buildControls() {
    for (const group of ['tunic', 'pants']) {
      const host = $('meas-' + group);
      host.innerHTML = MEAS[group].map(([k, label, min, max, step]) => `
        <div class="field"><label for="m-${k}">${label}</label>
          <div class="num"><input id="m-${k}" type="number" inputmode="decimal" min="${min}" max="${max}" step="${step}"><span>cm</span></div>
        </div>`).join('');
      MEAS[group].forEach(([k, , min, max]) => {
        $('m-' + k).addEventListener('change', (e) => {
          let v = parseFloat(String(e.target.value).replace(',', '.'));
          if (!isFinite(v)) v = state.m[k];
          v = Math.min(max, Math.max(min, v));
          state.m[k] = v; state.size = null;
          sync(); render();
        });
      });
    }
    $('style-ctrls').innerHTML = STYLE_CTRLS.map(([k, label, min, max, step]) => `
      <div class="slider"><label for="s-${k}">${label}</label><output id="o-${k}" for="s-${k}"></output>
        <input type="range" id="s-${k}" min="${min}" max="${max}" step="${step}"></div>`).join('');
    STYLE_CTRLS.forEach(([k]) => {
      $('s-' + k).addEventListener('input', (e) => { state.s[k] = parseFloat(e.target.value); sync(); render(); });
    });
    [['c-fabric', 'fabric'], ['c-accent', 'accent'], ['c-shoe', 'shoe']].forEach(([id, k]) =>
      $(id).addEventListener('input', (e) => { state.s[k] = e.target.value; render(); }));
    [['t-texture', 'texture'], ['t-shoes', 'shoes'], ['t-body', 'showBody']].forEach(([id, k]) =>
      $(id).addEventListener('change', (e) => { state.s[k] = e.target.checked; render(); }));
    document.querySelectorAll('.chip[data-size]').forEach((b) => b.addEventListener('click', () => {
      state.size = b.dataset.size;
      Object.assign(state.m, SIZES[state.size]);
      sync(); render();
    }));
    document.querySelectorAll('nav.tabs button').forEach((b) => b.addEventListener('click', () => {
      state.tab = b.id.replace('tab-', ''); sync(); render();
    }));
    $('zoom').addEventListener('input', (e) => { state.zoom = parseFloat(e.target.value); sync(); renderPatterns(); save(); });
    $('fabric-w').addEventListener('change', (e) => {
      const v = parseFloat(e.target.value); state.fabricW = isFinite(v) ? Math.min(180, Math.max(90, v)) : 150; sync(); render();
    });
    $('btn-reset').addEventListener('click', () => { const t = state.tab; state = fresh(); state.tab = t; sync(); render(); toast('Modèle d’origine rétabli'); });
    $('btn-copy').addEventListener('click', copySVG);
    $('btn-download').addEventListener('click', downloadSVG);
    if (embedded) $('btn-download').hidden = true;
  }

  function sync() {
    for (const g of ['tunic', 'pants']) MEAS[g].forEach(([k]) => { $('m-' + k).value = state.m[k]; });
    STYLE_CTRLS.forEach(([k, , , , , unit]) => { $('s-' + k).value = state.s[k]; $('o-' + k).textContent = fmt(state.s[k]) + unit; });
    $('c-fabric').value = state.s.fabric; $('c-accent').value = state.s.accent; $('c-shoe').value = state.s.shoe;
    $('t-texture').checked = !!state.s.texture; $('t-shoes').checked = !!state.s.shoes; $('t-body').checked = state.s.showBody !== false;
    document.querySelectorAll('.chip[data-size]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.size === state.size)));
    $('size-custom').hidden = !!state.size;
    ['croquis', 'patrons', 'coupe', 'fiche'].forEach((t) => {
      $('tab-' + t).setAttribute('aria-selected', String(state.tab === t));
      $('pane-' + t).hidden = state.tab !== t;
    });
    $('zoom').value = state.zoom; $('zoom-out').textContent = fmt(state.zoom) + ' px/cm';
    $('fabric-w').value = state.fabricW;
    const labels = { croquis: 'croquis', patrons: 'patrons', coupe: 'plan de coupe', fiche: 'fiche' };
    $('btn-copy').textContent = state.tab === 'fiche' ? 'Copier le SVG des patrons' : `Copier le SVG (${labels[state.tab]})`;
    $('btn-download').textContent = state.tab === 'croquis' ? 'Télécharger le croquis' : state.tab === 'coupe' ? 'Télécharger le plan de coupe' : 'Télécharger les patrons 1:1';
  }

  /* ---------- Données dérivées ---------- */

  let draft = null, marker = null;
  const sizeLabel = () => state.size || 'sur mesure';

  function compute() {
    draft = Pattern.draft(state.m, state.s);
    const main = draft.pieces.filter((p) => p.fabric === 'main');
    const items = main.map((p) => ({ id: p.id, w: p.bbox.w, h: p.bbox.h, fold: p.fold, piece: p }));
    marker = Pattern.pack(items, state.fabricW / 2, 1.5);
    const acc = draft.pieces.filter((p) => p.fabric === 'accent');
    let accItems = [];
    acc.forEach((p) => { for (let i = 0; i < p.qty; i++) accItems.push({ id: p.id + '-' + (i + 1), w: p.bbox.w, h: p.bbox.h, fold: false, piece: p }); });
    marker.accent = accItems.length ? Pattern.pack(accItems, Math.max(30, accItems[0].w + 2), 1) : null;
  }

  /* ---------- Rendus ---------- */

  function renderCroquis() {
    $('croquis').innerHTML = Croquis.render(state.m, state.s);
    const sm = draft.summary;
    $('croquis-facts').innerHTML = [
      ['Taille', sizeLabel()],
      ['Poitrine finie', fmt(sm.finishedChest) + ' cm'],
      ['Longueur tunique', fmt(state.m.tunicLength) + ' cm'],
      ['Manche', fmt(state.m.sleeveLength) + ' cm'],
      ['Chevrons', state.s.chevCount ? `${state.s.chevCount} × ${fmt(state.s.chevWidth)} cm` : 'aucun'],
      ['Ouverture devant', fmt(sm.opening) + ' cm'],
      ['Tour de bas pantalon', fmt(state.m.hemCirc) + ' cm'],
    ].map(([a, b]) => `<dt>${a}</dt><dd>${b}</dd>`).join('');
  }

  function patternsSVG(scale, forExport) {
    const pieces = draft.pieces;
    const items = pieces.map((p) => ({ id: p.id, w: p.bboxLabel.w, h: p.bboxLabel.h, fold: false, piece: p }));
    const W = 175, M = 4;
    const packed = Pattern.pack(items, W - 2 * M, 4);
    const top = 16;
    const H = Math.ceil(packed.length + top + M + 2);
    const ctx = { model: MODEL.ref, size: sizeLabel() };
    const o = [];
    const dims = forExport ? `width="${W}cm" height="${H}cm"` : `width="${(W * scale).toFixed(0)}" height="${(H * scale).toFixed(0)}"`;
    o.push(`<svg xmlns="http://www.w3.org/2000/svg" ${dims} viewBox="0 0 ${W} ${H}">`);
    o.push(`<style>${Pattern.pieceCSS}.gr1{stroke:#e2e7ee;stroke-width:.03}.gr10{stroke:#c9d2df;stroke-width:.06}.hdr{font:800 2.2px 'Archivo','Arial Narrow',Arial,sans-serif;fill:#1b1d1f}.sub{font:400 .9px 'IBM Plex Mono',monospace;fill:#5c6167}</style>`);
    o.push(`<rect width="${W}" height="${H}" fill="#fff"/>`);
    // quadrillage 1 cm / 10 cm
    const g1 = [], g10 = [];
    for (let x = 0; x <= W; x++) (x % 10 ? g1 : g10).push(`M${x} 0V${H}`);
    for (let y = 0; y <= H; y++) (y % 10 ? g1 : g10).push(`M0 ${y}H${W}`);
    o.push(`<path class="gr1" d="${g1.join('')}"/><path class="gr10" d="${g10.join('')}"/>`);
    o.push(`<text class="hdr" x="${M}" y="5.5">${MODEL.ref} · ${MODEL.name} — patrons taille ${ctx.size}</text>`);
    o.push(`<text class="sub" x="${M}" y="7.6">Coutures comprises · 1 carreau = 1 cm · ${pieces.length} pièces</text>`);
    // carré test 10 cm
    o.push(`<g transform="translate(${W - M - 10} 1.5)"><rect width="10" height="10" fill="none" stroke="#1b1d1f" stroke-width=".08"/><text class="sub" x="5" y="5.4" text-anchor="middle">10 × 10 cm</text></g>`);
    packed.placed.forEach((it) => {
      const p = it.piece, bb = p.bboxLabel;
      o.push(`<g transform="translate(${(M + it.x - bb.minX).toFixed(2)} ${(top + it.y - bb.minY).toFixed(2)})">${Pattern.renderPiece(p, ctx)}</g>`);
    });
    o.push('</svg>');
    return o.join('');
  }

  function renderPatterns() {
    $('patterns').innerHTML = patternsSVG(state.zoom, false);
  }

  function markerSVG(scale, forExport) {
    const fw = state.fabricW / 2;
    const L = Math.ceil(marker.length + 4);
    const padL = 6, padT = 8, W = fw + padL + 8, H = L + padT + 4;
    const dims = forExport ? `width="${W}cm" height="${H}cm"` : `width="${(W * scale).toFixed(0)}" height="${(H * scale).toFixed(0)}"`;
    const o = [`<svg xmlns="http://www.w3.org/2000/svg" ${dims} viewBox="0 0 ${W} ${H}">`];
    o.push(`<style>.lbl{font:700 3px 'Archivo','Arial Narrow',Arial,sans-serif;fill:#1b1d1f}.sm{font:400 1.8px 'IBM Plex Mono',monospace;fill:#5c6167}.edge{font:600 1.3px 'IBM Plex Mono',monospace;fill:#5c6167;letter-spacing:.1px}</style>`);
    o.push(`<rect width="${W}" height="${H}" fill="#fff"/>`);
    o.push(`<rect x="${padL}" y="${padT}" width="${fw}" height="${L}" fill="${state.s.fabric}" fill-opacity=".14" stroke="#1b1d1f" stroke-width=".15"/>`);
    // graduations tous les 10 cm
    const ticks = [];
    for (let y = 0; y <= L; y += 10) { ticks.push(`M${padL + fw} ${padT + y}h1.2`); if (y % 50 === 0) o.push(`<text class="sm" x="${padL + fw + 1.6}" y="${padT + y + 0.45}">${y}</text>`); }
    o.push(`<path d="${ticks.join('')}" stroke="#1b1d1f" stroke-width=".12"/>`);
    o.push(`<path d="M${padL} ${padT}V${padT + L}" stroke="#1b1d1f" stroke-width=".5"/>`);
    o.push(`<text class="edge" transform="translate(${padL - 1.6} ${padT + L / 2}) rotate(-90)" text-anchor="middle">PLIURE DU TISSU</text>`);
    o.push(`<text class="edge" x="${padL + fw / 2}" y="${padT - 3}" text-anchor="middle">laize ${state.fabricW} cm pliée → ${fmt(fw)} cm · lisières à droite</text>`);
    marker.placed.forEach((it) => {
      const p = it.piece, bb = p.bbox;
      const tx = padL + it.x - bb.minX, ty = padT + it.y - bb.minY;
      o.push(`<g transform="translate(${tx.toFixed(2)} ${ty.toFixed(2)})">`);
      o.push(`<path d="${G.toPath(p.cut)}" fill="#fff" fill-opacity=".85" stroke="#1b1d1f" stroke-width=".14"/>`);
      o.push(`<path d="${G.toPath(p.seam)}" fill="none" stroke="#4d6fb8" stroke-width=".08" stroke-dasharray=".6 .35"/>`);
      if (p.grain) {
        const [a, b] = p.grain;
        o.push(`<path d="M${a.x.toFixed(2)} ${a.y.toFixed(2)}L${b.x.toFixed(2)} ${b.y.toFixed(2)}" stroke="#1b1d1f" stroke-width=".12"/>`);
      }
      const cx = bb.minX + bb.w / 2, cy = bb.minY + bb.h / 2;
      const qty = p.qty > 1 ? ` ×${p.qty}` : '';
      o.push(`<text class="lbl" x="${cx.toFixed(2)}" y="${cy.toFixed(2)}" text-anchor="middle">${p.id}${qty}</text>`);
      o.push(`<text class="sm" x="${cx.toFixed(2)}" y="${(cy + 2.8).toFixed(2)}" text-anchor="middle">${p.name.replace(/^.*– /, '').replace('Parementure', 'Parem.')}</text>`);
      o.push('</g>');
    });
    o.push('</svg>');
    return o.join('');
  }

  function metres(cm) { return Math.ceil((cm * 1.1) / 10) / 10; }

  function renderMarker() {
    const len = marker.length;
    const acc = marker.accent;
    const area = draft.pieces.filter((p) => p.fabric === 'main').reduce((a, p) => a + Math.abs(G.signedArea(p.cut)) * 2, 0); // pliure ou double épaisseur : 2 couches
    const eff = area / (len * state.fabricW) * 100;
    $('marker-metrics').innerHTML = [
      [fmt(metres(len), 1) + ' m', `tissu principal en ${state.fabricW} cm (placement ${fmt(len / 100, 2)} m + 10 %)`],
      [Math.round(eff) + ' %', 'efficience du placement'],
      [acc ? `${Math.ceil(acc.length + 4)} × ${Math.ceil(acc.placed[0].w + 4)} cm` : '—', 'tissu blanc pour chevrons'],
      [fmt(draft.summary.pipingLen * 1.15 / 100, 2) + ' m', 'passepoil (biais 3 cm + cordonnet)'],
    ].map(([a, b]) => `<div class="metric"><b>${a}</b><span>${b}</span></div>`).join('');
    $('marker').innerHTML = markerSVG(state.zoom * 0.9, false);
  }

  function renderTech() {
    const sm = draft.summary, m = state.m;
    const rows = draft.pieces.map((p) => `<tr><td class="n">${p.id}</td><td>${p.name}${p.interfacing ? ' <span class="pill">entoilé</span>' : ''}</td><td class="n">${p.qty}</td>
      <td>${p.fabric === 'accent' ? 'Blanc (appliqué)' : 'Principal'}</td><td>${p.fold ? 'oui' : '—'}</td>
      <td class="n">${fmt(p.bbox.w * (p.fold ? 2 : 1))} × ${fmt(p.bbox.h)} cm</td></tr>`).join('');
    const finished = [
      ['Tour de poitrine fini', sm.finishedChest],
      ['Longueur tunique (haut d’épaule → bas)', m.tunicLength],
      ['Longueur de manche', m.sleeveLength],
      ['Largeur de manche au biceps', sm.sleeveWidth],
      ['Tête de manche / emmanchure', `${fmt(sm.capLength)} / ${fmt(sm.armholeF + sm.armholeB)}`],
      ['Ouverture milieu devant', sm.opening],
      ['Passepoils de patte (×2)', sm.placketLen],
      ['Fentes de côté', m.sideSlit],
      ['Tour de bassin pantalon (fini)', m.hip + 4],
      ['Longueur côté pantalon', m.outseam],
      ['Tour de bas pantalon', m.hemCirc],
    ].map(([a, b]) => `<tr><td>${a}</td><td class="n">${typeof b === 'number' ? fmt(b) : b} cm</td></tr>`).join('');
    $('techsheet').innerHTML = `
      <div>
        <h2>${MODEL.ref} · ${MODEL.name}</h2>
        <p>Tunique droite à col rond, manches courtes passepoilées, ouverture milieu devant encadrée de deux passepoils blancs et ${state.s.chevCount} chevron${state.s.chevCount > 1 ? 's' : ''} appliqué${state.s.chevCount > 1 ? 's' : ''}. Pantalon droit ajusté à ceinture coulissée. Taille <b>${sizeLabel()}</b>.</p>
      </div>
      <div class="warn">Tracé de base généré automatiquement. Montez une toile d'essai avant la coupe définitive et reportez les corrections dans les mesures.</div>
      <div>
        <h3>Nomenclature des pièces</h3>
        <div class="tbl-wrap"><table><thead><tr><th>Réf.</th><th>Pièce</th><th>Qté</th><th>Tissu</th><th>Pliure</th><th>Encombrement</th></tr></thead><tbody>${rows}</tbody></table></div>
      </div>
      <div class="cols">
        <div><h3>Cotes finies</h3><div class="tbl-wrap"><table><tbody>${finished}</tbody></table></div></div>
        <div><h3>Fournitures</h3><div class="tbl-wrap"><table><tbody>
          <tr><td>Tissu principal (laize ${state.fabricW} cm)</td><td class="n">${fmt(metres(marker.length), 1)} m</td></tr>
          <tr><td>Tissu blanc pour chevrons</td><td class="n">${marker.accent ? `${Math.ceil(marker.accent.length + 4)} × ${Math.ceil(marker.accent.placed[0].w + 4)} cm` : '—'}</td></tr>
          <tr><td>Passepoil blanc (biais 3 cm + cordonnet 2 mm)</td><td class="n">${fmt(sm.pipingLen * 1.15 / 100, 2)} m</td></tr>
          <tr><td>Entoilage thermocollant léger</td><td class="n">30 × 40 cm</td></tr>
          <tr><td>Élastique 3,5 cm</td><td class="n">${sm.elastic} cm</td></tr>
          <tr><td>Cordon de serrage</td><td class="n">${Math.round(m.waist + 50)} cm</td></tr>
          <tr><td>Fil polyester assorti + fil blanc</td><td class="n">2 + 1 bobines</td></tr>
        </tbody></table></div></div>
      </div>
      <div class="cols">
        <div><h3>Montage — tunique</h3><ol class="steps">
          <li>Entoiler les parementures T4 et T5, surfiler leur bord extérieur.</li>
          <li>Préparer le passepoil : biais blanc de 3 cm replié sur le cordonnet, piqué au pied passepoil.</li>
          <li>Rentrer les bords des chevrons T6 de 0,7 cm, les épingler selon le tracé du devant et les surpiquer à 1 mm.</li>
          <li>Poser les deux passepoils de patte à ${fmt(state.s.placketGap / 2)} cm du milieu devant, de l'encolure jusqu'au premier chevron.</li>
          <li>Assembler les épaules du devant et du dos, puis celles des parementures.</li>
          <li>Épingler la parementure endroit contre endroit, piquer l'encolure et le tour de la fente à 3 mm de la ligne d'ouverture, fendre, cranter, retourner, surpiquer.</li>
          <li>Monter les manches à plat (1 cran devant, 2 crans dos, cran de tête sur l'épaule), passepoiler et ourler le bas de manche.</li>
          <li>Fermer dessous de manche et côtés d'une seule couture, arrêter au cran de fente.</li>
          <li>Ourler fentes et bas de tunique (rempli 1 + 2 cm).</li>
        </ol></div>
        <div><h3>Montage — pantalon</h3><ol class="steps">
          <li>Assembler côtés (P1 + P2) en faisant correspondre les crans de genou.</li>
          <li>Assembler les entrejambes.</li>
          <li>Piquer la fourche d'un seul trait (1 cran devant, 2 crans dos), doubler la couture dans l'arrondi.</li>
          <li>Assembler les deux moitiés de ceinture P3 au milieu dos, puis au milieu devant en laissant 2 cm ouverts sous le pli pour la sortie du cordon.</li>
          <li>Monter la ceinture, y glisser l'élastique (${sm.elastic} cm) et le cordon.</li>
          <li>Ourler le bas à 3 cm.</li>
        </ol></div>
      </div>`;
  }

  function render() {
    try {
      compute();
    } catch (e) {
      console.error(e);
      toast('Mesures incohérentes : le tracé n’a pas pu être calculé');
      return;
    }
    renderCroquis();
    if (state.tab === 'patrons') renderPatterns();
    if (state.tab === 'coupe') renderMarker();
    if (state.tab === 'fiche') renderTech();
    save();
  }

  /* ---------- Exports ---------- */

  function currentSVG() {
    if (state.tab === 'croquis') {
      return Croquis.render(state.m, state.s).replace('<svg ', '<svg width="500" height="1440" ');
    }
    if (state.tab === 'coupe') return markerSVG(1, true);
    return patternsSVG(1, true);
  }
  function fileName() {
    const s = (state.size || 'sur-mesure').toLowerCase();
    return `${MODEL.ref.toLowerCase()}-${state.tab === 'croquis' ? 'croquis' : state.tab === 'coupe' ? 'plan-de-coupe' : 'patrons-1-1'}-${s}.svg`;
  }
  function copySVG() {
    const svg = '<?xml version="1.0" encoding="UTF-8"?>\n' + currentSVG();
    const done = () => toast('SVG copié — collez-le dans Illustrator, Inkscape ou Figma');
    try {
      navigator.clipboard.writeText(svg).then(done, () => fallbackCopy(svg, done));
    } catch (e) { fallbackCopy(svg, done); }
  }
  function fallbackCopy(text, done) {
    const ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    ta.remove();
    ok ? done() : toast('Copie refusée par le navigateur');
  }
  function downloadSVG() {
    const blob = new Blob(['<?xml version="1.0" encoding="UTF-8"?>\n' + currentSVG()], { type: 'image/svg+xml' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = fileName();
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    toast('Fichier ' + fileName() + ' enregistré');
  }

  let toastTimer;
  function toast(msg) {
    let t = document.querySelector('.toast');
    if (!t) { t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
    t.textContent = msg; t.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, 2600);
  }

  buildControls();
  sync();
  render();
})();
