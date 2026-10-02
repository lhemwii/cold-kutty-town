import { SH, type Building, type Side } from './00-shared.ts';
import { DASHES, GAME, H, HOOKS, RP, SC, SIDES, TAU, W, cam, clamp, geoCast, geoProj, groundDelta, other, prj, reduceMotion, state, unprj } from './01-core.ts';
import { IS, ISEED, buildGround, clearForest, isMapConf, isMapSize, islandNear, mapScale, nearestShore, setMapSize, type Vec2 } from './02-ground.ts';
import { TYPES } from './04-types.ts';
import { typeName } from './05-types-extra.ts';
import { DIR_V } from './06-types-more.ts';
import { LAMP_POS, PEAKS, TREES, VEST, buildForests, buildMountains, buildVestiges } from './07-world.ts';
import { SNAME, TER, claimDisc, initTerritory, rebuildLocks, stepTerritory, terBoxRebuild, terPct } from './08-territory.ts';
import { CARS, RW, RWS, addRoad, buildGraph, makeRoad, repaintAllRoads, reseatCars, roadProblem, sampleCurve, sampleLine, stepCars } from './09-roads.ts';
import { catPos, findSpot, makeBuilding, placeProblem, rebuildTown, selfTurning, NDIR, type Cat } from './10-town.ts';
import { CLOCK, FAR, MAPV, OV_ON, WEATHER, ZLEVELS, ZMIN, centerOn, clampCam, layout, mapDirtyAll, mapInit, render, screenToWorld, setZoom, stepClock, stepWeather, stepZoom, worldToScreen, zoomLevels } from './11-render.ts';
import { drawFlagIcon, drawPortrait } from './12-portrait.ts';
import { $, $of, HISTORY, achieve, addWall, drawCompass, setSpeed, setTool, stepKeys, toast, updateClockUI, updateUndo } from './13-ui.ts';
import { THUMBS, buildMenu, flagSVG, lootVestige, thumb } from './14-hud.ts';
import { DEMOS, EV, buildTime, newRes, stepEco, stepEvents, stepSpace } from './15-economy.ts';
import { CREWS, buildNav, offshoreFrom, stepBoats, type Boat } from './16-boats.ts';
import { PAPER, applySeason, deliverPaper, memGreeting, memRemember, updateCalUI, type ChatTurn } from './17-calendar.ts';
import { RIVAL, newBrain, rivalLanding, stepRival } from './20-rival.ts';
import { rleDecode, rleEncode } from '../rules/rle.ts';
declare global { interface Window { __okt?: Record<string, unknown> } }
/* ================= radio ================= */
// une annonce : camp (ou neutre), station, message, et de quoi y aller (un point de la carte, ou rien)
export type RadioSide = Side | 'neutre';
export type RadioGo = { (): Vec2 | null; live?: boolean };
export type RadioItem = [side: RadioSide, station: string, msg: string, go?: RadioGo];
export const bldGo = (type: string, side?: Side): RadioGo => (): Vec2 | null => { const l = SH.BLD.find(o => o.type === type && o.done && (!side || o.side === side)); return l ? [l.ca, l.cb] : null; };
export const RADIO: RadioItem[] = [
  ['usc', 'Radio Kutty Libre', 'Le nouveau modèle Cadillatte a des ailerons encore plus longs. Les mouettes sont jalouses.'],
  ['ccp', 'Radio Miaou-Scou', 'Le plan quinquennal de croquettes est dépassé de 300 %. Gloire aux ouvriers de l’usine n° 7 !'],
  ['usc', 'Radio Kutty Libre', 'Ce soir au diner : concours de twist. Milkshake à la sardine offert au gagnant.', bldGo('diner')],
  ['ccp', 'Radio Miaou-Scou', 'Match d’échecs historique : Boris Pattov attend toujours la réponse du pigeon voyageur.'],
  ['neutre', 'Météo marine', 'Mer calme, vent de noroît. Les barges peuvent sortir.'],
  ['usc', 'Radio Kutty Libre', 'Publicité : Kutty Cola, la boisson qui fait ronronner tout le secteur.'],
  ['ccp', 'Radio Miaou-Scou', 'Le Gastronom annonce un arrivage de sardines pour le prochain plan. La file d’attente est ouverte.', bldGo('epicerie', 'ccp')],
  ['usc', 'Radio Kutty Libre', 'Au cinéma : L’Invasion des souris de Mars. Séance à 21 h, pop-corn au thon.', bldGo('cinema')],
  ['ccp', 'Radio Miaou-Scou', 'Natacha Miaoulova s’entraîne pour devenir le premier chat en orbite. Ou le deuxième.'],
  ['neutre', 'Radio du port', 'Les chalutiers rentrent au port, les cales pleines de sardines.', bldGo('port')],
  ['ccp', 'Radio Miaou-Scou', 'Le camarade Igor Ronronov a tricoté 102 pelotes en une nuit. Médaille d’or du travail !', bldGo('usine', 'ccp')],
  ['neutre', 'Radio du port', 'Tonton Gribouille signale une sardine géante. Personne ne l’a vue. Comme d’habitude.', bldGo('pecherie')],
  ['usc', 'Radio Kutty Libre', 'Nos géomètres plantent des drapeaux jusqu’aux forêts du nord. Le territoire s’agrandit !', bldGo('drapeau', 'usc')],
  ['ccp', 'Radio Miaou-Scou', 'Récolte record au kolkhoze Étoile Rouge : 12 000 bottes de blé et un tracteur toujours en marche.', bldGo('kolkhoze', 'ccp')],
  ['neutre', 'Horloge parlante', 'Au quatrième top, il sera l’heure de faire la sieste. Top, top, top, top.'],
  ['usc', 'Radio Kutty Libre', 'Rappel : l’USC, c’est un frigo plein, une voiture à ailerons et un drive-in le samedi.'],
  ['ccp', 'Radio Miaou-Scou', 'La CCR avance : chaque bergerie, chaque kolkhoze nous rapproche de l’avenir radieux.'],
  ['neutre', 'Radio du port', 'Des moutons ont été vus en train de brouter une route toute neuve. L’enquête continue.', bldGo('bergerie')]
];
export const radioText = $('radioText'), radioStation = $('radioStation'), radioDot = $('radioDot');
export let radioIdx = -1, radioX = 0, radioW = 0, radioHold = 0; export const radioQueue: RadioItem[] = []; SH.radioQueue = radioQueue; export let radioSide: RadioSide = 'usc';
export let radioGo: RadioGo | null = null;
export const radioEl = $('radio');
/** les dernieres nouvelles diffusees, les plus recentes d'abord (lues par la fiche de la tour radio) */
export const RADIO_LOG: { side: RadioSide; station: string; msg: string }[] = []; SH.RADIO_LOG = RADIO_LOG;
export function radioShow(item: RadioItem){
  const [side, station, msg, go] = item;
  RADIO_LOG.unshift({ side, station, msg: msg.replace(DASHES, ',') }); if (RADIO_LOG.length > 8) RADIO_LOG.pop();
  radioSide = side; radioGo = go || null;
  radioEl.classList.toggle('go', !!radioGo);
  radioEl.title = radioGo ? 'Clique pour y aller' : '';
  radioStation.textContent = '';
  // le drapeau du camp (rien pour une radio neutre), puis le nom de la station
  const s1 = document.createElement('span'); s1.className = 'rs-flag'; if (side === 'usc' || side === 'ccp') s1.innerHTML = flagSVG(side);
  const s2 = document.createElement('span'); s2.className = 'rs-name'; s2.textContent = station.toUpperCase();
  radioStation.append(s1, s2);
  radioText.textContent = '';
  const b = document.createElement('b'); b.textContent = side === 'ccp' ? '★' : side === 'usc' ? '♪' : '~';
  radioText.append(b, document.createTextNode(msg.replace(DASHES, ',')));
  if (radioGo){ const g = document.createElement('i'); g.className = 'radio-go'; g.textContent = 'Y aller'; radioText.append(g); }
  const track = radioText.parentElement; radioX = track ? track.clientWidth : 0; radioW = radioText.scrollWidth; radioHold = 0;
  if (reduceMotion) radioX = 0;
}
radioEl.addEventListener('click', () => {
  if (!radioGo) return;
  if (state.chatCat) closeChat();
  const g = radioGo.live ? radioGo : radioGo();
  if (!g) return;
  cam.follow = g; if (SH.Z < SH.KDEF) setZoom(SH.KDEF);
});
export function radioNext(){
  const it = radioQueue.shift(); if (it){ radioShow(it); SH.sfx(it[0]); return; }
  for (let k = 0; k < RADIO.length; k++){
    radioIdx = (radioIdx + 1) % RADIO.length;
    const it = RADIO[radioIdx];
    // une annonce qui renvoie vers un batiment n'a de sens que s'il existe
    if (!it[3] || it[3]()) { radioShow(it); return; }
  }
}
export function radioFlash(l: Building){
  const nm = typeName(l.type, l.side).toLowerCase();
  radioQueue.push(l.side === 'ccp'
    ? ['ccp', 'Radio Miaou-Scou', 'Flash spécial : le peuple inaugure fièrement ' + (TYPES[l.type].fem ? 'une nouvelle ' : 'un nouveau ') + nm + '. Applaudissements obligatoires !', () => [l.ca, l.cb]]
    : ['usc', 'Radio Kutty Libre', 'Flash spécial : ' + (TYPES[l.type].fem ? 'une nouvelle ' : 'un nouveau ') + nm + ' ouvre ses portes. Venez nombreux, c’est gratuit ce soir !', () => [l.ca, l.cb]]);
}
export let nightAnnounced: boolean | null = null;
export function stepRadio(dt: number, t: number){
  const night = SH.NIGHT > .5;
  if (nightAnnounced !== null && night !== nightAnnounced) radioQueue.push(night
    ? ['neutre', 'Radio du port', 'La nuit tombe sur l’île. Les phares s’allument et les néons clignotent.']
    : ['neutre', 'Radio du port', 'Le soleil se lève sur Kutty. Premier café au diner, première file au Gastronom.']);
  nightAnnounced = night;
  if (WEATHER.changed){
    const w = WEATHER.changed; WEATHER.changed = null;
    SH.logDay('both', 'weather', w);
    const msgs: Record<string, string> = { clair: 'Le ciel se dégage sur l’île. Soleil pour les deux camps, pour une fois tout le monde est d’accord.',
      pluie: 'Averses sur Kutty. Sortez les parapluies, et rentrez les chats qui détestent l’eau. C’est-à-dire tous.',
      neige: 'Il neige sur l’île ! Les toits blanchissent, les forêts aussi.',
      brouillard: 'Brouillard sur la côte. Les barges avancent à tâtons, les espions sont ravis.' }, msg = msgs[w];
    if (msg) radioQueue.unshift(['neutre', 'Météo marine', msg]);
  }
  radioDot.classList.toggle('off', Math.floor(t * 2) % 2 === 0);
  if (reduceMotion || radioEl.hidden){ radioHold += dt; if (radioHold > (radioEl.hidden ? 14 : 8)) radioNext(); return; }
  radioX -= 42 * dt;
  radioText.style.transform = 'translateX(' + Math.round(radioX) + 'px)';
  if (radioX < -radioW - 20) radioNext();
}

/* ================= conversation : chaque chat a ses repliques toutes faites ================= */
export const chatLog = $('chatLog'), chatInput = $of('chatInput', HTMLInputElement), quick = $('quick');
export const portraitCv = $of('portrait', HTMLCanvasElement);
export let chatTurns: ChatTurn[] = [], chatBusy = false, factIdx = 0;
export const QUICK = ['Bonjour !', 'Tu fais quoi ici ?', 'Et l’autre camp ?', 'Raconte-moi un secret', 'Au revoir'];
export const SIDE_LABEL: Record<RadioSide, string> = { usc: 'UNITED SANDS OF CATS', ccp: 'CATS COMMUNIST REPUBLIC', neutre: 'NEUTRE' };
export function addMsg(text: string, who: string, extra?: string){
  const el = document.createElement('div');
  el.className = 'msg ' + who + (extra ? ' ' + extra : '');
  el.textContent = text;
  chatLog.appendChild(el); chatLog.scrollTop = chatLog.scrollHeight;
  return el;
}
export function fallbackReply(c: Cat, msg: string){
  const m = msg.toLowerCase();
  // l'actualite de la partie (35-vie) : famine, frontiere, guerre, traites, fusees, victoire en vue
  if (c.side !== 'neutre' && !/au revoir|bye/.test(m) && typeof SH.fallbackHook === 'function'){ const sit = SH.fallbackHook(c.side, msg); if (sit) return sit; }
  if (/au revoir|bye|bonne nuit|à plus/.test(m)) return c.side === 'ccp' ? 'Au revoir, camarade. Reviens quand tu veux, la file d’attente t’attendra.' : 'À bientôt ! Et fais attention aux barges, elles ne freinent pas.';
  if (/ça va|ca va|comment/.test(m)) return c.side === 'ccp' ? 'Ça va très bien, comme le dit la Pravdachat. Et toi, camarade ?' : 'Ça va comme un chat au soleil, même la nuit. Et toi ?';
  if (/bonjour|salut|coucou|hello/.test(m)) return c.side === 'ccp' ? 'Bonjour, camarade ! Le peuple te salue, et moi aussi.' : 'Salut ! Belle journée pour agrandir le quartier, non ?';
  if (/quoi|fais|travail|métier/.test(m)) return 'Moi ? ' + c.job + '. ' + c.facts[0];
  if (/autre|camp|mur|rideau|ccr|usc|frontière/.test(m)) return c.side === 'ccp' ? 'L’autre camp ? Ils ont des ailerons et du bruit. Nous, on a des plans. Et des médailles.' : c.side === 'usc' ? 'Là-bas ? Tout est carré, même les voitures. Mais leur fanfare n’est pas mal.' : 'Moi je parle aux deux. Les poissons aussi, d’ailleurs.';
  if (/secret/.test(m)) return c.facts[(factIdx + 1) % c.facts.length];
  const f = c.facts[factIdx % c.facts.length]; factIdx++;
  return f;
}
export function openChat(c: Cat){
  if (state.chatCat) closeChat(true);
  SH.selectBuilding(null);
  state.chatCat = c; c.frozen = catPos(c, SH.NOW_T); c.frozen.moving = false; c.paused = true;
  $('chatName').textContent = c.name; $('chatJob').textContent = c.job;
  $('chatSide').textContent = SIDE_LABEL[c.side];
  drawFlagIcon($of('flag', HTMLCanvasElement), c.side);
  // le passeport de son pays (etape 0.22) : la couverture, le domicile, un numero, la ligne lisible par les machines
  $('chat').dataset.side = c.side;
  $('ppTitle').textContent = c.side === 'neutre' ? 'Laissez-passer' : c.side === 'ccp' ? 'Passeport du Peuple' : 'Passeport';
  const home = SH.BLD.find(l => l.id === c.homeId), hq = SH.BLD.find(l => l.type === 'qg' && l.side === c.side);
  const homeNm = home ? home.name || (TYPES[home.type] ? (c.side === 'ccp' && TYPES[home.type].nameCCP) || TYPES[home.type].name : home.type) : '';
  $('ppHome').textContent = homeNm ? homeNm + (hq && hq.name && hq.name !== homeNm ? ', ' + hq.name : '') : 'Île de Kutty';
  const num = (c.side === 'ccp' ? 'CC' : c.side === 'usc' ? 'US' : 'NT') + String(100000 + ((c.id * 7919) % 900000)).slice(0, 6);
  $('ppNum').textContent = num;
  const mrzName = c.name.toUpperCase().normalize('NFD').replace(/[^A-Z ]/g, '').trim().replace(/ +/g, '<');
  $('ppMrz').textContent = ('P<' + (c.side === 'ccp' ? 'CCR' : c.side === 'usc' ? 'USC' : 'NTR') + '<' + mrzName + '<'.repeat(40)).slice(0, 44) + '\n' + (num + '<' + '<'.repeat(40)).slice(0, 44);
  chatLog.textContent = ''; chatTurns = []; factIdx = 0;
  c.memCounted = false; c.helloNow = memGreeting(c) || c.hello;
  addMsg(c.helloNow, 'cat');
  chatTurns.push({ role: 'assistant', content: c.helloNow });
  quick.textContent = '';
  for (const q of QUICK){ const b = document.createElement('button'); b.className = 'btn'; b.type = 'button'; b.textContent = q; b.addEventListener('click', () => send(q)); quick.appendChild(b); }
  $('chat').hidden = false; document.body.classList.add('chat-open');
  if (SH.Z < SH.KDEF) setZoom(SH.KDEF);
  cam.target = [c.frozen.a, c.frozen.b];
  drawPortrait(c, SH.NOW_T, portraitCv);
  if (window.innerWidth > 640) setTimeout(() => chatInput.focus({ preventScroll: true }), 50);
}
export function closeChat(silent?: boolean){
  const c = state.chatCat; if (!c) return;
  SH.portraitTalk = false;
  c.paused = false; c.frozen = undefined;
  state.chatCat = null; cam.target = null;
  $('chat').hidden = true; document.body.classList.remove('chat-open');
}
$('chatClose').addEventListener('click', () => closeChat());
$('chatForm').addEventListener('submit', e => { e.preventDefault(); const v = chatInput.value.trim(); if (v) send(v); });
export function chatCamTarget(): Vec2 | null {
  const c = state.chatCat; if (!c || !cam.target) return null;
  const mobile = window.innerWidth <= 640;
  const px = mobile ? 0 : (-Math.min(380, window.innerWidth * .3) / 2) * SH.DPR / SH.Z;
  const py = mobile ? (-window.innerHeight * .3) * SH.DPR / SH.Z : 0;
  const g = groundDelta(-px, -py);
  return [cam.target[0] + g[0], cam.target[1] + g[1]];
}
export async function send(text: string){
  const c = state.chatCat; if (!c || chatBusy) return;
  chatInput.value = '';
  addMsg(text, 'me');
  chatTurns.push({ role: 'user', content: text });
  const bye = /^au revoir/i.test(text);
  chatBusy = true; $of('chatSend', HTMLButtonElement).disabled = true;
  const bubble = addMsg(c.name.split(' ')[0] + ' réfléchit…', 'cat', 'wait');
  await new Promise(r => setTimeout(r, 450));
  const reply = fallbackReply(c, text);
  bubble.classList.remove('wait'); bubble.textContent = reply;
  chatTurns.push({ role: 'assistant', content: reply });
  memRemember(c, chatTurns);
  SH.portraitTalk = true; setTimeout(() => { if (!chatBusy) SH.portraitTalk = false; }, Math.min(2600, 400 + reply.length * 28));
  chatBusy = false; $of('chatSend', HTMLButtonElement).disabled = false;
  if (bye) setTimeout(() => { if (state.chatCat === c) closeChat(); }, 1600);
}

/* ================= sauvegarde ================= */
// les parties sont rangees par emplacements (22-home.js) ; ici, la photo de la partie et sa relecture
export let saveTimer = 0;
// la photo d'une partie (version 8) : batiments, routes, murs et tours en listes courtes, camp code 0 (USC) ou 1 (CCR)
export type SaveBld = [type: string, side: number, ca: number, cb: number, lvl: number, dir: number, age: number, upAge: number];
export type SaveRoad = [side: number, pts: Vec2[]];
export type SaveWall = [side: number, pa: number, pb: number, qa: number, qb: number, g: number, line: number];
export type SaveTower = [side: number, a: number, b: number, ph: number, line: number];
export interface SaveData {
  v: number; seed: number; size: string; conf: string; side: Side; t: number; speed: number; cal: number; h: number;
  res: number[][]; bld: SaveBld[]; roads: SaveRoad[]; walls: SaveWall[]; towers: SaveTower[]; trees: string; vest: number[];
  ter: string; space: number[]; ev: number; rival: number[]; won: Side | ''; land: Vec2 | null; rland: Vec2 | null;
  /** nom de la partie, ajoute par 22-home */
  name?: string;
  /** etat des modules ajoutes depuis la version 9 (voir HOOKS.save) */
  ext?: Record<string, unknown>;
}
// ce qui sort du stockage n'est qu'une valeur JSON : on ne garde que ce qui porte le bon numero de version
export function asSave(d: unknown): SaveData | null { return typeof d === 'object' && d !== null && 'v' in d && (d.v === 8 || d.v === 9) ? d as SaveData : null; }
// territoire compresse : longueurs des suites de cases identiques
export { rleDecode, rleEncode };
export function snapshot(): SaveData {
  return { v: 9, seed: GAME.seed, size: GAME.size, conf: GAME.conf, side: GAME.side, t: Math.round(GAME.t), speed: GAME.speed, cal: SH.CAL.m, h: +CLOCK.h.toFixed(2),
    res: SIDES.map(s => [Math.round(SH.RES[s].croq), Math.round(SH.RES[s].laine), Math.round(SH.RES[s].ron)]),
    bld: SH.BLD.map(l => [l.type, l.side === 'usc' ? 0 : 1, l.ca, l.cb, l.lvl || 1, l.dir || 0, l.done ? -1 : +(GAME.t - l.buildT).toFixed(1), l.upT ? +(GAME.t - l.upT).toFixed(1) : -1]),
    roads: SH.ROADS.map(r => [r.side === 'usc' ? 0 : 1, r.pts.map(p => [Math.round(p[0] * 10) / 10, Math.round(p[1] * 10) / 10])]),
    walls: SH.WALLS.map(w => [w.side === 'usc' ? 0 : 1, +w.pa.toFixed(1), +w.pb.toFixed(1), +w.qa.toFixed(1), +w.qb.toFixed(1), w.g, w.line]),
    towers: SH.WALL_TOWERS.map(w => [w.side === 'usc' ? 0 : 1, +w.a.toFixed(1), +w.b.toFixed(1), w.ph, w.line]),
    trees: TREES.list.map((t, i) => t.alive ? '' : i).filter(x => x !== '').join(','),
    vest: VEST.filter(v => v.looted).map(v => v.id),
    ter: rleEncode(TER.own), space: [SH.SPACE.usc.stage, SH.SPACE.ccp.stage], ev: Math.round(EV.next), rival: [RIVAL[GAME.rival].lastBarge, RIVAL[GAME.rival].lastWall], won: GAME.winner || '',
    land: GAME.landing ? [Math.round(GAME.landing[0]), Math.round(GAME.landing[1])] : null, rland: GAME.rivalLanding ? [Math.round(GAME.rivalLanding[0]), Math.round(GAME.rivalLanding[1])] : null, ext: extSave() };
}
// ce que les modules ajoutes depuis (ressources, unites, recherche...) rangent dans la sauvegarde
export function extSave(): Record<string, unknown> { const ext: Record<string, unknown> = {}; for (const f of HOOKS.save) f(ext); return ext; }
export function saveSoon(){
  if (GAME.mode !== 'play' && GAME.mode !== 'over') return;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(SH.saveNow, 900);
}
export function loadGame(d: SaveData | null){
  // version 8 : quatre directions pour tous les batiments ; version 9 : seize pour ceux qui ne sont pas sur la cote
  if (!d || (d.v !== 8 && d.v !== 9)) return false;
  // le monde se refait depuis la graine ; une partie d'avant les rivieres (etape 7) se refait sans elles
  SH.LOAD_EXT = d.ext && typeof d.ext === 'object' ? d.ext : {};
  try { newWorld(d.seed | 0, d.size, d.conf); } finally { SH.LOAD_EXT = null; }
  GAME.side = d.side === 'ccp' ? 'ccp' : 'usc'; GAME.rival = other(GAME.side); GAME.t = +d.t || 0; SH.CAL.m = clamp(d.cal | 0, 0, 11); CLOCK.h = +d.h || 10;
  SIDES.forEach((s, k) => { const r = d.res && d.res[k]; if (r){ SH.RES[s].croq = +r[0] || 0; SH.RES[s].laine = +r[1] || 0; SH.RES[s].ron = +r[2] || 0; } });
  for (const t of String(d.trees || '').split(',')){ const i = +t; if (t !== '' && TREES.list[i]) TREES.list[i].alive = false; }
  for (const id of d.vest || []){ const v = VEST.find(o => o.id === id); if (v) v.looted = true; }
  for (const b of d.bld || []){
    // les deux anciens gratte-ciel (un par camp) n'en font plus qu'un
    const ty = b[0] === 'artdeco' || b[0] === 'stalinien' ? 'gratteciel' : b[0];
    if (!TYPES[ty] || !SH.ECO[ty]) continue;
    const dir = (d.v === 8 && !selfTurning(ty) ? (b[5] | 0) * 4 : b[5] | 0) % NDIR;
    const l = makeBuilding(ty, b[1] ? 'ccp' : 'usc', +b[2], +b[3], dir);
    l.lvl = clamp(b[4] | 0, 1, 3);
    if (b[6] < 0){ l.done = true; l.doneT = -9; } else { l.buildT = GAME.t - b[6]; l.bdur = buildTime(l.type); }
    if (b[7] >= 0){ l.upT = GAME.t - b[7]; l.udur = buildTime(l.type) * .7; }
    SH.BLD.push(l); clearForest(l.a0, l.a1, l.b0, l.b1);
  }
  for (const r of d.roads || []) if (Array.isArray(r[1]) && r[1].length > 1){ SH.ROADS.push(makeRoad(r[1], r[0] ? 'ccp' : 'usc')); clearForestAlong(r[1]); }
  for (const w of d.walls || []) SH.WALLS.push({ side: w[0] ? 'ccp' : 'usc', pa: +w[1], pb: +w[2], qa: +w[3], qb: +w[4], g: w[5] | 0, line: w[6] });
  for (const w of d.towers || []) SH.WALL_TOWERS.push({ side: w[0] ? 'ccp' : 'usc', a: +w[1], b: +w[2], ph: +w[3], line: w[4] });
  if (d.ter){ rleDecode(d.ter, TER.own); TER.cnt.usc = TER.cnt.ccp = 0; for (let i = 0; i < TER.N; i++){ if (!TER.land[i]) TER.own[i] = 0; else { const sn = SNAME[TER.own[i]]; if (sn) TER.cnt[sn]++; } } terBoxRebuild(); }
  if (Array.isArray(d.space)){ SH.SPACE.usc.stage = d.space[0] | 0; SH.SPACE.ccp.stage = d.space[1] | 0; }
  EV.next = +d.ev || 150; if (Array.isArray(d.rival)){ RIVAL[GAME.rival].lastBarge = +d.rival[0] || 0; RIVAL[GAME.rival].lastWall = +d.rival[1] || 0; }
  RIVAL.auto = { usc: GAME.rival === 'usc', ccp: GAME.rival === 'ccp' };
  GAME.winner = d.won || null;
  for (const f of HOOKS.load) f(d.ext && typeof d.ext === 'object' ? d.ext : {});
  TREES.ver++;
  repaintAllRoads(); buildGraph(); rebuildLocks(); rebuildTown(); SH.refreshAccess(); reseatCars();
  for (const l of SH.BLD) if (l.done) SH.boatsForBuilding(l);
  setSpeed(clamp(d.speed | 0, 1, 4) || 1);
  mapDirtyAll();
  enterPlay();
  // partie sauvegardee pendant le debarquement : les barges ne sont pas gardees, le QG se pose directement sur la plage choisie
  GAME.landing = d.land || null; GAME.rivalLanding = d.rland || null;
  const lands: [Side, Vec2 | null][] = [[GAME.side, d.land], [GAME.rival, d.rland]];
  for (const [side, p] of lands) if (p && !SH.BLD.some(l => l.side === side && l.type === 'qg')) landHQ(side, +p[0], +p[1]);
  const hq = SH.BLD.find(l => l.side === GAME.side && l.type === 'qg');
  if (hq) centerOn(hq.ca, hq.cb);
  setZoom(SH.KDEF, null, null, true);
  return true;
}
export function clearForestAlong(pts: Vec2[]){ for (let k = 0; k + 1 < pts.length; k++){ const [pa, pb] = pts[k], [qa, qb] = pts[k + 1]; clearForest(Math.min(pa, qa) - RWS, Math.max(pa, qa) + RWS, Math.min(pb, qb) - RWS, Math.max(pb, qb) + RWS); } }
setInterval(() => saveSoon(), 20000);

/* ================= une partie : nouvelle ile, debarquement, victoire ================= */
export function newWorld(seed: number, size: string, conf: string){
  GAME.seed = seed; GAME.size = isMapSize(size) ? size : 'moyenne'; GAME.conf = isMapConf(conf) ? conf : 'une';
  setMapSize(GAME.size);
  buildGround(seed, GAME.conf);
  buildForests(seed);
  buildMountains(seed);
  buildVestiges(seed);
  for (const f of HOOKS.world) f(seed);
  initTerritory();
  buildNav();
  SH.BLD = []; SH.ROADS = []; SH.WALLS = []; SH.WALL_TOWERS = []; SH.BOATS = []; SH.CATS = []; CARS.length = 0; LAMP_POS.length = 0; DEMOS.length = 0; CREWS.length = 0; HISTORY.length = 0; updateUndo();
  for (const s of SIDES){ Object.assign(SH.RES[s], newRes()); SH.SPACE[s].stage = 0; SH.SPACE[s].launchT = null; }
  for (const f of HOOKS.reset) f();
  GAME.t = 0; GAME.winner = null; EV.next = 150; EV.cur = null; $('eventCard').hidden = true;
  RIVAL.usc = newBrain(); RIVAL.ccp = newBrain();
  SH.CAL.m = 8; CLOCK.h = 9.5; applySeason(); updateCalUI();
  repaintAllRoads(); buildGraph(); rebuildTown();
  mapInit(); mapDirtyAll();
  // le recul maximal suit la taille de la carte
  zoomLevels(); if (SH.ZT < ZMIN()) setZoom(ZMIN(), null, null, true);
}
// l'ecran de jeu : barre du haut, dock, radio
export function enterPlay(){
  GAME.mode = 'play';
  $('intro').hidden = true; $('landing').hidden = true; $('endBox').hidden = true;
  // (etape 0.23) plus de bandeau radio en haut : les nouvelles passent par la tour radio (onglet Frontiere)
  $('topbar').hidden = false; $('bottom').hidden = false;
  document.body.dataset.side = GAME.side; document.body.classList.add('playing');
  THUMBS_CLEAR(); buildMenu(); setTool('walk'); SH.renderHUD(); updateCalUI();
  if (!PAPER.issue) deliverPaper(true);
}
export function THUMBS_CLEAR(){ for (const k in THUMBS) delete THUMBS[k]; }
// accueil, parties, profil et options : voir 22-home.js
// choix de la plage, sur la carte de toute l'ile
export function startLanding(){
  GAME.mode = 'landing';
  $('intro').hidden = true; $('landing').hidden = false; $('topbar').hidden = true; $('bottom').hidden = true; $('radio').hidden = true;
  document.body.dataset.side = GAME.side;
  // on descend de l'espace jusqu'a l'ile entiere : la planete tourne pour ramener l'ile au milieu, par le plus court chemin
  if (SH.CURV > 0){
    const P2 = TAU * RP; cam.a = IS.ca + (cam.a - IS.ca) - Math.round((cam.a - IS.ca) / P2) * P2;
    cam.follow = [IS.ca, IS.cb]; cam.phiT = 0;
  } else { centerOn(IS.ca, IS.cb); cam.phi = 0; cam.phiT = null; }
  setZoom(SH.KMIN * .16 / mapScale(), null, null, false);
  setTool('landing');
}
export function chooseLanding(a: number, b: number){
  const s = nearestShore(a, b, 90);
  if (!s){ toast('Vise la côte : les barges accostent sur une plage.'); return; }
  const inland = findSpot('qg', GAME.side, s[0], s[1], 80, true);
  if (!inland){ toast('Trop de rochers ou de forêt épaisse ici : choisis une autre plage.'); return; }
  const rv = rivalLanding(s[0], s[1]);
  if (!rv){ toast('Choisis une plage un peu plus au centre d’un rivage.'); return; }
  GAME.landing = s; GAME.rivalLanding = rv;
  RIVAL.auto = { usc: GAME.rival === 'usc', ccp: GAME.rival === 'ccp' };
  enterPlay();
  // les barges arrivent du large, en formation
  const fleets: [Side, Vec2][] = [[GAME.side, s], [GAME.rival, rv]];
  for (const [side, p] of fleets){
    const off = offshoreFrom(p[0], p[1]);
    for (let k = 0; k < 3; k++){
      const d: Vec2 = [off[0] + (k - 1) * 26, off[1] + (k - 1) * 18];
      const b: Boat | null = SH.sendBarge(side, d, [p[0] + (k - 1) * 10, p[1] + (k - 1) * 6], k === 1 ? 'qg' : 'crew');
      // pas de route en mer jusque-la : le QG se batit tout de suite
      if (!b && k === 1) landHQ(side, p[0], p[1]);
      if (b && k !== 1) b.onArrive = (bb) => { bb.state = 'landed'; bb.landT = GAME.t; if (bb.shore) CREWS.push({ side: bb.side, a0: bb.a, b0: bb.b, a1: bb.shore[0], b1: bb.shore[1], t0: GAME.t }); };
      if (b && side === GAME.side && k === 1) cam.follow = Object.assign((t: number): Vec2 | null => b.state === 'go' ? [b.a, b.b] : null, { live: true });
    }
  }
  setZoom(SH.KDEF * .8);
  toast(ISEED.isl.length > 1 && islandNear(rv[0], rv[1]) !== islandNear(s[0], s[1]) ? 'Les barges font route vers la côte. L’autre camp débarque sur une autre île.' : 'Les barges font route vers la côte. L’autre camp débarque de l’autre côté de l’île.');
  radioQueue.unshift(['neutre', 'Météo marine', 'Mer calme sur Kutty : deux flottilles de barges approchent de l’île, chacune de son côté.']);
  SH.sfx(GAME.side);
}
// arrivee de la barge du QG : le QG se construit, un premier bout de route et un premier morceau de territoire
export function landHQ(side: Side, a: number, b: number){
  const spot = findSpot('qg', side, a, b, 90, true);
  if (!spot){ if (side === GAME.side) toast('Impossible de bâtir le QG ici.'); return; }
  const l = makeBuilding('qg', side, spot[0], spot[1], 0);
  claimDisc(spot[0], spot[1], 44, side);
  claimDisc(a, b, 18, side);
  SH.startBuilding(l);
  stubRoad(l, side, [a, b]);
  SH.logDay(side, 'land', 'le débarquement');
  if (side === GAME.side){
    toast('Débarquement réussi ! Ton QG se construit. Trace des routes et bâtis tes premières maisons.');
    cam.follow = [l.ca, l.cb]; SH.sfx('build', l.ca, l.cb);
  }
}
// premiere route le long d'un cote du QG : on prefere le cote qui tourne le dos a la mer
export function stubRoad(l: Building, side: Side, away: Vec2 | null){
  const cand: { pts: Vec2[]; score: number }[] = [];
  for (let k = 0; k < 4; k++){
    const v = DIR_V[k], off = RW + 2;
    const ca = l.ca + v[0] * ((l.a1 - l.a0) / 2 + off), cb = l.cb + v[1] * ((l.b1 - l.b0) / 2 + off);
    const inland = away ? (ca - away[0]) * v[0] + (cb - away[1]) * v[1] : 0;
    for (const half of [40, 30, 22]) for (const shift of [0, -12, 12]){
      const ta = v[1] !== 0 ? 1 : 0, tb = v[0] !== 0 ? 1 : 0;
      const p: Vec2 = [ca + ta * (shift - half), cb + tb * (shift - half)], q: Vec2 = [ca + ta * (shift + half), cb + tb * (shift + half)];
      cand.push({ pts: sampleLine(p, q), score: inland + half * .5 - Math.abs(shift) * .2 });
    }
  }
  cand.sort((x, y) => y.score - x.score);
  for (const c of cand) if (!roadProblem(c.pts, side)){ addRoad(c.pts, side); return true; }
  return false;
}
// la victoire au premier camp a 60 % de l'ile n'existe plus : les victoires sont celles de l'etape 12 (SH.checkWin)
export function checkVictory(){
  if (GAME.mode !== 'play' || GAME.winner) return;
  if (typeof SH.checkWin === 'function') SH.checkWin();
}
/** fin de partie : le vainqueur, le titre et le texte de l'ecran de fin */
export function endGame(s: Side, title: string, text: string){
  GAME.winner = s; SH.profileResult(s); saveSoon();
  if (s === GAME.side) achieve('VICTOIRE');
  $('endFlag').innerHTML = flagSVG(s); $('endTitle').textContent = title; $('endText').textContent = text;
  $('endBox').hidden = false; SH.fwSalvo(s, 12); SH.sfx('launch');
}
SH.endGame = endGame;
$('endNew').addEventListener('click', () => { $('endBox').hidden = true; SH.openIntro('new'); });
$('endKeep').addEventListener('click', () => { $('endBox').hidden = true; });

/* ================= boucle ================= */
export const now = () => performance.now();
// VT : temps des animations ; il s'arrete quand le jeu est en pause, pour que tout se fige
export let last = now(), compassPhi: number | null = null, secAcc = 0, VT = 0;
export function frame(tms: number){
  const dt = Math.min(0.1, (tms - last) / 1000); last = tms;
  const frozen = GAME.paused && GAME.mode === 'play', vdt = frozen ? 0 : dt;
  VT += vdt;
  const t = VT;
  SH.NOW_T = t;
  // temps du jeu : pause et vitesse
  const sdt = GAME.mode === 'play' && !GAME.paused ? dt * GAME.speed : (GAME.mode === 'landing' ? dt : 0);
  GAME.t += sdt;
  stepKeys(dt);
  if (cam.phiT != null){
    const d = cam.phiT - cam.phi;
    if (Math.abs(d) < .002){ cam.phi = cam.phiT; cam.phiT = null; }
    else cam.phi += d * Math.min(1, dt * 7);
  }
  const ct = chatCamTarget();
  if (ct){ cam.a += (ct[0] - cam.a) * Math.min(1, dt * 4); cam.b += (ct[1] - cam.b) * Math.min(1, dt * 4); clampCam(); }
  else if (cam.follow){
    const fol = cam.follow, live = typeof fol === 'function', f = live ? fol(t) : fol;
    if (!f) cam.follow = null;
    else {
      cam.a += (f[0] - cam.a) * Math.min(1, dt * 2.2); cam.b += (f[1] - cam.b) * Math.min(1, dt * 2.2); clampCam();
      if (!live && Math.hypot(f[0] - cam.a, f[1] - cam.b) < 1.5) cam.follow = null;
    }
  }
  if (state.auto) state.theta = (state.theta + TAU / state.period * vdt) % TAU;
  stepZoom(dt);
  stepCars(sdt);
  stepWeather(vdt, t);
  stepClock(sdt);
  stepBoats(sdt);
  stepTerritory(sdt);
  stepEco(sdt);
  stepRival(sdt);
  stepEvents(sdt, t);
  stepSpace(t);
  for (const f of HOOKS.step) f(sdt, t);
  updateClockUI();
  secAcc += dt; if (secAcc > 1){ secAcc = 0; checkVictory(); if (GAME.mode === 'play') SH.renderHUD(); }
  render(t);
  for (const f of HOOKS.after) f(t);
  if (compassPhi !== cam.phi){ compassPhi = cam.phi; drawCompass(); }
  if (state.chatCat) drawPortrait(state.chatCat, t, portraitCv);
  if (!state.uiHidden && GAME.mode === 'play') stepRadio(dt, t);
  requestAnimationFrame(frame);
}

export let rz = 0;
window.addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { layout(); }, 120); });
export function start(){
  layout();
  // en fond de l'accueil : une ile tiree au sort, vue de loin, qui tourne doucement
  SH.homeIsland(1 + Math.floor(Math.random() * 99999));
  radioNext();
  SH.openIntro();
  window.__okt = { SH, state, cam, GAME, WEATHER, RES: SH.RES, BLD: () => SH.BLD, ROADS: () => SH.ROADS, WALLS: () => SH.WALLS, BOATS: () => SH.BOATS, CATS: () => SH.CATS, TER, TREES, MAPV, get VEST(){ return VEST; }, lootVestige, SPACE: SH.SPACE, EV, RIVAL, CLOCK, CAL: SH.CAL, TYPES, ECO: SH.ECO, PEAKS,
    setZoom, centerOn, unprj, prj, worldToScreen, screenToWorld, placeProblem, findSpot, makeBuilding, startBuilding: SH.startBuilding, addRoad, roadProblem, sampleLine, sampleCurve, addWall, sendBarge: SH.sendBarge, chooseLanding, terPct, claimDisc,
    render, FAR, rebuildTown, snapshot, loadGame, newWorld, enterPlay, applySeason, updateCalUI, deliverPaper, forceEvent: () => { EV.next = 0; }, autoBoth: () => { RIVAL.auto = { usc: true, ccp: true }; }, selectBuilding: SH.selectBuilding, setTool, upgradeBuilding: SH.upgradeBuilding, rivalStep: stepRival,
    get Z(){ return SH.Z; }, get K(){ return SH.K; }, get KMIN(){ return SH.KMIN; }, get KDEF(){ return SH.KDEF; }, get ZLEVELS(){ return ZLEVELS; }, get OV_ON(){ return OV_ON; }, get view(){ return [W, H]; }, get NIGHT(){ return SH.NIGHT; }, get CURV(){ return SH.CURV; }, geoCast, geoProj, WARP: SH.WARP, get SC(){ return SC; }, islandNear, ISL: () => ISEED.isl, saveNow: SH.saveNow, thumb, newWorldOpts: () => [GAME.size, GAME.conf] };
  requestAnimationFrame(frame);
}
setTimeout(start, 30);

// appeles depuis des modules plus petits en numero
Object.assign(SH, { radioFlash, openChat, closeChat, saveSoon, chooseLanding, landHQ, stubRoad });
