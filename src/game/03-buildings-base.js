import { SH } from './00-shared.ts';
import { COLOR, M, ROOF_OF, UP, bay, boxS, bz, clamp, drawFace, faceVisible, fput, gableRoof, gableWalls, hash2, lineS, makeSprite, moonDot, plateW, prj, wallFace, win, winColor } from './01-core.js';
/* ================= decor : aides ================= */
export const SIDE_N = [[0,1,0],[1,0,0],[0,-1,0],[-1,0,0]];
export const WALL_T = SIDE_N.map(n => COLOR ? 0 : 2.4 * Math.max(0, moonDot(n)));
[[M.USC, M.ROOF_USC], [M.USC2, M.ROOF_USC2], [M.USC3, M.ROOF_USC3], [M.USC4, M.ROOF_USC2], [M.USC5, M.ROOF_USC], [M.CCP, M.ROOF_CCP], [M.CCP2, M.ROOF_CCP], [M.CCP3, M.ROOF_CCP], [M.BRICK, M.ROOF_USC], [M.SANDSTONE, M.ROOF_USC2]].forEach(([w, r]) => ROOF_OF[w] = r);
export const wallBase = (k, x, y) => bz(x, y) < WALL_T[k] ? 1 : 0;
export const Lc = (a, b, r, k) => ({ kind: 'circle', a, b, r, k: k || 1.1, att: .9 });
export const part = (a, b, zb, draw) => ({ a, b, zb: zb || 0, draw });
export function sideLight(a0, a1, b0, b1, k, r, kk){
  const n = SIDE_N[k], ca = (a0 + a1) / 2, cb = (b0 + b1) / 2;
  return Lc(ca + n[0] * ((a1 - a0) / 2 + 4), cb + n[1] * ((b1 - b0) / 2 + 4), r || 7, kk);
}
export const frontVisible = (k) => faceVisible(SIDE_N[k]);
// enseigne de facade lisible des deux cotes : sur la face +b quand on la voit, sinon sur la face -b
export function facadePlate(s, a, bFront, bBack, z, opt){ return plateW(s, a, frontVisible(0) ? bFront : bBack, z, opt); }
// coordonnee le long d'un segment projete, pour les stores rayes
export function alongSh(pa, pb, pz, qa, qb, qz, L, fn){
  const P = prj(pa, pb, pz), Q = prj(qa, qb, qz), ex = Q[0] - P[0], ey = Q[1] - P[1], ee = ex * ex + ey * ey || 1;
  return (x, y) => fn(((x + .5 - P[0]) * ex + (y + .5 - P[1]) * ey) / ee * L, x, y);
}
export function smokeAt(px, py, t, seed){
  const savedM = SH.CUR; SH.CUR = M.SMOKE;
  smokeAt2(px, py, t, seed); SH.CUR = savedM;
}
export function smokeAt2(px, py, t, seed){
  for (let k = 0; k < 3; k++){
    const p = ((t * 0.17 + k / 3 + seed * .21) % 1);
    const x = Math.round(px + p * 8 + Math.sin(t * 1.3 + k + seed) * 1.2), y = Math.round(py - p * 16);
    const tone = (1 - p) * 0.8;
    const pts = p < 0.3 ? [[0,0]] : [[0,0],[1,0],[-1,0],[0,1],[0,-1]];
    for (const [dx, dy] of pts) if (bz(x + dx, y + dy) < tone * 16) fput(x + dx, y + dy, 1);
  }
}
// sprite dessine en caracteres : # blanc, . noir, + trame, espace transparent. Contour noir automatique.
export function artSprite(rows){
  return makeSprite(put => {
    const h = rows.length, w = Math.max(...rows.map(r => r.length));
    const at = (x, y) => (y >= 0 && y < h && x >= 0 && x < rows[y].length) ? rows[y][x] : ' ';
    for (let y = -1; y <= h; y++) for (let x = -1; x <= w; x++){
      const c = at(x, y);
      if (c === ' '){ if (at(x-1,y) !== ' ' || at(x+1,y) !== ' ' || at(x,y-1) !== ' ' || at(x,y+1) !== ' ') put(x - (w >> 1), y - h, 0); continue; }
      put(x - (w >> 1), y - h, c === '#' ? 1 : c === '.' ? 0 : (bay(x, y) < 8 ? 1 : 0));
    }
  });
}
// le meme arbre redessine directement en petit pour la vue de loin (au lieu d'etre reduit) :
// il garde un tronc d'au moins un pixel et un feuillage rond, a toutes les distances
export const TREE_SPR_SC = {};
export function treeSprSc(r, s){
  const q = Math.max(1, Math.round(s * 20)), key = r + ':' + q; if (TREE_SPR_SC[key]) return TREE_SPR_SC[key];
  s = q / 20;
  // tres loin, l'arbre garde sa vraie taille : un point de feuillage (et un pixel de tronc tant qu'il en a la hauteur),
  // sinon la foret recouvrirait l'herbe, les cotes et les montagnes (treeDrawables n'en garde qu'une part, selon sa surface)
  if ((r + 1) * s < 1.1) return TREE_SPR_SC[key] = makeSprite(put => { const th = Math.round(4 * s); if (th > 0) put(0, 0, 0); put(0, -Math.min(th, 1), r === 4 ? 1 : 0); });
  return TREE_SPR_SC[key] = makeSprite(put => {
    const tw = Math.max(1, Math.round(2 * s)), th = Math.max(2, Math.round(4 * s));
    for (let y = -th + 1; y <= 0; y++) for (let x = 0; x < tw; x++) put(x, y, tw === 1 ? 0 : (x === 0 ? 1 : 0));
    const rx = Math.max(1, (r + 1) * s), ry = Math.max(1, r * s), cy = -th + 1 - Math.ceil(ry) - 1;
    for (let dy = -Math.ceil(ry); dy <= Math.ceil(ry); dy++) for (let dx = -Math.ceil(rx); dx <= Math.ceil(rx); dx++){
      const e = (dx / (rx + .5)) ** 2 + (dy / (ry + .5)) ** 2; if (e > 1) continue;
      const tone = clamp(0.35 - (dx / rx) * .3 - (dy / ry) * .4, 0, 1);
      let c = bay(dx + 8, dy + 8) < tone * 6 ? 1 : 0;
      if (e > .6 && (dx <= 0 || dy <= 0) && rx > 1.5) c = 1;
      put(dx + (tw > 1 ? 0 : 0), cy + dy, c);
    }
  });
}
export const TREE_SPR = {};
export function treeSpr(r){
  if (TREE_SPR[r]) return TREE_SPR[r];
  return TREE_SPR[r] = makeSprite(put => {
    for (let y = -3; y <= 0; y++){ put(0, y, 1); put(1, y, 0); }
    const cy = -r - 3, rx = r + 1, ry = r;
    for (let dy = -ry; dy <= ry; dy++) for (let dx = -rx; dx <= rx; dx++){
      const q = (dx / (rx + .5)) ** 2 + (dy / (ry + .5)) ** 2; if (q > 1) continue;
      const tone = clamp(0.35 - (dx / rx) * .3 - (dy / ry) * .4, 0, 1);
      let c = bay(dx + 8, dy + 8) < tone * 6 ? 1 : 0;
      if (q > .7 && (dx <= 0 || dy <= 0) && bay(dx + 8, dy + 8) < 12) c = 1;
      put(dx, cy + dy, c);
    }
  });
}
export const LAMP_SPR = makeSprite(put => {
  put(-1, 0, 1); put(0, 0, 1); put(1, 0, 1);
  for (let y = -13; y < 0; y++){ put(0, y, 1); put(1, y, 0); }
  put(1, -14, 1); put(2, -14, 1);
  for (let x = 2; x <= 4; x++) put(x, -13, 1);
  put(3, -12, 1); put(3, -14, 0);
});
// petit chat de file d'attente (silhouette)
export const QUEUE_CAT = artSprite(['# #', '###', '.#.', '###', '###', '# #']);

/* ================= maisons ================= */
export function drawHouse(g){
  const { a0, a1, b0, b1, hh, rh, axis, lit, door } = g;
  const L = [a1 - a0, b1 - b0, a1 - a0, b1 - b0];
  gableWalls(a0, a1, b0, b1, hh, rh, axis, (u, h, x, y, k) => {
    const len = L[k];
    if (h < hh){
      if (k === door){ const d0 = len / 2 - 1.5; if (u >= d0 && u < d0 + 3 && h < 5.5) return (u < d0 + .6 || u >= d0 + 2.4 || h >= 5) ? 1 : 0; }
      if (len >= 12){
        let kk = win(u, h, 2, 2.5, 3, 4) || win(u, h, len - 5, 2.5, 3, 4);
        if (!kk && len >= 22 && k !== door) kk = win(u, h, len / 2 - 1.5, 2.5, 3, 4);
        if (kk) return winColor(kk, lit[k], x, y);
      } else if (k !== door){ const kk = win(u, h, len / 2 - 1.5, 2.5, 3, 4); if (kk) return winColor(kk, lit[k], x, y); }
    } else {
      const kk = win(u, h, len / 2 - 1, hh + 1.2, 2, 2); if (kk) return kk === 'in' ? (lit[k] ? 3 : 0) : 1;
    }
    return wallBase(k, x, y);
  });
  gableRoof(a0, a1, b0, b1, hh, rh, axis, 1, 7, 1);
}
export function houseGeo(ca, cb, la, lb, hh, rh, seed, axis, door){
  const a0 = Math.round(ca - la / 2), b0 = Math.round(cb - lb / 2);
  const lit = [0, 1, 2, 3].map(j => hash2(seed * 31 + j, 97) < .55);
  return { a0, a1: a0 + la, b0, b1: b0 + lb, hh, rh, axis: axis || 'a', lit, door: door == null ? 0 : door, ca, cb };
}
export function houseLights(g){ const out = []; for (let k = 0; k < 4 && out.length < 2; k++) if (g.lit[k]) out.push(sideLight(g.a0, g.a1, g.b0, g.b1, k, 6, 1)); return out; }
export function antennaAt(g){
  const p = g.axis === 'a' ? prj(g.a0 + (g.a1 - g.a0) * .3, (g.b0 + g.b1) / 2, g.hh + g.rh) : prj((g.a0 + g.a1) / 2, g.b0 + (g.b1 - g.b0) * .3, g.hh + g.rh);
  const x = Math.round(p[0]), y = Math.round(p[1]);
  const savedM = SH.CUR; SH.CUR = M.METAL;
  for (let k = 1; k <= 7; k++) fput(x, y - k, 1);
  for (let d = -3; d <= 3; d++) fput(x + d, y - 7, 1);
  for (let d = -2; d <= 2; d++) fput(x + d, y - 5, 1);
  fput(x - 3, y - 8, 1); fput(x + 3, y - 8, 1);
  SH.CUR = savedM;
}
export function chimneyOf(g){ return g.axis === 'a' ? [g.a0 + (g.a1 - g.a0) * .75, (g.b0 + g.b1) / 2] : [(g.a0 + g.a1) / 2, g.b0 + (g.b1 - g.b0) * .75]; }
export function drawChimney(g, t, seed){
  const [c0, c1] = chimneyOf(g), zt = g.hh + g.rh + 3;
  boxS(c0 - 1, c0 + 1, c1 - 1, c1 + 1, g.hh + g.rh - 2, zt, 0, 1);
  const p = prj(c0, c1, zt); smokeAt(p[0], p[1] - 1, t, seed);
}
// barriere blanche en bois, visible des deux cotes
export function picket(pa, pb, qa, qb){
  const fn = (u, h) => (h >= 1 && h < 1.5) ? 1 : ((Math.floor(u * 1.5) & 1) === 0 && h < 2.6 ? 1 : -1);
  SH.CUR = M.NEUTRAL;
  if (!wallFace(pa, pb, qa, qb, 0, 2.6, fn, -1)) wallFace(qa, qb, pa, pb, 0, 2.6, fn, -1);
}

/* ================= voitures ================= */
// axe de deplacement 'a' ou 'b', dir +1 / -1, style usc (ailerons) ou ccp (berline carree)
export function drawCar(a, b, axis, dir, style){
  const la = 6, lb = 3.4;
  const A0 = axis === 'a' ? a - la : a - lb, A1 = axis === 'a' ? a + la : a + lb;
  const B0 = axis === 'a' ? b - lb : b - la, B1 = axis === 'a' ? b + lb : b + la;
  const fa = axis === 'a' ? dir : 0, fb2 = axis === 'b' ? dir : 0;
  const usc = style === 'usc';
  SH.CUR = usc ? M.CAR_USC : M.CAR_CCP;
  const body = usc ? ((u, h, x, y) => h < 1.2 ? 1 : (bz(x, y) < 6 ? 1 : 0)) : ((u, h, x, y) => h < .8 ? 1 : (bz(x, y) < 2 ? 1 : 0));
  boxS(A0, A1, B0, B1, .8, usc ? 3.4 : 3.8, body, usc ? ((x, y) => bz(x, y) < 11 ? 1 : 0) : ((x, y) => bz(x, y) < 4 ? 1 : 0), 1);
  // habitacle, recule vers l'arriere
  const off = usc ? -1.2 : -.4, cl = usc ? 2.6 : 3.2, cw = lb - .7;
  const ca = a + fa * off, cb = b + fb2 * off;
  const C0 = axis === 'a' ? ca - cl : ca - cw, C1 = axis === 'a' ? ca + cl : ca + cw;
  const D0 = axis === 'a' ? cb - cw : cb - cl, D1 = axis === 'a' ? cb + cw : cb + cl;
  boxS(C0, C1, D0, D1, usc ? 3.4 : 3.8, usc ? 5.6 : 6.6, (u, h) => (h > .5 && h < 1.8) ? 1 : 0, 1, 1);
  if (usc){
    // ailerons arriere
    for (const s of [-1, 1]){
      const ra = a - fa * (la - 1.2), rb = b - fb2 * (la - 1.2);
      const pa = axis === 'a' ? ra : a + s * (lb - .3), pb = axis === 'a' ? b + s * (lb - .3) : rb;
      const q = prj(pa, pb, 3.4), r = prj(pa - fa * 1.2, pb - fb2 * 1.2, 5.2);
      lineS(q[0], q[1], r[0], r[1], 1);
    }
  } else {
    const q = prj(a, b, 6.6); fput(Math.round(q[0]), Math.round(q[1]) - 1, 1);
  }
  // phares avant
  SH.CUR = M.LAMP;
  for (const s of [-1, 1]){
    const pa = axis === 'a' ? a + fa * la : a + s * (lb - 1), pb = axis === 'a' ? b + s * (lb - 1) : b + fb2 * la;
    if (faceVisible([fa, fb2, 0])){ const p = prj(pa, pb, 2); fput(Math.round(p[0]), Math.round(p[1]), 1); }
  }
}

/* ================= objets tournes : voitures en courbe, coques de bateaux ================= */
export const rot2 = (a, b, ang, u, v) => { const c = Math.cos(ang), s = Math.sin(ang); return [a + u * c - v * s, b + u * s + v * c]; };
// boite tournee : coins dans l'ordre de boxS pour que les normales sortent
export function rbox(a, b, ang, u0, u1, v0, v1, z0, z1, side, top, edge){
  const P = [[u0, v1], [u1, v1], [u1, v0], [u0, v0]].map(([u, v]) => rot2(a, b, ang, u, v)), e = edge == null ? 1 : edge;
  for (let i = 0; i < 4; i++){ const p = P[i], q = P[(i + 1) & 3]; wallFace(p[0], p[1], q[0], q[1], z0, z1, side, e); }
  if (top != null) drawFace([P[3][0], P[3][1], z1, P[2][0], P[2][1], z1, P[1][0], P[1][1], z1, P[0][0], P[0][1], z1], UP, top, e);
}
// voiture dans n'importe quelle direction (ang : cap au sol)
export function drawCarAng(a, b, ang, style){
  const usc = style === 'usc';
  SH.CUR = usc ? M.CAR_USC : M.CAR_CCP;
  rbox(a, b, ang, -6, 6, -3.4, 3.4, .8, usc ? 3.4 : 3.8, usc ? ((u, h, x, y) => h < 1.2 ? 1 : (bz(x, y) < 6 ? 1 : 0)) : ((u, h, x, y) => h < .8 ? 1 : (bz(x, y) < 2 ? 1 : 0)), usc ? ((x, y) => bz(x, y) < 11 ? 1 : 0) : ((x, y) => bz(x, y) < 4 ? 1 : 0), 1);
  const off = usc ? -1.2 : -.4, cl = usc ? 2.6 : 3.2, cw = 2.7;
  rbox(a, b, ang, off - cl, off + cl, -cw, cw, usc ? 3.4 : 3.8, usc ? 5.6 : 6.6, (u, h) => (h > .5 && h < 1.8) ? 1 : 0, 1, 1);
  SH.CUR = M.LAMP;
  const da = Math.cos(ang), db = Math.sin(ang);
  if (faceVisible([da, db, 0])) for (const s of [-1, 1]){ const p = rot2(a, b, ang, 6, s * 2.4), q = prj(p[0], p[1], 2); fput(Math.round(q[0]), Math.round(q[1]), 1); }
}
// coque : poupe carree, proue en pointe
export function drawHull(a, b, ang, L, Wd, z0, z1, mat, deckMat, band){
  const h = L / 2, w = Wd / 2, bow = Math.min(L * .2, Wd * 1.1);
  const P = [[-h, w], [h - bow, w], [h, 0], [h - bow, -w], [-h, -w]].map(([u, v]) => rot2(a, b, ang, u, v));
  if (band != null){ SH.CUR = band; for (let i = 0; i < P.length; i++){ const p = P[i], q = P[(i + 1) % P.length]; wallFace(p[0], p[1], q[0], q[1], z0, z0 + 1, 0, 1); } }
  SH.CUR = mat;
  for (let i = 0; i < P.length; i++){ const p = P[i], q = P[(i + 1) % P.length]; wallFace(p[0], p[1], q[0], q[1], band != null ? z0 + 1 : z0, z1, (u, hh, x, y) => hh > (z1 - z0) - 1.3 ? 1 : (bz(x, y) < 3 ? 1 : 0), 1); }
  SH.CUR = deckMat;
  const pts = []; for (let i = P.length - 1; i >= 0; i--) pts.push(P[i][0], P[i][1], z1);
  drawFace(pts, UP, (x, y) => ((x + y) & 3) === 0 ? 0 : 1, 1);
}
export function bobZ(t, seed){ return Math.sin(t * 1.3 + seed) > .55 ? .6 : 0; }
// petit fanion de camp (bateaux, chantiers, piquets)
export function pennant(x, y, side, t, seed){
  SH.CUR = side === 'usc' ? M.FLAG_BLUE : M.FLAG_RED; const w = Math.round(Math.sin(t * 3 + (seed || 0)));
  for (let yy = 0; yy < 3; yy++) for (let xx = 1; xx <= 4; xx++) fput(x + xx, y + yy + (xx > 2 ? w : 0), side === 'usc' && yy === 1 && xx === 2 ? 1 : 0);
}
export const PED_FUR = [M.CAT, M.CAT_OR, M.CAT_GRAY, M.CAT_BLACK, M.CAT_SIAM];
