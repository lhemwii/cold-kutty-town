/* ================= fetes : sapins illumines et feux d'artifice ================= */
let XMAS_ON = false;
const TWINKLE = [M.ICON_R, M.ICON_Y, M.FW_BLUE, M.FW_GREEN];
function drawTreeLights(a, b, r, t){
  const p = prj(a, b, 0), cx = Math.round(p[0]), cy = Math.round(p[1]) - r - 3;
  const n = 4 + r;
  for (let k = 0; k < n; k++){
    const ang = hash2(a * 3 + k, b) * TAU, rr = .45 + hash2(k, a + b) * .5;
    const x = Math.round(cx + Math.cos(ang) * (r + 1) * rr), y = Math.round(cy + Math.sin(ang) * r * rr);
    if (((t * 2 + k * .7 + a) | 0) % 3 === 0) continue;
    CUR = TWINKLE[(k + ((t * 1.5) | 0)) & 3]; fput(x, y, 1);
  }
}
const FW = { list: [], next: 0 };
// un point de tir visible a l'ecran : l'explosion tombe dans le haut de la vue
function fwPick(side){
  for (let k = 0; k < 8; k++){
    const x = W * (.12 + Math.random() * .76), yb = H * (.1 + Math.random() * .36);
    const gy = Math.min(H * 1.05, yb + 45 + Math.random() * 55), g = unprj(x, gy);
    if (side && side !== 'both' && sideOf(g[0]) !== side) continue;
    if (!wallUp() && !inFront(g[0])) continue;
    return { a: g[0], b: g[1], h: gy - yb };
  }
  return null;
}
function fwSpawn(a, b, t, big, h){
  const mats = [M.ICON_R, M.ICON_Y, M.FW_BLUE, M.FW_GREEN, M.SIGN];
  FW.list.push({ a, b, t0: t, h: h || 70 + Math.random() * 55, dur: 1.2 + Math.random() * .7, mat: mats[(Math.random() * mats.length) | 0], mat2: mats[(Math.random() * mats.length) | 0], n: big ? 90 : 50 + ((Math.random() * 24) | 0), r: big ? 50 : 28 + Math.random() * 14, seed: (Math.random() * 1000) | 0 });
  if (typeof sfx === 'function') sfx('fw', a, b);
}
// salve de celebration : lancement reussi, mur, nouvel an
function fwSalvo(side, n){
  if (!COLOR) return;
  for (let k = 0; k < n; k++) setTimeout(() => { if (OV_ON) return; const p = fwPick(side); if (p) fwSpawn(p.a, p.b, NOW_T, k % 3 === 0, p.h); }, k * 380);
}
function stepFw(dt, t){
  FW.list = FW.list.filter(f => t < f.t0 + f.dur + 2.4);
  XMAS_ON = COLOR && CAL.m === 11;
  if (!COLOR || OV_ON) return;
  const f = feteOf(CAL.m);
  if (!f || NIGHT < .55 || t < FW.next) return;
  FW.next = t + .6 + Math.random() * 1.4;
  const p = fwPick(f.side); if (p) fwSpawn(p.a, p.b, t, Math.random() < .15, p.h);
}
function drawFw(t){
  for (const f of FW.list){
    const e = t - f.t0; if (e < 0) continue;
    if (e < f.dur){
      const z = f.h * Math.sin(e / f.dur * Math.PI / 2), p = prj(f.a, f.b, z), x = Math.round(p[0]), y = Math.round(p[1]);
      CUR = M.GLOW; fput(x, y, 1); fput(x, y + 1, 1); if (hash2(f.seed, (e * 20) | 0) < .6) fput(x + (hash2(f.seed, (e * 30) | 0) < .5 ? -1 : 1), y + 3, 1);
      continue;
    }
    const k = e - f.dur, p = prj(f.a, f.b, f.h), cx = p[0], cy = p[1], grow = 1 - Math.pow(1 - Math.min(1, k / .7), 3);
    for (let i = 0; i < f.n; i++){
      if (k > 1 && hash2(f.seed + i, (k * 8) | 0) < (k - 1) / 1.3) continue;
      const ang = i / f.n * TAU + f.seed, sp = f.r * (.8 + hash2(f.seed, i) * .35);
      const g = k * k * 7, x = Math.round(cx + Math.cos(ang) * sp * grow), y = Math.round(cy + Math.sin(ang) * sp * grow * .82 + g);
      CUR = i & 1 ? f.mat : f.mat2; fput(x, y, 1); fput(x + 1, y, 1); fput(x, y + 1, 1);
      if (k < 1.3){ for (const q of [.86, .74]){ const x2 = Math.round(cx + Math.cos(ang) * sp * grow * q), y2 = Math.round(cy + Math.sin(ang) * sp * grow * .82 * q + g * q); fput(x2, y2, 1); } }
      else if (hash2(i, (k * 12) | 0) < .5){ CUR = M.BEAM; fput(x, y + 2, 1); }
    }
    if (k < .18){ CUR = M.BEAM; const rr = 4 - k * 12; for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) if (Math.abs(dx) + Math.abs(dy) < rr) fput(Math.round(cx) + dx, Math.round(cy) + dy, 1); }
  }
}
HOOKS.step.push(stepFw);
HOOKS.top.unshift(drawFw);

/* ================= le port : quais, grues, cargos, entrepots ================= */
const rot2 = (a, b, ang, u, v) => { const c = Math.cos(ang), s = Math.sin(ang); return [a + u * c - v * s, b + u * s + v * c]; };
// boite tournee : coins dans l'ordre de boxS pour que les normales sortent
function rbox(a, b, ang, u0, u1, v0, v1, z0, z1, side, top, edge){
  const P = [[u0, v1], [u1, v1], [u1, v0], [u0, v0]].map(([u, v]) => rot2(a, b, ang, u, v)), e = edge == null ? 1 : edge;
  for (let i = 0; i < 4; i++){ const p = P[i], q = P[(i + 1) & 3]; wallFace(p[0], p[1], q[0], q[1], z0, z1, side, e); }
  if (top != null) drawFace([P[3][0], P[3][1], z1, P[2][0], P[2][1], z1, P[1][0], P[1][1], z1, P[0][0], P[0][1], z1], UP, top, e);
}
// coque : poupe carree, proue en pointe
function drawHull(a, b, ang, L, Wd, z0, z1, mat, deckMat, band){
  const h = L / 2, w = Wd / 2, bow = Math.min(L * .2, Wd * 1.1);
  const P = [[-h, w], [h - bow, w], [h, 0], [h - bow, -w], [-h, -w]].map(([u, v]) => rot2(a, b, ang, u, v));
  if (band != null){ CUR = band; for (let i = 0; i < P.length; i++){ const p = P[i], q = P[(i + 1) % P.length]; wallFace(p[0], p[1], q[0], q[1], z0, z0 + 1, 0, 1); } }
  CUR = mat;
  for (let i = 0; i < P.length; i++){ const p = P[i], q = P[(i + 1) % P.length]; wallFace(p[0], p[1], q[0], q[1], band != null ? z0 + 1 : z0, z1, (u, hh, x, y) => hh > (z1 - z0) - 1.3 ? 1 : (bz(x, y) < 3 ? 1 : 0), 1); }
  CUR = deckMat;
  const pts = []; for (let i = P.length - 1; i >= 0; i--) pts.push(P[i][0], P[i][1], z1);
  drawFace(pts, UP, (x, y) => ((x + y) & 3) === 0 ? 0 : 1, 1);
}
function bobZ(t, seed){ return Math.sin(t * 1.3 + seed) > .55 ? .6 : 0; }
// cargo a quai : cales, mats de charge, chateau a l'arriere
function drawCargo(s, t){
  const z = bobZ(t, s.seed), ang = s.ang;
  drawHull(s.a, s.b, ang, s.L, s.W, 0 + z, 4 + z, M.HULL, M.PIER, M.FLAG_RED);
  const items = [];
  const L = s.L;
  // chateau arriere
  items.push({ u: -L * .36, f: () => { CUR = M.CHROME; rbox(s.a, s.b, ang, -L * .46, -L * .28, -s.W * .38, s.W * .38, 4 + z, 10 + z, 1, 1); CUR = M.WIN; } });
  items.push({ u: -L * .38, f: () => { CUR = s.side === 'usc' ? M.FLAG_BLUE : M.FLAG_RED; rbox(s.a, s.b, ang, -L * .41, -L * .34, -1.4, 1.4, 10 + z, 15 + z, 1, 0); } });
  // caisses sur le pont
  for (let k = 0; k < 3; k++){
    const u = -L * .16 + k * L * .17, m = [M.KVAS, M.MILITARY, M.PIER][(k + s.seed) % 3], hh = 2 + ((k + s.seed) % 2) * 2;
    items.push({ u, f: () => { CUR = m; rbox(s.a, s.b, ang, u - L * .06, u + L * .06, -s.W * .3, s.W * .3, 4 + z, 4 + hh + z, 1, 1); } });
  }
  items.sort((p, q) => { const A = rot2(s.a, s.b, ang, p.u, 0), B = rot2(s.a, s.b, ang, q.u, 0); return dep(A[0], A[1]) - dep(B[0], B[1]); });
  for (const it of items) it.f();
  // mats de charge
  CUR = M.METAL;
  for (const u of [-L * .22, L * .2]){ const p = rot2(s.a, s.b, ang, u, 0); line3(p[0], p[1], 4 + z, p[0], p[1], 17 + z, 1); const q = rot2(s.a, s.b, ang, u + L * .12, 0); line3(p[0], p[1], 15 + z, q[0], q[1], 6 + z, 1); }
  // pavillon
  const fp = rot2(s.a, s.b, ang, -L * .49, 0); CUR = M.METAL; line3(fp[0], fp[1], 4 + z, fp[0], fp[1], 11 + z, 1);
  const fq = prj(fp[0], fp[1], 11 + z); CUR = s.side === 'usc' ? M.FLAG_BLUE : M.FLAG_RED; const w = Math.round(Math.sin(t * 3 + s.seed));
  for (let y = 0; y < 3; y++) for (let x = 1; x <= 4; x++) fput(Math.round(fq[0]) + x, Math.round(fq[1]) + y + (x > 2 ? w : 0), 1);
}
// grue portique : pieds, cabine, fleche qui fait l'aller-retour entre le cargo et le quai
function drawCrane(c, t){
  const H = 15, s = 3;
  CUR = c.side === 'usc' ? M.FLAG_RED : M.KVAS;
  for (const [da, db] of [[-s, -s], [s, -s], [s, s], [-s, s]]) line3(c.a + da, c.b + db, 0, c.a + da * .45, c.b + db * .45, H, 1);
  line3(c.a - s, c.b - s, 5, c.a + s, c.b - s, 5, 1); line3(c.a - s, c.b + s, 5, c.a + s, c.b + s, 5, 1);
  boxS(c.a - 2, c.a + 2, c.b - 2, c.b + 2, H, H + 4, 1, 1, 0);
  const cyc = ((t * .09 + c.ph) % 2 + 2) % 2, half = cyc < 1, f = half ? cyc : cyc - 1, e = f * f * (3 - 2 * f);
  const ang = half ? c.angShip + (c.angQuay - c.angShip) * e : c.angQuay + (c.angShip - c.angQuay) * e;
  const L = 17, ja = c.a + Math.cos(ang) * L, jb = c.b + Math.sin(ang) * L;
  line3(c.a, c.b, H + 3, ja, jb, H + 2, 1); line3(c.a, c.b, H + 6, ja, jb, H + 2, 1); line3(c.a, c.b, H + 6, c.a - Math.cos(ang) * 5, c.b - Math.sin(ang) * 5, H + 3, 1);
  const hz = H + 1 - 11 * (1 - Math.sin(Math.PI * f));
  CUR = M.METAL; line3(ja, jb, H + 2, ja, jb, hz, 0);
  if (half){ CUR = [M.KVAS, M.MILITARY, M.PIER][Math.floor(t * .09 + c.ph) % 3]; boxS(ja - 1.6, ja + 1.6, jb - 1.2, jb + 1.2, hz - 2.4, hz, 1, 1); }
}
function drawStack(k, t){
  CUR = k.m;
  for (let i = 0; i < k.n; i++){ const da = (i % 3) * 3.3, h = Math.floor(i / 3) * 2.6; boxS(k.a + da, k.a + da + 3, k.b, k.b + 3, h, h + 2.5, 1, 1); }
}
function drawBarrels(k){
  CUR = k.m;
  for (let i = 0; i < 5; i++){ const a = k.a + (i % 3) * 2.2, b = k.b + Math.floor(i / 3) * 2.2; boxS(a, a + 1.8, b, b + 1.8, 0, 2.6, (u, h) => (h > 1.1 && h < 1.5) ? 0 : 1, 1); }
}
function drawWarehouse(w){
  CUR = w.side === 'usc' ? M.BRICK : M.CONCRETE;
  const L = [w.a1 - w.a0, w.b1 - w.b0, w.a1 - w.a0, w.b1 - w.b0];
  gableWalls(w.a0, w.a1, w.b0, w.b1, 8, 4, 'a', (u, h, x, y, k) => {
    if (h < 8 && (k === 0 || k === 2) && h < 6.2 && Math.abs(u - L[k] / 2) < 4.2) return (h > 5.6 || Math.abs(u - L[k] / 2) > 3.6) ? 1 : ((Math.floor(h * 1.4) & 1) ? 0 : 1);
    if (h < 8 && h > 3.6 && h < 5.4 && (Math.floor(u) % 5 === 2)) return 3;
    return wallBase(k, x, y);
  });
  CUR = M.ROOF_CCP; gableRoof(w.a0, w.a1, w.b0, w.b1, 8, 4, 'a', 1, 7, 1);
  const p = prj((w.a0 + w.a1) / 2, w.b1, 7.5); CUR_SIDE = w.side; plate(fput, w.side === 'usc' ? 'DOCKS' : 'PORT DU PEUPLE', Math.round(p[0]), Math.round(p[1]));
}
const PORT_THINGS = [];
for (const P of PORTS){
  const sgn = P.side === 'usc' ? 1 : -1;
  const j0 = P.jet[0], j1 = P.jet[1];
  P.ships = [
    { side: P.side, a: j0[1] + 8.5, b: (j0[2] + j0[3]) / 2 + 2, ang: Math.PI / 2, L: 50, W: 11, seed: 3 },
    { side: P.side, a: j1[0] - 8.5, b: (j1[2] + j1[3]) / 2 - 3, ang: -Math.PI / 2, L: 44, W: 10, seed: 7 }
  ];
  P.cranes = [
    { side: P.side, a: (j0[0] + j0[1]) / 2, b: j0[2] + 22, angShip: 0, angQuay: Math.PI, ph: .3 },
    { side: P.side, a: (j0[0] + j0[1]) / 2, b: j0[2] + 44, angShip: 0, angQuay: Math.PI, ph: 1.1 },
    { side: P.side, a: (j1[0] + j1[1]) / 2, b: j1[2] + 30, angShip: Math.PI, angQuay: 0, ph: .6 }
  ];
  P.ware = { side: P.side, a0: P.ca + 10 * sgn - 13, a1: P.ca + 10 * sgn + 13, b0: P.top + 2, b1: P.top + 12 };
  P.stacks = [
    { a: P.ca - 30, b: P.bot - 7, n: 5, m: M.KVAS }, { a: P.ca - 42, b: P.top + 3, n: 6, m: M.MILITARY }, { a: P.ca + 34, b: P.bot - 7, n: 4, m: M.PIER },
    { a: P.ca + 56, b: P.top + 4, n: 6, m: P.side === 'usc' ? M.FLAG_BLUE : M.FLAG_RED }
  ];
  P.barrels = [{ a: P.ca - 16 * sgn, b: P.bot - 6, m: M.FLAG_RED }, { a: P.ca + 26 * sgn, b: P.top + 14, m: M.RAIL }];
}
HOOKS.town.push((parts, lights) => {
  for (const P of PORTS){
    for (const s of P.ships) parts.push(part(s.a, s.b, 0, (t) => drawCargo(s, t)));
    for (const c of P.cranes){ const p = part(c.a, c.b, 0, (t) => drawCrane(c, t)); p.shadow = [c.a - 3, c.b - 3, 0, c.a + 3, c.b + 3, 0, c.a, c.b, 18]; parts.push(p); }
    const w = P.ware, pw = part((w.a0 + w.a1) / 2, (w.b0 + w.b1) / 2, 0, () => drawWarehouse(w)); pw.m = M.BRICK; parts.push(pw);
    for (const k of P.stacks) parts.push(part(k.a + 4, k.b + 1.5, 0, (t) => drawStack(k, t)));
    for (const k of P.barrels) parts.push(part(k.a + 2, k.b + 1, 0, () => drawBarrels(k)));
    lights.push(Lc(P.ca, P.top + 8, 16, 1.2), Lc(P.jet[0][0] + 4, P.bot + 30, 12, 1.1), Lc(P.jet[1][0] + 4, P.bot + 30, 12, 1.1));
  }
});

/* ================= bateaux qui bougent : ferry autour de l'ile, barges du debarquement ================= */
// le ferry suit une super-ellipse au large, comme la cote
function ferryPos(t){
  const th = t * TAU / 420 + 2.2, c = Math.cos(th), s = Math.sin(th);
  const u = Math.sign(c) * Math.pow(Math.abs(c), .5), v = Math.sign(s) * Math.pow(Math.abs(s), .5);
  return [IS.ca + (IS.ra + 150) * u, IS.cb + (IS.rb + 125) * v];
}
function drawFerry(t){
  const [a, b] = ferryPos(t), [a2, b2] = ferryPos(t + .5), ang = Math.atan2(b2 - b, a2 - a), z = bobZ(t, 1);
  drawHull(a, b, ang, 42, 10, 0 + z, 3.5 + z, M.CHROME, M.PIER, M.FLAG_BLUE);
  CUR = M.CHROME; rbox(a, b, ang, -15, 9, -3.6, 3.6, 3.5 + z, 7.5 + z, (u, h) => (h > 1.2 && h < 2.6 && (Math.floor(u) % 3 !== 0)) ? 3 : 1, 1);
  rbox(a, b, ang, -8, 3, -2.8, 2.8, 7.5 + z, 10.5 + z, (u, h) => (h > .8 && h < 2 && (Math.floor(u) % 3 !== 0)) ? 3 : 1, 1);
  CUR = M.KVAS; rbox(a, b, ang, -4.5, -1.5, -1.2, 1.2, 10.5 + z, 14.5 + z, 1, 0);
  // sillage
  CUR = M.FOAM;
  for (let k = 0; k < 26; k++){ const u = -22 - k * 1.3, v = (hash2(k, (t * 6) | 0) - .5) * (2 + k * .35); const p = rot2(a, b, ang, u, v), q = prj(p[0], p[1], 0); fput(Math.round(q[0]), Math.round(q[1]), 1); }
}
// barges : au debut du Debarquement, chaque camp arrive par la mer jusqu'a son port
function bargeState(P, k, t){
  if (GAME.mode !== 'deb' || !DEB.landT) return null;
  const e = t - DEB.landT; if (e < 0 || e > 95) return null;
  const tgt = [P.ca - 30 + k * 20, P.bot + 5], from = [P.ca - 80 + k * 55, P.bot + 330];
  const f = Math.min(1, e / 32), ease = 1 - Math.pow(1 - f, 2);
  return { a: from[0] + (tgt[0] - from[0]) * ease, b: from[1] + (tgt[1] - from[1]) * ease, ang: Math.atan2(tgt[1] - from[1], tgt[0] - from[0]), moving: f < 1, fade: e > 80 };
}
function drawBarge(s, side, t){
  if (s.fade && hash2(((t * 8) | 0), s.a | 0) < (t % 1)) return;
  const z = bobZ(t, s.a);
  drawHull(s.a, s.b, s.ang, 14, 6, z, 2.5 + z, M.MILITARY, M.MILITARY, M.HULL);
  const fp = rot2(s.a, s.b, s.ang, -6, 0); CUR = M.METAL; line3(fp[0], fp[1], 2.5 + z, fp[0], fp[1], 8 + z, 1);
  const q = prj(fp[0], fp[1], 8 + z); CUR = side === 'usc' ? M.FLAG_BLUE : M.FLAG_RED;
  for (let y = 0; y < 3; y++) for (let x = 1; x <= 4; x++) fput(Math.round(q[0]) + x, Math.round(q[1]) + y, 1);
  if (s.moving){ CUR = M.FOAM; for (let k = 0; k < 10; k++){ const p = rot2(s.a, s.b, s.ang, -8 - k, (hash2(k, (t * 6) | 0) - .5) * 3), r = prj(p[0], p[1], 0); fput(Math.round(r[0]), Math.round(r[1]), 1); } }
}
HOOKS.dyn.push((t, out) => {
  const [fa, fb2] = ferryPos(t); out.push({ d: dep(fa, fb2), f: () => drawFerry(t) });
  for (const P of PORTS) for (let k = 0; k < 3; k++){ const s = bargeState(P, k, t); if (s) out.push({ d: dep(s.a, s.b), f: () => drawBarge(s, P.side, t) }); }
});

/* ================= la foule : passants sur les trottoirs, match au stade ================= */
const PEDS = [];
const PED_FUR = [M.CAT, M.CAT_OR, M.CAT_GRAY, M.CAT_BLACK, M.CAT_SIAM];
function buildPeds(){
  PEDS.length = 0;
  const built = LOTS.filter(l => l.type && l.type !== 'parc');
  for (let k = 0; k < built.length && PEDS.length < 90; k++){
    const l = built[(k * 37) % built.length]; if (hash2(k, 31) > .55) continue;
    const ra = A_LINES.includes(l.a0 - 9) ? l.a0 - 9 : A_LINES.includes(l.a1 + 9) ? l.a1 + 9 : null;
    const rb = B_LINES.includes(l.b0 - 9) ? l.b0 - 9 : B_LINES.includes(l.b1 + 9) ? l.b1 + 9 : null;
    const alongB = ra != null && (rb == null || hash2(k, 5) < .5);
    let seg;
    if (alongB){ const off = ra < l.ca ? RW + 1.6 : -(RW + 1.6); seg = { o: 'b', c: ra + off, s0: l.b0 - 6, s1: l.b1 + 6 }; }
    else if (rb != null){ const off = rb < l.cb ? RW + 1.6 : -(RW + 1.6); seg = { o: 'a', c: rb + off, s0: l.a0 - 6, s1: l.a1 + 6 }; }
    else continue;
    const p0 = segPt(seg, seg.s0), p1 = segPt(seg, seg.s1);
    if (typeAt(p0[0], p0[1]) !== T_WALK || typeAt(p1[0], p1[1]) !== T_WALK) continue;
    PEDS.push({ seg, side: l.side, lot: l, sp: 3 + hash2(k, 9) * 3, ph: hash2(k, 13) * 100, fur: PED_FUR[(hash2(k, 17) * 5) | 0], hat: l.side === 'ccp' ? hash2(k, 19) < .4 : hash2(k, 23) < .25 });
  }
}
function pedPos(p, t){
  const L = p.seg.s1 - p.seg.s0, per = 2 * L / p.sp, ph = ((t + p.ph) / per) % 1, f = ph < .5 ? ph * 2 : 2 - ph * 2;
  const pt = segPt(p.seg, p.seg.s0 + L * f);
  return { a: pt[0], b: pt[1], fwd: ph < .5 };
}
function drawPed(p, q, t){
  const s = prj(q.a, q.b, 0), bx = Math.round(s[0]), by = Math.round(s[1]);
  const da = p.seg.o === 'a' ? (q.fwd ? 1 : -1) : 0, db = p.seg.o === 'b' ? (q.fwd ? 1 : -1) : 0;
  const f = ((da * PC - db * PS) - (da * PS + db * PC)) >= 0 ? 1 : -1, fr = Math.floor(t * 6 + p.ph) & 1;
  const px = [[1, -4], [2, -4], [1, -3], [2, -3], [-1, -2], [0, -2], [1, -2], [-2, -3], fr ? [-1, -1] : [0, -1], fr ? [1, -1] : [-1, -1]];
  CUR = p.fur;
  for (const [x, y] of px) for (const [ox, oy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) fput(bx + x * f + ox, by + y + oy, 0);
  for (const [x, y] of px) fput(bx + x * f, by + y, 1);
  if (p.hat){ CUR = p.side === 'ccp' ? M.MILITARY : M.HULL; fput(bx + f, by - 5, 1); fput(bx + 2 * f, by - 5, 1); }
}
// match : deux equipes et une balle sur la pelouse, l'apres-midi et le soir
function stadeDrawables(t, out){
  const h = CLOCK.h; if (h < 13 || h > 22.5) return;
  for (const l of LOTS){
    if (l.type !== 'stade' || (l.buildT && t < l.buildT + BUILD_DUR) || !inFront(l.ca)) continue;
    const a0 = l.a0 + 8, a1 = l.a1 - 3, b0 = l.b0 + 8, b1 = l.b1 - 3, ccp = l.side === 'ccp';
    const ball = [ (a0 + a1) / 2 + Math.sin(t * .9 + l.ca) * (a1 - a0) * .38, (b0 + b1) / 2 + Math.sin(t * 1.3) * (b1 - b0) * .34 ];
    for (let k = 0; k < 12; k++){
      const team = k & 1, home = [a0 + (a1 - a0) * (.15 + .7 * hash2(k, l.ca | 0)), b0 + (b1 - b0) * (.15 + .7 * hash2(k + 5, l.cb | 0))];
      const pull = .25 + .35 * hash2(k, 3), pa = home[0] + (ball[0] - home[0]) * pull + Math.sin(t * 2 + k) * .8, pb = home[1] + (ball[1] - home[1]) * pull + Math.cos(t * 1.7 + k) * .8;
      out.push({ d: dep(pa, pb), f: () => { const q = prj(pa, pb, 0), x = Math.round(q[0]), y = Math.round(q[1]); CUR = team ? (ccp ? M.FLAG_RED : M.FLAG_BLUE) : (ccp ? M.KVAS : M.FLAG_RED); fput(x, y - 1, 1); fput(x, y - 2, 1); CUR = M.CAT; fput(x, y - 3, 1); } });
    }
    out.push({ d: dep(ball[0], ball[1]) + .1, f: () => { const bz2 = Math.abs(Math.sin(t * 3)) * 3, q = prj(ball[0], ball[1], bz2); CUR = M.CHROME; fput(Math.round(q[0]), Math.round(q[1]) - 1, 1); } });
  }
}
HOOKS.dyn.push((t, out) => {
  if (OV_ON || Z < KDEF * .6) return;
  if (!PEDS.length || PEDS.ver !== TOWN_VER){ buildPeds(); PEDS.ver = TOWN_VER; }
  for (const p of PEDS){
    if (!p.lot.type || (p.lot.buildT && t < p.lot.buildT + BUILD_DUR)) continue;
    const q = pedPos(p, t); if (!inFront(q.a)) continue;
    const s = prj(q.a, q.b, 0); if (s[0] < -8 || s[1] < -8 || s[0] > W + 8 || s[1] > H + 8) continue;
    if (NIGHT > .8 && hash2(PEDS.indexOf(p), 3) < .7) continue;
    out.push({ d: dep(q.a, q.b) + .1, f: () => drawPed(p, q, t) });
  }
  stadeDrawables(t, out);
});

/* ================= reflets de nuit : lumieres dans l'eau et sur les routes mouillees ================= */
let WET = 0;
HOOKS.step.push((dt) => { const rain = WEATHER.shown === 'pluie' ? WEATHER.k : 0; WET = rain > .3 ? Math.min(1, WET + dt * .25 * rain) : Math.max(0, WET - dt / 90); });
const GLOWS = new Uint8Array(PAL_HEX.length);
[M.WIN, M.LAMP, M.SIGN, M.SIGN_CCP, M.REDLIGHT, M.FW_BLUE, M.FW_GREEN, M.ICON_R, M.ICON_Y].forEach(m => GLOWS[m] = 1);
const WATERS = new Uint8Array(PAL_HEX.length); [M.SEA, M.SEA_MID, M.SEA_SHALLOW, M.FOAM].forEach(m => WATERS[m] = 1);
const KEEP_TINT = new Uint8Array(PAL_HEX.length); [M.SIGN, M.SIGN_CCP, M.REDLIGHT, M.FW_BLUE, M.FW_GREEN, M.ICON_R, M.ICON_Y].forEach(m => KEEP_TINT[m] = 1);
function reflections(t){
  if (NIGHT < .45 || N > 900000) return;
  const road = WET > .15, MR = M.ROAD, RF = M.REFLECT, tick = (t * 7) | 0, maxW = Math.round(20 + 10 * (K <= 2 ? 1 : 0)), maxR = Math.round(9 * WET);
  for (let x = 0; x < W; x++){
    let gy = -999, gm = 0;
    for (let y = 0, i = x; y < H; y++, i += W){
      const m = mb[i];
      if (fb[i] === 1 && GLOWS[m]){ gy = y; gm = m; continue; }
      const d = y - gy; if (d > maxW) continue;
      if (WATERS[m]){
        if (((y + (tick >> 1)) % 3) !== 0 && hash2(x * 3 + ((y + tick) >> 1), y) < .7 - d / maxW){ fb[i] = 1; mb[i] = KEEP_TINT[gm] ? gm : RF; lb[i] = 0; }
      } else if (road && m === MR && d <= maxR && fb[i] === 0){
        if (hash2(x, y + tick * 3) < (.5 - d / (maxR * 2.2)) * WET){ fb[i] = 1; mb[i] = KEEP_TINT[gm] ? gm : RF; lb[i] = 0; }
      }
    }
  }
}
HOOKS.post.push(reflections);
