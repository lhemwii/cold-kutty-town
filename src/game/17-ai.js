/* ================= calendrier : un jour de jeu = un mois ================= */
const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const CAL = { m: 9, y: 1961 };
function seasonOf(m){ return m === 11 || m <= 1 ? 'hiver' : m <= 4 ? 'printemps' : m <= 7 ? 'été' : 'automne'; }
function feteOf(m){
  if (m === 11) return { id: 'nouvel', name: 'les fêtes de fin d’année', side: 'both' };
  if (m === 6) return { id: 'reve', name: 'le Jour du Rêve', side: 'usc' };
  if (m === 4) return { id: 'plan', name: 'la Fête du Grand Plan', side: 'ccp' };
  return null;
}
const feteSide = (side) => { const f = feteOf(CAL.m); return !!f && (f.side === 'both' || f.side === side); };
const hexRGB = (h) => { const v = parseInt(h.slice(1), 16); return [v >> 16, (v >> 8) & 255, v & 255]; };
const SEASON_PAL = {
  automne: [[M.TREE, '#a8612c', '#dd9b40'], [M.GRASS, '#7c9a40', '#a4bd62'], [M.FIELD, '#b08a3a', '#d8b35c']],
  hiver: [[M.TREE, '#4d6150', '#7d8e7b'], [M.GRASS, '#7a8d66', '#a0ae8a'], [M.FIELD, '#8c8a6a', '#b0ad8c']],
  printemps: [[M.TREE, '#5aa645', '#f3b4c6'], [M.GRASS, '#60a944', '#8ed06a']],
  'été': []
};
function applySeason(){
  const se = seasonOf(CAL.m); SEAS = {};
  if (COLOR) for (const [m, c0, c1] of SEASON_PAL[se]) SEAS[m] = [hexRGB(c0), hexRGB(c1)];
  SEAS_KEY = ':' + se; palKey = '';
}
function updateCalUI(){
  const el = document.querySelector('.brand-sub');
  if (el) el.textContent = 'ÎLE DE KUTTY · ' + MONTHS[CAL.m].toUpperCase() + ' ' + CAL.y + ' · ' + seasonOf(CAL.m).toUpperCase();
}
function newMonth(){
  CAL.m++; if (CAL.m > 11){ CAL.m = 0; CAL.y++; fwSalvo('both', 16); radioQueue.unshift(['neutre', 'Radio du port', 'Bonne année ' + CAL.y + ' ! Les deux camps tirent leur feu d’artifice en même temps. Pour une fois.']); }
  applySeason(); updateCalUI();
  const se = seasonOf(CAL.m), f = feteOf(CAL.m);
  const SE_MSG = { printemps: 'Le printemps arrive sur Kutty : les arbres fleurissent des deux côtés du mur.', 'été': 'L’été est là : plage, glaces à la sardine et orages le soir.', automne: 'L’automne roussit les arbres de l’île. Les kolkhozes rentrent la récolte.', hiver: 'L’hiver tombe sur l’île. Sortez les écharpes, la neige n’est pas loin.' };
  if ([2, 5, 8, 11].includes(CAL.m)) radioQueue.unshift(['neutre', 'Météo marine', SE_MSG[se]]);
  if (f){
    const msg = f.id === 'nouvel' ? ['neutre', 'Radio du port', 'Décembre sur Kutty : sapins illuminés des deux côtés du mur et feu d’artifice chaque nuit jusqu’au Nouvel An.']
      : f.id === 'reve' ? ['usc', 'Radio Kutty Libre', 'Juillet, c’est le Jour du Rêve ! Voitures chromées, barbecue au thon et feu d’artifice tous les soirs.']
      : ['ccp', 'Radio Miaou-Scou', 'Mai, Fête du Grand Plan ! Drapeaux rouges, fanfare et feu d’artifice du peuple chaque nuit.'];
    radioQueue.unshift(msg);
    logDay(f.side, 'fete', f.name);
  }
  logDay('both', 'month', MONTHS[CAL.m] + ' ' + CAL.y);
  saveSoon();
}
let calH = null;
function stepCal(dt, t){
  const h = CLOCK.h;
  if (calH != null){
    if (calH > 20 && h < 4) newMonth();
    if (calH < 7 && h >= 7 && h - calH < 3) deliverPaper(false);
  }
  calH = h;
}
HOOKS.step.push(stepCal);

/* ================= carnet du jour : ce qui s'est passe, pour le journal ================= */
const DAYLOG = [];
function logDay(side, kind, txt, data){ DAYLOG.push({ side, kind, txt: String(txt || ''), data: data || {} }); if (DAYLOG.length > 40) DAYLOG.shift(); }

/* ================= journal du matin : Gazette de Kutty et Pravdachat ================= */
const PAPER = { n: 1, issue: null, side: 'usc' };
const PAPER_NAME = { usc: 'Gazette de Kutty', ccp: 'Pravdachat' };
function campStats(){
  const o = {};
  for (const s of ['usc', 'ccp']){ const R = RES[s], C = CAMPS[s]; o[s] = { pct: C.pct, want: C.want ? wantLabel(s) : '', done: C.done, croq: Math.floor(R.croq), laine: Math.floor(R.laine), moral: R.moral, short: !!R.short, space: SPACE[s].stage }; }
  o.tension = CAMPS.level; o.weather = WEATHER.shown === 'clair' || WEATHER.k < .4 ? 'clair' : WEATHER.shown; o.season = seasonOf(CAL.m); o.fete = feteOf(CAL.m); o.wall = wallUp();
  return o;
}
function deliverPaper(first){
  PAPER.issue = { n: PAPER.n++, m: CAL.m, y: CAL.y, log: DAYLOG.splice(0), stats: campStats(), ed: null, busy: false, note: '', photo: {} };
  const b = $('btnPaper'); if (b){ b.hidden = false; b.classList.toggle('fresh', !first); }
  if (!first){
    toast('Le journal du matin est arrivé : clique sur Journal pour le lire.');
    radioQueue.push(['neutre', 'Radio du port', 'Les crieurs de journaux sont dans les rues : la Gazette de Kutty à l’ouest, la Pravdachat à l’est.']);
  }
  if (!$('paper').hidden){ renderPaper(); generatePaper(PAPER.issue); }
}
function reporter(side, n){ const L = CATS.filter(c => c.side === side); return L.length ? L[n % L.length] : { name: 'la rédaction', job: '' }; }
function topOf(log, side){
  const mine = log.filter(e => e.side === side || e.side === 'both');
  for (const k of ['space', 'wall', 'want', 'unlock', 'fete', 'event', 'upgrade', 'build', 'short', 'weather']){ for (let i = mine.length - 1; i >= 0; i--) if (mine[i].kind === k) return mine[i]; }
  return null;
}
const WX_WORD = { clair: 'grand soleil', pluie: 'averses', neige: 'neige', brouillard: 'brouillard' };
function paperTemplate(iss, side){
  const S = iss.stats, me = S[side], ot = S[side === 'usc' ? 'ccp' : 'usc'], us = side === 'usc';
  const e = topOf(iss.log, side), fem = e && e.data.type && TYPES[e.data.type] && TYPES[e.data.type].fem;
  let titre, chapeau, legende;
  if (!e){
    titre = us ? 'Une journée tranquille au pays du Rêve' : 'Le Plan avance exactement comme prévu';
    chapeau = us ? 'Rien à signaler, sinon des milkshakes, du soleil et des voitures qui brillent.' : 'Les usines tournent, les kolkhozes récoltent, les statistiques sont excellentes.';
  } else switch (e.kind){
    case 'space': titre = (us ? 'Historique : le Rêve envoie ' : 'Victoire de la science du peuple : ') + e.txt;
      chapeau = e.data.first ? (us ? 'L’Ouest devance l’Est, et les caméras étaient là.' : 'Le peuple arrive le premier, comme le Plan l’avait annoncé.') : (us ? 'L’Est serait passé avant ? Détail. Le nôtre brille davantage.' : 'L’Ouest prétend être passé avant. La Pravdachat vérifie encore.'); break;
    case 'wall': titre = us ? 'Le Rideau de Laine tricoté en une nuit' : 'Le Rempart de Laine protège le peuple';
      chapeau = us ? 'Au réveil, un mur coupe l’île en deux. Nos jumelles restent braquées sur l’Est.' : 'Grâce au rempart, les travailleurs dorment tranquilles, loin des juke-box.'; break;
    case 'want': titre = us ? 'Rêve exaucé : ' + (fem ? 'une ' : 'un ') + e.txt.toLowerCase() + ' pour le quartier' : 'Le peuple a obtenu ' + (fem ? 'sa ' : 'son ') + e.txt.toLowerCase();
      chapeau = us ? 'Les habitants le réclamaient, le voilà. Ruban coupé, fanfare et photos.' : 'La demande des travailleurs est satisfaite avec 300 % d’avance sur le Plan.'; break;
    case 'unlock': titre = e.txt; chapeau = us ? 'Le progrès arrive dans notre camp, et vite.' : 'Une nouvelle étape du Grand Plan est franchie.'; break;
    case 'fete': titre = us ? 'C’est ' + e.txt + ' !' : 'Le peuple célèbre ' + e.txt; chapeau = us ? 'Feu d’artifice ce soir, venez tôt pour les bonnes places.' : 'Feu d’artifice réglementaire chaque nuit, présence recommandée.'; break;
    case 'event': titre = e.txt; chapeau = 'Décision prise : ' + String(e.data.choice || '').toLowerCase() + '. ' + (us ? 'Nos lecteurs approuvent massivement.' : 'Le Parti approuve à l’unanimité.'); break;
    case 'upgrade': titre = us ? 'Le quartier monte en gamme : place à la ' + e.txt.toLowerCase() : 'Promotion du logement : ' + e.txt.toLowerCase() + ' pour les méritants';
      chapeau = us ? 'Un bon voisinage, et la maison s’agrandit. C’est ça, le Rêve.' : 'Le logement du peuple s’élève, comme le moral des travailleurs.'; break;
    case 'build': titre = us ? (fem ? 'Nouvelle ' : 'Nouveau ') + e.txt.toLowerCase() + ' : le quartier fait la fête' : (fem ? 'Une nouvelle ' : 'Un nouveau ') + e.txt.toLowerCase() + ' pour le peuple';
      chapeau = us ? 'Inauguration en grande pompe, cocktail à la sardine offert.' : 'Construit en avance sur le Plan, par des travailleurs médaillés.'; break;
    case 'short': titre = us ? 'Pénurie de croquettes : les épiciers sur le pont' : 'Pause technique dans la distribution de croquettes';
      chapeau = us ? 'Rayons vides ce matin. Les supermarchés promettent un arrivage demain.' : 'La file du Gastronom s’allonge, par pure discipline.'; break;
    default: titre = us ? 'Météo : ' + WX_WORD[S.weather] + ' sur le Rêve' : 'Météo : ' + WX_WORD[S.weather] + ', comme prévu par le Plan'; chapeau = us ? 'Sortez les lunettes ou le parapluie, selon votre humeur.' : 'Le temps obéit aux prévisions du Comité.';
  }
  const a1 = us
    ? { titre: 'Le Rêve à ' + me.pct + ' %', texte: (me.pct >= ot.pct ? 'Selon nos sondages, le Rêve des Nations Libres devance l’Est (' + ot.pct + ' %). Les voisins d’en face regardent nos néons avec envie.' : 'L’Est annonce ' + ot.pct + ' %. Nos experts rappellent que leurs chiffres sont tricotés main.') + (me.want ? ' Prochaine envie du quartier : ' + me.want + '.' : '') }
    : { titre: 'Le Grand Plan à ' + me.pct + ' %', texte: (me.pct >= ot.pct ? 'Le Grand Plan du Peuple dépasse l’Ouest (' + ot.pct + ' %). Gloire aux travailleurs !' : 'L’Ouest revendique ' + ot.pct + ' %, chiffre obtenu en comptant deux fois chaque voiture.') + (me.want ? ' Le peuple réclame désormais ' + me.want + '.' : '') };
  const a2 = us
    ? { titre: 'Le panier de la ménagère', texte: me.croq + ' croquettes en rayon et ' + me.laine + ' pelotes de laine en stock. Moral des habitants : ' + me.moral + ' %' + (me.short ? ', malgré les rayons vides.' : ', le frigo est plein.') }
    : { titre: 'Bilan des brigades', texte: 'Le Plan annonce ' + me.laine + ' pelotes et ' + me.croq + ' rations de croquettes. Moral des travailleurs : ' + me.moral + ' %' + (me.short ? ', la file du Gastronom est un honneur.' : ', officiellement excellent.') };
  legende = us ? 'Notre photographe sur place, ce matin.' : 'Photo officielle, retouchée pour plus d’exactitude.';
  const breve = (us ? 'Tension avec l’Est : ' : 'Relations avec l’Ouest : ') + String(S.tension).toLowerCase() + '. Météo : ' + WX_WORD[S.weather] + '.';
  return { titre, chapeau, articles: [a1, a2], legende, breve };
}
const LOG_KIND = { build: 'construction', want: 'demande exaucée', space: 'course à l’espace', wall: 'mur', unlock: 'nouveau service', event: 'événement', upgrade: 'logement agrandi', short: 'pénurie', weather: 'météo', fete: 'fête', month: 'nouveau mois' };
function paperPrompt(iss){
  const S = iss.stats;
  const lines = iss.log.filter(e => e.kind !== 'month').slice(-24).map(e => '- [' + (e.side === 'usc' ? 'USC' : e.side === 'ccp' ? 'CCR' : 'les deux camps') + '] ' + (LOG_KIND[e.kind] || e.kind) + ' : ' + e.txt + (e.data.choice ? ' (décision : ' + e.data.choice + ')' : '') + (e.data.first ? ' (avant l’autre camp)' : '')).join('\n') || '- Journée calme, rien de notable.';
  const camp = (s) => { const c = S[s]; return 'jauge ' + c.pct + ' %, moral ' + c.moral + ' %, croquettes ' + c.croq + (c.short ? ' (pénurie !)' : '') + ', laine ' + c.laine + ', les habitants réclament ' + (c.want || 'rien de spécial'); };
  const ru = reporter('usc', iss.n), rc = reporter('ccp', iss.n);
  return 'Tu écris les deux journaux du matin de Cold Kutty Town, un jeu vidéo tout public : une île peuplée de chats, en ' + MONTHS[iss.m] + ' ' + iss.y + ', pendant une guerre froide comique. ' +
    (S.wall ? 'L’île est coupée en deux par un mur appelé le Rideau de Laine. ' : 'Les deux camps ont débarqué chacun à un bout de l’île et avancent l’un vers l’autre ; il n’y a pas encore de mur. ') +
    'À l’ouest, les United Sands of Cats (USC), leur idéal : le Rêve des Nations Libres (diners, voitures à ailerons, publicité, drive-in). Leur journal : la Gazette de Kutty. ' +
    'À l’est, la Cats Communist Republik (CCR), leur idéal : le Grand Plan du Peuple (plans quinquennaux, usines, kolkhozes, défilés). Leur journal : la Pravdachat.\n\n' +
    'Situation ce matin. USC : ' + camp('usc') + '. CCR : ' + camp('ccp') + '. Tension entre les camps : ' + S.tension + '. Météo : ' + WX_WORD[S.weather] + '. Saison : ' + S.season + (S.fete ? ', c’est ' + S.fete.name : '') + '.\n\n' +
    'Événements d’hier :\n' + lines + '\n\n' +
    'Écris la une de chaque journal. Les deux racontent les mêmes faits chacun à sa façon, en propagande gentille et drôle : chacun se vante de son camp, minimise ses problèmes et se moque tendrement de l’autre. La Gazette a le ton d’un quotidien populaire des années 50 ; la Pravdachat celui d’un organe officiel, pompeux et plein de chiffres. ' +
    'Tu peux citer ' + ru.name + ' (' + ru.job + ') dans la Gazette et ' + rc.name + ' (' + rc.job + ') dans la Pravdachat. ' +
    'Ne nomme jamais de pays réel ni de personne réelle. N’utilise jamais de tiret long ni de tiret moyen. Tout en français.\n\n' +
    'Réponds uniquement avec ce JSON : {"usc":{"titre":"...","chapeau":"...","articles":[{"titre":"...","texte":"..."},{"titre":"...","texte":"..."}],"legende":"...","breve":"..."},"ccp":{même forme}}. ' +
    'Longueurs maximales : titre 70 caractères, chapeau 160, titre d’article 50, texte d’article 300, légende 90, brève 120.';
}
const cleanTxt = (v, n) => { let s = String(v == null ? '' : v).replace(DASHES, ',').replace(/\s+/g, ' ').trim(); if (s.length > n) s = s.slice(0, n - 1).replace(/\s+\S*$/, '') + '…'; return s; };
function cleanEd(o, fb){
  if (!o || typeof o !== 'object') return fb;
  const arts = (Array.isArray(o.articles) ? o.articles : []).slice(0, 2).map((a, k) => ({ titre: cleanTxt(a && a.titre, 70) || fb.articles[k].titre, texte: cleanTxt(a && a.texte, 380) || fb.articles[k].texte }));
  while (arts.length < 2) arts.push(fb.articles[arts.length]);
  return { titre: cleanTxt(o.titre, 90) || fb.titre, chapeau: cleanTxt(o.chapeau, 200) || fb.chapeau, articles: arts, legende: cleanTxt(o.legende, 110) || fb.legende, breve: cleanTxt(o.breve, 150) || fb.breve };
}
async function generatePaper(iss){
  if (!iss || iss.ed || iss.busy) return;
  const tpl = { usc: paperTemplate(iss, 'usc'), ccp: paperTemplate(iss, 'ccp') };
  if (sampleOff || !sampleFn || typeof sampleFn.json !== 'function'){ iss.ed = tpl; iss.note = 'Édition de secours : Claude n’est pas disponible ici, les articles sont tout faits.'; renderPaper(); return; }
  iss.busy = true; renderPaper();
  try {
    const r = await sampleFn.json(paperPrompt(iss), { modelTier: 'quick' });
    iss.ed = { usc: cleanEd(r && r.usc, tpl.usc), ccp: cleanEd(r && r.ccp, tpl.ccp) };
    iss.note = 'Édition rédigée par Claude à partir des événements de la veille.';
  } catch (err){
    const code = (err && err.code) || '';
    iss.ed = tpl;
    if (['not_granted', 'sampling_disabled', 'not_declared', 'capability_disabled', 'capability_removed'].includes(code)){ sampleOff = true; if (code === 'not_granted') sampleState = 'denied'; }
    iss.note = code === 'not_granted' ? 'Claude est refusé pour cette page : édition de secours.' : code === 'rate_limited' ? 'Claude est très sollicité : édition de secours.' : 'Claude n’a pas pu écrire le journal : édition de secours.';
  }
  iss.busy = false; if (PAPER.issue === iss) renderPaper();
}
// la photo de une : on photographie l'endroit de l'evenement, puis on la tramee comme un vieux journal
function snapScene(a, b){
  const out = document.createElement('canvas');
  if (OV_ON){ out.width = scene.width; out.height = scene.height; out.getContext('2d').drawImage(scene, 0, 0); return out; }
  const sa = cam.a, sb = cam.b; cam.a = a; cam.b = b;
  try { render(NOW_T); out.width = W; out.height = H; out.getContext('2d').drawImage(scene, 0, 0); }
  finally { cam.a = sa; cam.b = sb; render(NOW_T); }
  return out;
}
function photoSpot(iss, side){
  const e = topOf(iss.log, side), l = e && e.data.id ? LOTS.find(o => o.id === e.data.id && o.type) : null;
  if (l) return [l.ca, l.cb];
  const pref = side === 'usc' ? ['mairie', 'stade', 'artdeco', 'diner'] : ['peuple', 'tribune', 'stalinien', 'usine'];
  for (const t of pref){ const o = LOTS.find(x => x.side === side && x.type === t); if (o) return [o.ca, o.cb]; }
  const o = LOTS.find(x => x.side === side && x.type); return o ? [o.ca, o.cb] : [side === 'usc' ? -300 : 280, 60];
}
function halftone(src, dst, ink){
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
function renderPaper(){
  const iss = PAPER.issue, side = PAPER.side, np = $('np'); if (!iss || !np) return;
  np.dataset.side = side;
  for (const b of document.querySelectorAll('[data-np]')) b.setAttribute('aria-pressed', b.dataset.np === side ? 'true' : 'false');
  $('npName').textContent = PAPER_NAME[side];
  $('npLine').textContent = 'N° ' + iss.n + ' · ' + MONTHS[iss.m] + ' ' + iss.y + ' · ' + (side === 'usc' ? 'Édition du matin · 5 cents' : 'Organe officiel du Grand Plan · 3 kopecks');
  const ed = iss.ed && iss.ed[side];
  np.classList.toggle('loading', !ed);
  $('npHead').textContent = ed ? ed.titre : 'Les rotatives tournent…';
  $('npLede').textContent = ed ? ed.chapeau : 'Claude écrit la une, encore un instant.';
  const cols = $('npCols'); cols.textContent = '';
  const arts = ed ? ed.articles : [{ titre: '', texte: '' }, { titre: '', texte: '' }];
  for (const a of arts){ const s = document.createElement('section'), h3 = document.createElement('h3'), p = document.createElement('p'); h3.textContent = a.titre; p.textContent = a.texte; s.append(h3, p); cols.append(s); }
  $('npCap').textContent = ed ? ed.legende : '';
  $('npBreve').textContent = ed ? ed.breve : '';
  const rep = reporter(side, iss.n);
  $('npBy').textContent = side === 'usc' ? 'Reportage : ' + rep.name : 'Correspondant du peuple : ' + rep.name;
  $('npNote').textContent = iss.note || '';
  if (!iss.photo[side]){ const [a, b] = photoSpot(iss, side); iss.photo[side] = snapScene(a, b); }
  halftone(iss.photo[side], $('npPhoto'), side === 'usc' ? '#241c14' : '#4a1712');
}
function openPaper(){
  if (!PAPER.issue) deliverPaper(true);
  $('paper').hidden = false; $('btnPaper').classList.remove('fresh'); sfx('paper');
  renderPaper(); generatePaper(PAPER.issue);
  setTimeout(() => $('paperClose').focus({ preventScroll: true }), 30);
}
function closePaper(){ $('paper').hidden = true; scene.focus({ preventScroll: true }); }
$('btnPaper').addEventListener('click', openPaper);
$('paperClose').addEventListener('click', closePaper);
$('paper').addEventListener('click', (e) => { if (e.target === $('paper')) closePaper(); });
for (const b of document.querySelectorAll('[data-np]')) b.addEventListener('click', () => { PAPER.side = b.dataset.np; renderPaper(); });

/* ================= les chats se souviennent de toi ================= */
const MEM = {}, MEM_LS = 'cold-kutty-memoire-1';
let memTimer = 0;
function memMerge(list){
  if (!Array.isArray(list)) return;
  for (const v of list){
    if (!v || typeof v.name !== 'string' || !Array.isArray(v.last)) continue;
    if (MEM[v.name] && (MEM[v.name].t || 0) >= (+v.t || 0)) continue;
    MEM[v.name] = { n: clamp(+v.n || 0, 0, 9999), t: +v.t || 0, last: v.last.slice(-10).filter(x => x && (x.r === 'u' || x.r === 'c')).map(x => ({ r: x.r, s: String(x.s || '').slice(0, 220) })) };
  }
}
const memList = () => Object.keys(MEM).map(name => Object.assign({ name }, MEM[name]));
try { const s = localStorage.getItem(MEM_LS); if (s) memMerge(JSON.parse(s)); } catch (_) {}
async function loadMemories(){
  if (!DBH.db || !DBH.uid) return;
  try { const snap = await DBH.db.doc('data/users/' + DBH.uid + '/memoire').get(); if (snap.exists) memMerge((snap.data() || {}).cats); } catch (_) {}
}
function memSave(){
  clearTimeout(memTimer);
  memTimer = setTimeout(async () => {
    const list = memList();
    try { localStorage.setItem(MEM_LS, JSON.stringify(list)); } catch (_) {}
    if (DBH.db && DBH.uid){ try { await DBH.db.doc('data/users/' + DBH.uid + '/memoire').set({ cats: list }); } catch (_) {} }
  }, 1500);
}
function memRemember(c, turns){
  const m = MEM[c.name] || (MEM[c.name] = { n: 0, t: 0, last: [] });
  if (!c.memCounted){ m.n++; c.memCounted = true; }
  m.t = Date.now();
  m.last = turns.slice(1).slice(-10).map(x => ({ r: x.role === 'user' ? 'u' : 'c', s: String(x.content).slice(0, 220) }));
  memSave();
}
function memGreeting(c){
  const m = MEM[c.name]; if (!m || !m.n) return null;
  const hi = c.side === 'ccp' ? 'Camarade ! Te revoilà.' : c.side === 'usc' ? 'Hé, te revoilà !' : 'Tiens, un revenant !';
  let lastU = null; for (let i = m.last.length - 1; i >= 0; i--) if (m.last[i].r === 'u'){ lastU = m.last[i]; break; }
  if (!lastU) return hi + ' Ça me fait plaisir de te revoir.';
  let s = lastU.s.replace(/\s+/g, ' ').trim(); if (s.length > 42) s = s.slice(0, 40).replace(/\s+\S*$/, '') + '…';
  return hi + ' La dernière fois, tu m’as dit « ' + s + ' ». Je m’en souviens très bien.';
}
function memContext(c){
  const m = MEM[c.name]; if (!m || !m.n || !m.last.length) return '';
  return ' Tu as déjà discuté ' + (m.n > 1 ? m.n + ' fois' : 'une fois') + ' avec ce visiteur et tu t’en souviens. Fin de votre dernière conversation : ' + m.last.slice(-6).map(x => (x.r === 'u' ? 'Visiteur : ' : 'Toi : ') + x.s).join(' / ') + '. Fais-y allusion si ça vient naturellement.';
}

/* ================= les chats se parlent entre eux ================= */
const CHATTER = {
  usc: [
    ['Tu as vu la nouvelle Cadillatte ?', 'Les ailerons dépassent du garage !'],
    ['On se fait un drive-in samedi ?', 'Seulement si c’est un film de souris martiennes.'],
    ['Le juke-box du diner est cassé.', 'Tant mieux, j’avais la chanson dans la tête depuis mardi.'],
    ['Mon frigo fait de la glace tout seul.', 'Le progrès, mon vieux, le progrès.'],
    ['Tu crois qu’ils nous regardent, de l’autre côté ?', 'Avec des jumelles grandes comme des bouteilles de lait.'],
    ['J’ai gagné au bowling !', 'Tu as fait tomber des quilles ou le voisin ?'],
    ['Encore une pub pour le Kutty Cola.', 'On ronronne rien qu’à la voir.'],
    ['Le métro aérien est passé pile à l’heure.', 'Note-le, ça n’arrivera plus.']
  ],
  ccp: [
    ['Camarade, tu as rempli ton quota ?', 'Trois cents pour cent, avant le petit déjeuner.'],
    ['Il paraît qu’il y a des sardines au Gastronom.', 'Vite, je prends la file pour 1963.'],
    ['Le défilé était magnifique.', 'Le même que la semaine dernière. Donc parfait.'],
    ['Mon immeuble ressemble au tien.', 'C’est normal, c’est le tien.'],
    ['Le kolkhoze a battu son record.', 'Il le bat tous les lundis.'],
    ['Tu as lu la Pravdachat ?', 'Oui. Tout va très bien, c’est écrit.'],
    ['Natacha s’entraîne encore pour l’espace.', 'Elle tourne sur elle-même depuis ce matin.'],
    ['Le tracteur est reparti !', 'Gloire au tracteur !']
  ],
  cross: [
    ['Psst, du chewing-gum contre du caviar de sardine ?', 'Parle moins fort, le Sergent écoute.'],
    ['Chez nous, les voitures ont des ailerons.', 'Chez nous, les tracteurs ont des médailles.'],
    ['Vous avez de la musique, là-bas ?', 'Une fanfare. Très disciplinée.']
  ],
  neutre: [
    ['Belle soirée pour pêcher.', 'Les sardines, elles, ne connaissent pas de mur.'],
    ['Tu as vu le phare cette nuit ?', 'Deux éclats toutes les seize secondes. Je les compte pour dormir.']
  ]
};
function dynChatter(side){
  const out = [];
  if (side === 'usc' || side === 'ccp'){
    if (CAMPS[side].want) out.push([side === 'ccp' ? 'Le peuple réclame ' + wantLabel(side) + '.' : 'Il nous faudrait ' + wantLabel(side) + '.', side === 'ccp' ? 'Le Plan y pense déjà, camarade.' : 'Écris au maire, il construit vite.']);
    if (RES[side].short) out.push(['Plus une croquette à la maison…', side === 'ccp' ? 'La file du Gastronom avance. Un peu.' : 'L’épicier promet un arrivage demain.']);
    if (RES[side].moral >= 68) out.push(['Qu’est-ce qu’on est bien, ici.', 'Même la pluie est plus douce de ce côté.']);
    if (RES[side].moral < 38) out.push(['Le moral est dans les chaussettes.', side === 'ccp' ? 'Chut. Officiellement, il est excellent.' : 'Il faudrait un cinéma, ou un parc.']);
    if (feteSide(side)) out.push(side === 'ccp' ? ['Tu viens au feu d’artifice du peuple ?', 'Présence obligatoire, et joyeuse.'] : ['Tu viens voir le feu d’artifice ?', 'J’apporte le pop-corn au thon.']);
  }
  if (WEATHER.shown === 'neige' && WEATHER.k > .5) out.push(['Il neige !', 'Parfait pour une bataille de boules de neige.']);
  if (WEATHER.shown === 'pluie' && WEATHER.k > .5) out.push(['Encore de la pluie.', 'Les chats détestent l’eau, c’est connu.']);
  if (CAMPS.tension > .75) out.push(['Tu as entendu ? La tension monte.', 'Ne faisons pas de bruit, alors.']);
  if (GAME.mode === 'deb' && !DEB.wall) out.push(['On a débarqué hier et déjà une rue !', 'Demain une ville, après-demain l’île entière.']);
  return out;
}
const BUB = { els: [], next: 5, cur: [] };
function bubbleEl(k){
  let el = BUB.els[k];
  if (!el){ el = document.createElement('div'); el.className = 'bubble'; el.hidden = true; $('bubbles').appendChild(el); BUB.els[k] = el; }
  return el;
}
const bubblesOn = () => !OV_ON && !state.uiHidden && Z >= KDEF * .75 && !document.body.classList.contains('photo');
function stepBubbles(dt, t){
  if (!bubblesOn()){ BUB.cur = []; return; }
  BUB.cur = BUB.cur.filter(b => t < b.t1);
  if (BUB.cur.length || t < BUB.next) return;
  BUB.next = t + 6 + Math.random() * 7;
  const vis = CATS.filter(c => c.screen && c !== state.chatCat && c.screen[0] > 12 && c.screen[0] < W - 12 && c.screen[1] > 40 && c.screen[1] < H - 8);
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
function placeBubbles(t){
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
const THINK_ICON = {
  coeur: ['.r.r.', 'rrrrr', 'rrrrr', '.rrr.', '..r..'],
  faim: ['k.k.k.k', 'kkkkkkk', 'k.k.k.k'],
  zzz: ['kkk....', '..k.kkk', '.k....k', 'kkk..k.', '....kkk'],
  alerte: ['r', 'r', 'r', '.', 'r'],
  envie: ['...k...', '..kkk..', '.kkkkk.', '.k.k.k.', '.kkkkk.'],
  pluie: ['.bbbbb.', 'bbbbbbb', '...k...', '...k...', '..kk...'],
  fete: ['...y...', '..yyy..', 'yyyyyyy', '..yyy..', '.y...y.'],
  grogne: ['k.....k', '.k...k.', '.......', '..kkk..', '.k...k.']
};
function thoughtOf(c, seed){
  const s = c.side, opts = [];
  if (NIGHT > .75) opts.push('zzz');
  if (s === 'usc' || s === 'ccp'){
    const R = RES[s];
    if (R.short) opts.push('faim', 'faim');
    if (CAMPS.tension > .74) opts.push('alerte');
    if (feteSide(s)) opts.push('fete', 'fete');
    if (CAMPS[s].want) opts.push('envie');
    if (R.moral >= 64) opts.push('coeur');
    if (R.moral < 40) opts.push('grogne');
  }
  if (WEATHER.shown === 'pluie' && WEATHER.k > .5) opts.push('pluie');
  return opts.length ? opts[Math.floor(seed * opts.length)] : null;
}
function drawThoughts(t){
  if (OV_ON || Z < KDEF * .9 || document.body.classList.contains('photo')) return;
  LV = 0;
  for (const c of CATS){
    if (!c.screen || c === state.chatCat || BUB.cur.some(b => b.c === c && t >= b.t0 && t <= b.t1)) continue;
    const per = 19, ph = t + c.id * 7.3, win = Math.floor(ph / per), local = ph - win * per;
    if (local > 5 || hash2(c.id, win) > .42) continue;
    const kind = thoughtOf(c, hash2(c.id + 11, win)); if (!kind) continue;
    const ic = THINK_ICON[kind], iw = Math.max(...ic.map(r => r.length)), ih = ic.length;
    const bx = c.screen[0], by = c.screen[1], bob = Math.round(Math.sin(t * 2.4 + c.id) * .8);
    const w = iw + 4, h = ih + 4, x0 = bx - 1, y0 = by - 12 - h + bob;
    if (x0 < -w || y0 < -h || x0 > W || y0 > H) continue;
    CUR = M.BUBBLE;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++){
      if ((x === 0 || x === w - 1) && (y === 0 || y === h - 1)) continue;
      fput(x0 + x, y0 + y, (x === 0 || y === 0 || x === w - 1 || y === h - 1) ? 0 : 1);
    }
    fput(x0 + 2, y0 + h + 1, 0); fput(x0 + 3, y0 + h + 1, 0); fput(x0 + 2, y0 + h + 2, 0); fput(x0 + 3, y0 + h + 2, 0); fput(x0 + 1, y0 + h + 4, 0);
    for (let y = 0; y < ih; y++) for (let x = 0; x < ic[y].length; x++){
      const ch = ic[y][x]; if (ch === '.') continue;
      CUR = ch === 'r' ? M.ICON_R : ch === 'y' ? M.ICON_Y : ch === 'b' ? M.FW_BLUE : M.BUBBLE;
      fput(x0 + 2 + Math.floor((w - 4 - iw) / 2) + x, y0 + 2 + y, ch === 'k' ? 0 : 1);
    }
  }
}
HOOKS.top.push(drawThoughts);
