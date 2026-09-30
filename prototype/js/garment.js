/*
 * Habillage de l'avatar : tunique, manches et pantalon construits à partir des cotes du patron
 * (tour de poitrine fini, évasement, largeur de manche, largeurs de jambe…) et de la surface du corps.
 * Chaque anneau de vêtement reste à l'extérieur du corps ; s'il ne peut pas atteindre la cote
 * du patron sans toucher le corps, la zone est signalée comme trop juste.
 */
(function () {
  const B = window.Body;
  const TAU = Math.PI * 2;
  const N = B.N;
  const { lerp, clamp, smooth } = B;
  const GW = {};

  /* ---------- outils 2D ---------- */

  function hull(points) {
    const p = points.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    const lo = [], up = [];
    for (const q of p) { while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
    for (let i = p.length - 1; i >= 0; i--) { const q = p[i]; while (up.length >= 2 && cross(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
    return lo.slice(0, -1).concat(up.slice(0, -1));
  }

  /* Rayon du polygone dans chaque direction φ_k depuis le centre (lancer de rayon). */
  function polar(poly, c) {
    const r = new Array(N).fill(0);
    for (let k = 0; k < N; k++) {
      const ph = B.phi(k, N), dx = Math.cos(ph), dz = Math.sin(ph);
      let best = 0;
      for (let i = 0; i < poly.length; i++) {
        const p = poly[i], q = poly[(i + 1) % poly.length];
        const ex = q[0] - p[0], ez = q[1] - p[1];
        const den = dx * ez - dz * ex;
        if (Math.abs(den) < 1e-9) continue;
        const wx = p[0] - c[0], wz = p[1] - c[1];
        const t = (wx * ez - wz * ex) / den;
        const w = (wx * dz - wz * dx) / den;
        if (t > 0 && w >= -1e-6 && w <= 1 + 1e-6 && t > best) best = t;
      }
      r[k] = best;
    }
    return r;
  }
  const toPts = (r, c) => r.map((v, k) => { const ph = B.phi(k, N); return [c[0] + v * Math.cos(ph), c[1] + v * Math.sin(ph)]; });
  const ellipseR = (k) => { // rayon unitaire d'une ellipse (demi-largeur 1, profondeur k)
    const out = [];
    for (let i = 0; i < N; i++) { const ph = B.phi(i, N), c = Math.cos(ph), s = Math.sin(ph); out.push(k / Math.sqrt((k * c) ** 2 + s * s)); }
    return out;
  };
  const normPerim = (r) => { const P = B.perim(toPts(r, [0, 0])); return r.map((v) => v / P); };

  /*
   * Résout un anneau : r = max(s·gabarit, corps + jeu), bras évités, périmètre = cible.
   * clampX(x) éventuel : limite latérale |x - cx| (bras).
   */
  function solveRing(rBody, gap, tpl, target, c, limitX) {
    const floor = rBody.map((v) => v + gap);
    const build = (s) => {
      const pts = [];
      for (let k = 0; k < N; k++) {
        const ph = B.phi(k, N);
        const r = Math.max(s * tpl[k], floor[k]);
        let X = c[0] + r * Math.cos(ph);
        const Z = c[1] + r * Math.sin(ph);
        if (limitX && Math.abs(X) > limitX) {
          // le bras repousse le tissu : on plafonne l'écart latéral, sans rentrer dans le corps
          X = Math.sign(X) * Math.max(limitX, Math.abs(c[0] + floor[k] * Math.cos(ph)));
        }
        pts.push([X, Z]);
      }
      return pts;
    };
    const P0 = B.perim(build(0));
    if (target <= P0 + 0.05) return { pts: build(0), tight: target < P0 - 0.5, deficit: P0 - target };
    let lo = 0, hi = target * 2;
    for (let i = 0; i < 40; i++) {
      const mid = (lo + hi) / 2;
      if (B.perim(build(mid)) < target) lo = mid; else hi = mid;
    }
    const pts = build(hi);
    return { pts, tight: false, deficit: 0, reached: B.perim(pts) };
  }

  /* Abscisse curviligne signée depuis le milieu devant (φ = π/2), positive vers +x. */
  function arcFromFront(pts) {
    const cum = [0];
    for (let k = 1; k <= N; k++) {
      const a = pts[k - 1], b = pts[k % N];
      cum.push(cum[k - 1] + Math.hypot(b[0] - a[0], b[1] - a[1]));
    }
    const f = cum[N / 2];
    return cum.map((v) => f - v); // k = 0 (dos, côté +x) … N/2 (devant) … N (dos)
  }

  /* ---------- Tunique ---------- */

  GW.tunic = function (body, pat, m, opts = {}) {
    const L = body.L, lofts = body.lofts;
    const b = pat.base;                          // géométrie du patron (W, ahd, flare, fnd, bnd, nw)
    const top = L.neckBase + 0.2, len = m.tunicLength;
    const TEXW = 200, TEXH = len + 4;
    const rings = [], uvs = [], issues = [];
    let maxP = 0;
    const steps = Math.ceil(len / 1.25);
    const ellipse = ellipseR(0.62);
    for (let i = 0; i <= steps; i++) {
      const d = (len * i) / steps;               // distance depuis le haut d'épaule
      const y = top - d;
      let sec, c;
      if (y > L.hip) {
        // un vêtement ample passe par-dessus les creux (colonne, entre-seins, reins)
        sec = hull(B.sectionAt(lofts.torso, y));
        c = B.centerAt(lofts.torso, y);
      } else {
        // sous le bassin, la tunique tombe droit depuis la ligne de hanches, par-dessus les deux jambes
        const legs = y < L.crotch + 5 ? B.sectionAt(lofts.legL, y).concat(B.sectionAt(lofts.legR, y)) : [];
        sec = hull(B.sectionAt(lofts.torso, L.hip).concat(legs));
        c = B.centerAt(lofts.torso, L.hip);
      }
      const rBody = polar(sec, c);
      const gap = 0.45 + 0.6 * smooth(0, b.ahd, d);
      const bodyP = B.perim(toPts(rBody.map((v) => v + gap), c));
      const patC = 4 * (b.W + b.flare * clamp((d - b.ahd) / (b.L - b.ahd), 0, 1));
      const w = smooth(b.ahd - 12, b.ahd + 2, d);
      const tpl = normPerim(rBody.map((v) => v + gap)).map((v, k) => lerp(v, normPerim(ellipse)[k], w));
      const target = lerp(bodyP + 1.5 * smooth(0, b.ahd, d), patC, w);
      const armX = y < L.shoulder - 8 ? B.armInnerX(lofts, y) - 0.5 : Infinity;
      const res = solveRing(rBody, gap, tpl, target, c, isFinite(armX) ? armX : null);
      if (w > 0.5 && res.tight) issues.push({ y, d, deficit: res.deficit });
      const P = B.perim(res.pts);
      maxP = Math.max(maxP, P);
      const pts = res.pts.concat([res.pts[0]]);
      rings.push(pts.map((p) => [p[0], y, p[1]]));
      const s = arcFromFront(pts);
      uvs.push(s.map((sv) => [0.5 + sv / TEXW, 1 - d / TEXH]));
    }
    const hemP = B.perim(rings[rings.length - 1].slice(0, N).map((p) => [p[0], p[2]]));
    const topP = B.perim(rings[0].slice(0, N).map((p) => [p[0], p[2]]));
    return { rings, uvs, tex: { W: TEXW, H: TEXH, hemP, topP, len }, issues, closed: false };
  };

  /* ---------- Manches ---------- */

  GW.sleeve = function (body, pat, m, side) {
    const arm = body.lofts['arm' + side], part = body.arms[side];
    const S = part.S, dvec = part.d, U = arm.U, V = arm.V;
    const tStart = -4.2, tEnd = Math.max(4, m.sleeveLength - 2.5);
    const width = pat.sleeveWidth, taper = 1.2;
    const ellipse = normPerim(ellipseR(0.9));
    const rings = [], uvs = [];
    const R = arm.rings;
    const steps = Math.ceil((tEnd - tStart) / 1.0);
    let tight = false;
    for (let i = 0; i <= steps; i++) {
      const t = lerp(tStart, tEnd, i / steps);
      // anneau du bras à l'abscisse t (interpolation entre anneaux densifiés)
      let j = 0;
      while (j < R.length - 2 && R[j + 1].t < t) j++;
      const f = clamp((t - R[j].t) / ((R[j + 1].t - R[j].t) || 1), 0, 1);
      const sec = R[j].pts2.map((p, n) => [lerp(p[0], R[j + 1].pts2[n][0], f), lerp(p[1], R[j + 1].pts2[n][1], f)]);
      const rBody = polar(sec, [0, 0]);
      const gap = 0.5;
      const w = smooth(-1, 7, t);
      const bodyP = B.perim(toPts(rBody.map((v) => v + gap), [0, 0]));
      const patC = width - 2 * taper * clamp((t - 4) / (tEnd - 4), 0, 1);
      const tpl = normPerim(rBody.map((v) => v + gap)).map((v, k) => lerp(v, ellipse[k], w));
      const res = solveRing(rBody, gap, tpl, lerp(bodyP + 1, patC, w), [0, 0], null);
      if (t > 8 && res.tight) tight = true;
      const pts = res.pts.concat([res.pts[0]]);
      const c = [S[0] + dvec[0] * t, S[1] + dvec[1] * t, S[2] + dvec[2] * t];
      rings.push(pts.map(([u, v]) => [c[0] + U[0] * u + V[0] * v, c[1] + U[1] * u + V[1] * v, c[2] + U[2] * u + V[2] * v]));
      uvs.push(pts.map((_, k) => [k / N, 1 - (t - tStart) / (tEnd - tStart)]));
    }
    const cap = [S[0] + dvec[0] * (tStart - 1.1), S[1] + dvec[1] * (tStart - 1.1), S[2] + dvec[2] * (tStart - 1.1)];
    const hemC = B.perim(rings[rings.length - 1].slice(0, N).map(([x, y, z]) => [x * U[0] + y * U[1], z]));
    return { rings, uvs, capStart: cap, len: tEnd - tStart, circ: width, hemC, tight };
  };

  /* ---------- Pantalon ---------- */

  GW.trouserLeg = function (body, pat, m, side) {
    const L = body.L, leg = body.lofts['leg' + side];
    const yTop = L.crotch + 3, yHem = L.waist - m.outseam;
    const thighC = pat.thighC, kneeC = pat.kneeC, hemC = pat.hemC;
    const ellipse = normPerim(ellipseR(0.94));
    const rings = [], uvs = [];
    const steps = Math.ceil((yTop - yHem) / 1.5);
    const issues = [];
    for (let i = 0; i <= steps; i++) {
      const y = lerp(yTop, yHem, i / steps);
      const sec = B.sectionAt(leg, Math.max(y, L.ankle - 2.5));
      const c = B.centerAt(leg, Math.max(y, L.ankle));
      const rBody = polar(sec, c);
      const target = y >= L.crotch ? thighC : y >= L.knee ? lerp(kneeC, thighC, (y - L.knee) / (L.crotch - L.knee)) : lerp(hemC, kneeC, (y - yHem) / (L.knee - yHem));
      const res = solveRing(rBody, 0.45, ellipse, target, c, null);
      if (res.tight) issues.push({ y, deficit: res.deficit });
      const pts = res.pts.concat([res.pts[0]]);
      rings.push(pts.map((p) => [p[0], y, p[1]]));
      const P = B.perim(res.pts);
      uvs.push(pts.map((_, k) => [(k / N) * P / 16, y / 16]));
    }
    return { rings, uvs, issues };
  };

  GW.trouserTop = function (body, m) {
    const L = body.L, lofts = body.lofts;
    const rings = [], uvs = [];
    for (let y = L.waist + 0.5; y >= L.crotch + 1; y -= 1.5) {
      const sec = B.sectionAt(lofts.torso, y), c = B.centerAt(lofts.torso, y);
      const r = polar(sec, c).map((v) => v + 0.6);
      const pts = toPts(r, c);
      const all = pts.concat([pts[0]]);
      rings.push(all.map((p) => [p[0], y, p[1]]));
      uvs.push(all.map((_, k) => [k / N * 6, y / 16]));
    }
    return { rings, uvs, capEnd: [0, L.crotch - 0.5, 0] };
  };

  /* Cotes du patron utiles à l'habillage et au contrôle d'aisance. */
  GW.patternData = function (m, s) {
    const W = (m.chest + m.ease) / 4;
    const ahd = m.chest / 4 + 1;
    const d = Pattern.draft(m, s);
    const hemHalf = m.hemCirc / 4 - 0.5, kneeHalf = hemHalf + 1.3;
    return {
      base: { W, ahd, flare: 1.5, L: m.tunicLength, fnd: m.neck / 6 + 1.5, bnd: 2.2, nw: m.neck / 6 + 0.8 },
      sleeveWidth: d.summary.sleeveWidth,
      thighC: 0.6625 * m.hip + 2,
      kneeC: 4 * kneeHalf + 2,
      hemC: m.hemCirc,
      summary: d.summary,
    };
  };

  /* Contrôle d'aisance : vêtement fini − corps, zone par zone. */
  GW.fitCheck = function (body, pat, m) {
    const L = body.L, b = pat.base;
    const tunicAt = (y) => { const d = L.neckBase - y; return 4 * (b.W + b.flare * clamp((d - b.ahd) / (b.L - b.ahd), 0, 1)); };
    const hemY = L.neckBase - m.tunicLength;
    const rows = [
      { zone: 'Poitrine', body: m.chest, garment: m.chest + m.ease, min: 6 },
      { zone: 'Taille', body: m.waist, garment: tunicAt(L.waist), min: 4 },
      { zone: 'Bassin (tunique)', body: m.hip, garment: tunicAt(L.hip), min: 4, skip: hemY > L.hip },
      { zone: 'Tour de bras', body: m.bicep, garment: pat.sleeveWidth, min: 3 },
      { zone: 'Bassin (pantalon)', body: m.hip, garment: m.hip + 4, min: 3 },
      { zone: 'Cuisse', body: m.thigh, garment: pat.thighC, min: 4 },
      { zone: 'Genou', body: m.knee, garment: pat.kneeC, min: 3 },
      { zone: 'Bas / passage du pied', body: Math.round(m.ankle * 1.35), garment: pat.hemC, min: 0 },
    ];
    return rows.filter((r) => !r.skip).map((r) => {
      const ease = r.garment - r.body;
      const status = ease < 0 ? 'serré' : ease < r.min ? 'juste' : 'confort';
      return Object.assign(r, { ease, status });
    });
  };

  window.Garment3D = GW;
})();
