/* ================= accueil : menu du jeu, parties sauvegardees, profil, options ================= */
// Tout est garde dans le navigateur (localStorage) : un index des parties, chaque partie a part, sa vignette,
// le profil et les options. Rien ne part sur un serveur.
const SAVES_KEY = 'ckt-saves', PROFILE_KEY = 'ckt-profil', OPT_KEY = 'ckt-options', OLD_SAVE_KEY = 'cold-kutty-town-8';
const slotKey = (id) => 'ckt-partie-' + id, thumbKey = (id) => 'ckt-vignette-' + id;
const store = {
  get(k, def){ try { const s = localStorage.getItem(k); return s == null ? def : JSON.parse(s); } catch (_) { return def; } },
  set(k, v){ try { localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v)); return true; } catch (_) { return false; } },
  raw(k){ try { return localStorage.getItem(k); } catch (_) { return null; } },
  del(k){ try { localStorage.removeItem(k); } catch (_) {} }
};
const OPT = Object.assign({ vol: 70, mus: 100, speed: 1, wx: 1 }, store.get(OPT_KEY, {}));
const PROFILE = Object.assign({ name: '', side: 'usc', games: 0, wins: 0, losses: 0, secs: 0 }, store.get(PROFILE_KEY, {}));
const saveOpt = () => store.set(OPT_KEY, OPT);
const saveProfile = () => store.set(PROFILE_KEY, PROFILE);
GAME.slot = null; GAME.name = '';

/* ---- les parties ---- */
const savesIndex = () => { const ix = store.get(SAVES_KEY, []); return Array.isArray(ix) ? ix : []; };
const newSlotId = () => Date.now().toString(36) + Math.floor(Math.random() * 1296).toString(36);
// l'ancienne sauvegarde unique devient la premiere partie de la liste
(function migrate(){
  const old = store.raw(OLD_SAVE_KEY); if (!old) return;
  if (!savesIndex().length){
    try {
      const d = JSON.parse(old), id = newSlotId();
      if (store.set(slotKey(id), old)) store.set(SAVES_KEY, [{ id, name: 'Ma partie', side: d.side === 'ccp' ? 'ccp' : 'usc', at: Date.now(), m: d.cal | 0, h: +d.h || 10, pct: null, seed: d.seed | 0, won: d.won || '' }]);
    } catch (_) {}
  }
  store.del(OLD_SAVE_KEY);
})();
function mapThumb(){
  if (!MAPV.cv) return null;
  const c = document.createElement('canvas'); c.width = 120; c.height = 81;
  const g = c.getContext('2d'); g.imageSmoothingEnabled = true; g.drawImage(MAPV.cv, 0, 0, 120, 81);
  try { return c.toDataURL('image/png'); } catch (_) { return null; }
}
let saveWarned = false, thumbAt = 0;
function saveNow(){
  if (GAME.mode !== 'play' && GAME.mode !== 'over') return;
  if (!GAME.slot) GAME.slot = newSlotId();
  const d = snapshot(); d.name = GAME.name;
  if (!store.set(slotKey(GAME.slot), d)){
    if (!saveWarned){ saveWarned = true; toast('La mémoire du navigateur est pleine : supprime de vieilles parties dans Charger une partie.'); }
    return;
  }
  const ix = savesIndex().filter(e => e.id !== GAME.slot);
  ix.unshift({ id: GAME.slot, name: GAME.name, side: GAME.side, at: Date.now(), m: CAL.m, h: CLOCK.h, pct: [terPct('usc'), terPct('ccp')], seed: GAME.seed, won: GAME.winner || '' });
  store.set(SAVES_KEY, ix);
  const now2 = performance.now();
  if (now2 - thumbAt > 30000 || !store.raw(thumbKey(GAME.slot))){ thumbAt = now2; const u = mapThumb(); if (u) store.set(thumbKey(GAME.slot), u); }
}
function loadSlot(id){
  const d = store.get(slotKey(id), null), e = savesIndex().find(o => o.id === id);
  if (!d || !loadGame(d)){ toast('Cette sauvegarde est illisible.'); return false; }
  GAME.slot = id; GAME.name = d.name || (e && e.name) || 'Partie';
  closeHome(true);
  return true;
}
function deleteSlot(id){
  store.del(slotKey(id)); store.del(thumbKey(id));
  store.set(SAVES_KEY, savesIndex().filter(e => e.id !== id));
  if (GAME.slot === id) GAME.slot = null;
}
// quand la partie a-t-elle ete jouee : sans annee, comme tout le reste du jeu
function whenLabel(at){
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
let homePage = null, homeWasPaused = false;
const PAGES = { new: 'pageNew', load: 'pageLoad', profile: 'pageProfile', options: 'pageOptions', rules: 'pageRules' };
const inGame = () => GAME.mode === 'play' || GAME.mode === 'over';
function openIntro(page){
  const el = $('intro'), wasOpen = !el.hidden;
  el.hidden = false; document.body.classList.add('home-open');
  if (inGame() && !wasOpen){ homeWasPaused = GAME.paused; setPaused(true); }
  const ix = savesIndex(), last = ix[0];
  $('hmBack').hidden = !inGame(); $('hmQuit').hidden = !inGame();
  $('hmContinue').hidden = inGame() || !last;
  if (last && !inGame()) document.body.dataset.side = last.side;
  if (last) $('hmContinueSub').textContent = last.name + ' · ' + CAMP_SHORT[last.side] + ' · ' + whenLabel(last.at);
  $('hmLoadSub').textContent = ix.length ? ix.length + (ix.length > 1 ? ' parties' : ' partie') : '';
  $('homeHello').textContent = PROFILE.name ? 'Bon retour sur l’île, ' + PROFILE.name + '.' : 'Bienvenue sur l’île, camarade chat.';
  showPage(page || null);
}
function closeHome(resume){
  $('intro').hidden = true; showPage(null); document.body.classList.remove('home-open');
  if (resume && inGame()) setPaused(homeWasPaused);
}
function showPage(p){
  homePage = p;
  for (const k in PAGES) $(PAGES[k]).hidden = k !== p;
  for (const b of document.querySelectorAll('.hm[data-page]')) b.setAttribute('aria-current', String(b.dataset.page === p));
  if (p === 'new') fillNew(); else if (p === 'load') fillLoad(); else if (p === 'profile') fillProfile(); else if (p === 'options') fillOptions();
}
for (const b of document.querySelectorAll('.hm[data-page]')) b.addEventListener('click', () => { sfx('click'); showPage(homePage === b.dataset.page ? null : b.dataset.page); });
$('hmBack').addEventListener('click', () => { sfx('click'); closeHome(true); });
$('hmContinue').addEventListener('click', () => { const last = savesIndex()[0]; if (last) loadSlot(last.id); });
$('hmQuit').addEventListener('click', () => { saveNow(); leaveToHome(); });
$('btnMenu').addEventListener('click', () => openIntro());
window.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape' || $('intro').hidden) return;
  if (homePage) showPage(null); else if (inGame()) closeHome(true);
  e.stopPropagation();
}, true);
// quitter la partie : on revient a l'accueil, une ile tiree au sort en fond
function leaveToHome(){
  clearTimeout(saveTimer);
  GAME.mode = 'menu'; GAME.slot = null; GAME.paused = false; homeWasPaused = false;
  for (const id of ['topbar', 'bottom', 'radio', 'landing', 'endBox', 'chat', 'paper', 'sel']) $(id).hidden = true;
  document.body.classList.remove('playing', 'sel-open');
  state.sel = null; state.selV = null; if (state.chatCat) closeChat();
  setPaused(false);
  homeIsland(1 + Math.floor(Math.random() * 99999));
  openIntro();
}

/* ---- nouvelle partie ---- */
let pickSide = PROFILE.side === 'ccp' ? 'ccp' : 'usc';
function markSide(){ for (const o of document.querySelectorAll('#pageNew .side-card')) o.setAttribute('aria-checked', String(o.dataset.side === pickSide)); }
for (const b of document.querySelectorAll('#pageNew .side-card')) b.addEventListener('click', () => { pickSide = b.dataset.side; markSide(); sfx(pickSide); });
function fillNew(){ markSide(); $('newName').value = 'Partie ' + (savesIndex().length + 1); $('newSeed').value = ''; }
$('newDice').addEventListener('click', () => { $('newSeed').value = String(1 + Math.floor(Math.random() * 99999)); sfx('click'); });
$('introGo').addEventListener('click', () => {
  if (inGame()) saveNow();
  GAME.side = pickSide; GAME.rival = other(pickSide);
  GAME.name = ($('newName').value || '').trim().slice(0, 28) || 'Partie ' + (savesIndex().length + 1);
  GAME.slot = newSlotId();
  const typed = parseInt(($('newSeed').value || '').replace(/\D/g, ''), 10);
  const seed = typed > 0 ? Math.min(99999, typed) : 1 + Math.floor(Math.random() * 99999);
  PROFILE.games++; saveProfile();
  closeHome(false); setPaused(false); GAME.winner = null;
  newWorld(seed);
  setSpeed(OPT.speed);
  startLanding();
});

/* ---- charger ---- */
function fillLoad(){
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
    meta.textContent = [CAMP_SHORT[e.side], MONTHS[e.m | 0], pct, 'île ' + (e.seed || '?'), e.won ? (e.won === e.side ? 'gagnée' : 'perdue') : ''].filter(Boolean).join(' · ');
    const when = document.createElement('div'); when.className = 'save-when'; when.textContent = 'Jouée ' + whenLabel(e.at) + (e.id === GAME.slot ? ' · partie en cours' : '');
    info.append(meta, when);
    const act = document.createElement('div'); act.className = 'save-act';
    const go = document.createElement('button'); go.className = 'btn primary'; go.type = 'button'; go.textContent = e.id === GAME.slot ? 'Reprendre' : 'Charger';
    go.addEventListener('click', () => { if (e.id === GAME.slot && inGame()){ closeHome(true); return; } if (inGame()) saveNow(); loadSlot(e.id); });
    const del = document.createElement('button'); del.className = 'btn danger'; del.type = 'button'; del.textContent = 'Supprimer';
    del.addEventListener('click', () => {
      if (del.dataset.sure !== '1'){ del.dataset.sure = '1'; del.textContent = 'Vraiment ?'; setTimeout(() => { del.dataset.sure = ''; del.textContent = 'Supprimer'; }, 2500); return; }
      deleteSlot(e.id); sfx('demolish'); fillLoad(); openIntro('load');
    });
    act.append(go, del); info.append(act); card.append(info); box.append(card);
  }
}

/* ---- profil ---- */
function fmtDuration(s){ const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60); return h ? h + ' h ' + String(m).padStart(2, '0') : m + ' min'; }
function fillProfile(){
  $('profName').value = PROFILE.name || '';
  for (const b of $('profSide').children) b.setAttribute('aria-checked', String(b.dataset.side === PROFILE.side));
  const box = $('profStats'); box.textContent = '';
  for (const [v, l] of [[PROFILE.games, 'parties lancées'], [PROFILE.wins, 'victoires'], [PROFILE.losses, 'défaites'], [fmtDuration(PROFILE.secs), 'de jeu']]){
    const d = document.createElement('div'); d.className = 'stat'; const b = document.createElement('b'); b.textContent = String(v); const s = document.createElement('span'); s.textContent = l; d.append(b, s); box.append(d);
  }
}
$('profName').addEventListener('input', () => { PROFILE.name = $('profName').value.trim().slice(0, 20); saveProfile(); });
for (const b of $('profSide').children) b.addEventListener('click', () => { PROFILE.side = b.dataset.side; pickSide = PROFILE.side; saveProfile(); fillProfile(); sfx(PROFILE.side); });
// fin de partie : une victoire ou une defaite, une seule fois par partie
function profileResult(winner){
  if (!GAME.slot || GAME.counted === GAME.slot) return;
  GAME.counted = GAME.slot;
  if (winner === GAME.side) PROFILE.wins++; else PROFILE.losses++;
  saveProfile();
}

/* ---- options ---- */
function fillOptions(){
  $('optVol').value = OPT.vol; $('optVolV').textContent = OPT.vol + ' %';
  $('optMus').value = OPT.mus; $('optMusV').textContent = OPT.mus + ' %';
  for (const b of $('optSpeed').children) b.setAttribute('aria-checked', String(+b.dataset.v === OPT.speed));
  for (const b of $('optWx').children) b.setAttribute('aria-checked', String(+b.dataset.v === OPT.wx));
}
$('optVol').addEventListener('input', () => { OPT.vol = +$('optVol').value; saveOpt(); fillOptions(); });
$('optMus').addEventListener('input', () => { OPT.mus = +$('optMus').value; saveOpt(); fillOptions(); });
for (const b of $('optSpeed').children) b.addEventListener('click', () => { OPT.speed = +b.dataset.v; saveOpt(); fillOptions(); sfx('click'); });
for (const b of $('optWx').children) b.addEventListener('click', () => { OPT.wx = +b.dataset.v; saveOpt(); fillOptions(); sfx('click'); });
$('optWipe').addEventListener('click', () => {
  const b = $('optWipe');
  if (b.dataset.sure !== '1'){ b.dataset.sure = '1'; b.textContent = 'Sûr ? Tout sera perdu'; setTimeout(() => { b.dataset.sure = ''; b.textContent = 'Effacer parties, profil et options'; }, 3000); return; }
  for (const e of savesIndex()) deleteSlot(e.id);
  store.del(SAVES_KEY); store.del(PROFILE_KEY); store.del(OPT_KEY);
  Object.assign(PROFILE, { name: '', side: 'usc', games: 0, wins: 0, losses: 0, secs: 0 });
  Object.assign(OPT, { vol: 70, mus: 100, speed: 1, wx: 1 });
  b.dataset.sure = ''; b.textContent = 'Effacer parties, profil et options';
  toast('Tout est effacé.'); openIntro('options');
});

/* ---- le fond de l'accueil : la planete dans l'espace, qui tourne doucement sur elle-meme ---- */
const HOME = { last: 0, acc: 0 };
function homeIsland(seed){
  newWorld(seed);
  centerOn(IS.ca, IS.cb); cam.phiT = null; cam.follow = null; cam.phi = 0;
  cam.a = IS.ca - .6 * RP;
  setZoom(KMIN * .06, null, null, true);
}
HOOKS.after.push(() => {
  const now2 = performance.now(), dt = HOME.last ? Math.min(.1, (now2 - HOME.last) / 1000) : 0; HOME.last = now2;
  // temps de jeu du profil, en vrai temps, garde toutes les 30 s
  if (GAME.mode === 'play' && !GAME.paused && !document.hidden){ PROFILE.secs += dt; HOME.acc += dt; if (HOME.acc > 30){ HOME.acc = 0; saveProfile(); } }
  if (GAME.mode !== 'menu') return;
  // la planete tourne doucement sur elle-meme (la camera fait le tour, le soleil reste en place)
  if (!drag || !drag.moved){ cam.a += dt * .05 * RP; clampCam(); }
});
