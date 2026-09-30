/*
 * Croquis : la tenue dessinée sur le mannequin vectorisé (repère = pixels de l'image mannequin).
 * Les longueurs du modèle (cm) sont converties avec l'échelle stylisée du croquis de mode.
 */
(function () {
  const C = {};
  const SX = 3.3;   // px / cm pour les ornements (largeurs)
  const SY = 3.45;  // px / cm pour les longueurs verticales du buste
  const HPS_Y = 100;

  const f = (n) => (Math.round(n * 10) / 10).toString();
  const P = (...pts) => pts.map((p, i) => (i ? ' ' : '') + f(p[0]) + ' ' + f(p[1])).join('');

  function shade(hex, k) {
    const n = parseInt(hex.slice(1), 16);
    let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    const t = k < 0 ? 0 : 255, a = Math.abs(k);
    r = Math.round(r + (t - r) * a); g = Math.round(g + (t - g) * a); b = Math.round(b + (t - b) * a);
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }

  C.render = function (m, s, opts = {}) {
    const MQ = window.MANNEQUIN;
    const fab = s.fabric, acc = s.accent;
    const dark = shade(fab, -0.45), deep = shade(fab, -0.25), light = shade(fab, 0.12);
    const ink = shade(fab, -0.62);

    // --- repères dépendant des mesures ---
    const hemY = Math.min(470, Math.max(330, HPS_Y + m.tunicLength * 3.45 - 0));
    const slitPx = m.sideSlit * SY * 0.9;
    const lx = 116 - (hemY - 378) * 0.09;   // côté gauche au bas
    const rx = 242 + (hemY - 384) * 0.09;   // côté droit au bas
    const hemYR = hemY + 6;

    // manches : longueur mesurée depuis le sommet d'épaule
    const sl = Math.min(30, Math.max(12, m.sleeveLength));
    const lho = [86 - (130 + sl * 3.0 - 195) * 0.09, 130 + sl * 3.0];
    const lhiY = Math.max(192, lho[1] + 7), lhi = [125 - (lhiY - 186) * 0.17, lhiY];
    const rhoY = 126 + sl * 3.0, rho = [266 + (rhoY - 170) * 0.2, rhoY];
    const rhiY = Math.max(186, rhoY + 6), rhi = [232 + (rhiY - 180) * 0.25, rhiY];

    const o = [];
    o.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${MQ.viewBox.join(' ')}" class="croquis-svg" role="img" aria-label="Croquis de la tenue sur le mannequin">`);
    o.push('<defs>');
    o.push(`<pattern id="tex" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(0)">
      <path d="M0 2.2 L1.5 0.7 L3 2.2 L4.5 0.7 L6 2.2 M0 5.2 L1.5 3.7 L3 5.2 L4.5 3.7 L6 5.2" fill="none" stroke="${ink}" stroke-opacity=".28" stroke-width=".45"/>
    </pattern>`);
    o.push(`<linearGradient id="gSide" x1="0" x2="1"><stop offset="0" stop-color="#000" stop-opacity=".38"/><stop offset=".22" stop-color="#000" stop-opacity="0"/><stop offset=".72" stop-color="#fff" stop-opacity=".05"/><stop offset=".86" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".42"/></linearGradient>`);
    o.push(`<linearGradient id="gLeg" x1="0" x2="1"><stop offset="0" stop-color="#000" stop-opacity=".3"/><stop offset=".35" stop-color="#fff" stop-opacity=".06"/><stop offset=".7" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".38"/></linearGradient>`);
    o.push(`<linearGradient id="gShoe" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".18"/><stop offset="1" stop-color="#000" stop-opacity=".25"/></linearGradient>`);
    for (const k of Object.keys(MQ.regions)) o.push(`<clipPath id="clip-${k}"><path d="${MQ.regions[k]}"/></clipPath>`);
    o.push('</defs>');

    const body = s.showBody !== false;
    if (body) o.push(`<path d="${MQ.lines}" fill="#1c1c1c" fill-rule="evenodd" class="mq-lines"/>`);

    // --- chaussures (sous le pantalon) ---
    if (s.shoes && body) {
      for (const k of ['footR', 'footL']) {
        o.push(`<path d="${MQ.regions[k]}" fill="${s.shoe}" stroke="${shade(s.shoe, -0.55)}" stroke-width=".8"/>`);
        o.push(`<path d="${MQ.regions[k]}" fill="url(#gShoe)"/>`);
        o.push(`<g clip-path="url(#clip-${k})"><path d="${MQ.lines}" fill="${shade(s.shoe, -0.6)}" fill-rule="evenodd"/></g>`);
      }
      o.push(`<path d="M148 676 q7 3 13 1 M150 681 q6 3 11 1 M184 655 q7 2 12 0 M185 660 q6 2 11 0" fill="none" stroke="${shade(s.shoe, -0.5)}" stroke-width=".7" stroke-linecap="round"/>`);
    }

    // --- pantalon ---
    const legR = `M178 300 L234 300 C236 340 236 384 236 430 C235 460 234 480 232 525 C229 545 222 562 214 590 C209 606 206 620 205.5 646
      C196 648.5 184 648 175.5 646 C176 632 177 620 177.5 612 C179 590 180 560 184 538 C187 522 194 502 195 478 C192 452 186 420 181 380 Z`;
    const legL = `M121 300 L182 300 L182 345 C178 368 176 385 175 400 C173 425 172.5 450 172.5 480 C172.5 505 174 525 173.5 555
      C173 585 171 610 172.5 640 C174 652 176.5 662 178 670.5 C166 673 152 672 140.5 668.5 C138 650 134 630 129 598
      C125 572 123 548 125 525 C127 500 127 478 123 450 C119 425 116.5 400 116.5 380 L119 330 Z`;
    for (const [d, id] of [[legR, 'R'], [legL, 'L']]) {
      o.push(`<path d="${d}" fill="${fab}"/>`);
      if (s.texture) o.push(`<path d="${d}" fill="url(#tex)"/>`);
      o.push(`<path d="${d}" fill="url(#gLeg)"/>`);
      o.push(`<path d="${d}" fill="none" stroke="${ink}" stroke-width="1" stroke-linejoin="round"/>`);
    }
    // plis
    o.push(`<path d="M150 470 q3 18 1 40 M148 612 q4 20 2 44 M141 648 q12 5 26 2 M137 656 q10 4 22 1 M200 470 q-4 30 -8 60 M190 600 q-2 20 0 38 M184 636 q9 3 17 1"
      fill="none" stroke="${dark}" stroke-width=".7" stroke-linecap="round" stroke-opacity=".75"/>`);

    // --- tunique (corps) ---
    const lNP = [147, 102], rNP = [191, 97], cfN = [172, 118];
    const tunic = `M${P(lNP)} C${P([150, 113], [160, 118.5], cfN)} C${P([182, 118.5], [189, 108], rNP)}
      C${P([210, 101], [232, 107], [244, 116])} L${P([253, 133])} L${P([234, 178])}
      C${P([236, 230], [239, 300], [rx, hemYR])}
      C${P([200, hemYR + 3], [150, hemY + 2], [lx, hemY])}
      C${P([118, 320], [122, 250], [124, 188])}
      L${P([99, 138])} C${P([106, 125], [128, 110], lNP)} Z`;
    o.push(`<path d="${tunic}" fill="${fab}"/>`);
    if (s.texture) o.push(`<path d="${tunic}" fill="url(#tex)"/>`);
    o.push(`<path d="${tunic}" fill="url(#gSide)"/>`);
    // fentes de côté
    if (m.sideSlit > 0) {
      o.push(`<path d="M${P([lx + 2.2, hemY - slitPx])} L${P([lx - 1.2, hemY + 0.5], [lx + 3.8, hemY + 0.8])} Z" fill="${dark}"/>`);
      o.push(`<path d="M${P([rx - 2.2, hemYR - slitPx])} L${P([rx + 1.2, hemYR + 0.5], [rx - 3.8, hemYR + 0.8])} Z" fill="${dark}"/>`);
    }
    // plis de la tunique
    o.push(`<path d="M132 250 q4 40 2 90 M226 240 q-3 50 0 110 M160 300 q-2 30 1 60 M205 330 q2 20 0 45 M140 205 q10 6 16 22 M222 205 q-8 8 -12 22"
      fill="none" stroke="${dark}" stroke-width=".7" stroke-linecap="round" stroke-opacity=".6"/>`);
    o.push(`<path d="${tunic}" fill="none" stroke="${ink}" stroke-width="1.1" stroke-linejoin="round"/>`);

    // --- ornements devant (repère local : origine au milieu devant de l'encolure, suit l'inclinaison du buste) ---
    const k = 0.09;
    o.push(`<g transform="matrix(1 0 ${k} 1 ${cfN[0]} ${cfN[1]})">`);
    const cw = s.chevWidth / 2 * SX, dv = s.chevDrop * SX, bt = s.chevBand * SX;
    const top0 = s.chevTop * SX;
    const px = s.placketGap / 2 * SX;
    const pipeEnd = s.chevCount > 0 ? top0 + dv * (1 - Math.min(1, px / cw)) : top0 + 60;
    o.push(`<path d="M${f(-px)} 0.6 V${f(pipeEnd)} M${f(px)} 0.6 V${f(pipeEnd)}" stroke="${acc}" stroke-width="1.35" fill="none"/>`);
    o.push(`<path d="M${f(-0.2)} 0.6 V${f(pipeEnd - 3)}" stroke="${dark}" stroke-width=".55" fill="none"/>`);
    for (let i = 0; i < s.chevCount; i++) {
      const t = top0 + i * (s.chevBand + s.chevGap) * SX;
      const d = `M${f(-cw)} ${f(t)} L0 ${f(t + dv)} L${f(cw)} ${f(t)} L${f(cw)} ${f(t + bt)} L0 ${f(t + dv + bt)} L${f(-cw)} ${f(t + bt)} Z`;
      o.push(`<path d="${d}" fill="${acc}" stroke="${shade(acc, -0.25)}" stroke-width=".35"/>`);
      o.push(`<path d="${d}" fill="url(#tex)" opacity=".25"/>`);
    }
    o.push('</g>');

    // --- avant-bras et mains par-dessus la tunique ---
    if (body) {
      for (const k2 of ['armL', 'armR']) {
        o.push(`<path d="${MQ.regions[k2]}" fill="#fff"/>`);
        o.push(`<g clip-path="url(#clip-${k2})"><path d="${MQ.lines}" fill="#1c1c1c" fill-rule="evenodd"/></g>`);
      }
    }

    // --- manches ---
    const sleeveL = `M106.5 128.2 C98 131 92 145 90 160 C89 172 ${f(lho[0] + 1)} ${f(lho[1] - 20)} ${P(lho)}
      C${P([lho[0] + 10, lho[1] + 2], [lhi[0] - 10, lhi[1] - 1], lhi)}
      C${P([lhi[0] + 1, lhi[1] - 5], [125, 192], [124.5, 186])} C116 170 110 150 106.5 128.2 Z`;
    const sleeveR = `M244 116 C252 121 258 132 260 148 C262 160 ${f(rho[0] - 2)} ${f(rho[1] - 18)} ${P(rho)}
      C${P([rho[0] - 10, rho[1] + 3], [rhi[0] + 8, rhi[1] + 1], rhi)}
      C${P([rhi[0] - 1, rhi[1] - 5], [233, 186], [233.5, 179])} C240 160 243 138 244 116 Z`;
    for (const d of [sleeveL, sleeveR]) {
      o.push(`<path d="${d}" fill="${fab}"/>`);
      if (s.texture) o.push(`<path d="${d}" fill="url(#tex)"/>`);
      o.push(`<path d="${d}" fill="url(#gSide)" opacity=".8"/>`);
      o.push(`<path d="${d}" fill="none" stroke="${ink}" stroke-width="1.1" stroke-linejoin="round"/>`);
    }
    o.push(`<path d="M${P([lho[0] + 0.4, lho[1] - 0.6])} C${P([lho[0] + 10, lho[1] + 1.4], [lhi[0] - 10, lhi[1] - 2], [lhi[0] - 0.4, lhi[1] - 1.2])}
      M${P([rho[0] - 0.4, rho[1] - 0.6])} C${P([rho[0] - 10, rho[1] + 2.4], [rhi[0] + 8, rhi[1]], [rhi[0] + 0.4, rhi[1] - 1.2])}"
      fill="none" stroke="${acc}" stroke-width="1.5" stroke-linecap="round"/>`);
    o.push(`<path d="M100 160 q2 14 8 26 M256 150 q2 16 -4 30" fill="none" stroke="${dark}" stroke-width=".6" stroke-opacity=".6" stroke-linecap="round"/>`);
    // couture d'épaule
    o.push(`<path d="M106.5 128.2 C114 165 118 180 124.5 186 M244 116 C242 140 238 165 233.5 179" fill="none" stroke="${ink}" stroke-width=".5" stroke-opacity=".7"/>`);

    o.push('</svg>');
    return o.join('\n');
  };

  window.Croquis = C;
})();
