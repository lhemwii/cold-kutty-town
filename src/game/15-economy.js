/* ================= economie : croquettes, laine, moral ================= */
// par batiment : [croquettes/min, laine/min, loisirs, habitants au niveau 1], et son cout en laine
const ECO = {
  maison: [-1, 0, 0, 4, 15], immeuble: [-3, 0, 0, 12, 30], parc: [0, 0, 2, 0, 5], fontaine: [0, 0, 2, 0, 8], statue: [0, 0, 1, 0, 10],
  panneau: [0, 0, 1, 0, 5], kiosque: [0, 0, 3, 0, 10], chateau: [0, 0, 1, 0, 20], diner: [2, 0, 4, 0, 25], epicerie: [6, 0, 1, 0, 20],
  motel: [1, 0, 2, 0, 25], station: [0, 1, 1, 0, 20], cinema: [0, 0, 5, 0, 35], bowling: [0, 0, 4, 0, 35], drivein: [0, 0, 5, 0, 30],
  supermarche: [12, 0, 2, 0, 45], grandmagasin: [4, 0, 4, 0, 55], artdeco: [0, 2, 2, 0, 70], stalinien: [0, 3, 1, 0, 70],
  usine: [0, 10, -2, 0, 40], kolkhoze: [14, 0, 0, 0, 30], bulbes: [0, 0, 3, 0, 40], metro: [0, 0, 3, 0, 35], stade: [0, 0, 8, 0, 80],
  radio: [0, 0, 3, 0, 30], fusee: [0, -3, 4, 0, 100], cirque: [0, 0, 6, 0, 40], tribune: [0, 0, 3, 0, 45], gare: [2, 2, 2, 0, 60],
  mairie: [0, 2, 2, 0, 50], peuple: [0, 3, 2, 0, 60]
};
const RES = { usc: { croq: 200, laine: 250, rc: 0, rl: 0, pop: 0, fun: 0, moral: 60, moralAdj: 0, short: 0, neigh: 0, baseC: 20, baseL: 40 },
              ccp: { croq: 200, laine: 250, rc: 0, rl: 0, pop: 0, fun: 0, moral: 60, moralAdj: 0, short: 0, neigh: 0, baseC: 20, baseL: 40 } };
// revenu de base de chaque camp (peche, impots ou quotas) : la ville de depart est juste a l'equilibre
function ecoCalibrate(){
  for (const side of ['usc', 'ccp']){
    let rc = 0;
    for (const l of LOTS){ const t = INITIAL[l.id]; if (!t || l.side !== side) continue; const e = ECO[t]; if (e) rc += e[0]; }
    RES[side].baseC = Math.max(0, -rc) + 20; RES[side].baseL = 40;
  }
}
// chaque camp a sa culture : la ville de depart doit avoir un moral autour de 58 %
function ecoCalMoral(){
  for (const s of ['usc', 'ccp']){ RES[s].cal = 0; RES[s].moralAdj = 0; }
  refreshNeighbors(); ecoTally();
  for (const s of ['usc', 'ccp']) RES[s].cal = clamp(58 - RES[s].moral, -25, 25);
  ecoTally();
}
const costOf = (type) => (ECO[type] ? ECO[type][4] : 20);
const LVL_POP = { maison: [4, 6, 9], immeuble: [12, 20, 32] };
const LVL_NAME = { maison: ['Maison', 'Pavillon', 'Villa'], immeuble: ['Immeuble', 'Barre', 'Tour'] };
const LVL_NAME_CCP = { maison: ['Isba', 'Datcha', 'Datcha de ministre'], immeuble: ['Immeuble', 'Barre du Plan', 'Tour du Peuple'] };
function lvlName(l){ const L = (l.side === 'ccp' ? LVL_NAME_CCP : LVL_NAME)[l.type]; return L ? L[(l.lvl || 1) - 1] : typeName(l.type, l.side); }

/* ================= voisinage ================= */
const GREEN = new Set(['parc', 'fontaine', 'kiosque', 'statue']), SHOPS = new Set(['epicerie', 'supermarche', 'diner', 'grandmagasin', 'motel']);
const HOMES = new Set(['maison', 'immeuble']), NOISY = new Set(['usine', 'stade', 'drivein']);
const LEISURE = new Set(['cinema', 'bowling', 'drivein', 'diner', 'stade', 'cirque', 'kiosque', 'bulbes', 'radio']);
// score de voisinage d'un type pose sur un terrain, avec les raisons
function neighborOf(lot, type){
  let s = 0; const why = [];
  const add = (v, w) => { s += v; if (!why.includes(w)) why.push(w); };
  for (const o of LOTS){
    if (o === lot || !o.type) continue;
    const d = Math.hypot(o.ca - lot.ca, o.cb - lot.cb); if (d > 62) continue;
    if (HOMES.has(type)){
      if (GREEN.has(o.type)) add(2, 'verdure');
      else if (SHOPS.has(o.type)) add(1, 'commerces');
      else if (o.type === 'metro' || o.type === 'gare') add(2, 'transports');
      else if (o.type === 'usine') add(-3, 'usine bruyante');
      else if (NOISY.has(o.type)) add(-1, 'bruit');
    } else if (SHOPS.has(type) || LEISURE.has(type)){
      if (HOMES.has(o.type)) add(1, 'clients');
      else if (o.type === type) add(-1, 'concurrence');
    } else if (type === 'usine'){
      if (HOMES.has(o.type)) add(-1, 'voisins mécontents');
      else if (o.type === 'gare' || o.type === 'usine') add(1, 'logistique');
    } else if (GREEN.has(type)){
      if (HOMES.has(o.type)) add(1, 'promeneurs');
    }
  }
  return { s: clamp(s, -8, 12), why: why.slice(0, 3) };
}

/* ================= bilan d'un camp ================= */
function ecoTally(){
  for (const side of ['usc', 'ccp']){
    const R = RES[side]; let rc = 0, rl = 0, pop = 0, fun = 0, nsum = 0, nres = 0;
    for (const l of LOTS){
      if (!l.type || l.side !== side || (l.buildT && NOW_T < l.buildT + BUILD_DUR)) continue;
      const e = ECO[l.type] || [0, 0, 0, 0, 20];
      const lv = (l.lvl || 1) - 1;
      rc += e[0]; rl += e[1]; fun += e[2];
      if (LVL_POP[l.type]){ pop += LVL_POP[l.type][lv]; rc -= lv; }
      if (HOMES.has(l.type)){ if (l.neigh == null) l.neigh = neighborOf(l, l.type).s; nsum += l.neigh; nres++; }
    }
    R.rc = rc + R.baseC; R.rl = rl + R.baseL; R.pop = pop; R.fun = fun; R.neigh = nres ? nsum / nres : 0;
    const ratio = pop ? fun * 9 / pop : 1;
    R.moral = clamp(Math.round(48 + 22 * Math.tanh(ratio - .8) + R.neigh * 3 + (R.cal || 0) + R.moralAdj - (R.short ? 15 : 0)), 0, 100);
  }
}
function refreshNeighbors(){ for (const l of LOTS) l.neigh = null; }
// une seconde de jeu : stocks, penuries, evolution des logements
let ecoAcc = 0, lvlAcc = 0;
function stepEco(dt){
  ecoAcc += dt; lvlAcc += dt;
  if (ecoAcc < 1) return;
  const k = ecoAcc / 60; ecoAcc = 0;
  for (const side of ['usc', 'ccp']){
    const R = RES[side];
    R.croq = Math.min(9999, R.croq + R.rc * k); R.laine = Math.min(9999, R.laine + R.rl * k);
    const was = R.short; R.short = R.croq <= 0 ? 1 : 0; if (R.croq < 0) R.croq = 0;
    if (R.short && !was) logDay(side, 'short', 'pénurie de croquettes');
    if (R.short && !was) radioQueue.unshift(side === 'ccp' ? ['ccp', 'Radio Miaou-Scou', 'Pénurie de croquettes ! Le Plan prévoit des kolkhozes et des Gastronoms, vite.'] : ['usc', 'Radio Kutty Libre', 'Pénurie de croquettes au secteur USC ! Il faut des épiceries et des supermarchés.']);
    R.moralAdj *= Math.pow(.5, 1 / 90);
  }
  ecoTally();
  if (lvlAcc > 6){ lvlAcc = 0; tryUpgrade(); }
  renderRes();
}
function tryUpgrade(){
  const cand = LOTS.filter(l => LVL_POP[l.type] && (!GAME.mp || l.side === GAME.mp.seat) && (l.lvl || 1) < 3 && (!l.lvlT || NOW_T - l.lvlT > 45) && !(l.buildT && NOW_T < l.buildT + BUILD_DUR + 20));
  for (const l of cand){
    const n = l.neigh != null ? l.neigh : (l.neigh = neighborOf(l, l.type).s), lv = l.lvl || 1, R = RES[l.side];
    if (R.moral < 50 || R.short) continue;
    if ((lv === 1 && n >= 3) || (lv === 2 && n >= 6 && R.moral >= 60)){
      if (hash2(Math.round(l.ca), Math.round(NOW_T)) > .35) continue;
      l.lvl = lv + 1; l.lvlT = NOW_T; l.buildT = NOW_T;
      logDay(l.side, 'upgrade', lvlName(l), { id: l.id, type: l.type });
      rebuildTown(); saveSoon(); mpPush();
      if (hash2(l.lvl, Math.round(NOW_T)) < .5) toast((TYPES[l.type].fem ? 'Une ' : 'Un ') + typeName(l.type, l.side).toLowerCase() + ' devient ' + lvlName(l).toLowerCase() + ' grâce à son voisinage.');
      return;
    }
  }
}

/* ================= construction, demolition, annuler ================= */
const BUILD_DUR = 3.2, DUST_DUR = 1.4;
const HISTORY = [];
function payFor(lot, type){
  const R = RES[lot.side], c = costOf(type);
  if (R.laine < c){ toast('Pas assez de laine : il en faut ' + c + ', le ' + (lot.side === 'ccp' ? 'Plan' : 'Rêve') + ' en a ' + Math.floor(R.laine) + '. Construis des usines.'); return false; }
  R.laine -= c; return true;
}
function pushHistory(h){ HISTORY.push(h); if (HISTORY.length > 40) HISTORY.shift(); updateUndo(); }
function updateUndo(){ const b = document.getElementById('btnUndo'); if (b) b.disabled = !HISTORY.length; }
function undo(){
  const h = HISTORY.pop(); updateUndo();
  if (!h){ toast('Rien à annuler.'); return; }
  if (h.kind === 'build'){
    const l = LOTS.find(o => o.id === h.id); if (!l) return;
    l.type = ''; l.lvl = 1; l.buildT = 0; RES[l.side].laine += h.cost;
    if (h.camp){ Object.assign(CAMPS[l.side], h.camp); }
    toast('Construction annulée, laine remboursée.');
  } else if (h.kind === 'demolish'){
    const l = LOTS.find(o => o.id === h.id); if (!l) return;
    l.type = h.type; l.lvl = h.lvl; l.buildT = NOW_T; RES[l.side].laine -= h.refund;
    toast('Démolition annulée.');
  } else if (h.kind === 'road'){
    const k = USER_ROADS.findIndex(s => s.o === h.seg.o && s.c === h.seg.c && s.s0 === h.seg.s0 && s.s1 === h.seg.s1);
    if (k >= 0){ USER_ROADS.splice(k, 1); applyRoadsChange(h.seg); } toast('Route effacée.'); mpPush(); return;
  } else if (h.kind === 'unroad'){
    USER_ROADS.push(h.seg); applyRoadsChange(h.seg); toast('Route remise.'); mpPush(); return;
  }
  refreshNeighbors(); rebuildTown(); ghostKey = ''; updateGhost(); saveSoon(); updateCamps(false); mpPush();
}
// chantier : palissade, echafaudage qui monte, grue qui tourne, poussiere
function drawSite(l, t){
  const p = clamp((t - l.buildT) / BUILD_DUR, 0, 1), a0 = l.a0 + 3, a1 = l.a1 - 3, b0 = l.b0 + 3, b1 = l.b1 - 3, H = 4 + p * 16;
  CUR = M.WHEAT;
  for (const [pa, pb, qa, qb] of [[a0, b1, a1, b1], [a1, b1, a1, b0], [a0, b0, a0, b1], [a0, b0, a1, b0]]){ const n = Math.ceil(Math.hypot(qa - pa, qb - pb) / 2); for (let k = 0; k <= n; k++){ const a = pa + (qa - pa) * k / n, b = pb + (qb - pb) * k / n; line3(a, b, 0, a, b, 2.2, (k & 1) ? 1 : 0); } }
  CUR = M.METAL;
  const e0 = a0 + 4, e1 = a1 - 4, f0 = b0 + 4, f1 = b1 - 4;
  for (const [a, b] of [[e0, f0], [e1, f0], [e1, f1], [e0, f1]]) line3(a, b, 0, a, b, H, 1);
  for (let z = 3; z < H; z += 3.5){ line3(e0, f1, z, e1, f1, z, 1); line3(e1, f0, z, e1, f1, z, 1); line3(e0, f0, z, e0, f1, z, 0); line3(e0, f0, z, e1, f0, z, 0); }
  // grue
  const ga = a1 - 1, gb = b0 + 1, gh = 26, ang = t * .8 + l.ca;
  CUR = M.KVAS; line3(ga, gb, 0, ga, gb, gh, 1); line3(ga + .6, gb, 0, ga + .6, gb, gh, 1);
  const ja = ga + Math.cos(ang) * 14, jb = gb + Math.sin(ang) * 14, ca2 = ga - Math.cos(ang) * 4, cb2 = gb - Math.sin(ang) * 4;
  line3(ca2, cb2, gh, ja, jb, gh, 1); line3(ga, gb, gh + 3, ja, jb, gh, 1);
  CUR = M.METAL; const hook = gh - 4 - 6 * Math.abs(Math.sin(t * 1.3)); line3(ja, jb, gh, ja, jb, hook, 0);
  drawDust(l, t, .35 + .25 * Math.sin(t * 6));
}
function drawDust(l, t, amt){
  CUR = M.SMOKE;
  const c = prj(l.ca, l.cb, 0), cx = Math.round(c[0]), cy = Math.round(c[1]);
  const n = Math.round(70 * amt);
  for (let i = 0; i < n; i++){
    const ang = hash2(i, 3) * TAU, r = (hash2(i, 5) * 18 + (t * 9 % 6)) * (.6 + amt * .6), h = hash2(i, 9) * 10 * amt;
    const x = Math.round(cx + Math.cos(ang) * r * 1.4), y = Math.round(cy + Math.sin(ang) * r * .7 - h);
    if (bz(x, y) < 8) fput(x, y, 1);
  }
}
function siteDrawables(t, out){
  for (const l of LOTS){
    if (l.buildT && t < l.buildT + BUILD_DUR) out.push({ d: dep(l.ca, l.cb) + 2, f: () => drawSite(l, t) });
    else if (l.buildT && t < l.buildT + BUILD_DUR + .7) out.push({ d: dep(l.ca, l.cb) + 6, f: () => drawDust(l, t, 1 - (t - l.buildT - BUILD_DUR) / .7) });
    if (l.demoT && t < l.demoT + DUST_DUR) out.push({ d: dep(l.ca, l.cb) + 6, f: () => drawDust(l, t, 1.2 * (1 - (t - l.demoT) / DUST_DUR)) });
  }
}
let shadowTimer = 0;
function shadowsLater(){ clearTimeout(shadowTimer); shadowTimer = setTimeout(() => { if (COLOR) buildShadows(); OV.key = ''; }, (BUILD_DUR + .2) * 1000); }

/* ================= evenements : un choix a faire ================= */
const EVENTS = [
  { side: 'ccp', title: 'Pénurie au Gastronom', text: 'Plus une sardine au Gastronom. La file fait trois fois le tour du pâté de maisons.',
    a: ['Acheter des croquettes à l’USC', (E) => { E.ccp.laine -= 40; E.ccp.croq += 90; E.t -= .08; }], b: ['Rationner en chantant', (E) => { E.ccp.moralAdj -= 10; }] },
  { side: 'usc', title: 'Grève des dockers', text: 'Les dockers du Rêve réclament une prime en sardines avant de décharger les cargos.',
    a: ['Payer la prime', (E) => { E.usc.croq -= 50; E.usc.moralAdj += 6; }], b: ['Tenir bon', (E) => { E.usc.laine -= 35; E.usc.moralAdj -= 6; }] },
  { side: 'both', title: 'Échange d’espions', text: 'Chaque camp a attrapé un espion. On les échange au Checkpoint Minou, à l’aube, dans le brouillard ?',
    a: ['Échanger les espions', (E) => { E.t -= .12; E.usc.moralAdj += 3; E.ccp.moralAdj += 3; }], b: ['Garder le nôtre', (E) => { E.t += .1; E.bonus.usc += 4; E.bonus.ccp += 4; }] },
  { side: 'usc', title: 'Visite officielle', text: 'Un ministre du Monde Libre débarque pour admirer la vitrine de l’Ouest.',
    a: ['Grande parade de voitures', (E) => { E.usc.laine -= 30; E.bonus.usc += 8; E.t += .04; }], b: ['Visite discrète', (E) => { E.usc.moralAdj += 2; }] },
  { side: 'ccp', title: 'Record à l’usine n° 7', text: 'L’usine n° 7 annonce 400 % du Plan. Personne n’a vraiment compté.',
    a: ['Médailles pour tous', (E) => { E.ccp.laine -= 20; E.ccp.moralAdj += 8; }], b: ['Recompter les pelotes', (E) => { E.ccp.laine += 30; E.ccp.moralAdj -= 4; }] },
  { side: 'both', title: 'Tempête sur l’île', text: 'Un coup de vent arrache des tuiles des deux côtés du mur.',
    a: ['Réparer tout de suite', (E) => { E.usc.laine -= 25; E.ccp.laine -= 25; }], b: ['Attendre le soleil', (E) => { E.usc.moralAdj -= 5; E.ccp.moralAdj -= 5; }] },
  { side: 'usc', title: 'Concert de rock près du mur', text: 'Zazou veut brancher les amplis face au Rideau de Laine. De l’autre côté, on tend l’oreille.',
    a: ['Brancher les amplis', (E) => { E.usc.moralAdj += 8; E.t += .08; }], b: ['Baisser le son', (E) => { E.t -= .03; }] },
  { side: 'ccp', title: 'Défilé exceptionnel', text: 'Le Général propose un défilé de plus. Avec les missiles repeints.',
    a: ['Défilé exceptionnel', (E) => { E.bonus.ccp += 6; E.t += .1; E.parade = true; }], b: ['Défilé modeste', (E) => { E.ccp.moralAdj += 2; }] },
  { side: 'both', title: 'Contrebande de chewing-gum', text: 'Des chats échangent en douce caviar de sardine et chewing-gum par-dessus le mur.',
    a: ['Fermer les yeux', (E) => { E.usc.croq += 20; E.ccp.croq += 20; E.t -= .04; }], b: ['Renforcer les contrôles', (E) => { E.t += .06; E.bonus.usc += 3; E.bonus.ccp += 3; }] },
  { side: 'both', title: 'Téléphone rouge', text: 'Le téléphone rouge sonne entre la mairie et le Palais du Peuple. C’est une erreur de numéro. Ou pas.',
    a: ['Discuter un peu', (E) => { E.t -= .1; }], b: ['Raccrocher sèchement', (E) => { E.t += .05; E.bonus.usc += 2; E.bonus.ccp += 2; }] }
];
const EV = { next: 120, cur: null, shownAt: 0, last: -1, tAdj: 0 };
function stepEvents(dt, t){
  EV.tAdj *= Math.pow(.5, dt / 150);
  if (EV.cur){ if (t - EV.shownAt > 50) resolveEvent(EV.cur.b, true); return; }
  if (t < EV.next || state.chatCat || GAME.mp) return;
  let k = Math.floor(Math.random() * EVENTS.length); if (k === EV.last) k = (k + 1) % EVENTS.length;
  EV.last = k; EV.cur = EVENTS[k]; EV.shownAt = t;
  EV.next = t + clamp(260 - CAMPS.tension * 160, 90, 260) + Math.random() * 60;
  const el = $('eventCard'); el.hidden = false;
  $('evSide').textContent = EV.cur.side === 'ccp' ? 'CCR · GRAND PLAN DU PEUPLE' : EV.cur.side === 'usc' ? 'USC · RÊVE DES NATIONS LIBRES' : 'LES DEUX CAMPS';
  $('evTitle').textContent = EV.cur.title; $('evText').textContent = EV.cur.text;
  $('evA').textContent = EV.cur.a[0]; $('evB').textContent = EV.cur.b[0];
  el.dataset.side = EV.cur.side;
  sfx('event');
}
function resolveEvent(choice, auto){
  const E = { usc: RES.usc, ccp: RES.ccp, t: 0, bonus: { usc: 0, ccp: 0 }, parade: false };
  choice[1](E);
  for (const s of ['usc', 'ccp']){ RES[s].laine = Math.max(0, RES[s].laine); RES[s].croq = Math.max(0, RES[s].croq); CAMPS[s].bonus += E.bonus[s]; }
  EV.tAdj += E.t;
  if (E.parade) state.tShift = (state.tShift || 0) + ((PARADE.period - ((NOW_T % PARADE.period) + PARADE.period) % PARADE.period) % PARADE.period);
  logDay(EV.cur.side, 'event', EV.cur.title, { choice: choice[0] });
  toast((auto ? 'Personne n’a tranché : ' : '') + choice[0] + '.');
  radioQueue.unshift(['neutre', 'Radio du port', EV.cur.title + ' : ' + choice[0].toLowerCase() + '.']);
  EV.cur = null; $('eventCard').hidden = true;
  ecoTally(); updateCamps(true); renderRes(); saveSoon();
}
$('evA').addEventListener('click', () => { if (EV.cur) resolveEvent(EV.cur.a); });
$('evB').addEventListener('click', () => { if (EV.cur) resolveEvent(EV.cur.b); });

/* ================= course a l'espace ================= */
const SPACE = { usc: { stage: 0, launchT: null }, ccp: { stage: 0, launchT: null } };
const SPACE_STEPS = [[60, 'le premier satellite'], [75, 'le premier chat en orbite'], [90, 'le premier chat sur la Lune']];
let spaceCount = null;
function stepSpace(t){
  for (const side of ['usc', 'ccp']){
    if (GAME.mp && side !== GAME.mp.seat) continue;
    const S = SPACE[side], C = CAMPS[side];
    if (S.launchT && t > S.launchT + 70) S.launchT = null;
    if (S.launchT) continue;
    const step = SPACE_STEPS[S.stage]; if (!step || C.pct < step[0]) continue;
    if (!LOTS.some(l => l.side === side && l.type === 'fusee')){
      if (!S.warned){ S.warned = true; radioQueue.unshift([side, side === 'ccp' ? 'Radio Miaou-Scou' : 'Radio Kutty Libre', 'Le camp est prêt pour l’espace, mais il manque une base de lancement. Construisez-en une !']); C.want = 'fusee'; renderCamps(); }
      continue;
    }
    S.launchT = t + 10; S.stage++; S.warned = false;
    const other = side === 'usc' ? 'ccp' : 'usc', first = SPACE[other].stage < S.stage;
    spaceCount = { side, t0: t, what: step[1], first };
    radioQueue.unshift([side, side === 'ccp' ? 'Radio Miaou-Scou' : 'Radio Kutty Libre', 'Compte à rebours lancé : ' + step[1] + ' décolle dans dix secondes !']);
    const lot = LOTS.find(l => l.side === side && l.type === 'fusee'); if (lot && !state.chatCat) cam.follow = [lot.ca - 20, lot.cb - 20];
  }
  if (spaceCount){
    const left = Math.ceil(spaceCount.t0 + 10 - t), el = $('countdown');
    if (left > 0){ el.hidden = false; el.textContent = String(left); el.dataset.side = spaceCount.side; }
    else {
      el.hidden = true;
      const sc = spaceCount; spaceCount = null;
      sfx('launch');
      const nm = sc.side === 'ccp' ? 'La CCR' : 'L’USC';
      CAMPS[sc.side].bonus += sc.first ? 10 : 5; EV.tAdj += .06;
      logDay(sc.side, 'space', sc.what, { first: sc.first });
      fwSalvo(sc.side, 7);
      RES[sc.side === 'usc' ? 'ccp' : 'usc'].moralAdj -= sc.first ? 5 : 2; RES[sc.side].moralAdj += 6;
      toast(nm + ' envoie ' + sc.what + (sc.first ? ', avant l’autre camp !' : ', mais l’autre camp était déjà passé.'));
      radioQueue.unshift([sc.side, sc.side === 'ccp' ? 'Radio Miaou-Scou' : 'Radio Kutty Libre', sc.side === 'ccp' ? 'Victoire de la science du peuple : ' + sc.what + ' ! Le Grand Plan touche les étoiles.' : 'Historique : ' + sc.what + ' ! Le Rêve des Nations Libres monte jusqu’au ciel.']);
      updateCamps(true); saveSoon(); mpPush();
    }
  }
}

/* ================= affichage des ressources ================= */
function fmtRate(v){ const r = Math.round(v); return (r >= 0 ? '+' : '') + r; }
function renderRes(){
  for (const [side, k] of [['usc', 'U'], ['ccp', 'C']]){
    const R = RES[side], el = $('r' + k); if (!el) continue;
    el.innerHTML = '';
    const item = (label, val, rate, warn) => { const s = document.createElement('span'); s.className = 'res' + (warn ? ' warn' : ''); const b = document.createElement('b'); b.textContent = val; s.append(label + ' ', b); if (rate != null){ const i = document.createElement('i'); i.textContent = ' ' + rate + '/min'; s.append(i); } el.append(s); };
    item('Croquettes', Math.floor(R.croq), fmtRate(R.rc), R.short || R.rc < 0 && R.croq < 60);
    item('Laine', Math.floor(R.laine), fmtRate(R.rl), false);
    item('Moral', R.moral + ' %', null, R.moral < 40);
  }
}
function ecoSnapshot(){ return { u: [Math.round(RES.usc.croq), Math.round(RES.usc.laine), Math.round(RES.usc.moralAdj)], c: [Math.round(RES.ccp.croq), Math.round(RES.ccp.laine), Math.round(RES.ccp.moralAdj)], s: [SPACE.usc.stage, SPACE.ccp.stage] }; }
function ecoLoad(d){
  if (!d || typeof d !== 'object') return;
  for (const [side, k] of [['usc', 'u'], ['ccp', 'c']]){ const v = d[k]; if (!Array.isArray(v)) continue; RES[side].croq = clamp(+v[0] || 0, 0, 9999); RES[side].laine = clamp(+v[1] || 0, 0, 9999); RES[side].moralAdj = clamp(+v[2] || 0, -40, 40); }
  if (Array.isArray(d.s)){ SPACE.usc.stage = clamp(+d.s[0] || 0, 0, 3); SPACE.ccp.stage = clamp(+d.s[1] || 0, 0, 3); }
}
