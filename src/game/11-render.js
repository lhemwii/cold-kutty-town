/* ================= palette de la version couleur : pour chaque matiere, teinte sombre puis claire ================= */
// palette de jour, couleurs realistes : pour chaque matiere, teinte de base puis teinte claire (bordures, reflets)
const PAL_HEX = [
  ['#1d5c96', '#dff3ff'], ['#5b9a3b', '#86c05f'], ['#e6cf96', '#f6ebc9'], ['#56595f', '#f2efe4'], ['#c7c3b8', '#e6e2d8'],
  ['#b8a88c', '#d6c9ae'], ['#6f6b66', '#a19c95'], ['#7b5231', '#b08254'], ['#ffe45c', '#ffe45c'], ['#ffcf6b', '#ffd98a'],
  ['#8fb8d8', '#fbfaf5'], ['#a9a7a0', '#e4e1d8'], ['#5d6470', '#7d8591'], ['#8e4a37', '#b06a52'], ['#2e4a63', '#9fcbe8'],
  ['#c62f2f', '#fff7e6'], ['#b3202a', '#ffd23f'], ['#a6a49b', '#d2cfc6'], ['#2a2622', '#faf6ee'], ['#3a220f', '#ec9540'],
  ['#3c7a2e', '#6aaa48'], ['#40444b', '#cdd0d6'], ['#2fa89b', '#f4f4f0'], ['#a89b72', '#e8e2cf'], ['#c8283a', '#fbf7ef'],
  ['#2a45a6', '#fbf7ef'], ['#ffd23f', '#d42a2a'], ['#46b6d4', '#ffffff'], ['#fff2b0', '#fff7d1'], ['#6e5a36', '#c9a760'],
  ['#9aa0a8', '#e8eaee'], ['#9aa3ad', '#ffffff'], ['#3a8fd6', '#cdefff'], ['#d23a3a', '#fbf3e3'], ['#8a909b', '#fafafa'],
  ['#2e2016', '#f0e2c8'], ['#6c7078', '#f4f6fa'], ['#24262b', '#a4abb5'], ['#0f0f12', '#4d4b59'], ['#8a1c1c', '#ff4040'],
  ['#9fd6c2', '#fbfaf5'], ['#efb3b8', '#fbfaf5'], ['#f0d68a', '#fbfaf5'], ['#e9e4d6', '#ffffff'], ['#c9b99a', '#ece3cf'],
  ['#d9bf7a', '#f1e4c0'], ['#9c4a36', '#d9a48f'], ['#d8c49a', '#f4ead2'], ['#2677b5', '#e3f5ff'], ['#3fa9cc', '#e9f8ff'],
  ['#8b3f2f', '#a8594a'], ['#3f6b52', '#5a8a6e'], ['#b5a98f', '#d9cfb8'], ['#c9ced6', '#ffffff'],
  ['#4d5a32', '#7e8c55'], ['#c9a13b', '#e9cf73'], ['#b8860b', '#ffd766'], ['#2e8b57', '#f2efe6'], ['#2a5cb8', '#f2efe6'],
  ['#b9b6ad', '#d9d6cd'], ['#d9a21e', '#fff0b3'], ['#3f8f3a', '#5fb152'], ['#b87a4b', '#d9a577'],
  ['#574d44', '#cfcac2'], ['#9db3c7', '#dbe8f3'], ['#dde5ee', '#ffffff'], ['#3d5a4b', '#8fb39d'], ['#9e2a2b', '#efe3c8'],
  ['#2a5cb8', '#8fb8ff'], ['#2e8b57', '#8dffa0'], ['#2a2622', '#fffaf0'], ['#8a1c1c', '#ff4a5a'], ['#8a6a10', '#ffd23f'], ['#1d3f66', '#ffcf6b'], ['#2b2d33', '#9aa0aa']
];
// la nuit, les lumieres gardent leur eclat
const NIGHT_LIGHT = { [M.RAIN]: '#6f86a3', [M.SNOW]: '#c9d4e2', [M.WIN]: '#ffd46b', [M.SIGN]: '#ff6fae', [M.SIGN_CCP]: '#ffd23f', [M.GLOW]: '#ffbe55', [M.BEAM]: '#fff1a8', [M.LAMP]: '#ffe7a3', [M.REDLIGHT]: '#ff3b3b', [M.FW_BLUE]: '#8fb8ff', [M.FW_GREEN]: '#8dffa0', [M.BUBBLE]: '#fff3d9', [M.ICON_R]: '#ff5a64', [M.ICON_Y]: '#ffd23f', [M.REFLECT]: '#e9b35a' };
const LEVEL_F = [1, .9, .79, .67, .6];
const hex32 = (h) => { const n = parseInt(h.slice(1), 16); return (0xFF000000 | ((n & 255) << 16) | (n & 0xFF00) | ((n >> 16) & 255)) >>> 0; };
const rgb32 = (r, g, b) => (0xFF000000 | (clamp(Math.round(b), 0, 255) << 16) | (clamp(Math.round(g), 0, 255) << 8) | clamp(Math.round(r), 0, 255)) >>> 0;
const PALL = new Uint32Array(PAL_HEX.length * 2 * 5), PAL32 = new Uint32Array(PAL_HEX.length * 2);
// melange jour / nuit : n = 0 plein jour, 1 pleine nuit ; warm = teinte orangee de l'aube et du couchant
const HEXRGB = PAL_HEX.map(pr => pr.map(h => { const v = parseInt(h.slice(1), 16); return [v >> 16, (v >> 8) & 255, v & 255]; }));
const GLOWRGB = {}; for (const k in NIGHT_LIGHT){ const v = parseInt(NIGHT_LIGHT[k].slice(1), 16); GLOWRGB[k] = [v >> 16, (v >> 8) & 255, v & 255]; }
let palKey = '';
// saisons : teintes de remplacement pour quelques matieres (arbres, herbe, champs)
let SEAS = {}, SEAS_KEY = '';
// meteo sur la palette : ciel couvert, brouillard, neige qui recouvre le sol et les toits
const WX = { over: 0, fog: 0, snow: 0 };
const SNOWY = {}; [[M.GRASS, .9], [M.TREE, .55], [M.BEACH, .6], [M.FIELD, .85], [M.WHEAT, .8], [M.DIRT, .8], [M.GRAVEL, .7], [M.ROOF_USC, .85], [M.ROOF_CCP, .85], [M.ROOF_USC2, .85], [M.ROOF_USC3, .85], [M.ROCK, .5], [M.RAIL, .45], [M.ROAD, .22], [M.WALK, .6], [M.CONCRETE, .5], [M.STRIP, .6]].forEach(([m, k]) => { if (m != null) SNOWY[m] = k; });
function makeColors(n, warm){
  if (typeof n === 'boolean') n = n ? 1 : 0;
  warm = warm || 0;
  const key = Math.round(n * 64) + ':' + Math.round(warm * 32) + ':' + Math.round(WX.over * 20) + ':' + Math.round(WX.fog * 20) + ':' + Math.round(WX.snow * 20) + SEAS_KEY;
  if (key === palKey) return; palKey = key;
  const wr = 1 + .04 * warm * (1 - WX.over), wg = 1 - .16 * warm * (1 - WX.over), wb = 1 - .34 * warm * (1 - WX.over);
  const fogC = [206 - 160 * n, 211 - 160 * n, 216 - 150 * n];
  for (let m = 0; m < HEXRGB.length; m++) for (let bit = 0; bit < 2; bit++){
    let [r, g, b] = (SEAS[m] || HEXRGB[m])[bit]; const glow = bit === 1 ? GLOWRGB[m] : null;
    const sk = (SNOWY[m] || 0) * WX.snow * (bit ? 1 : .85);
    if (sk > 0){ r += (240 - r) * sk; g += (245 - g) * sk; b += (250 - b) * sk; }
    for (let lv = 0; lv < 5; lv++){
      const f = LEVEL_F[lv];
      let dr = r * f, dg = g * f, db = b * f;
      if (lv === 4){ dr *= .9; dg *= .96; db = db * 1.1 + 10; }
      if (WX.over > 0){ const l = (dr * .3 + dg * .55 + db * .15), o = WX.over * .45; dr += (l - dr) * o; dg += (l - dg) * o; db += (l * 1.04 - db) * o; const k = 1 - .22 * WX.over; dr *= k; dg *= k; db *= k; }
      let nr = dr * .24 + 2, ng = dg * .28 + 4, nb = db * .4 + 12;
      if (glow){ nr = glow[0]; ng = glow[1]; nb = glow[2]; }
      let R = dr + (nr - dr) * n, G = dg + (ng - dg) * n, B = db + (nb - db) * n;
      if (!glow || n < .5){ R *= wr; G *= wg; B *= wb; }
      if (WX.fog > 0 && !(glow && n > .5)){ const k = WX.fog * .5; R += (fogC[0] - R) * k; G += (fogC[1] - G) * k; B += (fogC[2] - B) * k; }
      PALL[(m * 2 + bit) * 5 + lv] = rgb32(R, G, B);
    }
    PAL32[m * 2 + bit] = PALL[(m * 2 + bit) * 5];
  }
}
makeColors(0, 0);
/* ================= horloge du jour ================= */
const CLOCK = { h: 10.5, auto: true, speed: 1, len: 180 };
function nightOf(h){
  if (h >= 7.5 && h < 18.5) return 0;
  if (h >= 18.5 && h < 20.5) return (h - 18.5) / 2;
  if (h >= 5.5 && h < 7.5) return 1 - (h - 5.5) / 2;
  return 1;
}
function warmOf(h){ const d = Math.min(Math.abs(h - 6.8), Math.abs(h - 19.2)); return clamp(1 - d / 1.6, 0, 1); }
let NIGHT = 0;
function stepClock(dt){
  if (CLOCK.auto) CLOCK.h = (CLOCK.h + dt * 24 / CLOCK.len * CLOCK.speed) % 24;
  NIGHT = COLOR ? nightOf(CLOCK.h) : 1;
  DAY = NIGHT < .5;
  if (COLOR) makeColors(NIGHT, warmOf(CLOCK.h));
}

/* ================= meteo : soleil, pluie, neige, brouillard ================= */
const WEATHER = { mode: 'auto', kind: 'clair', k: 0, shown: 'clair', next: 40, changed: null };
const WX_KINDS = ['clair', 'pluie', 'neige', 'brouillard'];
function stepWeather(dt, t){
  if (!COLOR) return;
  if (WEATHER.mode === 'auto'){
    if (t > WEATHER.next){
      const r = Math.random(), prev = WEATHER.kind;
      const se = seasonOf(CAL.m);
      WEATHER.kind = prev !== 'clair' ? 'clair' : se === 'hiver' ? (r < .6 ? 'neige' : r < .8 ? 'brouillard' : 'pluie') : se === 'été' ? (r < .75 ? 'pluie' : 'brouillard') : se === 'printemps' ? (r < .7 ? 'pluie' : r < .9 ? 'brouillard' : 'neige') : (r < .55 ? 'pluie' : r < .85 ? 'brouillard' : 'neige');
      WEATHER.next = t + (WEATHER.kind === 'clair' ? 100 + Math.random() * 120 : 60 + Math.random() * 60);
      if (WEATHER.kind !== prev) WEATHER.changed = WEATHER.kind;
    }
  } else if (WEATHER.kind !== WEATHER.mode){ WEATHER.kind = WEATHER.mode; WEATHER.changed = WEATHER.kind; }
  // fondu : on eteint l'ancienne meteo avant d'allumer la nouvelle
  if (WEATHER.shown !== WEATHER.kind && WEATHER.shown !== 'clair'){ WEATHER.k = Math.max(0, WEATHER.k - dt * .5); if (WEATHER.k === 0) WEATHER.shown = WEATHER.kind; }
  else { WEATHER.shown = WEATHER.kind; WEATHER.k += ((WEATHER.kind === 'clair' ? 0 : 1) - WEATHER.k) * Math.min(1, dt * .5); }
  const k = WEATHER.k, sh = WEATHER.shown;
  WX.over = sh === 'pluie' ? k : sh === 'neige' ? k * .55 : sh === 'brouillard' ? k * .3 : 0;
  WX.fog = sh === 'brouillard' ? k : sh === 'neige' ? k * .15 : 0;
  WX.snow = sh === 'neige' ? Math.min(1, WX.snow + dt * .04) : Math.max(0, WX.snow - dt * .025);
}
function drawWeather(t){
  if (!COLOR || WEATHER.k < .05) return;
  const sh = WEATHER.shown, k = WEATHER.k;
  if (sh === 'pluie'){
    CUR = M.RAIN;
    const n = Math.floor(W * H / 170 * k), sp = 260;
    for (let i = 0; i < n; i++){
      const x0 = hash2(i, 3) * (W + 40), y0 = hash2(i, 7) * (H + 40), ph = hash2(i, 11);
      const y = ((y0 + (t + ph * 3) * sp - TY * .0) % (H + 40)) - 20, x = ((x0 - (t + ph * 3) * sp * .18 + TX) % (W + 40) + W + 40) % (W + 40) - 20;
      const xi = Math.round(x), yi = Math.round(y);
      fput(xi, yi, 1); fput(xi, yi + 1, 1); fput(xi - 1, yi + 2, 0); fput(xi - 1, yi + 3, 1);
    }
  } else if (sh === 'neige'){
    CUR = M.SNOW;
    const n = Math.floor(W * H / 240 * k);
    for (let i = 0; i < n; i++){
      const x0 = hash2(i, 5) * (W + 20), y0 = hash2(i, 9) * (H + 20), ph = hash2(i, 13) * TAU, sp = 14 + hash2(i, 17) * 16;
      const y = ((y0 + t * sp) % (H + 20)) - 10, x = ((x0 + Math.sin(t * .9 + ph) * 4 + TX) % (W + 20) + W + 20) % (W + 20) - 10;
      const xi = Math.round(x), yi = Math.round(y);
      fput(xi, yi, 1); if (hash2(i, 21) < .35){ fput(xi + 1, yi, 1); fput(xi, yi + 1, 0); }
    }
  }
}

/* ================= ecran, zoom ================= */
const scene = document.getElementById('scene');
ctx = scene.getContext('2d', { alpha: false });
let devW = 0, devH = 0;
// Z : zoom affiche (pixels de l'ecran par pixel du jeu), continu et anime.
// K : echelle entiere de rendu. En dessous de KMIN, on affiche une vue d'ensemble mise en cache.
let Z = 2, ZT = 2, ZANCH = null, ZLEVELS = [], OV_ON = false, OV_RENDERING = false;
const renderK = (z) => Math.max(KMIN, Math.floor(z + 1e-6));
function applyK(){
  W = Math.ceil(devW / K); H = Math.ceil(devH / K);
  N = W * H;
  img = ctx.createImageData(W, H);
  px32 = new Uint32Array(img.data.buffer);
  fb = new Uint8Array(N); mb = new Uint8Array(N); lb = new Uint8Array(N);
  setProj();
  applyView(true);
}
// taille et position du canvas a l'ecran
function applyView(force){
  const ov = Z < KMIN - 1e-6;
  if (ov !== OV_ON || force){
    OV_ON = ov;
    if (ov){ scene.width = devW; scene.height = devH; }
    else { scene.width = W; scene.height = H; }
    scene.classList.toggle('overview', ov);
  }
  if (OV_ON){ scene.style.width = window.innerWidth + 'px'; scene.style.height = window.innerHeight + 'px'; scene.style.left = '0px'; scene.style.top = '0px'; }
  else {
    const cw = W * Z / DPR, ch = H * Z / DPR;
    scene.style.width = cw + 'px'; scene.style.height = ch + 'px';
    scene.style.left = ((window.innerWidth - cw) / 2) + 'px'; scene.style.top = ((window.innerHeight - ch) / 2) + 'px';
  }
  if (typeof updateZoomUI === 'function') updateZoomUI();
}
function layout(){
  DPR = window.devicePixelRatio || 1;
  devW = Math.max(1, Math.round(window.innerWidth * DPR)); devH = Math.max(1, Math.round(window.innerHeight * DPR));
  const rel = Z && KDEF ? Z / KDEF : 1;
  KDEF = Math.max(2, Math.round(Math.min(devW, devH) / 290));
  KMIN = Math.min(KDEF, Math.max(1, Math.ceil(Math.sqrt(devW * devH / 1.4e6))));
  KMAX = KDEF * 4;
  ZLEVELS = [KMIN * .25, KMIN * .35, KMIN * .5, KMIN * .7];
  for (let k = KMIN; k <= KMAX; k = Math.max(k + 1, Math.round(k * 1.2))) ZLEVELS.push(k);
  if (ZLEVELS[ZLEVELS.length - 1] !== KMAX) ZLEVELS.push(KMAX);
  if (!ZLEVELS.includes(KDEF)){ ZLEVELS.push(KDEF); ZLEVELS.sort((x, y) => x - y); }
  Z = ZT = clamp(KDEF * rel, ZLEVELS[0], KMAX);
  K = renderK(Z);
  applyK();
  OV.key = '';
}
const ZMIN = () => ZLEVELS[0];
function clampCam(){ cam.a = clamp(cam.a, IS.ca - IS.ra - 60, IS.ca + IS.ra + 60); cam.b = clamp(cam.b, LH.b - 30, IS.cb + IS.rb + 50); }
// point du sol sous un point de l'ecran (coordonnees CSS)
function screenToWorld(cx, cy, z){
  const dx = (cx - window.innerWidth / 2) * DPR / (z || Z), dy = (cy - window.innerHeight / 2) * DPR / (z || Z);
  const g = groundDelta(dx, dy); return [cam.a + g[0], cam.b + g[1]];
}
function setZNow(nz){
  const ax = ZANCH ? ZANCH[0] : window.innerWidth / 2, ay = ZANCH ? ZANCH[1] : window.innerHeight / 2;
  PC = Math.cos(cam.phi); PS = Math.sin(cam.phi);
  const g = screenToWorld(ax, ay);
  Z = nz;
  const g2 = screenToWorld(ax, ay);
  cam.a += g[0] - g2[0]; cam.b += g[1] - g2[1]; clampCam();
  const nk = renderK(Z); if (nk !== K){ K = nk; applyK(); } else { setProj(); applyView(); }
}
function stepZoom(dt){
  if (Z === ZT) return;
  const lz = Math.log(Z), lt = Math.log(ZT);
  let nl = lz + (lt - lz) * Math.min(1, dt * 10);
  if (Math.abs(nl - lt) < .003) nl = lt;
  setZNow(nl === lt ? ZT : Math.exp(nl));
}
// palier suivant ou precedent a partir de la cible actuelle
function zoomStep(dir, ax, ay){
  const cur = ZT;
  let nz = cur;
  if (dir > 0){ for (const l of ZLEVELS) if (l > cur + 1e-6){ nz = l; break; } }
  else { for (let i = ZLEVELS.length - 1; i >= 0; i--) if (ZLEVELS[i] < cur - 1e-6){ nz = ZLEVELS[i]; break; } }
  return setZoom(nz, ax, ay);
}
function setZoom(nz, ax, ay, instant){
  nz = clamp(nz, ZMIN(), KMAX);
  ZANCH = ax == null ? null : [ax, ay];
  if (Math.abs(nz - ZT) < 1e-6 && !instant) return false;
  ZT = nz;
  if (instant) setZNow(nz);
  return true;
}
function snapZoom(){ let best = ZLEVELS[0]; for (const l of ZLEVELS) if (Math.abs(Math.log(l / ZT)) < Math.abs(Math.log(best / ZT))) best = l; setZoom(best, ZANCH ? ZANCH[0] : null, ZANCH ? ZANCH[1] : null); }
function centerOn(a, b){ cam.a = a; cam.b = b; clampCam(); setProj(); }

/* ================= vue d'ensemble : toute l'ile rendue une fois, puis reduite ================= */
const OV = { canvas: null, ctx: null, img: null, px: null, fb: null, mb: null, lb: null, W: 0, H: 0, key: '', TX: 0, TY: 0, busy: 0 };
function overviewKey(t){ return [cam.phi.toFixed(3), TOWN_VER, Math.round(NIGHT * 10), Math.round(WX.over * 5), Math.round(WX.fog * 5), Math.round(WX.snow * 5), Math.floor(t / 8)].join('|'); }
function renderOverview(t){
  PC = Math.cos(cam.phi); PS = Math.sin(cam.phi);
  const A0 = IS.ca - IS.ra * 1.12, A1 = IS.ca + IS.ra * 1.12, B0 = LH.b - 30, B1 = IS.cb + IS.rb * 1.14;
  let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
  for (const [a, b] of [[A0, B0], [A1, B0], [A1, B1], [A0, B1]]){ const ar = a * PC - b * PS, br = a * PS + b * PC, x = ar - br, y = (ar + br) * .5; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  const w = Math.ceil(x1 - x0) + 4, h = Math.ceil(y1 - y0) + 176;
  if (w !== OV.W || h !== OV.H || !OV.canvas){
    OV.canvas = OV.canvas || document.createElement('canvas');
    OV.canvas.width = w; OV.canvas.height = h; OV.ctx = OV.canvas.getContext('2d', { alpha: false });
    OV.img = OV.ctx.createImageData(w, h); OV.px = new Uint32Array(OV.img.data.buffer);
    OV.fb = new Uint8Array(w * h); OV.mb = new Uint8Array(w * h); OV.lb = new Uint8Array(w * h);
    OV.W = w; OV.H = h;
  }
  const sv = [W, H, N, fb, mb, lb, img, px32, ctx];
  W = w; H = h; N = w * h; fb = OV.fb; mb = OV.mb; lb = OV.lb; img = OV.img; px32 = OV.px; ctx = OV.ctx;
  PROJ_FIX = [Math.round(-x0 + 2), Math.round(-y0 + 172)];
  OV_RENDERING = true;
  try { render(t); } finally {
    OV_RENDERING = false;
    OV.TX = PROJ_FIX[0]; OV.TY = PROJ_FIX[1]; PROJ_FIX = null;
    [W, H, N, fb, mb, lb, img, px32, ctx] = sv;
    setProj();
  }
}
function drawOverview(t){
  const nowMs = performance.now();
  if (cam.phi !== OV.lastPhi){ OV.lastPhi = cam.phi; OV.phiMs = nowMs; }
  // pendant une rotation, on deforme l'image en cache au lieu de tout recalculer
  const rotating = OV.canvas && nowMs - (OV.phiMs || 0) < 260;
  const key = overviewKey(t);
  if (!rotating && key !== OV.key){ renderOverview(t); OV.key = key; OV.phi = cam.phi; }
  const c = ctx;
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high';
  const sea = PALL[(M.SEA * 2) * 5];
  c.fillStyle = 'rgb(' + (sea & 255) + ',' + ((sea >> 8) & 255) + ',' + ((sea >> 16) & 255) + ')';
  c.fillRect(0, 0, devW, devH);
  const po = OV.phi == null ? cam.phi : OV.phi, pc = Math.cos(po), ps = Math.sin(po);
  const car = cam.a * pc - cam.b * ps, cbr = cam.a * ps + cam.b * pc;
  const cx = OV.TX + (car - cbr), cy = OV.TY + (car + cbr) * .5, s = Z;
  const d = cam.phi - po, dc = Math.cos(d), ds = Math.sin(d);
  const A11 = dc * s, A12 = -2 * ds * s, A21 = .5 * ds * s, A22 = dc * s;
  c.setTransform(A11, A21, A12, A22, devW / 2 - (A11 * cx + A12 * cy), devH / 2 - (A21 * cx + A22 * cy));
  c.drawImage(OV.canvas, 0, 0);
  c.setTransform(1, 0, 0, 1, 0, 0);
}

/* ================= sol, mer, faisceau du phare ================= */
function beamTan(){
  const e = state.spread;
  if (e <= 0) return .082;
  const s = e * e * (3 - 2 * e), h0 = Math.atan(.082), hw = h0 + (Math.PI / 2 - h0) * s;
  return hw >= Math.PI / 2 - 1e-4 ? Infinity : Math.tan(hw);
}
const PTAB = new Uint8Array(16);
function renderGround(t){
  const I = state.intensity, pat = state.pattern, noise = pat === 'noise';
  for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) PTAB[y * 4 + x] = litAt(x, y, pat, I) ? 1 : 0;
  const bc = Math.cos(state.theta), bs = Math.sin(state.theta), tn = beamTan(), all = tn === Infinity;
  const tick = Math.floor(t * 5), ring = (t * 1.1);
  const dax = .5 * PC - .5 * PS, dbx = -.5 * PS - .5 * PC, day = PC + PS, dby = PC - PS;
  const o = unprj(.5, .5);
  const F = fb, MB = mb, LBF = lb, GV = gVar, GS = gSea, GT = gTone, GTY = gType, GP = gPh, TM = TYPE_MAT, BY = BAYER, PT = PTAB;
  const w = W, h = H, tx = TX, ty = TY, gw = GW, gh = GH, ga0 = GA0, gb0 = GB0;
  const LA = LH.a, LB = LH.b, MF = M.FOAM, MBm = M.BEAM, MS = M.SEA, beamOn = !COLOR || NIGHT > .55;
  const shF = GAME.mode === 'deb' && !DEB.wall, fU = (DEB.front.usc - GA0) * 2, fC = (DEB.front.ccp - GA0) * 2;
  // faisceau : on travaille directement en coordonnees de cellules
  let i = 0;
  for (let y = 0; y < h; y++){
    let a = o[0] + y * day, b = o[1] + y * dby;
    const ry = ((y - ty) & 3) << 2;
    let fa = (a - ga0) * 2, fbb = (b - gb0) * 2;
    const dfa = dax * 2, dfb = dbx * 2;
    let la = a - LA, lb = b - LB;
    for (let x = 0; x < w; x++, i++){
      let tone = 0, ci = -1, m = MS, lv = 0;
      if (fa >= 0 && fbb >= 0 && fa < gw && fbb < gh){ ci = (fbb | 0) * gw + (fa | 0); tone = GT[ci]; if (COLOR){ const ty2 = GTY[ci]; m = ty2 === 0 ? (GS[ci] < 16 ? M.SEA_SHALLOW : GS[ci] < 50 ? M.SEA_MID : MS) : TM[ty2]; if (ty2 === 1) lv = GV[((fbb | 0) >> 2) * GQW + ((fa | 0) >> 2)]; if (shF && ty2 !== 0 && fa > fU && fa < fC) lv = 2; } }
      let v = 0;
      if (tone !== 0){
        if (tone >= 32){
          m = MF;
          const d = tone - 32, ia = fa | 0, ib = fbb | 0;
          if (d <= 2) v = hash2((ia >> 2) + tick * 3, ib >> 1) < .6 ? 1 : 0;
          else if (d <= 4) v = hash2(ia * 5 + tick, ib * 3) < .12 ? 1 : 0;
          else { const r = 5.2 - ((ring + GP[(ib >> 2) * GQW + (ia >> 2)] / 15) % 3.6), q = d * .5 - r; v = (q < .35 && q > -.35 && hash2((ia >> 1) + tick, ib * 7) < .45) ? 1 : 0; }
        } else if (tone >= 16) v = 1;
        else v = BY[ry | ((x - tx) & 3)] < tone ? 1 : 0;
      }
      if (v === 0 && beamOn){
        const al = la * bc + lb * bs, pe = lb * bc - la * bs;
        if (all || (pe < 0 ? -pe : pe) <= (al < 0 ? -al : al) * tn + 1.2){
          v = noise ? (hash2((x - tx) * 7 + 1013, (y - ty) * 13 + 7) < I ? 1 : 0) : PT[ry | ((x - tx) & 3)];
          if (v) m = MBm;
        }
      }
      F[i] = v; if (COLOR){ MB[i] = m; LBF[i] = lv; }
      fa += dfa; fbb += dfb; la += dax; lb += dbx;
    }
  }
}
// vue tres dezoomee : un echantillon de sol pour 2 x 2 pixels, le tramage reste au pixel pres
function renderGroundFast(t){
  const I = state.intensity, pat = state.pattern, noise = pat === 'noise';
  for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) PTAB[y * 4 + x] = litAt(x, y, pat, I) ? 1 : 0;
  const bc = Math.cos(state.theta), bs = Math.sin(state.theta), tn = beamTan(), all = tn === Infinity;
  const tick = Math.floor(t * 5), ring = (t * 1.1);
  const dax = .5 * PC - .5 * PS, dbx = -.5 * PS - .5 * PC, day = PC + PS, dby = PC - PS;
  const o = unprj(1, 1);
  const F = fb, MB = mb, LBUF = lb, GT = gTone, GTY = gType, GP = gPh, TM = TYPE_MAT, BY = BAYER, PT = PTAB;
  const w = W, h = H, tx = TX, ty = TY, gw = GW, gh = GH, ga0 = GA0, gb0 = GB0;
  const shF = GAME.mode === 'deb' && !DEB.wall, fU = (DEB.front.usc - GA0) * 2, fC = (DEB.front.ccp - GA0) * 2;
  const LA = LH.a, LB = LH.b, beamOn = !COLOR || NIGHT > .55, gV = gVar, gS = gSea, qw = GQW, MSS = M.SEA_SHALLOW, MSM = M.SEA_MID, MSE = M.SEA, MFO = M.FOAM;
  for (let y = 0; y < h; y += 2){
    let a = o[0] + y * day, b = o[1] + y * dby;
    for (let x = 0; x < w; x += 2, a += dax * 2, b += dbx * 2){
      const fa = (a - ga0) * 2, fbb = (b - gb0) * 2;
      let tone = 0, m = MSE, fo = -1, lv = 0;
      if (fa >= 0 && fbb >= 0 && fa < gw && fbb < gh){
        const ci = (fbb | 0) * gw + (fa | 0); tone = GT[ci];
        if (COLOR){ const ty2 = GTY[ci]; if (ty2 === 0){ const sd = gS[ci]; m = sd < 16 ? MSS : sd < 50 ? MSM : MSE; } else { m = TM[ty2]; if (ty2 === 1) lv = gV[((fbb | 0) >> 2) * qw + ((fa | 0) >> 2)]; if (shF && fa > fU && fa < fC) lv = 2; } }
        if (tone >= 32){
          m = MFO; const d = tone - 32, ia = fa | 0, ib = fbb | 0;
          if (d <= 2) fo = hash2((ia >> 2) + tick * 3, ib >> 1) < .6 ? 1 : 0;
          else if (d <= 4) fo = hash2(ia * 5 + tick, ib * 3) < .12 ? 1 : 0;
          else { const r = 5.2 - ((ring + GP[(ib >> 2) * GQW + (ia >> 2)] / 15) % 3.6), q = d * .5 - r; fo = (q < .35 && q > -.35 && hash2((ia >> 1) + tick, ib * 7) < .45) ? 1 : 0; }
        }
      }
      let lit = false;
      if (beamOn){ const la = a - LA, lb = b - LB, al = la * bc + lb * bs, pe = lb * bc - la * bs; lit = all || (pe < 0 ? -pe : pe) <= (al < 0 ? -al : al) * tn + 1.2; }
      // cas simples (le plus frequent) : bloc uni sans tramage
      if (!lit && fo < 0 && (tone === 0 || tone >= 16) && x + 1 < w && y + 1 < h){
        const v = tone === 0 ? 0 : 1, i0 = y * w + x, i1 = i0 + w;
        F[i0] = v; F[i0 + 1] = v; F[i1] = v; F[i1 + 1] = v;
        if (COLOR){ MB[i0] = m; MB[i0 + 1] = m; MB[i1] = m; MB[i1 + 1] = m; LBUF[i0] = lv; LBUF[i0 + 1] = lv; LBUF[i1] = lv; LBUF[i1 + 1] = lv; }
        continue;
      }
      for (let dy = 0; dy < 2 && y + dy < h; dy++){
        const ry = ((y + dy - ty) & 3) << 2, row = (y + dy) * w;
        for (let dx = 0; dx < 2 && x + dx < w; dx++){
          const i = row + x + dx, rx = (x + dx - tx) & 3;
          let v = fo >= 0 ? fo : (tone >= 16 ? 1 : (tone > 0 && BY[ry | rx] < tone ? 1 : 0)), mm = m;
          if (!v && lit){ v = noise ? (hash2((x + dx - tx) * 7 + 1013, (y + dy - ty) * 13 + 7) < I ? 1 : 0) : PT[ry | rx]; if (v) mm = M.BEAM; }
          F[i] = v; if (COLOR){ MB[i] = mm; LBUF[i] = lv; }
        }
      }
    }
  }
}
function drawWaves(t){
  const cs = [unprj(0, 0), unprj(W, 0), unprj(0, H), unprj(W, H)];
  let a0 = 1e9, a1 = -1e9, b0 = 1e9, b1 = -1e9;
  for (const [a, b] of cs){ a0 = Math.min(a0, a); a1 = Math.max(a1, a); b0 = Math.min(b0, b); b1 = Math.max(b1, b); }
  const CW = 12;
  CUR = M.FOAM;
  for (let j = Math.floor(b0 / CW) - 1; j <= Math.floor(b1 / CW) + 1; j++) for (let i = Math.floor(a0 / CW) - 1; i <= Math.floor(a1 / CW) + 1; i++){
    if (hash2(i * 3 + 1, j * 7 + 2) < 0.2) continue;
    const ga = i * CW + hash2(i + 11, j - 5) * CW, gb = j * CW + hash2(i - 7, j + 13) * CW;
    const ci = cellOf(ga, gb);
    if (ci >= 0 && (gType[ci] !== T_SEA || gSea[ci] < 14)) continue;
    const ph = hash2(i - 31, j - 17) * TAU, sp = 0.55 + hash2(i + 5, j + 41) * 0.9;
    const amp = Math.sin(t * sp + ph); if (amp < 0.15) continue;
    const Lw = 2 + ((hash2(i + 23, j + 3) * 5) | 0), len = Math.max(1, Math.round(Lw * amp));
    const p = prj(ga, gb, 0), x0 = Math.round(p[0] + Math.sin(t * .35 + ph) * 1.5), y0 = Math.round(p[1]);
    if (x0 < -10 || y0 < -2 || x0 > W + 2 || y0 > H + 2) continue;
    for (let k = 0; k < len; k++) fput(x0 + k, y0, 1);
    if (len >= 3){ fput(x0 - 1, y0 + 1, 1); fput(x0 + len, y0 + 1, 1); }
  }
}

/* ================= lumieres au sol ================= */
let LIGHTS = [];
function gatherLights(t){
  LIGHTS = LIGHTS_STATIC.slice();
  for (const c of CARS) LIGHTS.push(c.light);
  for (const tw of TOWERS){ const sp = towerSpot(tw, t); LIGHTS.push({ kind: 'circle', a: sp[0], b: sp[1], r: 7, k: 1.6, att: .5, m: M.BEAM }); }
}
function applyLights(){
  const I = state.intensity, pat = state.pattern;
  const dax = .5 * PC - .5 * PS, dbx = -.5 * PS - .5 * PC, day = PC + PS, dby = PC - PS;
  for (const Lt of LIGHTS){
    const R = Lt.kind === 'circle' ? Lt.r : Lt.len + Lt.w0 + 2;
    const ca = Lt.kind === 'circle' ? Lt.a : Lt.a + Lt.da * Lt.len * .5, cb = Lt.kind === 'circle' ? Lt.b : Lt.b + Lt.db * Lt.len * .5;
    const rr = Lt.kind === 'circle' ? R : Lt.len * .5 + Lt.len * Lt.tan + Lt.w0 + 2;
    const c = prj(ca, cb, 0), ex = rr * 1.42, ey = rr * .72;
    const x0 = Math.max(0, Math.floor(c[0] - ex)), x1 = Math.min(W - 1, Math.ceil(c[0] + ex));
    const y0 = Math.max(0, Math.floor(c[1] - ey)), y1 = Math.min(H - 1, Math.ceil(c[1] + ey));
    if (x0 > x1 || y0 > y1) continue;
    const Ik = clamp(I * Lt.k * (COLOR ? clamp((NIGHT - .2) * 1.6, 0, 1) : 1), 0, 1), lm = Lt.m == null ? M.GLOW : Lt.m;
    const o = unprj(x0 + .5, y0 + .5);
    for (let sy = y0; sy <= y1; sy++){
      let ga = o[0] + (sy - y0) * day, gb = o[1] + (sy - y0) * dby;
      for (let sx = x0; sx <= x1; sx++, ga += dax, gb += dbx){
        const j = sy * W + sx; if (fb[j]) continue;
        let tt;
        if (Lt.kind === 'circle'){ const da = ga - Lt.a, db = gb - Lt.b, d2 = da * da + db * db; if (d2 > Lt.r * Lt.r) continue; tt = Math.sqrt(d2) / Lt.r; }
        else {
          const la = ga - Lt.a, lb = gb - Lt.b, al = la * Lt.da + lb * Lt.db, pe = lb * Lt.da - la * Lt.db;
          if (al < 0 || al > Lt.len || Math.abs(pe) > al * Lt.tan + Lt.w0) continue; tt = al / Lt.len;
        }
        if (litAt(sx - TX, sy - TY, pat, Ik * (1 - Lt.att * tt))){ fb[j] = 1; mb[j] = lm; if (COLOR) lb[j] = 0; }
      }
    }
  }
}

/* ================= chats sur la carte ================= */
function drawCat(c, t){
  const p = catPos(c, t);
  const q = prj(p.a, p.b, 0), bx = Math.round(q[0]), by = Math.round(q[1]);
  c.screen = [bx, by];
  let f = c.fixed ? (c.face || -1) : 1;
  if (p.moving && !c.fixed){ const sx = (p.da * PC - p.db * PS) - (p.da * PS + p.db * PC); f = sx >= 0 ? 1 : -1; }
  const lit = (bx >= 0 && by >= 0 && bx < W && by < H && fb[by * W + bx] === 1) || c === state.chatCat;
  const fr = p.moving && !c.paused ? (Math.floor(t * 7 + p.a + p.b) & 1) : 2;
  const pix = catPixels(c, fr, f, lit);
  CUR = catMat(c);
  for (const [x, y] of pix) for (const [ox, oy] of [[0,-1],[0,1],[-1,0],[1,0]]) fput(bx + x + ox, by + y + oy, 0);
  for (const [x, y, v] of pix) fput(bx + x, by + y, v);
  if (c === state.chatCat || c === hoverCat){
    const bob = c === state.chatCat ? Math.round(Math.sin(t * 5) * 1.5) : 0;
    const my = by - 12 + bob;
    CUR = M.LAMP;
    for (let k = 0; k < 3; k++) for (let x = -2 + k; x <= 2 - k; x++) fput(bx + x, my + k, 1);
  }
}

/* ================= fantome de construction ================= */
let hoverLot = null, hoverCat = null, ghostKey = '', ghostParts = null;
function updateGhost(){
  const key = hoverLot && state.mode === 'build' && !hoverLot.type && !hoverLot.blocked ? hoverLot.id + state.buildType : '';
  if (key === ghostKey) return;
  ghostKey = key; ghostParts = key ? TYPES[state.buildType].build(hoverLot, 7).parts : null;
}
function drawLotGhost(t){
  if (!hoverLot || state.mode === 'walk') return;
  const l = hoverLot, free = !l.type && !l.blocked, ok = state.mode === 'build' ? free : !free;
  GHOST_T = Math.floor(t * 8);
  const C = [[l.a0, l.b0], [l.a1, l.b0], [l.a1, l.b1], [l.a0, l.b1]];
  CUR = M.BEAM;
  for (let k = 0; k < 4; k++){
    const p = prj(C[k][0], C[k][1], 0), q = prj(C[(k + 1) % 4][0], C[(k + 1) % 4][1], 0);
    if (ok) lineS(p[0], p[1], q[0], q[1], 1, true);
    else { const n = Math.ceil(Math.hypot(q[0] - p[0], q[1] - p[1])); for (let s = 0; s <= n; s += 4) fput(Math.floor(p[0] + (q[0] - p[0]) * s / n), Math.floor(p[1] + (q[1] - p[1]) * s / n), 1); }
  }
  if (state.mode === 'build' && free && ghostParts){
    GHOST = true;
    const list = ghostParts.slice().sort((u, v) => (dep(u.a, u.b) + u.zb) - (dep(v.a, v.b) + v.zb));
    for (const p of list) p.draw(t);
    GHOST = false;
  }
}

/* ================= Spoutchat ================= */
const SAT_PERIOD = 46, SAT_SHOW = 14;
const satVisible = (t) => (t % SAT_PERIOD) < SAT_SHOW;
function drawSatellite(t){
  const p = (t % SAT_PERIOD) / SAT_SHOW; if (p >= 1) return;
  const x = Math.round(-8 + (W + 16) * p), y = Math.round(H * .1 + Math.sin(p * Math.PI) * -H * .04 + 14);
  const on = Math.floor(t * 3) % 2 === 0;
  CUR = M.METAL;
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) fput(x + dx, y + dy, 1);
  for (let k = 2; k <= 5; k++){ fput(x - k, y + k, 1); fput(x + k, y + k, 1); fput(x - k - 1, y + k + 1, k === 5 ? 1 : 0); }
  if (on) for (let k = 0; k < 2; k++){ fput(x + 3 + k * 2, y - 3 - k, 1); fput(x + 4 + k * 2, y - 4 - k, 1); }
}

/* ================= rendu complet ================= */
function render(t){
  const PF = window.__prof, T = [performance.now()];
  setProj();
  if (N > 700000) renderGroundFast(t); else renderGround(t);
  T.push(performance.now());
  if (!OV_RENDERING) drawWaves(t); T.push(performance.now());
  for (const d of DECALS) d(t);
  const dyn = COLOR ? dynamicDrawables(t) : [];
  siteDrawables(t, dyn);
  if (COLOR && NIGHT < .6) drawShadows();
  if (!COLOR || NIGHT > .25){ gatherLights(t); applyLights(); }
  T.push(performance.now());
  const list = [];
  const M = 110;
  for (const p of STATIC_PARTS){
    if (p.lot && p.lot.buildT && t < p.lot.buildT + BUILD_DUR) continue;
    const q = prj(p.a, p.b, 0);
    if (q[0] < -M || q[0] > W + M || q[1] < -30 || q[1] > H + M + 60) continue;
    list.push({ d: dep(p.a, p.b) + p.zb, f: p.draw, m: p.m, side: p.side });
  }
  for (const c of CARS){ const p = c.pos; if (!inFront(p.a)) continue; list.push({ d: dep(p.a, p.b), f: () => drawCar(p.a, p.b, p.axis, p.dir, c.side) }); }
  for (const c of CATS){ if (!catVisible(c)){ c.screen = null; continue; } const p = catPos(c, t); list.push({ d: dep(p.a, p.b) + .2, f: () => drawCat(c, t) }); }
  const sp = sailPos(t); list.push({ d: dep(sp[0], sp[1]), f: drawSailboat });
  for (const o of dyn) list.push(o);
  list.sort((u, v) => u.d - v.d);
  for (const it of list){ CUR = it.m == null ? M.METAL : it.m; CUR_SIDE = it.side || 'usc'; it.f(t); }
  if (!OV_RENDERING) for (const f of HOOKS.top) f(t);
  if (typeof drawRoadPreview === 'function') drawRoadPreview(t);
  T.push(performance.now());
  drawLantern();
  if (!COLOR || NIGHT > .35){ drawLampHeads(); drawGlow(t); }
  drawLotGhost(t);
  if (!OV_RENDERING){ drawSatellite(t); drawWeather(t); }
  T.push(performance.now());
  if (PF){ window.__profAcc = window.__profAcc || [0,0,0,0,0,0]; window.__profN = (window.__profN||0)+1; for (let k = 1; k < T.length; k++) window.__profAcc[k-1] += T[k]-T[k-1]; window.__profOut = { n: window.__profN, parts: list.length, split: window.__profAcc.map(v => +(v / window.__profN).toFixed(2)) }; }
  if (COLOR && !OV_RENDERING) for (const f of HOOKS.post) f(t);
  if (COLOR) for (let i = 0; i < N; i++) px32[i] = PALL[((mb[i] << 1) | fb[i]) * 5 + lb[i]];
  else for (let i = 0; i < N; i++) px32[i] = fb[i] ? WHITE : BLACK;
  ctx.putImageData(img, 0, 0);
}

/* ================= ombres portees (version couleur, de jour) ================= */
let SHADOWS = [];
function hull2(pts){
  pts.sort((p, q) => p[0] - q[0] || p[1] - q[1]);
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], up = [];
  for (const p of pts){ while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
  for (let i = pts.length - 1; i >= 0; i--){ const p = pts[i]; while (up.length >= 2 && cross(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); }
  up.pop(); lo.pop();
  return lo.concat(up);
}
function shadowHull(flat){
  const pts = [];
  for (let i = 0; i < flat.length; i += 3){ const a = flat[i], b = flat[i + 1], z = Math.max(0, flat[i + 2]); pts.push([a, b], [a + z * SHADOW_V[0], b + z * SHADOW_V[1]]); }
  if (pts.length < 3) return null;
  const h = hull2(pts);
  if (h.length < 3 || h.length > 60) return h.length >= 3 ? h.filter((p, i) => i % Math.ceil(h.length / 60) === 0) : null;
  let a0 = 1e9, a1 = -1e9, b0 = 1e9, b1 = -1e9;
  for (const [a, b] of h){ a0 = Math.min(a0, a); a1 = Math.max(a1, a); b0 = Math.min(b0, b); b1 = Math.max(b1, b); }
  h.box = [(a0 + a1) / 2, (b0 + b1) / 2, Math.hypot(a1 - a0, b1 - b0) / 2];
  return h;
}
const circ = (a, b, r, z, n) => { const out = []; n = n || 10; for (let k = 0; k < n; k++){ const t = k * TAU / n; out.push(a + Math.cos(t) * r, b + Math.sin(t) * r, z); } return out; };
const SX = new Float64Array(64), SY = new Float64Array(64);
function drawShadows(){
  const M2 = 60;
  for (const h of SHADOWS.concat(DYN_SHADOWS)){
    if (h.box){ const c = prj(h.box[0], h.box[1], 0), r = h.box[2] * 1.5 + 4; if (c[0] + r < -M2 || c[0] - r > W + M2 || c[1] + r < -M2 || c[1] - r > H + M2) continue; }
    const n = Math.min(64, h.length);
    for (let i = 0; i < n; i++){ const p = prj(h[i][0], h[i][1], 0); SX[i] = p[0]; SY[i] = p[1]; }
    let y0 = 1e9, y1 = -1e9;
    for (let i = 0; i < n; i++){ if (SY[i] < y0) y0 = SY[i]; if (SY[i] > y1) y1 = SY[i]; }
    const ya = Math.max(0, Math.ceil(y0 - .5)), yb = Math.min(H - 1, Math.floor(y1 - .5));
    for (let y = ya; y <= yb; y++){
      const yc = y + .5; let xl = 1e9, xr = -1e9;
      for (let i = 0, j = n - 1; i < n; j = i++){ const yi = SY[i], yj = SY[j]; if ((yi <= yc && yj > yc) || (yj <= yc && yi > yc)){ const x = SX[i] + (yc - yi) * (SX[j] - SX[i]) / (yj - yi); if (x < xl) xl = x; if (x > xr) xr = x; } }
      if (xl > xr) continue;
      const xa = Math.max(0, Math.ceil(xl - .5)), xb = Math.min(W - 1, Math.floor(xr - .5)), row = y * W;
      for (let x = xa; x <= xb; x++) lb[row + x] = 4;
    }
  }
}
