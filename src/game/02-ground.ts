import { M, TAU, clamp, hash2, vnoise } from './01-core.js';
/* ================= l'ile : tiree au sort a chaque partie, vide, avec forets, plages, rochers et ilots ================= */
// (a, b) : axes du monde au sol, en unites. L'ile est centree sur (0, 0).
export const IS = { ca: 0, cb: 0, ra: 660, rb: 430 };
/** Un point du sol (a, b), en unites du monde. */
export type Vec2 = [number, number];
export const T_SEA = 0, T_GRASS = 1, T_BEACH = 2, T_ROAD = 3, T_WALK = 4, T_PATH = 5, T_PIER = 6, T_ROCK = 7, T_FOREST = 8, T_DIRT = 9, T_QUAY = 10;
export const TYPE_MAT = [M.SEA, M.GRASS, M.BEACH, M.ROAD, M.WALK, M.GRAVEL, M.PIER, M.ROCK, M.FOREST, M.DIRT, M.CONCRETE];
// tailles de carte : etendue du monde en unites (centree sur 0, 0) et finesse du sol (cases par unite). Au-dela de « grande »,
// une case par unite au lieu de deux, pour tenir en memoire. Moyenne : la carte d'origine.
export type MapSizeKey = 'petite' | 'moyenne' | 'grande' | 'tresgrande' | 'enorme' | 'immense';
export interface MapSize { w: number; h: number; gsc: 1 | 2; name: string }
export const MAP_SIZES: Record<MapSizeKey, MapSize> = {
  petite: { w: 1104, h: 744, gsc: 2, name: 'Petite' },
  moyenne: { w: 1600, h: 1080, gsc: 2, name: 'Moyenne' },
  grande: { w: 2200, h: 1480, gsc: 2, name: 'Grande' },
  tresgrande: { w: 3000, h: 2024, gsc: 1, name: 'Très grande' },
  enorme: { w: 4200, h: 2832, gsc: 1, name: 'Très, très grande' },
  immense: { w: 5400, h: 3640, gsc: 1, name: 'Immense' }
};
// configurations : la forme du monde
export type MapConf = 'une' | 'deux' | 'quatre' | 'archipel' | 'atoll';
export const MAP_CONFS: Record<MapConf, string> = { une: 'Une île', deux: 'Deux îles', quatre: 'Quatre îles', archipel: 'Archipel', atoll: 'Atoll' };
// ce qui vient d'une sauvegarde ou de l'interface est une simple chaine : on verifie avant de s'en servir
export const isMapSize = (k: unknown): k is MapSizeKey => typeof k === 'string' && k in MAP_SIZES;
export const isMapConf = (k: unknown): k is MapConf => typeof k === 'string' && k in MAP_CONFS;
// trame du sol : GSC cellules par unite. gBase garde le sol sans les routes pour pouvoir repeindre.
export let GSC: number = 2, GA0 = -800, GB0 = -540, GW = 1600 * GSC, GH = 1080 * GSC, GN = GW * GH, GQW = GW >> 2, GQH = GH >> 2;
// basse resolution : nuances de l'herbe et phase de l'ecume
const NONE = new Uint8Array(0);
export let gVar: Uint8Array = NONE, gPh: Uint8Array = NONE, gType: Uint8Array = NONE, gBase: Uint8Array = NONE, gTone: Uint8Array = NONE, gSea: Uint8Array = NONE, gLand: Uint8Array = NONE;
// echelle de la carte par rapport a la moyenne (1 pour la carte d'origine)
export const mapScale = () => Math.max(GW / GSC / 1600, GH / GSC / 1080);
export function setMapSize(key: string): void {
  const m = isMapSize(key) ? MAP_SIZES[key] : MAP_SIZES.moyenne, gw = m.w * m.gsc, gh = m.h * m.gsc;
  const same = gType.length > 0 && GW === gw && GH === gh;
  GSC = m.gsc; GA0 = -m.w / 2; GB0 = -m.h / 2; GW = gw; GH = gh; GN = GW * GH; GQW = GW >> 2; GQH = GH >> 2;
  if (!same){
    // on lache les anciens tableaux avant d'en creer de nouveaux (les plus grandes cartes pesent lourd)
    gType = gBase = gTone = gSea = gLand = gVar = gPh = NONE;
    gVar = new Uint8Array(GQW * GQH); gPh = new Uint8Array(GQW * GQH);
    gType = new Uint8Array(GN); gBase = new Uint8Array(GN); gTone = new Uint8Array(GN); gSea = new Uint8Array(GN); gLand = new Uint8Array(GN);
  }
  IS.ra = m.w * .4125; IS.rb = m.h * .398;
}
setMapSize('moyenne');
export const cellOf = (a: number, b: number): number => { const ia = Math.floor((a - GA0) * GSC), ib = Math.floor((b - GB0) * GSC); return (ia < 0 || ib < 0 || ia >= GW || ib >= GH) ? -1 : ib * GW + ia; };
export const typeAt = (a: number, b: number): number => { const i = cellOf(a, b); return i < 0 ? T_SEA : gType[i]; };
export const baseAt = (a: number, b: number): number => { const i = cellOf(a, b); return i < 0 ? T_SEA : gBase[i]; };
export const landDAt = (a: number, b: number): number => { const i = cellOf(a, b); return i < 0 ? 0 : gLand[i]; };
export const seaDAt = (a: number, b: number): number => { const i = cellOf(a, b); return i < 0 ? 255 : gSea[i]; };
export const isLand = (t: number): boolean => t !== T_SEA && t !== T_PIER;

// forme du monde : une ou plusieurs iles (super-ellipses cabossees par du bruit : baies, caps), plus quelques ilots au large
// ea, eb : demi-etendue des terres (pour le voilier au large et les vestiges)
/** Une ile : centre (ca, cb), rayons (ra, rb), decalage de son bruit, anneau d'atoll et ses passes. */
export interface Island { ca: number; cb: number; ra: number; rb: number; ox: number; oy: number; ring: boolean; gaps: number[] }
export interface Islet { a: number; b: number; r: number }
export const ISEED: { ox: number; oy: number; isl: Island[]; islets: Islet[]; conf: MapConf; cut: number; ea: number; eb: number } =
  { ox: 0, oy: 0, isl: [], islets: [], conf: 'une', cut: 0, ea: 660, eb: 430 };
export function seedIsland(seed: number, confIn: string): void {
  const r = (k: number): number => hash2(seed * 7 + k, 913);
  const W2 = GW / GSC / 2, H2 = GH / GSC / 2, k = W2 / 800;
  const conf: MapConf = isMapConf(confIn) ? confIn : 'une';
  ISEED.ox = r(1) * 50; ISEED.oy = r(2) * 50; ISEED.conf = conf;
  ISEED.isl = []; ISEED.islets = []; ISEED.cut = 0;
  const add = (ca: number, cb: number, ra: number, rb: number, j: number, ring = false): number => ISEED.isl.push({ ca, cb, ra, rb, ox: r(40 + j) * 50, oy: r(60 + j) * 50, ring: !!ring, gaps: [r(80 + j) * TAU, r(81 + j) * TAU] });
  let nIslets = 3 + Math.floor(r(3) * 2);
  if (conf === 'deux'){
    // deux iles face a face, separees par un detroit
    add(-W2 * .5, (r(5) - .5) * H2 * .2, W2 * .36, H2 * .7, 0); add(W2 * .5, (r(6) - .5) * H2 * .2, W2 * .36, H2 * .7, 1);
    ISEED.cut = 1; nIslets = 2;
  } else if (conf === 'quatre'){
    let j = 0; for (const sa of [-1, 1]) for (const sb of [-1, 1]){ add(sa * W2 * .5 + (r(7 + j) - .5) * W2 * .08, sb * H2 * .5 + (r(9 + j) - .5) * H2 * .08, W2 * .34, H2 * .34, j); j++; }
    ISEED.cut = 2; nIslets = 2;
  } else if (conf === 'archipel'){
    // des iles de tailles variees, qui ne se touchent pas
    const n = 7 + Math.floor(r(4) * 3);
    for (let t = 0, j = 0; j < n && t < 400; t++){
      const ra = W2 * (.13 + r(100 + t) * .13), rb = ra * (.7 + r(200 + t) * .3) * (H2 / W2) * 1.3;
      const ca = (r(300 + t) * 2 - 1) * (W2 - ra * 1.3 - 60), cb = (r(400 + t) * 2 - 1) * (H2 - rb * 1.3 - 60);
      if (ISEED.isl.some(o => Math.hypot((ca - o.ca) / (ra + o.ra), (cb - o.cb) / (rb + o.rb)) < 1.25)) continue;
      add(ca, cb, ra, rb, j++);
    }
    nIslets = 0;
  } else if (conf === 'atoll'){
    // un anneau de terre autour d'un lagon, avec deux passes vers le large et un ilot au milieu
    add(0, 0, IS.ra * 1.02, IS.rb * 1.02, 0, true); add((r(8) - .5) * W2 * .12, (r(9) - .5) * H2 * .12, W2 * .1, H2 * .1, 1);
  } else add(IS.ca, IS.cb, IS.ra, IS.rb, 0);
  const main = ISEED.isl[0];
  if (conf === 'une' || conf === 'atoll'){ ISEED.ea = main.ra; ISEED.eb = main.rb; } else { ISEED.ea = W2 * .92; ISEED.eb = H2 * .92; }
  for (let j = 0; j < nIslets; j++){
    const ang = (j / nIslets) * TAU + r(10 + j) * 1.2, d = 1.12 + r(20 + j) * .08, rr = (30 + r(30 + j) * 28) * Math.sqrt(k);
    const o = conf === 'une' || conf === 'atoll' ? main : ISEED.isl[j % ISEED.isl.length];
    // l'ilot reste entier dans la zone de jeu
    const a = clamp(o.ca + Math.cos(ang) * o.ra * d, GA0 + rr * 1.6 + 30, GA0 + GW / GSC - rr * 1.6 - 30), b = clamp(o.cb + Math.sin(ang) * o.rb * d, GB0 + rr * 1.3 + 30, GB0 + GH / GSC - rr * 1.3 - 30);
    ISEED.islets.push({ a, b, r: rr });
  }
}
// l'ile la plus proche d'un point (en rayons de l'ile)
export function islandNear(a: number, b: number): Island {
  let best = ISEED.isl[0], bd = 1e9;
  for (const it of ISEED.isl){ if (it.ra < W_ISLE_MIN) continue; const d = Math.hypot((a - it.ca) / it.ra, (b - it.cb) / it.rb); if (d < bd){ bd = d; best = it; } }
  return best;
}
export const W_ISLE_MIN = 60;
export function islandF(a: number, b: number): number {
  let f = -9;
  for (const it of ISEED.isl){
    const u = (a - it.ca) / it.ra, v = (b - it.cb) / it.rb;
    if (u > 1.45 || u < -1.45 || v > 1.45 || v < -1.45) continue;
    const r = Math.pow(u * u * u * u + v * v * v * v, .25) * .6 + Math.hypot(u, v) * .4;
    const ang = Math.atan2(v, u);
    const n = (vnoise(Math.cos(ang) * 2.1 + it.ox, Math.sin(ang) * 2.1 + it.oy) - .5) * .36
      + (vnoise(a * .005 + ISEED.ox, b * .005 + ISEED.oy) - .5) * .2
      + (vnoise(a * .018 + 7 + ISEED.ox, b * .018 + 3 + ISEED.oy) - .5) * .07;
    let g = 1 + n - r;
    if (it.ring){
      // le lagon au milieu, et deux passes vers le large
      g = Math.min(g, (r - .58) * 2.6 + n * .8);
      for (const ga of it.gaps){ let da = Math.abs(ang - ga) % TAU; if (da > Math.PI) da = TAU - da; if (da < .12) g -= (1 - da / .12) * 1.2; }
    }
    if (g > f) f = g;
  }
  for (const it of ISEED.islets){
    const d = Math.hypot((a - it.a) / it.r, (b - it.b) / (it.r * .75));
    const g = (1 - d) * .6 + (vnoise(a * .04 + it.a * .01, b * .04 + it.b * .01) - .5) * .25;
    if (g > f) f = g;
  }
  // detroits entre les iles : la mer passe toujours entre elles
  if (ISEED.cut){
    const ch = 40 * Math.sqrt(GW / GSC / 1600) + (vnoise(b * .01 + 5, 3) - .5) * 20;
    if (Math.abs(a) < ch) f -= (1 - Math.abs(a) / ch) * 1.3;
    if (ISEED.cut === 2){ const cb = 40 * Math.sqrt(GH / GSC / 1080) + (vnoise(a * .01 + 9, 7) - .5) * 20; if (Math.abs(b) < cb) f -= (1 - Math.abs(b) / cb) * 1.3; }
  }
  // pres des bords de la carte, la terre s'efface toujours dans la mer
  const edge = Math.min(a - GA0, GA0 + GW / GSC - a, b - GB0, GB0 + GH / GSC - b);
  if (edge < 60) f -= (60 - edge) / 60 * .8;
  return f;
}
// bruits de la nature : forets et rochers
export const forestN = (a: number, b: number): number => vnoise(a * .011 + ISEED.ox + 30, b * .011 + ISEED.oy + 11) * .75 + vnoise(a * .05 + 3, b * .05 + ISEED.oy) * .25;
// montagnes : des chaines larges, avec un peu de relief fin
export const mountN = (a: number, b: number): number => vnoise(a * .0052 + ISEED.ox + 70, b * .0052 + ISEED.oy + 41) * .82 + vnoise(a * .028 + 3, b * .028 + ISEED.ox) * .18;
export const MOUNT_T = .66;

// distance de chanfrein en entiers (2 en droit, 3 en diagonale)
export function chamfer(dist: Uint16Array, w: number, h: number): void {
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++){
    const i = y * w + x; let v = dist[i]; if (v === 0) continue;
    if (x > 0 && dist[i-1] + 2 < v) v = dist[i-1] + 2;
    if (y > 0){ if (dist[i-w] + 2 < v) v = dist[i-w] + 2; if (x > 0 && dist[i-w-1] + 3 < v) v = dist[i-w-1] + 3; if (x < w-1 && dist[i-w+1] + 3 < v) v = dist[i-w+1] + 3; }
    dist[i] = v;
  }
  for (let y = h - 1; y >= 0; y--) for (let x = w - 1; x >= 0; x--){
    const i = y * w + x; let v = dist[i]; if (v === 0) continue;
    if (x < w-1 && dist[i+1] + 2 < v) v = dist[i+1] + 2;
    if (y < h-1){ if (dist[i+w] + 2 < v) v = dist[i+w] + 2; if (x < w-1 && dist[i+w+1] + 3 < v) v = dist[i+w+1] + 3; if (x > 0 && dist[i+w-1] + 3 < v) v = dist[i+w-1] + 3; }
    dist[i] = v;
  }
}
export function buildGround(seed: number, conf: string): void {
  seedIsland(seed, conf);
  // 1. la forme, calculee toutes les 2 unites puis interpolee (rapide et lisse)
  const S = 4, cw = Math.ceil(GW / S) + 2, ch = Math.ceil(GH / S) + 2, F = new Float32Array(cw * ch);
  for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) F[y * cw + x] = islandF(GA0 + x * S / GSC, GB0 + y * S / GSC);
  // par blocs de S x S cases : un bloc dont les quatre coins sont du meme cote est tout en mer ou tout en terre
  for (let by = 0; by * S < GH; by++) for (let bx = 0; bx * S < GW; bx++){
    const k = by * cw + bx, f00 = F[k], f10 = F[k + 1], f01 = F[k + cw], f11 = F[k + cw + 1];
    const ya = by * S, yb = Math.min(GH, ya + S), xa = bx * S, xb = Math.min(GW, xa + S);
    if (f00 > 0 && f10 > 0 && f01 > 0 && f11 > 0){ for (let ib = ya; ib < yb; ib++) gBase.fill(T_GRASS, ib * GW + xa, ib * GW + xb); continue; }
    if (f00 <= 0 && f10 <= 0 && f01 <= 0 && f11 <= 0){ for (let ib = ya; ib < yb; ib++) gBase.fill(T_SEA, ib * GW + xa, ib * GW + xb); continue; }
    for (let ib = ya; ib < yb; ib++){
      const ty = (ib + .5) / S - by;
      for (let ia = xa; ia < xb; ia++){
        const tx = (ia + .5) / S - bx, f = (f00 * (1 - tx) + f10 * tx) * (1 - ty) + (f01 * (1 - tx) + f11 * tx) * ty;
        gBase[ib * GW + ia] = f > 0 ? T_GRASS : T_SEA;
      }
    }
  }
  // 2. distances a la cote, des deux cotes
  let d: Uint16Array | null = new Uint16Array(GN);
  for (let i = 0; i < GN; i++) d[i] = gBase[i] === T_SEA ? 60000 : 0;
  chamfer(d, GW, GH);
  // distances en demi-unites, quelle que soit la finesse du sol
  for (let i = 0; i < GN; i++) gSea[i] = Math.min(255, (d[i] / GSC) | 0);
  for (let i = 0; i < GN; i++) d[i] = gBase[i] === T_SEA ? 0 : 60000;
  chamfer(d, GW, GH);
  for (let i = 0; i < GN; i++) gLand[i] = Math.min(255, (d[i] / GSC) | 0);
  d = null;
  // 3. plages, rochers, forets (le bruit est lu en basse resolution)
  const RS = 8, rw = Math.ceil(GW / RS) + 1, rh = Math.ceil(GH / RS) + 1, FO = new Float32Array(rw * rh), RO = new Float32Array(rw * rh);
  for (let y = 0; y < rh; y++) for (let x = 0; x < rw; x++){ const a = GA0 + x * RS / GSC, b = GB0 + y * RS / GSC; FO[y * rw + x] = forestN(a, b); RO[y * rw + x] = mountN(a, b); }
  for (let ib = 0, i = 0; ib < GH; ib++){
    const ry = Math.min(rh - 1, Math.round(ib / RS));
    for (let ia = 0; ia < GW; ia++, i++){
      if (gBase[i] === T_SEA) continue;
      const ld = gLand[i];
      if (ld < 12){ gBase[i] = T_BEACH; continue; }
      const k = ry * rw + Math.min(rw - 1, Math.round(ia / RS));
      if (RO[k] > MOUNT_T && ld > 34) gBase[i] = T_ROCK;
      else if (FO[k] > .56 && ld > 18) gBase[i] = T_FOREST;
    }
  }
  for (let q = 0, qi = 0; q < GQH; q++) for (let p = 0; p < GQW; p++, qi++){
    const a = GA0 + (p * 4 + 2) / GSC, b = GB0 + (q * 4 + 2) / GSC;
    gVar[qi] = (vnoise(a * .04 + 1.3, b * .04 + 2.7) > .6 || vnoise(a * .21 + 9, b * .21 + 4) > .8) ? 1 : 0;
    gPh[qi] = Math.round(vnoise(a * .06, b * .06) * 60);
  }
  for (let ib = 0, i = 0; ib < GH; ib++) for (let ia = 0; ia < GW; ia++, i++){
    gType[i] = gBase[i];
    gTone[i] = (gBase[i] === T_SEA && gSea[i] > 10) ? 0 : baseTone(gBase[i], gLand[i], gSea[i], ia, ib);
  }
}
export function baseTone(t: number, ld: number, sd: number, ia: number, ib: number): number {
  switch (t){
    case T_SEA: return (sd >= 1 && sd <= 10) ? 32 + sd : 0;
    case T_BEACH: if (ld <= 2) return 16; return Math.max(1, Math.round(4 - ld * .25));
    // roche : des taches claires accrochees au sol, pas de trame a l'ecran (elle faisait des carres en tournant et au dezoom)
    case T_ROCK: return (hash2(ia >> 2, ib >> 2) < .18 || hash2(ia, ib) < .16) ? 16 : 0;
    case T_FOREST: return hash2(ia * 3 + 1, ib * 5 + 2) < .05 ? 16 : (hash2(ia, ib + 7) < .5 ? 1 : 0);
    case T_DIRT: return hash2(ia + 5, ib) < .4 ? 2 : 0;
    default: return hash2((hash2(ia, ib) * 4294967296) | 0, (ia * 31) ^ ib) < 0.012 ? 16 : 0;
  }
}
// remet le sol d'une zone a son etat de base (avant de repeindre les routes)
export function resetArea(ia0: number, ia1: number, ib0: number, ib1: number): void {
  for (let ib = ib0; ib <= ib1; ib++) for (let ia = ia0; ia <= ia1; ia++){
    const i = ib * GW + ia; gType[i] = gBase[i];
    gTone[i] = (gBase[i] === T_SEA && gSea[i] > 10) ? 0 : baseTone(gBase[i], gLand[i], gSea[i], ia, ib);
  }
}
// defricher : la foret redevient de l'herbe sous un batiment ou une route
export function clearForest(a0: number, a1: number, b0: number, b1: number): number {
  const ia0 = Math.max(0, Math.floor((a0 - GA0) * GSC)), ia1 = Math.min(GW - 1, Math.ceil((a1 - GA0) * GSC));
  const ib0 = Math.max(0, Math.floor((b0 - GB0) * GSC)), ib1 = Math.min(GH - 1, Math.ceil((b1 - GB0) * GSC));
  let n = 0;
  for (let ib = ib0; ib <= ib1; ib++) for (let ia = ia0; ia <= ia1; ia++){ const i = ib * GW + ia; if (gBase[i] === T_FOREST){ gBase[i] = T_GRASS; n++; } }
  if (n) resetArea(ia0, ia1, ib0, ib1);
  return n;
}
// point de cote le plus proche d'un endroit, cote terre (pour les debarquements)
export function nearestShore(a: number, b: number, maxR?: number): Vec2 | null {
  let best: Vec2 | null = null, bd = 1e9;
  for (let r = 0; r <= (maxR || 80); r += 2) for (let k = 0; k < Math.max(1, r * 1.2); k++){
    const an = k / Math.max(1, r * 1.2) * TAU, pa = a + Math.cos(an) * r, pb = b + Math.sin(an) * r, i = cellOf(pa, pb);
    if (i < 0 || gBase[i] === T_SEA) continue;
    if (gLand[i] > 4) continue;
    const dd = Math.hypot(pa - a, pb - b); if (dd < bd){ bd = dd; best = [pa, pb]; }
    if (best && r > bd + 4) return best;
  }
  return best;
}
