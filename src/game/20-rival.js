import { SH } from './00-shared.ts';
import { GAME, SIDES, TAU, hash2, other } from './01-core.ts';
import { GA0, GB0, ISEED, W_ISLE_MIN, islandNear, mapScale, nearestShore } from './02-ground.ts';
import { SID, TC, TER, sideAt } from './08-territory.ts';
import { RW, RWS, addRoad, nearRoad, polyAt, roadCost, roadProblem, sampleLine } from './09-roads.ts';
import { coastDir, findSpot, footOf, makeBuilding, placeProblem } from './10-town.ts';
import { WALL_COST, addWall, wallPieces, wallProblem } from './13-ui.js';
import { BARGE_COST } from './14-hud.js';
/* ================= l'IA d'en face : elle debarque, construit, trace ses routes et pousse sa frontiere ================= */
// un etat par camp : l'IA joue la CCR ou l'USC (et les deux dans les tests d'equilibrage)
export const newBrain = () => ({ acc: 0, lastBarge: 0, lastWall: 0, lost: 0, lastCnt: 0, think: 2.6 });
export const RIVAL = { usc: newBrain(), ccp: newBrain(), tries: 0, auto: { usc: false, ccp: true } };
// gouts de chaque camp pour les loisirs et le prestige
export const RIVAL_FUN = { usc: ['parc', 'diner', 'cinema', 'kiosque', 'bowling', 'drivein', 'fontaine', 'panneau', 'motel'], ccp: ['parc', 'statue', 'kiosque', 'cirque', 'bulbes', 'panneau', 'fontaine', 'tribune'] };
export const RIVAL_BIG = { usc: ['radio', 'stade', 'grandmagasin', 'artdeco', 'fusee', 'supermarche'], ccp: ['radio', 'stade', 'stalinien', 'fusee', 'grandmagasin', 'usine'] };
export const count = (side, type) => SH.BLD.filter(l => l.side === side && l.type === type).length;
export const rnd = (k) => hash2(Math.floor(GAME.t * 10) + k * 17, RIVAL.tries++);

// plage de debarquement de l'IA : loin du joueur, sur une cote accueillante
// avec plusieurs vraies iles (deux, quatre, archipel), elle debarque sur une autre ile que le joueur
export function rivalLanding(pa, pb){
  const isl = ISEED.isl.filter(it => it.ra >= W_ISLE_MIN), mine = islandNear(pa, pb);
  const multi = isl.length > 1 && ISEED.conf !== 'une' && ISEED.conf !== 'atoll', dmin = 500 * Math.min(1, mapScale());
  const nA = Math.max(18, Math.round(90 / isl.length));
  let best = null, bs = -1;
  for (const it of isl) for (let k = 0; k < nA; k++){
    const an = k / nA * TAU, s = nearestShore(it.ca + Math.cos(an) * it.ra * .9, it.cb + Math.sin(an) * it.rb * .9, 160); if (!s) continue;
    const d = Math.hypot(s[0] - pa, s[1] - pb); if (d < dmin) continue;
    if (!findSpot('qg', GAME.rival, s[0] - Math.cos(an) * 40, s[1] - Math.sin(an) * 40, 70, true)) continue;
    const sc = d + (multi && it !== mine ? 1e5 : 0) + hash2(k, GAME.seed) * 200;
    if (sc > bs){ bs = sc; best = s; }
  }
  return best;
}
// la ou l'IA pose ses batiments : le long de ses routes, pres du QG
export function rivalSpot(type, side){
  const e = SH.ECO[type], hq = SH.BLD.find(l => l.side === side && l.type === 'qg');
  if (!hq) return null;
  let best = null, bs = -1e9;
  if (e.coast){
    // le long de la cote de son territoire
    for (let k = 0; k < 60; k++){
      const an = rnd(k) * TAU, r = 30 + rnd(k + 50) * 200, s = nearestShore(hq.ca + Math.cos(an) * r, hq.cb + Math.sin(an) * r, 50); if (!s) continue;
      const v = [s[0] - hq.ca, s[1] - hq.cb], L = Math.hypot(v[0], v[1]) || 1, ca = Math.round(s[0] - v[0] / L * 14), cb = Math.round(s[1] - v[1] / L * 14);
      const dir = coastDir(ca, cb); if (dir < 0 || placeProblem(type, side, ca, cb, dir, false)) continue;
      const sc = -Math.hypot(ca - hq.ca, cb - hq.cb) + rnd(k + 9) * 40; if (sc > bs){ bs = sc; best = [ca, cb, dir]; }
    }
    return best;
  }
  const [fa, fb] = footOf(type), roads = SH.ROADS.filter(r => r.side === side);
  // les batiments sans route : autour du QG et des batiments existants
  if (e.noRoad || !roads.length){
    const mine = SH.BLD.filter(l => l.side === side);
    for (let k = 0; k < 70; k++){
      const o = mine[Math.floor(rnd(k) * mine.length)], an = rnd(k + 1) * TAU, r = 24 + rnd(k + 7) * 50;
      const ca = Math.round(o.ca + Math.cos(an) * r), cb = Math.round(o.cb + Math.sin(an) * r);
      if (placeProblem(type, side, ca, cb, 0, false) || blocksGrid(side, makeBuilding(type, side, ca, cb, 0))) continue;
      const sc = -Math.hypot(ca - hq.ca, cb - hq.cb) * .5 + rnd(k + 11) * 60;
      if (sc > bs){ bs = sc; best = [ca, cb, 0]; }
    }
    return best;
  }
  // les autres : on balaie les deux cotes de chaque route, comme des parcelles le long des rues
  for (const r of roads){
    for (let s = 8; s < r.len - 4; s += 7){
      const p = polyAt(r.pts, r.cum, s), across = Math.abs(Math.sin(p[2])) > .7 ? fa : fb;
      for (const sg of [1, -1]){
        const off = RW + 3.5 + across / 2, ca = Math.round(p[0] - Math.sin(p[2]) * off * sg), cb = Math.round(p[1] + Math.cos(p[2]) * off * sg);
        if (placeProblem(type, side, ca, cb, 0, false)) continue;
        const sc = -Math.hypot(ca - hq.ca, cb - hq.cb) * .7 + hash2(ca, cb + GAME.seed) * 40;
        if (sc > bs){ bs = sc; best = [ca, cb, 0]; }
      }
    }
  }
  return best;
}
// un avant-poste pres de la frontiere, du cote ou il reste le plus de terre libre
export function rivalFlagSpot(side){
  const sid = SID[side], own = TER.own, Wd = TER.W;
  let best = null, bs = -1;
  for (let k = 0; k < 400; k++){
    const i = Math.floor(rnd(k) * TER.N); if (own[i] !== sid) continue;
    let free = 0;
    for (const j of [i - 3, i + 3, i - 3 * Wd, i + 3 * Wd, i - 6, i + 6, i - 6 * Wd, i + 6 * Wd]) if (j >= 0 && j < TER.N && TER.land[j] && !own[j]) free++;
    if (!free) continue;
    const a = GA0 + (i % Wd + .5) * TC, b = GB0 + (((i / Wd) | 0) + .5) * TC;
    if (placeProblem('drapeau', side, a, b, 0, false)) continue;
    const sc = free + rnd(k + 1) * 3; if (sc > bs){ bs = sc; best = [a, b, 0]; }
  }
  return best;
}
// plan d'urbanisme de l'IA : une grille de rues calee sur sa premiere route, prolongee troncon par troncon
export const GRID_SP = 84;
export function rivalGrid(side){
  const B = RIVAL[side]; if (B.grid) return B.grid;
  const r = SH.ROADS.find(o => o.side === side); if (!r) return null;
  const p = r.pts[0], q = r.pts[r.pts.length - 1], horiz = Math.abs(q[0] - p[0]) >= Math.abs(q[1] - p[1]);
  // horiz : la premiere route est une rangee (b fixe) ; les colonnes partent de son debut
  B.grid = horiz ? { x0: Math.min(p[0], q[0]), y0: p[1] } : { x0: p[0], y0: Math.min(p[1], q[1]) };
  return B.grid;
}
export const gridX = (g, i) => g.x0 + i * GRID_SP, gridY = (g, j) => g.y0 + j * GRID_SP;
// un batiment qui ne demande pas de route ne doit pas boucher une future rue
export function blocksGrid(side, l){
  const g = RIVAL[side].grid; if (!g) return false;
  const m = RWS + 1;
  const i0 = Math.floor((l.a0 - m - g.x0) / GRID_SP), i1 = Math.floor((l.a1 + m - g.x0) / GRID_SP), j0 = Math.floor((l.b0 - m - g.y0) / GRID_SP), j1 = Math.floor((l.b1 + m - g.y0) / GRID_SP);
  for (let i = i0; i <= i1 + 1; i++){ const x = gridX(g, i); if (x > l.a0 - m && x < l.a1 + m) return true; }
  for (let j = j0; j <= j1 + 1; j++){ const y = gridY(g, j); if (y > l.b0 - m && y < l.b1 + m) return true; }
  return false;
}
export function rivalRoad(side){
  const hq = SH.BLD.find(l => l.side === side && l.type === 'qg'); if (!hq) return false;
  const roads = SH.ROADS.filter(r => r.side === side); if (!roads.length) return SH.stubRoad(hq, side, null);
  const g = rivalGrid(side); if (!g) return false;
  // troncons de la grille qui touchent deja le reseau, les plus proches du QG d'abord
  const ci = Math.round((hq.ca - g.x0) / GRID_SP), cj = Math.round((hq.cb - g.y0) / GRID_SP), cand = [];
  for (let i = ci - 6; i <= ci + 6; i++) for (let j = cj - 6; j <= cj + 6; j++){
    const x = gridX(g, i), y = gridY(g, j);
    cand.push([[x, y], [gridX(g, i + 1), y]], [[x, y], [x, gridY(g, j + 1)]]);
  }
  const hqd = (seg) => Math.hypot((seg[0][0] + seg[1][0]) / 2 - hq.ca, (seg[0][1] + seg[1][1]) / 2 - hq.cb);
  cand.sort((u, v) => hqd(u) - hqd(v));
  for (const [p, q] of cand){
    if (!nearRoad(p[0], p[1], 3, side) && !nearRoad(q[0], q[1], 3, side)) continue;
    if (nearRoad((p[0] + q[0]) / 2, (p[1] + q[1]) / 2, 3, side)) continue;
    // on raccourcit si le bout sort du territoire ou tombe a l'eau
    for (const f of [1, .75, .5]){
      const e = [p[0] + (q[0] - p[0]) * f, p[1] + (q[1] - p[1]) * f], st = nearRoad(p[0], p[1], 3, side) ? p : q, en = st === p ? e : [q[0] + (p[0] - q[0]) * f, q[1] + (p[1] - q[1]) * f];
      const pts = sampleLine(st, en);
      if (roadProblem(pts, side)) continue;
      const c = roadCost(pts); if (!SH.canPay(side, c, 0)) return false;
      SH.pay(side, c, 0); addRoad(pts, side); return true;
    }
  }
  return false;
}
export function rivalBuild(type, side){
  const pr = SH.priceOf(type, side);
  if (!SH.canAfford(side, pr)) return false;
  const spot = type === 'drapeau' ? rivalFlagSpot(side) : rivalSpot(type, side);
  // pas de place : on prolonge le reseau, le tour n'est pas perdu
  if (!spot) return !SH.ECO[type].noRoad && rivalRoad(side);
  SH.pay(side, pr.l, pr.r, pr.c);
  SH.startBuilding(makeBuilding(type, side, spot[0], spot[1], spot[2]));
  return true;
}
// un pan de Rideau sur la frontiere commune, quand l'IA perd du terrain
export function rivalWall(side){
  const sid = SID[side], eid = SID[other(side)], own = TER.own, Wd = TER.W, pts = [];
  for (let i = Wd; i < TER.N - Wd; i++){
    if (own[i] !== sid) continue;
    if (own[i - 1] === eid || own[i + 1] === eid || own[i - Wd] === eid || own[i + Wd] === eid){
      // un peu en retrait, cote IA
      const a = GA0 + (i % Wd + .5) * TC, b = GB0 + (((i / Wd) | 0) + .5) * TC; pts.push([a, b]);
    }
  }
  if (pts.length < 6) return false;
  for (let k = 0; k < 10; k++){
    const p = pts[Math.floor(rnd(k) * pts.length)];
    const q = pts.filter(o => { const d = Math.hypot(o[0] - p[0], o[1] - p[1]); return d > 40 && d < 90; })[0];
    if (!q) continue;
    const hq = SH.BLD.find(l => l.side === side && l.type === 'qg') || { ca: p[0], cb: p[1] };
    // on recule le mur de 8 unites vers chez soi
    const mid = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2], v = [hq.ca - mid[0], hq.cb - mid[1]], L = Math.hypot(v[0], v[1]) || 1;
    const P = [Math.round(p[0] + v[0] / L * 8), Math.round(p[1] + v[1] / L * 8)], Q = [Math.round(q[0] + v[0] / L * 8), Math.round(q[1] + v[1] / L * 8)];
    const pieces = wallPieces(P, Q), cost = pieces.length * WALL_COST;
    if (wallProblem(pieces, side) || !SH.canPay(side, cost, 0)) continue;
    SH.pay(side, cost, 0); addWall(P, Q, side);
    SH.logDay(side, 'wall', 'le Rideau de Laine');
    SH.radioQueue.unshift([side, side === 'ccp' ? 'Radio Miaou-Scou' : 'Radio Kutty Libre', side === 'ccp' ? 'La CCR tricote un Rempart de Laine pour protéger le peuple.' : 'L’USC tricote un Rideau de Laine le long de sa frontière.']);
    return true;
  }
  return false;
}
// une barge vers une cote libre : ilot ou autre versant
export function rivalBarge(side){
  const port = SH.BLD.find(l => l.side === side && l.type === 'port' && l.done); if (!port) return false;
  if (!SH.canAfford(side, BARGE_COST)) return false;
  let best = null, bs = -1;
  for (let k = 0; k < 60; k++){
    const i = Math.floor(rnd(k) * TER.N); if (!TER.land[i] || TER.own[i]) continue;
    const a = GA0 + (i % TER.W + .5) * TC, b = GB0 + (((i / TER.W) | 0) + .5) * TC, s = nearestShore(a, b, 90); if (!s || sideAt(s[0], s[1])) continue;
    const d = Math.hypot(s[0] - port.ca, s[1] - port.cb); if (d > 900) continue;
    const sc = rnd(k + 3) * 100 - d * .05; if (sc > bs){ bs = sc; best = s; }
  }
  if (!best) return false;
  if (!SH.sendBarge(side, SH.pierEnd(port), best, 'drapeau')) return false;
  SH.pay(side, BARGE_COST.l, BARGE_COST.r, BARGE_COST.c); return true;
}
export function rivalUpgrade(side){
  const list = SH.BLD.filter(l => l.side === side && l.done && !l.upT && SH.upCost(l));
  list.sort((x, y) => (SH.LVL_POP[y.type] ? 2 : 0) - (SH.LVL_POP[x.type] ? 2 : 0) + ((x.lvl || 1) - (y.lvl || 1)));
  for (const l of list.slice(0, 4)){ const c = SH.upCost(l); if (SH.canPay(side, c.l + 20, c.r)){ SH.upgradeBuilding(l); return true; } }
  return false;
}
export function stepRival(dt){
  if (GAME.mode !== 'play') return;
  for (const side of SIDES) if (RIVAL.auto[side]) brainStep(side, dt);
}
// une liste de souhaits, dans l'ordre : le premier qui se pose (ou qui fait tracer une route) consomme le tour
export function brainStep(side, dt){
  const B = RIVAL[side], R = SH.RES[side];
  B.acc += dt; if (B.acc < B.think) return; B.acc = 0;
  const hq = SH.BLD.find(l => l.side === side && l.type === 'qg'); if (!hq || !hq.done) return;
  const busy = SH.BLD.filter(l => l.side === side && !l.done).length, maxBusy = 2 + Math.floor(R.pop / 35);
  if (busy >= maxBusy) return;
  const has = (t) => count(side, t);
  const cnt = TER.cnt[side]; if (cnt < B.lastCnt) B.lost += B.lastCnt - cnt; B.lastCnt = cnt; B.lost *= .97;
  const wish = [];
  const food = R.short || R.rc < 3 + R.pop * .06 || R.croq < 50;
  const wool = R.rl < 8 + R.pop * .15 || R.laine < 40;
  if (food) wish.push(has('pecherie') < 3 ? 'pecherie' : null, 'kolkhoze', 'epicerie');
  if (wool) wish.push(has('bergerie') < 4 ? 'bergerie' : null, R.pop >= 20 ? 'usine' : null);
  if (R.pop < R.jobs + 8 || R.pop < 14) wish.push(side === 'ccp' && R.pop > 30 && rnd(1) < .5 ? 'immeuble' : 'maison');
  if (R.funRatio < .6 && R.pop > 8){ const L = RIVAL_FUN[side]; wish.push(L[Math.floor(rnd(2) * L.length)]); }
  if (TER.lastGain[side] < 2 && rnd(4) < .8) wish.push('drapeau');
  if (!has('port') && R.laine > 80) wish.push('port');
  if (R.laine > 150 && R.pop > 30){ const L = RIVAL_BIG[side]; wish.push(L[Math.floor(rnd(6) * L.length)]); }
  wish.push('maison');
  for (const type of wish){ if (type && rivalBuild(type, side)) return; }
  if (B.lost > 25 && GAME.t - B.lastWall > 120){ B.lastWall = GAME.t; if (rivalWall(side)){ B.lost = 0; return; } }
  if (GAME.t - B.lastBarge > 200 && rivalBarge(side)){ B.lastBarge = GAME.t; return; }
  if (R.laine > 100 && rivalUpgrade(side)) return;
  rivalRoad(side);
}
