import { SH } from './00-shared.ts';
import type { Building, Side } from './00-shared.ts';
import type { Vec2 } from './02-ground.ts';
import type { Drawable } from './07-world.ts';
import { GAME, H, HOOKS, M, TAU, W, clamp, dep, fput, hash2, line3, prj } from './01-core.ts';
import { GA0, GB0, GH, GSC, GW, islandNear, seaDAt } from './02-ground.ts';
import { PED_FUR, bobZ, drawHull, pennant, rbox, rot2 } from './03-buildings-base.ts';
import { DIR_ANG, DIR_V, drawCargo } from './06-types-more.ts';
import { claimDisc } from './08-territory.ts';
import { findSpot, makeBuilding } from './10-town.ts';
import { worldToScreen } from './11-render.ts';
import { $, toast } from './13-ui.ts';
/* ================= en mer : barges de debarquement, chalutiers, cargos ================= */
// grille de navigation : une case = 8 unites, un peu plus grande que l'ile pour arriver du large
export const NS = 8, NAV: { A0: number; B0: number; W: number; H: number; ok: Uint8Array } = { A0: GA0 - 160, B0: GB0 - 160, W: Math.ceil((GW / GSC + 320) / NS), H: Math.ceil((GH / GSC + 320) / NS), ok: new Uint8Array(0) };
export function buildNav(): void {
  // la grille suit la taille de la carte, avec une marge de mer tout autour
  NAV.A0 = GA0 - 160; NAV.B0 = GB0 - 160; NAV.W = Math.ceil((GW / GSC + 320) / NS); NAV.H = Math.ceil((GH / GSC + 320) / NS);
  NAV.ok = new Uint8Array(NAV.W * NAV.H);
  for (let y = 0; y < NAV.H; y++) for (let x = 0; x < NAV.W; x++){
    const a = NAV.A0 + (x + .5) * NS, b = NAV.B0 + (y + .5) * NS;
    NAV.ok[y * NAV.W + x] = (seaDAt(a, b) >= 9 && seaDAt(a - 3, b - 3) >= 4 && seaDAt(a + 3, b + 3) >= 4 && seaDAt(a - 3, b + 3) >= 4 && seaDAt(a + 3, b - 3) >= 4) || (SH.riverNav && SH.riverNav(a, b)) ? 1 : 0;
  }
}
export const navIdx = (a: number, b: number): number => { const x = Math.floor((a - NAV.A0) / NS), y = Math.floor((b - NAV.B0) / NS); return (x < 0 || y < 0 || x >= NAV.W || y >= NAV.H) ? -1 : y * NAV.W + x; };
export const navPt = (i: number): Vec2 => [NAV.A0 + (i % NAV.W + .5) * NS, NAV.B0 + (((i / NAV.W) | 0) + .5) * NS];
// case navigable la plus proche d'un point
export function navNear(a: number, b: number, maxR?: number): number {
  const i0 = navIdx(a, b); if (i0 >= 0 && NAV.ok[i0]) return i0;
  let best = -1, bd = 1e9;
  for (let r = 1; r <= (maxR || 12); r++){
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++){
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
      const i = navIdx(a + dx * NS, b + dy * NS); if (i < 0 || !NAV.ok[i]) continue;
      const p = navPt(i), d = Math.hypot(p[0] - a, p[1] - b); if (d < bd){ bd = d; best = i; }
    }
    if (best >= 0) return best;
  }
  return -1;
}
// A* sur la grille, puis on tire des droites quand la mer est libre
export function navPath(a0: number, b0: number, a1: number, b1: number): Vec2[] | null {
  const s = navNear(a0, b0, 14), g = navNear(a1, b1, 14); if (s < 0 || g < 0) return null;
  const Wn = NAV.W, n = Wn * NAV.H, G = new Float32Array(n).fill(1e9), from = new Int32Array(n).fill(-1), closed = new Uint8Array(n);
  const heap: [number, number][] = [], push = (i: number, f: number): void => { heap.push([f, i]); let k = heap.length - 1; while (k > 0){ const p = (k - 1) >> 1; if (heap[p][0] <= heap[k][0]) break; [heap[p], heap[k]] = [heap[k], heap[p]]; k = p; } };
  const pop = (): [number, number] => { const top = heap[0], last = heap.pop() as [number, number]; if (heap.length){ heap[0] = last; let k = 0; for (;;){ const l = k * 2 + 1, r = l + 1; let m = k; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === k) break; [heap[m], heap[k]] = [heap[k], heap[m]]; k = m; } } return top; };
  const gx = g % Wn, gy = (g / Wn) | 0, hh = (i: number): number => { const dx = Math.abs(i % Wn - gx), dy = Math.abs(((i / Wn) | 0) - gy); return Math.max(dx, dy) + .414 * Math.min(dx, dy); };
  G[s] = 0; push(s, hh(s));
  let guard = 0;
  while (heap.length && guard++ < 60000){
    const [, i] = pop(); if (closed[i]) continue; closed[i] = 1;
    if (i === g) break;
    const x = i % Wn, y = (i / Wn) | 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++){
      if (!dx && !dy) continue;
      const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= Wn || ny >= NAV.H) continue;
      const j = ny * Wn + nx; if (!NAV.ok[j] || closed[j]) continue;
      if (dx && dy && (!NAV.ok[y * Wn + nx] || !NAV.ok[ny * Wn + x])) continue;
      const ng = G[i] + (dx && dy ? 1.414 : 1);
      if (ng < G[j]){ G[j] = ng; from[j] = i; push(j, ng + hh(j)); }
    }
  }
  if (from[g] < 0 && g !== s) return null;
  const cells: number[] = []; for (let i = g; i >= 0; i = from[i]){ cells.push(i); if (i === s) break; }
  cells.reverse();
  const pts = cells.map(navPt);
  // lissage : on saute les points tant que la ligne droite reste en mer
  const clear = (p: Vec2, q: Vec2): boolean => { const L = Math.hypot(q[0] - p[0], q[1] - p[1]), k = Math.ceil(L / 4); for (let j = 1; j < k; j++){ const i = navIdx(p[0] + (q[0] - p[0]) * j / k, p[1] + (q[1] - p[1]) * j / k); if (i < 0 || !NAV.ok[i]) return false; } return true; };
  const out: Vec2[] = [[a0, b0]]; let cur: Vec2 = [a0, b0], k = 0;
  while (k < pts.length){ let far = k; for (let j = pts.length - 1; j > k; j--) if (clear(cur, pts[j])){ far = j; break; } cur = pts[far]; out.push(cur); k = far + 1; }
  out.push([a1, b1]);
  return out;
}
// point de la mer au large, dans la direction d'un point de la cote
export function offshoreFrom(a: number, b: number): Vec2 {
  // vers le large, a partir du centre de l'ile la plus proche
  const it = islandNear(a, b), d = Math.hypot(a - it.ca, b - it.cb) || 1, ua = (a - it.ca) / d, ub = (b - it.cb) / d;
  let pa = a, pb = b;
  for (let k = 0; k < 200; k++){ pa += ua * 8; pb += ub * 8; if (pa < NAV.A0 + 12 || pb < NAV.B0 + 12 || pa > NAV.A0 + NAV.W * NS - 12 || pb > NAV.B0 + NAV.H * NS - 12) break; }
  return [pa, pb];
}

/* ---- les bateaux ---- */
export type BoatKind = 'barge' | 'peche' | 'cargo';
/**
 * Un bateau : sa route (path, point suivant pi), sa vitesse, son etat (en route, a l'arret, accoste, parti).
 * Barge : la cote ou elle accoste (shore) et ce qu'elle debarque (what). Chalutier et cargo : leur port (home) et l'etape du voyage (leg).
 */
export interface Boat {
  id: number; kind: BoatKind; side: Side;
  a: number; b: number; ang: number;
  path: Vec2[]; pi: number; v: number;
  state: 'go' | 'wait' | 'landed' | 'gone'; wait: number; t0?: number;
  home?: number; leg?: 'out' | 'fish' | 'back' | 'dock';
  shore?: Vec2; what?: string; landT?: number;
  onArrive: ((b: Boat, fromWait: boolean) => void) | null;
}
/** L'equipage d'une barge qui marche jusqu'au rivage. */
export interface Crew { side: Side; a0: number; b0: number; a1: number; b1: number; t0: number }
SH.BOATS = []; export let BOAT_ID = 1;
export const BOAT_SPEED: Record<BoatKind, number> = { barge: 20, peche: 16, cargo: 12 };
export function launchBoat(kind: BoatKind, side: Side, from: Vec2, to: Vec2, opts?: Partial<Boat>): Boat | null {
  const path = navPath(from[0], from[1], to[0], to[1]); if (!path) return null;
  const b: Boat = Object.assign({ onArrive: null } as Pick<Boat, 'onArrive'>, { id: BOAT_ID++, kind, side, a: from[0], b: from[1], ang: 0, path, pi: 1, v: BOAT_SPEED[kind] || 16, state: 'go' as const, wait: 0, t0: GAME.t }, opts || {});
  b.ang = Math.atan2(path[1][1] - path[0][1], path[1][0] - path[0][0]);
  SH.BOATS.push(b);
  return b;
}
export function stepBoats(dt: number): void {
  for (const b of SH.BOATS){
    if (b.state === 'landed'){ if (GAME.t - (b.landT || 0) > 9) b.state = 'gone'; continue; }
    if (b.state === 'wait'){ b.wait -= dt; if (b.wait <= 0) boatArrived(b, true); continue; }
    if (b.state !== 'go') continue;
    let step = b.v * dt;
    while (step > 0 && b.pi < b.path.length){
      const [qa, qb] = b.path[b.pi], da = qa - b.a, db = qb - b.b, d = Math.hypot(da, db);
      if (d <= step){ b.a = qa; b.b = qb; step -= d; b.pi++; }
      else { b.a += da / d * step; b.b += db / d * step; step = 0; }
      if (d > .01){ const ta = Math.atan2(db, da); let dd = ta - b.ang; while (dd > Math.PI) dd -= TAU; while (dd < -Math.PI) dd += TAU; b.ang += dd * Math.min(1, dt * 3); }
    }
    if (b.pi >= b.path.length) boatArrived(b, false);
  }
  SH.BOATS = SH.BOATS.filter(b => b.state !== 'gone');
}
export function boatArrived(b: Boat, fromWait: boolean): void {
  if (b.onArrive) b.onArrive(b, fromWait);
  else b.state = 'gone';
}
// chalutiers et cargos : un aller-retour sans fin depuis leur port
export function tripOut(b: Boat): void {
  const home = SH.BLD.find(l => l.id === b.home); if (!home || !home.done){ b.state = 'gone'; return; }
  const dock = pierEnd(home);
  let spot: Vec2 | null = null;
  for (let k = 0; k < 20 && !spot; k++){
    const ang = hash2(b.id * 7 + k, GAME.t | 0) * TAU, r = b.kind === 'cargo' ? 900 : 90 + hash2(k, b.id) * 140;
    const pa = dock[0] + Math.cos(ang) * r, pb = dock[1] + Math.sin(ang) * r, i = navIdx(pa, pb);
    if (b.kind === 'cargo'){ spot = offshoreFrom(dock[0] + Math.cos(ang) * 40, dock[1] + Math.sin(ang) * 40); break; }
    if (i >= 0 && NAV.ok[i] && seaDAt(pa, pb) > 30) spot = [pa, pb];
  }
  if (!spot){ b.state = 'gone'; return; }
  const path = navPath(b.a, b.b, spot[0], spot[1]); if (!path){ b.state = 'gone'; return; }
  b.path = path; b.pi = 1; b.state = 'go'; b.leg = 'out';
}
export function tripBack(b: Boat): void {
  const home = SH.BLD.find(l => l.id === b.home); if (!home || !home.done){ b.state = 'gone'; return; }
  const dock = pierEnd(home), path = navPath(b.a, b.b, dock[0], dock[1]); if (!path){ b.state = 'gone'; return; }
  b.path = path; b.pi = 1; b.state = 'go'; b.leg = 'back';
}
export function workBoatArrive(b: Boat): void {
  if (b.leg === 'out'){ b.state = 'wait'; b.wait = b.kind === 'cargo' ? 4 : 10 + hash2(b.id, GAME.t | 0) * 8; b.leg = 'fish'; return; }
  if (b.leg === 'fish'){ tripBack(b); return; }
  // retour au port : la peche ou la cargaison rapporte un petit plus
  const R = SH.RES[b.side];
  if (b.kind === 'cargo'){ R.laine += 30; if (b.side === GAME.side) floatText(b.a, b.b, '+30 laine'); }
  else { R.croq += 6; if (b.side === GAME.side && SH.Z >= SH.KMIN) floatText(b.a, b.b, '+6 croquettes'); }
  b.state = 'wait'; b.wait = 6; b.leg = 'dock';
  b.onArrive = (bb) => { bb.onArrive = workBoatArrive; tripOut(bb); };
}
// bout du ponton d'un batiment de la cote
export function pierEnd(l: Building): Vec2 { const v = DIR_V[l.dir || 0], L = l.type === 'port' ? (l.lvl >= 2 ? 58 : 48) : 38; return [l.ca + v[0] * L, l.cb + v[1] * L]; }
// chaque port et chaque pecherie arme ses bateaux selon son niveau
export function boatsForBuilding(l: Building): void {
  if (!NAV.ok.length || (l.type !== 'port' && l.type !== 'pecherie')) return;
  const lv = l.lvl || 1, want = l.type === 'pecherie' ? lv : Math.max(0, lv - 1), have = SH.BOATS.filter(b => b.home === l.id && b.kind === 'peche').length;
  for (let k = have; k < want; k++){
    const d = pierEnd(l), b: Boat = { id: BOAT_ID++, kind: 'peche', side: l.side, home: l.id, a: d[0], b: d[1], ang: DIR_ANG[l.dir || 0], path: [d], pi: 1, v: BOAT_SPEED.peche, state: 'wait', wait: 3 + k * 5, leg: 'dock', onArrive: null };
    b.onArrive = (bb) => { bb.onArrive = workBoatArrive; tripOut(bb); };
    SH.BOATS.push(b);
  }
  if (l.type === 'port' && lv === 3 && !SH.BOATS.some(b => b.home === l.id && b.kind === 'cargo')){
    const d = pierEnd(l), b: Boat = { id: BOAT_ID++, kind: 'cargo', side: l.side, home: l.id, a: d[0], b: d[1], ang: DIR_ANG[l.dir || 0], path: [d], pi: 1, v: BOAT_SPEED.cargo, state: 'wait', wait: 8, leg: 'dock', onArrive: null };
    b.onArrive = (bb) => { bb.onArrive = workBoatArrive; tripOut(bb); };
    SH.BOATS.push(b);
  }
}
// barge : elle accoste, l'equipage debarque et pose un avant-poste (ou le QG au tout debut)
export function sendBarge(side: Side, from: Vec2, shore: Vec2, what?: string): Boat | null {
  const sea = navPt(navNear(shore[0], shore[1], 14) >= 0 ? navNear(shore[0], shore[1], 14) : 0);
  const b = launchBoat('barge', side, from, sea, { shore, what: what || 'drapeau' });
  if (!b) return null;
  b.onArrive = (bb) => { bb.state = 'landed'; bb.landT = GAME.t; landCrew(bb); };
  return b;
}
export const CREWS: Crew[] = [];
export function landCrew(b: Boat): void {
  if (!b.shore) return;
  const [pa, pb] = b.shore;
  CREWS.push({ side: b.side, a0: b.a, b0: b.b, a1: pa, b1: pb, t0: GAME.t });
  if (b.what === 'qg') SH.landHQ(b.side, pa, pb);
  else {
    const spot = findSpot('drapeau', b.side, pa, pb, 40, true);
    claimDisc(pa, pb, 14, b.side);
    if (spot){ const l = makeBuilding('drapeau', b.side, spot[0], spot[1], 0); SH.startBuilding(l); claimDisc(spot[0], spot[1], 18, b.side); }
    if (b.side === GAME.side){ toast('La barge a accosté : l’équipage plante un avant-poste.'); SH.sfx('build', pa, pb); }
    SH.logDay(b.side, 'barge', 'une barge accoste sur une nouvelle côte');
  }
}

/* ---- dessin des bateaux ---- */
export function drawBarge(b: Boat, t: number): void {
  const z = bobZ(t, b.id);
  drawHull(b.a, b.b, b.ang, 16, 7, z, 2.5 + z, M.MILITARY, M.MILITARY, M.HULL);
  SH.CUR = M.MILITARY; rbox(b.a, b.b, b.ang, -7, -3, -2.5, 2.5, 2.5 + z, 5 + z, 1, 1);
  // l'equipage a bord tant qu'on n'a pas accoste
  if (b.state !== 'landed') for (let k = 0; k < 4; k++){ const p = rot2(b.a, b.b, b.ang, -1 + k * 2.2, (k & 1) ? 1.2 : -1.2), q = prj(p[0], p[1], 2.5 + z); SH.CUR = PED_FUR[k]; fput(Math.round(q[0]), Math.round(q[1]) - 1, 1); fput(Math.round(q[0]), Math.round(q[1]) - 2, 1); }
  const fp = rot2(b.a, b.b, b.ang, -6, 0); SH.CUR = M.METAL; line3(fp[0], fp[1], 5 + z, fp[0], fp[1], 11 + z, 1);
  const q = prj(fp[0], fp[1], 11 + z); pennant(Math.round(q[0]), Math.round(q[1]), b.side, t, b.id);
  if (b.state === 'go') wake(b, t, 10);
}
export function drawFishing(b: Boat, t: number): void {
  const z = bobZ(t, b.id);
  drawHull(b.a, b.b, b.ang, 12, 5, z, 2.2 + z, b.side === 'usc' ? M.USC3 : M.CCP2, M.PIER, M.HULL);
  SH.CUR = M.NEUTRAL; rbox(b.a, b.b, b.ang, -4.5, -1, -1.8, 1.8, 2.2 + z, 5 + z, (u: number, h: number) => (h > .8 && h < 1.8) ? 3 : 1, 1);
  const mp = rot2(b.a, b.b, b.ang, 2, 0); SH.CUR = M.METAL; line3(mp[0], mp[1], 2.2 + z, mp[0], mp[1], 10 + z, 1);
  const tip = rot2(b.a, b.b, b.ang, 6, 0); line3(mp[0], mp[1], 9 + z, tip[0], tip[1], 3 + z, 1);
  if (b.state === 'wait' && b.leg === 'fish'){ SH.CUR = M.FOAM; const p = prj(tip[0], tip[1], 0); for (let k = -3; k <= 3; k++) if ((k + ((t * 4) | 0)) & 1) fput(Math.round(p[0]) + k, Math.round(p[1]), 1); }
  const q = prj(mp[0], mp[1], 10 + z); pennant(Math.round(q[0]), Math.round(q[1]), b.side, t, b.id);
  if (b.state === 'go') wake(b, t, 7);
}
export function wake(b: Boat, t: number, n: number): void {
  SH.CUR = M.FOAM;
  for (let k = 0; k < n; k++){ const p = rot2(b.a, b.b, b.ang, -8 - k * 1.2, (hash2(k, (t * 6) | 0) - .5) * (2 + k * .3)), r = prj(p[0], p[1], 0); fput(Math.round(r[0]), Math.round(r[1]), 1); }
}
// equipage qui marche de la barge jusqu'au rivage
export function drawCrew(c: Crew, t: number): void {
  const e = (GAME.t - c.t0) / 5;
  for (let k = 0; k < 5; k++){
    const f = clamp(e - k * .12, 0, 1), a = c.a0 + (c.a1 - c.a0) * f + (k - 2) * 1.8, b = c.b0 + (c.b1 - c.b0) * f + ((k & 1) ? 1.5 : -1.5);
    const q = prj(a, b, 0), x = Math.round(q[0]), y = Math.round(q[1]), fr = Math.floor(t * 7 + k) & 1;
    SH.CUR = PED_FUR[k];
    for (const [px, py] of [[0, -3], [1, -3], [0, -2], [1, -2], [-1, -2], fr ? [-1, -1] : [1, -1]]) fput(x + px, y + py, 1);
  }
}
HOOKS.dyn.push((t: number, list: object[]) => {
  const out = list as Drawable[];
  for (const b of SH.BOATS){
    if (b.state === 'gone') continue;
    const q = prj(b.a, b.b, 0); if (q[0] < -60 || q[0] > W + 60 || q[1] < -40 || q[1] > H + 40) continue;
    const f = b.kind === 'barge' ? () => drawBarge(b, t) : b.kind === 'cargo' ? () => drawCargo({ a: b.a, b: b.b, ang: b.ang, L: 40, W: 9, seed: b.id % 5, side: b.side }, t) : () => drawFishing(b, t);
    out.push({ d: dep(b.a, b.b), f, a: b.a, b: b.b, big: true, side: b.side });
  }
  for (let k = CREWS.length - 1; k >= 0; k--){ const c = CREWS[k]; if (GAME.t - c.t0 > 7){ CREWS.splice(k, 1); continue; } out.push({ d: dep(c.a1, c.b1) + 1, a: c.a1, b: c.b1, f: () => drawCrew(c, t) }); }
});
// petits textes qui montent (+6 croquettes)
export const FLOATS: { a: number; b: number; txt: string; t0: number }[] = [];
export function floatText(a: number, b: number, txt: string): void { FLOATS.push({ a, b, txt, t0: performance.now() }); }
HOOKS.after.push(() => {
  const el = $('floats'); if (!el) return;
  const now2 = performance.now();
  while (FLOATS.length && now2 - FLOATS[0].t0 > 1800) FLOATS.shift();
  if (el.childElementCount !== FLOATS.length){ el.textContent = ''; for (const f of FLOATS){ const s = document.createElement('span'); s.textContent = f.txt; el.appendChild(s); } }
  FLOATS.forEach((f, k) => { const s = el.children[k] as HTMLElement; const [x, y] = worldToScreen(f.a, f.b), e = (now2 - f.t0) / 1800; s.style.transform = 'translate(' + Math.round(x) + 'px,' + Math.round(y - 20 - e * 30) + 'px) translate(-50%,-100%)'; s.style.opacity = String(1 - e * e); });
});

// appeles depuis des modules plus petits en numero
Object.assign(SH, { pierEnd, boatsForBuilding, sendBarge, floatText });
