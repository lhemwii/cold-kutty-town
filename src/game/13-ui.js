/* ================= inspecteur ================= */
const $ = (id) => document.getElementById(id);
const insp = $('insp'), ictx = insp.getContext('2d');
const INSP_N = 13; let inspCell = 11, pointer = null;
function sizeInspector(){ const css = INSP_N * inspCell + 1; insp.style.width = css + 'px'; insp.style.height = css + 'px'; insp.width = Math.round(css * DPR); insp.height = Math.round(css * DPR); }
function drawInspector(){
  if (!state.inspOn || state.uiHidden || state.chatCat) return;
  const [px, py] = pointer || [Math.round(W / 2), Math.round(H / 2)];
  const cs = inspCell * DPR, half = (INSP_N - 1) / 2;
  ictx.fillStyle = '#000'; ictx.fillRect(0, 0, insp.width, insp.height); ictx.fillStyle = '#fff';
  for (let r = 0; r < INSP_N; r++) for (let q = 0; q < INSP_N; q++){
    const x = px + q - half, y = py + r - half;
    if (x >= 0 && y >= 0 && x < W && y < H && fb[y * W + x]) ictx.fillRect(Math.round(q * cs), Math.round(r * cs), Math.round((q + 1) * cs) - Math.round(q * cs), Math.round((r + 1) * cs) - Math.round(r * cs));
  }
  ictx.fillStyle = 'rgba(128,128,128,.55)'; const lw = Math.max(1, Math.round(DPR));
  for (let k = 0; k <= INSP_N; k++){ const p = Math.min(insp.width - lw, Math.round(k * cs)); ictx.fillRect(p, 0, lw, insp.height); ictx.fillRect(0, p, insp.width, lw); }
  const x0 = Math.round(half * cs), w0 = Math.round(cs);
  ictx.lineWidth = 2 * DPR; ictx.strokeStyle = '#fff'; ictx.strokeRect(x0 - DPR, x0 - DPR, w0 + 2 * DPR + lw, w0 + 2 * DPR + lw);
}

/* ================= reglages de lumiere ================= */
const ibar = $('ibar'); for (let k = 0; k < 16; k++) ibar.appendChild(document.createElement('span'));
const pbtns = [...document.querySelectorAll('.pbtn')];
const mbtns = [...document.querySelectorAll('[data-mode]')];
function drawSwatches(){
  for (const b of pbtns){
    const cv = b.querySelector('canvas'), cx = cv.getContext('2d'), im = cx.createImageData(12, 12), d32 = new Uint32Array(im.data.buffer);
    for (let y = 0; y < 12; y++) for (let x = 0; x < 12; x++) d32[y * 12 + x] = litAt(x, y, b.dataset.p, state.intensity) ? WHITE : BLACK;
    cx.putImageData(im, 0, 0);
  }
}
function ruleText(){
  const I = state.intensity;
  switch (state.pattern){
    case 'dots': return 'bayer4(x, y) < ' + (I * 16).toFixed(2);
    case 'stripes': return '(x + y) mod 4 < ' + (I * 4).toFixed(2);
    case 'noise': return 'bruit(x, y) < ' + I.toFixed(2);
    default: return '|dx| + |dy| < ' + (I * 4).toFixed(2);
  }
}
function updateReadouts(){
  const I = state.intensity;
  $('ival').textContent = I.toFixed(2);
  ibar.setAttribute('aria-valuenow', I.toFixed(2));
  const on = Math.round(I * 16); [...ibar.children].forEach((s, k) => s.classList.toggle('on', k < on));
  $('rule').textContent = ruleText();
  $('inspTitle').textContent = PAT_NAMES[state.pattern];
  pbtns.forEach(b => b.setAttribute('aria-checked', String(b.dataset.p === state.pattern)));
  drawSwatches();
}
const setPattern = (p) => { state.pattern = p; updateReadouts(); };
const setIntensity = (v) => { state.intensity = Math.round(clamp(v, 0, 1) * 100) / 100; updateReadouts(); };
pbtns.forEach(b => b.addEventListener('click', () => setPattern(b.dataset.p)));
$('btnView').addEventListener('click', () => { state.patternView = !state.patternView; $('btnView').setAttribute('aria-pressed', String(state.patternView)); });
$('btnRot').addEventListener('click', () => { state.auto = !state.auto; $('btnRot').setAttribute('aria-pressed', String(state.auto)); });
$('btnInsp').addEventListener('click', () => { state.inspOn = !state.inspOn; $('btnInsp').setAttribute('aria-pressed', String(state.inspOn)); $('inspector').hidden = !state.inspOn || !!state.chatCat; });
/* ================= horloge jour et nuit ================= */
const CLOCK_SPEEDS = [1, 4, 12];
const pad2 = (n) => String(n).padStart(2, '0');
let clockShown = -1, clockDrag = false;
function updateClockUI(){
  if (!COLOR) return;
  const m = Math.floor(CLOCK.h * 60) % 1440;
  if (m === clockShown) return;
  clockShown = m;
  $('clockTime').textContent = pad2(Math.floor(m / 60)) + ':' + pad2(m % 60);
  if (!clockDrag) $('clockRange').value = String(m);
}
if (COLOR){
  $('clock').hidden = false;
  const cp = $('clockPlay');
  const PAUSE_SVG = cp.innerHTML, PLAY_SVG = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 2.5v11l9.5-5.5z" fill="currentColor"/></svg>';
  cp.addEventListener('click', () => {
    CLOCK.auto = !CLOCK.auto;
    cp.innerHTML = CLOCK.auto ? PAUSE_SVG : PLAY_SVG;
    cp.setAttribute('aria-label', CLOCK.auto ? 'Mettre le temps en pause' : 'Faire avancer le temps');
    cp.setAttribute('aria-pressed', String(!CLOCK.auto));
  });
  const cr = $('clockRange');
  cr.addEventListener('input', () => { clockDrag = true; CLOCK.h = (+cr.value) / 60; clockShown = -1; });
  cr.addEventListener('change', () => { clockDrag = false; });
  cr.addEventListener('pointerup', () => { clockDrag = false; });
  cr.addEventListener('keydown', e => e.stopPropagation());
  const cs = $('clockSpeed');
  cs.addEventListener('click', () => {
    const k = (CLOCK_SPEEDS.indexOf(CLOCK.speed) + 1) % CLOCK_SPEEDS.length;
    CLOCK.speed = CLOCK_SPEEDS[k]; cs.textContent = '×' + CLOCK.speed;
    cs.setAttribute('aria-label', 'Vitesse du temps : fois ' + CLOCK.speed);
  });
}
// meteo : automatique ou forcee
const WX_MODES = ['auto', 'clair', 'pluie', 'neige', 'brouillard'], WX_LABEL = { auto: 'Météo auto', clair: 'Soleil', pluie: 'Pluie', neige: 'Neige', brouillard: 'Brouillard' };
if (COLOR){
  const wb = $('btnWx'); wb.hidden = false;
  wb.addEventListener('click', () => {
    WEATHER.mode = WX_MODES[(WX_MODES.indexOf(WEATHER.mode) + 1) % WX_MODES.length];
    wb.textContent = WX_LABEL[WEATHER.mode];
    if (WEATHER.mode === 'auto') WEATHER.next = 0;
  });
}
$('btnLight').addEventListener('click', () => { const p = $('lightPanel'); p.hidden = !p.hidden; $('btnLight').setAttribute('aria-pressed', String(!p.hidden)); });
$('btnHide').addEventListener('click', () => {
  state.uiHidden = !state.uiHidden; document.body.classList.toggle('ui-off', state.uiHidden);
  $('btnHide').textContent = state.uiHidden ? 'Afficher l’interface' : 'Masquer'; $('btnHide').setAttribute('aria-pressed', String(state.uiHidden));
  if (state.uiHidden){ $('lightPanel').hidden = true; $('btnLight').setAttribute('aria-pressed', 'false'); }
});
let barDrag = false;
const barAt = (e) => { const r = ibar.getBoundingClientRect(); setIntensity((e.clientX - r.left) / r.width); };
ibar.addEventListener('pointerdown', e => { barDrag = true; ibar.setPointerCapture(e.pointerId); barAt(e); });
ibar.addEventListener('pointermove', e => { if (barDrag) barAt(e); });
ibar.addEventListener('pointerup', () => barDrag = false);
ibar.addEventListener('keydown', e => {
  const step = e.shiftKey ? 1 / 16 : 0.01;
  if (e.key === 'ArrowRight' || e.key === 'ArrowUp'){ setIntensity(state.intensity + step); e.preventDefault(); e.stopPropagation(); }
  if (e.key === 'ArrowLeft' || e.key === 'ArrowDown'){ setIntensity(state.intensity - step); e.preventDefault(); e.stopPropagation(); }
});

/* ================= zoom et rotation : boutons et boussole ================= */
const compassCv = $('compass').querySelector('canvas');
function updateZoomUI(){
  $('zoomLabel').textContent = Math.round(ZT / KDEF * 100) + ' %';
  $('zoomIn').disabled = ZT >= KMAX - 1e-6; $('zoomOut').disabled = ZT <= ZMIN() + 1e-6;
}
function drawCompass(){
  const g = compassCv.getContext('2d'), im = g.createImageData(11, 11), d = new Uint32Array(im.data.buffer);
  d.fill(BLACK);
  // nord = vers le phare (b negatif)
  let vx = (0 * PC - (-1) * PS) - (0 * PS + (-1) * PC), vy = ((0 * PC - (-1) * PS) + (0 * PS + (-1) * PC)) * .5;
  const l = Math.hypot(vx, vy) || 1; vx /= l; vy /= l;
  for (let s = -4; s <= 4; s += .25){ const x = Math.round(5 + vx * s), y = Math.round(5 + vy * s); if (x >= 0 && y >= 0 && x < 11 && y < 11) d[y * 11 + x] = WHITE; }
  const tx = Math.round(5 + vx * 4), ty = Math.round(5 + vy * 4);
  for (const [ox, oy] of [[0,0],[1,0],[-1,0],[0,1],[0,-1]]){ const x = tx + ox, y = ty + oy; if (x >= 0 && y >= 0 && x < 11 && y < 11) d[y * 11 + x] = WHITE; }
  g.putImageData(im, 0, 0);
}
function rotateBy(delta){ const base = cam.phiT == null ? cam.phi : cam.phiT; cam.phiT = Math.round((base + delta) / (Math.PI / 4)) * (Math.PI / 4); }
$('zoomIn').addEventListener('click', () => { zoomStep(1); updateZoomUI(); });
$('zoomOut').addEventListener('click', () => { zoomStep(-1); updateZoomUI(); });
$('zoomLabel').addEventListener('click', () => setZoom(KDEF));
$('rotL').addEventListener('click', () => rotateBy(-Math.PI / 4));
$('rotR').addEventListener('click', () => rotateBy(Math.PI / 4));
$('compass').addEventListener('click', () => { const k = Math.round(cam.phi / TAU); cam.phiT = k * TAU; });

/* ================= modes et palette ================= */
const HINTS = {
  walk: 'Glisse pour te déplacer, molette pour zoomer, clic droit glissé ou R pour tourner. Clique sur un chat pour lui parler.',
  build: 'Choisis un bâtiment puis clique sur un terrain libre. Il prend le style du camp.',
  road: 'Clique pour le départ de la route, puis clique pour l’arrivée. Elle se raccorde toute seule. Échap pour annuler.',
  demolish: 'Clique sur un bâtiment, ou sur une route que tu as tracée, pour la démolir.'
};
function setMode(m){
  state.mode = m;
  mbtns.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.mode === m)));
  $('palette').hidden = m !== 'build';
  $('modeHint').textContent = HINTS[m];
  scene.classList.toggle('build', m === 'build' || m === 'road'); scene.classList.toggle('demolish', m === 'demolish');
  roadStart = null;
  ghostKey = ''; updateGhost();
}
mbtns.forEach(b => b.addEventListener('click', () => setMode(b.dataset.mode)));
const palette = $('palette');
function buildPalette(){
  const saved = { PC, PS, TX, TY, W, H, fb, mb, lb };
  for (const key of PALETTE){
    const b = document.createElement('button');
    b.className = 'btn bbtn'; b.type = 'button'; b.setAttribute('role', 'radio'); b.dataset.t = key;
    b.setAttribute('aria-checked', String(key === state.buildType));
    const cv = document.createElement('canvas'); cv.width = 64; cv.height = 48;
    const sp = document.createElement('span'); sp.textContent = TYPES[key].name;
    const ct = document.createElement('i'); ct.className = 'cost'; ct.textContent = costOf(key) + ' laine';
    b.append(cv, sp, ct); palette.appendChild(b);
    // rendu miniature avec le meme moteur
    const side = PREVIEW_SIDE[key] || 'usc';
    const lot = { a0: -18, a1: 18, b0: -15.5, b1: 15.5, ca: 0, cb: 0, side };
    W = 64; H = 48; fb = new Uint8Array(W * H); mb = new Uint8Array(W * H); lb = new Uint8Array(W * H); PC = 1; PS = 0;
    CUR_SIDE = side;
    const r = TYPES[key].build(lot, 5), probe = { x0: 1e9, y0: 1e9, x1: -1e9, y1: -1e9 };
    TX = 32; TY = 30;
    const parts = r.parts.slice().sort((u, v) => (dep(u.a, u.b) + u.zb) - (dep(v.a, v.b) + v.zb));
    for (const p of parts){ CUR = side === 'ccp' ? M.CCP : M.USC; p.draw(0); }
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (fb[y * W + x]){ probe.x0 = Math.min(probe.x0, x); probe.x1 = Math.max(probe.x1, x); probe.y0 = Math.min(probe.y0, y); probe.y1 = Math.max(probe.y1, y); }
    if (probe.x1 >= 0){
      TX += Math.round(32 - (probe.x0 + probe.x1) / 2); TY += Math.round(25 - (probe.y0 + probe.y1) / 2);
      fb.fill(0); mb.fill(0); for (const p of parts){ CUR = side === 'ccp' ? M.CCP : M.USC; p.draw(0); }
    }
    const cx = cv.getContext('2d'), im = cx.createImageData(64, 48), d32 = new Uint32Array(im.data.buffer);
    for (let i = 0; i < 64 * 48; i++) d32[i] = COLOR ? (fb[i] || mb[i] ? PALL[((mb[i] << 1) | fb[i]) * 5 + lb[i]] : 0) : (fb[i] ? WHITE : BLACK);
    cx.putImageData(im, 0, 0);
    b.addEventListener('click', () => { state.buildType = key; [...palette.children].forEach(c => c.setAttribute('aria-checked', String(c.dataset.t === key))); ghostKey = ''; updateGhost(); });
  }
  ({ PC, PS, TX, TY, W, H, fb, mb, lb } = saved);
}

let toastTimer = 0;
function toast(msg){ const el = $('toast'); el.textContent = msg; el.hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => el.hidden = true, 2400); }
let lastBuilt = '';
function placeOn(lot, silent){
  if (lot.type){ toast('Ce terrain est déjà occupé.'); return; }
  if (lot.blocked){ toast('Une route passe sur ce terrain.'); return; }
  const why = canBuildHere(lot); if (why){ toast(why); return; }
  const type = state.buildType;
  if (!payFor(lot, type)) return;
  const camp = { bonus: CAMPS[lot.side].bonus, want: CAMPS[lot.side].want, done: CAMPS[lot.side].done };
  lot.type = type; lot.lvl = 1; lot.buildT = NOW_T; lot.lvlT = NOW_T;
  refreshNeighbors(); rebuildTown(); shadowsLater(); ghostKey = ''; updateGhost(); saveSoon();
  const T = TYPES[lot.type], nm = typeName(lot.type, lot.side), nb = neighborOf(lot, type);
  pushHistory({ kind: 'build', id: lot.id, cost: costOf(type), camp });
  lastBuilt = nm.toLowerCase() + (lot.side === 'ccp' ? ' côté CCR' : ' côté USC');
  if (!silent) toast(nm + (T.fem ? ' construite' : ' construit') + (lot.side === 'ccp' ? ' en CCR' : ' en USC') + (nb.s ? ' · voisinage ' + (nb.s > 0 ? '+' : '') + nb.s + ' (' + nb.why.join(', ') + ')' : '') + '.');
  if (typeof radioFlash === 'function' && !silent) radioFlash(lot);
  if (!silent) sfx('build', lot.ca, lot.cb);
  onBuilt(lot);
  if (typeof mpPush === 'function') mpPush();
}
function demolish(lot){
  if (!lot.type){ toast('Rien à démolir ici.'); return; }
  const why = canBuildHere(lot, true); if (why){ toast(why); return; }
  const T = TYPES[lot.type], nm = typeName(lot.type, lot.side), refund = Math.round(costOf(lot.type) / 2);
  pushHistory({ kind: 'demolish', id: lot.id, type: lot.type, lvl: lot.lvl || 1, refund });
  RES[lot.side].laine += refund;
  lot.type = ''; lot.lvl = 1; lot.buildT = 0; lot.demoT = NOW_T;
  refreshNeighbors(); rebuildTown(); ghostKey = ''; updateGhost(); saveSoon();
  toast(nm + (T.fem ? ' démolie' : ' démoli') + ', ' + refund + ' laine récupérée.');
  sfx('demolish', lot.ca, lot.cb);
  updateCamps(true);
  if (typeof mpPush === 'function') mpPush();
}

/* ================= tracer des routes ================= */
let roadStart = null, roadHover = null;
function segRect(s, pad){
  return s.o === 'a' ? [s.s0 - pad, s.s1 + pad, s.c - pad, s.c + pad] : [s.c - pad, s.c + pad, s.s0 - pad, s.s1 + pad];
}
function snapRoadPoint(a, b){
  let sa = Math.round(a / 10) * 10, sb = Math.round(b / 10) * 10;
  for (const s of allRoads()){
    if (s.o === 'a'){ if (Math.abs(b - s.c) < 12 && a >= s.s0 - 12 && a <= s.s1 + 12) sb = s.c; }
    else { if (Math.abs(a - s.c) < 12 && b >= s.s0 - 12 && b <= s.s1 + 12) sa = s.c; }
  }
  return [sa, sb];
}
function roadFrom(p, a, b){
  const q = snapRoadPoint(a, b);
  if (Math.abs(a - p[0]) >= Math.abs(b - p[1])) return { o: 'a', c: p[1], s0: Math.min(p[0], q[0]), s1: Math.max(p[0], q[0]) };
  return { o: 'b', c: p[0], s0: Math.min(p[1], q[1]), s1: Math.max(p[1], q[1]) };
}
function roadProblem(s){
  if (s.s1 - s.s0 < 15) return 'Trop court : tire la route un peu plus loin.';
  if (GAME.mp && roadSide(s) !== GAME.mp.seat) return 'Ce côté-là appartient à ton adversaire : trace tes routes chez toi.';
  for (let t = s.s0 - RW; t <= s.s1 + RW; t += 1) for (const off of [-RW, 0, RW]){
    const a = s.o === 'a' ? t : s.c + off, b = s.o === 'a' ? s.c + off : t;
    if (Math.abs(a - WALL_A) < STRIP + 1) return 'Le Rideau de Laine ne se traverse qu’au Checkpoint Minou.';
    const i = cellOf(a, b);
    if (i < 0) return 'Pas de route dans la mer.';
    const bt = gBase[i];
    if (bt === T_SEA || bt === T_ROCK || bt === T_PIER || bt === T_PATH || gLand[i] < 8) return 'Pas de route dans la mer.';
    if (bt === T_RAIL && s.o === 'a') return 'La voie ferrée passe ici : trace ta route en travers des rails.';
    if (bt === T_TARMAC || bt === T_APRON) return 'Pas de route sur l’aéroport.';
  }
  const R = segRect(s, RWS);
  for (const l of LOTS){ if (!l.type) continue; if (R[0] < l.a1 && R[1] > l.a0 && R[2] < l.b1 && R[3] > l.b0) return 'Un bâtiment bloque le passage. Démolis-le d’abord.'; }
  for (const r of allRoads()) if (r.o === s.o && Math.abs(r.c - s.c) < 1 && s.s0 >= r.s0 - 1 && s.s1 <= r.s1 + 1) return 'Il y a déjà une route ici.';
  return '';
}
function applyRoadsChange(s){
  const r = segRect(s, RWS + 18);
  paintRoads(r[0], r[1], r[2], r[3]);
  refreshBlocked();
  buildGraph(); reseatCars();
  rebuildTown(); ghostKey = ''; updateGhost(); saveSoon();
}
function addRoad(s){
  const pb2 = roadProblem(s); if (pb2) return pb2;
  const seg = { o: s.o, c: s.c, s0: s.s0, s1: s.s1 };
  USER_ROADS.push(seg);
  pushHistory({ kind: 'road', seg });
  applyRoadsChange(s);
  if (typeof mpPush === 'function') mpPush();
  return '';
}
function userRoadAt(a, b){
  for (let k = USER_ROADS.length - 1; k >= 0; k--){ const R = segRect(USER_ROADS[k], RWS); if (a >= R[0] && a <= R[1] && b >= R[2] && b <= R[3]) return k; }
  return -1;
}
function removeRoad(k){ if (GAME.mp && roadSide(USER_ROADS[k]) !== GAME.mp.seat){ toast('Cette route appartient à ton adversaire.'); return; } const s = USER_ROADS.splice(k, 1)[0]; pushHistory({ kind: 'unroad', seg: s }); applyRoadsChange(s); if (typeof mpPush === 'function') mpPush(); }
function drawRoadPreview(t){
  if (state.mode !== 'road') return;
  GHOST_T = Math.floor(t * 8);
  CUR = M.BEAM;
  const cross = (a, b) => { const p = prj(a, b, 0), x = Math.round(p[0]), y = Math.round(p[1]); for (let k = -4; k <= 4; k++){ fput(x + k, y, 1); fput(x, y + (k >> 1), 1); } };
  if (!roadStart){ if (roadHover){ const q = snapRoadPoint(roadHover[0], roadHover[1]); cross(q[0], q[1]); } return; }
  cross(roadStart[0], roadStart[1]);
  if (!roadHover) return;
  const s = roadFrom(roadStart, roadHover[0], roadHover[1]);
  if (s.s1 - s.s0 < 1) return;
  const ok = !roadProblem(s), R = segRect(s, RW);
  const C = [[R[0], R[2]], [R[1], R[2]], [R[1], R[3]], [R[0], R[3]]];
  for (let k = 0; k < 4; k++){
    const p = prj(C[k][0], C[k][1], 0), q = prj(C[(k + 1) % 4][0], C[(k + 1) % 4][1], 0);
    if (ok) lineS(p[0], p[1], q[0], q[1], 1, true);
    else { const n = Math.ceil(Math.hypot(q[0] - p[0], q[1] - p[1])); for (let st = 0; st <= n; st += 4) fput(Math.floor(p[0] + (q[0] - p[0]) * st / n), Math.floor(p[1] + (q[1] - p[1]) * st / n), 1); }
  }
  const e = segPt(s, roadStart[s.o === 'a' ? 0 : 1] === s.s0 ? s.s1 : s.s0); cross(e[0], e[1]);
}

/* ================= pointeur : se balader, zoomer, tourner, choisir ================= */
let drag = null;
const touches = new Map();
let pinch = null;
const keys = new Set();
function toLogical(e){ if (OV_ON) return [-9999, -9999]; const r = scene.getBoundingClientRect(); return [Math.floor((e.clientX - r.left) / r.width * W), Math.floor((e.clientY - r.top) / r.height * H)]; }
function catUnder(lx, ly){
  let best = null, bd = 10;
  for (const c of CATS){ if (!c.screen) continue; const dx = c.screen[0] - lx, dy = c.screen[1] - 3 - ly; const d = Math.hypot(dx, dy * 1.3); if (d < bd){ bd = d; best = c; } }
  return best;
}
function lotUnder(lx, ly){ const [a, b] = unprj(lx + .5, ly + .5); return lotAt(a, b); }
scene.addEventListener('contextmenu', e => e.preventDefault());
scene.addEventListener('pointerdown', e => {
  if (e.pointerType === 'touch'){
    touches.set(e.pointerId, [e.clientX, e.clientY]);
    if (touches.size === 2){
      const [p, q] = [...touches.values()];
      pinch = { d: Math.hypot(q[0] - p[0], q[1] - p[1]), ang: Math.atan2(q[1] - p[1], q[0] - p[0]), phi: cam.phi, z: Z };
      drag = null; cam.target = null; cam.follow = null; return;
    }
  }
  const turn = e.pointerType === 'mouse' && (e.button === 2 || (e.button === 0 && e.shiftKey));
  if (e.pointerType === 'mouse' && e.button !== 0 && e.button !== 2) return;
  drag = { x: e.clientX, y: e.clientY, a: cam.a, b: cam.b, phi: cam.phi, moved: false, id: e.pointerId, turn };
  try { scene.setPointerCapture(e.pointerId); } catch (_) {}
});
scene.addEventListener('pointermove', e => {
  const [lx, ly] = toLogical(e);
  if (e.pointerType === 'mouse') pointer = [lx, ly];
  if (e.pointerType === 'touch' && touches.has(e.pointerId)) touches.set(e.pointerId, [e.clientX, e.clientY]);
  if (pinch && touches.size === 2){
    const [p, q] = [...touches.values()];
    const d = Math.hypot(q[0] - p[0], q[1] - p[1]), ang = Math.atan2(q[1] - p[1], q[0] - p[0]);
    const mx = (p[0] + q[0]) / 2, my = (p[1] + q[1]) / 2;
    { const nz = clamp(pinch.z * d / pinch.d, ZMIN(), KMAX); ZANCH = [mx, my]; ZT = nz; setZNow(nz); }
    let da = ang - pinch.ang; while (da > Math.PI) da -= TAU; while (da < -Math.PI) da += TAU;
    if (Math.abs(da) > .08 || pinch.turning){ pinch.turning = true; cam.phi = pinch.phi - da; cam.phiT = null; }
    return;
  }
  if (drag && drag.id === e.pointerId){
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (!drag.moved && Math.hypot(dx, dy) > 5){ drag.moved = true; scene.classList.add(drag.turn ? 'turning' : 'panning'); cam.target = null; cam.follow = null; }
    if (drag.moved){
      if (drag.turn){ cam.phi = drag.phi + dx * 0.008; cam.phiT = null; }
      else {
        const s = DPR / Z, sv = { a: cam.a, b: cam.b };
        cam.a = drag.a; cam.b = drag.b; setProj();
        const g = groundDelta(dx * s, dy * s);
        cam.a = drag.a - g[0]; cam.b = drag.b - g[1]; clampCam();
        if (!isFinite(cam.a)) Object.assign(cam, sv);
      }
    }
  }
  if (!drag || !drag.moved){
    hoverCat = state.mode === 'walk' ? catUnder(lx, ly) : null;
    hoverLot = (state.mode === 'build' || state.mode === 'demolish') ? lotUnder(lx, ly) : null;
    roadHover = state.mode === 'road' ? unprj(lx + .5, ly + .5) : null;
    scene.classList.toggle('pick', !!hoverCat);
    updateGhost();
    if (state.mode === 'build'){
      const h = $('modeHint');
      if (hoverLot && !hoverLot.type && !hoverLot.blocked){ const nb = neighborOf(hoverLot, state.buildType), why = canBuildHere(hoverLot); h.textContent = why || ((TYPES[state.buildType].name) + ' : ' + costOf(state.buildType) + ' laine · voisinage ' + (nb.s > 0 ? '+' : '') + nb.s + (nb.why.length ? ' (' + nb.why.join(', ') + ')' : '')); }
      else h.textContent = HINTS.build;
    }
    if (typeof showTip === 'function') showTip(e, lx, ly);
  }
});
function endPointer(e){
  if (e.pointerType === 'touch'){ touches.delete(e.pointerId); if (touches.size < 2 && pinch){ pinch = null; drag = null; snapZoom(); return; } }
  const d = drag; drag = null; scene.classList.remove('panning', 'turning');
  if (!d || d.moved || d.id !== e.pointerId || d.turn || e.type === 'pointercancel') return;
  if (OV_ON){ if (state.mode !== 'walk') toast('Rapproche-toi pour construire ou démolir.'); return; }
  const [lx, ly] = toLogical(e);
  if (state.mode === 'walk'){ const c = catUnder(lx, ly); if (c) openChat(c); return; }
  if (state.mode === 'road'){
    const g = unprj(lx + .5, ly + .5);
    if (!roadStart){ roadStart = snapRoadPoint(g[0], g[1]); toast('Départ posé. Clique maintenant là où la route doit arriver.'); return; }
    const s = roadFrom(roadStart, g[0], g[1]), err = addRoad(s);
    if (err){ toast(err); return; }
    roadStart = null; toast('Route tracée.' + (s.o === 'a' || s.o === 'b' ? '' : '')); return;
  }
  const lot = lotUnder(lx, ly);
  if (state.mode === 'demolish' && (!lot || !lot.type)){
    const g = unprj(lx + .5, ly + .5), k = userRoadAt(g[0], g[1]);
    if (k >= 0){ removeRoad(k); toast('Route démolie.'); return; }
  }
  if (!lot){ toast(state.mode === 'build' ? 'On ne peut construire que sur les terrains libres.' : 'Rien à démolir ici.'); return; }
  if (state.mode === 'build') placeOn(lot); else demolish(lot);
}
scene.addEventListener('pointerup', endPointer);
scene.addEventListener('pointercancel', endPointer);
scene.addEventListener('pointerleave', () => { pointer = null; hoverCat = null; if (!drag) { hoverLot = null; updateGhost(); } });
let wheelAcc = 0, wheelT = 0, wheelSnap = 0;
scene.addEventListener('wheel', e => {
  e.preventDefault();
  const now2 = performance.now(); if (now2 - wheelT > 400) wheelAcc = 0; wheelT = now2;
  if (e.ctrlKey){ const nz = clamp(ZT * Math.exp(-e.deltaY * .012), ZMIN(), KMAX); setZoom(nz, e.clientX, e.clientY); clearTimeout(wheelSnap); wheelSnap = setTimeout(snapZoom, 220); return; }
  wheelAcc += e.deltaY * (e.deltaMode === 1 ? 30 : 1);
  if (wheelAcc < -60){ zoomStep(1, e.clientX, e.clientY); wheelAcc = 0; }
  else if (wheelAcc > 60){ zoomStep(-1, e.clientX, e.clientY); wheelAcc = 0; }
}, { passive: false });

const typing = (e) => e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA');
window.addEventListener('keydown', e => {
  if (!typing(e) && (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z'){ e.preventDefault(); undo(); return; }
  if (typing(e) || e.metaKey || e.ctrlKey || e.altKey) return;
  const k = e.key.toLowerCase();
  if (['arrowleft','arrowright','arrowup','arrowdown','q','a','z','w','s','d'].includes(k)){ if (e.target === ibar) return; keys.add(k); cam.target = null; cam.follow = null; e.preventDefault(); }
  else if (k === 'escape'){ if (state.chatCat) closeChat(); else if (roadStart) roadStart = null; else setMode('walk'); }
  else if (k === 'b') setMode(state.mode === 'build' ? 'walk' : 'build');
  else if (k === 'r') rotateBy(e.shiftKey ? -Math.PI / 4 : Math.PI / 4);
  else if (k === 'n') { const n = Math.round(cam.phi / TAU); cam.phiT = n * TAU; }
  else if (k === '+' || k === '=') zoomStep(1);
  else if (k === '-' || k === '_') zoomStep(-1);
});
window.addEventListener('keyup', e => keys.delete(e.key.toLowerCase()));
window.addEventListener('blur', () => keys.clear());
function stepKeys(dt){
  let dx = 0, dy = 0;
  if (keys.has('arrowleft') || keys.has('q') || keys.has('a')) dx -= 1;
  if (keys.has('arrowright') || keys.has('d')) dx += 1;
  if (keys.has('arrowup') || keys.has('z') || keys.has('w')) dy -= 1;
  if (keys.has('arrowdown') || keys.has('s')) dy += 1;
  if (dx || dy){ const s = 170 * dt * KDEF / Z; const g = groundDelta(dx * s, dy * s); cam.a += g[0]; cam.b += g[1]; clampCam(); }
}
