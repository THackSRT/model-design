/*
 * Avatar paramétrique : un corps construit à partir des mesures du client.
 * Chaque partie (buste, jambes, bras, mains, pieds, tête) est un « loft » d'anneaux
 * dont le périmètre est calé sur la mesure correspondante (tour de poitrine, de taille…).
 * Unités : cm. Repère : y vers le haut (sol = 0), z vers l'avant, x vers la gauche du client.
 * Aucune dépendance : le rendu 3D est fait par js/viewer3d.js.
 */
(function () {
  const TAU = Math.PI * 2;
  const B = { N: 72 };

  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  B.lerp = lerp; B.clamp = clamp;
  B.smooth = (e0, e1, x) => { const t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); };
  const angDiff = (a, b) => { let d = a - b; while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU; return d; };

  /* ---------- Anneaux 2D (superellipse + bosses) ---------- */

  // Angle φ : 0 = côté +u, π/2 = devant (+v). L'anneau commence au dos (φ = -π/2).
  B.phi = (k, N) => -Math.PI / 2 + TAU * k / N;

  B.ringPts = function (sh, N = B.N) {
    const e = 2 / (sh.n || 2);
    const pts = [];
    for (let k = 0; k < N; k++) {
      const ph = B.phi(k, N);
      const c = Math.cos(ph), s = Math.sin(ph);
      let u = sh.a * Math.sign(c) * Math.pow(Math.abs(c), e);
      let v = (s >= 0 ? sh.bf : sh.bb) * Math.sign(s) * Math.pow(Math.abs(s), e);
      if (sh.lobes) {
        for (const L of sh.lobes) {
          const f = L.amp * Math.exp(-((angDiff(ph, L.phi) / L.w) ** 2));
          if (f > 1e-4) { const r = Math.hypot(u, v) || 1; u += (u / r) * f; v += (v / r) * f; }
        }
      }
      pts.push([u, v]);
    }
    return pts;
  };

  B.perim = function (pts) {
    let p = 0;
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length];
      p += Math.hypot(a[0] - b[0], a[1] - b[1]);
    }
    return p;
  };

  /* Forme d'anneau dont le périmètre vaut C. k = profondeur / largeur ; fr/br : répartition devant / dos. */
  B.shape = function (C, k, n, opts = {}) {
    const a0 = C / TAU;
    const sh = { a: a0, bf: a0 * k * (opts.fr || 1), bb: a0 * k * (opts.br || 1), n, lobes: opts.lobes || null };
    for (let i = 0; i < 8; i++) {
      const f = C / B.perim(B.ringPts(sh, 96));
      sh.a *= f; sh.bf *= f; sh.bb *= f;
    }
    return sh;
  };
  const dims = (a, bf, bb, n, lobes) => ({ a, bf, bb, n: n || 2, lobes: lobes || null });

  /* ---------- Loft : densification Catmull-Rom des anneaux clés ---------- */

  const cr = (p0, p1, p2, p3, t) => {
    const t2 = t * t, t3 = t2 * t;
    return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
  };

  /*
   * part = { U, V, keys: [{ c:[x,y,z], sh, t? }], sub, capStart?, capEnd? }
   * Retourne les anneaux densifiés : { rings: [{ c, t, pts2: [[u,v]], world: [[x,y,z]] }], U, V, caps }.
   */
  B.loft = function (part) {
    const N = B.N;
    const keys = part.keys.map((k) => Object.assign({}, k, { pts: k.pts || B.ringPts(k.sh, N) }));
    const sub = part.sub || 4;
    const rings = [];
    const K = keys.length;
    for (let i = 0; i < K - 1; i++) {
      const k0 = keys[Math.max(0, i - 1)], k1 = keys[i], k2 = keys[i + 1], k3 = keys[Math.min(K - 1, i + 2)];
      for (let j = 0; j < sub; j++) {
        const t = j / sub;
        const c = [0, 1, 2].map((q) => cr(k0.c[q], k1.c[q], k2.c[q], k3.c[q], t));
        const pts2 = k1.pts.map((_, n) => [
          cr(k0.pts[n][0], k1.pts[n][0], k2.pts[n][0], k3.pts[n][0], t),
          cr(k0.pts[n][1], k1.pts[n][1], k2.pts[n][1], k3.pts[n][1], t),
        ]);
        rings.push({ c, t: lerp(k1.t || 0, k2.t || 0, t), pts2 });
      }
    }
    const last = keys[K - 1];
    rings.push({ c: last.c.slice(), t: last.t || 0, pts2: last.pts.map((p) => p.slice()) });
    const U = part.U, V = part.V;
    rings.forEach((r) => {
      r.world = r.pts2.map(([u, v]) => [r.c[0] + U[0] * u + V[0] * v, r.c[1] + U[1] * u + V[1] * v, r.c[2] + U[2] * u + V[2] * v]);
    });
    return { rings, U, V, capStart: part.capStart || null, capEnd: part.capEnd || null };
  };

  /* ---------- Corps ---------- */

  B.DEFAULTS = {
    homme: { stature: 176, wrist: 17, armLength: 60, thigh: 57, knee: 38, calf: 37, ankle: 23, belly: 0.15, seat: 0.35, bust: 0 },
    femme: { stature: 165, wrist: 15.5, armLength: 56, thigh: 58, knee: 37, calf: 35, ankle: 21.5, belly: 0.1, seat: 0.6, bust: 0.6 },
  };

  /* Repères de hauteur (cm) calculés à partir de la stature et des mesures verticales. */
  B.landmarks = function (m) {
    const H = m.stature;
    const L = { H };
    L.chin = H * 0.868;
    L.neckBase = H * 0.83;                       // point haut d'épaule (HPS)
    L.shoulder = L.neckBase - 4.5;               // acromion (même pente que le patron)
    L.chest = H * 0.72;
    L.waist = m.outseam + 3;                     // la longueur côté s'arrête à 3 cm du sol
    L.hip = L.waist - H * 0.11;
    L.crotch = L.waist - m.rise;
    L.knee = H * 0.285;
    L.calf = L.knee - H * 0.075;
    L.ankle = H * 0.045;
    L.shoulderHalf = (m.neck / TAU) * 1.12 + m.shoulder * 0.97; // demi-carrure (acromion)
    return L;
  };

  B.build = function (m) {
    const sex = m.sex === 'femme' ? 'femme' : 'homme';
    const L = B.landmarks(m);
    const H = L.H, hs = H / 176;
    const X = [1, 0, 0], Y = [0, 1, 0], Z = [0, 0, 1];
    const parts = {};

    // ----- buste (du cou à l'entrejambe) -----
    const chestK = sex === 'femme' ? 0.78 : 0.76;
    const bust = (m.bust || 0) * 5;               // saillie de poitrine (cm)
    const belly = (m.belly || 0) * 7;
    const seat = (m.seat || 0) * 4;
    const chestLobes = [
      { phi: Math.PI / 2 - 0.5, amp: sex === 'femme' ? bust : 0.9, w: sex === 'femme' ? 0.36 : 0.45 },
      { phi: Math.PI / 2 + 0.5, amp: sex === 'femme' ? bust : 0.9, w: sex === 'femme' ? 0.36 : 0.45 },
      { phi: -Math.PI / 2 - 0.55, amp: 0.8, w: 0.5 }, { phi: -Math.PI / 2 + 0.55, amp: 0.8, w: 0.5 }, // omoplates
    ];
    const chest = B.shape(m.chest, chestK, 2.45, { fr: 1.02, br: 0.98, lobes: chestLobes });
    const waist = B.shape(m.waist, 0.78, 2.3, { fr: 1.05, br: 0.95, lobes: [{ phi: Math.PI / 2, amp: belly, w: 0.7 }] });
    const hipLobes = [{ phi: -Math.PI / 2 - 0.42, amp: 1 + seat, w: 0.42 }, { phi: -Math.PI / 2 + 0.42, amp: 1 + seat, w: 0.42 }];
    const hip = B.shape(m.hip, 0.72, 2.4, { fr: 1.0, br: 0.95, lobes: hipLobes });
    const neckBase = B.shape(m.neck * 1.12, 0.92, 2.1);
    const aSh = L.shoulderHalf - 2.8;
    const underChest = B.shape(lerp(m.chest, m.waist, 0.45), 0.74, 2.45, {
      lobes: [{ phi: Math.PI / 2, amp: belly * 0.35, w: 0.7 }].concat(sex === 'femme' ? [
        { phi: Math.PI / 2 - 0.5, amp: bust * 0.25, w: 0.4 }, { phi: Math.PI / 2 + 0.5, amp: bust * 0.25, w: 0.4 }] : []),
    });
    const abdomen = B.shape(lerp(m.waist, m.hip, 0.6), 0.76, 2.35, {
      lobes: [{ phi: Math.PI / 2, amp: belly * 0.8, w: 0.75 }, { phi: -Math.PI / 2 - 0.42, amp: seat * 0.5, w: 0.45 }, { phi: -Math.PI / 2 + 0.42, amp: seat * 0.5, w: 0.45 }],
    });
    parts.torso = {
      U: X, V: Z, sub: 5,
      keys: [
        { c: [0, L.chin - 1.5, 2.2], sh: B.shape(m.neck * 0.93, 1, 2) },
        { c: [0, (L.chin + L.neckBase) / 2, 1.3], sh: B.shape(m.neck * 0.97, 0.97, 2) },
        { c: [0, L.neckBase, 0.4], sh: neckBase },
        { c: [0, L.neckBase - 2.2, -0.2], sh: dims(lerp(neckBase.a, aSh, 0.55) + 0.8, chest.bf * 0.62, chest.bb * 0.7, 2.4) },
        { c: [0, L.shoulder + 0.3, -0.5], sh: dims(aSh, chest.bf * 0.72, chest.bb * 0.8, 2.8) },
        { c: [0, L.shoulder - 6, -0.2], sh: dims(Math.max(chest.a, aSh - 1.2), chest.bf * 0.92, chest.bb * 0.95, 2.7, chestLobes.map((l) => Object.assign({}, l, { amp: l.amp * 0.6 }))) },
        { c: [0, L.chest, 0.2], sh: chest },
        { c: [0, lerp(L.chest, L.waist, 0.45), 0.1], sh: underChest },
        { c: [0, L.waist, 0], sh: waist },
        { c: [0, (L.waist + L.hip) / 2, -0.3], sh: abdomen },
        { c: [0, L.hip, -0.6], sh: hip },
        { c: [0, L.crotch + 4, -0.4], sh: dims(hip.a * 0.97, hip.bf * 0.82, hip.bb * 0.87, 2.3, hipLobes.map((l) => Object.assign({}, l, { amp: l.amp * 0.7 }))) },
        { c: [0, L.crotch + 0.6, 0], sh: dims(hip.a * 0.62, hip.bf * 0.42, hip.bb * 0.5, 2.2) },
      ],
      capStart: [0, L.chin + 1, 2.4], capEnd: [0, L.crotch - 0.8, 0],
    };

    // ----- jambes -----
    const hjX = hip.a * 0.46, ankleX = 8.5 * hs;
    const legKeys = (s) => {
      const at = (y) => { const t = (L.crotch + 5 - y) / (L.crotch + 5 - L.ankle); return [s * lerp(hjX, ankleX, t), y]; };
      const K = [
        [L.crotch + 5, B.shape(m.thigh * 0.98, 0.9, 2.2), -0.4],
        [L.crotch + 1, B.shape(m.thigh * 1.02, 0.92, 2.2), -0.2],
        [L.crotch - 5, B.shape(m.thigh, 0.94, 2.1, { fr: 1.05, br: 0.95 }), 0],
        [(L.crotch + L.knee) / 2, B.shape(m.thigh * 0.87, 0.95, 2.1, { fr: 1.05 }), 0.2],
        [L.knee + 8, B.shape(m.knee * 1.1, 0.92, 2.1), 0.4],
        [L.knee + 2, B.shape(m.knee * 1.01, 0.9, 2.2), 0.6],
        [L.knee, B.shape(m.knee, 0.9, 2.2, { fr: 1.05, br: 0.95 }), 0.6],
        [L.knee - 5, B.shape(m.knee * 0.98, 0.95, 2.1), 0.3],
        [L.calf, B.shape(m.calf, 1.0, 2.1, { fr: 0.82, br: 1.18 }), -0.2],
        [lerp(L.calf, L.ankle, 0.5), B.shape(lerp(m.calf, m.ankle, 0.6), 0.98, 2.1, { fr: 0.9, br: 1.1 }), 0],
        [L.ankle + 5, B.shape(m.ankle * 1.04, 0.95, 2), 0.2],
        [L.ankle, B.shape(m.ankle, 0.95, 2), 0.3],
        [L.ankle - 3, B.shape(m.ankle * 1.12, 1.05, 2), 0.6],
      ];
      return K.map(([y, sh, dz]) => { const [x] = at(y); return { c: [x, y, dz], sh }; });
    };
    parts.legR = { U: X, V: Z, sub: 4, keys: legKeys(-1), capStart: [-hjX, L.crotch + 8, -0.4], capEnd: null };
    parts.legL = { U: X, V: Z, sub: 4, keys: legKeys(1), capStart: [hjX, L.crotch + 8, -0.4], capEnd: null };

    // ----- bras + mains (axe incliné de 8°, paumes vers les cuisses) -----
    const alpha = 9 * Math.PI / 180;
    const Larm = m.armLength;
    const bic = m.bicep;
    const arm = (s) => {
      const S = [s * (L.shoulderHalf - 3.4), L.shoulder - 3, -0.8];
      const d = [s * Math.sin(alpha), -Math.cos(alpha), 0];
      const U = [s * Math.cos(alpha), Math.sin(alpha), 0];
      const at = (t) => [S[0] + d[0] * t, S[1] + d[1] * t, S[2] + d[2] * t];
      const armK = [
        [-2, B.shape(bic * 1.15, 1.0, 2)],
        [0.5, B.shape(bic * 1.32, 1.0, 2)],
        [5, B.shape(bic * 1.28, 1.02, 2)],
        [12, B.shape(bic * 1.07, 1.05, 2)],
        [Larm * 0.32, B.shape(bic, 1.08, 2, { fr: 1.08, br: 0.92 })],
        [Larm * 0.47, B.shape(bic * 0.9, 1.05, 2)],
        [Larm * 0.53, B.shape(bic * 0.84, 1.0, 2)],
        [Larm * 0.63, B.shape(bic * 0.87, 1.05, 2)],
        [Larm * 0.82, B.shape(lerp(bic * 0.8, m.wrist, 0.6), 1.2, 2)],
        [Larm - 1, B.shape(m.wrist, 1.35, 2)],
      ].map(([t, sh]) => ({ c: at(t), sh, t }));
      const h = hs;
      const handK = [
        [Larm + 1.5, dims(2.0 * h, 3.3 * h, 3.3 * h, 2.2)],
        [Larm + 4, dims(1.85 * h, 4.1 * h, 4.1 * h, 2.4, [{ phi: Math.PI / 2, amp: 0.7 * h, w: 0.5 }])],
        [Larm + 8, dims(1.75 * h, 4.4 * h, 4.3 * h, 2.5)],
        [Larm + 10.5, dims(1.5 * h, 4.2 * h, 4.1 * h, 2.5)],
        [Larm + 14, dims(1.3 * h, 3.8 * h, 3.7 * h, 2.4)],
        [Larm + 17, dims(1.1 * h, 2.9 * h, 2.9 * h, 2.2)],
        [Larm + 18.5, dims(0.75 * h, 1.6 * h, 1.6 * h, 2)],
      ].map(([t, sh]) => ({ c: at(t), sh, t }));
      return {
        arm: { U, V: Z, sub: 4, keys: armK, capStart: at(-3.9), capEnd: null, S, d },
        hand: { U, V: Z, sub: 3, keys: [armK[armK.length - 1]].concat(handK), capStart: null, capEnd: at(Larm + 19.2) },
      };
    };
    const aR = arm(-1), aL = arm(1);
    parts.armR = aR.arm; parts.handR = aR.hand; parts.armL = aL.arm; parts.handL = aL.hand;

    // ----- pieds -----
    const foot = (s, inflate = 0) => {
      const ang = s * 7 * Math.PI / 180;          // pointes légèrement ouvertes
      const Uf = [Math.cos(ang), 0, -Math.sin(ang)], Vf = [0, 1, 0], Df = [Math.sin(ang), 0, Math.cos(ang)];
      const O = [s * ankleX, 0, 0.5];
      const h = hs, i = inflate;
      const K = [
        [-6.3, 2.0, 2.2, 2.3, 2.5], [-5.0, 2.9, 4.0, 2.9, 3.0], [-1.5, 3.3, 5.6, 3.1, 3.2], [3.0, 3.8, 3.7, 2.7, 2.8],
        [8.0, 4.3, 2.6, 2.2, 2.3], [12.5, 4.7, 2.0, 1.75, 1.85], [16.0, 4.4, 1.55, 1.3, 1.4], [18.6, 3.2, 1.1, 1.0, 1.1],
      ].map(([z, a, up, dn, cy]) => ({
        c: [O[0] + Df[0] * z * h, cy * h + i * 0.25, O[2] + Df[2] * z * h],
        sh: dims(a * h + i, up * h + i, dn * h + i * 0.2, 2.6),
      }));
      return { U: Uf, V: Vf, sub: 3, keys: K, capStart: [O[0] + Df[0] * (-6.9 * h - i), 2.3 * h, O[2] + Df[2] * (-6.9 * h - i)], capEnd: [O[0] + Df[0] * (19.8 * h + i), 1.05 * h, O[2] + Df[2] * (19.8 * h + i)] };
    };
    parts.footR = foot(-1); parts.footL = foot(1);
    const shoes = { R: B.loft(foot(-1, 0.45)), L: B.loft(foot(1, 0.45)) };

    // ----- tête -----
    const h = hs * 0.93;
    const head = [
      [24.2, 2.6, 2.6, 1.2, 2.2, 4.6],
      [22.6, 4.8, 4.2, 3.4, 2.2, 3.6],
      [19.6, 6.2, 6.1, 6.4, 2.3, 2.3],
      [15.6, 7.1, 8.2, 8.6, 2.3, 1.3, [{ phi: Math.PI / 2, amp: 0.9, w: 0.16 }, { phi: 0, amp: 0.9, w: 0.28 }, { phi: Math.PI, amp: 0.9, w: 0.28 }]],
      [11.2, 7.6, 9.0, 9.9, 2.3, 0.8, [{ phi: Math.PI / 2, amp: 0.5, w: 0.2 }, { phi: 0, amp: 0.6, w: 0.3 }, { phi: Math.PI, amp: 0.6, w: 0.3 }]],
      [7.0, 7.5, 8.6, 9.7, 2.3, 0.5],
      [3.5, 6.1, 6.9, 7.7, 2.2, 0.4],
      [1.0, 3.3, 3.6, 4.2, 2, 0.4],
    ].map(([dy, a, bf, bb, n, dz, lobes]) => ({ c: [0, H - dy * h, dz * h + 0.6], sh: dims(a * h, bf * h, bb * h, n, lobes && lobes.map((l) => Object.assign({}, l, { amp: l.amp * h }))) }));
    parts.head = { U: X, V: Z, sub: 4, keys: head, capStart: [0, H - 25 * h, 4.8 * h + 0.6], capEnd: [0, H, 0.9] };

    const lofts = {};
    for (const k of Object.keys(parts)) lofts[k] = B.loft(parts[k]);
    return { sex, m, L, parts, lofts, shoes, arms: { R: aR.arm, L: aL.arm }, hjX, ankleX };
  };

  /* ---------- Requêtes géométriques pour l'habillage ---------- */

  /* Section horizontale d'une partie verticale (buste, jambe) à la hauteur y : points [x, z] du monde. */
  B.sectionAt = function (loft, y) {
    const R = loft.rings;
    const desc = R[0].c[1] > R[R.length - 1].c[1];
    for (let i = 0; i < R.length - 1; i++) {
      const y0 = R[i].c[1], y1 = R[i + 1].c[1];
      if ((y <= y0 && y >= y1) || (y >= y0 && y <= y1)) {
        const t = y0 === y1 ? 0 : (y - y0) / (y1 - y0);
        return R[i].world.map((p, n) => [lerp(p[0], R[i + 1].world[n][0], t), lerp(p[2], R[i + 1].world[n][2], t)]);
      }
    }
    const r = (desc ? (y > R[0].c[1]) : (y < R[0].c[1])) ? R[0] : R[R.length - 1];
    return r.world.map((p) => [p[0], p[2]]);
  };
  B.centerAt = function (loft, y) {
    const R = loft.rings;
    for (let i = 0; i < R.length - 1; i++) {
      const y0 = R[i].c[1], y1 = R[i + 1].c[1];
      if ((y <= y0 && y >= y1) || (y >= y0 && y <= y1)) {
        const t = y0 === y1 ? 0 : (y - y0) / (y1 - y0);
        return [lerp(R[i].c[0], R[i + 1].c[0], t), lerp(R[i].c[2], R[i + 1].c[2], t)];
      }
    }
    const r = Math.abs(y - R[0].c[1]) < Math.abs(y - R[R.length - 1].c[1]) ? R[0] : R[R.length - 1];
    return [r.c[0], r.c[2]];
  };

  /* Distance latérale minimale |x| occupée par un bras (ou une main) à la hauteur y. */
  B.armInnerX = function (lofts, y) {
    let best = Infinity;
    for (const k of ['armL', 'armR', 'handL', 'handR']) {
      const R = lofts[k].rings;
      for (let i = 0; i < R.length - 1; i++) {
        const y0 = R[i].c[1], y1 = R[i + 1].c[1];
        if ((y <= y0 && y >= y1) || (y >= y0 && y <= y1)) {
          const t = y0 === y1 ? 0 : (y - y0) / (y1 - y0);
          for (let n = 0; n < B.N; n++) {
            const x = Math.abs(lerp(R[i].world[n][0], R[i + 1].world[n][0], t));
            if (x < best) best = x;
          }
        }
      }
    }
    return best;
  };

  window.Body = B;
})();
