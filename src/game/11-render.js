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
  ['#2a5cb8', '#8fb8ff'], ['#2e8b57', '#8dffa0'], ['#2a2622', '#fffaf0'], ['#8a1c1c', '#ff4a5a'], ['#8a6a10', '#ffd23f'], ['#1d3f66', '#ffcf6b'], ['#2b2d33', '#9aa0aa'],
  ['#467f38', '#5e9a48'], ['#e2ddd0', '#ffffff'], ['#7f98a8', '#dfe8ee']
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
const SNOWY = {}; [[M.FOREST, .8], [M.GRASS, .9], [M.TREE, .55], [M.BEACH, .6], [M.FIELD, .85], [M.WHEAT, .8], [M.DIRT, .8], [M.GRAVEL, .7], [M.ROOF_USC, .85], [M.ROOF_CCP, .85], [M.ROOF_USC2, .85], [M.ROOF_USC3, .85], [M.ROCK, .5], [M.RAIL, .45], [M.ROAD, .22], [M.WALK, .6], [M.CONCRETE, .5], [M.STRIP, .6]].forEach(([m, k]) => { if (m != null) SNOWY[m] = k; });
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
  tintPalettes(n);
}
// territoires : le sol prend une teinte bleue ou rouge, la frontiere est tracee en couleur franche
// PALX[k * PL + i] : k = 0 neutre, 1 USC, 2 CCR, 3 frontiere USC, 4 frontiere CCR
const PL = PAL_HEX.length * 2 * 5, PALX = new Uint32Array(PL * 5);
const TINT_MATS = [M.GRASS, M.FOREST, M.BEACH, M.ROCK, M.DIRT, M.FIELD, M.WHEAT, M.GRAVEL, M.SNOW];
const TINT = [null, [52, 104, 236, .24], [226, 52, 52, .22], [64, 132, 255, .82], [255, 70, 64, .82]];
function tintPalettes(n){
  PALX.set(PALL, 0);
  for (let k = 1; k < 5; k++){
    PALX.set(PALL, k * PL);
    const [tr, tg, tb, f0] = TINT[k], f = k >= 3 ? f0 * (1 - n * .25) : f0 * (1 - n * .35), lift = k >= 3 ? 1 + n * .9 : 1;
    for (const m of TINT_MATS) for (let j = 0; j < 10; j++){
      const i = m * 10 + j, c = PALL[i], r = c & 255, g = (c >> 8) & 255, b = (c >> 16) & 255;
      PALX[k * PL + i] = rgb32(r + (tr * lift - r) * f, g + (tg * lift - g) * f, b + (tb * lift - b) * f);
    }
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
  // de loin, les gouttes et les flocons feraient de gros pixels devant la vue : ils s'estompent en dezoomant (la teinte du ciel reste)
  const fk = SC >= .999 ? 1 : clamp((SC - .55) / .4, 0, 1); if (fk <= 0) return;
  const sh = WEATHER.shown, k = WEATHER.k * fk;
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
let devW = 0, devH = 0, ob = null;
// Z : zoom affiche (pixels de l'ecran par pixel du jeu), continu et anime.
// K : echelle entiere de rendu. En dessous de KMIN, on passe sur la vue de loin (OV_ON) : meme tampon, monde dessine en petit.
let Z = 2, ZT = 2, ZANCH = null, ZLEVELS = [], OV_ON = false;
// budget de pixels du rendu detaille : au-dela, tout ralentit ; la carte prend le relais
const PIX_BUDGET = 430000;
// Juste sous KMIN (jusqu'a FAR_T * KMIN), on garde la vue rapprochee avec un tampon un peu plus grand (echelle de rendu
// fractionnaire) : c'est le meme dessin qu'au zoom rapproche, en plus petit. Plus loin, on passe a la vue de loin (SC < 1).
const FAR_T = .7;
const renderK = (z) => z >= KMIN - 1e-6 ? Math.max(KMIN, Math.floor(z + 1e-6)) : z >= KMIN * FAR_T - 1e-6 ? Math.max(KMIN * FAR_T * .98, Math.floor(z * 16) / 16) : KMIN;
function applyK(){
  W = Math.ceil(devW / K); H = Math.ceil(devH / K);
  N = W * H;
  img = ctx.createImageData(W, H);
  px32 = new Uint32Array(img.data.buffer);
  fb = new Uint8Array(N); mb = new Uint8Array(N); lb = new Uint8Array(N); ob = new Uint8Array(N);
  setProj();
  applyView(true);
}
// taille et position du canvas a l'ecran
function applyView(force){
  const ov = Z < KMIN * FAR_T - 1e-6;
  if (ov !== OV_ON || force){
    OV_ON = ov;
    if (scene.width !== W || scene.height !== H){ scene.width = W; scene.height = H; }
    document.body.classList.toggle('map-view', ov);
  }
  // de loin, le tampon couvre tout l'ecran a l'echelle KMIN et le monde y est dessine en petit (SC < 1)
  SC = OV_ON ? Z / K : 1;
  const zs = OV_ON ? K : Z, cw = W * zs / DPR, ch = H * zs / DPR;
  scene.style.width = cw + 'px'; scene.style.height = ch + 'px';
  scene.style.left = ((window.innerWidth - cw) / 2) + 'px'; scene.style.top = ((window.innerHeight - ch) / 2) + 'px';
  setProj();
  if (typeof updateZoomUI === 'function') updateZoomUI();
}
function layout(){
  DPR = window.devicePixelRatio || 1;
  devW = Math.max(1, Math.round(window.innerWidth * DPR)); devH = Math.max(1, Math.round(window.innerHeight * DPR));
  const rel = Z && KDEF ? Z / KDEF : 1;
  KDEF = Math.max(2, Math.round(Math.min(devW, devH) / 290));
  KMIN = Math.min(KDEF, Math.max(1, Math.ceil(Math.sqrt(devW * devH / PIX_BUDGET))));
  KMAX = KDEF * 4;
  ZLEVELS = [KMIN * .16, KMIN * .24, KMIN * .36, KMIN * .52, KMIN * .74];
  for (let k = KMIN; k <= KMAX; k = Math.max(k + 1, Math.round(k * 1.2))) ZLEVELS.push(k);
  if (ZLEVELS[ZLEVELS.length - 1] !== KMAX) ZLEVELS.push(KMAX);
  if (!ZLEVELS.includes(KDEF)){ ZLEVELS.push(KDEF); ZLEVELS.sort((x, y) => x - y); }
  Z = ZT = clamp(KDEF * rel, ZLEVELS[0], KMAX);
  K = renderK(Z);
  applyK();
}
const ZMIN = () => ZLEVELS[0];
function clampCam(){ cam.a = clamp(cam.a, GA0 + 40, GA0 + GW / GSC - 40); cam.b = clamp(cam.b, GB0 + 30, GB0 + GH / GSC - 30); }
// point du sol sous un point de l'ecran (coordonnees CSS)
function screenToWorld(cx, cy, z){
  const dx = (cx - window.innerWidth / 2) * DPR / (z || Z), dy = (cy - window.innerHeight / 2) * DPR / (z || Z);
  const g = groundDelta(dx, dy); return [cam.a + g[0], cam.b + g[1]];
}
// et l'inverse : point de l'ecran (CSS) d'un point du sol
function worldToScreen(a, b, z){
  const zz = z || Z, ar = (a - cam.a) * PC - (b - cam.b) * PS, br = (a - cam.a) * PS + (b - cam.b) * PC;
  return [window.innerWidth / 2 + (ar - br) * zz / DPR, window.innerHeight / 2 + (ar + br) * .5 * zz / DPR];
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

/* ================= carte strategique : l'ile a plat, une case de couleur pour 2 unites ================= */
// on ne la redessine que par morceaux (cases de territoire gagnees, routes, batiments) : plus de gros calcul au dezoom
const MS = 2, MAPV = { W: GW / GSC / MS, H: GH / GSC / MS, cv: null, g: null, img: null, px: null, dirty: [], all: true };
function mapInit(){
  MAPV.cv = document.createElement('canvas'); MAPV.cv.width = MAPV.W; MAPV.cv.height = MAPV.H;
  MAPV.g = MAPV.cv.getContext('2d'); MAPV.img = MAPV.g.createImageData(MAPV.W, MAPV.H); MAPV.px = new Uint32Array(MAPV.img.data.buffer);
  MAPV.all = true;
}
function mapDirtyAll(){ MAPV.all = true; }
function mapDirtyRect(a0, a1, b0, b1, terOnly){
  if (MAPV.all) return;
  MAPV.dirty.push([Math.max(0, Math.floor((a0 - GA0) / MS)), Math.min(MAPV.W - 1, Math.ceil((a1 - GA0) / MS)), Math.max(0, Math.floor((b0 - GB0) / MS)), Math.min(MAPV.H - 1, Math.ceil((b1 - GB0) / MS))]);
  if (MAPV.dirty.length > 400) MAPV.all = true;
}
function mapDirtyCell(i){ const x = i % TER.W, y = (i / TER.W) | 0; mapDirtyRect(GA0 + x * TC - 2, GA0 + (x + 1) * TC + 2, GB0 + y * TC - 2, GB0 + (y + 1) * TC + 2, true); }
const MCOL = {};
[[T_SEA, '#1d5c96'], [T_GRASS, '#6aa44a'], [T_BEACH, '#e8d49c'], [T_ROAD, '#5f6166'], [T_WALK, '#b9b5aa'], [T_ROCK, '#8b8780'], [T_FOREST, '#3f7a33'], [T_DIRT, '#a8845a'], [T_PIER, '#7b5231'], [T_QUAY, '#bdbab2']].forEach(([t, h]) => MCOL[t] = hexRGB3(h));
function hexRGB3(h){ const v = parseInt(h.slice(1), 16); return [v >> 16, (v >> 8) & 255, v & 255]; }
const MTER = [null, [40, 92, 238], [236, 40, 44]];
function mapPaint(x0, x1, y0, y1){
  const px = MAPV.px, Wm = MAPV.W, own = TER.own;
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++){
    const a = GA0 + (x + .5) * MS, b = GB0 + (y + .5) * MS, ci = cellOf(a, b), t = ci < 0 ? T_SEA : gType[ci];
    let c = MCOL[t] || MCOL[T_GRASS], r = c[0], g = c[1], bl = c[2];
    if (t === T_SEA){ const sd = ci < 0 ? 99 : gSea[ci]; if (sd < 16){ r = 63; g = 169; bl = 204; } else if (sd < 50){ r = 38; g = 119; bl = 181; } }
    else {
      if (t === T_FOREST && hash2(x, y) < .35){ r -= 18; g -= 18; bl -= 10; }
      if (t === T_GRASS && hash2(x * 3, y) < .08){ r += 10; g += 10; }
      const ti = own ? terIdx(a, b) : -1, o = ti >= 0 ? own[ti] : 0;
      if (o){
        const tc = MTER[o];
        let border = false;
        if (ti >= 0){ const tx = ti % TER.W; for (const j of [ti - 1, ti + 1, ti - TER.W, ti + TER.W]) if (j >= 0 && j < TER.N && Math.abs((j % TER.W) - tx) <= 1 && TER.land[j] && own[j] !== o){ border = true; break; } }
        const f = border ? .9 : .4;
        r += (tc[0] - r) * f; g += (tc[1] - g) * f; bl += (tc[2] - bl) * f;
      }
    }
    px[y * Wm + x] = rgb32(r, g, bl);
  }
  // batiments et murs par-dessus
  const A0 = GA0 + x0 * MS, A1 = GA0 + (x1 + 1) * MS, B0 = GB0 + y0 * MS, B1 = GB0 + (y1 + 1) * MS;
  for (const l of BLD){
    if (l.a1 < A0 || l.a0 > A1 || l.b1 < B0 || l.b0 > B1) continue;
    const col = !l.done ? [200, 190, 160] : l.side === 'usc' ? [36, 58, 150] : [150, 30, 36], rim = [250, 246, 236];
    const xa = Math.max(x0, Math.floor((l.a0 - GA0) / MS)), xb = Math.min(x1, Math.ceil((l.a1 - GA0) / MS) - 1);
    const ya = Math.max(y0, Math.floor((l.b0 - GB0) / MS)), yb = Math.min(y1, Math.ceil((l.b1 - GB0) / MS) - 1);
    for (let y = ya; y <= yb; y++) for (let x = xa; x <= xb; x++){
      const e = x === Math.floor((l.a0 - GA0) / MS) || y === Math.floor((l.b0 - GB0) / MS) || x === Math.ceil((l.a1 - GA0) / MS) - 1 || y === Math.ceil((l.b1 - GB0) / MS) - 1;
      const c = e ? rim : col; px[y * Wm + x] = rgb32(c[0], c[1], c[2]);
    }
  }
  // vestiges catzi pas encore fouilles : un petit carre sombre
  for (const v of VEST){
    if (v.looted) continue;
    const vx = Math.floor((v.a - GA0) / MS), vy = Math.floor((v.b - GB0) / MS);
    for (let y = vy - 2; y <= vy + 2; y++) for (let x = vx - 2; x <= vx + 2; x++) if (x >= x0 && x <= x1 && y >= y0 && y <= y1) px[y * Wm + x] = (Math.abs(x - vx) === 2 || Math.abs(y - vy) === 2) ? rgb32(236, 228, 206) : rgb32(58, 52, 48);
  }
  for (const w of WALLS){
    if (Math.max(w.pa, w.qa) < A0 - 2 || Math.min(w.pa, w.qa) > A1 + 2 || Math.max(w.pb, w.qb) < B0 - 2 || Math.min(w.pb, w.qb) > B1 + 2) continue;
    const L = Math.hypot(w.qa - w.pa, w.qb - w.pb);
    for (let s = 0; s <= L; s += 1){ const x = Math.floor((w.pa + (w.qa - w.pa) * s / L - GA0) / MS), y = Math.floor((w.pb + (w.qb - w.pb) * s / L - GB0) / MS); if (x >= x0 && x <= x1 && y >= y0 && y <= y1) px[y * Wm + x] = rgb32(38, 34, 40); }
  }
}
// met a jour les morceaux sales, avec un budget par image
function mapUpdate(){
  if (!MAPV.cv) mapInit();
  if (MAPV.all){ MAPV.all = false; MAPV.dirty.length = 0; mapPaint(0, MAPV.W - 1, 0, MAPV.H - 1); MAPV.g.putImageData(MAPV.img, 0, 0); return; }
  if (!MAPV.dirty.length) return;
  let x0 = 1e9, x1 = -1, y0 = 1e9, y1 = -1, budget = 60000;
  while (MAPV.dirty.length && budget > 0){
    const [a, b, c, d] = MAPV.dirty.shift();
    mapPaint(a, b, c, d); budget -= (b - a + 1) * (d - c + 1);
    x0 = Math.min(x0, a); x1 = Math.max(x1, b); y0 = Math.min(y0, c); y1 = Math.max(y1, d);
  }
  if (x1 >= x0) MAPV.g.putImageData(MAPV.img, 0, 0, x0, y0, x1 - x0 + 1, y1 - y0 + 1);
}
/* ================= sol, mer, faisceau des phares, teinte des territoires ================= */
function beamTan(){
  const e = state.spread;
  if (e <= 0) return .082;
  const s = e * e * (3 - 2 * e), h0 = Math.atan(.082), hw = h0 + (Math.PI / 2 - h0) * s;
  return hw >= Math.PI / 2 - 1e-4 ? Infinity : Math.tan(hw);
}
const PTAB = new Uint8Array(16);
let OROW = new Uint8Array(1);
function renderGround(t){
  const I = state.intensity, pat = state.pattern, noise = pat === 'noise';
  for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) PTAB[y * 4 + x] = litAt(x, y, pat, I) ? 1 : 0;
  const bc = Math.cos(state.theta), bs = Math.sin(state.theta), tn = beamTan(), all = tn === Infinity;
  const tick = Math.floor(t * 5), ring = (t * 1.1);
  const dax = (.5 * PC - .5 * PS) / SC, dbx = (-.5 * PS - .5 * PC) / SC, day = (PC + PS) / SC, dby = (PC - PS) / SC;
  const o = unprj(.5, .5);
  const F = fb, MB = mb, LBF = lb, OB = ob, GV = gVar, GS = gSea, GT = gTone, GTY = gType, GP = gPh, TM = TYPE_MAT, BY = BAYER, PT = PTAB;
  const w = W, h = H, tx = TX, ty = TY, gw = GW, gh = GH, ga0 = GA0, gb0 = GB0, qw = GQW;
  // faisceau du phare le plus proche du centre de la vue, la nuit seulement
  let bm = null;
  if (COLOR && NIGHT > .55 && BEACONS.length){ let bd = 1e9; for (const bk of BEACONS){ const d = Math.hypot(bk[0] - cam.a, bk[1] - cam.b); if (d < bd){ bd = d; bm = bk; } } }
  const LA = bm ? bm[0] : 0, LB = bm ? bm[1] : 0, MF = M.FOAM, MBm = M.BEAM, MS2 = M.SEA, MSS = M.SEA_SHALLOW, MSM = M.SEA_MID;
  const TO = TER.own, TW = TER.W, TFR = TER.fresh, gt = GAME.t, hasT = !!TO;
  if (OROW.length !== w) OROW = new Uint8Array(w);
  const UP = OROW; UP.fill(0);
  let i = 0;
  for (let y = 0; y < h; y++){
    const a = o[0] + y * day, b = o[1] + y * dby;
    const ry = ((y - ty) & 3) << 2;
    let fa = (a - ga0) * 2, fbb = (b - gb0) * 2;
    const dfa = dax * 2, dfb = dbx * 2;
    let la = a - LA, lbb = b - LB, left = 0;
    for (let x = 0; x < w; x++, i++){
      let tone = 0, m = MS2, lv = 0, own = 0;
      if (fa >= 0 && fbb >= 0 && fa < gw && fbb < gh){
        const ia = fa | 0, ib = fbb | 0, ci = ib * gw + ia; tone = GT[ci];
        const ty2 = GTY[ci];
        if (ty2 === 0) m = GS[ci] < 16 ? MSS : GS[ci] < 50 ? MSM : MS2;
        else {
          m = TM[ty2]; if (ty2 === 1) lv = GV[(ib >> 2) * qw + (ia >> 2)];
          if (hasT){ const ti = (ib >> 3) * TW + (ia >> 3); own = TO[ti]; if (own && gt - TFR[ti] < 1.1) own += 2; }
        }
      }
      let v = 0;
      if (tone !== 0){
        if (tone >= 32){
          m = MF;
          const d = tone - 32, ia = fa | 0, ib = fbb | 0;
          if (d <= 2) v = hash2((ia >> 2) + tick * 3, ib >> 1) < .6 ? 1 : 0;
          else if (d <= 4) v = hash2(ia * 5 + tick, ib * 3) < .12 ? 1 : 0;
          else { const r = 5.2 - ((ring + GP[(ib >> 2) * qw + (ia >> 2)] / 15) % 3.6), q = d * .5 - r; v = (q < .35 && q > -.35 && hash2((ia >> 1) + tick, ib * 7) < .45) ? 1 : 0; }
        } else if (tone >= 16) v = 1;
        else v = BY[ry | ((x - tx) & 3)] < tone ? 1 : 0;
      }
      if (v === 0 && bm){
        const al = la * bc + lbb * bs, pe = lbb * bc - la * bs;
        if (all || (pe < 0 ? -pe : pe) <= (al < 0 ? -al : al) * tn + 1.2){
          v = noise ? (hash2((x - tx) * 7 + 1013, (y - ty) * 13 + 7) < I ? 1 : 0) : PT[ry | ((x - tx) & 3)];
          if (v) m = MBm;
        }
      }
      F[i] = v; MB[i] = m; LBF[i] = lv;
      // frontiere : un pixel de couleur franche de chaque cote du changement de camp
      const base = own > 2 ? own - 2 : own;
      let ov = own;
      if (x > 0 && base !== left){ if (base) ov = base + 2; if (left) OB[i - 1] = left + 2; }
      if (y > 0 && base !== UP[x]){ if (base) ov = base + 2; if (UP[x]) OB[i - w] = UP[x] + 2; }
      OB[i] = ov; left = base; UP[x] = base;
      fa += dfa; fbb += dfb; la += dax; lbb += dbx;
    }
  }
}
// recalcule seulement les camps par pixel (teinte et frontieres), d'apres la geometrie du sol
function groundOwners(){
  const dax = (.5 * PC - .5 * PS) / SC, dbx = (-.5 * PS - .5 * PC) / SC, day = (PC + PS) / SC, dby = (PC - PS) / SC, o = unprj(.5, .5);
  const OB = ob, GTY = gType, TO = TER.own, TW = TER.W, TFR = TER.fresh, gt = GAME.t, w = W, h = H, gw = GW, gh = GH;
  if (OROW.length !== w) OROW = new Uint8Array(w);
  const UP = OROW; UP.fill(0);
  let i = 0;
  for (let y = 0; y < h; y++){
    let fa = (o[0] + y * day - GA0) * 2, fbb = (o[1] + y * dby - GB0) * 2, left = 0;
    const dfa = dax * 2, dfb = dbx * 2;
    for (let x = 0; x < w; x++, i++){
      let own = 0;
      if (fa >= 0 && fbb >= 0 && fa < gw && fbb < gh){ const ia = fa | 0, ib = fbb | 0; if (GTY[ib * gw + ia] !== 0){ const ti = (ib >> 3) * TW + (ia >> 3); own = TO[ti]; if (own && gt - TFR[ti] < 1.1) own += 2; } }
      const base = own > 2 ? own - 2 : own;
      let ov = own;
      if (x > 0 && base !== left){ if (base) ov = base + 2; if (left) OB[i - 1] = left + 2; }
      if (y > 0 && base !== UP[x]){ if (base) ov = base + 2; if (UP[x]) OB[i - w] = UP[x] + 2; }
      OB[i] = ov; left = base; UP[x] = base;
      fa += dfa; fbb += dfb;
    }
  }
}
function drawWaves(t){
  const cs = [unprj(0, 0), unprj(W, 0), unprj(0, H), unprj(W, H)];
  let a0 = 1e9, a1 = -1e9, b0 = 1e9, b1 = -1e9;
  for (const [a, b] of cs){ a0 = Math.min(a0, a); a1 = Math.max(a1, a); b0 = Math.min(b0, b); b1 = Math.max(b1, b); }
  const CW = 12;
  // tout au fond du dezoom, l'ecume ne ferait plus que des points blancs isoles
  if (SC < .3) return;
  CUR = M.FOAM;
  // de loin, une case sur k dans chaque sens : autant de vagues a l'ecran qu'en vue rapprochee
  const st = Math.max(1, Math.round(1 / SC));
  for (let j = Math.floor(b0 / CW / st) * st - st; j <= Math.floor(b1 / CW) + st; j += st) for (let i = Math.floor(a0 / CW / st) * st - st; i <= Math.floor(a1 / CW) + st; i += st){
    if (hash2(i * 3 + 1, j * 7 + 2) < 0.2) continue;
    const ga = i * CW + hash2(i + 11, j - 5) * CW, gb = j * CW + hash2(i - 7, j + 13) * CW;
    const ci = cellOf(ga, gb);
    if (ci >= 0 && (gType[ci] !== T_SEA || gSea[ci] < 14)) continue;
    const ph = hash2(i - 31, j - 17) * TAU, sp = 0.55 + hash2(i + 5, j + 41) * 0.9;
    const amp = Math.sin(t * sp + ph); if (amp < 0.15) continue;
    const Lw = 2 + ((hash2(i + 23, j + 3) * 5) | 0), len = Math.max(1, Math.round(Lw * amp * SC));
    const p = prj(ga, gb, 0), x0 = Math.round(p[0] + Math.sin(t * .35 + ph) * 1.5 * SC), y0 = Math.round(p[1]);
    if (x0 < -10 || y0 < -2 || x0 > W + 2 || y0 > H + 2) continue;
    for (let k = 0; k < len; k++) fput(x0 + k, y0, 1);
    if (len >= 3){ fput(x0 - 1, y0 + 1, 1); fput(x0 + len, y0 + 1, 1); }
  }
}

/* ================= lumieres au sol ================= */
let LIGHTS = [];
function gatherLights(t, stat){
  LIGHTS = LIGHTS_STATIC.slice();
  if (!stat) for (const c of CARS) if (c.pos) LIGHTS.push(c.light);
  for (const tw of WALL_TOWERS){ const sp = towerSpot(tw, t); LIGHTS.push({ kind: 'circle', a: sp[0], b: sp[1], r: 7, k: 1.6, att: .5, m: M.BEAM }); }
}
function applyLights(){
  const I = state.intensity, pat = state.pattern;
  const dax = (.5 * PC - .5 * PS) / SC, dbx = (-.5 * PS - .5 * PC) / SC, day = (PC + PS) / SC, dby = (PC - PS) / SC;
  for (const Lt of LIGHTS){
    const R = Lt.kind === 'circle' ? Lt.r : Lt.len + Lt.w0 + 2;
    const ca = Lt.kind === 'circle' ? Lt.a : Lt.a + Lt.da * Lt.len * .5, cb = Lt.kind === 'circle' ? Lt.b : Lt.b + Lt.db * Lt.len * .5;
    const rr = Lt.kind === 'circle' ? R : Lt.len * .5 + Lt.len * Lt.tan + Lt.w0 + 2;
    const c = prj(ca, cb, 0), ex = rr * 1.42 * SC, ey = rr * .72 * SC;
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
          const la = ga - Lt.a, lbb = gb - Lt.b, al = la * Lt.da + lbb * Lt.db, pe = lbb * Lt.da - la * Lt.db;
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
let hoverCat = null;

/* ================= Spoutchat ================= */
const SAT_PERIOD = 46, SAT_SHOW = 14;
const satVisible = (t) => (t % SAT_PERIOD) < SAT_SHOW && (SPACE.usc.stage > 0 || SPACE.ccp.stage > 0);
function drawSatellite(t){
  if (!satVisible(t)) return;
  const p = (t % SAT_PERIOD) / SAT_SHOW; if (p >= 1) return;
  const x = Math.round(-8 + (W + 16) * p), y = Math.round(H * .1 + Math.sin(p * Math.PI) * -H * .04 + 14);
  const on = Math.floor(t * 3) % 2 === 0;
  CUR = M.METAL;
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) fput(x + dx, y + dy, 1);
  for (let k = 2; k <= 5; k++){ fput(x - k, y + k, 1); fput(x + k, y + k, 1); fput(x - k - 1, y + k + 1, k === 5 ? 1 : 0); }
  if (on) for (let k = 0; k < 2; k++){ fput(x + 3 + k * 2, y - 3 - k, 1); fput(x + 4 + k * 2, y - 4 - k, 1); }
}

/* ================= rendu complet ================= */
let DYN_SHADOWS = [];
function dynamicDrawables(t){ const out = []; DYN_SHADOWS = []; for (const f of HOOKS.dyn) f(t, out); return out; }
// De pres, chaque objet se dessine directement dans le tampon. De loin (SC < 1), il passe par farDraw : dessine a l'echelle 1 a part, puis recopie en petit.
function render(t){
  const far = SC < .999;
  setProj();
  renderGround(t);
  drawWaves(t);
  if (!far) for (const d of DECALS) d(t);
  const dyn = dynamicDrawables(t);
  siteDrawables(t, dyn);
  const shadowsOn = COLOR && NIGHT < .6 && !far;
  if (shadowsOn) drawShadows();
  if (!COLOR || NIGHT > .25){ gatherLights(t); applyLights(); }
  const list = [];
  const Mg = 110 * SC;
  for (const p of STATIC_PARTS){
    const q = prj(p.a, p.b, 0);
    if (q[0] < -Mg || q[0] > W + Mg || q[1] < -30 * SC || q[1] > H + Mg + 60 * SC) continue;
    list.push({ d: dep(p.a, p.b) + p.zb, f: p.draw, m: p.m, side: p.side, a: p.a, b: p.b, key: p });
  }
  treeDrawables(list, t, shadowsOn);
  const cm = 20 + 20 * SC;
  for (const c of CARS){ const p = c.pos; if (!p) continue; const q = prj(p.a, p.b, 0); if (q[0] < -cm || q[0] > W + cm || q[1] < -cm || q[1] > H + cm) continue; list.push({ d: dep(p.a, p.b), a: p.a, b: p.b, f: () => drawCarAng(p.a, p.b, p.ang, c.side) }); }
  for (const c of CATS){ const p = catPos(c, t), q = prj(p.a, p.b, 0); c.screen = null; if (q[0] < -20 || q[0] > W + 20 || q[1] < -20 || q[1] > H + 20) continue; list.push({ d: dep(p.a, p.b) + .2, a: p.a, b: p.b, f: far ? () => { drawCat(c, t); c.screen = null; } : () => drawCat(c, t) }); }
  const sp = sailPos(t); list.push({ d: dep(sp[0], sp[1]), a: sp[0], b: sp[1], f: drawSailboat, big: true });
  for (const o of dyn) list.push(o);
  list.sort((u, v) => u.d - v.d);
  if (far) farRefresh(list, t);
  for (const it of list){ CUR = it.m == null ? M.METAL : it.m; CUR_SIDE = it.side || 'usc'; if (far) farDraw(it, t); else it.f(t); }
  if (!far){ for (const f of HOOKS.top) f(t); if (typeof drawToolPreview === 'function') drawToolPreview(t); }
  const glow = !COLOR || NIGHT > .35;
  if (far){ for (const bk of BEACONS) farDraw({ a: bk[0], b: bk[1], f: (tt) => { drawLantern(bk[0], bk[1]); if (glow) drawGlow(bk[0], bk[1], tt); } }, t); }
  else if (glow){ for (const bk of BEACONS){ drawLantern(bk[0], bk[1]); drawGlow(bk[0], bk[1], t); } drawLampHeads(); }
  else for (const bk of BEACONS) drawLantern(bk[0], bk[1]);
  drawSatellite(t); drawWeather(t); if (COLOR) for (const f of HOOKS.post) f(t);
  const P = PALX, pl = PL;
  for (let i = 0; i < N; i++){ const m = mb[i]; px32[i] = P[ob[i] * pl + (((m << 1) | fb[i]) * 5 + lb[i])]; }
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

/* ================= vue de loin : tout en direct, les objets dessines en petit ================= */
// De loin, le tampon garde la taille du zoom le plus eloigne de la vue rapprochee (KMIN) et le monde y est dessine a l'echelle SC.
// Le sol, l'ecume, les lumieres et le territoire sont calcules au pixel comme de pres. Chaque objet est dessine a l'echelle 1
// dans un petit tampon a part, avec le meme code que de pres, puis recopie en petit. Les batiments et les montagnes gardent
// ce dessin en memoire et le refont par roulement (la vue a tourne, un drapeau flotte) ; ce qui bouge est refait a chaque image.
const SPW = 256, SPH = 256, SPAX = 128, SPAY = 196, EMPTY = 255;
const SPB = { fb: new Uint8Array(SPW * SPH), mb: new Uint8Array(SPW * SPH), lb: new Uint8Array(SPW * SPH), ob: new Uint8Array(SPW * SPH) };
const FAR = { budget: 5, bk: TAU / 360, age: 1200, cache: new WeakMap(), t0: 0 };
function sprRender(it, t){
  const sv = [W, H, N, fb, mb, lb, ob, TX, TY, SC, PROJ_FIX];
  W = SPW; H = SPH; N = SPW * SPH; fb = SPB.fb; mb = SPB.mb; lb = SPB.lb; ob = SPB.ob;
  fb.fill(0); mb.fill(EMPTY); lb.fill(0);
  SC = 1;
  const ar = it.a * PC - it.b * PS, br = it.a * PS + it.b * PC;
  PROJ_FIX = [Math.round(SPAX - (ar - br)), Math.round(SPAY - (ar + br) * .5)];
  setProj();
  const ax = TX + ar - br, ay = TY + (ar + br) * .5;
  let out = null;
  try {
    CUR = it.m == null ? M.METAL : it.m; CUR_SIDE = it.side || 'usc';
    it.f(t);
    let x0 = SPW, x1 = -1, y0 = SPH, y1 = -1;
    const MB = mb;
    for (let y = 0, i = 0; y < SPH; y++){
      let any = false;
      for (let x = 0; x < SPW; x++, i++) if (MB[i] !== EMPTY){ any = true; if (x < x0) x0 = x; if (x > x1) x1 = x; }
      if (any){ if (y < y0) y0 = y; y1 = y; }
    }
    if (x1 >= 0){
      const w = x1 - x0 + 1, h = y1 - y0 + 1, F = new Uint8Array(w * h), Mm = new Uint8Array(w * h), L = new Uint8Array(w * h);
      for (let y = 0; y < h; y++){ const s0 = (y + y0) * SPW + x0, d0 = y * w; F.set(fb.subarray(s0, s0 + w), d0); Mm.set(MB.subarray(s0, s0 + w), d0); L.set(lb.subarray(s0, s0 + w), d0); }
      out = { x0: x0 - ax, y0: y0 - ay, w, h, fb: F, mb: Mm, lb: L };
    }
  } finally {
    [W, H, N, fb, mb, lb, ob, TX, TY, SC, PROJ_FIX] = sv;
  }
  return out;
}
// recopie en petit d'un dessin fait a part (x, y : point d'ancrage dans le tampon)
function sprBlit(S, x, y, sc){
  const X0 = x + S.x0 * sc, Y0 = y + S.y0 * sc, inv = 1 / sc, sw = S.w, sh = S.h, SM = S.mb, SF = S.fb, SL = S.lb;
  const xa = Math.max(0, Math.floor(X0)), xb = Math.min(W - 1, Math.ceil(X0 + sw * sc) - 1);
  const ya = Math.max(0, Math.floor(Y0)), yb = Math.min(H - 1, Math.ceil(Y0 + sh * sc) - 1);
  for (let dy = ya; dy <= yb; dy++){
    const sy = Math.floor((dy + .5 - Y0) * inv); if (sy < 0 || sy >= sh) continue;
    const row = dy * W, srow = sy * sw;
    for (let dx = xa; dx <= xb; dx++){
      const sx = Math.floor((dx + .5 - X0) * inv); if (sx < 0 || sx >= sw) continue;
      const k = srow + sx, m = SM[k]; if (m === EMPTY) continue;
      const j = row + dx; fb[j] = SF[k]; mb[j] = m; lb[j] = SL[k];
    }
  }
}
// meme chose pour les petits dessins tout faits (arbres) : 2 transparent, 3 fenetre, sinon la matiere courante
function blitSc(s, x, y, sc){
  const X0 = x + s.x0 * sc, Y0 = y + s.y0 * sc, inv = 1 / sc, sw = s.w, sh = s.h, B = s.buf, cur = CUR, lv = LV, col = COLOR;
  const xa = Math.max(0, Math.floor(X0)), xb = Math.min(W - 1, Math.ceil(X0 + sw * sc) - 1);
  const ya = Math.max(0, Math.floor(Y0)), yb = Math.min(H - 1, Math.ceil(Y0 + sh * sc) - 1);
  for (let dy = ya; dy <= yb; dy++){
    const sy = Math.floor((dy + .5 - Y0) * inv); if (sy < 0 || sy >= sh) continue;
    const row = dy * W, srow = sy * sw;
    for (let dx = xa; dx <= xb; dx++){
      const sx = Math.floor((dx + .5 - X0) * inv); if (sx < 0 || sx >= sw) continue;
      const v = B[srow + sx]; if (v === 2) continue;
      const j = row + dx; if (col) lb[j] = lv;
      if (v === 3){ fb[j] = 1; mb[j] = M.WIN; } else { fb[j] = v; mb[j] = cur; }
    }
  }
}
const farBucket = () => Math.round(cam.phi / FAR.bk);
// avant de dessiner : on refait d'abord les dessins en memoire les plus anciens, dans la limite du budget
// (still : ce qui ne bouge jamais, comme une montagne, n'est refait que si la vue a tourne)
function farRefresh(list, t){
  const now = performance.now(), bk = farBucket(), stale = [];
  FAR.t0 = now;
  for (const it of list){
    if (!it.key) continue;
    const c = FAR.cache.get(it.key);
    if (c && (c.bk !== bk || (!it.still && now - c.t0 > FAR.age))) stale.push([it, c]);
  }
  stale.sort((u, v) => u[1].t0 - v[1].t0);
  for (const [it, c] of stale){
    if (performance.now() - now > FAR.budget) break;
    CUR = it.m == null ? M.METAL : it.m; CUR_SIDE = it.side || 'usc';
    c.spr = sprRender(it, t); c.bk = bk; c.t0 = performance.now();
  }
}
function farDraw(it, t){
  if (it.raw){ it.f(t); return; }
  if (it.a == null) return;
  let S;
  if (it.key){
    let c = FAR.cache.get(it.key);
    if (!c){
      // pas encore dessine : on le fait tout de suite, sauf si l'image a deja pris trop de temps (il viendra a la suivante)
      if (performance.now() - FAR.t0 > 24) return;
      c = { spr: sprRender(it, t), bk: farBucket(), t0: performance.now() };
      FAR.cache.set(it.key, c);
    }
    S = c.spr;
  } else S = sprRender(it, t);
  if (!S) return;
  const q = prj(it.a, it.b, 0);
  // les bateaux restent lisibles de tres loin
  sprBlit(S, q[0], q[1], it.big ? Math.max(SC, .5) : SC);
}
