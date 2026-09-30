import { SH, type Side } from './00-shared.ts';
import { CAMP_SHORT, GAME, GLOBE_ON, HOOKS, RP, TAU, cam, other, reduceMotion, setProj, state } from './01-core.ts';
import { IS, MAP_CONFS, MAP_SIZES, isMapConf, isMapSize, mapScale, type MapConf, type MapSizeKey } from './02-ground.ts';
import { terPct } from './08-territory.ts';
import { CLOCK, MAPV, centerOn, clampCam, setZoom } from './11-render.ts';
import { $, $of, drag, setPaused, setSpeed, toast } from './13-ui.ts';
import { FLAG_HEX, FLAG_HI, flagSVG } from './14-hud.ts';
import { MONTHS } from './17-calendar.ts';
import { asSave, loadGame, newWorld, saveTimer, snapshot, startLanding, type SaveData } from './21-main.ts';
/* ================= accueil : menu du jeu, parties sauvegardees, profil, options ================= */
// Tout est garde dans le navigateur (localStorage) : un index des parties, chaque partie a part, sa vignette,
// le profil et les options. Rien ne part sur un serveur.
export const SAVES_KEY = 'ckt-saves', PROFILE_KEY = 'ckt-profil', OPT_KEY = 'ckt-options', OLD_SAVE_KEY = 'cold-kutty-town-8';
export const slotKey = (id: string) => 'ckt-partie-' + id, thumbKey = (id: string) => 'ckt-vignette-' + id;
// ce qui est range : les options, le profil, et une ligne par partie dans l'index
export interface Options { vol: number; mus: number; speed: number; wx: number }
export interface Profile { name: string; side: string; games: number; wins: number; losses: number; secs: number }
export interface SaveEntry { id: string; name: string; side: Side; at: number; m: number; h: number; pct: [number, number] | null; seed: number; size?: string; conf?: string; won: Side | '' }
export const isSide = (s: unknown): s is Side => s === 'usc' || s === 'ccp';
// une valeur JSON relue du stockage : a verifier avant de s'en servir
export const store = {
  get(k: string, def: unknown): unknown { try { const s = localStorage.getItem(k); return s == null ? def : JSON.parse(s); } catch (_) { return def; } },
  set(k: string, v: string | object){ try { localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v)); return true; } catch (_) { return false; } },
  raw(k: string){ try { return localStorage.getItem(k); } catch (_) { return null; } },
  del(k: string){ try { localStorage.removeItem(k); } catch (_) {} }
};
export const OPT: Options = Object.assign({ vol: 70, mus: 100, speed: 1, wx: 1 }, store.get(OPT_KEY, {}));
export const PROFILE: Profile = Object.assign({ name: '', side: 'usc', games: 0, wins: 0, losses: 0, secs: 0 }, store.get(PROFILE_KEY, {}));
export const saveOpt = () => store.set(OPT_KEY, OPT);
export const saveProfile = () => store.set(PROFILE_KEY, PROFILE);
GAME.slot = undefined; GAME.name = '';

/* ---- les parties ---- */
// l'index est suppose bien forme des qu'il est une liste (c'est ce jeu qui l'ecrit)
export const savesIndex = (): SaveEntry[] => { const ix = store.get(SAVES_KEY, []); return Array.isArray(ix) ? ix : []; };
export const newSlotId = () => Date.now().toString(36) + Math.floor(Math.random() * 1296).toString(36);
// l'ancienne sauvegarde unique devient la premiere partie de la liste
(function migrate(){
  const old = store.raw(OLD_SAVE_KEY); if (!old) return;
  if (!savesIndex().length){
    try {
      // l'ancienne sauvegarde unique : une photo de partie, relue telle quelle (un champ absent donne la valeur par defaut)
      const d: Partial<SaveData> = JSON.parse(old), id = newSlotId();
      if (store.set(slotKey(id), old)){ const e: SaveEntry = { id, name: 'Ma partie', side: d.side === 'ccp' ? 'ccp' : 'usc', at: Date.now(), m: Number(d.cal) | 0, h: Number(d.h) || 10, pct: null, seed: Number(d.seed) | 0, won: d.won || '' }; store.set(SAVES_KEY, [e]); }
    } catch (_) {}
  }
  store.del(OLD_SAVE_KEY);
})();
export function mapThumb(){
  if (!MAPV.cv) return null;
  const c = document.createElement('canvas'); c.width = 120; c.height = 81;
  const g = c.getContext('2d'); if (!g) return null; g.imageSmoothingEnabled = true; g.drawImage(MAPV.cv, 0, 0, 120, 81);
  try { return c.toDataURL('image/png'); } catch (_) { return null; }
}
export let saveWarned = false, thumbAt = 0;
export function saveNow(){
  if (GAME.mode !== 'play' && GAME.mode !== 'over') return;
  if (!GAME.slot) GAME.slot = newSlotId();
  const d = snapshot(); d.name = GAME.name;
  if (!store.set(slotKey(GAME.slot), d)){
    if (!saveWarned){ saveWarned = true; toast('La mémoire du navigateur est pleine : supprime de vieilles parties dans Charger une partie.'); }
    return;
  }
  const ix = savesIndex().filter(e => e.id !== GAME.slot);
  ix.unshift({ id: GAME.slot, name: GAME.name || '', side: GAME.side, at: Date.now(), m: SH.CAL.m, h: CLOCK.h, pct: [terPct('usc'), terPct('ccp')], seed: GAME.seed, size: GAME.size, conf: GAME.conf, won: GAME.winner || '' });
  store.set(SAVES_KEY, ix);
  const now2 = performance.now();
  if (now2 - thumbAt > 30000 || !store.raw(thumbKey(GAME.slot))){ thumbAt = now2; const u = mapThumb(); if (u) store.set(thumbKey(GAME.slot), u); }
}
export function loadSlot(id: string){
  const d = asSave(store.get(slotKey(id), null)), e = savesIndex().find(o => o.id === id);
  if (!d || !loadGame(d)){ toast('Cette sauvegarde est illisible.'); return false; }
  GAME.slot = id; GAME.name = d.name || (e && e.name) || 'Partie';
  closeHome(true);
  return true;
}
export function deleteSlot(id: string){
  store.del(slotKey(id)); store.del(thumbKey(id));
  store.set(SAVES_KEY, savesIndex().filter(e => e.id !== id));
  if (GAME.slot === id) GAME.slot = undefined;
}
// quand la partie a-t-elle ete jouee : sans annee, comme tout le reste du jeu
export function whenLabel(at: number){
  const d = Date.now() - at, m = Math.round(d / 60000);
  if (m < 1) return 'à l’instant';
  if (m < 60) return 'il y a ' + m + ' min';
  const then = new Date(at), today = new Date();
  const hm = String(then.getHours()).padStart(2, '0') + ':' + String(then.getMinutes()).padStart(2, '0');
  if (then.toDateString() === today.toDateString()) return 'aujourd’hui à ' + hm;
  const y = new Date(today); y.setDate(today.getDate() - 1);
  if (then.toDateString() === y.toDateString()) return 'hier à ' + hm;
  return 'le ' + then.getDate() + ' ' + MONTHS[then.getMonth()];
}

/* ---- l'ecran d'accueil ---- */
export let homePage: string | null = null, homeWasPaused = false;
export const PAGES: Record<string, string> = { new: 'pageNew', load: 'pageLoad', profile: 'pageProfile', options: 'pageOptions', rules: 'pageRules' };
export const inGame = () => GAME.mode === 'play' || GAME.mode === 'over';
export function openIntro(page?: string){
  const el = $('intro'), wasOpen = !el.hidden;
  el.hidden = false; document.body.classList.add('home-open');
  if (inGame() && !wasOpen){ homeWasPaused = GAME.paused; setPaused(true); }
  const ix = savesIndex(), last = ix[0];
  $('hmBack').hidden = !inGame(); $('hmQuit').hidden = !inGame();
  $('hmContinue').hidden = inGame() || !last;
  if (last && !inGame()) document.body.dataset.side = last.side;
  if (last) $('hmContinueSub').textContent = last.name + ' · ' + CAMP_SHORT[last.side] + ' · ' + whenLabel(last.at);
  $('hmLoadSub').textContent = ix.length ? ix.length + (ix.length > 1 ? ' parties' : ' partie') : '';
  // un mot d'accueil seulement quand on connait le nom du joueur
  $('homeHello').textContent = PROFILE.name ? 'Bon retour sur l’île, ' + PROFILE.name + '.' : ''; $('homeHello').hidden = !PROFILE.name;
  showPage(page || null);
}
export function closeHome(resume: boolean){
  $('intro').hidden = true; showPage(null); document.body.classList.remove('home-open');
  if (resume && inGame()) setPaused(homeWasPaused);
}
export function showPage(p: string|null){
  homePage = p;
  for (const k in PAGES) $(PAGES[k]).hidden = k !== p;
  for (const b of document.querySelectorAll('.hm[data-page]')) if (b instanceof HTMLElement) b.setAttribute('aria-current', String(b.dataset.page === p));
  if (p === 'new') fillNew(); else if (p === 'load') fillLoad(); else if (p === 'profile') fillProfile(); else if (p === 'options') fillOptions();
}
for (const b of document.querySelectorAll('.hm[data-page]')) if (b instanceof HTMLElement) b.addEventListener('click', () => { SH.sfx('click'); const pg = b.dataset.page ?? null; showPage(homePage === pg ? null : pg); });
$('hmBack').addEventListener('click', () => { SH.sfx('click'); closeHome(true); });
$('hmContinue').addEventListener('click', () => { const last = savesIndex()[0]; if (last) loadSlot(last.id); });
$('hmQuit').addEventListener('click', () => { saveNow(); leaveToHome(); });
$('btnMenu').addEventListener('click', () => openIntro());
window.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape' || $('intro').hidden) return;
  if (homePage) showPage(null); else if (inGame()) closeHome(true);
  e.stopPropagation();
}, true);
// quitter la partie : on revient a l'accueil, une ile tiree au sort en fond
export function leaveToHome(){
  clearTimeout(saveTimer);
  GAME.mode = 'menu'; GAME.slot = undefined; GAME.paused = false; homeWasPaused = false;
  for (const id of ['topbar', 'bottom', 'radio', 'landing', 'endBox', 'chat', 'paper', 'sel']) $(id).hidden = true;
  document.body.classList.remove('playing', 'sel-open');
  state.sel = null; state.selV = null; if (state.chatCat) SH.closeChat();
  setPaused(false);
  homeIsland(1 + Math.floor(Math.random() * 99999));
  openIntro();
}

/* ---- nouvelle partie ---- */
export let pickSide: Side = PROFILE.side === 'ccp' ? 'ccp' : 'usc';
export function markSide(){ for (const o of document.querySelectorAll('#pageNew .side-card')) if (o instanceof HTMLElement) o.setAttribute('aria-checked', String(o.dataset.side === pickSide)); }
for (const b of document.querySelectorAll('#pageNew .side-card')) if (b instanceof HTMLElement) b.addEventListener('click', () => { const s = b.dataset.side; if (isSide(s)) pickSide = s; markSide(); SH.sfx(pickSide); });
export function fillNew(){ markSide(); markMap(); $of('newName', HTMLInputElement).value = 'Partie ' + (savesIndex().length + 1); $of('newSeed', HTMLInputElement).value = ''; }
// taille de la carte et forme du monde (retenues pour la prochaine partie)
export const MAP_KEY = 'ckt-carte';
export let pickSize: MapSizeKey = 'moyenne', pickConf: MapConf = 'une';
{ const m = store.get(MAP_KEY, {}); if (typeof m === 'object' && m !== null){ if ('size' in m && isMapSize(m.size)) pickSize = m.size; if ('conf' in m && isMapConf(m.conf)) pickConf = m.conf; } }
export const MAP_NOTES: Record<MapConf, string> = { une: 'Une grande île, les deux camps débarquent chacun d’un côté.', deux: 'Deux îles face à face, séparées par un détroit : chaque camp débarque sur la sienne. Les barges passent de l’une à l’autre.', quatre: 'Quatre îles séparées par des chenaux. Les barges vont de l’une à l’autre.', archipel: 'Une poignée d’îles de toutes les tailles. Il faudra des barges pour s’étendre.', atoll: 'Un anneau de terre autour d’un lagon, deux passes vers le large et un îlot au milieu.' };
export function markMap(){
  for (const b of $('newSize').children) if (b instanceof HTMLElement) b.setAttribute('aria-checked', String(b.dataset.v === pickSize));
  for (const b of $('newConf').children) if (b instanceof HTMLElement) b.setAttribute('aria-checked', String(b.dataset.v === pickConf));
  const m = MAP_SIZES[pickSize];
  $('newMapNote').textContent = MAP_NOTES[pickConf] + (pickSize === 'moyenne' ? '' : ' Carte ' + m.name.toLowerCase() + ' : ' + Math.round(m.w * m.h / (1600 * 1080) * 100) + ' % de la moyenne.');
}
export function pickMap(size: string | null | undefined, conf: string | null | undefined){
  if (isMapSize(size)) pickSize = size; if (isMapConf(conf)) pickConf = conf;
  store.set(MAP_KEY, { size: pickSize, conf: pickConf });
  markMap(); SH.sfx('click');
}
for (const b of $('newSize').children) if (b instanceof HTMLElement) b.addEventListener('click', () => pickMap(b.dataset.v, null));
for (const b of $('newConf').children) if (b instanceof HTMLElement) b.addEventListener('click', () => pickMap(null, b.dataset.v));
$('newDice').addEventListener('click', () => { $of('newSeed', HTMLInputElement).value = String(1 + Math.floor(Math.random() * 99999)); SH.sfx('click'); });
$('introGo').addEventListener('click', () => {
  if (inGame()) saveNow();
  GAME.side = pickSide; GAME.rival = other(pickSide);
  GAME.name = ($of('newName', HTMLInputElement).value || '').trim().slice(0, 28) || 'Partie ' + (savesIndex().length + 1);
  GAME.slot = newSlotId();
  const typed = parseInt(($of('newSeed', HTMLInputElement).value || '').replace(/\D/g, ''), 10);
  const seed = typed > 0 ? Math.min(99999, typed) : 1 + Math.floor(Math.random() * 99999);
  PROFILE.games++; saveProfile();
  closeHome(false); setPaused(false); GAME.winner = null;
  newWorld(seed, pickSize, pickConf);
  setSpeed(OPT.speed);
  startLanding();
});

/* ---- charger ---- */
export function fillLoad(){
  const box = $('saveList'); box.textContent = '';
  const ix = savesIndex();
  if (!ix.length){ const p = document.createElement('p'); p.className = 'field-note'; p.textContent = 'Aucune partie sauvegardée pour l’instant. Lance une nouvelle partie : elle se sauvegarde toute seule.'; box.append(p); return; }
  for (const e of ix){
    const card = document.createElement('div'); card.className = 'save' + (e.id === GAME.slot ? ' current' : '');
    const img = document.createElement('img'); img.alt = ''; const th = store.raw(thumbKey(e.id)); if (th) img.src = th; card.append(img);
    const info = document.createElement('div'); info.className = 'save-info';
    const t = document.createElement('div'); t.className = 'save-t'; t.innerHTML = '<span class="flag">' + flagSVG(e.side) + '</span>'; const nm = document.createElement('b'); nm.textContent = e.name || 'Partie'; t.append(nm); info.append(t);
    const meta = document.createElement('div'); meta.className = 'save-meta';
    const pct = Array.isArray(e.pct) ? 'USC ' + Math.round(e.pct[0] * 100) + ' % · CCR ' + Math.round(e.pct[1] * 100) + ' %' : '';
    meta.textContent = [CAMP_SHORT[e.side], MONTHS[e.m | 0], pct, 'île ' + (e.seed || '?'), isMapSize(e.size) ? MAP_SIZES[e.size].name.toLowerCase() : '', isMapConf(e.conf) && e.conf !== 'une' ? MAP_CONFS[e.conf].toLowerCase() : '', e.won ? (e.won === e.side ? 'gagnée' : 'perdue') : ''].filter(Boolean).join(' · ');
    const when = document.createElement('div'); when.className = 'save-when'; when.textContent = 'Jouée ' + whenLabel(e.at) + (e.id === GAME.slot ? ' · partie en cours' : '');
    info.append(meta, when);
    const act = document.createElement('div'); act.className = 'save-act';
    const go = document.createElement('button'); go.className = 'btn primary'; go.type = 'button'; go.textContent = e.id === GAME.slot ? 'Reprendre' : 'Charger';
    go.addEventListener('click', () => { if (e.id === GAME.slot && inGame()){ closeHome(true); return; } if (inGame()) saveNow(); loadSlot(e.id); });
    const del = document.createElement('button'); del.className = 'btn danger'; del.type = 'button'; del.textContent = 'Supprimer';
    del.addEventListener('click', () => {
      if (del.dataset.sure !== '1'){ del.dataset.sure = '1'; del.textContent = 'Vraiment ?'; setTimeout(() => { del.dataset.sure = ''; del.textContent = 'Supprimer'; }, 2500); return; }
      deleteSlot(e.id); SH.sfx('demolish'); fillLoad(); openIntro('load');
    });
    act.append(go, del); info.append(act); card.append(info); box.append(card);
  }
}

/* ---- profil ---- */
export function fmtDuration(s: number){ const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60); return h ? h + ' h ' + String(m).padStart(2, '0') : m + ' min'; }
export function fillProfile(){
  $of('profName', HTMLInputElement).value = PROFILE.name || '';
  for (const b of $('profSide').children) if (b instanceof HTMLElement) b.setAttribute('aria-checked', String(b.dataset.side === PROFILE.side));
  const box = $('profStats'); box.textContent = '';
  const stats: [number | string, string][] = [[PROFILE.games, 'parties lancées'], [PROFILE.wins, 'victoires'], [PROFILE.losses, 'défaites'], [fmtDuration(PROFILE.secs), 'de jeu']];
  for (const [v, l] of stats){
    const d = document.createElement('div'); d.className = 'stat'; const b = document.createElement('b'); b.textContent = String(v); const s = document.createElement('span'); s.textContent = l; d.append(b, s); box.append(d);
  }
}
$('profName').addEventListener('input', () => { PROFILE.name = $of('profName', HTMLInputElement).value.trim().slice(0, 20); saveProfile(); });
for (const b of $('profSide').children) if (b instanceof HTMLElement) b.addEventListener('click', () => { const s = b.dataset.side; if (!isSide(s)) return; PROFILE.side = s; pickSide = s; saveProfile(); fillProfile(); SH.sfx(PROFILE.side); });
// fin de partie : une victoire ou une defaite, une seule fois par partie
export let countedSlot: string | undefined;
export function profileResult(winner: Side){
  if (!GAME.slot || countedSlot === GAME.slot) return;
  countedSlot = GAME.slot;
  if (winner === GAME.side) PROFILE.wins++; else PROFILE.losses++;
  saveProfile();
}

/* ---- options ---- */
export function fillOptions(){
  $of('optVol', HTMLInputElement).value = String(OPT.vol); $('optVolV').textContent = OPT.vol + ' %';
  $of('optMus', HTMLInputElement).value = String(OPT.mus); $('optMusV').textContent = OPT.mus + ' %';
  for (const b of $('optSpeed').children) if (b instanceof HTMLElement) b.setAttribute('aria-checked', String(Number(b.dataset.v) === OPT.speed));
  for (const b of $('optWx').children) if (b instanceof HTMLElement) b.setAttribute('aria-checked', String(Number(b.dataset.v) === OPT.wx));
}
$('optVol').addEventListener('input', () => { OPT.vol = +$of('optVol', HTMLInputElement).value; saveOpt(); fillOptions(); });
$('optMus').addEventListener('input', () => { OPT.mus = +$of('optMus', HTMLInputElement).value; saveOpt(); fillOptions(); });
for (const b of $('optSpeed').children) if (b instanceof HTMLElement) b.addEventListener('click', () => { OPT.speed = Number(b.dataset.v); saveOpt(); fillOptions(); SH.sfx('click'); });
for (const b of $('optWx').children) if (b instanceof HTMLElement) b.addEventListener('click', () => { OPT.wx = Number(b.dataset.v); saveOpt(); fillOptions(); SH.sfx('click'); });
$('optWipe').addEventListener('click', () => {
  const b = $('optWipe');
  if (b.dataset.sure !== '1'){ b.dataset.sure = '1'; b.textContent = 'Sûr ? Tout sera perdu'; setTimeout(() => { b.dataset.sure = ''; b.textContent = 'Effacer parties, profil et options'; }, 3000); return; }
  for (const e of savesIndex()) deleteSlot(e.id);
  store.del(SAVES_KEY); store.del(PROFILE_KEY); store.del(OPT_KEY); store.del(MAP_KEY);
  Object.assign(PROFILE, { name: '', side: 'usc', games: 0, wins: 0, losses: 0, secs: 0 });
  Object.assign(OPT, { vol: 70, mus: 100, speed: 1, wx: 1 });
  b.dataset.sure = ''; b.textContent = 'Effacer parties, profil et options';
  toast('Tout est effacé.'); openIntro('options');
});

/* ---- le fond de l'accueil : l'ile de loin (ou la planete, avec GLOBE_ON), qui tourne doucement sur elle-meme ---- */
export const HOME = { last: 0, acc: 0 };
export function homeIsland(seed: number){
  // en fond de l'accueil : une carte moyenne, d'une forme tiree au sort
  const confs = Object.keys(MAP_CONFS);
  newWorld(seed, 'moyenne', confs[seed % confs.length]);
  centerOn(IS.ca, IS.cb); cam.phiT = null; cam.follow = null; cam.phi = 0;
  if (GLOBE_ON) cam.a = IS.ca - .6 * RP;
  setZoom(SH.KMIN * (GLOBE_ON ? .06 : .16) / mapScale(), null, null, true);
}
HOOKS.after.push(() => {
  const now2 = performance.now(), dt = HOME.last ? Math.min(.1, (now2 - HOME.last) / 1000) : 0; HOME.last = now2;
  // temps de jeu du profil, en vrai temps, garde toutes les 30 s
  if (GAME.mode === 'play' && !GAME.paused && !document.hidden){ PROFILE.secs += dt; HOME.acc += dt; if (HOME.acc > 30){ HOME.acc = 0; saveProfile(); } }
  if (GAME.mode !== 'menu') return;
  // en fond : l'ile tourne doucement sur elle-meme (avec le globe : la planete tourne, la camera en fait le tour)
  if (drag && drag.moved) return;
  if (GLOBE_ON){ cam.a += dt * .05 * RP; clampCam(); } else { cam.phi = (cam.phi + dt * .06) % TAU; setProj(); }
});

/* ---- les drapeaux de l'accueil : ils flottent vraiment au vent ---- */
// chaque colonne de pixels ondule (plus fort loin du mat), avec des plis plus clairs et plus sombres
// un drapeau qui flotte : son dessin (lettres de couleur), son canvas et ses pixels, sa palette, sa phase et sa vitesse
export interface FlagWave { art: string[]; fw: number; fh: number; g: CanvasRenderingContext2D; img: ImageData; px: Uint32Array; pal: Record<string, [number, number, number]>; ph: number; sp: number }
export const FLAGW: { els: FlagWave[]; s: number; last: number; still: boolean } = { els: [], s: 3, last: 0, still: reduceMotion };
export function flagWaveInit(){
  for (const el of document.querySelectorAll('.home-flags [data-flag]')){
    if (!(el instanceof HTMLElement)) continue;
    const side = el.dataset.flag; if (!isSide(side)) continue;
    const art = FLAG_HI[side], fw = art[0].length, fh = art.length, s = FLAGW.s;
    const cv = document.createElement('canvas'); cv.width = (fw + 3) * s; cv.height = (fh + 16) * s;
    el.innerHTML = ''; el.appendChild(cv);
    const g = cv.getContext('2d'); if (!g) continue;
    const img = g.createImageData(cv.width, cv.height);
    const pal: Record<string, [number, number, number]> = {}; for (const [k, hex] of Object.entries(FLAG_HEX)){ const v = parseInt(hex.slice(1), 16); pal[k] = [v >> 16, (v >> 8) & 255, v & 255]; }
    FLAGW.els.push({ art, fw, fh, g, img, px: new Uint32Array(img.data.buffer), pal, ph: el.classList.contains('slow') ? 2.1 : 0, sp: el.classList.contains('slow') ? 2.6 : 3.1 });
  }
  flagWaveDraw(0);
}
export function flagWaveDraw(t: number){
  const s = FLAGW.s;
  for (const F of FLAGW.els){
    const { art, fw, fh, px, pal } = F, W2 = (fw + 3) * s, H2 = (fh + 16) * s, top = 4;
    px.fill(0);
    const put = (x: number, y: number, r: number, g: number, b: number) => { if (x >= 0 && y >= 0 && x < W2 && y < H2) px[y * W2 + x] = (255 << 24) | (b << 16) | (g << 8) | r; };
    // le mat, et sa boule
    for (let y = 1 * s; y < H2; y++) for (let x = 0; x < 2 * s; x++) put(x, y, x < s ? 70 : 31, x < s ? 66 : 29, x < s ? 76 : 36);
    for (let y = 0; y < s * 2; y++) for (let x = -1; x < 2 * s + 1; x++) put(x, y, 217, 162, 30);
    for (let x = 0; x < fw; x++){
      const u = x / (fw - 1), ph = x * .23 - t * F.sp + F.ph;
      const dy = Math.sin(ph) * 1.9 * Math.pow(u, .85) + Math.sin(ph * .5 + 1.3) * .6 * u;
      const lit = 1 + Math.cos(ph) * .2 * Math.pow(u, .7);
      for (let y = 0; y < fh; y++){
        const c = pal[art[y][x]]; if (!c) continue;
        const r = Math.min(255, c[0] * lit) | 0, g = Math.min(255, c[1] * lit) | 0, b = Math.min(255, c[2] * lit) | 0;
        const y0 = Math.round((top + y + dy) * s), x0 = (x + 2) * s;
        for (let yy = 0; yy < s; yy++) for (let xx = 0; xx < s; xx++) put(x0 + xx, y0 + yy, r, g, b);
      }
    }
    F.g.putImageData(F.img, 0, 0);
  }
}
flagWaveInit();
HOOKS.after.push(() => {
  // seulement quand l'accueil est a l'ecran, et une image sur deux suffit
  if (FLAGW.still || !document.body.classList.contains('home-open') || document.body.classList.contains('playing')) return;
  const now2 = performance.now(); if (now2 - FLAGW.last < 30) return; FLAGW.last = now2;
  flagWaveDraw(now2 / 1000);
});

// appeles depuis des modules plus petits en numero
Object.assign(SH, { OPT, saveNow, openIntro, profileResult, homeIsland });
