/*
 * Mannequin réaliste : maillage MakeHuman (CC0) déformé par cibles de morphologie,
 * mesuré « au mètre ruban » et ajusté aux mesures du client.
 * Unités : cm, y vers le haut (pieds à 0), z vers l'avant.
 */
(function () {
  const MH = {};
  let model = null, loading = null;

  /* ---------- chargement ---------- */

  async function gunzip(bytes) {
    if (typeof DecompressionStream !== 'undefined') {
      const ds = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
      return new Uint8Array(await new Response(ds).arrayBuffer());
    }
    if (typeof require === 'function') return new Uint8Array(require('zlib').gunzipSync(Buffer.from(bytes))); // node (tests)
    throw new Error('Décompression gzip indisponible dans ce navigateur');
  }

  function parse(buf) {
    const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
    const hl = dv.getUint32(0, true);
    const header = JSON.parse(new TextDecoder().decode(buf.subarray(4, 4 + hl)));
    let off = 4 + hl;
    while (off % 4) off++;
    const take = (Type, n) => {
      const bytes = buf.slice(off, off + n * Type.BYTES_PER_ELEMENT); // copie alignée
      off += n * Type.BYTES_PER_ELEMENT;
      return new Type(bytes.buffer);
    };
    const base = take(Float32Array, header.nBase * 3);
    const uv = take(Float32Array, header.nRender * 2);
    const rv2b = take(Uint16Array, header.nRender);
    if (off % 2) off++;
    const tris = take(Uint16Array, header.nTris * 3);
    const targets = {};
    for (const t of header.targets) {
      const idx = take(Uint16Array, t.n);
      const d = take(Int16Array, t.n * 3);
      targets[t.name] = { idx, d };
    }
    const arm = {};
    for (const side of ['L', 'R']) {
      const n = header.arm[side];
      const idx = take(Uint16Array, n);
      const w = take(Uint8Array, n);
      if (n % 2) off++;
      arm[side] = { idx, w };
    }
    return { header, base, uv, rv2b, tris, targets, arm, joints: header.joints, q: header.quant };
  }

  MH.load = function () {
    if (model) return Promise.resolve(model);
    if (loading) return loading;
    loading = (async () => {
      if (!window.MH_DATA_GZ_B64) throw new Error('Données du mannequin absentes (js/mh-data.js)');
      const bin = typeof atob === 'function' ? Uint8Array.from(atob(window.MH_DATA_GZ_B64), (c) => c.charCodeAt(0)) : new Uint8Array(Buffer.from(window.MH_DATA_GZ_B64, 'base64'));
      model = parse(await gunzip(bin));
      model.regions = buildRegions(model);
      return model;
    })();
    return loading;
  };
  MH.ready = () => !!model;

  /* ---------- cibles ---------- */

  function addTarget(pos, name, w) {
    if (!w) return;
    const t = model.targets[name];
    if (!t) return;
    const k = w * model.q, idx = t.idx, d = t.d;
    for (let i = 0; i < idx.length; i++) {
      const j = idx[i] * 3;
      pos[j] += d[3 * i] * k; pos[j + 1] += d[3 * i + 1] * k; pos[j + 2] += d[3 * i + 2] * k;
    }
  }
  const tri = (v) => (v < 0.5 ? [1 - 2 * v, 2 * v, 0] : [0, 2 - 2 * v, 2 * v - 1]); // min / moyen / max

  /*
   * Morphologie de base (« macros » MakeHuman) :
   * p = { gender 0..1 (1 = homme), age (ans), muscle 0..1, weight 0..1, african, asian, caucasian }
   */
  function macro(p) {
    const pos = Float32Array.from(model.base);
    const G = { male: p.gender, female: 1 - p.gender };
    const young = p.age <= 25 ? 1 : Math.max(0, Math.min(1, (90 - p.age) / 65));
    const A = { young, old: 1 - young };
    const [m0, m1, m2] = tri(p.muscle), [w0, w1, w2] = tri(p.weight);
    const M = { minmuscle: m0, averagemuscle: m1, maxmuscle: m2 };
    const W = { minweight: w0, averageweight: w1, maxweight: w2 };
    const rs = (p.african + p.asian + p.caucasian) || 1;
    const R = { african: p.african / rs, asian: p.asian / rs, caucasian: p.caucasian / rs };
    for (const g in G) for (const a in A) {
      const ga = G[g] * A[a];
      if (!ga) continue;
      for (const m in M) for (const w in W) addTarget(pos, `macrodetails/universal-${g}-${a}-${m}-${w}`, ga * M[m] * W[w]);
      for (const r in R) addTarget(pos, `macrodetails/${r}-${g}-${a}`, ga * R[r]);
    }
    return pos;
  }

  const PAIRS = {
    neck: 'measure/measure-neck-circ', chest: 'measure/measure-bust-circ', underbust: 'measure/measure-underbust-circ',
    waist: 'measure/measure-waist-circ', hip: 'measure/measure-hips-circ', bicep: 'measure/measure-upperarm-circ',
    wrist: 'measure/measure-wrist-circ', thigh: 'measure/measure-thigh-circ', knee: 'measure/measure-knee-circ',
    calf: 'measure/measure-calf-circ', ankle: 'measure/measure-ankle-circ',
    upperleg: 'measure/measure-upperleg-height', lowerleg: 'measure/measure-lowerleg-height',
    upperarm: 'measure/measure-upperarm-length', lowerarm: 'measure/measure-lowerarm-length',
    shoulder: 'measure/measure-shoulder-dist', napetowaist: 'measure/measure-napetowaist-dist',
    belly: 'stomach/stomach-pregnant', seat: 'buttocks/buttocks-volume',
  };
  function applyPair(pos, key, v) {
    if (!v) return;
    addTarget(pos, `${PAIRS[key]}-${v > 0 ? 'incr' : 'decr'}`, Math.abs(v));
  }

  /* ---------- mesures au mètre ruban ---------- */

  // Zones de mesure = sommets touchés par la cible de mensuration correspondante.
  function buildRegions(M) {
    const R = {};
    const nb = M.header.nBase;
    for (const key of ['neck', 'chest', 'waist', 'hip', 'bicep', 'wrist', 'thigh', 'knee', 'calf', 'ankle']) {
      const t = M.targets[PAIRS[key] + '-incr'];
      const inRegion = new Uint8Array(nb);
      t.idx.forEach((i) => { inRegion[i] = 1; });
      // bande de mesure : sommets les plus déplacés par la cible (la ligne du mètre ruban)
      const mag = Array.from(t.idx, (_, k) => Math.hypot(t.d[3 * k], t.d[3 * k + 1], t.d[3 * k + 2]));
      const mx = Math.max(...mag);
      const band = Array.from(t.idx).filter((_, k) => mag[k] >= 0.7 * mx);
      R[key] = { verts: Array.from(t.idx), band, inRegion };
    }
    // triangles exprimés en sommets de base
    const tb = new Uint16Array(M.tris.length);
    for (let i = 0; i < M.tris.length; i++) tb[i] = M.rv2b[M.tris[i]];
    M.trisBase = tb;
    return R;
  }

  function hullPerimeter(pts) {
    if (pts.length < 3) return 0;
    const p = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    const lo = [], up = [];
    for (const q of p) { while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
    for (let i = p.length - 1; i >= 0; i--) { const q = p[i]; while (up.length >= 2 && cross(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
    const h = lo.slice(0, -1).concat(up.slice(0, -1));
    let per = 0;
    for (let i = 0; i < h.length; i++) { const a = h[i], b = h[(i + 1) % h.length]; per += Math.hypot(a[0] - b[0], a[1] - b[1]); }
    return { per, hull: h };
  }

  const LIMBS = new Set(['bicep', 'wrist', 'thigh', 'knee', 'calf', 'ankle']);
  const ARMS = new Set(['bicep', 'wrist']);

  /* Axe principal (plus grande étendue) d'un nuage de points : direction du bras. */
  function axisOf(pts) {
    let cx = 0, cy = 0, cz = 0;
    for (const p of pts) { cx += p[0]; cy += p[1]; cz += p[2]; }
    cx /= pts.length; cy /= pts.length; cz /= pts.length;
    const C = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
    for (const p of pts) {
      const d = [p[0] - cx, p[1] - cy, p[2] - cz];
      for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) C[i][j] += d[i] * d[j];
    }
    let v = [1, -1, 0];
    for (let k = 0; k < 60; k++) {
      const w = [0, 1, 2].map((i) => C[i][0] * v[0] + C[i][1] * v[1] + C[i][2] * v[2]);
      const l = Math.hypot(...w) || 1; v = w.map((x) => x / l);
    }
    if (v[1] < 0) v = v.map((x) => -x);
    return v;
  }

  /* Axe de la zone (direction de plus faible étendue) par itération de puissance inverse sur la covariance. */
  function smallestAxis(pts) {
    let cx = 0, cy = 0, cz = 0;
    for (const p of pts) { cx += p[0]; cy += p[1]; cz += p[2]; }
    cx /= pts.length; cy /= pts.length; cz /= pts.length;
    const C = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
    for (const p of pts) {
      const d = [p[0] - cx, p[1] - cy, p[2] - cz];
      for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) C[i][j] += d[i] * d[j];
    }
    // plus grande valeur propre de (tr·I − C) = plus petite de C
    const tr = C[0][0] + C[1][1] + C[2][2];
    const Mx = C.map((r, i) => r.map((v, j) => (i === j ? tr : 0) - v));
    let v = [0, 1, 0];
    for (let k = 0; k < 40; k++) {
      const w = [0, 1, 2].map((i) => Mx[i][0] * v[0] + Mx[i][1] * v[1] + Mx[i][2] * v[2]);
      const l = Math.hypot(...w) || 1; v = w.map((x) => x / l);
    }
    if (v[1] < 0) v = v.map((x) => -x);
    return { c: [cx, cy, cz], n: v };
  }

  /*
   * Tour mesuré dans une zone : coupe du maillage par le plan de la zone, puis périmètre
   * de l'enveloppe convexe (comme un mètre ruban). Zones doubles (bras, jambes) : côté gauche (x > 0).
   */
  function circumference(pos, key, scale) {
    const R = model.regions[key];
    const bilateral = LIMBS.has(key);
    const side = bilateral ? 1 : null;
    const sel = (list) => (bilateral ? list.filter((i) => pos[3 * i] > 0) : list);
    const P = (list) => sel(list).map((i) => [pos[3 * i], pos[3 * i + 1], pos[3 * i + 2]]);
    const band = P(R.band);
    const c = [0, 1, 2].map((q) => band.reduce((a, p) => a + p[q], 0) / band.length);
    let n = [0, 1, 0];
    if (ARMS.has(key)) n = axisOf(P(R.verts));
    // base du plan
    const ref = Math.abs(n[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
    let u = [n[1] * ref[2] - n[2] * ref[1], n[2] * ref[0] - n[0] * ref[2], n[0] * ref[1] - n[1] * ref[0]];
    const lu = Math.hypot(...u); u = u.map((x) => x / lu);
    const w = [n[1] * u[2] - n[2] * u[1], n[2] * u[0] - n[0] * u[2], n[0] * u[1] - n[1] * u[0]];
    const T = model.trisBase, inR = R.inRegion;
    const sec = [], sec3 = [];
    const dist = (i) => (pos[3 * i] - c[0]) * n[0] + (pos[3 * i + 1] - c[1]) * n[1] + (pos[3 * i + 2] - c[2]) * n[2];
    for (let t = 0; t < T.length; t += 3) {
      const a = T[t], b = T[t + 1], d = T[t + 2];
      if (!(inR[a] || inR[b] || inR[d])) continue;
      if (side && (pos[3 * a] <= 0 || pos[3 * b] <= 0 || pos[3 * d] <= 0)) continue;
      const vs = [a, b, d], ds = vs.map(dist);
      for (let e = 0; e < 3; e++) {
        const i = vs[e], j = vs[(e + 1) % 3], di = ds[e], dj = ds[(e + 1) % 3];
        if ((di > 0) === (dj > 0)) continue;
        const f = di / (di - dj);
        const p = [0, 1, 2].map((q) => pos[3 * i + q] + (pos[3 * j + q] - pos[3 * i + q]) * f - c[q]);
        sec.push([p[0] * u[0] + p[1] * u[1] + p[2] * u[2], p[0] * w[0] + p[1] * w[1] + p[2] * w[2]]);
        sec3.push([p[0] + c[0], p[1] + c[1], p[2] + c[2]]);
      }
    }
    const h = hullPerimeter(sec);
    return { value: h.per * scale, center: c, normal: n, u, w, hull: h.hull, side };
  }

  function bounds(pos) {
    let minY = Infinity, maxY = -Infinity;
    for (let i = 1; i < pos.length; i += 3) { if (pos[i] < minY) minY = pos[i]; if (pos[i] > maxY) maxY = pos[i]; }
    return { minY, maxY };
  }

  /* Hauteur d'entrejambe : point le plus bas du bassin entre les jambes. */
  function crotchHeight(pos, minY) {
    const hip = model.regions.hip.verts;
    let hy = 0;
    for (const i of hip) hy += pos[3 * i + 1];
    hy /= hip.length;
    let best = Infinity;
    for (let i = 0; i < pos.length / 3; i++) {
      const x = pos[3 * i], y = pos[3 * i + 1];
      if (Math.abs(x) < 1.2 && y < hy && y > minY + (hy - minY) * 0.5 && y < best) best = y;
    }
    return best - minY;
  }

  /* Mesure l'ensemble du mannequin (cm), après mise à l'échelle de la stature. */
  MH.measure = function (pos, stature) {
    const b = bounds(pos);
    const s = stature ? stature / (b.maxY - b.minY) : 1;
    const out = { scale: s, stature: (b.maxY - b.minY) * s, rings: {} };
    for (const k of Object.keys(model.regions)) {
      const r = circumference(pos, k, s);
      out[k] = r.value; out.rings[k] = r;
    }
    out.crotch = crotchHeight(pos, b.minY) * s;
    out.minY = b.minY;
    return out;
  };

  /* ---------- ajustement aux mesures du client ---------- */

  const FIT_KEYS = ['chest', 'waist', 'hip', 'neck', 'bicep', 'wrist', 'thigh', 'knee', 'calf', 'ankle'];

  /*
   * m : mesures (cm) — stature, neck, chest, waist, hip, bicep, wrist, thigh, knee, calf, ankle, outseam, rise
   * p : morphologie — sex, age, muscle, african, asian, caucasian, belly (0..1), seat (0..1)
   */
  MH.fit = function (m, p) {
    const gender = p.sex === 'femme' ? 0 : 1;
    const baseP = { gender, age: p.age || 30, african: p.african ?? 1, asian: p.asian ?? 0, caucasian: p.caucasian ?? 0 };
    const targetsC = FIT_KEYS.filter((k) => m[k] > 0);
    const errOf = (meas) => targetsC.reduce((a, k) => a + ((meas[k] / m[k]) - 1) ** 2, 0);

    // 1) corpulence et musculature : recherche sur grille puis affinage (poitrine, taille, bassin)
    const macroFor = (weight, muscle) => {
      const pos = macro(Object.assign({}, baseP, { weight, muscle }));
      applyPair(pos, 'belly', ((p.belly ?? 0.2) - 0.2) * 1.2);
      applyPair(pos, 'seat', ((p.seat ?? 0.4) - 0.4) * 1.2);
      return pos;
    };
    const macroErr = (w, mu) => {
      const pos = macroFor(w, mu), b = bounds(pos), s = m.stature / (b.maxY - b.minY);
      return ['chest', 'waist', 'hip'].reduce((a, k) => a + ((circumference(pos, k, s).value / m[k]) - 1) ** 2, 0);
    };
    const fixedMuscle = p.muscle != null;
    let best = { w: 0.5, mu: fixedMuscle ? p.muscle : 0.5, e: Infinity };
    const muList = fixedMuscle ? [p.muscle] : [0, 0.25, 0.5, 0.75, 1];
    for (const mu of muList) for (const w of [0, 0.2, 0.4, 0.5, 0.6, 0.8, 1]) {
      const e = macroErr(w, mu);
      if (e < best.e) best = { w, mu, e };
    }
    for (let step = 0.1; step > 0.01; step /= 2) {
      for (const [dw, dm] of [[step, 0], [-step, 0], [0, step], [0, -step]]) {
        if (fixedMuscle && dm) continue;
        const w = Math.min(1, Math.max(0, best.w + dw)), mu = Math.min(1, Math.max(0, best.mu + dm));
        const e = macroErr(w, mu);
        if (e < best.e) best = { w, mu, e };
      }
    }
    // 2) mensurations une par une (sécante), puis longueur de jambe (entrejambe)
    const L = window.Body ? Body.landmarks(Object.assign({ sex: p.sex }, m)) : null;
    const crotchTarget = L ? L.crotch : null;
    const measureFit = (macroPos) => {
      const vals = {};
      const compose = () => {
        const pos = Float32Array.from(macroPos);
        for (const k in vals) applyPair(pos, k, vals[k]);
        return pos;
      };
      for (let round = 0; round < 3; round++) {
        for (const k of targetsC) {
          const get = (v) => {
            vals[k] = v;
            const pos = compose(), b = bounds(pos);
            return circumference(pos, k, m.stature / (b.maxY - b.minY)).value;
          };
          const v0 = vals[k] || 0, c0 = get(v0);
          const v1 = Math.max(-1.5, Math.min(1.5, v0 + (c0 < m[k] ? 0.2 : -0.2)));
          const c1 = get(v1);
          const slope = (c1 - c0) / ((v1 - v0) || 1e-6);
          const v = Math.abs(slope) > 1e-3 ? v0 + (m[k] - c0) / slope : v0;
          vals[k] = Math.max(-1.5, Math.min(1.5, v));
        }
        if (crotchTarget) {
          const getC = (v) => { vals.upperleg = v; const pos = compose(); const b = bounds(pos); return crotchHeight(pos, b.minY) * m.stature / (b.maxY - b.minY); };
          const v0 = vals.upperleg || 0, c0 = getC(v0), c1 = getC(Math.max(-1, Math.min(1, v0 + 0.3)));
          const slope = (c1 - c0) / 0.3;
          vals.upperleg = Math.max(-1, Math.min(1, Math.abs(slope) > 1e-3 ? v0 + (crotchTarget - c0) / slope : v0));
        }
      }
      const pos = compose();
      return { pos, vals, meas: MH.measure(pos, m.stature) };
    };
    const worst = (meas) => Math.max(...targetsC.map((k) => Math.abs(meas[k] - m[k])));

    let sol = Object.assign(measureFit(macroFor(best.w, best.mu)), { weight: best.w, muscle: best.mu });
    // 3) si une mesure reste hors tolérance, on essaie d'autres musculatures
    if (worst(sol.meas) > 0.6 && !fixedMuscle) {
      for (const mu of [0.75, 1, 0.5, 0.9, 0.25, 0]) {
        if (Math.abs(mu - best.mu) < 0.05) continue;
        let bw = { w: 0.5, e: Infinity };
        for (let w = 0; w <= 1.001; w += 0.1) { const e = macroErr(w, mu); if (e < bw.e) bw = { w, e }; }
        const cand = Object.assign(measureFit(macroFor(bw.w, mu)), { weight: bw.w, muscle: mu });
        if (worst(cand.meas) < worst(sol.meas)) sol = cand;
        if (worst(sol.meas) <= 0.6) break;
      }
    }
    const pos = sol.pos, meas = sol.meas;
    // mise à l'échelle et pieds au sol
    const s = meas.scale;
    for (let i = 0; i < pos.length; i += 3) { pos[i] *= s; pos[i + 1] = (pos[i + 1] - meas.minY) * s; pos[i + 2] *= s; }
    const final = MH.measure(pos, null);
    return { pos, weight: sol.weight, muscle: sol.muscle, values: Object.assign({}, sol.vals), measured: final, err: errOf(final), worst: worst(final) };
  };

  /* ---------- pose : bras abaissés (peau liée au squelette MakeHuman) ---------- */

  const centroid = (pos, list) => [0, 1, 2].map((q) => list.reduce((a, i) => a + pos[3 * i + q], 0) / list.length);

  /*
   * Abaisse les bras : rotation de la chaîne du bras autour de l'épaule, pondérée par les poids
   * de peau (transition douce vers l'épaule). angle = écart du bras par rapport à la verticale (degrés).
   * Retourne { pos, rot: { L(p), R(p) } } pour transformer aussi des points (anneaux de mesure).
   */
  MH.pose = function (pos, angle = 9) {
    const out = Float32Array.from(pos);
    const rot = {};
    for (const side of ['L', 'R']) {
      const J = centroid(pos, model.joints['upperarm01.' + side]);
      const Wr = centroid(pos, model.joints['wrist.' + side]);
      let d = [Wr[0] - J[0], Wr[1] - J[1], Wr[2] - J[2]];
      const ld = Math.hypot(...d); d = d.map((x) => x / ld);
      const sg = side === 'L' ? 1 : -1;
      const a = (angle * Math.PI) / 180;
      let t = [sg * Math.sin(a), -Math.cos(a), d[2] * 0.4];
      const lt = Math.hypot(...t); t = t.map((x) => x / lt);
      let k = [d[1] * t[2] - d[2] * t[1], d[2] * t[0] - d[0] * t[2], d[0] * t[1] - d[1] * t[0]];
      const s = Math.hypot(...k), c = d[0] * t[0] + d[1] * t[1] + d[2] * t[2];
      k = k.map((x) => x / (s || 1));
      const th = Math.atan2(s, c);
      const rotate = (p, frac = 1) => {
        const ang = th * frac, cs = Math.cos(ang), sn = Math.sin(ang);
        const v = [p[0] - J[0], p[1] - J[1], p[2] - J[2]];
        const kv = k[0] * v[0] + k[1] * v[1] + k[2] * v[2];
        const kx = [k[1] * v[2] - k[2] * v[1], k[2] * v[0] - k[0] * v[2], k[0] * v[1] - k[1] * v[0]];
        return [0, 1, 2].map((q) => J[q] + v[q] * cs + kx[q] * sn + k[q] * kv * (1 - cs));
      };
      const { idx, w } = model.arm[side];
      for (let i = 0; i < idx.length; i++) {
        const j = 3 * idx[i], f = w[i] / 255;
        // rotation partielle (et non mélange linéaire) : l'épaule s'arrondit sans s'écraser
        const r = rotate([pos[j], pos[j + 1], pos[j + 2]], f);
        out[j] = r[0]; out[j + 1] = r[1]; out[j + 2] = r[2];
      }
      rot[side] = (p) => rotate(p, 1);
    }
    return { pos: out, rot };
  };

  /* ---------- tête de mannequin : visage lissé (sans yeux, bouche ni oreilles marqués) ---------- */

  let adjacency = null;
  function buildAdjacency() {
    const n = model.header.nBase, sets = Array.from({ length: n }, () => new Set()), T = model.trisBase;
    for (let t = 0; t < T.length; t += 3) {
      const a = T[t], b = T[t + 1], c = T[t + 2];
      sets[a].add(b); sets[a].add(c); sets[b].add(a); sets[b].add(c); sets[c].add(a); sets[c].add(b);
    }
    adjacency = sets.map((s) => Uint16Array.from(s));
  }

  /*
   * Lissage de Taubin (sans rétrécissement) limité à la tête, avec une transition douce au cou.
   * neckY : hauteur de l'anneau de mesure du cou (cm, mannequin déjà mis à l'échelle).
   */
  MH.smoothHead = function (pos, neckY, iterations = 45) {
    if (!adjacency) buildAdjacency();
    const out = Float32Array.from(pos);
    const n = out.length / 3, y0 = neckY + 3, y1 = neckY + 9;
    const idx = [], wt = [];
    for (let i = 0; i < n; i++) {
      const y = pos[3 * i + 1];
      if (y > y0 && adjacency[i].length) { idx.push(i); const t = Math.min(1, (y - y0) / (y1 - y0)); wt.push(t * t * (3 - 2 * t)); }
    }
    const tmp = new Float32Array(idx.length * 3);
    const step = (f) => {
      idx.forEach((i, k) => {
        const nb = adjacency[i];
        let sx = 0, sy = 0, sz = 0;
        for (let q = 0; q < nb.length; q++) { const j = 3 * nb[q]; sx += out[j]; sy += out[j + 1]; sz += out[j + 2]; }
        const m = nb.length, w = wt[k] * f, j = 3 * i;
        tmp[3 * k] = out[j] + w * (sx / m - out[j]);
        tmp[3 * k + 1] = out[j + 1] + w * (sy / m - out[j + 1]);
        tmp[3 * k + 2] = out[j + 2] + w * (sz / m - out[j + 2]);
      });
      idx.forEach((i, k) => { out[3 * i] = tmp[3 * k]; out[3 * i + 1] = tmp[3 * k + 1]; out[3 * i + 2] = tmp[3 * k + 2]; });
    };
    for (let it = 0; it < iterations; it++) { step(0.55); step(-0.58); }
    return out;
  };

  /*
   * Tête de mannequin de vitrine : un ovoïde lisse (sans nez, yeux, bouche ni oreilles) posé sur un
   * cou cylindrique, raccordés par une jonction arrondie. Chaque tranche horizontale de la tête est
   * recalée sur cette forme ; le tour de cou mesuré reste inchangé.
   * neck = anneau de mesure du cou { center, value } (mannequin déjà à l'échelle).
   */
  MH.mannequinHead = function (pos, neck) {
    const out = Float32Array.from(pos);
    const n = pos.length / 3;
    const neckY = neck.center[1];
    const nc = [neck.center[0], neck.center[2]], rn = neck.value / (2 * Math.PI) * 1.03;
    let top = -Infinity;
    for (let i = 0; i < n; i++) top = Math.max(top, pos[3 * i + 1]);
    const bottom = neckY + 4;                         // bas de l'ovoïde, sous le menton
    const cy = (top + bottom) / 2 + 0.6, b = (top - bottom) / 2 + 0.4;
    // gabarit pris au niveau du front (au-dessus des oreilles)
    const yb = cy + 0.35 * b;
    let ax = 0, zf = -Infinity, zb = Infinity;
    for (let i = 0; i < n; i++) {
      if (Math.abs(pos[3 * i + 1] - yb) > 1.2) continue;
      ax = Math.max(ax, Math.abs(pos[3 * i])); zf = Math.max(zf, pos[3 * i + 2]); zb = Math.min(zb, pos[3 * i + 2]);
    }
    const zc = (zf + zb) / 2 + 0.3;
    const a = ax * 1.04, cf = (zf - zc) * 1.02, cb = (zc - zb) * 1.03;
    const e = 2.2;
    const sm = (x0, x1, x) => { const t = Math.min(1, Math.max(0, (x - x0) / (x1 - x0))); return t * t * (3 - 2 * t); };
    const smax = (p, q, k) => { const h = Math.max(k - Math.abs(p - q), 0) / k; return Math.max(p, q) + h * h * k * 0.25; };
    for (let i = 0; i < n; i++) {
      const y = pos[3 * i + 1];
      const w = sm(neckY - 0.5, neckY + 2, y);
      if (!w) continue;
      // centre de la tranche : du cou vers l'ovoïde
      const s = sm(neckY, cy, y);
      const cx = nc[0] * (1 - s), cz = nc[1] + (zc - nc[1]) * s;
      let ux = pos[3 * i] - cx, uz = pos[3 * i + 2] - cz;
      const l = Math.hypot(ux, uz);
      if (l < 1e-6) continue;
      ux /= l; uz /= l;
      // rayon de l'ovoïde dans cette direction, à cette hauteur
      let rE = 0;
      const t = Math.abs((y - cy) / b);
      if (t < 1) {
        const f = Math.pow(1 - Math.pow(t, e), 1 / e);
        const czz = uz > 0 ? cf : cb;
        rE = f / Math.pow(Math.pow(Math.abs(ux) / a, e) + Math.pow(Math.abs(uz) / czz, e), 1 / e);
        rE += (zc - cz) * uz; // décalage des centres (approximation)
      }
      // rayon du cou (cylindre), qui s'efface dans le haut du crâne
      const ox = cx - nc[0], oz = cz - nc[1];
      const bq = ox * ux + oz * uz, cq = ox * ox + oz * oz - rn * rn;
      const rN = y < cy ? -bq + Math.sqrt(Math.max(0, bq * bq - cq)) : 0;
      const R = smax(rE, rN, 1.6) * 0.985;           // juste sous la surface de la tête neuve
      const nx = cx + ux * R, nz = cz + uz * R;
      out[3 * i] += w * (nx - out[3 * i]); out[3 * i + 2] += w * (nz - out[3 * i + 2]);
    }
    // Tête neuve : tranches horizontales (cou ∪ ovoïde) du haut du cou au sommet du crâne.
    const yCut = neckY + 2.5, yStart = neckY + 0.5;
    const drop = new Uint8Array(n);
    for (let i = 0; i < n; i++) if (out[3 * i + 1] > yCut) drop[i] = 1;
    const N = 72, rings = [];
    const slice = (y, ux, uz) => {
      const s = sm(neckY, cy, y);
      const cx = nc[0] * (1 - s), cz = nc[1] + (zc - nc[1]) * s;
      let rE = 0;
      const t = (y - cy) / b;
      if (Math.abs(t) < 1) {
        const f = Math.pow(1 - Math.pow(Math.abs(t), e), 1 / e);
        const jaw = t < 0 ? 1 - 0.22 * Math.min(1, -t) : 1;          // mâchoire plus étroite
        const czz = uz > 0 ? cf * (t < 0 ? 1 + 0.08 * Math.min(1, -t) : 1) : cb;
        rE = f / Math.pow(Math.pow(Math.abs(ux) / (a * jaw), e) + Math.pow(Math.abs(uz) / czz, e), 1 / e);
        rE += (zc - cz) * uz;
      }
      const ox = cx - nc[0], oz = cz - nc[1];
      const bq = ox * ux + oz * uz, cq = ox * ox + oz * oz - rn * rn;
      const rN = y < cy ? -bq + Math.sqrt(Math.max(0, bq * bq - cq)) : 0;
      const R = smax(rE, rN, 1.6);
      return [cx + ux * R, y, cz + uz * R];
    };
    for (let y = yStart; y < top - 0.05; y += 0.35) {
      const ring = [];
      for (let k = 0; k < N; k++) { const ph = (2 * Math.PI * k) / N; ring.push(slice(y, Math.cos(ph), Math.sin(ph))); }
      rings.push(ring);
    }
    const last = rings[rings.length - 1];
    const apex = [last.reduce((q, p) => q + p[0], 0) / N, top, last.reduce((q, p) => q + p[2], 0) / N];
    const hp = new Float32Array((rings.length * N + 1) * 3), hi = [];
    rings.forEach((ring, r) => ring.forEach((p, k) => hp.set(p, 3 * (r * N + k))));
    hp.set(apex, 3 * rings.length * N);
    for (let r = 0; r < rings.length - 1; r++) {
      for (let k = 0; k < N; k++) {
        const a0 = r * N + k, a1 = r * N + ((k + 1) % N), b0 = a0 + N, b1 = a1 + N;
        hi.push(a0, b1, a1, a0, b0, b1);
      }
    }
    const ap = rings.length * N, lr = (rings.length - 1) * N;
    for (let k = 0; k < N; k++) hi.push(lr + k, ap, lr + ((k + 1) % N));
    return { pos: out, drop, head: { positions: hp, index: Uint32Array.from(hi) } };
  };

  /* Géométrie de rendu (sommets dupliqués aux coutures UV). */
  MH.renderGeometry = function (pos, drop) {
    // normales lissées sur la topologie de base (pas de cassure aux coutures UV)
    const nb = pos.length / 3, N = new Float32Array(nb * 3), T = model.trisBase;
    for (let t = 0; t < T.length; t += 3) {
      const a = 3 * T[t], b = 3 * T[t + 1], c = 3 * T[t + 2];
      const ux = pos[b] - pos[a], uy = pos[b + 1] - pos[a + 1], uz = pos[b + 2] - pos[a + 2];
      const vx = pos[c] - pos[a], vy = pos[c + 1] - pos[a + 1], vz = pos[c + 2] - pos[a + 2];
      const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      for (const i of [a, b, c]) { N[i] += nx; N[i + 1] += ny; N[i + 2] += nz; }
    }
    const n = model.rv2b.length, out = new Float32Array(n * 3), nor = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const j = model.rv2b[i] * 3;
      out[3 * i] = pos[j]; out[3 * i + 1] = pos[j + 1]; out[3 * i + 2] = pos[j + 2];
      const l = Math.hypot(N[j], N[j + 1], N[j + 2]) || 1;
      nor[3 * i] = N[j] / l; nor[3 * i + 1] = N[j + 1] / l; nor[3 * i + 2] = N[j + 2] / l;
    }
    let index = model.tris;
    if (drop) {
      const keep = [];
      for (let t = 0; t < model.tris.length; t += 3) {
        const a = model.tris[t], b = model.tris[t + 1], c = model.tris[t + 2];
        if (drop[model.rv2b[a]] || drop[model.rv2b[b]] || drop[model.rv2b[c]]) continue;
        keep.push(a, b, c);
      }
      index = Uint16Array.from(keep);
    }
    return { positions: out, normals: nor, uvs: model.uv, index };
  };

  /* Anneau de mesure (points 3D) pour l'afficher sur le mannequin. */
  MH.ringPoints = function (ring) {
    return ring.hull.map(([a, b]) => [0, 1, 2].map((q) => ring.center[q] + ring.u[q] * a + ring.w[q] * b));
  };

  MH.FIT_KEYS = FIT_KEYS;
  window.MH = MH;
})();
