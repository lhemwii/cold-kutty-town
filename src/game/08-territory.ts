import { SH } from './00-shared.ts';
import type { Building, Side } from './00-shared.ts';
import { GAME, SIDES, clamp, hash2, other } from './01-core.js';
import { GA0, GB0, GH, GSC, GW, T_SEA, baseAt } from './02-ground.ts';
/* ================= territoires : chaque camp etend sa couleur case par case, en direct ================= */
// une case = TC x TC unites. own : 0 personne, 1 USC, 2 CCR. Seule la terre ferme se conquiert.
/** Numero d'un camp dans les grilles : 1 USC, 2 CCR (0 : personne). */
export type Owner = 0 | 1 | 2;
export const TC = 4, SID: Record<Side, 1 | 2> = { usc: 1, ccp: 2 }, SNAME: readonly (Side | null)[] = [null, 'usc', 'ccp'];
const CAMPS: Side[] = SIDES;
/** Rectangle de cases (x0, x1, y0, y1) ou un camp possede du terrain. */
type Box = [number, number, number, number];
export interface Territory {
  /** taille de la grille en cases, et nombre de cases */
  W: number; H: number; N: number;
  /** proprietaire (0, 1, 2), terre ferme (1), verrou (camp qui tient la case) et date de conquete de chaque case */
  own: Uint8Array; land: Uint8Array; lock: Uint8Array; fresh: Float32Array;
  /** pour chaque camp, distance normalisee a sa source d'influence la plus proche (255 : hors d'atteinte) */
  tgt: Record<Side, Uint8Array>;
  cnt: Record<Side, number>; landN: number;
  ver: number; srcVer: number; acc: number; fightAcc: number;
  rate: Record<Side, number>; lastGain: Record<Side, number>; carry: Record<Side, number>;
  box: Record<Side, Box>;
}
const EMPTY8 = new Uint8Array(0);
export const TER: Territory = { W: GW / GSC / TC, H: GH / GSC / TC, N: 0, own: EMPTY8, land: EMPTY8, lock: EMPTY8, fresh: new Float32Array(0), tgt: { usc: EMPTY8, ccp: EMPTY8 },
  cnt: { usc: 0, ccp: 0 }, landN: 1, ver: 0, srcVer: -1, acc: 0, fightAcc: 0, rate: { usc: 0, ccp: 0 }, lastGain: { usc: 0, ccp: 0 }, carry: { usc: 0, ccp: 0 },
  box: { usc: [1e9, -1, 1e9, -1], ccp: [1e9, -1, 1e9, -1] } };
TER.N = TER.W * TER.H;
export const terIdx = (a: number, b: number): number => { const x = Math.floor((a - GA0) / TC), y = Math.floor((b - GB0) / TC); return (x < 0 || y < 0 || x >= TER.W || y >= TER.H) ? -1 : y * TER.W + x; };
export const ownerAt = (a: number, b: number): number => { const i = terIdx(a, b); return i < 0 ? 0 : TER.own[i]; };
export const sideAt = (a: number, b: number): Side | null => SNAME[ownerAt(a, b)] || null;
// rectangle ou chaque camp possede des cases : on n'y cherche que la (les grandes cartes ont plus d'un million de cases)
export function terGrow(side: Side, i: number): void { const x = i % TER.W, y = (i / TER.W) | 0, b = TER.box[side]; if (x < b[0]) b[0] = x; if (x > b[1]) b[1] = x; if (y < b[2]) b[2] = y; if (y > b[3]) b[3] = y; }
export function terBoxReset(): void { TER.box = { usc: [1e9, -1, 1e9, -1], ccp: [1e9, -1, 1e9, -1] }; }
export function terBoxRebuild(): void { terBoxReset(); for (let i = 0; i < TER.N; i++){ const s = SNAME[TER.own[i]]; if (s) terGrow(s, i); } }
export function initTerritory(): void {
  terBoxReset();
  // la grille suit la taille de la carte
  TER.W = Math.round(GW / GSC / TC); TER.H = Math.round(GH / GSC / TC); TER.N = TER.W * TER.H;
  TER.own = new Uint8Array(TER.N); TER.land = new Uint8Array(TER.N); TER.lock = new Uint8Array(TER.N); TER.fresh = new Float32Array(TER.N);
  TER.tgt.usc = new Uint8Array(TER.N); TER.tgt.ccp = new Uint8Array(TER.N);
  let n = 0;
  for (let y = 0; y < TER.H; y++) for (let x = 0; x < TER.W; x++){
    // une case compte comme terre si son centre et la majorite de ses coins sont a terre
    const a = GA0 + (x + .5) * TC, b = GB0 + (y + .5) * TC;
    let k = 0; for (const [da, db] of [[0, 0], [-1.5, -1.5], [1.5, -1.5], [-1.5, 1.5], [1.5, 1.5]]) if (baseAt(a + da, b + db) !== T_SEA) k++;
    if (k >= 3){ TER.land[y * TER.W + x] = 1; n++; }
  }
  TER.landN = Math.max(1, n); TER.cnt.usc = TER.cnt.ccp = 0; TER.ver++; TER.srcVer = -1;
}
// sources d'influence : chaque batiment rayonne autour de lui ; le QG rayonne d'autant plus que la ville est peuplee
export function influenceOf(l: Building): number {
  const E = SH.ECO[l.type]; if (!E) return 0;
  let r = E.rad || 0;
  if (l.type === 'qg') r += Math.min(80, Math.sqrt(SH.RES[l.side].pop || 0) * 5);
  if (E.up && (l.lvl || 1) > 1) r *= 1 + .15 * ((l.lvl || 1) - 1);
  return r;
}
// distance normalisee a la source la plus proche (0 au centre, 250 au bord du rayon, 255 hors d'atteinte)
export function rebuildTargets(): void {
  for (const s of CAMPS) TER.tgt[s].fill(255);
  for (const l of SH.BLD){
    if (!l.side || !TER.tgt[l.side]) continue;
    const r = influenceOf(l); if (r <= 0) continue;
    const T = TER.tgt[l.side];
    const x0 = Math.max(0, Math.floor((l.ca - r - GA0) / TC)), x1 = Math.min(TER.W - 1, Math.floor((l.ca + r - GA0) / TC));
    const y0 = Math.max(0, Math.floor((l.cb - r - GB0) / TC)), y1 = Math.min(TER.H - 1, Math.floor((l.cb + r - GB0) / TC));
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++){
      const i = y * TER.W + x; if (!TER.land[i]) continue;
      const d = Math.hypot(GA0 + (x + .5) * TC - l.ca, GB0 + (y + .5) * TC - l.cb) / r;
      if (d <= 1){ const v = Math.round(d * 250); if (v < T[i]) T[i] = v; }
    }
  }
  TER.srcVer = SH.TOWN_VER;
}
// verrous : sous un batiment ou pres d'un pan du Rideau de Laine, la case ne change plus de camp
export function lockCells(a0: number, a1: number, b0: number, b1: number, sid: Owner): void {
  const x0 = Math.max(0, Math.floor((a0 - GA0) / TC)), x1 = Math.min(TER.W - 1, Math.floor((a1 - GA0) / TC));
  const y0 = Math.max(0, Math.floor((b0 - GB0) / TC)), y1 = Math.min(TER.H - 1, Math.floor((b1 - GB0) / TC));
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) TER.lock[y * TER.W + x] = sid;
}
export function rebuildLocks(): void {
  TER.lock.fill(0);
  for (const l of SH.BLD) if (l.side) lockCells(l.a0, l.a1, l.b0, l.b1, SID[l.side]);
  for (const w of SH.WALLS){
    const L = Math.hypot(w.qa - w.pa, w.qb - w.pb) || 1;
    for (let s = 0; s <= L; s += TC / 2){ const a = w.pa + (w.qa - w.pa) * s / L, b = w.pb + (w.qb - w.pb) * s / L; lockCells(a - 8, a + 8, b - 8, b + 8, SID[w.side as Side]); }
  }
}
// prendre une case (debarquement, drapeau pose par barge) : on ne vole jamais une case verrouillee
export function claimCell(i: number, sid: 1 | 2, t: number): boolean {
  const o = TER.own[i]; if (o === sid || !TER.land[i]) return false;
  if (o && TER.lock[i] && TER.lock[i] !== sid) return false;
  const was = SNAME[o], now = sid === 1 ? 'usc' : 'ccp';
  if (was) TER.cnt[was]--;
  TER.own[i] = sid; TER.cnt[now]++; TER.fresh[i] = t; TER.ver++;
  terGrow(now, i);
  SH.mapDirtyCell(i);
  return true;
}
export function claimDisc(a: number, b: number, r: number, side: Side): void {
  const sid = SID[side], t = GAME.t;
  const x0 = Math.max(0, Math.floor((a - r - GA0) / TC)), x1 = Math.min(TER.W - 1, Math.floor((a + r - GA0) / TC));
  const y0 = Math.max(0, Math.floor((b - r - GB0) / TC)), y1 = Math.min(TER.H - 1, Math.floor((b + r - GB0) / TC));
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++){
    if (Math.hypot(GA0 + (x + .5) * TC - a, GB0 + (y + .5) * TC - b) > r) continue;
    const i = y * TER.W + x; if (!TER.own[i]) claimCell(i, sid, t);
  }
}
// vitesse de conquete, en cases par seconde : les ronrons font avancer la frontiere
export function claimRate(side: Side): number {
  const R = SH.RES[side]; if (!R) return 0;
  return clamp(14 + Math.max(0, R.rr) * .25 + R.pop * .05, 6, 60) * (R.short ? .45 : 1);
}
// force d'un camp sur une case disputee
export function pressureAt(side: Side, i: number): number { const d = TER.tgt[side][i]; if (d === 255) return 0; const R = SH.RES[side]; return (1 - d / 255) * (1 + clamp((R.rr || 0) / 45, 0, 1.6)) * (R.short ? .6 : 1); }
export const CAND = new Int32Array(8192), CANDD = new Uint8Array(8192);
export function stepTerritory(dt: number): void {
  if (!TER.N || !TER.own.length || GAME.mode !== 'play') return;
  if (TER.srcVer !== SH.TOWN_VER){ rebuildTargets(); rebuildLocks(); }
  TER.acc += dt; TER.fightAcc += dt;
  if (TER.acc < .25) return;
  const step = TER.acc; TER.acc = 0;
  const Wd = TER.W, own = TER.own, land = TER.land, t = GAME.t;
  for (const side of CAMPS){
    const sid = SID[side], T = TER.tgt[side];
    TER.rate[side] = claimRate(side);
    const budget = TER.rate[side] * step + TER.carry[side];
    const whole = Math.floor(budget); TER.carry[side] = budget - whole;
    if (whole <= 0) continue;
    // cases neutres a portee, collees a notre territoire ; on prend d'abord les plus proches d'une source
    let n = 0;
    const bx = TER.box[side], ya = Math.max(1, bx[2] - 1), yb = Math.min(TER.H - 2, bx[3] + 1), xa = Math.max(1, bx[0] - 1), xb = Math.min(Wd - 2, bx[1] + 1);
    for (let y = ya; y <= yb && n < 8192; y++) for (let x = xa; x <= xb; x++){
      const i = y * Wd + x;
      if (own[i] || !land[i] || T[i] === 255) continue;
      if (own[i - 1] !== sid && own[i + 1] !== sid && own[i - Wd] !== sid && own[i + Wd] !== sid) continue;
      CAND[n] = i; CANDD[n] = T[i]; n++; if (n >= 8192) break;
    }
    if (!n) continue;
    const idx = Array.from({ length: n }, (_, k) => k).sort((p, q) => (CANDD[p] - CANDD[q]) || (hash2(CAND[p], t | 0) - hash2(CAND[q], t | 0)));
    let got = 0;
    for (let k = 0; k < idx.length && got < whole; k++) if (claimCell(CAND[idx[k]], sid, t)) got++;
    TER.lastGain[side] = got;
  }
  // frontiere commune : la case passe au camp le plus fort, lentement, sauf si elle est verrouillee
  if (TER.fightAcc >= 1){
    const fstep = TER.fightAcc; TER.fightAcc = 0;
    for (const side of CAMPS){
      const foe = other(side), sid = SID[side], eid = SID[foe], T = TER.tgt[side];
      let budget = Math.floor(2.5 * fstep);
      const list: [number, number][] = [];
      // une case ennemie collee a la notre : dans notre rectangle agrandi d'une case
      const bx = TER.box[side], ya = Math.max(1, bx[2] - 1), yb = Math.min(TER.H - 2, bx[3] + 1), xa = Math.max(1, bx[0] - 1), xb = Math.min(Wd - 2, bx[1] + 1);
      for (let y = ya; y <= yb; y++) for (let x = xa; x <= xb; x++){
        const i = y * Wd + x;
        if (own[i] !== eid || T[i] === 255 || TER.lock[i]) continue;
        if (own[i - 1] !== sid && own[i + 1] !== sid && own[i - Wd] !== sid && own[i + Wd] !== sid) continue;
        const ps = pressureAt(side, i), pe = pressureAt(foe, i);
        if (ps > pe * 1.3 + .06) list.push([i, ps - pe]);
      }
      list.sort((p, q) => q[1] - p[1]);
      for (const [i] of list){ if (budget-- <= 0) break; claimCell(i, sid, t); }
    }
  }
}
export const terPct = (side: Side): number => TER.cnt[side] / TER.landN;
