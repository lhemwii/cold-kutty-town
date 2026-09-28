/* ================= le Rideau de Laine ================= */
let WALL_SEGS = [], TOWERS = [], TRAPS = [];
const BARRIERS = [{ a: WALL_A - 7, lift: 0 }, { a: WALL_A + 7, lift: 0 }];
const BOOTHS = [{ side: 'usc', a0: WALL_A - 8, a1: WALL_A - 4, b0: CHECK_B - 14, b1: CHECK_B - 9 }, { side: 'ccp', a0: WALL_A + 4, a1: WALL_A + 8, b0: CHECK_B + 9, b1: CHECK_B + 14 }];
const GRAFFITI = ['PAIX', 'MIAOU', 'LIBRE', 'LOVE', 'ELVIS'];
function glyphAt(str, u, h, u0, h0, s){
  const col = Math.floor((u - u0) / s), row = Math.floor((h0 - h) / s);
  if (col < 0 || row < 0 || row > 4) return false;
  const ch = Math.floor(col / 4), cc = col % 4;
  if (ch >= str.length || cc === 3) return false;
  const g = FONT[str[ch]]; return !!g && g[row * 3 + cc] === '1';
}
function buildBorder(){
  let bs = null, be = null;
  for (let b = GB0; b < GB0 + GH / GSC; b += .5){ const t = typeAt(WALL_A, b); if (t === T_STRIP || t === T_ROAD){ if (bs === null) bs = b; be = b; } }
  WALL_SEGS = [];
  if (bs === null) return;
  for (let b = Math.ceil(bs) + 1; b < be - 2; b += 10){
    const s0 = b, s1 = Math.min(b + 10, be - 2);
    if (s1 > CHECK_B - 8 && s0 < CHECK_B + 8){
      if (s0 < CHECK_B - 8) WALL_SEGS.push({ s0, s1: CHECK_B - 8, g: -1 });
      if (s1 > CHECK_B + 8) WALL_SEGS.push({ s0: CHECK_B + 8, s1, g: -1 });
      continue;
    }
    WALL_SEGS.push({ s0, s1, g: -1 });
  }
  WALL_SEGS.forEach((w, k) => { if (w.s1 - w.s0 >= 9 && k % 3 === 1) w.g = (k / 3 | 0) % GRAFFITI.length; });
  TOWERS = [-470, -350, -250, -110, 130, 265, 400].filter(b => b > bs + 12 && b < be - 12).map((b, k) => ({ a: WALL_A + 5, b, ph: k * 2.1 }));
  TRAPS = [];
  for (let b = Math.ceil(bs) + 6; b < be - 4; b += 13){
    if (Math.abs(b - CHECK_B) < 16 || TOWERS.some(t => Math.abs(t.b - b) < 8)) continue;
    TRAPS.push([WALL_A + 3.5, b]);
  }
}
function drawWallSeg(w){
  const g = w.g >= 0 ? GRAFFITI[w.g] : '';
  CUR = M.WALL;
  boxS(WALL_A - .8, WALL_A + .8, w.s0, w.s1, 0, 7, (u, h, x, y, k) => {
    if (h > 6.2) return 1;
    if ((u % 2.5) < .3) return 0;
    if (g && k === 3){ const s = Math.min(.55, (w.s1 - w.s0 - 1) / (textW(g) + 1)); if (glyphAt(g, u, h, .8, 5.2, s)) return (bz(x, y) < 12) ? 1 : 0; }
    return bz(x, y) < (k === 3 ? 4 : 3) ? 1 : 0;
  }, 1);
  // barbeles
  CUR = M.METAL;
  for (let b = w.s0; b <= w.s1; b += .8){ const p = prj(WALL_A, b, 8.2 + ((Math.round(b / .8) & 1) ? .6 : 0)); fput(Math.round(p[0]), Math.round(p[1]), 1); }
}
const TRAP_SPR = artSprite(['#   #', ' # # ', '  #  ', ' # # ', '#   #']);
function drawBarrier(br, t){
  const up = br.lift, ang = up * Math.PI * .45, len = 12;
  CUR = M.FLAG_RED;
  const pv = prj(br.a, CHECK_B - 6.5, 0);
  lineS(pv[0], pv[1], pv[0], pv[1] - 4, 1);
  const p0 = prj(br.a, CHECK_B - 6.5, 3.5);
  const p1 = prj(br.a, CHECK_B - 6.5 + len * Math.cos(ang), 3.5 + len * Math.sin(ang));
  const n = Math.max(1, Math.ceil(Math.hypot(p1[0] - p0[0], p1[1] - p0[1])));
  for (let s = 0; s <= n; s++){
    const x = Math.floor(p0[0] + (p1[0] - p0[0]) * s / n), y = Math.floor(p0[1] + (p1[1] - p0[1]) * s / n);
    const c = ((s >> 1) & 1) ? 1 : 0;
    fput(x, y, c); fput(x, y - 1, c ? 1 : 0); fput(x, y + 1, 0); fput(x, y - 2, 0);
  }
}
function drawBooth(bo, t){
  CUR = bo.side === 'ccp' ? M.CCP : M.USC;
  boxS(bo.a0, bo.a1, bo.b0, bo.b1, 0, 6, (u, h, x, y, k) => { if (h >= 2.5 && h < 4.8 && u > .6 && u < 3.4) return 1; return (h < .8 || h > 5.4) ? 1 : 0; }, (x, y) => bz(x, y) < 6 ? 1 : 0);
  drawFlagPole(bo.side === 'usc' ? bo.a1 + 1.5 : bo.a0 - 1.5, bo.side === 'usc' ? bo.b0 - 1 : bo.b1 + 1, 0, 18, bo.side, t);
}
function plateLines(lines, cx, by, inv){
  const w = Math.max(...lines.map(textW)) + 4, h = lines.length * 6 + 3, x0 = cx - (w >> 1), y0 = by - h;
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++){ const e = x === x0 || x === x0 + w - 1 || y === y0 || y === y0 + h - 1; fput(x, y, inv ? (e ? 0 : 1) : (e ? 1 : 0)); }
  lines.forEach((s, i) => drawText(fput, s, cx - (textW(s) >> 1), y0 + 2 + i * 6, inv ? 0 : 1));
}
const SECTOR_SIGNS = { usc: [WALL_A - 38, CHECK_B + 8], ccp: [WALL_A + 34, CHECK_B - 8] };
function drawSectorSign(side){
  const [a, b] = SECTOR_SIGNS[side];
  const p = prj(a, b, 0), x = Math.round(p[0]), y = Math.round(p[1]);
  CUR = M.METAL;
  for (let k = 0; k < 8; k++){ fput(x - 8, y - k, 1); fput(x + 8, y - k, 1); }
  CUR = side === 'ccp' ? M.SIGN_CCP : M.SIGN;
  plateLines(side === 'usc' ? ['VOUS QUITTEZ', 'LE SECTEUR USC'] : ['VOUS ENTREZ', 'EN CCR'], x, y - 7, side === 'ccp');
}
function towerSpot(tw, t){ return [tw.a + 1 + Math.sin(t * .7 + tw.ph) * 3, tw.b + Math.sin(t * .35 + tw.ph) * 24]; }
function drawTower(tw, t){
  const { a, b } = tw;
  CUR = M.METAL;
  for (const [da, db] of [[-2.2,-2.2],[2.2,-2.2],[2.2,2.2],[-2.2,2.2]]) line3(a + da, b + db, 0, a + da * .7, b + db * .7, 16, 1);
  line3(a - 2.2, b + 2.2, 5, a + 2.2, b + 2.2, 11, 1); line3(a + 2.2, b - 2.2, 5, a + 2.2, b + 2.2, 11, 1);
  boxS(a - 3, a + 3, b - 3, b + 3, 16, 21, (u, h, x, y) => (h > 1.8 && h < 3.6) ? ((Math.floor(u * 1.5) % 3 === 0) ? 0 : 1) : (bz(x, y) < 2 ? 1 : 0), 0);
  boxS(a - 3.6, a + 3.6, b - 3.6, b + 3.6, 21, 22, 1, (x, y) => bz(x, y) < 4 ? 1 : 0);
  const top = prj(a, b, 23), sp = towerSpot(tw, t), gp = prj(sp[0], sp[1], 0);
  if (COLOR && DAY) return;
  CUR = M.BEAM;
  fput(Math.round(top[0]), Math.round(top[1]), 1); fput(Math.round(top[0]) + 1, Math.round(top[1]), 1);
  const n = Math.ceil(Math.hypot(gp[0] - top[0], gp[1] - top[1]));
  for (let s = 3; s < n; s++){ const x = Math.floor(top[0] + (gp[0] - top[0]) * s / n), y = Math.floor(top[1] + (gp[1] - top[1]) * s / n); if (bz(x, y) < 5) fput(x, y, 1); }
}

/* ================= le phare ================= */
const PL_H = 3, TOWER_H = 40, GYO = -PL_H - TOWER_H;
function lhBase(){ const p = prj(LH.a, LH.b, 0); return [Math.round(p[0]), Math.round(p[1])]; }
function drawLighthouse(){
  const [ox, oy] = lhBase();
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
  CUR = M.FLAG_RED;
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
      if (z < 6.5 && x >= -2 && x <= 1){
        const doorA = Math.cos(cam.phi + .8) > .2;
        if (doorA) c = (z > 5.6 && (x === -2 || x === 1)) ? c : 0;
      }
    }
    P(x, y, c);
  }
}
function drawLantern(){
  const [ox, oy] = lhBase(), g = GYO;
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
function drawGlow(t){
  const [ox, oy] = lhBase(), lx = ox, ly = oy + GYO - 5;
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

/* ================= lampadaires, bateaux ================= */
let LAMP_POS = [];
function buildLamps(){
  LAMP_POS = [];
  A_LINES.forEach((A, i) => { if (A === WALL_A) return; B_LINES.forEach((B, j) => {
    if ((i + j) % 2 !== 0 || B === RAIL_B) return;
    const t = typeAt(A + 8, B + 8), t2 = typeAt(A, B);
    if ((t === T_WALK || t === T_GRASS) && t2 === T_ROAD) LAMP_POS.push([A + 8, B + 8]);
  }); });
  LAMP_POS.push([WALL_A + 11, CHECK_B + 8], [WALL_A - 11, CHECK_B - 8], [LH.a + 5.5, LH.b + 97], [LH.a + 5.5, LH.b + 20]);
  for (const P of PORTS) LAMP_POS.push([P.ca - 62, P.top + 3], [P.ca + 20, P.top + 3], [P.ca - 50, P.bot + 26], [P.ca + 48, P.bot + 26], [P.ca - 50, P.bot + 54], [P.ca + 48, P.bot + 54]);
}
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
const MOORED = [[LH.a - 14, LH.b + 44], [LH.a + 16, LH.b + 37], [LH.a - 14, LH.b + 24]];
function drawMoored(k, t){
  CUR = M.PIER;
  const [a, b] = MOORED[k], p = prj(a, b, 0), ex = Math.round(p[0]), ey = Math.round(p[1]) + (Math.sin(t * 1.7 + k * 2) > 0.2 ? -1 : 0);
  for (let x = -4; x <= 4; x++) fput(ex + x, ey - 1, 1);
  for (let x = -4; x <= 4; x++) fput(ex + x, ey, (x === -4 || x === 4 || x === 0) ? 1 : 0);
  for (let x = -3; x <= 3; x++) fput(ex + x, ey + 1, 1);
}
// le voilier suit la forme de la cote (super-ellipse), pour ne jamais couper par les coins de l'ile
function sailPos(t){ const ph = t * 0.012 + 1.2, c = Math.cos(ph), s = Math.sin(ph); return [IS.ca + (IS.ra + 90) * Math.sign(c) * Math.sqrt(Math.abs(c)), IS.cb + (IS.rb + 110) * Math.sign(s) * Math.sqrt(Math.abs(s))]; }
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

/* ================= decor : arbres, bouches a incendie, cabines, haut-parleurs ================= */
let TREES = [], PROPS = [];
function buildScatter(){
  TREES = [];
  for (let k = 0; k < 11000 && TREES.length < 1150; k++){
    const a = IS.ca + (hash2(k, 11) * 2 - 1) * IS.ra, b = IS.cb + (hash2(k, 23) * 2 - 1) * IS.rb;
    if (typeAt(a, b) !== T_GRASS || landDAt(a, b) < 12 || lotAt(a, b)) continue;
    if (Math.abs(a - WALL_A) < STRIP + 6 || nearAirport(a, b, 10) || Math.abs(b - RAIL_B) < RAIL_W + 5) continue;
    // bosquets : on garde surtout les points ou le bruit est haut
    if (vnoise(a * .03 + 3, b * .03 + 7) < .45) continue;
    TREES.push([Math.round(a), Math.round(b), 3 + Math.floor(hash2(k, 5) * 3)]);
  }
  PROPS = [];
  A_LINES.forEach((A, i) => { if (A === WALL_A) return; B_LINES.forEach((B, j) => {
    if ((i + j) % 2 !== 1 || B === RAIL_B) return;
    const pa = A - 8, pb = B + 8, t = typeAt(pa, pb);
    if (t !== T_WALK || typeAt(A, B) !== T_ROAD) return;
    const side = sideOf(pa), r = hash2(i * 7, j * 13);
    PROPS.push({ a: pa, b: pb, side, kind: side === 'usc' ? (r < .5 ? 'hydrant' : 'cabine') : (r < .4 ? 'hautparleur' : r < .7 ? 'kvas' : 'journaux') });
  }); });
}
const HYDRANT = artSprite(['.#.', '###', '#+#', '###']);
function drawProp(p, t){
  const q = prj(p.a, p.b, 0), x = Math.round(q[0]), y = Math.round(q[1]);
  if (p.kind === 'hydrant'){ CUR = M.FLAG_RED; blit(HYDRANT, x, y); return; }
  if (p.kind === 'cabine'){
    CUR = M.FLAG_RED;
    boxS(p.a - 1.2, p.a + 1.2, p.b - 1.2, p.b + 1.2, 0, 6.5, (u, h) => (h > 1.2 && h < 5.2 && u > .5 && u < 1.9) ? 3 : ((h > 5.6) ? 1 : 0), 1);
    return;
  }
  if (p.kind === 'kvas'){
    CUR = M.KVAS;
    boxS(p.a - 2.2, p.a + 2.2, p.b - 1.2, p.b + 1.2, .9, 3.2, (u, h) => (h > 1.9 && h < 2.3) ? 0 : 1, 1);
    CUR = M.METAL; const w = prj(p.a - 1.4, p.b + 1.2, .5), w2 = prj(p.a + 1.4, p.b + 1.2, .5);
    fput(Math.round(w[0]), Math.round(w[1]), 0); fput(Math.round(w2[0]), Math.round(w2[1]), 0);
    return;
  }
  if (p.kind === 'journaux'){
    CUR = M.CCP;
    boxS(p.a - 2, p.a + 2, p.b - 1.5, p.b + 1.5, 0, 4, (u, h) => (h > 1.5 && h < 3.2) ? ((Math.floor(u * 2) & 1) ? 1 : 3) : 0, 1);
    return;
  }
  // haut-parleur de propagande, qui vibre quand Radio Miaou-Scou parle
  CUR = M.METAL;
  for (let k = 0; k < 15; k++) fput(x, y - k, 1);
  for (const s of [-1, 1]){ fput(x + s, y - 15, 1); fput(x + s * 2, y - 16, 1); fput(x + s * 2, y - 15, 1); fput(x + s * 3, y - 17, 1); fput(x + s * 3, y - 14, 1); fput(x + s * 3, y - 16, 0); fput(x + s * 3, y - 15, 0); }
  if (radioSide === 'ccp' && Math.floor(t * 3) % 2 === 0){
    CUR = M.SIGN_CCP;
    for (const s of [-1, 1]) for (let k = 0; k < 3; k++){ fput(x + s * 5, y - 17 + k, 1); fput(x + s * 7, y - 18 + k * 2, 1); }
  }
}
