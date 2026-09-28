/* ================= encore des batiments : gratte-ciel, kolkhoze, bulbes, metro... ================= */
// dome en bulbe dessine au pixel, rayures qui tournent avec la vue
function drawDome(a, b, z0, r, hgt, mat, t, swirl){
  const C = prj(a, b, z0), cx = Math.round(C[0]), cy = Math.round(C[1]);
  const rx = r * 1.414, H = hgt;
  CUR = mat;
  for (let hz = 0; hz <= H; hz++){
    const f = hz / H;
    const k = f < .55 ? (0.95 + 0.38 * Math.sin(f / .55 * Math.PI * .85)) : Math.max(0, 1.25 * (1 - f) / .45);
    const w = rx * k;
    for (let dx = -Math.ceil(w); dx <= Math.ceil(w); dx++){
      if (Math.abs(dx) > w + .3) continue;
      const xn = w > 0 ? dx / (w + .5) : 0;
      const edge = Math.abs(dx) >= Math.floor(w) || hz === 0;
      let v;
      if (edge) v = 0;
      else if (swirl) v = (Math.floor(Math.asin(clamp(xn, -1, 1)) * 2.2 + f * 5 + cam.phi * 1.4 + 20) & 1) ? 1 : 0;
      else v = (xn < -.3 && f > .15 && f < .6) ? 1 : (bz(cx + dx, cy - hz) < clamp(10 - (xn + .4) * 8, 1, 16) ? 1 : 0);
      fput(cx + dx, cy - hz, v);
    }
  }
  CUR = M.DOME_A; fput(cx, cy - H - 1, 1); fput(cx, cy - H - 2, 1); fput(cx, cy - H - 3, 1);
}
// cylindre vertical (tambour, silo)
function drawCyl(a, b, z0, r, hgt, top){
  const C = prj(a, b, z0), cx = Math.round(C[0]), cy = Math.round(C[1]);
  const rx = r * 1.414, ry = rx / 2;
  for (let dx = -Math.ceil(rx); dx <= Math.ceil(rx); dx++){
    const s = Math.sqrt(Math.max(0, 1 - (dx / (rx + .5)) ** 2)); if (s <= 0) continue;
    const yb = Math.round(cy + ry * s), yt = Math.round(cy - hgt + ry * s);
    for (let y = yt; y <= yb; y++){ const edge = Math.abs(dx) >= Math.floor(rx) || y === yb; fput(cx + dx, y, edge ? 1 : (bz(cx + dx, y) < clamp(6 - dx * .5, 0, 16) ? 1 : 0)); }
    if (top){ const yTop = Math.round(cy - hgt - ry * s); for (let y = yTop; y < yt; y++) fput(cx + dx, y, y === yTop ? 1 : 0); }
  }
  return [cx, cy - hgt];
}
const tierBox = (ca, cb, hw, hb, z0, z1, style, seed) => boxS(ca - hw, ca + hw, cb - hb, cb + hb, z0, z1, (u, h, x, y, k) => {
  const H = z1 - z0;
  if (h > H - 1.1) return 1;
  if (style === 'deco'){
    if ((u % 2.6) < .55) return 1;
    return ((h % 3) < .7) ? 0 : ((COLOR && DAY) || hash2(Math.floor(u / 2.6) + k * 13 + seed, Math.floor(h / 3) + z0) < .45 ? 3 : 0);
  }
  if ((u % 5) < .6) return 1;
  const cu = u % 2.5, ch = h % 3;
  if (cu > .8 && cu < 1.9 && ch > .8 && ch < 2.3) return ((COLOR && DAY) || hash2(Math.floor(u / 2.5) + k * 7 + seed, Math.floor(h / 3) + z0) < .4) ? 3 : 0;
  return wallBase(k, x, y);
}, 0);
Object.assign(TYPES, {
  stalinien: { name: 'Gratte-ciel', nameCCP: 'Gratte-ciel du Peuple', fem: false, build(lot, seed){
    const ca = lot.ca, cb = lot.cb;
    const spire = (t) => {
      CUR = M.METAL; line3(ca, cb, 52, ca, cb, 66, 1);
      const p = prj(ca, cb, 66), x = Math.round(p[0]), y = Math.round(p[1]);
      CUR = M.SIGN_CCP; drawStar(fput, x - 3, y - 7, 1, true);
    };
    const parts = [part(ca, cb, 0, () => tierBox(ca, cb, 16, 10, 0, 14, 'grid', seed)), part(ca, cb, .3, () => tierBox(ca, cb, 8.5, 7, 14, 32, 'grid', seed)),
      part(ca, cb, .5, () => tierBox(ca, cb, 5.5, 5, 32, 44, 'grid', seed)), part(ca, cb, .7, () => tierBox(ca, cb, 3.5, 3.5, 44, 52, 'grid', seed)), part(ca, cb, .9, spire)];
    for (const [da, db] of [[-13, -7], [13, -7], [-13, 7], [13, 7]]) parts.push(part(ca + da, cb + db, .4, () => { boxS(ca + da - 1.5, ca + da + 1.5, cb + db - 1.5, cb + db + 1.5, 14, 19, 1, 0); CUR = M.METAL; line3(ca + da, cb + db, 19, ca + da, cb + db, 23, 1); }));
    return { parts, lights: [sideLight(ca - 16, ca + 16, cb - 10, cb + 10, 0, 10, 1.2), sideLight(ca - 16, ca + 16, cb - 10, cb + 10, 1, 9, 1.1)], shadowPts: [ca, cb, 66] };
  } },
  artdeco: { name: 'Gratte-ciel', nameCCP: 'Tour de bureaux', fem: false, build(lot, seed){
    const ca = lot.ca, cb = lot.cb;
    const top = (t) => {
      CUR = M.METAL; line3(ca, cb, 62, ca, cb, 78, 1);
      const p = prj(ca, cb, 78); CUR = M.REDLIGHT;
      if (!(COLOR && DAY) || (t % 2) < 1) fput(Math.round(p[0]), Math.round(p[1]) - 1, 1);
    };
    return { parts: [part(ca, cb, 0, () => tierBox(ca, cb, 11, 9, 0, 22, 'deco', seed)), part(ca, cb, .3, () => tierBox(ca, cb, 8, 6.5, 22, 40, 'deco', seed)),
      part(ca, cb, .5, () => tierBox(ca, cb, 5.5, 4.5, 40, 54, 'deco', seed)), part(ca, cb, .7, () => tierBox(ca, cb, 3.5, 3, 54, 62, 'deco', seed)), part(ca, cb, .9, top)],
      lights: [sideLight(ca - 11, ca + 11, cb - 9, cb + 9, 0, 9, 1.2), sideLight(ca - 11, ca + 11, cb - 9, cb + 9, 1, 9, 1.1)], shadowPts: [ca, cb, 78] };
  } },
  kolkhoze: { name: 'Ferme', nameCCP: 'Kolkhoze', fem: true, build(lot, seed){
    const ccp = lot.side === 'ccp';
    const fa0 = lot.a0 + 2, fa1 = lot.a0 + 21, fb0 = lot.b0 + 2, fb1 = lot.b1 - 2;
    const field = () => {
      CUR = M.WHEAT;
      drawFace([fa0, fb0, 0, fa1, fb0, 0, fa1, fb1, 0, fa0, fb1, 0], UP, alongSh(fa0, fb0, 0, fa0, fb1, 0, fb1 - fb0, (u, x, y) => (Math.floor(u / 1.4) & 1) ? 1 : 0), -1);
    };
    const g = houseGeo(lot.a1 - 8, lot.cb - 4, 10, 14, 7, 6, seed, 'b', 3);
    const barn = () => { CUR = M.BRICK; gableWalls(g.a0, g.a1, g.b0, g.b1, g.hh, g.rh, 'b', (u, h, x, y, k) => { if (k === 3 && Math.abs(u - 7) < 2.2 && h < 5) return (Math.abs(u - 7) > 1.8 || h > 4.6) ? 1 : ((Math.floor(u + h) & 1) ? 1 : 0); return (Math.floor(u * 1.2) % 3 === 0) ? 1 : 0; }); gableRoof(g.a0, g.a1, g.b0, g.b1, g.hh, g.rh, 'b', 1, 6, 1); };
    const silo = () => { CUR = M.METAL; drawCyl(lot.a1 - 5, lot.b1 - 6, 0, 3, 18, true); };
    const tractor = (t) => {
      const p = (Math.sin(t * .18 + seed) + 1) / 2, ta = fa0 + 2 + p * (fa1 - fa0 - 4), tb = fb0 + 3 + ((Math.floor(t * .06 + seed) % 5) * (fb1 - fb0 - 6) / 4);
      CUR = ccp ? M.FLAG_RED : M.TREE;
      boxS(ta - 1.8, ta + 1.8, tb - 1.1, tb + 1.1, .8, 2.4, 0, 1);
      boxS(ta - 1.6, ta + .2, tb - 1, tb + 1, 2.4, 4.4, (u, h) => (h > .4 && h < 1.5) ? 3 : 0, 1);
      CUR = M.METAL; const w = prj(ta - 1.2, tb + 1.2, .8); fput(Math.round(w[0]), Math.round(w[1]), 0); fput(Math.round(w[0]) + 1, Math.round(w[1]), 0);
    };
    return { parts: [part(g.ca, g.cb, 0, barn), part(lot.a1 - 5, lot.b1 - 6, 0, silo), part((fa0 + fa1) / 2, (fb0 + fb1) / 2, .2, tractor)], decals: [field],
      lights: [Lc(lot.a1 - 8, lot.cb + 6, 8, 1.1)], shadowPts: circ(lot.a1 - 5, lot.b1 - 6, 3, 21, 8) };
  } },
  bulbes: { name: 'Chapelle', nameCCP: 'Musée à bulbes', fem: false, build(lot, seed){
    const ca = lot.ca, cb = lot.cb;
    const base = () => boxS(ca - 8, ca + 8, cb - 8, cb + 8, 0, 10, (u, h, x, y, k) => {
      if (h > 8.8) return 1;
      const cu = u % 5.3; if (cu > 1.8 && cu < 3.5 && h > 2 && h < 6 + Math.sqrt(Math.max(0, .9 - (cu - 2.65) ** 2)) * 1.4) return 3;
      return (k === 0 && Math.abs(u - 8) < 1.6 && h < 5) ? 0 : wallBase(k, x, y);
    }, (x, y) => bz(x, y) < 3 ? 1 : 0);
    const domes = (t) => {
      CUR = M.USC5; drawCyl(ca, cb, 10, 3.2, 8, false);
      drawDome(ca, cb, 18, 3.6, 13, M.DOME_A, t, false);
      const corners = [[-5.5, -5.5, M.DOME_C], [5.5, -5.5, M.DOME_B], [-5.5, 5.5, M.DOME_B], [5.5, 5.5, M.DOME_C]].map(([da, db, m]) => [ca + da, cb + db, m, dep(ca + da, cb + db)]);
      corners.sort((p, q) => p[3] - q[3]);
      for (const [a2, b2, m] of corners){ CUR = M.USC5; drawCyl(a2, b2, 10, 1.8, 4, false); drawDome(a2, b2, 14, 2.2, 8, m, t, true); }
    };
    return { parts: [part(ca, cb, 0, base), part(ca, cb, .5, domes)], lights: [Lc(ca, cb + 12, 11, 1.2)], shadowPts: circ(ca, cb, 3.6, 31, 8).concat(circ(ca, cb, 8, 10, 8)) };
  } },
  grandmagasin: { name: 'Grand magasin', nameCCP: 'Grand Magasin du Peuple', fem: false, build(lot, seed){
    const ccp = lot.side === 'ccp';
    const a0 = lot.a0 + 3, a1 = lot.a1 - 3, b0 = lot.cb - 9, b1 = lot.cb + 7;
    const body = () => boxS(a0, a1, b0, b1, 0, 12, (u, h, x, y, k) => {
      if (h > 10.8) return 1;
      const cu = u % 5;
      if (h < 5.5){ if (cu > .8 && cu < 4.2 && h < 3.2 + Math.sqrt(Math.max(0, 2.9 - (cu - 2.5) ** 2))) return 3; return (cu < .8 || cu > 4.2) ? 1 : 0; }
      if (h > 6.5 && h < 9 && cu > 1.2 && cu < 3.8) return ((COLOR && DAY) || hash2(Math.floor(u / 5) + k, seed) < .5) ? 3 : 0;
      return wallBase(k, x, y);
    }, (x, y) => ((x + y) & 3) === 0 ? 1 : 3);
    const sign = () => { if (!frontVisible(0)) return; const p = prj((a0 + a1) / 2, b1, 12), x = Math.round(p[0]), y = Math.round(p[1]); plate(fput, ccp ? 'GRAND MAGASIN' : 'MAGASIN', x, y - 1); };
    return { parts: [part(lot.ca, lot.cb - 1, 0, body), part(lot.ca, lot.cb - 1, .4, sign)], lights: [Lc(lot.ca, b1 + 7, 14, 1.3)] };
  } },
  supermarche: { name: 'Supermarché', nameCCP: 'Univermag', fem: false, build(lot, seed){
    const ccp = lot.side === 'ccp';
    const a0 = lot.a0 + 3, a1 = lot.a1 - 3, b0 = lot.b0 + 2, b1 = lot.b0 + 13;
    const body = () => boxS(a0, a1, b0, b1, 0, 7, (u, h, x, y, k) => {
      if (h > 6) return (Math.floor(u) & 1) ? 1 : 4;
      if (k === 0 && h > 1 && h < 4.6 && u > 2 && u < (a1 - a0) - 2) return (Math.floor(u) % 4 === 0) ? 1 : 3;
      return wallBase(k, x, y);
    }, 0);
    const lot2 = () => {
      CUR = M.ROAD;
      drawFace([a0, b1 + 1, 0, a1, b1 + 1, 0, a1, lot.b1 - 1, 0, a0, lot.b1 - 1, 0], UP, alongSh(a0, b1 + 1, 0, a1, b1 + 1, 0, a1 - a0, (u) => ((u % 4.5) < .45) ? 1 : 0), -1);
    };
    const sign = () => {
      CUR = M.METAL; const p = prj(a1 - 1, b1 + 2, 0), x = Math.round(p[0]), y = Math.round(p[1]);
      for (let k = 0; k < 18; k++) fput(x, y - k, 1);
      plate(fput, ccp ? 'UNIVERMAG' : 'SUPER', x, y - 17);
      if (!ccp) plate(fput, 'MARCHE', x, y - 8);
    };
    ACC = ccp ? M.FLAG_RED : M.FLAG_RED;
    const parts = [part(lot.ca, (b0 + b1) / 2, 0, () => { ACC = M.FLAG_RED; body(); }), part(a1 - 1, b1 + 2, .2, sign)];
    const n = ccp ? 2 : 5;
    for (let k = 0; k < n; k++){ const ca = a0 + 2.25 + k * 4.5 + (k > 1 ? 4.5 : 0), cb = b1 + 8; if (hash2(seed, k) < .25) continue; parts.push(part(ca, cb, 0, () => drawCar(ca, cb, 'b', -1, lot.side))); }
    return { parts, decals: [lot2], lights: [Lc(lot.ca, b1 + 8, 15, 1.3)] };
  } },
  stade: { name: 'Stade de baseball', nameCCP: 'Stade du Peuple', fem: false, build(lot, seed){
    const ccp = lot.side === 'ccp';
    const a0 = lot.a0 + 6, a1 = lot.a1 - 1, b0 = lot.b0 + 6, b1 = lot.b1 - 1, ca = (a0 + a1) / 2, cb = (b0 + b1) / 2;
    const pitch = () => {
      CUR = M.FIELD;
      drawFace([a0, b0, 0, a1, b0, 0, a1, b1, 0, a0, b1, 0], UP, alongSh(a0, b0, 0, a1, b0, 0, a1 - a0, (u) => (Math.floor(u / 2.5) & 1) ? 1 : 0), 1);
      if (ccp){
        CUR = M.NEUTRAL;
        const L = (p, q) => { const P = prj(p[0], p[1], 0), Q = prj(q[0], q[1], 0); lineS(P[0], P[1], Q[0], Q[1], 1); };
        L([ca, b0 + 1], [ca, b1 - 1]); L([a0 + 1, b0 + 1], [a1 - 1, b0 + 1]); L([a0 + 1, b1 - 1], [a1 - 1, b1 - 1]); L([a0 + 1, b0 + 1], [a0 + 1, b1 - 1]); L([a1 - 1, b0 + 1], [a1 - 1, b1 - 1]);
        for (let k = 0; k < 24; k++){ const t2 = k * TAU / 24, p = prj(ca + Math.cos(t2) * 4, cb + Math.sin(t2) * 4, 0); fput(Math.round(p[0]), Math.round(p[1]), 1); }
      } else {
        CUR = M.DIRT;
        drawFace([ca, b1 - 2, 0, ca + 8, b1 - 10, 0, ca, b1 - 18, 0, ca - 8, b1 - 10, 0], UP, 0, 1);
        CUR = M.NEUTRAL;
        for (const [da, db] of [[0, -2], [8, -10], [0, -18], [-8, -10]]){ const p = prj(ca + da, b1 + db, 0); fput(Math.round(p[0]), Math.round(p[1]), 1); fput(Math.round(p[0]) + 1, Math.round(p[1]), 1); }
      }
    };
    const stands = () => {
      CUR = M.CONCRETE; ACC = ccp ? M.FLAG_RED : M.FLAG_BLUE;
      boxS(lot.a0 + 1, a1, lot.b0 + 1, b0 - 1, 0, 6, (u, h) => ((h % 1.5) < .5) ? 1 : 4, (x, y) => ((y & 1) ? 4 : 1));
      boxS(lot.a0 + 1, a0 - 1, b0 - 1, b1, 0, 6, (u, h) => ((h % 1.5) < .5) ? 1 : 4, (x, y) => ((y & 1) ? 4 : 1));
    };
    const towers = () => {
      CUR = M.METAL;
      for (const [pa, pb] of [[a1, b0], [a1, b1], [a0, b1]]){ line3(pa, pb, 0, pa, pb, 18, 1); const p = prj(pa, pb, 18), x = Math.round(p[0]), y = Math.round(p[1]); CUR = M.LAMP; for (let d = -2; d <= 2; d++){ fput(x + d, y - 1, 1); fput(x + d, y, (COLOR && DAY) ? 0 : 1); } CUR = M.METAL; }
    };
    return { parts: [part(lot.a0 + 3, lot.b0 + 3, 0, stands), part(a1, b1, .2, towers)], decals: [pitch], lights: [Lc(ca, cb, 16, 1.4), Lc(ca + 6, cb - 6, 10, 1.2)] };
  } },
  gare: { name: 'Gare centrale', nameCCP: 'Gare du Peuple', fem: true, build(lot, seed){
    const ccp = lot.side === 'ccp', ca = lot.ca, cb = lot.cb, a0 = lot.a0, a1 = lot.a1, b0 = lot.b0, b1 = lot.b1;
    const hb0 = cb - 3, hb1 = b1 - 2;
    const hall = () => {
      boxS(ca - 15, ca + 15, hb0, hb1, 0, 12, (u, h, x, y, k) => {
        if (h > 11) return 1;
        if (h < .8) return 0;
        const cu = u % 4.2;
        if (cu < .7) return 1;
        if (h > 1.4 && h < 9.4 - (Math.abs(cu - 2.45) > 1.2 ? 1 : 0)) return 3;
        return wallBase(k, x, y);
      }, (x, y) => bz(x, y) < 3 ? 1 : 0, 1);
      // pavillon central et horloge
      boxS(ca - 5, ca + 5, hb0 - 1, hb1 - 2, 12, 19, (u, h, x, y, k) => h > 6.2 ? 1 : (h > 1 && h < 5.5 && Math.abs(u - 5) < 2.4 ? 3 : wallBase(k, x, y)), 1, 1);
      if (ccp){
        boxS(ca - 3, ca + 3, hb0 + 1, hb1 - 4, 19, 27, (u, h) => (h > 1 && h < 6.5 && (u % 2) < 1.2) ? 3 : 1, 1, 1);
        CUR = M.ROOF_CCP; boxS(ca - 1.6, ca + 1.6, (hb0 + hb1) / 2 - 2.6, (hb0 + hb1) / 2 - .6, 27, 33, 0, 1, 0);
        CUR = M.METAL; line3(ca, (hb0 + hb1) / 2 - 1.6, 33, ca, (hb0 + hb1) / 2 - 1.6, 40, 1);
      }
    };
    const clock = () => {
      const p = prj(ca, hb1 - 2, 16.5), x = Math.round(p[0]), y = Math.round(p[1]);
      CUR = M.NEUTRAL;
      for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++){ const r = Math.hypot(dx, dy); if (r < 3.4) fput(x + dx, y + dy, r > 2.5 ? 0 : 1); }
      CUR = M.METAL; fput(x, y, 0); fput(x, y - 1, 0); fput(x, y - 2, 0); fput(x + 1, y, 0); fput(x + 2, y, 0);
      const s = prj(ca, hb0 - 1, 19); CUR_SIDE = lot.side; plate(fput, ccp ? 'GARE DU PEUPLE' : 'GARE CENTRALE', Math.round(s[0]), Math.round(s[1]) - 1);
      if (ccp){ const q = prj(ca, (hb0 + hb1) / 2 - 1.6, 40); CUR = M.SIGN_CCP; drawStar(fput, Math.round(q[0]) - 3, Math.round(q[1]) - 6, 1, true); }
    };
    // quai et marquise le long de la voie
    const qb0 = RAIL_B + 2.3, qb1 = b0 + 1.5;
    const quai = () => { CUR = M.CONCRETE; boxS(a0, a1, qb0, qb1, 0, .8, (u, h) => h > .5 ? 1 : 0, (x, y) => 1, 0); };
    const marquise = () => {
      CUR = M.METAL;
      for (let a = a0 + 3; a < a1; a += 7.5) line3(a, qb1 - .8, .8, a, qb1 - .8, 7, 1);
      CUR = ccp ? M.CCP2 : M.GIRDER;
      boxS(a0 + 1, a1 - 1, qb0 + .4, qb1, 7, 7.7, 1, (x, y) => ((x + y) & 3) ? 1 : 0, 0);
    };
    return { parts: [part(ca, (hb0 + hb1) / 2, 0, hall), part(ca, (hb0 + hb1) / 2, .5, clock), part((a0 + a1) / 2, (qb0 + qb1) / 2, -.4, quai), part((a0 + a1) / 2, (qb0 + qb1) / 2, .1, marquise)],
      lights: [Lc(ca, qb0 + 2, 16, 1.3), Lc(ca, hb1 + 5, 12, 1.2)], shadowPts: [ca - 15, hb0, 12, ca + 15, hb0, 12, ca + 15, hb1, 12, ca - 15, hb1, 12, ca, (hb0 + hb1) / 2, ccp ? 40 : 19] };
  } },
  tribune: { name: 'Tribune de parade', nameCCP: 'Tribune du Défilé', fem: true, build(lot, seed){
    const ccp = lot.side === 'ccp', ca = lot.ca, cb = lot.cb, a0 = lot.a0, a1 = lot.a1, b0 = lot.b0, b1 = lot.b1;
    // place pavee : gros paves gris, joints en losange
    const pave = () => {
      CUR = M.ROCK;
      drawFace([a0 + 1, b0 + 1, 0, a1 - 1, b0 + 1, 0, a1 - 1, b1 - 1, 0, a0 + 1, b1 - 1, 0], UP, (x, y) => (((x + 2 * y) & 3) === 0 || ((x - 2 * y) & 7) === 0) ? 0 : 1, 0);
    };
    const tb = cb + 5;
    const stand = (t) => {
      CUR = ccp ? M.ROOF_CCP : M.USC5;
      const face = (u, h, x, y, k) => (h % 3.2) < .45 ? 1 : 0;
      boxS(ca - 13, ca + 13, tb - 7, tb + 7, 0, 3.5, face, 1, 0);
      boxS(ca - 9.5, ca + 9.5, tb - 5, tb + 5, 3.5, 6.5, face, 1, 0);
      CUR = M.CAT_BLACK;
      boxS(ca - 7, ca + 7, tb - 3.5, tb + 3.5, 6.5, 8.5, (u, h) => ((u % 2) < .6) ? 1 : 0, 0, -1);
      CUR = ccp ? M.ROOF_CCP : M.USC5;
      boxS(ca - 5, ca + 5, tb - 2.5, tb + 2.5, 8.5, 11, face, 1, 0);
      // officiels en rang sur la tribune
      for (let k = -3; k <= 3; k++){ const p = prj(ca + k * 1.6, tb - 5.2, 6.5); CUR = k === 0 ? M.FLAG_RED : M.CAT_GRAY; const x = Math.round(p[0]), y = Math.round(p[1]); fput(x, y - 1, 0); fput(x, y - 2, 0); fput(x, y - 3, 1); }
      // bandeau
      const p = prj(ca, tb - 7, 3.5); CUR_SIDE = lot.side; plate(fput, ccp ? 'GLOIRE AU PEUPLE' : 'GOD BLESS KUTTY', Math.round(p[0]), Math.round(p[1]) + 1);
    };
    const flags = (t) => { for (const fa of [a0 + 3, a0 + 11, a1 - 11, a1 - 3]) drawFlagPole(fa, b0 + 2, 0, 16, ccp ? 'ccp' : 'usc', t + fa * .1); };
    const star = () => { if (!ccp) return; const p = prj(ca, tb, 11); CUR = M.SIGN_CCP; drawStar(fput, Math.round(p[0]) - 3, Math.round(p[1]) - 9, 1, true); };
    return { parts: [part(ca, tb, 0, stand), part(ca, b0 + 2, .2, flags), part(ca, tb, .6, star)], decals: [pave], lights: [Lc(ca, tb - 9, 14, 1.2)],
      shadowPts: [ca - 13, tb - 7, 3.5, ca + 13, tb - 7, 3.5, ca + 13, tb + 7, 3.5, ca - 13, tb + 7, 3.5, ca - 5, tb - 2.5, 11, ca + 5, tb + 2.5, 11] };
  } },
  metro: { name: 'Métro', nameCCP: 'Métro du Peuple', fem: false, build(lot, seed){
    const ccp = lot.side === 'ccp', ca = lot.ca, cb = lot.cb;
    if (ccp){
      const pav = () => boxS(ca - 8, ca + 8, cb - 6, cb + 6, 0, 8, (u, h, x, y, k) => {
        if (h > 6.8) return 1;
        if (k === 0 || k === 2){ const cu = u % 3.2; if (cu < .8) return 1; if (h < 5.2) return 3; }
        return wallBase(k, x, y);
      }, (x, y) => bz(x, y) < 4 ? 1 : 0);
      const sign = () => {
        const p = prj(ca, cb, 8), x = Math.round(p[0]), y = Math.round(p[1]);
        CUR = M.METAL; for (let k = 0; k < 4; k++) fput(x, y - k, 1);
        CUR = M.SIGN_CCP;
        for (let yy = -15; yy <= -4; yy++) for (let xx = -6; xx <= 6; xx++) fput(x + xx, y + yy, (Math.abs(xx) === 6 || yy === -15 || yy === -4) ? 1 : 0);
        const g = FONT['M']; for (let r = 0; r < 5; r++) for (let q = 0; q < 3; q++) if (g[r * 3 + q] === '1') for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) fput(x - 3 + q * 2 + dx, y - 14 + r * 2 + dy, 1);
      };
      return { parts: [part(ca, cb, 0, pav), part(ca, cb, .5, sign)], lights: [Lc(ca, cb + 9, 11, 1.3)] };
    }
    const hole = () => {
      CUR = M.ROAD;
      drawFace([ca - 2, cb - 1, 0, ca + 2, cb - 1, 0, ca + 2, cb + 6, 0, ca - 2, cb + 6, 0], UP, alongSh(ca - 2, cb - 1, 0, ca - 2, cb + 6, 0, 7, (u) => ((u % 1.2) < .4) ? 1 : 0), 1);
    };
    const rail = () => {
      CUR = M.TREE;
      for (const da of [-2.3, 2.3]){ line3(ca + da, cb - 1, 2.5, ca + da, cb + 6, 2.5, 1); line3(ca + da, cb - 1, 0, ca + da, cb - 1, 2.5, 1); line3(ca + da, cb + 6, 0, ca + da, cb + 6, 2.5, 1); }
      line3(ca - 2.3, cb - 1, 2.5, ca + 2.3, cb - 1, 2.5, 1);
      CUR = M.METAL; const p = prj(ca + 4, cb - 2, 0), x = Math.round(p[0]), y = Math.round(p[1]);
      for (let k = 0; k < 12; k++) fput(x, y - k, 1);
      plate(fput, 'METRO', x, y - 11);
    };
    return { parts: [part(ca, cb + 2.5, 0, rail)], decals: [hole], lights: [Lc(ca, cb + 3, 9, 1.3)] };
  } }
});
const PALETTE = ['maison', 'immeuble', 'diner', 'cinema', 'drivein', 'motel', 'bowling', 'station', 'epicerie', 'supermarche', 'grandmagasin', 'artdeco', 'stalinien',
  'metro', 'usine', 'kolkhoze', 'bulbes', 'stade', 'tribune', 'radio', 'fusee', 'cirque', 'statue', 'panneau', 'fontaine', 'chateau', 'kiosque', 'parc'];
const PREVIEW_SIDE = { immeuble: 'ccp', usine: 'ccp', cirque: 'ccp', fusee: 'ccp', radio: 'ccp', stalinien: 'ccp', kolkhoze: 'ccp', bulbes: 'ccp', metro: 'ccp', grandmagasin: 'ccp', tribune: 'ccp' };
