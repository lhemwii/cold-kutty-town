/* ================= partie a deux : un joueur par camp, la meme ile, en direct ================= */
// l'etat partage vit dans un document de la base de l'artefact (parties/<code>), chaque joueur n'ecrit que son camp.
// la presence (ou regarde l'autre) passe par une salle nommee, rien n'y est garde.
const MP = { unsub: null, room: null, roomUnsub: null, ref: null, writing: false, dirty: false, sent: { lots: {}, lvl: {} }, doc: null, viewKey: '', presT: 0, peers: [], seen: new Set(), roadsKey: '' };
const MPUI = { side: 'usc', map: 'deb', busy: false };
const MP_ALPHA = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const mpNewCode = () => { let s = ''; for (let i = 0; i < 4; i++) s += MP_ALPHA[(Math.random() * MP_ALPHA.length) | 0]; return s; };
const partyRef = (code) => DBH.db.doc('parties/' + code);
const seatRef = (code, side) => DBH.db.doc('parties/' + code + '/seats/' + side);
const roadSide = (s) => sideOf(s.o === 'a' ? (s.s0 + s.s1) / 2 : s.c);
const campLabel = (s) => s === 'ccp' ? 'la CCR' : 'l’USC';
function parseRoad(r){
  if (!Array.isArray(r) || (r[0] !== 'a' && r[0] !== 'b')) return null;
  const s = { o: r[0], c: +r[1], s0: +r[2], s1: +r[3] };
  if (![s.c, s.s0, s.s1].every(isFinite) || s.s1 - s.s0 < 10 || s.s1 - s.s0 > 1200) return null;
  return s;
}
function mpMsg(t){ $('mpMsg').textContent = t || ''; }
function mpBusy(b){ MPUI.busy = b; for (const id of ['mpCreate', 'mpJoin', 'mpResume']) $(id).disabled = b || !mpReady(); }
const mpReady = () => !!(DBH.db && DBH.uid);
function lastParty(){ try { return localStorage.getItem('cold-kutty-mp') || ''; } catch (_) { return ''; } }
function openMp(){
  $('mpBox').hidden = false; $('intro').hidden = true;
  const last = lastParty();
  $('mpResume').hidden = !last; $('mpResume').textContent = 'Reprendre la partie ' + last;
  mpMsg(mpReady() ? '' : 'La partie à deux a besoin de la base partagée de l’artefact, qui n’est pas disponible ici. Ouvre le jeu depuis son lien Claude.');
  mpBusy(false);
  setTimeout(() => $(mpReady() ? 'mpCreate' : 'mpBack').focus({ preventScroll: true }), 30);
}
for (const b of document.querySelectorAll('[data-mps]')) b.addEventListener('click', () => { MPUI.side = b.dataset.mps; for (const o of document.querySelectorAll('[data-mps]')) o.setAttribute('aria-checked', String(o === b)); });
for (const b of document.querySelectorAll('[data-mpm]')) b.addEventListener('click', () => { MPUI.map = b.dataset.mpm; for (const o of document.querySelectorAll('[data-mpm]')) o.setAttribute('aria-checked', String(o === b)); });
$('mpBack').addEventListener('click', () => { $('mpBox').hidden = true; openIntro(); });
$('mpCreate').addEventListener('click', () => mpCreate());
$('mpJoinForm').addEventListener('submit', (e) => { e.preventDefault(); mpJoin($('mpCode').value); });
$('mpResume').addEventListener('click', () => mpJoin(lastParty()));
function mpErr(err){
  const c = err && err.code;
  if (c === 'not_granted' || c === 'revoked') return 'Tu n’as pas le droit d’écrire dans cette partie : il faut l’accès Contributeur à l’artefact.';
  if (c === 'quota_exceeded') return 'La base de l’artefact est pleine : impossible de créer une nouvelle partie.';
  if (c === 'resource_exhausted') return 'Trop de demandes d’un coup : réessaie dans un instant.';
  return 'La connexion à la partie a échoué' + (c ? ' (' + c + ')' : '') + '. Réessaie.';
}
// prendre un siege : bail court sur le document du siege, puis on l'ecrit seulement s'il est libre
async function mpClaim(code, side){
  const ref = seatRef(code, side);
  const L = await ref.acquire({ holder: DBH.uid, ttlMs: 5000 });
  if (!L || !L.acquired) return false;
  const s = await ref.get(), d = s.exists ? s.data() : null;
  if (d && d.owner && d.owner !== DBH.uid) return false;
  await ref.set({ owner: DBH.uid, at: Date.now() });
  return true;
}
async function mpCreate(){
  if (!mpReady() || MPUI.busy) return;
  mpBusy(true); mpMsg('Création de la partie…');
  try {
    let code = null;
    for (let k = 0; k < 6 && !code; k++){ const c = mpNewCode(), s = await partyRef(c).get(); if (!s.exists) code = c; }
    if (!code){ mpMsg('Impossible de trouver un code libre, réessaie.'); return; }
    const doc = { v: 1, map: MPUI.map, created: Date.now(), h0: 9.5, host: DBH.uid, lots: {}, lvl: {}, roads: { usc: [], ccp: [] }, camps: {}, res: {}, space: {}, wall: false };
    await partyRef(code).set(doc);
    if (!await mpClaim(code, MPUI.side)){ mpMsg('Ce camp vient d’être pris, réessaie.'); return; }
    await mpStart(code, MPUI.side, doc, true);
  } catch (err){ mpMsg(mpErr(err)); }
  finally { mpBusy(false); }
}
async function mpJoin(raw){
  if (!mpReady() || MPUI.busy) return;
  const code = String(raw || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
  if (code.length < 4){ mpMsg('Entre le code de la partie, 4 caractères.'); return; }
  mpBusy(true); mpMsg('Connexion à la partie ' + code + '…');
  try {
    const s = await partyRef(code).get();
    if (!s.exists){ mpMsg('Aucune partie avec le code ' + code + '.'); return; }
    const doc = s.data() || {};
    const [su, sc] = await Promise.all([seatRef(code, 'usc').get(), seatRef(code, 'ccp').get()]);
    const own = (x) => x.exists && x.data() ? x.data().owner : null;
    let side = own(su) === DBH.uid ? 'usc' : own(sc) === DBH.uid ? 'ccp' : null;
    if (!side) for (const [sd, x] of [['usc', su], ['ccp', sc]]){ if (!own(x) && await mpClaim(code, sd)){ side = sd; break; } }
    if (!side){ mpMsg('Les deux camps sont déjà pris dans la partie ' + code + '.'); return; }
    await mpStart(code, side, doc, false);
  } catch (err){ mpMsg(mpErr(err)); }
  finally { mpBusy(false); }
}
async function mpStart(code, side, doc, created){
  if (GAME.mp) mpLeave();
  GAME.touched = true;
  GAME.mp = { code, seat: side, map: doc.map === 'ville' ? 'ville' : 'deb', created: +doc.created || Date.now(), h0: +doc.h0 || 9.5 };
  MP.sent = { lots: {}, lvl: {} }; MP.roadsKey = ''; MP.seen = new Set(); MP.peers = []; MAP.peers = [];
  try { localStorage.setItem('cold-kutty-mp', code); } catch (_) {}
  await enterMode(GAME.mp.map, true);
  if (Date.now() - GAME.mp.created > 120000) DEB.landT = 0;
  document.body.classList.add('mp');
  mpClock(true);
  mpApply(doc, true);
  MP.ref = partyRef(code);
  MP.unsub = MP.ref.onSnapshot((s) => { if (!GAME.mp || GAME.mp.code !== code) return; if (s.exists) mpApply(s.data(), false); else { toast('Cette partie a été supprimée.'); mpLeave(); openIntro(); } }, () => { toast('La connexion à la partie est perdue : recharge la page pour la reprendre.'); });
  mpRoom(code);
  $('mpBox').hidden = true; closeIntro();
  const P = PORTS.find(p => p.side === side);
  if (GAME.mp.map === 'deb') centerOn(P.ca + (side === 'usc' ? 30 : -30), P.top + 10); else centerOn(side === 'usc' ? -300 : 280, 20);
  toast(created ? 'Partie ' + code + ' créée : envoie ce code à ton adversaire.' : 'Tu as rejoint la partie ' + code + ' : tu joues ' + campLabel(side) + '.');
  radioQueue.unshift(['neutre', 'Radio du port', 'Partie ' + code + ' : ' + (side === 'usc' ? 'tu diriges l’USC, l’Ouest' : 'tu diriges la CCR, l’Est') + '. L’autre camp est entre les pattes de ton adversaire.']);
  mpBadge(); mpPush();
}
function mpLeave(){
  if (!GAME.mp) return;
  if (MP.unsub){ try { MP.unsub(); } catch (_) {} } MP.unsub = null;
  if (MP.roomUnsub){ try { MP.roomUnsub(); } catch (_) {} } MP.roomUnsub = null;
  if (MP.room){ MP.room.leave().catch(() => {}); } MP.room = null;
  MP.ref = null; MP.peers = []; MAP.peers = []; MP.dirty = false;
  GAME.mp = null; GAME.mode = 'none';
  document.body.classList.remove('mp'); $('mpLine').hidden = true;
}
// horloge et calendrier communs : tout part de la date de creation de la partie
function mpClock(first){
  if (!GAME.mp) return;
  CLOCK.auto = true; CLOCK.speed = 1;
  const hh = GAME.mp.h0 + (Date.now() - GAME.mp.created) / 1000 * 24 / CLOCK.len;
  CLOCK.h = ((hh % 24) + 24) % 24;
  if (first){ const m = 9 + Math.floor(hh / 24); CAL.m = m % 12; CAL.y = 1961 + Math.floor(m / 12); calH = null; applySeason(); updateCalUI(); }
}
HOOKS.step.push(() => { if (GAME.mp) mpClock(false); });
// appliquer le document partage : l'autre camp toujours, le mien seulement au chargement
function mpApply(d, first){
  if (!GAME.mp || !d || typeof d !== 'object') return;
  MP.doc = d;
  const me = GAME.mp.seat, other = me === 'usc' ? 'ccp' : 'usc';
  const lots = d.lots && typeof d.lots === 'object' ? d.lots : {}, lvl = d.lvl && typeof d.lvl === 'object' ? d.lvl : {};
  let changed = false, roadsChanged = false;
  for (const l of LOTS){
    if (!first && l.side === me) continue;
    const raw = Object.prototype.hasOwnProperty.call(lots, l.id) ? String(lots[l.id] || '') : (INITIAL[l.id] || '');
    const t = TYPES[raw] ? raw : '', lv = t ? clamp(Math.floor(+lvl[l.id]) || 1, 1, 3) : 1;
    if (l.type !== t){
      if (!first){ if (t){ l.buildT = NOW_T; radioFlash(Object.assign({}, l, { type: t })); } else { l.demoT = NOW_T; l.buildT = 0; } }
      l.type = t; l.lvl = lv; changed = true;
    } else if ((l.lvl || 1) !== lv){ l.lvl = lv; if (!first) l.buildT = NOW_T; changed = true; }
    if (first && l.side === me){ MP.sent.lots[l.id] = l.type || ''; MP.sent.lvl[l.id] = l.type ? (l.lvl || 1) : 1; }
  }
  const rd = d.roads && typeof d.roads === 'object' ? d.roads : {};
  const theirs = (Array.isArray(rd[other]) ? rd[other] : []).slice(0, 200).map(parseRoad).filter(s => s && roadSide(s) === other);
  const mine = first ? (Array.isArray(rd[me]) ? rd[me] : []).slice(0, 200).map(parseRoad).filter(s => s && roadSide(s) === me) : USER_ROADS.filter(s => roadSide(s) === me);
  const key = JSON.stringify(theirs) + '|' + JSON.stringify(mine);
  if (key !== MP.roadsKey){ MP.roadsKey = key; USER_ROADS = mine.concat(theirs); roadsChanged = true; }
  for (const s of first ? ['usc', 'ccp'] : [other]){
    const c = d.camps && d.camps[s]; if (Array.isArray(c)) campsLoad({ [s === 'usc' ? 'u' : 'c']: c });
    const r = d.res && d.res[s];
    if (Array.isArray(r) && r.length >= 3){
      const R = RES[s], dtm = clamp((Date.now() - (+r[3] || Date.now())) / 60000, 0, 10);
      R.croq = clamp((+r[0] || 0) + R.rc * dtm, 0, 9999); R.laine = clamp((+r[1] || 0) + R.rl * dtm, 0, 9999); R.moralAdj = clamp(+r[2] || 0, -40, 40);
    }
    const sp = clamp(Math.floor(+(d.space && d.space[s])) || 0, 0, 3);
    if (sp > SPACE[s].stage){
      if (!first){ SPACE[s].launchT = NOW_T; toast((s === 'ccp' ? 'La CCR' : 'L’USC') + ' vient d’envoyer ' + SPACE_STEPS[sp - 1][1] + ' !'); fwSalvo(s, 5); logDay(s, 'space', SPACE_STEPS[sp - 1][1], {}); }
      SPACE[s].stage = sp;
    }
  }
  if (d.wall === true && GAME.mp.map === 'deb' && !DEB.wall){ if (first){ DEB.wall = true; DEB.wallT = -1e9; roadsChanged = true; } else raiseWall(NOW_T); }
  if (roadsChanged){ paintRoads(GA0, GA0 + GW / GSC, GB0, GB0 + GH / GSC); if (GAME.mode === 'deb' && !DEB.wall) hideStrip(); refreshBlocked(); buildGraph(); reseatCars(); changed = true; }
  if (changed){ refreshNeighbors(); rebuildTown(); if (!first) shadowsLater(); ecoTally(); updateCamps(false); renderRes(); OV.key = ''; }
  mpBadge();
}
// ecrire mon camp : une ecriture a la fois, les rafales sont regroupees
function mpPush(){ if (!GAME.mp || !MP.ref) return; MP.dirty = true; if (!MP.writing) mpFlush(); }
async function mpFlush(){
  MP.writing = true;
  while (MP.dirty && GAME.mp && MP.ref){
    MP.dirty = false;
    const me = GAME.mp.seat, ref = MP.ref, patch = { lots: {}, lvl: {} };
    for (const l of LOTS){
      if (l.side !== me) continue;
      const t = l.type || '', lv = t ? (l.lvl || 1) : 1;
      if (MP.sent.lots[l.id] !== t) patch.lots[l.id] = t;
      if (MP.sent.lvl[l.id] !== lv) patch.lvl[l.id] = lv;
    }
    patch.roads = { [me]: USER_ROADS.filter(s => roadSide(s) === me).map(s => [s.o, s.c, s.s0, s.s1]) };
    patch.camps = { [me]: [CAMPS[me].bonus, CAMPS[me].want, CAMPS[me].done] };
    patch.res = { [me]: [Math.round(RES[me].croq), Math.round(RES[me].laine), Math.round(RES[me].moralAdj), Date.now()] };
    patch.space = { [me]: SPACE[me].stage };
    if (GAME.mp.map === 'deb' && DEB.wall) patch.wall = true;
    try {
      await ref.update(patch);
      for (const id in patch.lots) MP.sent.lots[id] = patch.lots[id];
      for (const id in patch.lvl) MP.sent.lvl[id] = patch.lvl[id];
    } catch (err){
      const c = err && err.code;
      if (c === 'unavailable' || c === 'resource_exhausted'){ await new Promise(r => setTimeout(r, 900 + Math.random() * 900)); MP.dirty = true; }
      else { toast(mpErr(err)); break; }
    }
  }
  MP.writing = false;
}
// presence : on montre ou regarde l'adversaire sur la mini-carte
async function mpRoom(code){
  try {
    const lobby = window.claude && typeof window.claude.use === 'function' ? await window.claude.use('room') : null;
    if (!lobby || !GAME.mp || GAME.mp.code !== code) return;
    const r = await lobby.join('kutty-' + code.toLowerCase());
    if (!GAME.mp || GAME.mp.code !== code){ r.leave().catch(() => {}); return; }
    MP.room = r; MP.viewKey = '';
    MP.roomUnsub = r.onPeers((ch) => {
      const others = ch.peers.filter(p => p.presence && p.presence.uid && p.presence.uid !== DBH.uid && (p.presence.seat === 'usc' || p.presence.seat === 'ccp'));
      for (const p of others) if (!MP.seen.has(p.presence.uid)){ MP.seen.add(p.presence.uid); toast('Ton adversaire est là : il joue ' + campLabel(p.presence.seat) + '.'); }
      for (const p of ch.left) if (p.presence && p.presence.uid && MP.seen.has(p.presence.uid)){ MP.seen.delete(p.presence.uid); toast('Ton adversaire a quitté la partie. L’île t’attend quand même.'); }
      MP.peers = others;
      MAP.peers = others.map(p => { const v = p.presence.view; return { side: p.presence.seat, view: Array.isArray(v) && v.length === 4 && v.every(q => Array.isArray(q) && q.length === 2 && q.every(isFinite)) ? v.map(q => [clamp(+q[0], -2000, 2000), clamp(+q[1], -2000, 2000)]) : null }; });
      mpBadge();
    });
  } catch (_) { MP.room = null; }
}
HOOKS.after.push((t) => {
  if (!GAME.mp || !MP.room || t - MP.presT < .25) return;
  MP.presT = t;
  const view = viewCorners().map(([a, b]) => [Math.round(a), Math.round(b)]), key = JSON.stringify(view);
  if (key === MP.viewKey) return;
  MP.viewKey = key;
  MP.room.presence({ uid: DBH.uid, seat: GAME.mp.seat, view }).catch(() => {});
});
function mpBadge(){
  const el = $('mpLine'); if (!el) return;
  if (!GAME.mp){ el.hidden = true; return; }
  el.hidden = false; el.textContent = '';
  const b = document.createElement('b'); b.textContent = 'PARTIE ' + GAME.mp.code;
  const s = document.createElement('span'); s.textContent = 'Tu joues ' + campLabel(GAME.mp.seat) + ' · adversaire ' + (MP.peers.length ? 'en ligne' : 'absent');
  const i = document.createElement('i'); i.className = MP.peers.length ? 'on' : '';
  el.append(i, b, s);
}
