import { SH, type Building, type Light } from './00-shared.ts';
import { GAME, H, HOOKS, M, UP, W, boxS, dep, drawFace, fput, hash2, line3, prj, state, vnoise } from './01-core.ts';
import { GA0, GB0, GH, GROUND_HOOKS, GSC, GW, MOUNT_T, T_SEA, cellOf, gBase, gRiv, islandF, mapScale, mountN, nearestShore, seaDAt, type Vec2 } from './02-ground.ts';
import { Lc, facadePlate, part, wallBase } from './03-buildings-base.ts';
import { TYPES } from './04-types.ts';
import { type Drawable } from './07-world.ts';
import { FOOT } from './10-town.ts';
import { WX } from './11-render.ts';
import { hoverW } from './13-ui.ts';
import { ECO, bdef } from './15-economy.ts';
import { navPath, pierEnd, type Boat } from './16-boats.ts';
import { showCard } from './27-transports.ts';
/* ================= etape 7 : le monde ================= */
// Rivieres : elles naissent dans les montagnes et descendent jusqu'a la mer (eau douce : pompage, peche, barrages ; les
// routes et les voies les franchissent par des ponts ; les bateaux remontent les plus larges). Etangs et roseaux des marais.
// Biomes : pins au nord et en montagne, palmiers au sud (07-world). L'hiver, la neige reste au sol et ralentit unites et
// chantiers. La mer : trajet de la barge affiche, bateaux qu'on choisit d'un clic, phare dont le faisceau balaie la mer.

/* ---- rivieres et etangs, creuses dans l'ile avant le calcul des distances a la cote ---- */
export const RIVERS: Vec2[][] = [];
// l'altitude : l'interieur de l'ile, et plus haut encore sous les montagnes
const elev = (a: number, b: number): number => islandF(a, b) + Math.max(0, mountN(a, b) - MOUNT_T) * 3;
function carve(a: number, b: number, r: number, bank: number){
  const ia0 = Math.max(0, Math.floor((a - r - bank - GA0) * GSC)), ia1 = Math.min(GW - 1, Math.ceil((a + r + bank - GA0) * GSC));
  const ib0 = Math.max(0, Math.floor((b - r - bank - GB0) * GSC)), ib1 = Math.min(GH - 1, Math.ceil((b + r + bank - GB0) * GSC));
  for (let ib = ib0; ib <= ib1; ib++) for (let ia = ia0; ia <= ia1; ia++){
    const d = Math.hypot(GA0 + (ia + .5) / GSC - a, GB0 + (ib + .5) / GSC - b), i = ib * GW + ia;
    if (d <= r){ gBase[i] = T_SEA; gRiv[i] = 1; } else if (d <= r + bank && gRiv[i] === 0 && gBase[i] !== T_SEA) gRiv[i] = 2;
  }
}
function walkRiver(a: number, b: number, seed: number): Vec2[] | null {
  const pts: Vec2[] = [[a, b]]; let dx = 0, dy = 0;
  for (let k = 0; k < 2500; k++){
    const h = 6, gx = elev(a + h, b) - elev(a - h, b), gy = elev(a, b + h) - elev(a, b - h), gl = Math.hypot(gx, gy) || 1;
    const ux = -gx / gl, uy = -gy / gl, mw = Math.sin(k * .085 + seed * 1.7) * .5 + (vnoise(a * .02 + seed, b * .02) - .5) * .6;
    let nx = ux + -uy * mw, ny = uy + ux * mw;
    if (k){ nx = dx * .8 + nx * .2; ny = dy * .8 + ny * .2; }
    const nl = Math.hypot(nx, ny) || 1; dx = nx / nl; dy = ny / nl;
    a += dx * 3; b += dy * 3; pts.push([a, b]);
    const i = cellOf(a, b); if (i < 0) return null;
    if (gBase[i] === T_SEA) return pts.length > 30 ? pts : null;
  }
  return null;
}
GROUND_HOOKS.push((seed: number) => {
  RIVERS.length = 0;
  // une partie sauvegardee avant les rivieres se refait sans elles (les batiments y sont poses)
  const ext = SH.LOAD_EXT;
  SH.RIVERS_ON = !(ext && !ext.rivers);
  if (!SH.RIVERS_ON) return;
  // sources : sur les pentes des montagnes, a l'interieur des terres
  const cand: [number, number, number][] = [];
  for (let b = GB0 + 40; b < GB0 + GH / GSC - 40; b += 36) for (let a = GA0 + 40; a < GA0 + GW / GSC - 40; a += 36){
    const i = cellOf(a, b); if (i < 0 || gBase[i] === T_SEA) continue;
    if (mountN(a, b) > MOUNT_T + .02 && islandF(a, b) > .3) cand.push([a, b, hash2(a + seed, b - seed)]);
  }
  cand.sort((u, v) => u[2] - v[2]);
  const want = Math.max(2, Math.round(1 + mapScale() * 2));
  for (const [a, b] of cand){
    if (RIVERS.length >= want) break;
    if (RIVERS.some(r => Math.hypot(r[0][0] - a, r[0][1] - b) < 220)) continue;
    const p = walkRiver(a, b, seed + RIVERS.length * 13);
    if (!p) continue;
    const n = p.length;
    for (let k = 0; k < n; k++){ const t = k / (n - 1); carve(p[k][0], p[k][1], 2 + t * 4.5, 7); }
    RIVERS.push(p);
  }
  // marais : des etangs groupes dans les basses terres
  let marsh = 0;
  for (let k = 0; k < 400 && marsh < Math.round(2 * mapScale()); k++){
    const a = GA0 + 60 + hash2(k * 3 + seed, 17) * (GW / GSC - 120), b = GB0 + 60 + hash2(k * 7, seed + 5) * (GH / GSC - 120);
    const f = islandF(a, b), i = cellOf(a, b); if (i < 0 || gBase[i] === T_SEA || gRiv[i]) continue;
    if (f < .12 || f > .3 || mountN(a, b) > MOUNT_T - .1) continue;
    for (let j = 0; j < 7; j++){ const pa = a + (hash2(j, k + seed) - .5) * 50, pb = b + (hash2(k, j + seed) - .5) * 36, ci = cellOf(pa, pb); if (ci >= 0 && gBase[ci] !== T_SEA) carve(pa, pb, 2 + hash2(j + 3, k) * 3, 6); }
    marsh++;
  }
});
export const riverAt = (a: number, b: number): boolean => { const i = cellOf(a, b); return i >= 0 && gRiv[i] === 1; };
SH.riverAt = riverAt;
// les bateaux passent au milieu des rivieres assez larges
SH.riverNav = (a: number, b: number): boolean => { const i = cellOf(a, b); return i >= 0 && gRiv[i] === 1 && seaDAt(a, b) >= 6; };
HOOKS.save.push((ext) => { if (SH.RIVERS_ON) ext.rivers = 1; });

/* ---- la neige d'hiver : elle reste au sol, ralentit les unites a pied et les chantiers ---- */
// la couche au sol suit la plus forte neige de l'hiver (jusqu'aux trois quarts), et fond au printemps
let snowMax = 0;
HOOKS.step.push((dt: number) => {
  if (GAME.mode !== 'play') return;
  const winter = SH.seasonOf && SH.seasonOf(SH.CAL.m) === 'hiver';
  snowMax = winter ? Math.max(snowMax, Math.min(.75, WX.snow)) : 0;
  SH.snowFloor = snowMax;
  if (dt > 0 && WX.snow > .05){
    const k = dt * .5 * WX.snow;
    for (const l of SH.BLD as Building[]){ if (!l.done) l.buildT += k; else if (l.upT) l.upT += k; }
  }
});
SH.groundSlow = (_a: number, _b: number, domain: string): number => domain === 'terre' ? 1 - .45 * WX.snow : 1;
HOOKS.reset.push(() => { snowMax = 0; SH.snowFloor = 0; });

/* ---- au bord des rivieres : barrage et ponton de peche ---- */
const nearRiver = (ca: number, cb: number, r: number): boolean => { for (let k = 0; k < 16; k++){ const an = k * Math.PI / 8; for (let d = 4; d <= r; d += 4) if (riverAt(ca + Math.cos(an) * d, cb + Math.sin(an) * d)) return true; } return false; };
TYPES.barrage = { name: 'Barrage', nameCCP: 'Barrage du Plan', fem: false, build(lot: Building, seed: number){
  const ccp = lot.side === 'ccp', a0 = lot.ca - 13, a1 = lot.ca + 13, b0 = lot.cb - 5, b1 = lot.cb + 5, hh = 9;
  const body = (t: number) => {
    SH.CUR = M.CONCRETE;
    boxS(a0, a1, b0, b1, 0, hh, (u: number, h: number, x: number, y: number, k: number) => (h > hh - 1 ? 1 : (u % 5) < .6 ? 1 : wallBase(k, x, y)), 1);
    // le deversoir : l'eau qui tombe en avant
    SH.CUR = M.FOAM;
    for (let k = -2; k <= 2; k++){ const pa = lot.ca + k * 3; for (let z = 0; z < hh - 1; z += 1.5) if (((z * 2 + t * 8 + k) | 0) & 1){ const p = prj(pa, b1 + .3, z); fput(Math.round(p[0]), Math.round(p[1]), 1); } }
    SH.CUR = ccp ? M.CCP2 : M.METAL; line3(a0, b1, hh + .2, a1, b1, hh + .2, 1); line3(a0, b0, hh + .2, a1, b0, hh + .2, 1);
  };
  const house = () => { SH.CUR = ccp ? M.CONCRETE : M.BRICK; boxS(a1 - 6, a1 - 1, b0 - 5, b0, hh, hh + 4, (u: number, h: number) => (h > 1 && h < 2.6 && (u % 2.5) > 1) ? 3 : 0, 1); };
  void seed;
  return { parts: [part(lot.ca, lot.cb, 0, body), part(a1 - 3, b0 - 3, .4, house), part(lot.ca, lot.cb, .6, () => facadePlate(ccp ? 'GES' : 'DAM', lot.ca, b1, b0, hh - 2))], lights: [Lc(lot.ca, b1 + 4, 10, 1)] };
} };
ECO.barrage = bdef('industrie', 70, { costR: 20, elec: 16, jobs: 3, rad: 40, desc: 'Au bord d’une rivière : beaucoup d’électricité, sans charbon.' });
FOOT.barrage = [30, 16];
TYPES.ponton = { name: 'Ponton de pêche', nameCCP: 'Ponton du kolkhoze', fem: false, build(lot: Building, seed: number){
  const a0 = lot.ca - 9, a1 = lot.ca + 9, b0 = lot.cb - 4, b1 = lot.cb + 4;
  const body = (t: number) => {
    SH.CUR = M.PIER; drawFace([a0, b0, 1, a1, b0, 1, a1, b1, 1, a0, b1, 1], UP, (x: number) => (x & 1) ? 1 : 0, 1);
    for (const pa of [a0 + 1, a1 - 1]) for (const pb of [b0 + 1, b1 - 1]) line3(pa, pb, -1, pa, pb, 1, 0);
    SH.CUR = lot.side === 'ccp' ? M.CCP3 : M.USC3; boxS(a0 + 1, a0 + 6, b0 + 1, b1 - 1, 1, 5, (u: number, h: number) => (h > 1.5 && h < 3 && u > 1 && u < 3) ? 3 : 0, 1);
    // un chat qui peche au bout, sa canne qui bouge
    const p = prj(a1 - 2, lot.cb, 1), x = Math.round(p[0]), y = Math.round(p[1]);
    SH.CUR = M.CAT_OR; fput(x, y - 1, 1); fput(x, y - 2, 1); fput(x + 1, y - 2, 0); fput(x, y - 3, 1);
    SH.CUR = M.PIER; const w = Math.round(Math.sin(t * 2 + seed) * 1); for (let k = 1; k < 6; k++) fput(x + k, y - 3 - k + (k > 3 ? w : 0), 0);
  };
  return { parts: [part(lot.ca, lot.cb, 0, body)], lights: [] };
} };
ECO.ponton = bdef('nourriture', 20, { c: 6, l: -.2, jobs: 2, rad: 30, noRoad: true, desc: 'Au bord d’une rivière ou d’un étang : des croquettes de poisson d’eau douce.' });
FOOT.ponton = [20, 10];
HOOKS.place.push((type: string, _side, ca: number, cb: number): string => {
  if (type === 'barrage' && !nearRiver(ca, cb, 16)) return 'Le barrage se pose au bord d’une rivière.';
  if (type === 'ponton' && !nearRiver(ca, cb, 14)) return 'Le ponton se pose au bord d’une rivière ou d’un étang.';
  return '';
});

/* ---- la barge : le trajet en mer s'affiche avant de choisir la cote ---- */
let routeKey = '', route: Vec2[] | null = null;
HOOKS.top.push((t: number) => {
  if (state.tool !== 'barge' || !hoverW || !state.bargeFrom) { routeKey = ''; return; }
  const s = nearestShore(hoverW[0], hoverW[1], 60); if (!s) return;
  const from = pierEnd(state.bargeFrom), key = Math.round(s[0] / 8) + ':' + Math.round(s[1] / 8);
  if (key !== routeKey){ routeKey = key; route = navPath(from[0], from[1], s[0], s[1]); }
  if (!route) return;
  SH.CUR = M.BEAM;
  let prev: Vec2 = from;
  for (const p of route){ const L = Math.hypot(p[0] - prev[0], p[1] - prev[1]); for (let d = 0; d < L; d += 5){ if (((d / 5 + t * 4) | 0) % 3 === 0) continue; const q = prj(prev[0] + (p[0] - prev[0]) * d / L, prev[1] + (p[1] - prev[1]) * d / L, 0); fput(Math.round(q[0]), Math.round(q[1]), 1); fput(Math.round(q[0]) + 1, Math.round(q[1]), 1); } prev = p; }
});

/* ---- un bateau se choisit d'un clic : sa fiche ---- */
const BOAT_NAME: Record<string, string> = { barge: 'Barge de débarquement', peche: 'Chalutier', cargo: 'Cargo' };
const LEG_NAME: Record<string, string> = { out: 'part en mer', fish: 'pêche', back: 'rentre au port', dock: 'à quai' };
function boatCard(b: Boat){
  const home = (SH.BLD as Building[]).find(l => l.id === b.home);
  const st = b.kind === 'barge' ? (b.state === 'landed' ? 'a accosté' : 'en route vers la côte') : (LEG_NAME[b.leg || 'dock'] || 'en mer');
  showCard(BOAT_NAME[b.kind] || 'Bateau', (b.side === GAME.side ? 'À toi' : 'À l’autre camp') + ', ' + st + (home ? '. Port : ' + (home.name || (TYPES[home.type] ? TYPES[home.type].name : home.type)) : '') + '.', []);
}
const prevUnitClick = SH.unitClick;
SH.unitClick = (a: number, b: number, lx: number, ly: number, shift: boolean): boolean => {
  if (typeof prevUnitClick === 'function' && prevUnitClick(a, b, lx, ly, shift)) return true;
  let best: Boat | null = null, bd = 12;
  for (const bt of SH.BOATS as Boat[]){ if (bt.state === 'gone') continue; const d = Math.hypot(bt.a - a, bt.b - b); if (d < bd){ bd = d; best = bt; } }
  if (best){ boatCard(best); SH.sfx('click'); return true; }
  return false;
};

/* ---- le phare : son faisceau balaie la mer la nuit ---- */
SH.dynLights = (L: Light[], t: number) => {
  for (const l of SH.BLD as Building[]){
    if (l.type !== 'phare' || !l.done) continue;
    const an = t * .9 + l.id * 1.3;
    L.push({ kind: 'cone', a: l.ca, b: l.cb, da: Math.cos(an), db: Math.sin(an), tan: .14, w0: 2, len: 150, k: 1.3, att: .55, m: M.BEAM });
  }
};

/* ---- l'ecume autour des pontons et des coques a l'arret ---- */
HOOKS.dyn.push((t: number, out: Drawable[]) => {
  if (GAME.mode !== 'play') return;
  for (const l of SH.BLD as Building[]){
    if (!l.done || (l.type !== 'port' && l.type !== 'pecherie')) continue;
    const e = pierEnd(l), q = prj(e[0], e[1], 0); if (q[0] < -20 || q[0] > W + 20 || q[1] < -20 || q[1] > H + 20) continue;
    out.push({ d: dep(e[0], e[1]) - 3, a: e[0], b: e[1], f: (tt: number) => foamRing(e[0], e[1], 6, tt, l.id) });
  }
  for (const b of SH.BOATS as Boat[]){
    if (b.state !== 'wait' && b.state !== 'landed') continue;
    out.push({ d: dep(b.a, b.b) - 3, a: b.a, b: b.b, side: b.side, f: (tt: number) => foamRing(b.a, b.b, b.kind === 'cargo' ? 16 : 8, tt, b.id) });
  }
});
function foamRing(a: number, b: number, r: number, t: number, seed: number){
  SH.CUR = M.FOAM;
  const n = Math.round(r * 2.4);
  for (let k = 0; k < n; k++){
    if (((k + (t * 3 + seed) | 0) % 4) === 0) continue;
    const an = k / n * Math.PI * 2, rr = r + Math.sin(t * 2 + k) * .8, p = prj(a + Math.cos(an) * rr, b + Math.sin(an) * rr * .9, 0);
    fput(Math.round(p[0]), Math.round(p[1]), (k & 1) ? 1 : 0);
  }
}
