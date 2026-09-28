/* ================= ambiance sonore, entierement fabriquee par le navigateur ================= */
const SND = { on: false, ctx: null, want: false, amb: 0 };
try { SND.want = localStorage.getItem('cold-kutty-son') === '1'; } catch (_) {}
function sndStart(){
  if (SND.ctx){ if (SND.ctx.state === 'suspended') SND.ctx.resume(); return true; }
  const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return false;
  const ctx = new AC(), sr = ctx.sampleRate; SND.ctx = ctx;
  const master = ctx.createGain(); master.gain.value = 0; master.connect(ctx.destination); SND.master = master;
  const mkBuf = (fn) => { const b = ctx.createBuffer(1, sr * 2, sr); fn(b.getChannelData(0)); return b; };
  SND.white = mkBuf(d => { for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; });
  SND.brown = mkBuf(d => { let l = 0; for (let i = 0; i < d.length; i++){ l = (l + .02 * (Math.random() * 2 - 1)) / 1.02; d[i] = l * 3.5; } });
  const loop = (buf, type, f, q) => { const s = ctx.createBufferSource(); s.buffer = buf; s.loop = true; const fl = ctx.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q || .7; const g = ctx.createGain(); g.gain.value = 0; s.connect(fl); fl.connect(g); g.connect(master); s.start(); return { fl, g }; };
  SND.waves = loop(SND.brown, 'lowpass', 520); SND.city = loop(SND.brown, 'bandpass', 170, .9);
  SND.rain = loop(SND.white, 'highpass', 2400); SND.wind = loop(SND.white, 'bandpass', 420, 1.6);
  SND.mus = ctx.createGain(); SND.mus.gain.value = 0; SND.mus.connect(master);
  SND.musU = ctx.createGain(); SND.musC = ctx.createGain(); SND.musU.gain.value = 0; SND.musC.gain.value = 0; SND.musU.connect(SND.mus); SND.musC.connect(SND.mus);
  SND.fx = ctx.createGain(); SND.fx.gain.value = .9; SND.fx.connect(master);
  SND.next = ctx.currentTime + .15; SND.step = 0; SND.bell = 0;
  return true;
}
const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);
function tone(dest, f, t0, dur, type, vol, att, f2){
  const c = SND.ctx, o = c.createOscillator(), g = c.createGain();
  o.type = type || 'sine'; o.frequency.setValueAtTime(f, t0); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(vol, t0 + (att || .008)); g.gain.exponentialRampToValueAtTime(.0001, t0 + dur);
  o.connect(g); g.connect(dest); o.start(t0); o.stop(t0 + dur + .05);
}
function pad(dest, f, t0, dur, vol){
  const c = SND.ctx, o = c.createOscillator(), fl = c.createBiquadFilter(), g = c.createGain();
  o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = (Math.random() - .5) * 14; fl.type = 'lowpass'; fl.frequency.value = 1100;
  g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(vol, t0 + .35); g.gain.setValueAtTime(vol, t0 + dur - .3); g.gain.linearRampToValueAtTime(.0001, t0 + dur);
  o.connect(fl); fl.connect(g); g.connect(dest); o.start(t0); o.stop(t0 + dur + .05);
}
function hit(dest, t0, dur, type, f, vol, f2){
  const c = SND.ctx, s = c.createBufferSource(), fl = c.createBiquadFilter(), g = c.createGain();
  s.buffer = SND.white; fl.type = type; fl.frequency.setValueAtTime(f, t0); if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t0 + dur);
  g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(.0001, t0 + dur);
  s.connect(fl); fl.connect(g); g.connect(dest); s.start(t0, Math.random()); s.stop(t0 + dur + .05);
}
// musique : rock'n'roll a l'ouest, marche et choeurs a l'est, en fondu selon l'endroit ou l'on regarde
const BLUES = [0, 0, 0, 0, 5, 5, 0, 0, 7, 5, 0, 7], BOOGIE = [0, 4, 7, 9, 10, 9, 7, 4];
const MARCH = [0, 5, 7, 0], SNARE = [1, 0, 1, 1, 1, 0, 1, 1];
function schedMusic(){
  const c = SND.ctx, ahead = c.currentTime + .35;
  while (SND.next < ahead){
    const k = SND.step, t0 = SND.next;
    // ouest : 144 bpm, croches swinguees
    const e8 = k % 8, bar = Math.floor(k / 8) % 12, root = 41 + BLUES[bar], sw = (e8 & 1) ? .07 : 0;
    const U = SND.musU;
    tone(U, midi(root + BOOGIE[e8] - 12 + 12), t0 + sw, .19, 'triangle', .16);
    hit(U, t0 + sw, .035, 'highpass', 7000, (e8 & 1) ? .05 : .03);
    if (e8 === 2 || e8 === 6){ hit(U, t0, .11, 'bandpass', 1800, .09); for (const n of [0, 4, 7, 10]) tone(U, midi(root + 24 + n), t0 + .01, .16, 'triangle', .035); }
    if (e8 === 0 || e8 === 4) tone(U, 110, t0, .16, 'sine', .22, .004, 45);
    // est : meme pulsation, marche en re mineur, choeurs tenus
    const C = SND.musC, mb2 = Math.floor(k / 8) % 4, mr = 50 + MARCH[mb2], minor = MARCH[mb2] !== 7;
    if (e8 === 0) for (const n of [0, minor ? 3 : 4, 7, 12]) pad(C, midi(mr + n), t0, 8 * .208, .03);
    if (e8 === 0 || e8 === 4){ tone(C, midi(mr - 12), t0, .3, 'sawtooth', .07); tone(C, 90, t0, .2, 'sine', .2, .004, 40); }
    if (e8 === 2 || e8 === 6) for (const n of [0, minor ? 3 : 4, 7]) tone(C, midi(mr + 12 + n), t0, .12, 'square', .012);
    if (SNARE[e8]) hit(C, t0, .09, 'bandpass', 2100, .05);
    SND.step++; SND.next += .208;
  }
}
function sndAmbience(t){
  const c = SND.ctx, now = c.currentTime, set = (p, v) => p.setTargetAtTime(v, now, .6);
  let sea = 0; for (let k = 0; k < 16; k++){ const ang = k / 16 * TAU, r = 60 + (k & 1) * 70; if (typeAt(cam.a + Math.cos(ang) * r, cam.b + Math.sin(ang) * r) === T_SEA) sea++; }
  sea /= 16;
  let built = 0; for (const l of LOTS) if (l.type && Math.abs(l.ca - cam.a) < 160 && Math.abs(l.cb - cam.b) < 160) built++;
  const far = OV_ON ? 1 : clamp((KDEF - Z) / KDEF, 0, 1), night = NIGHT;
  set(SND.waves.g.gain, .05 + .32 * sea + .08 * far);
  set(SND.city.g.gain, (.14 * Math.min(1, built / 28)) * (1 - night * .55) * (1 - far * .7));
  const wx = WEATHER.shown, k = WEATHER.k;
  set(SND.rain.g.gain, wx === 'pluie' ? .2 * k : 0);
  set(SND.wind.g.gain, wx === 'neige' || wx === 'brouillard' ? .07 * k : .012);
  const us = clamp((WALL_A - cam.a) / 160 + .5, 0, 1);
  set(SND.musU.gain, us); set(SND.musC.gain, 1 - us);
  set(SND.mus.gain, (state.chatCat ? .22 : .42) * (1 - night * .35) * (OV_ON ? .6 : 1));
  set(SND.master.gain, SND.on ? .7 : 0);
}
function stepSound(dt, t){
  if (!SND.on || !SND.ctx) return;
  schedMusic();
  SND.amb += dt; if (SND.amb > .25){ SND.amb = 0; sndAmbience(t); }
  // cloche du passage a niveau
  const cr = CROSSINGS.find(x => x.closed && Math.abs(x.A - cam.a) < 220 && Math.abs(RAIL_B - cam.b) < 200);
  if (cr && t > SND.bell){ SND.bell = t + .45; const v = .05 * (1 - Math.hypot(cr.A - cam.a, RAIL_B - cam.b) / 320); if (v > 0) tone(SND.fx, 1250, SND.ctx.currentTime, .09, 'square', v); }
}
HOOKS.step.push(stepSound);
// bruitages ponctuels
function sfx(kind, a, b){
  if (!SND.on || !SND.ctx) return;
  const c = SND.ctx, t0 = c.currentTime + .01, F = SND.fx;
  const dist = a == null ? 0 : Math.hypot(a - cam.a, b - cam.b), att = clamp(1 - dist / 420, .12, 1);
  if (kind === 'fw'){
    tone(F, 700, t0, 1.2, 'sine', .018 * att, .05, 1700);
    const tb = t0 + 1.3; hit(F, tb, .6, 'lowpass', 900, .3 * att, 200); tone(F, 70, tb, .35, 'sine', .25 * att, .004, 35);
    for (let i = 0; i < 9; i++) hit(F, tb + .15 + Math.random() * .7, .03, 'highpass', 3000, .06 * att);
  } else if (kind === 'build'){
    for (let i = 0; i < 4; i++) hit(F, t0 + i * .2, .07, 'bandpass', 900 + i * 60, .22);
    tone(F, 880, t0 + 1, .5, 'sine', .05); tone(F, 1320, t0 + 1.1, .6, 'sine', .04);
  } else if (kind === 'demolish'){
    hit(F, t0, 1.1, 'lowpass', 1400, .4, 180); tone(F, 60, t0, .5, 'sine', .3, .004, 30);
  } else if (kind === 'usc' || kind === 'ccp' || kind === 'neutre'){
    const N = kind === 'usc' ? [72, 76, 79, 84] : kind === 'ccp' ? [62, 69, 74] : [79, 76];
    N.forEach((n, i) => tone(F, midi(n), t0 + i * (kind === 'ccp' ? .16 : .09), kind === 'ccp' ? .3 : .18, kind === 'ccp' ? 'square' : 'triangle', kind === 'ccp' ? .025 : .06));
  } else if (kind === 'event'){ tone(F, 880, t0, .35, 'sine', .07); tone(F, 1320, t0 + .12, .45, 'sine', .05); }
  else if (kind === 'launch'){ hit(F, t0, 3.5, 'lowpass', 160, .35, 900); tone(F, 55, t0, 3, 'sawtooth', .06, .5, 110); }
  else if (kind === 'paper'){ for (let i = 0; i < 3; i++) hit(F, t0 + i * .07, .06, 'bandpass', 3200, .08); }
  else if (kind === 'wall'){ for (let i = 0; i < 12; i++) hit(F, t0 + i * .08, .09, 'bandpass', 700, .12 + i * .01); tone(F, 49, t0 + 1, 1.2, 'sine', .3, .01, 40); }
  else if (kind === 'click'){ tone(F, 660, t0, .05, 'square', .02); }
}
function setSound(on){
  if (on && !sndStart()){ toast('Le son n’est pas disponible dans ce navigateur.'); on = false; }
  SND.on = on; SND.want = on;
  try { localStorage.setItem('cold-kutty-son', on ? '1' : '0'); } catch (_) {}
  const b = $('btnSound'); b.setAttribute('aria-pressed', String(on)); b.setAttribute('aria-label', on ? 'Couper le son' : 'Activer le son');
  if (SND.ctx){ const now = SND.ctx.currentTime; SND.master.gain.setTargetAtTime(on ? .7 : 0, now, .15); if (on){ SND.next = Math.max(SND.next, now + .1); sndAmbience(NOW_T); } }
}
$('btnSound').addEventListener('click', () => setSound(!SND.on));
// le navigateur exige un geste : si le son etait allume la derniere fois, on le rallume au premier clic
if (SND.want){ $('btnSound').setAttribute('aria-pressed', 'true'); window.addEventListener('pointerdown', () => { if (SND.want && !SND.on) setSound(true); }, { once: true }); }
document.addEventListener('visibilitychange', () => { if (!SND.ctx) return; if (document.hidden) SND.ctx.suspend(); else if (SND.on) SND.ctx.resume(); });

/* ================= mini-carte ================= */
const MAP = { a0: IS.ca - IS.ra - 24, a1: IS.ca + IS.ra + 24, b0: LH.b - 24, b1: IS.cb + IS.rb + 30, key: '', base: null, t: 0, drag: false, peers: [] };
const mapCv = $('mapCv'), mapCtx = mapCv.getContext('2d');
MAP.sx = mapCv.width / (MAP.a1 - MAP.a0); MAP.sy = mapCv.height / (MAP.b1 - MAP.b0);
const mapXY = (a, b) => [(a - MAP.a0) * MAP.sx, (b - MAP.b0) * MAP.sy];
function mapBase(){
  const w = mapCv.width, h = mapCv.height, img = mapCtx.createImageData(w, h), d = img.data;
  const COL = { [T_SEA]: [36, 92, 150], [T_GRASS]: [98, 150, 66], [T_BEACH]: [226, 207, 150], [T_ROAD]: [132, 134, 140], [T_WALK]: [170, 168, 160], [T_PATH]: [150, 140, 110], [T_PIER]: [123, 82, 49], [T_ROCK]: [110, 107, 102], [T_STRIP]: [196, 182, 150], [T_TARMAC]: [90, 92, 98], [T_APRON]: [150, 150, 144], [T_RAIL]: [80, 70, 64], [T_QUAY]: [185, 182, 173] };
  const deb = GAME.mode === 'deb' && !DEB.wall;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++){
    const a = MAP.a0 + (x + .5) / MAP.sx, b = MAP.b0 + (y + .5) / MAP.sy, ty = typeAt(a, b), i = (y * w + x) * 4;
    let c = COL[ty] || COL[T_GRASS];
    if (ty === T_SEA){ const sd = gSea[cellOf(a, b)] || 99; if (sd < 16) c = [58, 140, 190]; }
    if (deb && ty !== T_SEA && !inFront(a)) c = [c[0] * .72 + 40, c[1] * .72 + 40, c[2] * .72 + 40];
    // version 1-bit : carte en noir et blanc, la mer noire, les routes claires
    if (!COLOR){ const g = ty === T_SEA ? 0 : ty === T_ROAD || ty === T_WALK || ty === T_QUAY || ty === T_TARMAC ? 150 : ty === T_BEACH || ty === T_STRIP ? 90 : 45; c = [g, g, g]; }
    d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255;
  }
  mapCtx.putImageData(img, 0, 0);
  for (const l of LOTS){
    if (!l.type) continue;
    const [x0, y0] = mapXY(l.a0, l.b0), [x1, y1] = mapXY(l.a1, l.b1);
    mapCtx.fillStyle = !COLOR ? (l.type === 'parc' ? '#777777' : '#ffffff') : l.type === 'parc' ? '#3d7a2e' : l.side === 'usc' ? '#3e5bbf' : '#c8424f';
    mapCtx.fillRect(Math.round(x0), Math.round(y0), Math.max(1, Math.round(x1 - x0)), Math.max(1, Math.round(y1 - y0)));
  }
  if (wallUp()){ const [x, y0] = mapXY(WALL_A, IS.cb - IS.rb), [, y1] = mapXY(WALL_A, IS.cb + IS.rb); mapCtx.fillStyle = COLOR ? '#1f1d24' : '#ffffff'; mapCtx.fillRect(Math.round(x) - 1, y0, 2, y1 - y0); }
  MAP.base = mapCtx.getImageData(0, 0, w, h);
}
function mapPoly(ctx2, pts, style, fill){
  ctx2.beginPath(); pts.forEach(([a, b], i) => { const [x, y] = mapXY(a, b); if (i) ctx2.lineTo(x, y); else ctx2.moveTo(x, y); }); ctx2.closePath();
  if (fill){ ctx2.fillStyle = fill; ctx2.fill(); }
  ctx2.strokeStyle = style; ctx2.lineWidth = 1.5; ctx2.stroke();
}
function viewCorners(){
  if (OV_ON) return [[MAP.a0 + 20, MAP.b0 + 20], [MAP.a1 - 20, MAP.b0 + 20], [MAP.a1 - 20, MAP.b1 - 20], [MAP.a0 + 20, MAP.b1 - 20]];
  const vw = window.innerWidth, vh = window.innerHeight;
  return [[0, 0], [vw, 0], [vw, vh], [0, vh]].map(([x, y]) => screenToWorld(x, y));
}
function drawMap(t){
  if (!document.body.classList.contains('has-map')) return;
  const key = TOWN_VER + ':' + GAME.mode + ':' + Math.round(DEB.front.usc) + ':' + Math.round(DEB.front.ccp) + ':' + DEB.wall;
  if (key !== MAP.key || !MAP.base){ MAP.key = key; mapBase(); }
  if (t - MAP.t < .1) return; MAP.t = t;
  mapCtx.putImageData(MAP.base, 0, 0);
  for (const p of MAP.peers) if (p.view) mapPoly(mapCtx, p.view, p.side === 'ccp' ? '#ffb3b3' : '#b3c4ff', 'rgba(255,255,255,.12)');
  mapPoly(mapCtx, viewCorners(), '#fffaf0', 'rgba(255,250,240,.18)');
  // les trains et le ferry, en petits points
  mapCtx.fillStyle = '#ffd23f';
  if (typeof ferryPos === 'function'){ const [a, b] = ferryPos(t), [x, y] = mapXY(a, b); mapCtx.fillRect(Math.round(x) - 1, Math.round(y) - 1, 3, 3); }
}
function mapPick(e){
  const r = mapCv.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * mapCv.width, y = (e.clientY - r.top) / r.height * mapCv.height;
  const a = MAP.a0 + x / MAP.sx, b = MAP.b0 + y / MAP.sy;
  if (state.chatCat) closeChat();
  cam.target = null; cam.follow = null; cam.a = a; cam.b = b; clampCam();
  if (OV_ON) setZoom(KDEF * .8);
}
mapCv.addEventListener('pointerdown', (e) => { MAP.drag = true; try { mapCv.setPointerCapture(e.pointerId); } catch (_) {} mapPick(e); });
mapCv.addEventListener('pointermove', (e) => { if (MAP.drag) mapPick(e); });
mapCv.addEventListener('pointerup', () => { MAP.drag = false; });
mapCv.addEventListener('pointercancel', () => { MAP.drag = false; });
function mapFit(){ document.body.classList.toggle('has-map', window.innerWidth >= 1101 && window.innerHeight >= 620); }
window.addEventListener('resize', mapFit); mapFit();
HOOKS.after.push(drawMap);

/* ================= fiche d'un batiment au survol ================= */
const TIP_H = { maison: 13, immeuble: 18, artdeco: 42, stalinien: 44, gare: 18, stade: 8, parc: 3, fontaine: 5, usine: 22, bulbes: 28, fusee: 40, radio: 48, cirque: 16, tribune: 10, statue: 22, panneau: 20, chateau: 32, mairie: 22, peuple: 24, supermarche: 11, grandmagasin: 20, metro: 14, kolkhoze: 12, kiosque: 10, cinema: 15, bowling: 11, drivein: 12, diner: 9, motel: 12, station: 9, epicerie: 10 };
function tipHeight(l){ const h = TIP_H[l.type] || 14; return l.type === 'immeuble' ? [16, 24, 34][(l.lvl || 1) - 1] : l.type === 'maison' ? [13, 18, 18][(l.lvl || 1) - 1] : h; }
function lotPick(lx, ly){
  for (let z = 50; z >= 0; z -= 1){
    const [a, b] = unprj(lx + .5, ly + .5 + z), l = lotAt(a, b);
    if (l && l.type && z <= tipHeight(l) && inFront(l.ca)) return l;
  }
  return null;
}
const tipEl = $('tip');
let tipLot = null;
function showTip(e, lx, ly){
  if (state.mode !== 'walk' || OV_ON || hoverCat || e.pointerType !== 'mouse' || document.body.classList.contains('photo')){ tipEl.hidden = true; tipLot = null; return; }
  const l = lotPick(lx, ly);
  if (!l){ tipEl.hidden = true; tipLot = null; return; }
  if (l !== tipLot){
    tipLot = l; tipEl.textContent = '';
    const head = document.createElement('div'); head.className = 'tip-head';
    const nm = document.createElement('b'); nm.textContent = lvlName(l);
    const sd = document.createElement('span'); sd.className = 'tip-side ' + l.side; sd.textContent = l.side === 'ccp' ? 'CCR' : 'USC';
    head.append(nm, sd); tipEl.append(head);
    const row = (txt, cls) => { const p = document.createElement('div'); if (cls) p.className = cls; p.textContent = txt; tipEl.append(p); };
    if (l.buildT && NOW_T < l.buildT + BUILD_DUR) row('En chantier…');
    if (LVL_POP[l.type]){ const lv = l.lvl || 1; row('Niveau ' + lv + ' sur 3 · ' + LVL_POP[l.type][lv - 1] + ' habitants'); }
    const E = ECO[l.type];
    if (E){ const bits = []; if (E[0]) bits.push((E[0] > 0 ? '+' : '') + E[0] + ' croquettes'); if (E[1]) bits.push((E[1] > 0 ? '+' : '') + E[1] + ' laine'); if (bits.length) row(bits.join(' · ') + ' par minute'); if (E[2]) row((E[2] > 0 ? '+' : '') + E[2] + ' loisirs pour le quartier'); }
    const nb = neighborOf(l, l.type);
    if (nb.s || nb.why.length) row('Voisinage ' + (nb.s > 0 ? '+' : '') + nb.s + (nb.why.length ? ' : ' + nb.why.join(', ') : ''), 'tip-mute');
    if (CAMPS[l.side] && CAMPS[l.side].want === l.type) row('Les habitants en redemandent', 'tip-want');
  }
  tipEl.hidden = false;
  const x = Math.min(e.clientX + 16, window.innerWidth - tipEl.offsetWidth - 8), y = Math.min(e.clientY + 18, window.innerHeight - tipEl.offsetHeight - 8);
  tipEl.style.transform = 'translate(' + Math.round(x) + 'px,' + Math.round(y) + 'px)';
}
scene.addEventListener('pointerleave', () => { tipEl.hidden = true; tipLot = null; });
scene.addEventListener('pointerdown', () => { tipEl.hidden = true; tipLot = null; });

/* ================= mode photo ================= */
const PHOTO = { on: false, filter: 'couleur', dl: undefined };
const PHOTO_CSS = { couleur: '', sepia: 'sepia(.85) contrast(1.05)', journal: 'grayscale(1) contrast(1.35) brightness(1.05)', vintage: 'sepia(.35) saturate(1.35) contrast(1.08) brightness(1.04)' };
function setPhoto(on){
  PHOTO.on = on; document.body.classList.toggle('photo', on);
  $('photoBar').hidden = !on; $('btnPhoto').setAttribute('aria-pressed', String(on));
  if (on){ if (state.chatCat) closeChat(); $('paper').hidden = true; }
  scene.style.filter = on ? PHOTO_CSS[PHOTO.filter] : '';
  if (on) setTimeout(() => $('photoShoot').focus({ preventScroll: true }), 30);
}
$('btnPhoto').addEventListener('click', () => setPhoto(!PHOTO.on));
$('photoQuit').addEventListener('click', () => setPhoto(false));
for (const b of document.querySelectorAll('[data-pf]')) b.addEventListener('click', () => {
  PHOTO.filter = b.dataset.pf; scene.style.filter = PHOTO_CSS[PHOTO.filter];
  for (const o of document.querySelectorAll('[data-pf]')) o.setAttribute('aria-checked', String(o === b));
});
window.addEventListener('keydown', (e) => { if (e.key === 'Escape'){ if (PHOTO.on) setPhoto(false); else if (!$('paper').hidden) closePaper(); } });
// le filtre est applique a la main pour que la photo enregistree ressemble a l'apercu dans tous les navigateurs
function filterPixels(d, f){
  for (let i = 0; i < d.length; i += 4){
    let r = d[i], g = d[i + 1], b = d[i + 2];
    if (f === 'sepia'){ const sr = r * .393 + g * .769 + b * .189, sg = r * .349 + g * .686 + b * .168, sb = r * .272 + g * .534 + b * .131; r = r + (sr - r) * .85; g = g + (sg - g) * .85; b = b + (sb - b) * .85; r = (r - 128) * 1.05 + 128; g = (g - 128) * 1.05 + 128; b = (b - 128) * 1.05 + 128; }
    else if (f === 'journal'){ let l = r * .3 + g * .59 + b * .11; l = ((l - 128) * 1.35 + 128) * 1.05; r = l * .98 + 4; g = l * .95 + 3; b = l * .88; }
    else if (f === 'vintage'){ const sr = r * .393 + g * .769 + b * .189, sg = r * .349 + g * .686 + b * .168, sb = r * .272 + g * .534 + b * .131; r = r + (sr - r) * .35; g = g + (sg - g) * .35; b = b + (sb - b) * .35; const l = r * .3 + g * .59 + b * .11; r = l + (r - l) * 1.35; g = l + (g - l) * 1.35; b = l + (b - l) * 1.35; r = ((r - 128) * 1.08 + 128) * 1.04; g = ((g - 128) * 1.08 + 128) * 1.04; b = ((b - 128) * 1.08 + 128) * 1.04; }
    d[i] = clamp(r, 0, 255); d[i + 1] = clamp(g, 0, 255); d[i + 2] = clamp(b, 0, 255);
  }
}
async function photoCanvas(){
  const vw = devW, vh = devH, pic = document.createElement('canvas');
  const pad = Math.round(Math.min(vw, vh) * .035), band = Math.round(Math.min(vw, vh) * .09);
  pic.width = vw + pad * 2; pic.height = vh + pad + band;
  const g = pic.getContext('2d'); g.imageSmoothingEnabled = false;
  g.fillStyle = '#f6f0e1'; g.fillRect(0, 0, pic.width, pic.height);
  if (OV_ON) g.drawImage(scene, 0, 0, scene.width, scene.height, pad, pad, vw, vh);
  else { const cw = vw / Z, ch = vh / Z; g.drawImage(scene, (W - cw) / 2, (H - ch) / 2, cw, ch, pad, pad, vw, vh); }
  if (PHOTO.filter !== 'couleur'){ const id = g.getImageData(pad, pad, vw, vh); filterPixels(id.data, PHOTO.filter); g.putImageData(id, pad, pad); }
  try { await Promise.all([document.fonts.load('48px Yellowtail'), document.fonts.load('600 20px "IBM Plex Mono"')]); } catch (_) {}
  g.fillStyle = '#2a2622'; g.textBaseline = 'middle';
  g.font = Math.round(band * .5) + 'px Yellowtail, cursive'; g.fillText(COLOR ? 'Cold Kutty Town' : 'Old Kutty Town', pad, vh + pad + band / 2);
  g.font = '600 ' + Math.round(band * .2) + 'px "IBM Plex Mono", monospace'; g.textAlign = 'right';
  g.fillText(MONTHS[CAL.m].toUpperCase() + ' ' + CAL.y + ' · ' + String(Math.floor(CLOCK.h)).padStart(2, '0') + ' H ' + String(Math.floor((CLOCK.h % 1) * 60)).padStart(2, '0'), pic.width - pad, vh + pad + band / 2);
  return pic;
}
async function photoShoot(){
  const btn = $('photoShoot'); btn.disabled = true;
  try {
    if (!OV_ON) render(NOW_T);
    const pic = await photoCanvas();
    const blob = await new Promise(r => pic.toBlob(r, 'image/png'));
    if (!blob){ toast('La photo n’a pas pu être préparée.'); return; }
    sfx('click');
    const name = 'cold-kutty-town-' + MONTHS[CAL.m].normalize('NFD').replace(/[^a-z]/g, '') + '-' + CAL.y + '-' + String(Math.floor(CLOCK.h)).padStart(2, '0') + 'h.png';
    if (PHOTO.dl === undefined){ try { PHOTO.dl = window.claude && typeof window.claude.use === 'function' ? await window.claude.use('downloads') : null; } catch (_) { PHOTO.dl = null; } }
    if (PHOTO.dl){
      try { await PHOTO.dl.save({ filename: name, data: blob }); toast('Photo enregistrée.'); }
      catch (err){ const c = err && err.code; toast(c === 'declined' ? 'Photo non enregistrée.' : c === 'rate_limited' ? 'Une demande d’enregistrement est déjà ouverte.' : 'L’enregistrement n’a pas marché ici : la photo s’affiche, fais clic droit pour l’enregistrer.'); if (c !== 'declined' && c !== 'rate_limited') photoPreview(blob); }
    } else photoPreview(blob);
  } finally { btn.disabled = false; }
}
function photoPreview(blob){
  const url = URL.createObjectURL(blob), box = $('photoPreview'), im = $('photoImg');
  if (im.dataset.url) URL.revokeObjectURL(im.dataset.url);
  im.src = url; im.dataset.url = url; box.hidden = false;
}
$('photoShoot').addEventListener('click', photoShoot);
$('photoPreviewClose').addEventListener('click', () => { $('photoPreview').hidden = true; });
