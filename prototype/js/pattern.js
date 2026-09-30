/*
 * Tracé paramétrique des patrons — ensemble tunique (kaftan) + pantalon.
 * Unités : cm. Méthode de base simplifiée (bloc homme) : à valider sur toile avant production.
 */
(function () {
  const { pt, add, sub, mul, norm, bezier, polyLength, pointAt } = G;

  const P = {};

  /* ---------- Tunique ---------- */

  function tunicBase(m) {
    const W = (m.chest + m.ease) / 4;
    const nw = m.neck / 6 + 0.8;          // demi-largeur d'encolure
    const fnd = m.neck / 6 + 1.5;         // profondeur encolure devant
    const bnd = 2.2;                      // profondeur encolure dos
    const drop = 4.5;                     // pente d'épaule
    const N = pt(nw, 0);
    const SP = pt(nw + Math.sqrt(Math.max(1, m.shoulder ** 2 - drop ** 2)), drop);
    const ahd = m.chest / 4 + 1;          // profondeur d'emmanchure depuis le haut d'épaule
    const L = m.tunicLength;
    const flare = 1.5;
    const d = norm(sub(SP, N));
    const perp = pt(-d.y, d.x);           // perpendiculaire à l'épaule, vers le bas
    return { W, nw, fnd, bnd, drop, N, SP, ahd, L, flare, d, perp };
  }

  function armhole(b, front) {
    const across = b.SP.x - (front ? 1.5 : 0.7);
    const ym = b.ahd - 8;
    const a = bezier(b.SP, add(b.SP, mul(b.perp, 3)), pt(across, ym - 5), pt(across, ym), 16);
    const c = bezier(pt(across, ym), pt(across, ym + 4), pt(b.W - (front ? 3.2 : 2.6), b.ahd), pt(b.W, b.ahd), 16);
    return a.concat(c.slice(1));
  }

  function neckCurve(b, depth) {
    // de l'épaule (N) vers le milieu (0, depth), perpendiculaire au milieu
    return bezier(b.N, add(b.N, mul(b.perp, depth * 0.45)), pt(b.nw * 0.55, depth), pt(0, depth), 20);
  }

  function chevronGeom(s, i, fnd) {
    const top = fnd + s.chevTop + i * (s.chevBand + s.chevGap);
    return { top, half: s.chevWidth / 2, drop: s.chevDrop, band: s.chevBand };
  }

  /* longueur du passepoil de patte : de l'encolure jusqu'au bord haut du premier chevron */
  function placketLine(b, s) {
    const x = s.placketGap / 2;
    const neck = neckCurve(b, b.fnd);
    let y0 = b.fnd;
    for (let i = 1; i < neck.length; i++) {
      if (neck[i].x <= x && neck[i - 1].x >= x) {
        const t = (neck[i - 1].x - x) / ((neck[i - 1].x - neck[i].x) || 1);
        y0 = neck[i - 1].y + (neck[i].y - neck[i - 1].y) * t;
        break;
      }
    }
    let y1 = b.fnd + s.chevTop + 20;
    if (s.chevCount > 0) {
      const c = chevronGeom(s, 0, b.fnd);
      y1 = c.top + c.drop * (1 - Math.min(1, x / c.half));
    }
    return { x, y0, y1, len: y1 - y0 };
  }

  function tunicBody(m, s, front) {
    const b = tunicBase(m);
    const depth = front ? b.fnd : b.bnd;
    const arm = armhole(b, front);
    const neck = neckCurve(b, depth);
    const H = pt(b.W + b.flare, b.L);
    const segs = [
      { name: 'shoulder', pts: [b.N, b.SP], sa: 1 },
      { name: 'armhole', pts: arm, sa: 1 },
      { name: 'side', pts: [pt(b.W, b.ahd), H], sa: 1.5 },
      { name: 'hem', pts: [H, pt(0, b.L)], sa: 3 },
      { name: 'fold', pts: [pt(0, b.L), pt(0, depth)], sa: 0, kind: 'fold' },
      { name: 'neck', pts: neck.slice().reverse(), sa: 1 },
    ];
    const marks = [];
    const notches = [];
    // fente de côté
    const sideDir = norm(sub(H, pt(b.W, b.ahd)));
    const slitTop = sub(H, mul(sideDir, m.sideSlit));
    notches.push({ seg: 'side', p: slitTop, dir: sideDir, n: 1 });
    marks.push({ type: 'text', p: add(slitTop, pt(-4.2, m.sideSlit / 2)), text: 'fente ' + G.fmt(m.sideSlit) + ' cm', size: 0.7, rot: -90 });
    // crans d'emmanchure (devant 1, dos 2) à 8/9 cm de l'aisselle, mesurés sur la couture
    const armRev = arm.slice().reverse();
    const an = pointAt(armRev, front ? 8 : 9);
    notches.push({ seg: 'armhole', p: an.p, dir: mul(an.dir, -1), n: front ? 1 : 2 });
    notches.push({ seg: 'shoulder', p: b.SP, dir: b.d, n: 1 });
    // repères
    marks.push({ type: 'line', a: pt(0, b.ahd), b: pt(b.W, b.ahd), cls: 'ref', label: 'ligne de poitrine' });
    if (front) {
      const pl = placketLine(b, s);
      marks.push({ type: 'line', a: pt(pl.x, pl.y0), b: pt(pl.x, pl.y1), cls: 'accent', label: 'passepoil' });
      const slitEnd = pl.y1 - 1;
      marks.push({ type: 'line', a: pt(0.15, depth), b: pt(0.15, slitEnd), cls: 'cut', label: '' });
      marks.push({ type: 'text', p: pt(0.9, (depth + slitEnd) / 2 + 3), text: 'ouverture ' + G.fmt(slitEnd - depth) + ' cm', size: 0.65, rot: -90 });
      for (let i = 0; i < s.chevCount; i++) {
        const c = chevronGeom(s, i, b.fnd);
        marks.push({
          type: 'poly', cls: 'accent-fill',
          pts: [pt(0, c.top + c.drop), pt(c.half, c.top), pt(c.half, c.top + c.band), pt(0, c.top + c.drop + c.band)],
          open: true,
        });
      }
      if (s.chevCount) marks.push({ type: 'text', p: pt(b.W * 0.5 + 2.5, b.fnd + s.chevTop - 1.2), text: 'placement chevrons', size: 0.7 });
    }
    return {
      segs, marks, notches,
      grain: [pt(b.W * 0.86, b.ahd + 8), pt(b.W * 0.86, b.L - 14)],
      label: pt(b.W * 0.18, b.ahd + 16),
      _b: b, _arm: arm,
    };
  }

  function sleeve(m, s) {
    const b = tunicBase(m);
    const armF = armhole(b, true), armB = armhole(b, false);
    const AHf = polyLength(armF), AHb = polyLength(armB);
    const ease = 1.2;
    let hc = 0.65 * (b.ahd - b.drop);
    let bf, bb, capF, capB;
    const build = () => {
      capF = bezier(pt(0, 0), pt(bf * 0.2, 0), pt(bf * 0.38, hc * 0.22), pt(bf * 0.52, hc * 0.5), 14)
        .concat(bezier(pt(bf * 0.52, hc * 0.5), pt(bf * 0.66, hc * 0.8), pt(bf * 0.8, hc * 1.0), pt(bf, hc), 14).slice(1));
      capB = bezier(pt(0, 0), pt(-bb * 0.22, 0), pt(-bb * 0.4, hc * 0.2), pt(-bb * 0.55, hc * 0.46), 14)
        .concat(bezier(pt(-bb * 0.55, hc * 0.46), pt(-bb * 0.7, hc * 0.72), pt(-bb * 0.82, hc * 0.98), pt(-bb, hc), 14).slice(1));
    };
    for (let tries = 0; tries < 12; tries++) {
      bf = Math.sqrt(Math.max(4, (AHf + ease / 2) ** 2 - hc ** 2));
      bb = Math.sqrt(Math.max(4, (AHb + ease / 2) ** 2 - hc ** 2));
      for (let k = 0; k < 25; k++) {
        build();
        bf *= (AHf + ease / 2) / polyLength(capF);
        bb *= (AHb + ease / 2) / polyLength(capB);
      }
      build();
      if (bf + bb >= m.bicep + 5) break;
      hc -= 0.6; // tête de manche moins haute = manche plus large
    }
    const Ls = m.sleeveLength, taper = 1.2;
    const hemF = pt(bf - taper, Ls), hemB = pt(-bb + taper, Ls);
    const segs = [
      { name: 'capF', pts: capF, sa: 1 },
      { name: 'underF', pts: [pt(bf, hc), hemF], sa: 1 },
      { name: 'hem', pts: [hemF, hemB], sa: 3 },
      { name: 'underB', pts: [hemB, pt(-bb, hc)], sa: 1 },
      { name: 'capB', pts: capB.slice().reverse(), sa: 1 },
    ];
    const nf = pointAt(capF.slice().reverse(), 8), nb = pointAt(capB.slice().reverse(), 9);
    const notches = [
      { p: nf.p, dir: mul(nf.dir, -1), n: 1 },
      { p: nb.p, dir: mul(nb.dir, -1), n: 2 },
      { p: pt(0, 0), dir: pt(1, 0), n: 1 },
    ];
    const marks = [
      { type: 'line', a: pt(-bb, hc), b: pt(bf, hc), cls: 'ref', label: 'ligne de biceps' },
      { type: 'line', a: add(hemB, pt(0, -0.25)), b: add(hemF, pt(0, -0.25)), cls: 'accent', label: 'passepoil' },
      { type: 'text', p: pt(bf * 0.45, hc * 0.5 + 2.2), text: 'devant', size: 0.7 },
      { type: 'text', p: pt(-bb * 0.62, hc * 0.5 + 2.2), text: 'dos', size: 0.7 },
    ];
    return {
      segs, marks, notches,
      grain: [pt(0, 1.8), pt(0, hc - 0.8)],
      label: pt(-bb * 0.55, hc + 3.2),
      info: { AHf, AHb, cap: polyLength(capF) + polyLength(capB), width: bf + bb, hc },
    };
  }

  function facing(m, s, front) {
    const b = tunicBase(m);
    const depth = front ? b.fnd : b.bnd;
    const neck = neckCurve(b, depth).slice().reverse(); // (0,depth) -> N
    const S5 = add(b.N, mul(b.d, 5));
    const pl = placketLine(b, s);
    const bottom = front ? pl.y1 - 1 + 3 : depth + 6;
    let outer;
    if (front) {
      outer = bezier(S5, add(S5, mul(b.perp, 4)), pt(4, depth + 3), pt(4, depth + 7), 16).concat([pt(4, bottom)]);
    } else {
      outer = bezier(S5, add(S5, mul(b.perp, 4)), pt(4, bottom), pt(0, bottom), 16);
    }
    const segs = [
      { name: 'neck', pts: neck, sa: 1 },
      { name: 'shoulder', pts: [b.N, S5], sa: 1 },
      { name: 'outer', pts: outer.concat(front ? [pt(0, bottom)] : []), sa: 0 },
      { name: 'fold', pts: [pt(0, bottom), pt(0, depth)], sa: 0, kind: 'fold' },
    ];
    const marks = [];
    if (front) {
      marks.push({ type: 'line', a: pt(0.15, depth), b: pt(0.15, pl.y1 - 1), cls: 'cut', label: '' });
    }
    return {
      segs, marks, notches: [],
      grain: front ? [pt(2.9, depth + 8), pt(2.9, bottom - 2)] : [pt(3.2, depth + 1), pt(3.2, bottom - 0.8)],
      compact: true,
    };
  }

  function chevron(m, s) {
    const h = s.chevWidth / 2, d = s.chevDrop, t = s.chevBand;
    const segs = [{
      name: 'edge', sa: 0.7,
      pts: [pt(-h, 0), pt(0, d), pt(h, 0), pt(h, t), pt(0, d + t), pt(-h, t), pt(-h, 0)],
    }];
    return { segs, marks: [], notches: [{ p: pt(0, d), dir: pt(1, 0), n: 1 }], grain: [pt(-h + 2.2, 1.7), pt(-h + 2.2, t + 0.1)], compact: true };
  }

  /* ---------- Pantalon ---------- */

  function trouser(m, s, front) {
    const wb = 4;
    const L = m.outseam - wb;
    const yc = m.rise - wb;
    const yh = yc * 0.68;
    const yk = L / 2 + 5;
    const hemHalf = m.hemCirc / 4 - 0.5 + (front ? 0 : 1);
    const kneeHalf = hemHalf + 1.3;
    let segs, crease, crotchCurve;
    if (front) {
      const fw = m.hip / 4 + 0.5, ext = m.hip / 16;
      crease = (fw + ext) / 2;
      const C = pt(fw + ext, yc);
      crotchCurve = bezier(pt(fw, yh), pt(fw, yh + (yc - yh) * 0.6), pt(fw + ext * 0.3, yc), C, 16);
      const Kin = pt(crease + kneeHalf, yk), Kout = pt(crease - kneeHalf, yk);
      segs = [
        { name: 'waist', pts: [pt(0.6, 0), pt(fw - 0.8, 0)], sa: 1 },
        { name: 'cf', pts: [pt(fw - 0.8, 0)].concat(crotchCurve), sa: 1 },
        { name: 'inseam', pts: bezier(C, pt(C.x - 1.2, yc + 8), pt(Kin.x + 0.4, yk - 12), Kin, 18).concat([pt(crease + hemHalf, L)]), sa: 1 },
        { name: 'hem', pts: [pt(crease + hemHalf, L), pt(crease - hemHalf, L)], sa: 3 },
        { name: 'outseam', pts: [pt(crease - hemHalf, L)].concat(bezier(Kout, pt(Kout.x - 1.5, yk - 18), pt(0, yh + 12), pt(0, yh), 18)).concat([pt(0.6, 0)]), sa: 1.5 },
      ];
    } else {
      const bw = m.hip / 4 + 1.5, ext = m.hip / 10;
      crease = (bw + ext) / 2 - 0.5;
      const top = pt(bw - 3.5, -2.5);
      const C = pt(bw + ext, yc + 1);
      const dir = norm(sub(pt(bw, yh), top));
      crotchCurve = bezier(pt(bw, yh), add(pt(bw, yh), mul(dir, 4)), pt(bw + ext * 0.4, yc + 1), C, 16);
      const Kin = pt(crease + kneeHalf, yk), Kout = pt(crease - kneeHalf, yk);
      segs = [
        { name: 'waist', pts: [pt(1, 0), top], sa: 1 },
        { name: 'cb', pts: [top].concat(crotchCurve), sa: 1 },
        { name: 'inseam', pts: bezier(C, pt(C.x - 1.8, yc + 8), pt(Kin.x + 0.5, yk - 12), Kin, 18).concat([pt(crease + hemHalf, L)]), sa: 1 },
        { name: 'hem', pts: [pt(crease + hemHalf, L), pt(crease - hemHalf, L)], sa: 3 },
        { name: 'outseam', pts: [pt(crease - hemHalf, L)].concat(bezier(Kout, pt(Kout.x - 1.5, yk - 18), pt(0, yh + 12), pt(0, yh), 18)).concat([pt(1, 0)]), sa: 1.5 },
      ];
    }
    const cc = crotchCurve.slice();
    const nc = pointAt(cc, polyLength(cc) * 0.45);
    const notches = [
      { p: nc.p, dir: nc.dir, n: front ? 1 : 2 },
      { p: pt(crease - kneeHalf, yk), dir: pt(0, -1), n: 1 },
      { p: pt(crease + kneeHalf, yk), dir: pt(0, -1), n: 1 },
    ];
    const marks = [
      { type: 'line', a: pt(crease - kneeHalf, yk), b: pt(crease + kneeHalf, yk), cls: 'ref', label: 'ligne de genou' },
      { type: 'line', a: pt(0, yh), b: pt(crotchCurve[0].x, yh), cls: 'ref', label: 'ligne de hanches' },
    ];
    return {
      segs, marks, notches,
      grain: [pt(crease, yh + 4), pt(crease, yk - 3)],
      label: pt(crease - kneeHalf + 1.2, yk + 9),
    };
  }

  /* Ceinture coulissée en deux moitiés (coutures milieu devant / milieu dos), droit fil dans la longueur. */
  function waistband(m) {
    const hl = (m.hip + 6) / 2, h = 8;
    const segs = [
      { name: 'cf', pts: [pt(0, 0), pt(h, 0)], sa: 1 },
      { name: 'edge2', pts: [pt(h, 0), pt(h, hl)], sa: 1 },
      { name: 'cb', pts: [pt(h, hl), pt(0, hl)], sa: 1 },
      { name: 'edge1', pts: [pt(0, hl), pt(0, 0)], sa: 1 },
    ];
    return {
      segs, notches: [{ p: pt(h / 2, hl / 2), dir: pt(0, 1), n: 1 }],
      marks: [
        { type: 'line', a: pt(h / 2, 0), b: pt(h / 2, hl), cls: 'ref', label: '' },
        { type: 'text', p: pt(h / 2 + 0.5, 3), text: 'pli', size: 0.6, rot: 90 },
        { type: 'text', p: pt(0.6, 1.2), text: 'milieu devant', size: 0.55 },
      ],
      grain: [pt(h * 0.25, hl * 0.3), pt(h * 0.25, hl * 0.7)],
      label: pt(h / 2 + 0.9, hl * 0.35), vertical: true,
    };
  }

  /* ---------- Assemblage ---------- */

  function finish(def) {
    const asm = G.assemble(def.segs);
    const cut = G.offsetPolygon(asm.pts, asm.edgeSA);
    const orient = G.signedArea(asm.pts) > 0 ? 1 : -1;
    const folds = def.segs.filter((s) => s.kind === 'fold').map((s) => s.pts);
    const bb = G.bbox(cut.concat(asm.pts));
    // pièces compactes : étiquette sous la pièce
    let bbl = Object.assign({}, bb);
    if (def.compact) {
      def.label = pt(bb.minX + 0.3, bb.maxY + 1.3);
      bbl.maxY = bb.maxY + 3.6; bbl.maxX = Math.max(bb.maxX, bb.minX + 15);
      bbl.w = bbl.maxX - bbl.minX; bbl.h = bbl.maxY - bbl.minY;
    }
    return Object.assign(def, { seam: asm.pts, cut, orient, folds, bbox: bb, bboxLabel: bbl, fold: folds.length > 0 });
  }

  P.draft = function (m, s) {
    const pieces = [
      Object.assign(tunicBody(m, s, true), { id: 'T1', name: 'Tunique – devant', qty: 1, fabric: 'main' }),
      Object.assign(tunicBody(m, s, false), { id: 'T2', name: 'Tunique – dos', qty: 1, fabric: 'main' }),
      Object.assign(sleeve(m, s), { id: 'T3', name: 'Manche', qty: 2, fabric: 'main' }),
      Object.assign(facing(m, s, true), { id: 'T4', name: 'Parementure devant', qty: 1, fabric: 'main', interfacing: true }),
      Object.assign(facing(m, s, false), { id: 'T5', name: 'Parementure dos', qty: 1, fabric: 'main', interfacing: true }),
      Object.assign(trouser(m, s, true), { id: 'P1', name: 'Pantalon – devant', qty: 2, fabric: 'main' }),
      Object.assign(trouser(m, s, false), { id: 'P2', name: 'Pantalon – dos', qty: 2, fabric: 'main' }),
      Object.assign(waistband(m), { id: 'P3', name: 'Ceinture coulissée', qty: 2, fabric: 'main' }),
    ];
    if (s.chevCount > 0) pieces.push(Object.assign(chevron(m, s), { id: 'T6', name: 'Chevron appliqué', qty: s.chevCount, fabric: 'accent' }));
    pieces.forEach(finish);

    const b = tunicBase(m);
    const pl = placketLine(b, s);
    const sl = pieces.find((p) => p.id === 'T3');
    const sleeveHem = G.dist(sl.segs[2].pts[0], sl.segs[2].pts[1]);
    const summary = {
      finishedChest: m.chest + m.ease,
      armholeF: sl.info.AHf, armholeB: sl.info.AHb, capLength: sl.info.cap, sleeveWidth: sl.info.width,
      placketLen: pl.len, placketGap: s.placketGap,
      pipingLen: 2 * pl.len + 2 * sleeveHem,
      opening: pl.y1 - 1 - b.fnd,
      elastic: Math.round(m.waist * 0.9),
      sleeveHem,
    };
    return { pieces, summary };
  };

  /* ---------- Rendu SVG d'une pièce (coordonnées en cm) ---------- */

  function outward(dir, orient) {
    return orient > 0 ? pt(dir.y, -dir.x) : pt(-dir.y, dir.x);
  }

  function arrowHead(p, dir, size) {
    const n = pt(-dir.y, dir.x);
    const a = add(sub(p, mul(dir, size)), mul(n, size * 0.45));
    const c = add(sub(p, mul(dir, size)), mul(n, -size * 0.45));
    return `M${a.x.toFixed(2)} ${a.y.toFixed(2)}L${p.x.toFixed(2)} ${p.y.toFixed(2)}L${c.x.toFixed(2)} ${c.y.toFixed(2)}`;
  }

  function esc(t) { return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;'); }

  P.renderPiece = function (pc, ctx) {
    const o = [];
    const fabricFill = pc.fabric === 'accent' ? 'var(--pc-accent-fill, #f3f1ea)' : 'var(--pc-fill, #f6efe9)';
    o.push(`<path class="pc-cut" d="${G.toPath(pc.cut)}" fill="${fabricFill}"/>`);
    o.push(`<path class="pc-seam" d="${G.toPath(pc.seam)}"/>`);
    // marques
    pc.marks.forEach((mk) => {
      if (mk.type === 'line') {
        o.push(`<path class="pc-mark ${mk.cls}" d="M${mk.a.x.toFixed(2)} ${mk.a.y.toFixed(2)}L${mk.b.x.toFixed(2)} ${mk.b.y.toFixed(2)}"/>`);
        if (mk.label && mk.cls === 'ref') {
          const mid = G.lerp(mk.a, mk.b, 0.5);
          o.push(`<text class="pc-small" x="${mid.x.toFixed(2)}" y="${(mk.a.y - 0.35).toFixed(2)}" text-anchor="middle">${esc(mk.label)}</text>`);
        }
      } else if (mk.type === 'poly') {
        o.push(`<path class="pc-mark ${mk.cls}" d="${G.toPath(mk.pts, !mk.open)}"/>`);
      } else if (mk.type === 'text') {
        const r = mk.rot ? ` transform="rotate(${mk.rot} ${mk.p.x.toFixed(2)} ${mk.p.y.toFixed(2)})"` : '';
        o.push(`<text class="pc-small" x="${mk.p.x.toFixed(2)}" y="${mk.p.y.toFixed(2)}" font-size="${mk.size}"${r}>${esc(mk.text)}</text>`);
      }
    });
    // pliure
    pc.folds.forEach((f) => {
      const a = f[0], b = f[f.length - 1];
      const dir = norm(sub(b, a));
      const n = mul(outward(dir, pc.orient), -1); // vers l'intérieur
      const inset = pc.compact ? 0.8 : 1.6;
      const p1 = add(G.lerp(a, b, 0.15), mul(n, inset)), p2 = add(G.lerp(a, b, 0.85), mul(n, inset));
      const e1 = G.lerp(a, b, 0.15), e2 = G.lerp(a, b, 0.85);
      o.push(`<path class="pc-fold" d="M${e1.x.toFixed(2)} ${e1.y.toFixed(2)}L${p1.x.toFixed(2)} ${p1.y.toFixed(2)}L${p2.x.toFixed(2)} ${p2.y.toFixed(2)}L${e2.x.toFixed(2)} ${e2.y.toFixed(2)}"/>`);
      o.push(`<path class="pc-fold" d="${arrowHead(e1, mul(n, -1), 0.7)}${arrowHead(e2, mul(n, -1), 0.7)}"/>`);
      const mid = add(G.lerp(a, b, 0.5), mul(n, inset + (pc.compact ? 0.35 : 0.5)));
      const ang = Math.atan2(dir.y, dir.x) * 180 / Math.PI;
      const rot = ang > 90 || ang < -90 ? ang + 180 : ang;
      o.push(`<text class="pc-fold-t" x="${mid.x.toFixed(2)}" y="${mid.y.toFixed(2)}" text-anchor="middle" transform="rotate(${rot.toFixed(1)} ${mid.x.toFixed(2)} ${mid.y.toFixed(2)})"${pc.compact ? ' font-size=".5"' : ''}>${pc.compact ? 'PLIURE' : 'PLIURE — placer sur le pli du tissu'}</text>`);
    });
    // droit fil
    if (!pc.grainHidden) {
      const [a, b] = pc.grain;
      const dir = norm(sub(b, a));
      o.push(`<path class="pc-grain" d="M${a.x.toFixed(2)} ${a.y.toFixed(2)}L${b.x.toFixed(2)} ${b.y.toFixed(2)}${arrowHead(b, dir, 0.9)}${arrowHead(a, mul(dir, -1), 0.9)}"/>`);
      const mid = G.lerp(a, b, 0.5);
      const ang = Math.atan2(dir.y, dir.x) * 180 / Math.PI;
      o.push(`<text class="pc-small" x="${(mid.x).toFixed(2)}" y="${(mid.y).toFixed(2)}" dy="-0.35" text-anchor="middle" transform="rotate(${ang.toFixed(1)} ${mid.x.toFixed(2)} ${mid.y.toFixed(2)})">droit fil</text>`);
    }
    // crans
    pc.notches.forEach((nt) => {
      const n = outward(norm(nt.dir), pc.orient);
      const saHere = 1;
      for (let k = 0; k < nt.n; k++) {
        const off = (k - (nt.n - 1) / 2) * 0.45;
        const base = add(nt.p, mul(norm(nt.dir), off));
        const tip = add(base, mul(n, saHere * 0.9));
        const inn = add(base, mul(n, -0.25));
        o.push(`<path class="pc-notch" d="M${inn.x.toFixed(2)} ${inn.y.toFixed(2)}L${tip.x.toFixed(2)} ${tip.y.toFixed(2)}"/>`);
      }
    });
    // étiquette
    const L = pc.label;
    const fabricTxt = pc.fabric === 'accent' ? 'tissu appliqué' : 'tissu principal';
    const qtyTxt = `Couper ${pc.qty} × ${fabricTxt}` + (pc.fold ? ' — sur pliure' : (pc.qty > 1 && pc.fabric === 'main' ? ' (tissu plié)' : ''));
    const lines = [
      [`${pc.id} · ${pc.name}`, 'pc-title'],
      [qtyTxt, 'pc-txt'],
      [`${ctx.model} · taille ${ctx.size}`, 'pc-txt'],
    ];
    if (pc.interfacing) lines.push(['+ entoilage thermocollant', 'pc-txt']);
    const lh = pc.compact ? 0.85 : 1.35;
    const rot = pc.vertical ? ` transform="rotate(90 ${L.x.toFixed(2)} ${L.y.toFixed(2)})"` : '';
    lines.forEach(([t, c], i) => {
      const x = pc.vertical ? L.x - i * lh * 0 : L.x, y = L.y + (pc.vertical ? 0 : i * lh);
      const tx = pc.vertical ? ` dy="${(-i * 0.95).toFixed(2)}"` : '';
      o.push(`<text class="${c}${pc.compact || pc.vertical ? ' compact' : ''}" x="${x.toFixed(2)}" y="${y.toFixed(2)}"${tx}${rot}>${esc(t)}</text>`);
    });
    return o.join('');
  };

  P.pieceCSS = `
    .pc-cut{stroke:#1b1d1f;stroke-width:.07;stroke-linejoin:round}
    .pc-seam{fill:none;stroke:#4d6fb8;stroke-width:.045;stroke-dasharray:.45 .25}
    .pc-mark{fill:none;stroke:#8a8f94;stroke-width:.04;stroke-dasharray:.2 .2}
    .pc-mark.accent{stroke:#b0412e;stroke-width:.07;stroke-dasharray:none}
    .pc-mark.accent-fill{stroke:#b0412e;stroke-width:.06;stroke-dasharray:.35 .2;fill:rgba(176,65,46,.07)}
    .pc-mark.cut{stroke:#1b1d1f;stroke-width:.07;stroke-dasharray:1 .3 .15 .3}
    .pc-fold{fill:none;stroke:#1b1d1f;stroke-width:.06}
    .pc-fold-t{font:600 .62px 'IBM Plex Mono',ui-monospace,monospace;fill:#1b1d1f;letter-spacing:.04px}
    .pc-grain{fill:none;stroke:#1b1d1f;stroke-width:.07}
    .pc-notch{stroke:#1b1d1f;stroke-width:.09}
    .pc-title{font:700 1.15px 'Archivo','Arial Narrow',Arial,sans-serif;fill:#1b1d1f}
    .pc-title.compact{font-size:.8px}
    .pc-txt{font:400 .8px 'IBM Plex Sans',Arial,sans-serif;fill:#33373b}
    .pc-txt.compact{font-size:.6px}
    .pc-small{font:400 .6px 'IBM Plex Mono',ui-monospace,monospace;fill:#5c6167}
  `;

  /* ---------- Placement (planche + plan de coupe) ---------- */

  /* Placement « skyline » : pièces sur pliure collées au bord x = 0. */
  P.pack = function (items, width, gap) {
    const res = 0.5;
    const cells = Math.ceil(width / res);
    const sky = new Array(cells).fill(0);
    const placed = [];
    const order = items.slice().sort((a, b) => b.h - a.h);
    order.forEach((it) => {
      const wc = Math.ceil((it.w + gap) / res);
      const maxStart = it.fold ? 0 : Math.max(0, cells - Math.ceil(it.w / res));
      let best = null;
      for (let x = maxStart; x >= 0; x--) {
        let y = 0;
        for (let k = x; k < Math.min(cells, x + wc); k++) y = Math.max(y, sky[k]);
        if (!best || y < best.y - 1e-6) best = { x, y };
      }
      const y = best.y > 0 ? best.y + gap : 0;
      for (let k = best.x; k < Math.min(cells, best.x + wc); k++) sky[k] = y + it.h;
      placed.push(Object.assign({}, it, { x: best.x * res, y }));
    });
    return { placed, length: Math.max(...placed.map((p) => p.y + p.h)) };
  };

  window.Pattern = P;
})();
