/* Géométrie 2D pour le tracé de patrons (unités : cm, axe y vers le bas). */
(function () {
  const G = {};

  G.pt = (x, y) => ({ x, y });
  G.add = (a, b) => ({ x: a.x + b.x, y: a.y + b.y });
  G.sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y });
  G.mul = (a, k) => ({ x: a.x * k, y: a.y * k });
  G.len = (a) => Math.hypot(a.x, a.y);
  G.dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  G.norm = (a) => { const l = G.len(a) || 1; return { x: a.x / l, y: a.y / l }; };
  G.lerp = (a, b, t) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
  G.cross = (a, b) => a.x * b.y - a.y * b.x;

  /* Échantillonne une courbe de Bézier cubique en n segments (retourne n+1 points). */
  G.bezier = (p0, p1, p2, p3, n = 24) => {
    const out = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n, u = 1 - t;
      out.push({
        x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x,
        y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y,
      });
    }
    return out;
  };

  G.polyLength = (pts) => {
    let l = 0;
    for (let i = 1; i < pts.length; i++) l += G.dist(pts[i - 1], pts[i]);
    return l;
  };

  /* Point et tangente situés à la distance d le long d'une polyligne. */
  G.pointAt = (pts, d) => {
    let acc = 0;
    for (let i = 1; i < pts.length; i++) {
      const s = G.dist(pts[i - 1], pts[i]);
      if (acc + s >= d || i === pts.length - 1) {
        const t = s ? Math.min(1, Math.max(0, (d - acc) / s)) : 0;
        return { p: G.lerp(pts[i - 1], pts[i], t), dir: G.norm(G.sub(pts[i], pts[i - 1])) };
      }
      acc += s;
    }
    return { p: pts[0], dir: { x: 1, y: 0 } };
  };

  G.signedArea = (pts) => {
    let a = 0;
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i], q = pts[(i + 1) % pts.length];
      a += p.x * q.y - q.x * p.y;
    }
    return a / 2;
  };

  G.bbox = (pts) => {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of pts) {
      if (p.x < minX) minX = p.x; if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x; if (p.y > maxY) maxY = p.y;
    }
    return { minX, minY, maxX, maxY, w: maxX - minX, h: maxY - minY };
  };

  /* Intersection de deux droites (p + t·r) et (q + u·s). */
  G.lineIntersect = (p, r, q, s) => {
    const d = G.cross(r, s);
    if (Math.abs(d) < 1e-9) return null;
    const t = G.cross(G.sub(q, p), s) / d;
    return G.add(p, G.mul(r, t));
  };

  /*
   * Contour d'une pièce = liste ordonnée de segments { pts, sa, kind }.
   * sa = valeur de couture (cm) appliquée à ce segment ; kind = 'fold' pour une pliure.
   * Retourne { seam: [points], edges: [{a,b,sa,kind}] } avec les points dédupliqués.
   */
  G.assemble = (segments) => {
    const pts = [], edgeSA = [], edgeKind = [];
    segments.forEach((seg) => {
      seg.pts.forEach((p, i) => {
        if (pts.length && i === 0 && G.dist(pts[pts.length - 1], p) < 1e-6) return;
        if (pts.length) { edgeSA.push(seg.sa); edgeKind.push(seg.kind || 'seam'); }
        pts.push(p);
      });
    });
    // fermeture : l'arête vers le point dupliqué devient l'arête de fermeture
    if (G.dist(pts[0], pts[pts.length - 1]) < 1e-6) pts.pop();
    else {
      const last = segments[segments.length - 1];
      edgeSA.push(last.sa); edgeKind.push(last.kind || 'seam');
    }
    return { pts, edgeSA, edgeKind };
  };

  /* Décale un polygone fermé vers l'extérieur, avec une valeur par arête (jonctions en onglet limité). */
  G.offsetPolygon = (pts, edgeSA) => {
    const n = pts.length;
    const orient = G.signedArea(pts) > 0 ? 1 : -1; // y vers le bas : >0 = sens horaire à l'écran
    const lines = [];
    for (let i = 0; i < n; i++) {
      const a = pts[i], b = pts[(i + 1) % n];
      const d = G.norm(G.sub(b, a));
      // normale extérieure
      const nx = orient > 0 ? { x: d.y, y: -d.x } : { x: -d.y, y: d.x };
      const o = G.mul(nx, edgeSA[i]);
      lines.push({ p: G.add(a, o), q: G.add(b, o), d, nx, sa: edgeSA[i] });
    }
    const out = [];
    for (let i = 0; i < n; i++) {
      const L1 = lines[(i - 1 + n) % n], L2 = lines[i];
      const v = pts[i];
      const turn = Math.abs(G.cross(L1.d, L2.d));
      if (turn < 0.02 && Math.abs(L1.sa - L2.sa) < 1e-6) {
        out.push(G.add(v, G.mul(G.norm(G.add(L1.nx, L2.nx)), L2.sa)));
        continue;
      }
      const x = turn < 0.02 ? null : G.lineIntersect(L1.p, L1.d, L2.p, L2.d);
      const lim = 3 * Math.max(L1.sa, L2.sa, 0.3);
      if (x && G.dist(x, v) <= lim) out.push(x);
      else { out.push(L1.q); out.push(L2.p); } // biseau
    }
    return out;
  };

  G.toPath = (pts, close = true, k = 1) =>
    pts.map((p, i) => (i ? 'L' : 'M') + (p.x * k).toFixed(2) + ' ' + (p.y * k).toFixed(2)).join('') + (close ? 'Z' : '');

  G.fmt = (v, d = 1) => (Math.round(v * 10 ** d) / 10 ** d).toLocaleString('fr-FR');

  window.G = G;
})();
