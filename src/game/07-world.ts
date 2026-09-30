import { SH } from './00-shared.ts';
import type { Side } from './00-shared.ts';
import type { Vec2 } from './02-ground.ts';
import type { Sprite } from './01-core.ts';
import { COLOR, FONT, H, M, PC, PS, SC, SHADOW_V, TAU, UP, W, bay, blit, blitAt, boxS, bz, cam, clamp, dep, drawFace, fput, hash2, lb, line3, prj, state, textW, unprj, wallFace } from './01-core.ts';
import { GA0, GB0, GH, GSC, GW, IS, ISEED, MOUNT_T, T_FOREST, T_GRASS, T_ROCK, baseAt, cellOf, clearForest, gBase, gLand, landDAt, mapScale, mountN } from './02-ground.ts';
import { pennant, treeSpr, treeSprSc } from './03-buildings-base.ts';
/* ================= forets : des milliers d'arbres, ranges par cases pour ne dessiner que ceux a l'ecran ================= */
export const TB = 64;                     // taille d'une case d'arbres, en unites
/** Un arbre : position, rayon du feuillage, et s'il est encore debout. */
export interface Tree { a: number; b: number; r: number; alive: boolean }
export const TREES: { list: Tree[]; grid: Map<number, Tree[]>; ver: number } = { list: [], grid: new Map(), ver: 0 };
export const treeKey = (i: number, j: number): number => i * 4096 + j;
export function treeCell(a: number, b: number): number { return treeKey(Math.floor(a / TB), Math.floor(b / TB)); }
export function addTree(a: number, b: number, r: number): void {
  const t: Tree = { a, b, r, alive: true };
  TREES.list.push(t);
  const k = treeCell(a, b); let L = TREES.grid.get(k); if (!L){ L = []; TREES.grid.set(k, L); } L.push(t);
}
export function buildForests(seed: number): void {
  TREES.list = []; TREES.grid = new Map(); TREES.ver++;
  // foret dense sur le sol de foret, arbres isoles ailleurs
  for (let b = GB0 + 4; b < GB0 + GH / GSC - 4; b += 6.5){
    for (let a = GA0 + 4; a < GA0 + GW / GSC - 4; a += 7.5){
      const ja = a + (hash2(a * 3 + seed, b) - .5) * 6, jb = b + (hash2(a, b * 3 + seed) - .5) * 5;
      const i = cellOf(ja, jb); if (i < 0) continue;
      const t = gBase[i];
      if (t === T_FOREST){ if (hash2(ja + 11, jb - seed) < .82) addTree(Math.round(ja), Math.round(jb), 3 + Math.floor(hash2(ja, jb + 5) * 3)); }
      else if (t === T_GRASS && gLand[i] > 16 && hash2(ja - 7, jb + seed * 3) < .018) addTree(Math.round(ja), Math.round(jb), 3 + Math.floor(hash2(ja, jb + 9) * 2));
    }
  }
}
/* ================= montagnes : des sommets en 3D sur les zones rocheuses ================= */
/** Un sommet : centre, hauteur H, rayon R, base a 6 cotes, sommet decale, neige au-dessus d'une certaine hauteur. */
export interface Peak { a: number; b: number; H: number; R: number; base: Vec2[]; apex: Vec2; snow: boolean }
export const PEAKS: { list: Peak[]; grid: Map<number, Peak[]> } = { list: [], grid: new Map() };
export function buildMountains(seed: number): void {
  PEAKS.list = []; PEAKS.grid = new Map();
  for (let b = GB0 + 10; b < GB0 + GH / GSC - 10; b += 30){
    for (let a = GA0 + 10; a < GA0 + GW / GSC - 10; a += 36){
      const ja = a + (hash2(a + seed, b * 3) - .5) * 20, jb = b + (hash2(a * 3, b + seed) - .5) * 16;
      if (baseAt(ja, jb) !== T_ROCK || landDAt(ja, jb) < 40) continue;
      const m = clamp((mountN(ja, jb) - MOUNT_T) / (1 - MOUNT_T), 0, 1);
      if (hash2(ja - 3, jb + 9) > .45 + m * 1.5) continue;
      const H = Math.round(22 + m * 80 + hash2(ja, jb) * 12), R = 14 + H * .5;
      // base irreguliere a 6 cotes, sommet un peu decale
      const n = 6, ph = hash2(ja + 1, jb) * TAU, base: Vec2[] = [];
      for (let k = 0; k < n; k++){ const an = ph + k * TAU / n, rr = R * (.78 + hash2(ja + k, jb - k) * .44); base.push([ja + Math.cos(an) * rr, jb + Math.sin(an) * rr]); }
      const pk: Peak = { a: ja, b: jb, H, R, base, apex: [ja + (hash2(ja, jb + 5) - .5) * R * .3, jb + (hash2(ja + 5, jb) - .5) * R * .3], snow: H > 58 };
      PEAKS.list.push(pk);
      const key = treeCell(ja, jb); let L = PEAKS.grid.get(key); if (!L){ L = []; PEAKS.grid.set(key, L); } L.push(pk);
    }
  }
}
export function drawPeak(pk: Peak): void {
  const n = pk.base.length, [ta, tb] = pk.apex, H = pk.H;
  for (let k = 0; k < n; k++){
    const [pa, pb] = pk.base[k], [qa, qb] = pk.base[(k + 1) % n];
    // normale sortante de la face (p, q, sommet)
    const ux = qa - pa, uy = qb - pb, vx = ta - pa, vy = tb - pb, nx = uy * H - 0 * vy, ny = 0 * vx - ux * H, nz = ux * vy - uy * vx;
    const sgn = nz < 0 ? -1 : 1, nrm = [nx * sgn, ny * sgn, nz * sgn];
    // faces pleines, seul l'eclairage change de l'une a l'autre : pas de trame qui fait des carres au zoom ou en tournant
    SH.CUR = M.ROCK;
    drawFace([pa, pb, 0, qa, qb, 0, ta, tb, H], nrm, 0, 1);
    if (pk.snow){
      const f = .68, sa = pa + (ta - pa) * f, sb = pb + (tb - pb) * f, ea = qa + (ta - qa) * f, eb = qb + (tb - qb) * f;
      SH.CUR = M.NEUTRAL;
      drawFace([sa, sb, H * f, ea, eb, H * f, ta, tb, H], nrm, 1, -1);
    }
  }
}
// (le rectangle est d'abord ramene a la carte : de tres loin, la vue deborde largement sur la mer)
export function clipToMap(a0: number, a1: number, b0: number, b1: number): [number, number, number, number] { return [Math.max(a0, GA0 - 100), Math.min(a1, GA0 + GW / GSC + 100), Math.max(b0, GB0 - 100), Math.min(b1, GB0 + GH / GSC + 100)]; }
export function peaksIn(a0: number, a1: number, b0: number, b1: number, fn: (p: Peak) => void): void {
  [a0, a1, b0, b1] = clipToMap(a0, a1, b0, b1);
  for (let i = Math.floor(a0 / TB); i <= Math.floor(a1 / TB); i++) for (let j = Math.floor(b0 / TB); j <= Math.floor(b1 / TB); j++){
    const L = PEAKS.grid.get(treeKey(i, j)); if (L) for (const p of L) fn(p);
  }
}
// arbres dans un rectangle (vivants seulement)
export function treesIn(a0: number, a1: number, b0: number, b1: number, fn: (t: Tree) => void): void {
  [a0, a1, b0, b1] = clipToMap(a0, a1, b0, b1);
  for (let i = Math.floor(a0 / TB); i <= Math.floor(a1 / TB); i++) for (let j = Math.floor(b0 / TB); j <= Math.floor(b1 / TB); j++){
    const L = TREES.grid.get(treeKey(i, j)); if (!L) continue;
    for (const t of L) if (t.alive && t.a >= a0 && t.a <= a1 && t.b >= b0 && t.b <= b1) fn(t);
  }
}
export function cutTrees(a0: number, a1: number, b0: number, b1: number): number { let n = 0; treesIn(a0 - 3, a1 + 3, b0 - 3, b1 + 3, (t) => { t.alive = false; n++; }); if (n) TREES.ver++; clearForest(a0, a1, b0, b1); return n; }
// arbres le long d'un trait (routes, mur)
export function cutTreesAlong(pts: Vec2[], w: number): number {
  let n = 0;
  for (let k = 0; k + 1 < pts.length; k++){
    const [pa, pb] = pts[k], [qa, qb] = pts[k + 1], L = Math.hypot(qa - pa, qb - pb) || 1;
    treesIn(Math.min(pa, qa) - w - 3, Math.max(pa, qa) + w + 3, Math.min(pb, qb) - w - 3, Math.max(pb, qb) + w + 3, (t) => {
      const s = clamp(((t.a - pa) * (qa - pa) + (t.b - pb) * (qb - pb)) / (L * L), 0, 1);
      if (Math.hypot(pa + (qa - pa) * s - t.a, pb + (qb - pb) * s - t.b) < w + 3){ t.alive = false; n++; }
    });
    clearForest(Math.min(pa, qa) - w, Math.max(pa, qa) + w, Math.min(pb, qb) - w, Math.max(pb, qb) + w);
  }
  if (n) TREES.ver++;
  return n;
}
// arbres visibles, ajoutes a la liste de dessin ; leurs ombres sont posees directement au sol
/** Un objet a dessiner, trie par profondeur (d) : voir render() dans 11-render. */
/** un objet a dessiner, trie par profondeur d. spr : l'objet n'est que ce petit dessin pose au pixel (x, y) de l'image,
 *  en matiere m (un arbre) : la carte graphique peut le poser elle-meme (11-render, etape 3.3) */
export interface Drawable { d: number; a?: number; b?: number; f: (t: number) => void; m?: number; key?: object; still?: boolean; raw?: boolean; side?: Side; big?: boolean; spr?: { s: Sprite; x: number; y: number } }
export function treeDrawables(out: Drawable[], t: number, withShadows: boolean): void {
  const cs = [unprj(-20, -20), unprj(W + 20, -20), unprj(-20, H + 60), unprj(W + 20, H + 60)];
  let a0 = 1e9, a1 = -1e9, b0 = 1e9, b1 = -1e9;
  for (const [a, b] of cs){ a0 = Math.min(a0, a); a1 = Math.max(a1, a); b0 = Math.min(b0, b); b1 = Math.max(b1, b); }
  const xmas = SH.XMAS_ON, far = SC < .999, s = SC, farShade = far && COLOR && SH.NIGHT < .6;
  vestDrawables(out);
  peaksIn(a0 - 40, a1 + 40, b0 - 40, b1 + 80, (pk) => {
    const q = prj(pk.a, pk.b, 0);
    if (q[0] < -pk.R * 2 * s || q[0] > W + pk.R * 2 * s || q[1] < -10 * s || q[1] > H + (pk.H + pk.R) * s) return;
    out.push({ d: dep(pk.a, pk.b) - pk.R * .5, m: M.ROCK, f: () => drawPeak(pk), a: pk.a, b: pk.b, key: pk, still: true });
  });
  // tout au fond du dezoom (grandes cartes), un arbre ne ferait plus qu'une fraction de pixel : la foret se voit par son sol
  if (far && s < .03) return;
  treesIn(a0, a1, b0, b1, (tr) => {
    const q = prj(tr.a, tr.b, 0);
    if (q[0] < -14 * s || q[0] > W + 14 * s || q[1] < -4 * s || q[1] > H + 26 * s) return;
    // de loin, l'arbre est recopie en petit directement (il est le meme sous tous les angles)
    if (far){
      // a sa vraie taille, un arbre peut faire moins d'un pixel : on n'en dessine qu'une part, selon la surface de son feuillage
      const rx = (tr.r + 1) * s; if (rx < 1.1 && hash2(tr.a * 1.7 + 3, tr.b * .9 - 5) > Math.PI * rx * tr.r * s) return;
      if (farShade && s > .3) treeShadow(tr, q, s);
      const sp = treeSprSc(tr.r, s), x = Math.round(q[0]), y = Math.round(q[1]);
      out.push({ d: dep(tr.a, tr.b), m: M.TREE, raw: true, spr: { s: sp, x, y }, f: () => { SH.CUR = M.TREE; blit(sp, x, y); } }); return; }
    if (withShadows) treeShadow(tr, q);
    const deco = xmas && hash2(tr.a, tr.b) < .3;
    out.push({ d: dep(tr.a, tr.b), m: M.TREE, spr: deco ? undefined : { s: treeSpr(tr.r), x: Math.round(q[0]), y: Math.round(q[1]) }, f: (tt) => { SH.CUR = M.TREE; blitAt(treeSpr(tr.r), tr.a, tr.b, 0); if (deco) SH.drawTreeLights(tr.a, tr.b, tr.r, tt); } });

  });
}
// ombre d'arbre : un ovale decale selon le soleil, seulement sur le sol
export function treeShadow(tr: Tree, q: number[], s = 1): void {
  const h = tr.r * 2 + 3, sa = tr.a + h * SHADOW_V[0] * .5, sb = tr.b + h * SHADOW_V[1] * .5, p = prj(sa, sb, 0);
  const cx = Math.round(p[0]), cy = Math.round(p[1]), rx = Math.max(1, (tr.r + 2) * s), ry = Math.max(s < 1 ? 1 : 2, tr.r * .6 * s);
  for (let dy = -Math.ceil(ry); dy <= Math.ceil(ry); dy++){
    const y = cy + dy; if (y < 0 || y >= H) continue;
    const w = Math.floor(rx * Math.sqrt(Math.max(0, 1 - (dy / (ry + .5)) ** 2)));
    const LB = lb; for (let dx = -w; dx <= w; dx++){ const x = cx + dx; if (x >= 0 && x < W) LB[y * W + x] = 4; }
  }
}

/* ================= le Rideau de Laine : segments que chaque camp tricote lui-meme ================= */
// WALLS : pans de 10 unites au plus { side, pa, pb, qa, qb, g, line } ; WALL_TOWERS : miradors le long des lignes
/** Un pan du Rideau de Laine : de (pa, pb) a (qa, qb), numero de graffiti (-1 : aucun), ligne a laquelle il appartient. */
export interface Wall { side: Side; pa: number; pb: number; qa: number; qb: number; g: number; line: number }
export interface WallTower { side: Side; a: number; b: number; ph: number; line: number }
SH.WALLS = []; SH.WALL_TOWERS = [];
export const GRAFFITI = ['PAIX', 'MIAOU', 'LIBRE', 'LOVE', 'ELVIS'];
export function glyphAt(str: string, u: number, h: number, u0: number, h0: number, s: number): boolean {
  const col = Math.floor((u - u0) / s), row = Math.floor((h0 - h) / s);
  if (col < 0 || row < 0 || row > 4) return false;
  const ch = Math.floor(col / 4), cc = col % 4;
  if (ch >= str.length || cc === 3) return false;
  const g = FONT[str[ch]]; return !!g && g[row * 3 + cc] === '1';
}
// un pan de mur entre deux points : laine grise tricotee, barbeles, graffiti cote USC
// (g : numero du graffiti dans GRAFFITI, -1 pour aucun ; le trace en cours passe directement un texte, souvent vide)
export function drawWallPiece(pa: number, pb: number, qa: number, qb: number, gi: number | string, side: Side): void {
  const g = typeof gi === 'number' ? (gi >= 0 ? GRAFFITI[gi % GRAFFITI.length] : '') : gi;
  const L = Math.hypot(qa - pa, qb - pb) || 1, na = -(qb - pb) / L * .8, nb = (qa - pa) / L * .8;
  SH.CUR = M.WALL;
  const fn = (u: number, h: number, x: number, y: number): number => {
    if (h > 6.2) return 1;
    if ((u % 2.5) < .3) return 0;
    if (g){ const s = Math.min(.55, (L - 1) / (textW(g) + 1)); if (glyphAt(g, u, h, .8, 5.2, s)) return (bz(x, y) < 12) ? 1 : 0; }
    return bz(x, y) < 3 ? 1 : 0;
  };
  wallFace(pa + na, pb + nb, qa + na, qb + nb, 0, 7, fn, 1);
  wallFace(qa - na, qb - nb, pa - na, pb - nb, 0, 7, fn, 1);
  drawFace([pa - na, pb - nb, 7, qa - na, qb - nb, 7, qa + na, qb + nb, 7, pa + na, pb + nb, 7], UP, 1, 1);
  SH.CUR = M.METAL;
  const n = Math.ceil(L / .8);
  for (let k = 0; k <= n; k++){ const f = k / n, p = prj(pa + (qa - pa) * f, pb + (qb - pb) * f, 8.2 + ((k & 1) ? .6 : 0)); fput(Math.round(p[0]), Math.round(p[1]), 1); }
}
export function towerSpot(tw: WallTower, t: number): Vec2 { return [tw.a + Math.sin(t * .7 + tw.ph) * 14, tw.b + Math.cos(t * .35 + tw.ph) * 14]; }
export function drawTower(tw: WallTower, t: number): void {
  const { a, b } = tw;
  SH.CUR = M.METAL;
  for (const [da, db] of [[-2.2,-2.2],[2.2,-2.2],[2.2,2.2],[-2.2,2.2]]) line3(a + da, b + db, 0, a + da * .7, b + db * .7, 16, 1);
  line3(a - 2.2, b + 2.2, 5, a + 2.2, b + 2.2, 11, 1); line3(a + 2.2, b - 2.2, 5, a + 2.2, b + 2.2, 11, 1);
  boxS(a - 3, a + 3, b - 3, b + 3, 16, 21, (u: number, h: number, x: number, y: number) => (h > 1.8 && h < 3.6) ? ((Math.floor(u * 1.5) % 3 === 0) ? 0 : 1) : (bz(x, y) < 2 ? 1 : 0), 0);
  boxS(a - 3.6, a + 3.6, b - 3.6, b + 3.6, 21, 22, 1, (x: number, y: number) => bz(x, y) < 4 ? 1 : 0);
  const top = prj(a, b, 23);
  pennant(Math.round(top[0]), Math.round(top[1]) - 4, tw.side, t, a);
  if (COLOR && SH.DAY) return;
  const sp = towerSpot(tw, t), gp = prj(sp[0], sp[1], 0);
  SH.CUR = M.BEAM;
  fput(Math.round(top[0]), Math.round(top[1]), 1); fput(Math.round(top[0]) + 1, Math.round(top[1]), 1);
  const n = Math.ceil(Math.hypot(gp[0] - top[0], gp[1] - top[1]));
  for (let s = 3; s < n; s++){ const x = Math.floor(top[0] + (gp[0] - top[0]) * s / n), y = Math.floor(top[1] + (gp[1] - top[1]) * s / n); if (bz(x, y) < 5) fput(x, y, 1); }
}

/* ================= le phare : une tour a rayures, a poser sur la cote ================= */
export const PL_H = 3, TOWER_H = 40, GYO = -PL_H - TOWER_H;
export function lhBase(a: number, b: number): Vec2 { const p = prj(a, b, 0); return [Math.round(p[0]), Math.round(p[1])]; }
export function drawLighthouse(a: number, b: number, side: Side): void {
  const [ox, oy] = lhBase(a, b);
  const P = (x: number, y: number, c: number): void => fput(ox + x, oy + y, c);
  const PRX = 10, PRY = 4.5;
  SH.CUR = M.ROCK;
  for (let x = -PRX; x <= PRX; x++){
    const k = Math.sqrt(Math.max(0, 1 - (x / (PRX + .5)) ** 2));
    const yb = Math.round(-PL_H - PRY * k), yf = Math.round(-PL_H + PRY * k);
    for (let y = yb; y <= yf; y++){ const edge = y === yb || y === yf || Math.abs(x) === PRX; P(x, y, edge ? (y === yb ? 1 : 0) : (bay(x, y) < (x < 2 ? 15 : 10) ? 1 : 0)); }
    for (let r = 1; r <= PL_H; r++){ const y = yf + r; let c; if (r === PL_H || Math.abs(x) === PRX) c = 0; else if (((x + r * 2) & 3) === 0) c = 0; else c = x < 3 ? 1 : (bay(x, y) < 6 ? 1 : 0); P(x, y, c); }
  }
  const R0 = 7, R1 = 4.5, rot = cam.phi / Math.PI * 0.8;
  SH.CUR = side === 'usc' ? M.FLAG_BLUE : M.FLAG_RED;
  for (let x = -R0; x <= R0; x++) for (let y = GYO - 3; y <= -PL_H + 4; y++){
    const z0 = -PL_H - y, r = R0 + (R1 - R0) * clamp(z0 / TOWER_H, 0, 1);
    if (Math.abs(x) > r + .5) continue;
    const xn = clamp(x / (r + .5), -1, 1), ang = Math.asin(xn), cs = Math.sqrt(1 - xn * xn);
    const z = z0 + 0.45 * r * cs;
    if (z < 0 || z > TOWER_H) continue;
    let c;
    if (Math.abs(x) >= Math.round(r) || z > TOWER_H - 1) c = z < 8 ? 0 : 1;
    else if (z < 0.9) c = 0;
    else {
      const bp = ((z / 12 + ang / Math.PI * 0.8 + rot + 0.15) % 1 + 1) % 1, band = bp < 0.34;
      const light = clamp(1.05 - 0.62 * (xn + 0.25), 0.3, 1);
      c = band ? ((bp < 0.05 && xn < 0.2) ? 1 : 0) : (bay(x, y) < light * 16 ? 1 : 0);
      if (z < 6.5 && x >= -2 && x <= 1 && Math.cos(cam.phi + .8) > .2) c = (z > 5.6 && (x === -2 || x === 1)) ? c : 0;
    }
    P(x, y, c);
  }
}
export function drawLantern(a: number, b: number): void {
  const [ox, oy] = lhBase(a, b), g = GYO;
  SH.CUR = M.LAMP;
  const P = (x: number, y: number, c: number): void => fput(ox + x, oy + y, c);
  for (let x = -7; x <= 7; x++) P(x, g, 1);
  for (let x = -6; x <= 6; x++) P(x, g + 1, (x & 1) ? 0 : 1);
  for (let x = -3; x <= 3; x++) P(x, g - 1, 0);
  for (let y = g - 7; y <= g - 2; y++) for (let x = -3; x <= 3; x++) P(x, y, Math.abs(x) === 3 ? 0 : 1);
  for (let k = 0; k < 4; k++){ const an = state.theta * 2 - cam.phi * 2 + k * Math.PI / 2; if (Math.cos(an) > 0.25){ const mx = Math.round(2.3 * Math.sin(an)); for (let y = g - 7; y <= g - 2; y++) P(mx, y, 0); } }
  for (let x = -7; x <= 7; x++) if (x < -3 || x > 3) P(x, g - 3, 1);
  for (const x of [-7, -5, 5, 7]){ P(x, g - 2, 1); P(x, g - 1, 1); }
  for (let x = -4; x <= 4; x++) P(x, g - 8, 1);
  [4, 3, 2, 1].forEach((hw, r) => { const y = g - 9 - r; for (let x = -hw; x <= hw; x++) P(x, y, x === -hw ? 1 : x === hw ? 0 : (bay(x, y) < 5 ? 1 : 0)); });
  P(0, g - 13, 1); P(0, g - 14, 1); P(-1, g - 15, 1); P(0, g - 15, 1); P(1, g - 15, 1);
}
export function drawGlow(a: number, b: number, t: number): void {
  const [ox, oy] = lhBase(a, b), lx = ox, ly = oy + GYO - 5;
  SH.CUR = M.LAMP;
  const va = (PC + PS) / Math.SQRT2, vb = (PC - PS) / Math.SQRT2;
  const flash = Math.pow(Math.abs(Math.cos(state.theta) * va + Math.sin(state.theta) * vb), 10);
  const R = 6 + 12 * flash + 0.6 * Math.sin(t * 9), ri = Math.ceil(R * 1.2);
  for (let dy = -ri; dy <= ri; dy++) for (let dx = -ri; dx <= ri; dx++){
    const q = Math.hypot(dx / 1.18, dy) / R; if (q >= 1) continue;
    const tone = Math.pow(1 - q, 1.6) * (0.6 + 0.4 * flash), x = lx + dx, y = ly + dy;
    if (bz(x, y) < tone * 16) fput(x, y, 1);
  }
}

/* ================= lampadaires le long des routes ================= */
export const LAMP_POS: Vec2[] = [];
export function drawLampHeads(): void {
  SH.CUR = M.LAMP;
  for (const [a, b] of LAMP_POS){
    const p = prj(a, b, 0), hx = Math.round(p[0]) + 3, hy = Math.round(p[1]) - 13;
    if (hx < -6 || hy < -6 || hx > W + 6 || hy > H + 6) continue;
    for (let dy = -3; dy <= 3; dy++) for (let dx = -4; dx <= 4; dx++){
      const q = Math.hypot(dx / 1.2, dy) / 3.6; if (q >= 1) continue;
      if (bz(hx + dx, hy + dy) < (1 - q) * 14) fput(hx + dx, hy + dy, 1);
    }
  }
}

/* ================= le voilier qui fait le tour de l'ile, au large ================= */
export function sailPos(t: number): Vec2 { const ph = t * 0.01 + 1.2, c = Math.cos(ph), s = Math.sin(ph); return [IS.ca + (ISEED.ea + 190) * Math.sign(c) * Math.sqrt(Math.abs(c)), IS.cb + (ISEED.eb + 150) * Math.sign(s) * Math.sqrt(Math.abs(s))]; }
export function drawSailboat(t: number): void {
  const [a, b] = sailPos(t), [a2, b2] = sailPos(t + 1);
  const p = prj(a, b, 0), q = prj(a2, b2, 0);
  const bx = Math.round(p[0]), f = (q[0] - p[0]) >= 0 ? 1 : -1;
  const by = Math.round(p[1]) + (Math.sin(t * 2.2) > 0.35 ? -1 : 0);
  const P = (x: number, y: number, c: number): void => fput(bx + x * f, by + y, c);
  SH.CUR = M.PIER;
  for (let x = -7; x <= 8; x++) P(x, -2, 1);
  for (let x = -7; x <= 7; x++) P(x, -1, (x === -7 || x === 7) ? 1 : 0);
  for (let x = -6; x <= 6; x++) P(x, 0, (x === -6 || x === 6) ? 1 : 0);
  for (let x = -5; x <= 5; x++) P(x, 1, 1);
  SH.CUR = M.NEUTRAL;
  for (let y = -17; y <= -3; y++) P(0, y, 1);
  for (let y = -16; y <= -4; y++){ const w = Math.floor((y + 17) * 0.52); for (let x = 1; x <= w; x++){ const e = x === w || y === -4; P(x, y, e ? 0 : (x > w - 2 && bay(x, y) > 8 ? 0 : 1)); } }
  for (let y = -14; y <= -4; y++){ const w = Math.floor((y + 15) * 0.4); for (let x = 1; x <= w; x++){ const e = x === w || y === -4; P(-x, y, e ? 0 : (bay(x, y) < 11 ? 1 : 0)); } }
}

/* ================= vestiges catzi : ruines d'un ancien regime dechu, a fouiller ================= */
// Avant les deux camps, l'ile etait tenue par le regime catzi de Catdolf. Il en reste des ruines dans la nature.
// Une fois dans son territoire, on les fouille : elles rapportent des ressources et liberent le terrain.
export type VestKind = 'bunker' | 'canon' | 'depot' | 'statue';
export interface VestDef { name: string; loot: { c: number; l: number; r: number }; desc: string }
/** Un vestige sur la carte : sa sorte, sa position, son orientation, et s'il a deja ete fouille. */
export interface Vestige { id: number; kind: VestKind; a: number; b: number; ang: number; looted: boolean; vest: true }
export const VEST_DEF: Record<VestKind, VestDef> = {
  bunker: { name: 'Bunker catzi', loot: { c: 30, l: 40, r: 0 }, desc: 'Un bunker de béton de l’ancien régime catzi. Dedans : des rations et des pelotes de laine militaire.' },
  canon: { name: 'Canon rouillé', loot: { c: 0, l: 30, r: 10 }, desc: 'Un vieux canon catzi qui ne tirera plus jamais. On le démonte pour la ferraille.' },
  depot: { name: 'Dépôt abandonné', loot: { c: 60, l: 15, r: 0 }, desc: 'Des caisses oubliées par l’armée catzi. Les croquettes sont encore bonnes, ou presque.' },
  statue: { name: 'Statue renversée de Catdolf', loot: { c: 0, l: 80, r: 60 }, desc: 'L’ancien chef catzi, tombé de son socle depuis longtemps. Fondue, elle rapporte gros, et tout le monde est content de la voir disparaître.' }
};
export let VEST: Vestige[] = [];
export function buildVestiges(seed: number): void {
  VEST = [];
  // une statue de Catdolf ; les autres vestiges sont d'autant plus nombreux que la carte est grande
  const base: VestKind[] = ['bunker', 'bunker', 'bunker', 'bunker', 'canon', 'canon', 'canon', 'depot', 'depot', 'depot'], reps = Math.max(1, Math.round(mapScale() * mapScale() * .8));
  const kinds: VestKind[] = ['statue']; for (let r = 0; r < reps; r++) kinds.push(...base);
  for (let k = 0, tries = 0; k < kinds.length && tries < 900 * reps; tries++){
    const a = IS.ca + (hash2(seed + tries * 7, 31) - .5) * ISEED.ea * 1.9, b = IS.cb + (hash2(seed - tries * 5, 57) - .5) * ISEED.eb * 1.9;
    const t = baseAt(a, b);
    if ((t !== T_GRASS && t !== T_FOREST) || landDAt(a, b) < 14) continue;
    if (VEST.some(v => Math.hypot(v.a - a, v.b - b) < 110)) continue;
    let nearPeak = false; peaksIn(a - 30, a + 30, b - 30, b + 30, (pk) => { if (Math.hypot(pk.a - a, pk.b - b) < pk.R + 12) nearPeak = true; }); if (nearPeak) continue;
    VEST.push({ id: k, kind: kinds[k], a: Math.round(a), b: Math.round(b), ang: Math.floor(hash2(a, b) * 4) * Math.PI / 2, looted: false, vest: true });
    cutTrees(a - 16, a + 34, b - 14, b + 20);
    k++;
  }
}
export const vestAt = (a: number, b: number, r?: number): Vestige | null => { let best: Vestige | null = null, bd = r || 8; for (const v of VEST){ if (v.looted) continue; const d = Math.hypot(v.a + (v.kind === 'statue' ? 10 : 0) - a, v.b + (v.kind === 'statue' ? 5 : 0) - b); if (d < bd){ bd = d; best = v; } } return best; };
export function vestDrawables(out: Drawable[]): void {
  const s = SC;
  for (const v of VEST){
    if (v.looted) continue;
    const q = prj(v.a, v.b, 0); if (q[0] < -30 * s || q[0] > W + 30 * s || q[1] < -10 * s || q[1] > H + 40 * s) continue;
    out.push({ d: dep(v.a, v.b), m: M.CONCRETE, f: () => drawVestige(v), a: v.a, b: v.b, key: v, still: true });
  }
}
// dessins : tout reste bas et abime, rien d'autre que des ruines
export function drawVestige(v: { kind: VestKind; a: number; b: number; ang: number }): void {
  const a = v.a, b = v.b, rough = (x: number, y: number): number => bz(x, y) < 5 ? 0 : 1;
  if (v.kind === 'bunker'){
    SH.CUR = M.CONCRETE; SH.ACC = M.METAL;
    boxS(a - 9, a + 9, b - 6.5, b + 6.5, 0, 5, (u, h, x, y, k) => (h > 2.2 && h < 3.4 && u > 3 && u < ((k & 1) ? 10 : 15)) ? 5 : rough(x, y), (x, y) => bz(x, y) < 3 ? 0 : 1, 0);
    // un coin effondre, des blocs tombes et de la mousse sur le toit
    boxS(a + 10, a + 13, b + 3, b + 6, 0, 1.6, 0, 1, 0); boxS(a - 13, a - 11, b - 4, b - 1.5, 0, 1.2, 0, 1, 0);
    SH.CUR = M.FOREST; boxS(a - 4, a + 2, b - 6.5, b - 3.5, 5, 5.5, 0, (x, y) => bz(x, y) < 8 ? 0 : 1, -1);
  } else if (v.kind === 'canon'){
    const c = Math.cos(v.ang), sn = Math.sin(v.ang);
    SH.CUR = M.MILITARY; boxS(a - 4.5, a + 4.5, b - 4.5, b + 4.5, 0, 2.2, (u, h, x, y) => rough(x, y), 1, 0);
    SH.CUR = M.METAL; for (const s2 of [-1, 1]) boxS(a - sn * 5 * s2 - 1.6, a - sn * 5 * s2 + 1.6, b + c * 5 * s2 - 1.6, b + c * 5 * s2 + 1.6, 0, 3.4, 0, 0, 0);
    SH.CUR = M.DIRT;
    for (let du = -.8; du <= .8; du += .4) for (let dv = -.8; dv <= .8; dv += .8) line3(a + du, b + dv, 3.4, a + du + c * 16, b + dv + sn * 16, 6.4, dv === 0 ? 1 : 0);
  } else if (v.kind === 'depot'){
    SH.CUR = M.PIER;
    for (const [da, db, hh] of [[-6, -4.5, 3.6], [0, -5, 3], [-5, 1.5, 3.4], [5, 2, 2], [0, 0, 6.6]]) boxS(a + da - 2.3, a + da + 2.3, b + db - 2.3, b + db + 2.3, hh > 6 ? 3.4 : 0, hh, (u, h, x, y) => (Math.floor(h * 1.2) % 2) ? 1 : 0, 1, 0);
    SH.CUR = M.MILITARY; drawFace([a - 9, b + 6, 0, a - 2, b + 7.5, 0, a - 2, b + 7.5, 2.6, a - 9, b + 6, 3.8], [0, 1, 0], (x, y) => bz(x, y) < 6 ? 0 : 1, 0);
  } else {
    // le socle vide, fissure, et la statue du chef couchee dans l'herbe a cote
    SH.CUR = M.CONCRETE; boxS(a - 6, a + 6, b - 6, b + 6, 0, 7, (u, h, x, y) => (Math.abs(u - 6 + h * .5) < .6 && h > 2) ? 0 : rough(x, y), 1, 0);
    SH.CUR = M.STATUE; SH.ACC = M.METAL;
    const sa = a + 8, sb = b + 9;
    // le corps couche, les pattes en l'air, la queue
    boxS(sa, sa + 15, sb - 3, sb + 3, 0, 5, (u, h, x, y) => bz(x, y) < 4 ? 0 : 1, 1, 0);
    for (const pu of [2, 11]) boxS(sa + pu, sa + pu + 2, sb + 3, sb + 7, 1.2, 3, 1, 1, 0);
    boxS(sa - 6, sa, sb - 1, sb + 1, 1, 2.4, 1, 1, 0);
    // la tete, ses oreilles pointues et la petite moustache carree
    boxS(sa + 15, sa + 21, sb - 3, sb + 3, 0, 6, (u, h, x, y, k) => (k === 1 && h > 1.6 && h < 2.6 && u > 2 && u < 4) ? 5 : (k === 1 && h > 3.4 && h < 4.2 && (Math.abs(u - 1.4) < .5 || Math.abs(u - 4.6) < .5)) ? 5 : 1, 1, 0);
    drawFace([sa + 16, sb - 3, 6, sa + 18.5, sb - 3, 6, sa + 17, sb - 3, 9], [0, -1, 0], 1, 0);
    drawFace([sa + 17.5, sb + 3, 6, sa + 20, sb + 3, 6, sa + 19, sb + 3, 9], [0, 1, 0], 1, 0);
  }
}

// appeles depuis des modules plus petits en numero
Object.assign(SH, { drawLighthouse });
