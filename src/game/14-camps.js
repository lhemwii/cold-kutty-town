/* ================= les deux camps : le Reve, le Plan, et la tension entre les deux ================= */
// valeur de chaque batiment : [pour le Reve des Nations Libres, pour le Grand Plan du Peuple]
const CAMP_VAL = {
  maison: [2, 1], immeuble: [1, 3], diner: [5, 1], cinema: [5, 2], drivein: [6, 1], motel: [3, 1], bowling: [5, 1], station: [3, 2],
  epicerie: [3, 3], supermarche: [7, 1], grandmagasin: [6, 4], artdeco: [6, 2], stalinien: [2, 7], metro: [4, 5], usine: [1, 8],
  kolkhoze: [1, 7], bulbes: [2, 4], stade: [7, 5], radio: [3, 4], fusee: [5, 7], cirque: [3, 5], statue: [2, 4], panneau: [3, 3],
  fontaine: [2, 2], chateau: [2, 2], kiosque: [3, 2], parc: [2, 1], tribune: [2, 6], gare: [5, 5], mairie: [4, 2], peuple: [1, 6]
};
const WANTS = {
  usc: ['diner', 'cinema', 'drivein', 'bowling', 'supermarche', 'grandmagasin', 'artdeco', 'stade', 'kiosque', 'motel', 'station', 'fusee', 'fontaine'],
  ccp: ['usine', 'kolkhoze', 'stalinien', 'immeuble', 'bulbes', 'metro', 'cirque', 'statue', 'grandmagasin', 'fusee', 'tribune', 'radio', 'stade']
};
const CAMP_NAME = { usc: 'Rêve des Nations Libres', ccp: 'Grand Plan du Peuple' };
const CAMPS = { usc: { bonus: 0, want: '', done: 0, pct: 0 }, ccp: { bonus: 0, want: '', done: 0, pct: 0 }, goal: { usc: 1, ccp: 1 }, tension: .3, level: '' };
const TENSION_LEVELS = [[.35, 'Détente'], [.55, 'Froid'], [.75, 'Glacial'], [2, 'Crise']];
function campScore(side){
  let s = CAMPS[side].bonus;
  for (const l of LOTS) if (l.type && l.side === side){ const v = CAMP_VAL[l.type]; s += v ? v[side === 'usc' ? 0 : 1] : 2; }
  return s;
}
// la ville de depart vaut la moitie de la jauge ; chaque point gagne ensuite fait monter de 0,4 %
const CAMP_STEP = 2.5;
function setCampGoals(){
  for (const side of ['usc', 'ccp']){
    let s = 0;
    for (const l of LOTS){ const t = INITIAL[l.id]; if (t && l.side === side){ const v = CAMP_VAL[t]; s += v ? v[side === 'usc' ? 0 : 1] : 2; } }
    CAMPS.goal[side] = s;
  }
}
function pickWant(side, avoid){
  const list = WANTS[side].filter(t => t !== avoid && TYPES[t]);
  const k = Math.floor(hash2(CAMPS[side].done * 13 + (side === 'usc' ? 1 : 7), 41) * list.length);
  return list[k] || list[0];
}
function tensionLevel(v){ for (const [lim, name] of TENSION_LEVELS) if (v < lim) return name; return 'Crise'; }
function updateCamps(announce){
  for (const side of ['usc', 'ccp']){
    const C = CAMPS[side];
    if (!C.want || !TYPES[C.want]) C.want = pickWant(side, '');
    const R = RES[side];
    C.pct = clamp(Math.round(50 + (campScore(side) - CAMPS.goal[side]) / CAMP_STEP + (R.moral - 55) / 4 - (R.short ? 8 : 0)), 0, 100);
  }
  const diff = Math.abs(CAMPS.usc.pct - CAMPS.ccp.pct) / 100;
  const parade = COLOR && typeof paradeHead === 'function' && paradeHead(now() / 1000 + (state.tShift || 0)) != null ? .08 : 0;
  CAMPS.tension = clamp(.24 + diff * 1.7 + parade + EV.tAdj, 0, 1);
  const lvl = tensionLevel(CAMPS.tension);
  if (announce && CAMPS.level && lvl !== CAMPS.level && typeof radioQueue !== 'undefined'){
    const up = TENSION_LEVELS.findIndex(x => x[1] === lvl) > TENSION_LEVELS.findIndex(x => x[1] === CAMPS.level);
    radioQueue.unshift(['neutre', 'Radio du port', up
      ? 'La tension monte entre l’USC et la CCR : on passe à « ' + lvl + ' ». Les jumelles chauffent des deux côtés du mur.'
      : 'Ouf, la tension retombe : « ' + lvl + ' ». Le Sergent et le Général se sont presque souri.']);
  }
  CAMPS.level = lvl;
  renderCamps();
}
function wantLabel(side){
  const t = CAMPS[side].want; if (!t) return '';
  const nm = typeName(t, side).toLowerCase();
  return (TYPES[t].fem ? 'une ' : 'un ') + nm;
}
// appele apres chaque construction
function onBuilt(lot){
  const C = CAMPS[lot.side];
  logDay(lot.side, 'build', typeName(lot.type, lot.side), { id: lot.id, type: lot.type });
  if (C && C.want === lot.type){
    C.bonus += 12; C.done++;
    logDay(lot.side, 'want', typeName(lot.type, lot.side), { id: lot.id, type: lot.type });
    const old = C.want; C.want = pickWant(lot.side, old);
    toast('Demande accomplie ! +12 au ' + CAMP_NAME[lot.side] + '. Nouvelle demande : ' + wantLabel(lot.side) + '.');
    if (typeof radioQueue !== 'undefined') radioQueue.unshift(lot.side === 'ccp'
      ? ['ccp', 'Radio Miaou-Scou', 'Le peuple a obtenu ' + (TYPES[old].fem ? 'sa ' : 'son ') + typeName(old, 'ccp').toLowerCase() + ' ! Le Grand Plan avance. Prochaine étape : ' + wantLabel('ccp') + '.']
      : ['usc', 'Radio Kutty Libre', 'Rêve exaucé : ' + wantLabel('usc').replace(/^un |^une /, '') + ' au programme maintenant, après ' + typeName(old, 'usc').toLowerCase() + ' ! Le Rêve des Nations Libres brille.']);
  }
  updateCamps(true);
}
function renderCamps(){
  const el = document.getElementById('camps'); if (!el) return;
  for (const [side, k] of [['usc', 'U'], ['ccp', 'C']]){
    const C = CAMPS[side];
    $('g' + k).textContent = C.pct + ' %';
    $('g' + k + 'bar').style.width = C.pct + '%';
    $('w' + k).textContent = 'Demande : ' + wantLabel(side);
  }
  $('tBar').style.left = Math.round(CAMPS.tension * 100) + '%';
  $('tLab').textContent = CAMPS.level;
  el.dataset.level = CAMPS.level;
  // badge sur les batiments demandes dans la palette
  for (const b of document.querySelectorAll('.bbtn')){
    const t = b.dataset.t, u = CAMPS.usc.want === t, c = CAMPS.ccp.want === t;
    b.classList.toggle('wanted', u || c);
    b.title = u && c ? 'Demandé par les deux camps' : u ? 'Demandé par l’USC' : c ? 'Demandé par la CCR' : '';
  }
}
function campsSnapshot(){ return { u: [CAMPS.usc.bonus, CAMPS.usc.want, CAMPS.usc.done], c: [CAMPS.ccp.bonus, CAMPS.ccp.want, CAMPS.ccp.done] }; }
function campsLoad(d){
  if (!d || typeof d !== 'object') return;
  for (const [side, k] of [['usc', 'u'], ['ccp', 'c']]){
    const v = d[k]; if (!Array.isArray(v)) continue;
    CAMPS[side].bonus = clamp(+v[0] || 0, 0, 5000); CAMPS[side].want = TYPES[v[1]] ? String(v[1]) : ''; CAMPS[side].done = clamp(+v[2] || 0, 0, 9999);
  }
}
