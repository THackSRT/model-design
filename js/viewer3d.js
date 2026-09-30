/*
 * Rendu 3D (three.js) de l'avatar et de la tenue en planche multi-vues :
 * 3/4 côté droit · face · dos · 3/4 côté gauche, avec rotation libre au glisser.
 * Style « croquis » : corps blanc, contours foncés, lignes de construction en pointillés.
 */
(function () {
  const V = {};
  const N = () => Body.N;
  const PX = 10; // px par cm dans les textures

  V.VIEWS = [
    { label: '3/4 côté droit', angle: Math.PI / 4 },
    { label: 'Face', angle: 0 },
    { label: 'Dos', angle: Math.PI },
    { label: '3/4 côté gauche', angle: -Math.PI / 4 },
  ];

  let renderer, scene, camera, root, bodyGroup, garmentGroup, linesGroup, host, labelsEl;
  let offset = 0, ready = false, model = null, stature = 176;
  const opts = { garment: true, lines: false, shoes: true };

  V.available = () => typeof window.THREE !== 'undefined';

  /* ---------- géométrie ---------- */

  function geometryFromRings(rings, uvs, capStart, capEnd) {
    const n = rings[0].length; // N + 1 (couture dupliquée)
    const pos = [], uv = [], idx = [];
    rings.forEach((ring, r) => ring.forEach((p, k) => {
      pos.push(p[0], p[1], p[2]);
      if (uvs) uv.push(uvs[r][k][0], uvs[r][k][1]); else uv.push(k / (n - 1), 1 - r / (rings.length - 1));
    }));
    for (let r = 0; r < rings.length - 1; r++) {
      for (let k = 0; k < n - 1; k++) {
        const a = r * n + k, b = a + 1, c = a + n, d = c + 1;
        idx.push(a, c, b, b, c, d);
      }
    }
    const addCap = (pt, r, flip) => {
      const ci = pos.length / 3;
      pos.push(pt[0], pt[1], pt[2]); uv.push(0.5, flip ? 0 : 1);
      for (let k = 0; k < n - 1; k++) {
        const a = r * n + k, b = a + 1;
        if (flip) idx.push(b, a, ci); else idx.push(a, b, ci);
      }
    };
    if (capStart) addCap(capStart, 0, false);
    if (capEnd) addCap(capEnd, rings.length - 1, true);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    g.computeVertexNormals();
    // orientation : les normales doivent sortir de la surface
    const mid = Math.floor(rings.length / 2), ring = rings[mid];
    let cx = 0, cy = 0, cz = 0;
    for (let k = 0; k < n - 1; k++) { cx += ring[k][0]; cy += ring[k][1]; cz += ring[k][2]; }
    cx /= n - 1; cy /= n - 1; cz /= n - 1;
    const nrm = g.attributes.normal, vi = mid * n + Math.floor((n - 1) / 2);
    const dot = (ring[Math.floor((n - 1) / 2)][0] - cx) * nrm.getX(vi) + (ring[Math.floor((n - 1) / 2)][1] - cy) * nrm.getY(vi) + (ring[Math.floor((n - 1) / 2)][2] - cz) * nrm.getZ(vi);
    if (dot < 0) {
      const ix = g.index.array;
      for (let i = 0; i < ix.length; i += 3) { const t = ix[i + 1]; ix[i + 1] = ix[i + 2]; ix[i + 2] = t; }
      g.index.needsUpdate = true;
      g.computeVertexNormals();
    }
    // lisse la couture (colonne 0 = colonne N)
    for (let r = 0; r < rings.length; r++) {
      const a = r * n, b = r * n + n - 1;
      const x = nrm.getX(a) + nrm.getX(b), y = nrm.getY(a) + nrm.getY(b), z = nrm.getZ(a) + nrm.getZ(b);
      const l = Math.hypot(x, y, z) || 1;
      nrm.setXYZ(a, x / l, y / l, z / l); nrm.setXYZ(b, x / l, y / l, z / l);
    }
    nrm.needsUpdate = true;
    return g;
  }

  const loftRings = (loft) => loft.rings.map((r) => r.world.concat([r.world[0]]));

  /* Passe « normales » : sert à détecter les contours (silhouettes, jonctions, coutures). */
  function normalMat(map) {
    return new THREE.ShaderMaterial({
      uniforms: { map: { value: map || null }, useMap: { value: map ? 1 : 0 } },
      vertexShader: 'varying vec3 vN; varying vec2 vUv; void main(){ vUv = uv; vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: 'uniform sampler2D map; uniform int useMap; varying vec3 vN; varying vec2 vUv; void main(){ if (useMap == 1 && texture2D(map, vUv).a < 0.5) discard; vec3 n = gl_FrontFacing ? vN : -vN; gl_FragColor = vec4(n * 0.5 + 0.5, 1.0); }',
      side: THREE.DoubleSide,
    });
  }

  function addMesh(group, geom, mat) {
    const mesh = new THREE.Mesh(geom, mat);
    mesh.userData.colorMat = mat;
    mesh.userData.normalMat = normalMat(mat.alphaTest ? mat.map : null);
    group.add(mesh);
    return mesh;
  }

  /* ---------- textures ---------- */

  function zigzag(ctx, w, h, color) {
    ctx.save();
    ctx.strokeStyle = color; ctx.globalAlpha = 0.28; ctx.lineWidth = 1.4;
    const per = 2.4 * PX, amp = 0.9 * PX, row = 2.2 * PX;
    for (let y = 0; y < h + row; y += row) {
      ctx.beginPath();
      for (let x = -per; x < w + per; x += per / 2) ctx.lineTo(x, y + (((x / (per / 2)) & 1) ? -amp / 2 : amp / 2));
      ctx.stroke();
    }
    ctx.restore();
  }
  function shade(hex, k) {
    const n = parseInt(hex.slice(1), 16);
    let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    const t = k < 0 ? 0 : 255, a = Math.abs(k);
    r = Math.round(r + (t - r) * a); g = Math.round(g + (t - g) * a); b = Math.round(b + (t - b) * a);
    return `rgb(${r},${g},${b})`;
  }

  function tunicTexture(tex, s, pat, m) {
    const W = Math.round(tex.W * PX), H = Math.round(tex.H * PX);
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const ctx = cv.getContext('2d');
    const X = (sv) => W / 2 + sv * PX, Y = (d) => d * PX;
    ctx.fillStyle = s.fabric; ctx.fillRect(0, 0, W, H);
    if (s.texture) zigzag(ctx, W, H, shade(s.fabric, -0.6));
    const b = pat.base, sm = pat.summary;
    const nwA = b.nw * 1.12;
    const ink = shade(s.fabric, -0.55);
    // ouverture milieu devant
    ctx.strokeStyle = ink; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(X(0), Y(b.fnd)); ctx.lineTo(X(0), Y(b.fnd + sm.opening)); ctx.stroke();
    // chevrons
    const cw = s.chevWidth / 2;
    for (let i = 0; i < s.chevCount; i++) {
      const top = b.fnd + s.chevTop + i * (s.chevBand + s.chevGap);
      ctx.beginPath();
      [[-cw, top], [0, top + s.chevDrop], [cw, top], [cw, top + s.chevBand], [0, top + s.chevDrop + s.chevBand], [-cw, top + s.chevBand]]
        .forEach(([x, y], k) => (k ? ctx.lineTo(X(x), Y(y)) : ctx.moveTo(X(x), Y(y))));
      ctx.closePath();
      ctx.fillStyle = s.accent; ctx.fill();
      ctx.strokeStyle = shade(s.accent, -0.3); ctx.lineWidth = 1; ctx.stroke();
    }
    // passepoils de patte
    const px = s.placketGap / 2;
    const topAt = (x) => b.fnd * Math.sqrt(Math.max(0, 1 - (x / nwA) ** 2));
    const endAt = s.chevCount ? b.fnd + s.chevTop + s.chevDrop * (1 - Math.min(1, px / cw)) : b.fnd + s.chevTop + 10;
    ctx.strokeStyle = s.accent; ctx.lineWidth = 0.4 * PX; ctx.lineCap = 'butt';
    for (const sx of [-px, px]) { ctx.beginPath(); ctx.moveTo(X(sx), Y(topAt(sx))); ctx.lineTo(X(sx), Y(endAt)); ctx.stroke(); }
    // fentes de côté
    if (m.sideSlit > 0) {
      ctx.strokeStyle = ink; ctx.lineWidth = 3;
      for (const sx of [-tex.hemP / 4, tex.hemP / 4]) { ctx.beginPath(); ctx.moveTo(X(sx), Y(tex.len - m.sideSlit)); ctx.lineTo(X(sx), Y(tex.len + 1)); ctx.stroke(); }
    }
    // encolure : découpe transparente (devant et dos) puis liseré
    const necks = [[0, nwA, b.fnd], [-tex.topP / 2, nwA, b.bnd], [tex.topP / 2, nwA, b.bnd]];
    ctx.globalCompositeOperation = 'destination-out';
    for (const [cx, rx, ry] of necks) { ctx.beginPath(); ctx.ellipse(X(cx), 0, rx * PX, ry * PX, 0, 0, Math.PI * 2); ctx.fill(); }
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = ink; ctx.lineWidth = 3;
    for (const [cx, rx, ry] of necks) { ctx.beginPath(); ctx.ellipse(X(cx), 0, rx * PX, ry * PX, 0, 0, Math.PI); ctx.stroke(); }
    const t = new THREE.CanvasTexture(cv);
    t.anisotropy = 4;
    return t;
  }

  function sleeveTexture(sl, s) {
    const W = Math.round(sl.circ * PX), H = Math.round(sl.len * PX);
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const ctx = cv.getContext('2d');
    ctx.fillStyle = s.fabric; ctx.fillRect(0, 0, W, H);
    if (s.texture) zigzag(ctx, W, H, shade(s.fabric, -0.6));
    ctx.fillStyle = s.accent; ctx.fillRect(0, H - 0.55 * PX, W, 0.55 * PX);
    return new THREE.CanvasTexture(cv);
  }

  function fabricTexture(s) {
    const S = 16 * PX;
    const cv = document.createElement('canvas'); cv.width = S; cv.height = S;
    const ctx = cv.getContext('2d');
    ctx.fillStyle = s.fabric; ctx.fillRect(0, 0, S, S);
    if (s.texture) zigzag(ctx, S, S, shade(s.fabric, -0.6));
    const t = new THREE.CanvasTexture(cv);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return t;
  }

  /* ---------- lignes de construction ---------- */

  function constructionLines(body) {
    const g = new THREE.Group();
    const mat = new THREE.LineDashedMaterial({ color: 0x8c959c, dashSize: 1.1, gapSize: 0.8 });
    const push = (pts, closed) => {
      const arr = closed ? pts.concat([pts[0]]) : pts;
      const geo = new THREE.BufferGeometry().setFromPoints(arr.map((p) => new THREE.Vector3(p[0], p[1], p[2])));
      const line = new THREE.Line(geo, mat); line.computeLineDistances(); g.add(line);
    };
    const out = (p, c, e = 0.18) => { const dx = p[0] - c[0], dz = p[2] - c[2], l = Math.hypot(dx, dz) || 1; return [p[0] + dx / l * e, p[1], p[2] + dz / l * e]; };
    const L = body.L, lo = body.lofts, n = N();
    const ringAt = (loft, y) => {
      const sec = Body.sectionAt(loft, y), c = Body.centerAt(loft, y);
      return sec.map(([x, z]) => out([x, y, z], [c[0], y, c[1]]));
    };
    for (const y of [L.neckBase - 0.5, L.chest, L.waist, L.hip]) push(ringAt(lo.torso, y), true);
    for (const leg of [lo.legL, lo.legR]) { push(ringAt(leg, L.knee), true); push(ringAt(leg, L.ankle + 3), true); }
    const vertical = (loft, k, y0, y1) => {
      const pts = [];
      loft.rings.forEach((r) => { if (r.c[1] <= y0 && r.c[1] >= y1) pts.push(out(r.world[k], r.c)); });
      if (pts.length > 1) push(pts, false);
    };
    for (const k of [0, n / 2, n / 2 - 7, n / 2 + 7, n / 4, (3 * n) / 4, 7, n - 7]) vertical(lo.torso, k, L.neckBase, L.crotch + 3);
    for (const leg of [lo.legL, lo.legR]) for (const k of [0, n / 2]) vertical(leg, k, L.crotch - 2, L.ankle + 2);
    return g;
  }

  /* ---------- scène ---------- */

  V.init = function (container, labels) {
    if (!V.available()) return false;
    host = container; labelsEl = labels;
    renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.setClearColor(0xffffff, 1);
    renderer.autoClear = false;
    renderer.domElement.className = 'views-canvas';
    renderer.domElement.setAttribute('aria-label', 'Vues de l’avatar : glisser pour tourner, double-clic pour revenir aux vues standard');
    renderer.domElement.setAttribute('role', 'img');
    host.appendChild(renderer.domElement);
    scene = new THREE.Scene();
    camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 2000);
    scene.add(new THREE.AmbientLight(0xffffff, 0.66));
    const key = new THREE.DirectionalLight(0xffffff, 0.42); key.position.set(-0.7, 1.1, 1.2); scene.add(key);
    const fill = new THREE.DirectionalLight(0xffffff, 0.16); fill.position.set(1, 0.2, 0.6); scene.add(fill);
    root = new THREE.Group(); scene.add(root);
    bodyGroup = new THREE.Group(); garmentGroup = new THREE.Group(); linesGroup = new THREE.Group();
    root.add(bodyGroup, garmentGroup, linesGroup);

    let drag = null;
    const el = renderer.domElement;
    el.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, o: offset }; el.setPointerCapture(e.pointerId); });
    el.addEventListener('pointermove', (e) => { if (drag) { offset = drag.o + (e.clientX - drag.x) * 0.012; V.render(); } });
    el.addEventListener('pointerup', () => { drag = null; });
    el.addEventListener('dblclick', () => { offset = 0; V.render(); });
    window.addEventListener('resize', () => V.render());
    ready = true;
    return true;
  };

  V.attach = function (container, labels) {
    if (!ready) return;
    if (renderer.domElement.parentNode !== container) container.appendChild(renderer.domElement);
    host = container; labelsEl = labels;
  };

  V.setOptions = function (o) { Object.assign(opts, o); if (ready) { garmentGroup.visible = !!opts.garment; linesGroup.visible = !!opts.lines; } };

  function clear(g) {
    while (g.children.length) {
      const c = g.children.pop();
      if (c.geometry) c.geometry.dispose();
      if (c.material && c.material.map) c.material.map.dispose();
      if (c.children && c.children.length) clear(c);
    }
  }

  /* Reconstruit corps + vêtement. data = { body, pat, m, s } */
  V.update = function (data) {
    if (!ready) return;
    model = data;
    stature = data.m.stature;
    clear(bodyGroup); clear(garmentGroup); clear(linesGroup);
    const body = data.body, s = data.s;
    const skin = new THREE.MeshLambertMaterial({ color: 0xf7f6f3 });
    for (const k of Object.keys(body.lofts)) {
      const lo = body.lofts[k];
      addMesh(bodyGroup, geometryFromRings(loftRings(lo), null, lo.capStart, lo.capEnd), skin);
    }
    linesGroup.add(constructionLines(body));

    const pat = data.pat;
    const G3 = Garment3D;
    // tunique
    const tu = G3.tunic(body, pat, data.m);
    const tuMat = new THREE.MeshLambertMaterial({ map: tunicTexture(tu.tex, s, pat, data.m), side: THREE.DoubleSide, alphaTest: 0.5 });
    addMesh(garmentGroup, geometryFromRings(tu.rings, tu.uvs), tuMat);
    // manches
    const sleeves = ['L', 'R'].map((side) => G3.sleeve(body, pat, data.m, side));
    sleeves.forEach((sl) => {
      const mat = new THREE.MeshLambertMaterial({ map: sleeveTexture(sl, s), side: THREE.DoubleSide });
      addMesh(garmentGroup, geometryFromRings(sl.rings, sl.uvs, sl.capStart, null), mat);
    });
    // pantalon
    const fab = new THREE.MeshLambertMaterial({ map: fabricTexture(s), side: THREE.DoubleSide });
    const legs = ['L', 'R'].map((side) => G3.trouserLeg(body, pat, data.m, side));
    legs.forEach((lg) => addMesh(garmentGroup, geometryFromRings(lg.rings, lg.uvs), fab));
    const topP = G3.trouserTop(body, data.m);
    addMesh(garmentGroup, geometryFromRings(topP.rings, topP.uvs, null, topP.capEnd), fab);
    // chaussures
    if (s.shoes) {
      const shoe = new THREE.MeshLambertMaterial({ color: new THREE.Color(s.shoe) });
      for (const k of ['L', 'R']) {
        const lo = body.shoes[k];
        addMesh(garmentGroup, geometryFromRings(loftRings(lo), null, lo.capStart, lo.capEnd), shoe);
      }
    }
    V.setOptions({});
    V.render();
    return { tunicIssues: tu.issues, sleeveTight: sleeves.some((x) => x.tight), legIssues: legs.some((x) => x.issues.length) };
  };

  let rtColor = null, rtNormal = null, quad = null, quadScene = null, quadCam = null;

  function ensureTargets(w, h) {
    if (rtColor && rtColor.width === w && rtColor.height === h) return;
    if (rtColor) { rtColor.dispose(); rtNormal.dispose(); }
    const RT = renderer.capabilities.isWebGL2 && THREE.WebGLMultisampleRenderTarget ? THREE.WebGLMultisampleRenderTarget : THREE.WebGLRenderTarget;
    rtColor = new RT(w, h);
    if (rtColor.samples !== undefined) rtColor.samples = 4;
    rtNormal = new THREE.WebGLRenderTarget(w, h);
    if (!quad) {
      quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
      quadScene = new THREE.Scene();
      quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
        uniforms: { tColor: { value: null }, tNormal: { value: null }, texel: { value: new THREE.Vector2() }, ink: { value: new THREE.Color(0x2f3439) } },
        vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
        fragmentShader: [
          'uniform sampler2D tColor; uniform sampler2D tNormal; uniform vec2 texel; uniform vec3 ink; varying vec2 vUv;',
          'vec3 N(float x, float y){ return texture2D(tNormal, vUv + vec2(x, y) * texel).rgb; }',
          'void main(){',
          '  vec3 gx = -N(-1.,-1.) - 2.*N(-1.,0.) - N(-1.,1.) + N(1.,-1.) + 2.*N(1.,0.) + N(1.,1.);',
          '  vec3 gy = -N(-1.,-1.) - 2.*N(0.,-1.) - N(1.,-1.) + N(-1.,1.) + 2.*N(0.,1.) + N(1.,1.);',
          '  float e = smoothstep(1.35, 2.1, length(gx) + length(gy));',
          '  vec3 c = texture2D(tColor, vUv).rgb;',
          '  gl_FragColor = vec4(mix(c, ink, e * 0.92), 1.0);',
          '}',
        ].join('\n'),
        depthTest: false, depthWrite: false,
      }));
      quadScene.add(quad);
    }
  }

  function swapMaterials(normal) {
    for (const g of [bodyGroup, garmentGroup]) {
      g.traverse((o) => { if (o.isMesh && o.userData.colorMat) o.material = normal ? o.userData.normalMat : o.userData.colorMat; });
    }
  }

  V.render = function () {
    if (!ready || !host || !host.offsetParent) return;
    const cw = Math.max(320, host.clientWidth);
    const views = V.VIEWS;
    const vw = cw / views.length;
    const aspect = 0.42;
    const vh = Math.round(vw / aspect);
    renderer.setSize(cw, vh, true);
    const pr = renderer.getPixelRatio();
    const W = Math.round(cw * pr), Hh = Math.round(vh * pr);
    ensureTargets(W, Hh);
    const spanY = stature * 1.07;
    const spanX = spanY * (vw / vh);
    camera.left = -spanX / 2; camera.right = spanX / 2;
    camera.top = spanY / 2; camera.bottom = -spanY / 2;
    camera.position.set(0, stature * 0.5, 600); camera.lookAt(0, stature * 0.5, 0);
    camera.updateProjectionMatrix();

    const pass = (rt, normal) => {
      swapMaterials(normal);
      linesGroup.visible = !normal && !!opts.lines;
      rt.scissorTest = false;
      rt.viewport.set(0, 0, W, Hh);
      renderer.setRenderTarget(rt);
      renderer.setClearColor(normal ? 0x000000 : 0xffffff, 1);
      renderer.clear();
      rt.scissorTest = true;
      views.forEach((v, i) => {
        const x = Math.round(i * vw * pr), w = Math.round(vw * pr);
        rt.viewport.set(x, 0, w, Hh); rt.scissor.set(x, 0, w, Hh);
        renderer.setRenderTarget(rt);
        root.rotation.y = v.angle + offset;
        renderer.render(scene, camera);
      });
    };
    pass(rtColor, false);
    pass(rtNormal, true);
    swapMaterials(false);
    linesGroup.visible = !!opts.lines;

    renderer.setRenderTarget(null);
    quad.material.uniforms.tColor.value = rtColor.texture;
    quad.material.uniforms.tNormal.value = rtNormal.texture;
    quad.material.uniforms.texel.value.set(Math.max(1, pr * 0.8) / W, Math.max(1, pr * 0.8) / Hh);
    renderer.setViewport(0, 0, cw, vh);
    renderer.render(quadScene, quadCam);
    if (labelsEl) {
      labelsEl.innerHTML = views.map((v) => `<span>${offset ? v.label + ' ' + (offset > 0 ? '+' : '−') + Math.round(Math.abs(offset) * 180 / Math.PI) + '°' : v.label}</span>`).join('');
    }
  };

  /* Image PNG de la planche, avec légendes. */
  V.snapshot = function (title) {
    if (!ready) return null;
    const src = renderer.domElement;
    const out = document.createElement('canvas');
    const band = 70 * (src.width / Math.max(1, src.clientWidth));
    out.width = src.width; out.height = src.height + band;
    const ctx = out.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, out.width, out.height);
    ctx.drawImage(src, 0, 0);
    const k = src.width / Math.max(1, src.clientWidth);
    ctx.fillStyle = '#1b1f22'; ctx.textAlign = 'center';
    ctx.font = `${13 * k}px "IBM Plex Mono", monospace`;
    V.VIEWS.forEach((v, i) => ctx.fillText(v.label.toUpperCase(), (i + 0.5) * out.width / V.VIEWS.length, src.height + 24 * k));
    ctx.font = `600 ${14 * k}px "IBM Plex Sans", Arial, sans-serif`;
    ctx.fillText(title, out.width / 2, src.height + 52 * k);
    return out;
  };

  V._geometryFromRings = geometryFromRings;
  window.Viewer3D = V;
})();
