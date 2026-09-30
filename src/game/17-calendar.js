import { SH } from './00-shared.ts';
import { COLOR, GAME, H, HOOKS, M, N, SIDES, TAU, W, cam, clamp, fput, hash2, other, state } from './01-core.js';
import { TYPES } from './04-types.js';
import { terPct } from './08-territory.ts';
import { catPos } from './10-town.ts';
import { CLOCK, OV_ON, WEATHER, render, scene } from './11-render.js';
import { $, toast } from './13-ui.js';
/* ================= calendrier : un jour de jeu = un mois ================= */
export const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
export const CAL = { m: 8 };
export function seasonOf(m){ return m === 11 || m <= 1 ? 'hiver' : m <= 4 ? 'printemps' : m <= 7 ? 'été' : 'automne'; }
export function feteOf(m){
  if (m === 11) return { id: 'nouvel', name: 'les fêtes de fin d’année', side: 'both' };
  if (m === 6) return { id: 'reve', name: 'le Jour de l’USC', side: 'usc' };
  if (m === 4) return { id: 'plan', name: 'la Fête de la CCR', side: 'ccp' };
  return null;
}
export const feteSide = (side) => { const f = feteOf(CAL.m); return !!f && (f.side === 'both' || f.side === side); };
export const hexRGB = (h) => { const v = parseInt(h.slice(1), 16); return [v >> 16, (v >> 8) & 255, v & 255]; };
export const SEASON_PAL = {
  automne: [[M.TREE, '#a8612c', '#dd9b40'], [M.GRASS, '#7c9a40', '#a4bd62'], [M.FIELD, '#b08a3a', '#d8b35c']],
  hiver: [[M.TREE, '#4d6150', '#7d8e7b'], [M.GRASS, '#7a8d66', '#a0ae8a'], [M.FIELD, '#8c8a6a', '#b0ad8c']],
  printemps: [[M.TREE, '#5aa645', '#f3b4c6'], [M.GRASS, '#60a944', '#8ed06a']],
  'été': []
};
export function applySeason(){
  const se = seasonOf(CAL.m); SH.SEAS = {};
  if (COLOR) for (const [m, c0, c1] of SEASON_PAL[se]) SH.SEAS[m] = [hexRGB(c0), hexRGB(c1)];
  SH.SEAS_KEY = ':' + se; SH.palKey = '';
}
export function updateCalUI(){
  const el = $('calLabel');
  if (el) el.textContent = MONTHS[CAL.m] + ' · ' + seasonOf(CAL.m);
}
export function newMonth(){
  CAL.m++; if (CAL.m > 11){ CAL.m = 0; SH.fwSalvo('both', 16); SH.radioQueue.unshift(['neutre', 'Radio du port', 'Bonne année ! Les deux camps tirent leur feu d’artifice en même temps. Pour une fois.']); }
  applySeason(); updateCalUI();
  const se = seasonOf(CAL.m), f = feteOf(CAL.m);
  const SE_MSG = { printemps: 'Le printemps arrive sur Kutty : les arbres fleurissent des deux côtés du mur.', 'été': 'L’été est là : plage, glaces à la sardine et orages le soir.', automne: 'L’automne roussit les forêts de l’île. Les kolkhozes rentrent la récolte.', hiver: 'L’hiver tombe sur l’île. Sortez les écharpes, la neige n’est pas loin.' };
  if ([2, 5, 8, 11].includes(CAL.m)) SH.radioQueue.unshift(['neutre', 'Météo marine', SE_MSG[se]]);
  if (f){
    const msg = f.id === 'nouvel' ? ['neutre', 'Radio du port', 'Décembre sur Kutty : sapins illuminés dans les deux camps et feu d’artifice chaque nuit jusqu’au Nouvel An.']
      : f.id === 'reve' ? ['usc', 'Radio Kutty Libre', 'Juillet, c’est le Jour de l’USC ! Voitures chromées, barbecue au thon et feu d’artifice tous les soirs.']
      : ['ccp', 'Radio Miaou-Scou', 'Mai, Fête de la CCR ! Drapeaux rouges, fanfare et feu d’artifice du peuple chaque nuit.'];
    SH.radioQueue.unshift(msg);
    logDay(f.side, 'fete', f.name);
  }
  logDay('both', 'month', MONTHS[CAL.m]);
  SH.saveSoon();
}
export let calH = null;
export function stepCal(dt, t){
  const h = CLOCK.h;
  if (calH != null){
    if (calH > 20 && h < 4) newMonth();
    if (calH < 7 && h >= 7 && h - calH < 3 && GAME.mode === 'play') deliverPaper(false);
  }
  calH = h;
}
HOOKS.step.push(stepCal);

/* ================= carnet du jour : ce qui s'est passe, pour le journal ================= */
export const DAYLOG = [];
export function logDay(side, kind, txt, data){ DAYLOG.push({ side, kind, txt: String(txt || ''), data: data || {} }); if (DAYLOG.length > 40) DAYLOG.shift(); }

/* ================= journal du matin : Gazette de Kutty et Pravdachat ================= */
export const PAPER = { n: 1, issue: null, side: 'usc' };
export const PAPER_NAME = { usc: 'Gazette de Kutty', ccp: 'Pravdachat' };
export function campStats(){
  const o = {};
  for (const s2 of SIDES){ const R = SH.RES[s2]; o[s2] = { pct: Math.round(terPct(s2) * 100), croq: Math.floor(R.croq), laine: Math.floor(R.laine), ron: Math.floor(R.ron), pop: R.pop, short: !!R.short, space: SH.SPACE[s2].stage }; }
  o.weather = WEATHER.shown === 'clair' || WEATHER.k < .4 ? 'clair' : WEATHER.shown; o.season = seasonOf(CAL.m); o.fete = feteOf(CAL.m); o.wall = SH.WALLS.length > 0;
  return o;
}
export function deliverPaper(first){
  PAPER.issue = { n: PAPER.n++, m: CAL.m, log: DAYLOG.splice(0), stats: campStats(), ed: null, busy: false, note: '', photo: {} };
  const b = $('btnPaper'); if (b){ b.hidden = false; b.classList.toggle('fresh', !first); }
  if (!first){
    toast('Le journal du matin est arrivé : clique sur Journal pour le lire.');
    SH.radioQueue.push(['neutre', 'Radio du port', 'Les crieurs de journaux sont dans les rues : la Gazette de Kutty à l’ouest, la Pravdachat à l’est.']);
  }
  if (!$('paper').hidden){ renderPaper(); generatePaper(PAPER.issue); }
}
export function reporter(side, n){ const L = SH.CATS.filter(c => c.side === side); return L.length ? L[n % L.length] : { name: 'la rédaction', job: '' }; }
export function topOf(log, side){
  const mine = log.filter(e => e.side === side || e.side === 'both');
  for (const k of ['space', 'wall', 'barge', 'fete', 'event', 'upgrade', 'build', 'short', 'weather']){ for (let i = mine.length - 1; i >= 0; i--) if (mine[i].kind === k) return mine[i]; }
  return null;
}
export const WX_WORD = { clair: 'grand soleil', pluie: 'averses', neige: 'neige', brouillard: 'brouillard' };
export function paperTemplate(iss, side){
  const S = iss.stats, me = S[side], ot = S[side === 'usc' ? 'ccp' : 'usc'], us = side === 'usc';
  const e = topOf(iss.log, side), fem = e && e.data.type && TYPES[e.data.type] && TYPES[e.data.type].fem;
  let titre, chapeau, legende;
  if (!e){
    titre = us ? 'Une journée tranquille chez les United Sands' : 'Le Plan avance exactement comme prévu';
    chapeau = us ? 'Rien à signaler, sinon des milkshakes, du soleil et des voitures qui brillent.' : 'Les usines tournent, les kolkhozes récoltent, les statistiques sont excellentes.';
  } else switch (e.kind){
    case 'space': titre = (us ? 'Historique : le Rêve envoie ' : 'Victoire de la science du peuple : ') + e.txt;
      chapeau = e.data.first ? (us ? 'L’Ouest devance l’Est, et les caméras étaient là.' : 'Le peuple arrive le premier, comme le Plan l’avait annoncé.') : (us ? 'L’Est serait passé avant ? Détail. Le nôtre brille davantage.' : 'L’Ouest prétend être passé avant. La Pravdachat vérifie encore.'); break;
    case 'wall': titre = us ? 'Le Rideau de Laine tricoté en une nuit' : 'Le Rempart de Laine protège le peuple';
      chapeau = us ? 'Au réveil, un mur coupe la frontière. Nos jumelles restent braquées sur l’autre camp.' : 'Grâce au rempart, les travailleurs dorment tranquilles, loin des juke-box.'; break;
    case 'barge': titre = us ? 'Nos barges accostent sur une nouvelle côte' : 'Une brigade du peuple débarque sur une nouvelle côte';
      chapeau = us ? 'Un drapeau de plus sur la carte, et des milkshakes pour l’équipage.' : 'L’avant-poste a été planté avec 200 % d’avance sur le Plan.'; break;
    case 'fete': titre = us ? 'C’est ' + e.txt + ' !' : 'Le peuple célèbre ' + e.txt; chapeau = us ? 'Feu d’artifice ce soir, venez tôt pour les bonnes places.' : 'Feu d’artifice réglementaire chaque nuit, présence recommandée.'; break;
    case 'event': titre = e.txt; chapeau = 'Décision prise : ' + String(e.data.choice || '').toLowerCase() + '. ' + (us ? 'Nos lecteurs approuvent massivement.' : 'Le Parti approuve à l’unanimité.'); break;
    case 'upgrade': titre = us ? 'Le quartier monte en gamme : ' + e.txt.toLowerCase() : 'Promotion du peuple : ' + e.txt.toLowerCase() + ' pour les méritants';
      chapeau = us ? 'On agrandit, on repeint, on inaugure. C’est ça, l’USC.' : 'Le Plan s’élève, comme le moral des travailleurs.'; break;
    case 'build': titre = us ? (fem ? 'Nouvelle ' : 'Nouveau ') + e.txt.toLowerCase() + ' : le quartier fait la fête' : (fem ? 'Une nouvelle ' : 'Un nouveau ') + e.txt.toLowerCase() + ' pour le peuple';
      chapeau = us ? 'Inauguration en grande pompe, cocktail à la sardine offert.' : 'Construit en avance sur le Plan, par des travailleurs médaillés.'; break;
    case 'short': titre = us ? 'Pénurie de croquettes : les épiciers sur le pont' : 'Pause technique dans la distribution de croquettes';
      chapeau = us ? 'Rayons vides ce matin. Les supermarchés promettent un arrivage demain.' : 'La file du Gastronom s’allonge, par pure discipline.'; break;
    default: titre = us ? 'Météo : ' + WX_WORD[S.weather] + ' sur l’USC' : 'Météo : ' + WX_WORD[S.weather] + ', comme prévu par le Plan'; chapeau = us ? 'Sortez les lunettes ou le parapluie, selon votre humeur.' : 'Le temps obéit aux prévisions du Comité.';
  }
  const a1 = us
    ? { titre: 'L’USC tient ' + me.pct + ' % de l’île', texte: (me.pct >= ot.pct ? 'Selon nos géomètres, nous devançons la CCR (' + ot.pct + ' %). Leurs cartes sont coloriées au crayon rouge, les nôtres au stylo plume.' : 'La CCR annonce ' + ot.pct + ' %. Nos experts rappellent que leurs cartes sont tricotées main.') + ' ' + me.pop + ' habitants ronronnent sous notre drapeau.' }
    : { titre: 'La CCR étend ' + me.pct + ' % de l’île', texte: (me.pct >= ot.pct ? 'Le territoire du peuple dépasse celui de l’USC (' + ot.pct + ' %). Gloire aux géomètres !' : 'L’USC revendique ' + ot.pct + ' %, chiffre obtenu en comptant deux fois chaque plage.') + ' ' + me.pop + ' travailleurs au service du Plan.' };
  const a2 = us
    ? { titre: 'Le panier de la ménagère', texte: me.croq + ' croquettes en rayon, ' + me.laine + ' pelotes de laine en stock et ' + me.ron + ' ronrons comptés par nos sondeurs' + (me.short ? ', malgré les rayons vides.' : '. Le frigo est plein.') }
    : { titre: 'Bilan des brigades', texte: 'Le Plan annonce ' + me.laine + ' pelotes, ' + me.croq + ' rations de croquettes et ' + me.ron + ' ronrons réglementaires' + (me.short ? '. La file du Gastronom est un honneur.' : '. Tout est officiellement excellent.') };
  legende = us ? 'Notre photographe sur place, ce matin.' : 'Photo officielle, retouchée pour plus d’exactitude.';
  const breve = (us ? 'L’île est à ' : 'Le territoire est à ') + (me.pct + ot.pct) + ' % occupé. Météo : ' + WX_WORD[S.weather] + '.';
  return { titre, chapeau, articles: [a1, a2], legende, breve };
}
// textes tout faits, tires des evenements de la veille
export function generatePaper(iss){
  if (!iss || iss.ed) return;
  iss.ed = { usc: paperTemplate(iss, 'usc'), ccp: paperTemplate(iss, 'ccp') };
  renderPaper();
}
// la photo de une : on photographie l'endroit de l'evenement, puis on la tramee comme un vieux journal
export function snapScene(a, b){
  const out = document.createElement('canvas');
  if (OV_ON){ out.width = scene.width; out.height = scene.height; out.getContext('2d').drawImage(scene, 0, 0); return out; }
  const sa = cam.a, sb = cam.b; cam.a = a; cam.b = b;
  try { render(SH.NOW_T); out.width = W; out.height = H; out.getContext('2d').drawImage(scene, 0, 0); }
  finally { cam.a = sa; cam.b = sb; render(SH.NOW_T); }
  return out;
}
export function photoSpot(iss, side){
  const e = topOf(iss.log, side), l = e && e.data.id ? SH.BLD.find(o => o.id === e.data.id && o.done) : null;
  if (l) return [l.ca, l.cb];
  const o = SH.BLD.find(x => x.side === side && x.type === 'qg') || SH.BLD.find(x => x.side === side);
  return o ? [o.ca, o.cb] : [cam.a, cam.b];
}
export function halftone(src, dst, ink){
  const g = dst.getContext('2d'), w = dst.width, h = dst.height, cell = 5;
  g.fillStyle = '#efe5cc'; g.fillRect(0, 0, w, h);
  const cw = Math.ceil(w / cell), ch = Math.ceil(h / cell);
  const tmp = document.createElement('canvas'); tmp.width = cw; tmp.height = ch;
  const tg = tmp.getContext('2d');
  const sw = src.width, sh = src.height, ar = w / h;
  let cw2 = sw, ch2 = sw / ar; if (ch2 > sh){ ch2 = sh; cw2 = sh * ar; }
  const zm = OV_ON ? .5 : .78; cw2 *= zm; ch2 *= zm;
  tg.drawImage(src, (sw - cw2) / 2, (sh - ch2) / 2, cw2, ch2, 0, 0, cw, ch);
  const d = tg.getImageData(0, 0, cw, ch).data;
  g.fillStyle = ink;
  for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++){
    const i = (y * cw + x) * 4, l = (d[i] * .3 + d[i + 1] * .59 + d[i + 2] * .11) / 255;
    const r = Math.sqrt(1 - Math.min(1, l * 1.08)) * cell * .62; if (r < .35) continue;
    g.beginPath(); g.arc(x * cell + cell / 2, y * cell + cell / 2, r, 0, TAU); g.fill();
  }
}
export function renderPaper(){
  const iss = PAPER.issue, side = PAPER.side, np = $('np'); if (!iss || !np) return;
  np.dataset.side = side;
  for (const b of document.querySelectorAll('[data-np]')) b.setAttribute('aria-pressed', b.dataset.np === side ? 'true' : 'false');
  $('npName').textContent = PAPER_NAME[side];
  $('npLine').textContent = 'N° ' + iss.n + ' · ' + MONTHS[iss.m] + ' · ' + (side === 'usc' ? 'Édition du matin · 5 cents' : 'Organe officiel de la CCR · 3 kopecks');
  const ed = iss.ed && iss.ed[side];
  np.classList.toggle('loading', !ed);
  $('npHead').textContent = ed ? ed.titre : 'Les rotatives tournent…';
  $('npLede').textContent = ed ? ed.chapeau : '';
  const cols = $('npCols'); cols.textContent = '';
  const arts = ed ? ed.articles : [{ titre: '', texte: '' }, { titre: '', texte: '' }];
  for (const a of arts){ const s = document.createElement('section'), h3 = document.createElement('h3'), p = document.createElement('p'); h3.textContent = a.titre; p.textContent = a.texte; s.append(h3, p); cols.append(s); }
  $('npCap').textContent = ed ? ed.legende : '';
  $('npBreve').textContent = ed ? ed.breve : '';
  const rep = reporter(side, iss.n);
  $('npBy').textContent = side === 'usc' ? 'Reportage : ' + rep.name : 'Correspondant du peuple : ' + rep.name;
  if (!iss.photo[side]){ const [a, b] = photoSpot(iss, side); iss.photo[side] = snapScene(a, b); }
  halftone(iss.photo[side], $('npPhoto'), side === 'usc' ? '#241c14' : '#4a1712');
}
export function openPaper(){
  if (!PAPER.issue) deliverPaper(true);
  $('paper').hidden = false; $('btnPaper').classList.remove('fresh'); SH.sfx('paper');
  renderPaper(); generatePaper(PAPER.issue);
  setTimeout(() => $('paperClose').focus({ preventScroll: true }), 30);
}
export function closePaper(){ $('paper').hidden = true; scene.focus({ preventScroll: true }); }
$('btnPaper').addEventListener('click', openPaper);
$('paperClose').addEventListener('click', closePaper);
$('paper').addEventListener('click', (e) => { if (e.target === $('paper')) closePaper(); });
for (const b of document.querySelectorAll('[data-np]')) b.addEventListener('click', () => { PAPER.side = b.dataset.np; renderPaper(); });

/* ================= les chats se souviennent de toi ================= */
export const MEM = {}, MEM_LS = 'cold-kutty-memoire-1';
export let memTimer = 0;
export function memMerge(list){
  if (!Array.isArray(list)) return;
  for (const v of list){
    if (!v || typeof v.name !== 'string' || !Array.isArray(v.last)) continue;
    if (MEM[v.name] && (MEM[v.name].t || 0) >= (+v.t || 0)) continue;
    MEM[v.name] = { n: clamp(+v.n || 0, 0, 9999), t: +v.t || 0, last: v.last.slice(-10).filter(x => x && (x.r === 'u' || x.r === 'c')).map(x => ({ r: x.r, s: String(x.s || '').slice(0, 220) })) };
  }
}
export const memList = () => Object.keys(MEM).map(name => Object.assign({ name }, MEM[name]));
try { const s = localStorage.getItem(MEM_LS); if (s) memMerge(JSON.parse(s)); } catch (_) {}
export function memSave(){
  clearTimeout(memTimer);
  memTimer = setTimeout(async () => {
    const list = memList();
    try { localStorage.setItem(MEM_LS, JSON.stringify(list)); } catch (_) {}
  }, 1500);
}
export function memRemember(c, turns){
  const m = MEM[c.name] || (MEM[c.name] = { n: 0, t: 0, last: [] });
  if (!c.memCounted){ m.n++; c.memCounted = true; }
  m.t = Date.now();
  m.last = turns.slice(1).slice(-10).map(x => ({ r: x.role === 'user' ? 'u' : 'c', s: String(x.content).slice(0, 220) }));
  memSave();
}
export function memGreeting(c){
  const m = MEM[c.name]; if (!m || !m.n) return null;
  const hi = c.side === 'ccp' ? 'Camarade ! Te revoilà.' : c.side === 'usc' ? 'Hé, te revoilà !' : 'Tiens, un revenant !';
  let lastU = null; for (let i = m.last.length - 1; i >= 0; i--) if (m.last[i].r === 'u'){ lastU = m.last[i]; break; }
  if (!lastU) return hi + ' Ça me fait plaisir de te revoir.';
  let s = lastU.s.replace(/\s+/g, ' ').trim(); if (s.length > 42) s = s.slice(0, 40).replace(/\s+\S*$/, '') + '…';
  return hi + ' La dernière fois, tu m’as dit « ' + s + ' ». Je m’en souviens très bien.';
}
/* ================= les chats se parlent entre eux ================= */
export const CHATTER = {
  usc: [
    ['Tu as vu la nouvelle Cadillatte ?', 'Les ailerons dépassent du garage !'],
    ['On se fait un drive-in samedi ?', 'Seulement si c’est un film de souris martiennes.'],
    ['Le juke-box du diner est cassé.', 'Tant mieux, j’avais la chanson dans la tête depuis mardi.'],
    ['Mon frigo fait de la glace tout seul.', 'Le progrès, mon vieux, le progrès.'],
    ['Tu crois qu’ils nous regardent, de l’autre côté ?', 'Avec des jumelles grandes comme des bouteilles de lait.'],
    ['Il paraît qu’on a débarqué sur une nouvelle plage.', 'Encore ? Je commence à avoir le mal de mer.'],
    ['J’ai gagné au bowling !', 'Tu as fait tomber des quilles ou le voisin ?'],
    ['Encore une pub pour le Kutty Cola.', 'On ronronne rien qu’à la voir.'],
    ['La route du port est enfin goudronnée.', 'Et en courbe, s’il vous plaît. Le progrès.']
  ],
  ccp: [
    ['Camarade, tu as rempli ton quota ?', 'Trois cents pour cent, avant le petit déjeuner.'],
    ['Il paraît qu’il y a des sardines au Gastronom.', 'Vite, je prends la file pour le prochain plan quinquennal.'],
    ['Le défilé était magnifique.', 'Le même que la semaine dernière. Donc parfait.'],
    ['Mon immeuble ressemble au tien.', 'C’est normal, c’est le tien.'],
    ['Le kolkhoze a battu son record.', 'Il le bat tous les lundis.'],
    ['Tu as lu la Pravdachat ?', 'Oui. Tout va très bien, c’est écrit.'],
    ['Natacha s’entraîne encore pour l’espace.', 'Elle tourne sur elle-même depuis ce matin.'],
    ['Le tracteur est reparti !', 'Gloire au tracteur !']
  ],
  cross: [
    ['Psst, du chewing-gum contre du caviar de sardine ?', 'Parle moins fort, le Sergent écoute.'],
    ['Votre frontière avance, dis donc.', 'C’est la vôtre qui recule. Question de point de vue.'],
    ['Chez nous, les voitures ont des ailerons.', 'Chez nous, les tracteurs ont des médailles.'],
    ['Vous avez de la musique, là-bas ?', 'Une fanfare. Très disciplinée.']
  ],
  neutre: [
    ['Belle soirée pour pêcher.', 'Les sardines, elles, ne connaissent pas de mur.'],
    ['Tu as vu le phare cette nuit ?', 'Deux éclats toutes les seize secondes. Je les compte pour dormir.']
  ]
};
export function dynChatter(side){
  const out = [];
  if (side === 'usc' || side === 'ccp'){
    const R = SH.RES[side];
    if (R.short) out.push(['Plus une croquette à la maison…', side === 'ccp' ? 'La file du Gastronom avance. Un peu.' : 'Il nous faudrait une pêcherie, vite.']);
    if (R.funRatio > .9) out.push(['Qu’est-ce qu’on est bien, ici.', 'On ronronne du matin au soir.']);
    if (R.pop > 8 && R.funRatio < .3) out.push(['On s’ennuie un peu, non ?', side === 'ccp' ? 'Un cirque du peuple, voilà ce qu’il faut.' : 'Il faudrait un cinéma, ou un parc.']);
    if (terPct(side) > terPct(other(side)) + .05) out.push(['Notre drapeau flotte loin, maintenant.', 'Jusqu’aux forêts de l’autre versant.']);
    if (feteSide(side)) out.push(side === 'ccp' ? ['Tu viens au feu d’artifice du peuple ?', 'Présence obligatoire, et joyeuse.'] : ['Tu viens voir le feu d’artifice ?', 'J’apporte le pop-corn au thon.']);
  }
  if (WEATHER.shown === 'neige' && WEATHER.k > .5) out.push(['Il neige !', 'Parfait pour une bataille de boules de neige.']);
  if (WEATHER.shown === 'pluie' && WEATHER.k > .5) out.push(['Encore de la pluie.', 'Les chats détestent l’eau, c’est connu.']);
  if (SH.WALLS.length) out.push(['Tu as vu le Rideau de Laine ?', 'Il gratte, mais il tient chaud.']);
  return out;
}
export const BUB = { els: [], next: 5, cur: [] };
export function bubbleEl(k){
  let el = BUB.els[k];
  if (!el){ el = document.createElement('div'); el.className = 'bubble'; el.hidden = true; $('bubbles').appendChild(el); BUB.els[k] = el; }
  return el;
}
export const bubblesOn = () => !OV_ON && !state.uiHidden && SH.Z >= SH.KDEF * .75 && !document.body.classList.contains('photo');
export function stepBubbles(dt, t){
  if (!bubblesOn()){ BUB.cur = []; return; }
  BUB.cur = BUB.cur.filter(b => t < b.t1);
  if (BUB.cur.length || t < BUB.next) return;
  BUB.next = t + 6 + Math.random() * 7;
  const vis = SH.CATS.filter(c => c.screen && c !== state.chatCat && c.screen[0] > 12 && c.screen[0] < W - 12 && c.screen[1] > 40 && c.screen[1] < H - 8);
  if (!vis.length) return;
  let best = null, bd = 1e9;
  for (let i = 0; i < vis.length; i++){ const p = catPos(vis[i], t); for (let j = i + 1; j < vis.length; j++){ const q = catPos(vis[j], t), d = Math.hypot(p.a - q.a, p.b - q.b); if (d < bd){ bd = d; best = [vis[i], vis[j]]; } } }
  let A, B = null, pool;
  if (best && bd < 80){
    [A, B] = best;
    const sa = A.side, sb = B.side;
    if (sa === 'neutre' || sb === 'neutre') pool = CHATTER.neutre.concat(dynChatter(sa === 'neutre' ? sb : sa));
    else if (sa !== sb) pool = CHATTER.cross;
    else pool = CHATTER[sa].concat(dynChatter(sa), dynChatter(sa));
  } else {
    A = vis[Math.floor(Math.random() * vis.length)];
    pool = dynChatter(A.side); if (!pool.length) pool = CHATTER[A.side] || CHATTER.neutre;
  }
  const pair = pool[Math.floor(Math.random() * pool.length)];
  BUB.cur = [{ c: A, s: pair[0], t0: t, t1: t + 3.4, k: 0 }];
  if (B) BUB.cur.push({ c: B, s: pair[1], t0: t + 2.6, t1: t + 6.2, k: 1 });
}
export function placeBubbles(t){
  const on = bubblesOn(), r = on ? scene.getBoundingClientRect() : null;
  for (let k = 0; k < 2; k++){
    const el = bubbleEl(k), b = on ? BUB.cur.find(x => x.k === k) : null;
    if (!b || t < b.t0 || t > b.t1 || !b.c.screen){ el.hidden = true; continue; }
    if (el.textContent !== b.s) el.textContent = b.s;
    el.hidden = false; el.dataset.side = b.c.side;
    const x = r.left + (b.c.screen[0] + .5) * r.width / W, y = r.top + (b.c.screen[1] - 10) * r.height / H;
    el.style.transform = 'translate(' + Math.round(x) + 'px,' + Math.round(y) + 'px) translate(-50%,-100%)';
  }
}
HOOKS.step.push(stepBubbles);
HOOKS.after.push(placeBubbles);

/* ================= ce a quoi pensent les chats : petites icones au-dessus des tetes ================= */
export const THINK_ICON = {
  coeur: ['.r.r.', 'rrrrr', 'rrrrr', '.rrr.', '..r..'],
  faim: ['k.k.k.k', 'kkkkkkk', 'k.k.k.k'],
  zzz: ['kkk....', '..k.kkk', '.k....k', 'kkk..k.', '....kkk'],
  alerte: ['r', 'r', 'r', '.', 'r'],
  envie: ['...k...', '..kkk..', '.kkkkk.', '.k.k.k.', '.kkkkk.'],
  pluie: ['.bbbbb.', 'bbbbbbb', '...k...', '...k...', '..kk...'],
  fete: ['...y...', '..yyy..', 'yyyyyyy', '..yyy..', '.y...y.'],
  grogne: ['k.....k', '.k...k.', '.......', '..kkk..', '.k...k.']
};
export function thoughtOf(c, seed){
  const s = c.side, opts = [];
  if (SH.NIGHT > .75) opts.push('zzz');
  if (s === 'usc' || s === 'ccp'){
    const R = SH.RES[s];
    if (R.short) opts.push('faim', 'faim');
    if (feteSide(s)) opts.push('fete', 'fete');
    if (R.pop > 8 && R.funRatio < .35) opts.push('envie', 'grogne');
    if (R.funRatio >= .7) opts.push('coeur');
    if (terPct(other(s)) > terPct(s) + .08) opts.push('alerte');
  }
  if (WEATHER.shown === 'pluie' && WEATHER.k > .5) opts.push('pluie');
  return opts.length ? opts[Math.floor(seed * opts.length)] : null;
}
export function drawThoughts(t){
  if (SH.Z < SH.KDEF * .9 || document.body.classList.contains('photo')) return;
  SH.LV = 0;
  for (const c of SH.CATS){
    if (!c.screen || c === state.chatCat || BUB.cur.some(b => b.c === c && t >= b.t0 && t <= b.t1)) continue;
    const per = 19, ph = t + c.id * 7.3, win = Math.floor(ph / per), local = ph - win * per;
    if (local > 5 || hash2(c.id, win) > .42) continue;
    const kind = thoughtOf(c, hash2(c.id + 11, win)); if (!kind) continue;
    const ic = THINK_ICON[kind], iw = Math.max(...ic.map(r => r.length)), ih = ic.length;
    const bx = c.screen[0], by = c.screen[1], bob = Math.round(Math.sin(t * 2.4 + c.id) * .8);
    const w = iw + 4, h = ih + 4, x0 = bx - 1, y0 = by - 12 - h + bob;
    if (x0 < -w || y0 < -h || x0 > W || y0 > H) continue;
    SH.CUR = M.BUBBLE;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++){
      if ((x === 0 || x === w - 1) && (y === 0 || y === h - 1)) continue;
      fput(x0 + x, y0 + y, (x === 0 || y === 0 || x === w - 1 || y === h - 1) ? 0 : 1);
    }
    fput(x0 + 2, y0 + h + 1, 0); fput(x0 + 3, y0 + h + 1, 0); fput(x0 + 2, y0 + h + 2, 0); fput(x0 + 3, y0 + h + 2, 0); fput(x0 + 1, y0 + h + 4, 0);
    for (let y = 0; y < ih; y++) for (let x = 0; x < ic[y].length; x++){
      const ch = ic[y][x]; if (ch === '.') continue;
      SH.CUR = ch === 'r' ? M.ICON_R : ch === 'y' ? M.ICON_Y : ch === 'b' ? M.FW_BLUE : M.BUBBLE;
      fput(x0 + 2 + Math.floor((w - 4 - iw) / 2) + x, y0 + 2 + y, ch === 'k' ? 0 : 1);
    }
  }
}
HOOKS.top.push(drawThoughts);

// appeles depuis des modules plus petits en numero
Object.assign(SH, { CAL, seasonOf, logDay });
