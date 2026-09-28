/* ================= modes de jeu : la ville de 1961, le Debarquement, la partie a deux ================= */
// Debarquement : chaque camp part d'un bout de l'ile et avance vers le centre ; le mur se tricote quand ils se rejoignent
const DEB = { start: { usc: -590, ccp: 570 }, front: { usc: -590, ccp: 570 }, wall: false, wallT: -1e9, unlock: { usc: 0, ccp: 0 } };
const DEB_STEPS = [[10, 'air', 'L’aéroport ouvre ses pistes'], [22, 'rail', 'Le train roule sur la ligne du nord'], [36, 'metro', 'Le métro aérien entre en service']];
const WALL_LINE = { usc: WALL_A - STRIP - 26, ccp: WALL_A + STRIP + 26 };
function builtCount(side){ let n = 0; for (const l of LOTS) if (l.type && l.side === side) n++; return n; }
function debFronts(){
  for (const side of ['usc', 'ccp']){
    const s = side === 'usc' ? 1 : -1, n = builtCount(side), adv = n * 13 + CAMPS[side].done * 30;
    const f = DEB.start[side] + s * adv;
    DEB.front[side] = side === 'usc' ? Math.min(f, WALL_A - STRIP) : Math.max(f, WALL_A + STRIP);
  }
}
const inFront = (a) => GAME.mode !== 'deb' || DEB.wall || a <= DEB.front.usc || a >= DEB.front.ccp;
const inTerritory = (lot) => lot.side === 'usc' ? lot.a1 <= DEB.front.usc + .5 : lot.a0 >= DEB.front.ccp - .5;
function canBuildHere(lot, demolishing){
  if (GAME.mp && lot.side !== GAME.mp.seat) return 'Tu joues ' + (GAME.mp.seat === 'usc' ? 'l’USC' : 'la CCR') + ' : ce côté-là appartient à ton adversaire.';
  if (GAME.mode === 'deb' && !demolishing && !inTerritory(lot)) return 'Terrain pas encore conquis : construis et exauce les demandes pour faire avancer ta frontière.';
  return '';
}
const wallUp = () => GAME.mode !== 'deb' || DEB.wall;
// ce qui existe deja pour un camp en Debarquement
function unlocked(side, what){
  if (GAME.mode !== 'deb') return true;
  const k = DEB_STEPS.findIndex(s => s[1] === what);
  return k < 0 || DEB.unlock[side] > k;
}
function catVisible(c){
  if (GAME.mode !== 'deb') return true;
  if (c.fixed && Math.abs(c.fixed[0] - WALL_A) < 30) return DEB.wall;
  const p = c.fixed || c.path[0];
  return c.side === 'neutre' ? true : inFront(p[0]);
}
// avancee du front, paliers, construction du mur
let debAcc = 0;
function stepDeb(dt, t){
  if (GAME.mode !== 'deb') return;
  debAcc += dt; if (debAcc < .5) return; debAcc = 0;
  const prev = { usc: DEB.front.usc, ccp: DEB.front.ccp };
  debFronts();
  for (const side of ['usc', 'ccp']){
    const n = builtCount(side);
    while (DEB.unlock[side] < DEB_STEPS.length && n >= DEB_STEPS[DEB.unlock[side]][0]){
      const st = DEB_STEPS[DEB.unlock[side]]; DEB.unlock[side]++;
      logDay(side, 'unlock', st[2]);
      radioQueue.unshift([side, side === 'ccp' ? 'Radio Miaou-Scou' : 'Radio Kutty Libre', st[2] + (side === 'ccp' ? ' côté CCR. Gloire au Plan !' : ' côté USC. Le Rêve avance !')]);
      toast(st[2] + (side === 'ccp' ? ' en CCR.' : ' en USC.'));
      rebuildTown();
    }
  }
  if (Math.abs(prev.usc - DEB.front.usc) > .1 || Math.abs(prev.ccp - DEB.front.ccp) > .1) OV.key = '';
  if (!DEB.wall && DEB.front.usc >= WALL_LINE.usc && DEB.front.ccp <= WALL_LINE.ccp) raiseWall(t);
}
function raiseWall(t){
  DEB.wall = true; DEB.wallT = t;
  logDay('both', 'wall', 'le Rideau de Laine');
  paintRoads(WALL_A - STRIP - 2, WALL_A + STRIP + 2, GB0, GB0 + GH / GSC);
  buildGraph(); reseatCars(); rebuildTown();
  EV.tAdj += .2; sfx('wall'); mpPush();
  radioQueue.unshift(['neutre', 'Radio du port', 'Cette nuit, le Rideau de Laine a été tricoté d’un bout à l’autre de l’île. Les deux camps se regardent désormais par-dessus la laine.']);
  toast('Les deux frontières se touchent : le Rideau de Laine se tricote sous tes yeux.');
  if (!state.chatCat){ cam.follow = [WALL_A, CHECK_B]; if (Z < KDEF) setZoom(KDEF); }
  saveSoon();
}
// le mur se tricote depuis le checkpoint vers les deux cotes
const wallReveal = (b) => GAME.mode !== 'deb' || (DEB.wall && Math.abs(b - CHECK_B) < (NOW_T - DEB.wallT) * 45);
// avant le mur : la bande du no man's land reste en herbe
function hideStrip(){
  const ia0 = Math.floor((WALL_A - STRIP - GA0) * GSC), ia1 = Math.ceil((WALL_A + STRIP - GA0) * GSC);
  for (let ib = 0; ib < GH; ib++) for (let ia = ia0; ia <= ia1; ia++){
    const i = ib * GW + ia; if (gBase[i] !== T_STRIP) continue;
    if (gType[i] === T_ROAD) continue;
    gType[i] = T_GRASS; gTone[i] = baseTone(GA0 + (ia + .5) / GSC, GB0 + (ib + .5) / GSC, T_GRASS, gLand[i], gSea[i], ia, ib);
  }
}
// piquets de geometre le long de chaque frontiere
function frontDrawables(t, out){
  if (GAME.mode !== 'deb' || DEB.wall) return;
  for (const side of ['usc', 'ccp']){
    const a = DEB.front[side];
    for (let b = GB0 + 20; b < GB0 + GH / GSC - 20; b += 24){
      const ty = typeAt(a, b); if (ty === T_SEA || ty === T_BEACH) continue;
      out.push({ d: dep(a, b), f: () => {
        const p = prj(a, b, 0), x = Math.round(p[0]), y = Math.round(p[1]);
        CUR = M.WHEAT; for (let k = 0; k < 7; k++) fput(x, y - k, k < 1 ? 0 : 1);
        CUR = side === 'usc' ? M.FLAG_BLUE : M.FLAG_RED; const w = Math.round(Math.sin(t * 3 + b) * .8);
        for (let yy = 0; yy < 3; yy++) for (let xx = 1; xx <= 4; xx++) fput(x + xx, y - 7 + yy + (xx > 2 ? w : 0), 0);
      } });
    }
  }
}
// ville de depart du Debarquement : un petit noyau pres de chaque bout
function debStarter(){
  for (const l of LOTS){ l.type = ''; l.lvl = 1; l.buildT = 0; }
  const pick = (side, list) => {
    const sgn = side === 'usc' ? 1 : -1, P = PORTS.find(p => p.side === side), base = [P.ca + sgn * 50, P.top - 45];
    const cand = LOTS.filter(l => l.side === side && inTerritory(l) && !l.blocked).sort((x, y) => Math.hypot(x.ca - base[0], x.cb - base[1]) - Math.hypot(y.ca - base[0], y.cb - base[1]));
    list.forEach((t, k) => { if (cand[k]) cand[k].type = t; });
  };
  DEB.front.usc = DEB.start.usc; DEB.front.ccp = DEB.start.ccp;
  pick('usc', ['mairie', 'maison', 'maison', 'epicerie', 'maison', 'parc']);
  pick('ccp', ['peuple', 'immeuble', 'epicerie', 'usine', 'immeuble', 'kolkhoze']);
  INITIAL = {}; for (const l of LOTS) INITIAL[l.id] = l.type;
}
// ---- passage d'un mode a l'autre ----
const MODE_KEYS = { ville: { ls: COLOR ? 'cold-kutty-town-2' : 'old-kutty-town-5', doc: COLOR ? 'cold2' : 'ville5' }, deb: { ls: 'cold-kutty-town-deb-1', doc: 'colddeb1' } };
let VILLE_INITIAL = null;
async function enterMode(mode, fresh){
  if (mode === GAME.mode && !fresh) return;
  if (!VILLE_INITIAL) VILLE_INITIAL = Object.assign({}, INITIAL);
  clearTimeout(saveTimer);
  GAME.mode = mode; HISTORY.length = 0; updateUndo();
  USER_ROADS = [];
  for (const k of ['usc', 'ccp']){ Object.assign(CAMPS[k], { bonus: 0, want: '', done: 0 }); SPACE[k].stage = 0; SPACE[k].launchT = null; RES[k].moralAdj = 0; }
  if (mode === 'deb'){
    DEB.wall = false; DEB.wallT = -1e9; DEB.unlock = { usc: 0, ccp: 0 };
    debStarter();
    for (const k of ['usc', 'ccp']){ RES[k].croq = 80; RES[k].laine = 160; RES[k].baseC = 18; RES[k].baseL = 40; }
    ecoCalMoral();
  } else {
    for (const l of LOTS){ l.type = VILLE_INITIAL[l.id] || ''; l.lvl = 1; l.buildT = 0; }
    INITIAL = Object.assign({}, VILLE_INITIAL);
    ecoCalibrate(); ecoCalMoral(); for (const k of ['usc', 'ccp']){ RES[k].croq = 200; RES[k].laine = 250; }
  }
  setCampGoals();
  CAL.m = 9; CAL.y = 1961;
  let loaded = false;
  if (!fresh){
    let saved = null;
    try { const s = localStorage.getItem(MODE_KEYS[mode].ls); if (s) saved = JSON.parse(s); } catch (_) {}
    if (DBH.db && DBH.uid){ try { const snap = await DBH.db.doc('data/users/' + DBH.uid + '/' + MODE_KEYS[mode].doc).get(); if (snap.exists) saved = snap.data(); } catch (_) {} }
    if (saved) loaded = loadTownData(saved);
  }
  DEB.landT = mode === 'deb' && !loaded ? NOW_T : 0;
  paintRoads(GA0, GA0 + GW / GSC, GB0, GB0 + GH / GSC);
  if (mode === 'deb'){ debFronts(); if (!DEB.wall) hideStrip(); }
  refreshBlocked(); buildGraph(); reseatCars(); refreshNeighbors(); rebuildTown(); ecoTally(); updateCamps(false); renderRes(); applySeason(); updateCalUI();
  OV.key = '';
  document.body.dataset.mode = mode;
  if (mode === 'deb'){
    const P = PORTS[0];
    if (!loaded){ centerOn(P.ca + 30, P.top + 10); if (Z < KDEF) setZoom(KDEF); toast('Les barges de l’USC et de la CCR accostent chacune à un bout de l’île. À toi de bâtir !'); }
    else { const L = LOTS.filter(l => l.type && l.side === 'usc'); centerOn(L.length ? L.reduce((s, l) => s + l.ca, 0) / L.length : P.ca, L.length ? L.reduce((s, l) => s + l.cb, 0) / L.length : P.top); }
  } else centerOn(-10, 0);
  saveSoon();
}
