/* ================= forets : des milliers d'arbres, ranges par cases pour ne dessiner que ceux a l'ecran ================= */
const TB = 64;                     // taille d'une case d'arbres, en unites
const TREES = { list: [], grid: new Map(), ver: 0 };
const treeKey = (i, j) => i * 4096 + j;
function treeCell(a, b){ return treeKey(Math.floor(a / TB), Math.floor(b / TB)); }
function addTree(a, b, r){
  const t = { a, b, r, alive: true };
  TREES.list.push(t);
  const k = treeCell(a, b); let L = TREES.grid.get(k); if (!L){ L = []; TREES.grid.set(k, L); } L.push(t);
}
function buildForests(seed){
  TREES.list = []; TREES.grid = new Map(); TREES.ver++;
  // foret dense sur le sol de foret, arbres isoles ailleurs
  for (let b = GB0 + 4; b < GB0 + GH / GSC - 4; b += 6.5){
    for (let a = GA0 + 4; a < GA0 + GW / GSC - 4; a += 7.5){
      const ja = a + (hash2(a * 3 + seed, b) - .5) * 6, jb = b + (hash2(a, b * 3 + seed) - .5) * 5;
      const i = cellOf(ja, jb); if (i < 0) continue;
      const t = gBase[i];
      if (t === T_FOREST){ if (hash2(ja + 11, jb - seed) < .82) addTree(Math.round(ja), Math.round(jb), 3 + Math.floor(hash2(ja, jb + 5) * 3)); }
      else if (t === T_GRASS && gLand[i] > 16 && hash2(ja - 7, jb + seed * 3) < .018) addTree(Math.round(ja), Math.round(jb), 3 + Math.floor(hash2(ja, jb + 9) * 2));
    }
  }
}
/* ================= montagnes : des sommets en 3D sur les zones rocheuses ================= */
const PEAKS = { list: [], grid: new Map() };
function buildMountains(seed){
  PEAKS.list = []; PEAKS.grid = new Map();
  for (let b = GB0 + 10; b < GB0 + GH / GSC - 10; b += 30){
    for (let a = GA0 + 10; a < GA0 + GW / GSC - 10; a += 36){
      const ja = a + (hash2(a + seed, b * 3) - .5) * 20, jb = b + (hash2(a * 3, b + seed) - .5) * 16;
      if (baseAt(ja, jb) !== T_ROCK || landDAt(ja, jb) < 40) continue;
      const m = clamp((mountN(ja, jb) - MOUNT_T) / (1 - MOUNT_T), 0, 1);
      if (hash2(ja - 3, jb + 9) > .45 + m * 1.5) continue;
      const H = Math.round(22 + m * 80 + hash2(ja, jb) * 12), R = 14 + H * .5;
      // base irreguliere a 6 cotes, sommet un peu decale
      const n = 6, ph = hash2(ja + 1, jb) * TAU, base = [];
      for (let k = 0; k < n; k++){ const an = ph + k * TAU / n, rr = R * (.78 + hash2(ja + k, jb - k) * .44); base.push([ja + Math.cos(an) * rr, jb + Math.sin(an) * rr]); }
      const pk = { a: ja, b: jb, H, R, base, apex: [ja + (hash2(ja, jb + 5) - .5) * R * .3, jb + (hash2(ja + 5, jb) - .5) * R * .3], snow: H > 58 };
      PEAKS.list.push(pk);
      const key = treeCell(ja, jb); let L = PEAKS.grid.get(key); if (!L){ L = []; PEAKS.grid.set(key, L); } L.push(pk);
    }
  }
}
function drawPeak(pk){
  const n = pk.base.length, [ta, tb] = pk.apex, H = pk.H;
  for (let k = 0; k < n; k++){
    const [pa, pb] = pk.base[k], [qa, qb] = pk.base[(k + 1) % n];
    // normale sortante de la face (p, q, sommet)
    const ux = qa - pa, uy = qb - pb, vx = ta - pa, vy = tb - pb, nx = uy * H - 0 * vy, ny = 0 * vx - ux * H, nz = ux * vy - uy * vx;
    const sgn = nz < 0 ? -1 : 1, nrm = [nx * sgn, ny * sgn, nz * sgn];
    CUR = M.ROCK;
    drawFace([pa, pb, 0, qa, qb, 0, ta, tb, H], nrm, (x, y) => bz(x, y) < 5 ? 1 : 0, 1);
    if (pk.snow){
      const f = .68, sa = pa + (ta - pa) * f, sb = pb + (tb - pb) * f, ea = qa + (ta - qa) * f, eb = qb + (tb - qb) * f;
      CUR = M.NEUTRAL;
      drawFace([sa, sb, H * f, ea, eb, H * f, ta, tb, H], nrm, (x, y) => bz(x, y) < 14 ? 1 : 0, -1);
    }
  }
}
function peaksIn(a0, a1, b0, b1, fn){
  for (let i = Math.floor(a0 / TB); i <= Math.floor(a1 / TB); i++) for (let j = Math.floor(b0 / TB); j <= Math.floor(b1 / TB); j++){
    const L = PEAKS.grid.get(treeKey(i, j)); if (L) for (const p of L) fn(p);
  }
}
// arbres dans un rectangle (vivants seulement)
function treesIn(a0, a1, b0, b1, fn){
  for (let i = Math.floor(a0 / TB); i <= Math.floor(a1 / TB); i++) for (let j = Math.floor(b0 / TB); j <= Math.floor(b1 / TB); j++){
    const L = TREES.grid.get(treeKey(i, j)); if (!L) continue;
    for (const t of L) if (t.alive && t.a >= a0 && t.a <= a1 && t.b >= b0 && t.b <= b1) fn(t);
  }
}
function cutTrees(a0, a1, b0, b1){ let n = 0; treesIn(a0 - 3, a1 + 3, b0 - 3, b1 + 3, (t) => { t.alive = false; n++; }); if (n) TREES.ver++; clearForest(a0, a1, b0, b1); return n; }
// arbres le long d'un trait (routes, mur)
function cutTreesAlong(pts, w){
  let n = 0;
  for (let k = 0; k + 1 < pts.length; k++){
    const [pa, pb] = pts[k], [qa, qb] = pts[k + 1], L = Math.hypot(qa - pa, qb - pb) || 1;
    treesIn(Math.min(pa, qa) - w - 3, Math.max(pa, qa) + w + 3, Math.min(pb, qb) - w - 3, Math.max(pb, qb) + w + 3, (t) => {
      const s = clamp(((t.a - pa) * (qa - pa) + (t.b - pb) * (qb - pb)) / (L * L), 0, 1);
      if (Math.hypot(pa + (qa - pa) * s - t.a, pb + (qb - pb) * s - t.b) < w + 3){ t.alive = false; n++; }
    });
    clearForest(Math.min(pa, qa) - w, Math.max(pa, qa) + w, Math.min(pb, qb) - w, Math.max(pb, qb) + w);
  }
  if (n) TREES.ver++;
  return n;
}
// arbres visibles, ajoutes a la liste de dessin ; leurs ombres sont posees directement au sol
function treeDrawables(out, t, withShadows){
  const cs = [unprj(-20, -20), unprj(W + 20, -20), unprj(-20, H + 60), unprj(W + 20, H + 60)];
  let a0 = 1e9, a1 = -1e9, b0 = 1e9, b1 = -1e9;
  for (const [a, b] of cs){ a0 = Math.min(a0, a); a1 = Math.max(a1, a); b0 = Math.min(b0, b); b1 = Math.max(b1, b); }
  const xmas = XMAS_ON;
  peaksIn(a0 - 40, a1 + 40, b0 - 40, b1 + 80, (pk) => {
    const q = prj(pk.a, pk.b, 0);
    if (q[0] < -pk.R * 2 || q[0] > W + pk.R * 2 || q[1] < -10 || q[1] > H + pk.H + pk.R) return;
    out.push({ d: dep(pk.a, pk.b) - pk.R * .5, m: M.ROCK, f: () => drawPeak(pk) });
  });
  treesIn(a0, a1, b0, b1, (tr) => {
    const q = prj(tr.a, tr.b, 0);
    if (q[0] < -14 || q[0] > W + 14 || q[1] < -4 || q[1] > H + 26) return;
    if (withShadows) treeShadow(tr, q);
    const deco = xmas && hash2(tr.a, tr.b) < .3;
    out.push({ d: dep(tr.a, tr.b), m: M.TREE, f: (tt) => { CUR = M.TREE; blitAt(treeSpr(tr.r), tr.a, tr.b, 0); if (deco) drawTreeLights(tr.a, tr.b, tr.r, tt); } });
  });
}
// ombre d'arbre : un ovale decale selon le soleil, seulement sur le sol
function treeShadow(tr, q){
  const h = tr.r * 2 + 3, sa = tr.a + h * SHADOW_V[0] * .5, sb = tr.b + h * SHADOW_V[1] * .5, p = prj(sa, sb, 0);
  const cx = Math.round(p[0]), cy = Math.round(p[1]), rx = tr.r + 2, ry = Math.max(2, tr.r * .6);
  for (let dy = -Math.ceil(ry); dy <= Math.ceil(ry); dy++){
    const y = cy + dy; if (y < 0 || y >= H) continue;
    const w = Math.floor(rx * Math.sqrt(Math.max(0, 1 - (dy / (ry + .5)) ** 2)));
    for (let dx = -w; dx <= w; dx++){ const x = cx + dx; if (x >= 0 && x < W) lb[y * W + x] = 4; }
  }
}

/* ================= le Rideau de Laine : segments que chaque camp tricote lui-meme ================= */
// WALLS : pans de 10 unites au plus { side, pa, pb, qa, qb, g, line } ; WALL_TOWERS : miradors le long des lignes
let WALLS = [], WALL_TOWERS = [];
const GRAFFITI = ['PAIX', 'MIAOU', 'LIBRE', 'LOVE', 'ELVIS'];
function glyphAt(str, u, h, u0, h0, s){
  const col = Math.floor((u - u0) / s), row = Math.floor((h0 - h) / s);
  if (col < 0 || row < 0 || row > 4) return false;
  const ch = Math.floor(col / 4), cc = col % 4;
  if (ch >= str.length || cc === 3) return false;
  const g = FONT[str[ch]]; return !!g && g[row * 3 + cc] === '1';
}
// un pan de mur entre deux points : laine grise tricotee, barbeles, graffiti cote USC
function drawWallPiece(pa, pb, qa, qb, g, side){
  const L = Math.hypot(qa - pa, qb - pb) || 1, na = -(qb - pb) / L * .8, nb = (qa - pa) / L * .8;
  CUR = M.WALL;
  const fn = (u, h, x, y) => {
    if (h > 6.2) return 1;
    if ((u % 2.5) < .3) return 0;
    if (g){ const s = Math.min(.55, (L - 1) / (textW(g) + 1)); if (glyphAt(g, u, h, .8, 5.2, s)) return (bz(x, y) < 12) ? 1 : 0; }
    return bz(x, y) < 3 ? 1 : 0;
  };
  wallFace(pa + na, pb + nb, qa + na, qb + nb, 0, 7, fn, 1);
  wallFace(qa - na, qb - nb, pa - na, pb - nb, 0, 7, fn, 1);
  drawFace([pa - na, pb - nb, 7, qa - na, qb - nb, 7, qa + na, qb + nb, 7, pa + na, pb + nb, 7], UP, 1, 1);
  CUR = M.METAL;
  const n = Math.ceil(L / .8);
  for (let k = 0; k <= n; k++){ const f = k / n, p = prj(pa + (qa - pa) * f, pb + (qb - pb) * f, 8.2 + ((k & 1) ? .6 : 0)); fput(Math.round(p[0]), Math.round(p[1]), 1); }
}
function towerSpot(tw, t){ return [tw.a + Math.sin(t * .7 + tw.ph) * 14, tw.b + Math.cos(t * .35 + tw.ph) * 14]; }
function drawTower(tw, t){
  const { a, b } = tw;
  CUR = M.METAL;
  for (const [da, db] of [[-2.2,-2.2],[2.2,-2.2],[2.2,2.2],[-2.2,2.2]]) line3(a + da, b + db, 0, a + da * .7, b + db * .7, 16, 1);
  line3(a - 2.2, b + 2.2, 5, a + 2.2, b + 2.2, 11, 1); line3(a + 2.2, b - 2.2, 5, a + 2.2, b + 2.2, 11, 1);
  boxS(a - 3, a + 3, b - 3, b + 3, 16, 21, (u, h, x, y) => (h > 1.8 && h < 3.6) ? ((Math.floor(u * 1.5) % 3 === 0) ? 0 : 1) : (bz(x, y) < 2 ? 1 : 0), 0);
  boxS(a - 3.6, a + 3.6, b - 3.6, b + 3.6, 21, 22, 1, (x, y) => bz(x, y) < 4 ? 1 : 0);
  const top = prj(a, b, 23);
  pennant(Math.round(top[0]), Math.round(top[1]) - 4, tw.side, t, a);
  if (COLOR && DAY) return;
  const sp = towerSpot(tw, t), gp = prj(sp[0], sp[1], 0);
  CUR = M.BEAM;
  fput(Math.round(top[0]), Math.round(top[1]), 1); fput(Math.round(top[0]) + 1, Math.round(top[1]), 1);
  const n = Math.ceil(Math.hypot(gp[0] - top[0], gp[1] - top[1]));
  for (let s = 3; s < n; s++){ const x = Math.floor(top[0] + (gp[0] - top[0]) * s / n), y = Math.floor(top[1] + (gp[1] - top[1]) * s / n); if (bz(x, y) < 5) fput(x, y, 1); }
}

/* ================= le phare : une tour a rayures, a poser sur la cote ================= */
const PL_H = 3, TOWER_H = 40, GYO = -PL_H - TOWER_H;
function lhBase(a, b){ const p = prj(a, b, 0); return [Math.round(p[0]), Math.round(p[1])]; }
function drawLighthouse(a, b, side){
  const [ox, oy] = lhBase(a, b);
  const P = (x, y, c) => fput(ox + x, oy + y, c);
  const PRX = 10, PRY = 4.5;
  CUR = M.ROCK;
  for (let x = -PRX; x <= PRX; x++){
    const k = Math.sqrt(Math.max(0, 1 - (x / (PRX + .5)) ** 2));
    const yb = Math.round(-PL_H - PRY * k), yf = Math.round(-PL_H + PRY * k);
    for (let y = yb; y <= yf; y++){ const edge = y === yb || y === yf || Math.abs(x) === PRX; P(x, y, edge ? (y === yb ? 1 : 0) : (bay(x, y) < (x < 2 ? 15 : 10) ? 1 : 0)); }
    for (let r = 1; r <= PL_H; r++){ const y = yf + r; let c; if (r === PL_H || Math.abs(x) === PRX) c = 0; else if (((x + r * 2) & 3) === 0) c = 0; else c = x < 3 ? 1 : (bay(x, y) < 6 ? 1 : 0); P(x, y, c); }
  }
  const R0 = 7, R1 = 4.5, rot = cam.phi / Math.PI * 0.8;
  CUR = side === 'usc' ? M.FLAG_BLUE : M.FLAG_RED;
  for (let x = -R0; x <= R0; x++) for (let y = GYO - 3; y <= -PL_H + 4; y++){
    const z0 = -PL_H - y, r = R0 + (R1 - R0) * clamp(z0 / TOWER_H, 0, 1);
    if (Math.abs(x) > r + .5) continue;
    const xn = clamp(x / (r + .5), -1, 1), ang = Math.asin(xn), cs = Math.sqrt(1 - xn * xn);
    const z = z0 + 0.45 * r * cs;
    if (z < 0 || z > TOWER_H) continue;
    let c;
    if (Math.abs(x) >= Math.round(r) || z > TOWER_H - 1) c = z < 8 ? 0 : 1;
    else if (z < 0.9) c = 0;
    else {
      const bp = ((z / 12 + ang / Math.PI * 0.8 + rot + 0.15) % 1 + 1) % 1, band = bp < 0.34;
      const light = clamp(1.05 - 0.62 * (xn + 0.25), 0.3, 1);
      c = band ? ((bp < 0.05 && xn < 0.2) ? 1 : 0) : (bay(x, y) < light * 16 ? 1 : 0);
      if (z < 6.5 && x >= -2 && x <= 1 && Math.cos(cam.phi + .8) > .2) c = (z > 5.6 && (x === -2 || x === 1)) ? c : 0;
    }
    P(x, y, c);
  }
}
function drawLantern(a, b){
  const [ox, oy] = lhBase(a, b), g = GYO;
  CUR = M.LAMP;
  const P = (x, y, c) => fput(ox + x, oy + y, c);
  for (let x = -7; x <= 7; x++) P(x, g, 1);
  for (let x = -6; x <= 6; x++) P(x, g + 1, (x & 1) ? 0 : 1);
  for (let x = -3; x <= 3; x++) P(x, g - 1, 0);
  for (let y = g - 7; y <= g - 2; y++) for (let x = -3; x <= 3; x++) P(x, y, Math.abs(x) === 3 ? 0 : 1);
  for (let k = 0; k < 4; k++){ const an = state.theta * 2 - cam.phi * 2 + k * Math.PI / 2; if (Math.cos(an) > 0.25){ const mx = Math.round(2.3 * Math.sin(an)); for (let y = g - 7; y <= g - 2; y++) P(mx, y, 0); } }
  for (let x = -7; x <= 7; x++) if (x < -3 || x > 3) P(x, g - 3, 1);
  for (const x of [-7, -5, 5, 7]){ P(x, g - 2, 1); P(x, g - 1, 1); }
  for (let x = -4; x <= 4; x++) P(x, g - 8, 1);
  [4, 3, 2, 1].forEach((hw, r) => { const y = g - 9 - r; for (let x = -hw; x <= hw; x++) P(x, y, x === -hw ? 1 : x === hw ? 0 : (bay(x, y) < 5 ? 1 : 0)); });
  P(0, g - 13, 1); P(0, g - 14, 1); P(-1, g - 15, 1); P(0, g - 15, 1); P(1, g - 15, 1);
}
function drawGlow(a, b, t){
  const [ox, oy] = lhBase(a, b), lx = ox, ly = oy + GYO - 5;
  CUR = M.LAMP;
  const va = (PC + PS) / Math.SQRT2, vb = (PC - PS) / Math.SQRT2;
  const flash = Math.pow(Math.abs(Math.cos(state.theta) * va + Math.sin(state.theta) * vb), 10);
  const R = 6 + 12 * flash + 0.6 * Math.sin(t * 9), ri = Math.ceil(R * 1.2);
  for (let dy = -ri; dy <= ri; dy++) for (let dx = -ri; dx <= ri; dx++){
    const q = Math.hypot(dx / 1.18, dy) / R; if (q >= 1) continue;
    const tone = Math.pow(1 - q, 1.6) * (0.6 + 0.4 * flash), x = lx + dx, y = ly + dy;
    if (bz(x, y) < tone * 16) fput(x, y, 1);
  }
}

/* ================= lampadaires le long des routes ================= */
const LAMP_POS = [];
function drawLampHeads(){
  CUR = M.LAMP;
  for (const [a, b] of LAMP_POS){
    const p = prj(a, b, 0), hx = Math.round(p[0]) + 3, hy = Math.round(p[1]) - 13;
    if (hx < -6 || hy < -6 || hx > W + 6 || hy > H + 6) continue;
    for (let dy = -3; dy <= 3; dy++) for (let dx = -4; dx <= 4; dx++){
      const q = Math.hypot(dx / 1.2, dy) / 3.6; if (q >= 1) continue;
      if (bz(hx + dx, hy + dy) < (1 - q) * 14) fput(hx + dx, hy + dy, 1);
    }
  }
}

/* ================= le voilier qui fait le tour de l'ile, au large ================= */
function sailPos(t){ const ph = t * 0.01 + 1.2, c = Math.cos(ph), s = Math.sin(ph); return [IS.ca + (IS.ra + 190) * Math.sign(c) * Math.sqrt(Math.abs(c)), IS.cb + (IS.rb + 150) * Math.sign(s) * Math.sqrt(Math.abs(s))]; }
function drawSailboat(t){
  const [a, b] = sailPos(t), [a2, b2] = sailPos(t + 1);
  const p = prj(a, b, 0), q = prj(a2, b2, 0);
  const bx = Math.round(p[0]), f = (q[0] - p[0]) >= 0 ? 1 : -1;
  const by = Math.round(p[1]) + (Math.sin(t * 2.2) > 0.35 ? -1 : 0);
  const P = (x, y, c) => fput(bx + x * f, by + y, c);
  CUR = M.PIER;
  for (let x = -7; x <= 8; x++) P(x, -2, 1);
  for (let x = -7; x <= 7; x++) P(x, -1, (x === -7 || x === 7) ? 1 : 0);
  for (let x = -6; x <= 6; x++) P(x, 0, (x === -6 || x === 6) ? 1 : 0);
  for (let x = -5; x <= 5; x++) P(x, 1, 1);
  CUR = M.NEUTRAL;
  for (let y = -17; y <= -3; y++) P(0, y, 1);
  for (let y = -16; y <= -4; y++){ const w = Math.floor((y + 17) * 0.52); for (let x = 1; x <= w; x++){ const e = x === w || y === -4; P(x, y, e ? 0 : (x > w - 2 && bay(x, y) > 8 ? 0 : 1)); } }
  for (let y = -14; y <= -4; y++){ const w = Math.floor((y + 15) * 0.4); for (let x = 1; x <= w; x++){ const e = x === w || y === -4; P(-x, y, e ? 0 : (bay(x, y) < 11 ? 1 : 0)); } }
}
