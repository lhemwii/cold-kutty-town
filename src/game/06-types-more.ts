import { SH, type Building, type Light, type Part } from './00-shared.ts';
import { COLOR, FONT, M, TAU, UP, boxS, bz, cam, clamp, dep, drawFace, drawFlagPole, drawStar, fput, gableRoof, gableWalls, hash2, line3, lineS, plateW, prj, wallFace } from './01-core.ts';
import { Lc, alongSh, bobZ, drawCar, drawHull, facadePlate, houseGeo, part, pennant, rbox, rot2, sideLight, wallBase } from './03-buildings-base.ts';
import { TYPES } from './04-types.ts';
/* ================= encore des batiments : gratte-ciel, kolkhoze, bulbes, metro... ================= */
// dome en bulbe dessine au pixel, rayures qui tournent avec la vue
export function drawDome(a: number, b: number, z0: number, r: number, hgt: number, mat: number, t: number, swirl: boolean){
  const C = prj(a, b, z0), cx = Math.round(C[0]), cy = Math.round(C[1]);
  const rx = r * 1.414, H = hgt;
  SH.CUR = mat;
  for (let hz = 0; hz <= H; hz++){
    const f = hz / H;
    const k = f < .55 ? (0.95 + 0.38 * Math.sin(f / .55 * Math.PI * .85)) : Math.max(0, 1.25 * (1 - f) / .45);
    const w = rx * k;
    for (let dx = -Math.ceil(w); dx <= Math.ceil(w); dx++){
      if (Math.abs(dx) > w + .3) continue;
      const xn = w > 0 ? dx / (w + .5) : 0;
      const edge = Math.abs(dx) >= Math.floor(w) || hz === 0;
      let v;
      if (edge) v = 0;
      else if (swirl) v = (Math.floor(Math.asin(clamp(xn, -1, 1)) * 2.2 + f * 5 + cam.phi * 1.4 + 20) & 1) ? 1 : 0;
      else v = (xn < -.3 && f > .15 && f < .6) ? 1 : (bz(cx + dx, cy - hz) < clamp(10 - (xn + .4) * 8, 1, 16) ? 1 : 0);
      fput(cx + dx, cy - hz, v);
    }
  }
  SH.CUR = M.DOME_A; fput(cx, cy - H - 1, 1); fput(cx, cy - H - 2, 1); fput(cx, cy - H - 3, 1);
}
// cylindre vertical (tambour, silo)
export function drawCyl(a: number, b: number, z0: number, r: number, hgt: number, top: boolean){
  const C = prj(a, b, z0), cx = Math.round(C[0]), cy = Math.round(C[1]);
  const rx = r * 1.414, ry = rx / 2;
  for (let dx = -Math.ceil(rx); dx <= Math.ceil(rx); dx++){
    const s = Math.sqrt(Math.max(0, 1 - (dx / (rx + .5)) ** 2)); if (s <= 0) continue;
    const yb = Math.round(cy + ry * s), yt = Math.round(cy - hgt + ry * s);
    for (let y = yt; y <= yb; y++){ const edge = Math.abs(dx) >= Math.floor(rx) || y === yb; fput(cx + dx, y, edge ? 1 : (bz(cx + dx, y) < clamp(6 - dx * .5, 0, 16) ? 1 : 0)); }
    if (top){ const yTop = Math.round(cy - hgt - ry * s); for (let y = yTop; y < yt; y++) fput(cx + dx, y, y === yTop ? 1 : 0); }
  }
  return [cx, cy - hgt];
}
export const tierBox = (ca: number, cb: number, hw: number, hb: number, z0: number, z1: number, style: string, seed: number) => boxS(ca - hw, ca + hw, cb - hb, cb + hb, z0, z1, (u: number, h: number, x: number, y: number, k: number) => {
  const H = z1 - z0;
  if (h > H - 1.1) return 1;
  if (style === 'deco'){
    if ((u % 2.6) < .55) return 1;
    return ((h % 3) < .7) ? 0 : ((COLOR && SH.DAY) || hash2(Math.floor(u / 2.6) + k * 13 + seed, Math.floor(h / 3) + z0) < .45 ? 3 : 0);
  }
  if ((u % 5) < .6) return 1;
  const cu = u % 2.5, ch = h % 3;
  if (cu > .8 && cu < 1.9 && ch > .8 && ch < 2.3) return ((COLOR && SH.DAY) || hash2(Math.floor(u / 2.5) + k * 7 + seed, Math.floor(h / 3) + z0) < .4) ? 3 : 0;
  return wallBase(k, x, y);
}, 0);
Object.assign(TYPES, {
  stalinien: { name: 'Gratte-ciel', nameCCP: 'Gratte-ciel du Peuple', fem: false, build(lot: Building, seed: number){
    const ca = lot.ca, cb = lot.cb;
    const spire = (t: number) => {
      SH.CUR = M.METAL; line3(ca, cb, 52, ca, cb, 66, 1);
      const p = prj(ca, cb, 66), x = Math.round(p[0]), y = Math.round(p[1]);
      SH.CUR = M.SIGN_CCP; drawStar(fput, x - 3, y - 7, 1, true);
    };
    const parts = [part(ca, cb, 0, () => tierBox(ca, cb, 16, 10, 0, 14, 'grid', seed)), part(ca, cb, .3, () => tierBox(ca, cb, 8.5, 7, 14, 32, 'grid', seed)),
      part(ca, cb, .5, () => tierBox(ca, cb, 5.5, 5, 32, 44, 'grid', seed)), part(ca, cb, .7, () => tierBox(ca, cb, 3.5, 3.5, 44, 52, 'grid', seed)), part(ca, cb, .9, spire)];
    for (const [da, db] of [[-13, -7], [13, -7], [-13, 7], [13, 7]]) parts.push(part(ca + da, cb + db, .4, () => { boxS(ca + da - 1.5, ca + da + 1.5, cb + db - 1.5, cb + db + 1.5, 14, 19, 1, 0); SH.CUR = M.METAL; line3(ca + da, cb + db, 19, ca + da, cb + db, 23, 1); }));
    return { parts, lights: [sideLight(ca - 16, ca + 16, cb - 10, cb + 10, 0, 10, 1.2), sideLight(ca - 16, ca + 16, cb - 10, cb + 10, 1, 9, 1.1)], shadowPts: [ca, cb, 66] };
  } },
  artdeco: { name: 'Gratte-ciel', nameCCP: 'Tour de bureaux', fem: false, build(lot: Building, seed: number){
    const ca = lot.ca, cb = lot.cb;
    const top = (t: number) => {
      SH.CUR = M.METAL; line3(ca, cb, 62, ca, cb, 78, 1);
      const p = prj(ca, cb, 78); SH.CUR = M.REDLIGHT;
      if (!(COLOR && SH.DAY) || (t % 2) < 1) fput(Math.round(p[0]), Math.round(p[1]) - 1, 1);
    };
    return { parts: [part(ca, cb, 0, () => tierBox(ca, cb, 11, 9, 0, 22, 'deco', seed)), part(ca, cb, .3, () => tierBox(ca, cb, 8, 6.5, 22, 40, 'deco', seed)),
      part(ca, cb, .5, () => tierBox(ca, cb, 5.5, 4.5, 40, 54, 'deco', seed)), part(ca, cb, .7, () => tierBox(ca, cb, 3.5, 3, 54, 62, 'deco', seed)), part(ca, cb, .9, top)],
      lights: [sideLight(ca - 11, ca + 11, cb - 9, cb + 9, 0, 9, 1.2), sideLight(ca - 11, ca + 11, cb - 9, cb + 9, 1, 9, 1.1)], shadowPts: [ca, cb, 78] };
  } },
  kolkhoze: { name: 'Ferme', nameCCP: 'Kolkhoze', fem: true, build(lot: Building, seed: number){
    const ccp = lot.side === 'ccp';
    const fa0 = lot.a0 + 2, fa1 = lot.a0 + 21, fb0 = lot.b0 + 2, fb1 = lot.b1 - 2;
    const field = () => {
      SH.CUR = M.WHEAT;
      drawFace([fa0, fb0, 0, fa1, fb0, 0, fa1, fb1, 0, fa0, fb1, 0], UP, alongSh(fa0, fb0, 0, fa0, fb1, 0, fb1 - fb0, (u, x, y) => (Math.floor(u / 1.4) & 1) ? 1 : 0), -1);
    };
    const g = houseGeo(lot.a1 - 8, lot.cb - 4, 10, 14, 7, 6, seed, 'b', 3);
    const barn = () => { SH.CUR = M.BRICK; gableWalls(g.a0, g.a1, g.b0, g.b1, g.hh, g.rh, 'b', (u, h, x, y, k) => { if (k === 3 && Math.abs(u - 7) < 2.2 && h < 5) return (Math.abs(u - 7) > 1.8 || h > 4.6) ? 1 : ((Math.floor(u + h) & 1) ? 1 : 0); return (Math.floor(u * 1.2) % 3 === 0) ? 1 : 0; }); gableRoof(g.a0, g.a1, g.b0, g.b1, g.hh, g.rh, 'b', 1, 6, 1); };
    const silo = () => { SH.CUR = M.METAL; drawCyl(lot.a1 - 5, lot.b1 - 6, 0, 3, 18, true); };
    const tractor = (t: number) => {
      const p = (Math.sin(t * .18 + seed) + 1) / 2, ta = fa0 + 2 + p * (fa1 - fa0 - 4), tb = fb0 + 3 + ((Math.floor(t * .06 + seed) % 5) * (fb1 - fb0 - 6) / 4);
      SH.CUR = ccp ? M.FLAG_RED : M.TREE;
      boxS(ta - 1.8, ta + 1.8, tb - 1.1, tb + 1.1, .8, 2.4, 0, 1);
      boxS(ta - 1.6, ta + .2, tb - 1, tb + 1, 2.4, 4.4, (u: number, h: number) => (h > .4 && h < 1.5) ? 3 : 0, 1);
      SH.CUR = M.METAL; const w = prj(ta - 1.2, tb + 1.2, .8); fput(Math.round(w[0]), Math.round(w[1]), 0); fput(Math.round(w[0]) + 1, Math.round(w[1]), 0);
    };
    return { parts: [part(g.ca, g.cb, 0, barn), part(lot.a1 - 5, lot.b1 - 6, 0, silo), part((fa0 + fa1) / 2, (fb0 + fb1) / 2, .2, tractor)], decals: [field],
      lights: [Lc(lot.a1 - 8, lot.cb + 6, 8, 1.1)], shadowPts: SH.circ(lot.a1 - 5, lot.b1 - 6, 3, 21, 8) };
  } },
  bulbes: { name: 'Chapelle', nameCCP: 'Musée à bulbes', fem: false, build(lot: Building, seed: number){
    const ca = lot.ca, cb = lot.cb;
    const base = () => boxS(ca - 8, ca + 8, cb - 8, cb + 8, 0, 10, (u: number, h: number, x: number, y: number, k: number) => {
      if (h > 8.8) return 1;
      const cu = u % 5.3; if (cu > 1.8 && cu < 3.5 && h > 2 && h < 6 + Math.sqrt(Math.max(0, .9 - (cu - 2.65) ** 2)) * 1.4) return 3;
      return (k === 0 && Math.abs(u - 8) < 1.6 && h < 5) ? 0 : wallBase(k, x, y);
    }, (x: number, y: number) => bz(x, y) < 3 ? 1 : 0);
    const domes = (t: number) => {
      SH.CUR = M.USC5; drawCyl(ca, cb, 10, 3.2, 8, false);
      drawDome(ca, cb, 18, 3.6, 13, M.DOME_A, t, false);
      const corners = [[-5.5, -5.5, M.DOME_C], [5.5, -5.5, M.DOME_B], [-5.5, 5.5, M.DOME_B], [5.5, 5.5, M.DOME_C]].map(([da, db, m]) => [ca + da, cb + db, m, dep(ca + da, cb + db)]);
      corners.sort((p, q) => p[3] - q[3]);
      for (const [a2, b2, m] of corners){ SH.CUR = M.USC5; drawCyl(a2, b2, 10, 1.8, 4, false); drawDome(a2, b2, 14, 2.2, 8, m, t, true); }
    };
    return { parts: [part(ca, cb, 0, base), part(ca, cb, .5, domes)], lights: [Lc(ca, cb + 12, 11, 1.2)], shadowPts: SH.circ(ca, cb, 3.6, 31, 8).concat(SH.circ(ca, cb, 8, 10, 8)) };
  } },
  grandmagasin: { name: 'Grand magasin', nameCCP: 'Grand Magasin du Peuple', fem: false, build(lot: Building, seed: number){
    const ccp = lot.side === 'ccp';
    const a0 = lot.a0 + 3, a1 = lot.a1 - 3, b0 = lot.cb - 9, b1 = lot.cb + 7;
    const body = () => boxS(a0, a1, b0, b1, 0, 12, (u: number, h: number, x: number, y: number, k: number) => {
      if (h > 10.8) return 1;
      const cu = u % 5;
      if (h < 5.5){ if (cu > .8 && cu < 4.2 && h < 3.2 + Math.sqrt(Math.max(0, 2.9 - (cu - 2.5) ** 2))) return 3; return (cu < .8 || cu > 4.2) ? 1 : 0; }
      if (h > 6.5 && h < 9 && cu > 1.2 && cu < 3.8) return ((COLOR && SH.DAY) || hash2(Math.floor(u / 5) + k, seed) < .5) ? 3 : 0;
      return wallBase(k, x, y);
    }, (x: number, y: number) => ((x + y) & 3) === 0 ? 1 : 3);
    const sign = () => facadePlate(ccp ? 'GRAND MAGASIN' : 'MAGASIN', (a0 + a1) / 2, b1, b0, 13);
    return { parts: [part(lot.ca, lot.cb - 1, 0, body), part(lot.ca, lot.cb - 1, .4, sign)], lights: [Lc(lot.ca, b1 + 7, 14, 1.3)] };
  } },
  supermarche: { name: 'Supermarché', nameCCP: 'Univermag', fem: false, build(lot: Building, seed: number){
    const ccp = lot.side === 'ccp';
    const a0 = lot.a0 + 3, a1 = lot.a1 - 3, b0 = lot.b0 + 2, b1 = lot.b0 + 13;
    const body = () => boxS(a0, a1, b0, b1, 0, 7, (u: number, h: number, x: number, y: number, k: number) => {
      if (h > 6) return (Math.floor(u) & 1) ? 1 : 4;
      if (k === 0 && h > 1 && h < 4.6 && u > 2 && u < (a1 - a0) - 2) return (Math.floor(u) % 4 === 0) ? 1 : 3;
      return wallBase(k, x, y);
    }, 0);
    const lot2 = () => {
      SH.CUR = M.ROAD;
      drawFace([a0, b1 + 1, 0, a1, b1 + 1, 0, a1, lot.b1 - 1, 0, a0, lot.b1 - 1, 0], UP, alongSh(a0, b1 + 1, 0, a1, b1 + 1, 0, a1 - a0, (u) => ((u % 4.5) < .45) ? 1 : 0), -1);
    };
    const sign = () => {
      SH.CUR = M.METAL; const p = prj(a1 - 1, b1 + 2, 0), x = Math.round(p[0]), y = Math.round(p[1]);
      for (let k = 0; k < 18; k++) fput(x, y - k, 1);
      plateW(ccp ? 'UNIVERMAG' : 'SUPER', a1 - 1, b1 + 2, 17);
      if (!ccp) plateW('MARCHE', a1 - 1, b1 + 2, 8);
    };
    SH.ACC = ccp ? M.FLAG_RED : M.FLAG_RED;
    const parts = [part(lot.ca, (b0 + b1) / 2, 0, () => { SH.ACC = M.FLAG_RED; body(); }), part(a1 - 1, b1 + 2, .2, sign)];
    const n = ccp ? 2 : 5;
    for (let k = 0; k < n; k++){ const ca = a0 + 2.25 + k * 4.5 + (k > 1 ? 4.5 : 0), cb = b1 + 8; if (hash2(seed, k) < .25) continue; parts.push(part(ca, cb, 0, () => drawCar(ca, cb, 'b', -1, lot.side))); }
    return { parts, decals: [lot2], lights: [Lc(lot.ca, b1 + 8, 15, 1.3)] };
  } },
  stade: { name: 'Stade de baseball', nameCCP: 'Stade du Peuple', fem: false, build(lot: Building, seed: number){
    const ccp = lot.side === 'ccp';
    const a0 = lot.a0 + 6, a1 = lot.a1 - 1, b0 = lot.b0 + 6, b1 = lot.b1 - 1, ca = (a0 + a1) / 2, cb = (b0 + b1) / 2;
    const pitch = () => {
      SH.CUR = M.FIELD;
      drawFace([a0, b0, 0, a1, b0, 0, a1, b1, 0, a0, b1, 0], UP, alongSh(a0, b0, 0, a1, b0, 0, a1 - a0, (u) => (Math.floor(u / 2.5) & 1) ? 1 : 0), 1);
      if (ccp){
        SH.CUR = M.NEUTRAL;
        const L = (p: number[], q: number[]) => { const P = prj(p[0], p[1], 0), Q = prj(q[0], q[1], 0); lineS(P[0], P[1], Q[0], Q[1], 1); };
        L([ca, b0 + 1], [ca, b1 - 1]); L([a0 + 1, b0 + 1], [a1 - 1, b0 + 1]); L([a0 + 1, b1 - 1], [a1 - 1, b1 - 1]); L([a0 + 1, b0 + 1], [a0 + 1, b1 - 1]); L([a1 - 1, b0 + 1], [a1 - 1, b1 - 1]);
        for (let k = 0; k < 24; k++){ const t2 = k * TAU / 24, p = prj(ca + Math.cos(t2) * 4, cb + Math.sin(t2) * 4, 0); fput(Math.round(p[0]), Math.round(p[1]), 1); }
      } else {
        SH.CUR = M.DIRT;
        drawFace([ca, b1 - 2, 0, ca + 8, b1 - 10, 0, ca, b1 - 18, 0, ca - 8, b1 - 10, 0], UP, 0, 1);
        SH.CUR = M.NEUTRAL;
        for (const [da, db] of [[0, -2], [8, -10], [0, -18], [-8, -10]]){ const p = prj(ca + da, b1 + db, 0); fput(Math.round(p[0]), Math.round(p[1]), 1); fput(Math.round(p[0]) + 1, Math.round(p[1]), 1); }
      }
    };
    const stands = () => {
      SH.CUR = M.CONCRETE; SH.ACC = ccp ? M.FLAG_RED : M.FLAG_BLUE;
      boxS(lot.a0 + 1, a1, lot.b0 + 1, b0 - 1, 0, 6, (u: number, h: number) => ((h % 1.5) < .5) ? 1 : 4, (x: number, y: number) => ((y & 1) ? 4 : 1));
      boxS(lot.a0 + 1, a0 - 1, b0 - 1, b1, 0, 6, (u: number, h: number) => ((h % 1.5) < .5) ? 1 : 4, (x: number, y: number) => ((y & 1) ? 4 : 1));
    };
    const towers = () => {
      SH.CUR = M.METAL;
      for (const [pa, pb] of [[a1, b0], [a1, b1], [a0, b1]]){ line3(pa, pb, 0, pa, pb, 18, 1); const p = prj(pa, pb, 18), x = Math.round(p[0]), y = Math.round(p[1]); SH.CUR = M.LAMP; for (let d = -2; d <= 2; d++){ fput(x + d, y - 1, 1); fput(x + d, y, (COLOR && SH.DAY) ? 0 : 1); } SH.CUR = M.METAL; }
    };
    return { parts: [part(lot.a0 + 3, lot.b0 + 3, 0, stands), part(a1, b1, .2, towers)], decals: [pitch], lights: [Lc(ca, cb, 16, 1.4), Lc(ca + 6, cb - 6, 10, 1.2)] };
  } },
  gare: { name: 'Gare centrale', nameCCP: 'Gare du Peuple', fem: true, build(lot: Building, seed: number){
    const ccp = lot.side === 'ccp', ca = lot.ca, cb = lot.cb, a0 = lot.a0, a1 = lot.a1, b0 = lot.b0, b1 = lot.b1;
    const hb0 = cb - 3, hb1 = b1 - 2;
    const hall = () => {
      boxS(ca - 15, ca + 15, hb0, hb1, 0, 12, (u: number, h: number, x: number, y: number, k: number) => {
        if (h > 11) return 1;
        if (h < .8) return 0;
        const cu = u % 4.2;
        if (cu < .7) return 1;
        if (h > 1.4 && h < 9.4 - (Math.abs(cu - 2.45) > 1.2 ? 1 : 0)) return 3;
        return wallBase(k, x, y);
      }, (x: number, y: number) => bz(x, y) < 3 ? 1 : 0, 1);
      // pavillon central et horloge
      boxS(ca - 5, ca + 5, hb0 - 1, hb1 - 2, 12, 19, (u: number, h: number, x: number, y: number, k: number) => h > 6.2 ? 1 : (h > 1 && h < 5.5 && Math.abs(u - 5) < 2.4 ? 3 : wallBase(k, x, y)), 1, 1);
      if (ccp){
        boxS(ca - 3, ca + 3, hb0 + 1, hb1 - 4, 19, 27, (u: number, h: number) => (h > 1 && h < 6.5 && (u % 2) < 1.2) ? 3 : 1, 1, 1);
        SH.CUR = M.ROOF_CCP; boxS(ca - 1.6, ca + 1.6, (hb0 + hb1) / 2 - 2.6, (hb0 + hb1) / 2 - .6, 27, 33, 0, 1, 0);
        SH.CUR = M.METAL; line3(ca, (hb0 + hb1) / 2 - 1.6, 33, ca, (hb0 + hb1) / 2 - 1.6, 40, 1);
      }
    };
    const clock = () => {
      const p = prj(ca, hb1 - 2, 16.5), x = Math.round(p[0]), y = Math.round(p[1]);
      SH.CUR = M.NEUTRAL;
      for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++){ const r = Math.hypot(dx, dy); if (r < 3.4) fput(x + dx, y + dy, r > 2.5 ? 0 : 1); }
      SH.CUR = M.METAL; fput(x, y, 0); fput(x, y - 1, 0); fput(x, y - 2, 0); fput(x + 1, y, 0); fput(x + 2, y, 0);
      SH.CUR_SIDE = lot.side; plateW(ccp ? 'GARE DU PEUPLE' : 'GARE CENTRALE', ca, hb0 - 1, 20);
      if (ccp){ const q = prj(ca, (hb0 + hb1) / 2 - 1.6, 40); SH.CUR = M.SIGN_CCP; drawStar(fput, Math.round(q[0]) - 3, Math.round(q[1]) - 6, 1, true); }
    };
    // quai et marquise le long de la voie
    const qb0 = b0 - 6, qb1 = b0 + 1.5;
    const quai = () => { SH.CUR = M.CONCRETE; boxS(a0, a1, qb0, qb1, 0, .8, (u: number, h: number) => h > .5 ? 1 : 0, (x: number, y: number) => 1, 0); };
    const marquise = () => {
      SH.CUR = M.METAL;
      for (let a = a0 + 3; a < a1; a += 7.5) line3(a, qb1 - .8, .8, a, qb1 - .8, 7, 1);
      SH.CUR = ccp ? M.CCP2 : M.GIRDER;
      boxS(a0 + 1, a1 - 1, qb0 + .4, qb1, 7, 7.7, 1, (x: number, y: number) => ((x + y) & 3) ? 1 : 0, 0);
    };
    return { parts: [part(ca, (hb0 + hb1) / 2, 0, hall), part(ca, (hb0 + hb1) / 2, .5, clock), part((a0 + a1) / 2, (qb0 + qb1) / 2, -.4, quai), part((a0 + a1) / 2, (qb0 + qb1) / 2, .1, marquise)],
      lights: [Lc(ca, qb0 + 2, 16, 1.3), Lc(ca, hb1 + 5, 12, 1.2)], shadowPts: [ca - 15, hb0, 12, ca + 15, hb0, 12, ca + 15, hb1, 12, ca - 15, hb1, 12, ca, (hb0 + hb1) / 2, ccp ? 40 : 19] };
  } },
  tribune: { name: 'Tribune de parade', nameCCP: 'Tribune du Défilé', fem: true, build(lot: Building, seed: number){
    const ccp = lot.side === 'ccp', ca = lot.ca, cb = lot.cb, a0 = lot.a0, a1 = lot.a1, b0 = lot.b0, b1 = lot.b1;
    // place pavee : gros paves gris, joints en losange
    const pave = () => {
      SH.CUR = M.ROCK;
      drawFace([a0 + 1, b0 + 1, 0, a1 - 1, b0 + 1, 0, a1 - 1, b1 - 1, 0, a0 + 1, b1 - 1, 0], UP, (x: number, y: number) => (((x + 2 * y) & 3) === 0 || ((x - 2 * y) & 7) === 0) ? 0 : 1, 0);
    };
    const tb = cb + 5;
    const stand = (t: number) => {
      SH.CUR = ccp ? M.ROOF_CCP : M.USC5;
      const face = (u: number, h: number, x: number, y: number, k: number) => (h % 3.2) < .45 ? 1 : 0;
      boxS(ca - 13, ca + 13, tb - 7, tb + 7, 0, 3.5, face, 1, 0);
      boxS(ca - 9.5, ca + 9.5, tb - 5, tb + 5, 3.5, 6.5, face, 1, 0);
      SH.CUR = M.CAT_BLACK;
      boxS(ca - 7, ca + 7, tb - 3.5, tb + 3.5, 6.5, 8.5, (u: number, h: number) => ((u % 2) < .6) ? 1 : 0, 0, -1);
      SH.CUR = ccp ? M.ROOF_CCP : M.USC5;
      boxS(ca - 5, ca + 5, tb - 2.5, tb + 2.5, 8.5, 11, face, 1, 0);
      // officiels en rang sur la tribune
      for (let k = -3; k <= 3; k++){ const p = prj(ca + k * 1.6, tb - 5.2, 6.5); SH.CUR = k === 0 ? M.FLAG_RED : M.CAT_GRAY; const x = Math.round(p[0]), y = Math.round(p[1]); fput(x, y - 1, 0); fput(x, y - 2, 0); fput(x, y - 3, 1); }
      // bandeau
      SH.CUR_SIDE = lot.side; plateW(ccp ? 'GLOIRE AU PEUPLE' : 'GOD BLESS KUTTY', ca, tb - 7, 2.5);
    };
    const flags = (t: number) => { for (const fa of [a0 + 3, a0 + 11, a1 - 11, a1 - 3]) drawFlagPole(fa, b0 + 2, 0, 16, ccp ? 'ccp' : 'usc', t + fa * .1); };
    const star = () => { if (!ccp) return; const p = prj(ca, tb, 11); SH.CUR = M.SIGN_CCP; drawStar(fput, Math.round(p[0]) - 3, Math.round(p[1]) - 9, 1, true); };
    return { parts: [part(ca, tb, 0, stand), part(ca, b0 + 2, .2, flags), part(ca, tb, .6, star)], decals: [pave], lights: [Lc(ca, tb - 9, 14, 1.2)],
      shadowPts: [ca - 13, tb - 7, 3.5, ca + 13, tb - 7, 3.5, ca + 13, tb + 7, 3.5, ca - 13, tb + 7, 3.5, ca - 5, tb - 2.5, 11, ca + 5, tb + 2.5, 11] };
  } },
  metro: { name: 'Métro', nameCCP: 'Métro du Peuple', fem: false, build(lot: Building, seed: number){
    const ccp = lot.side === 'ccp', ca = lot.ca, cb = lot.cb;
    if (ccp){
      const pav = () => boxS(ca - 8, ca + 8, cb - 6, cb + 6, 0, 8, (u: number, h: number, x: number, y: number, k: number) => {
        if (h > 6.8) return 1;
        if (k === 0 || k === 2){ const cu = u % 3.2; if (cu < .8) return 1; if (h < 5.2) return 3; }
        return wallBase(k, x, y);
      }, (x: number, y: number) => bz(x, y) < 4 ? 1 : 0);
      const sign = () => {
        const p = prj(ca, cb, 8), x = Math.round(p[0]), y = Math.round(p[1]);
        SH.CUR = M.METAL; for (let k = 0; k < 4; k++) fput(x, y - k, 1);
        SH.CUR = M.SIGN_CCP;
        for (let yy = -15; yy <= -4; yy++) for (let xx = -6; xx <= 6; xx++) fput(x + xx, y + yy, (Math.abs(xx) === 6 || yy === -15 || yy === -4) ? 1 : 0);
        const g = FONT['M']; for (let r = 0; r < 5; r++) for (let q = 0; q < 3; q++) if (g[r * 3 + q] === '1') for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) fput(x - 3 + q * 2 + dx, y - 14 + r * 2 + dy, 1);
      };
      return { parts: [part(ca, cb, 0, pav), part(ca, cb, .5, sign)], lights: [Lc(ca, cb + 9, 11, 1.3)] };
    }
    const hole = () => {
      SH.CUR = M.ROAD;
      drawFace([ca - 2, cb - 1, 0, ca + 2, cb - 1, 0, ca + 2, cb + 6, 0, ca - 2, cb + 6, 0], UP, alongSh(ca - 2, cb - 1, 0, ca - 2, cb + 6, 0, 7, (u) => ((u % 1.2) < .4) ? 1 : 0), 1);
    };
    const rail = () => {
      SH.CUR = M.TREE;
      for (const da of [-2.3, 2.3]){ line3(ca + da, cb - 1, 2.5, ca + da, cb + 6, 2.5, 1); line3(ca + da, cb - 1, 0, ca + da, cb - 1, 2.5, 1); line3(ca + da, cb + 6, 0, ca + da, cb + 6, 2.5, 1); }
      line3(ca - 2.3, cb - 1, 2.5, ca + 2.3, cb - 1, 2.5, 1);
      SH.CUR = M.METAL; const p = prj(ca + 4, cb - 2, 0), x = Math.round(p[0]), y = Math.round(p[1]);
      for (let k = 0; k < 12; k++) fput(x, y - k, 1);
      plateW('METRO', ca + 4, cb - 2, 11);
    };
    return { parts: [part(ca, cb + 2.5, 0, rail)], decals: [hole], lights: [Lc(ca, cb + 3, 9, 1.3)] };
  } }
});

/* ================= batiments du debarquement : QG, mer, frontiere ================= */
// direction de la mer pour les batiments de la cote : 0 = +b, 1 = +a, 2 = -b, 3 = -a
export const DIR_ANG = [Math.PI / 2, 0, -Math.PI / 2, Math.PI];
export const DIR_V = [[0, 1], [1, 0], [0, -1], [-1, 0]];
// ponton en bois sur pilotis, de u0 a u1 dans la direction de la mer
export function drawPier(ca: number, cb: number, ang: number, u0: number, u1: number, hw: number, z: number, mat?: number){
  SH.CUR = mat || M.PIER;
  for (let u = u0 + 2; u <= u1; u += 6) for (const s of [-1, 1]){ const p = rot2(ca, cb, ang, u, s * (hw - .4)); line3(p[0], p[1], -1, p[0], p[1], z, 0); }
  rbox(ca, cb, ang, u0, u1, -hw, hw, z - 1, z, (u: number, h: number) => h > .5 ? 1 : 0, mat === M.CONCRETE ? ((x: number, y: number) => bz(x, y) < 3 ? 0 : 1) : ((x: number, y: number) => ((x + y) & 3) ? 1 : 0), 1);
}
// cabane ou entrepot tourne, toit a une pente
export function drawShed(ca: number, cb: number, ang: number, u0: number, u1: number, v0: number, v1: number, hh: number, wallMat: number, roofMat: number, sign: string){
  SH.CUR = wallMat;
  rbox(ca, cb, ang, u0, u1, v0, v1, 0, hh, (u: number, h: number, x: number, y: number) => {
    if (h > hh - 1) return 1;
    if (h > 1.5 && h < 4 && (Math.floor(u) % 5 === 2)) return 3;
    return (Math.floor(u * 1.3) % 3 === 0) ? 1 : (bz(x, y) < 4 ? 1 : 0);
  }, null, 1);
  SH.CUR = roofMat;
  const P = [[u0 - .8, v1 + .8, hh], [u1 + .8, v1 + .8, hh], [u1 + .8, v0 - .8, hh + 2.5], [u0 - .8, v0 - .8, hh + 2.5]].map(([u, v, z]) => { const p = rot2(ca, cb, ang, u, v); return [p[0], p[1], z]; });
  drawFace([P[3][0], P[3][1], P[3][2], P[2][0], P[2][1], P[2][2], P[1][0], P[1][1], P[1][2], P[0][0], P[0][1], P[0][2]], [0, 0, 1], (x: number, y: number) => (Math.floor((x + 2 * y) / 2) % 3 === 0) ? 1 : 0, 1);
  if (sign){ const p = rot2(ca, cb, ang, (u0 + u1) / 2, v1); plateW(sign, p[0], p[1], hh - .5, null, [Math.cos(ang), Math.sin(ang)]); }
}
// grue de quai : pieds, cabine, fleche qui fait l'aller-retour
export function drawPortCrane(a: number, b: number, angShip: number, side: string, t: number, ph: number){
  const Hc = 15, s = 3;
  SH.CUR = side === 'usc' ? M.FLAG_RED : M.KVAS;
  for (const [da, db] of [[-s, -s], [s, -s], [s, s], [-s, s]]) line3(a + da, b + db, 0, a + da * .45, b + db * .45, Hc, 1);
  line3(a - s, b - s, 5, a + s, b - s, 5, 1); line3(a - s, b + s, 5, a + s, b + s, 5, 1);
  boxS(a - 2, a + 2, b - 2, b + 2, Hc, Hc + 4, 1, 1, 0);
  const cyc = ((t * .09 + ph) % 2 + 2) % 2, half = cyc < 1, f = half ? cyc : cyc - 1, e = f * f * (3 - 2 * f), angQuay = angShip + Math.PI;
  const ang = half ? angShip + (angQuay - angShip) * e : angQuay + (angShip - angQuay) * e;
  const L = 16, ja = a + Math.cos(ang) * L, jb = b + Math.sin(ang) * L;
  line3(a, b, Hc + 3, ja, jb, Hc + 2, 1); line3(a, b, Hc + 6, ja, jb, Hc + 2, 1);
  const hz = Hc + 1 - 11 * (1 - Math.sin(Math.PI * f));
  SH.CUR = M.METAL; line3(ja, jb, Hc + 2, ja, jb, hz, 0);
  if (half){ SH.CUR = [M.KVAS, M.MILITARY, M.PIER][Math.floor(t * .09 + ph) % 3]; boxS(ja - 1.6, ja + 1.6, jb - 1.2, jb + 1.2, hz - 2.4, hz, 1, 1); }
}
// cargo : cales, mats de charge, chateau a l'arriere
/** cargo a quai : position, cap, longueur, largeur */
export interface Cargo { a: number; b: number; ang: number; L: number; W: number; seed: number; side: string }
export function drawCargo(s: Cargo, t: number){
  const z = bobZ(t, s.seed), ang = s.ang, L = s.L;
  drawHull(s.a, s.b, ang, L, s.W, z, 4 + z, M.HULL, M.PIER, s.side === 'usc' ? M.FLAG_BLUE : M.FLAG_RED);
  SH.CUR = M.CHROME; rbox(s.a, s.b, ang, -L * .46, -L * .28, -s.W * .38, s.W * .38, 4 + z, 10 + z, 1, 1);
  for (let k = 0; k < 3; k++){ const u = -L * .16 + k * L * .17, m = [M.KVAS, M.MILITARY, M.PIER][(k + s.seed) % 3], hh = 2 + ((k + s.seed) % 2) * 2; SH.CUR = m; rbox(s.a, s.b, ang, u - L * .06, u + L * .06, -s.W * .3, s.W * .3, 4 + z, 4 + hh + z, 1, 1); }
  SH.CUR = M.METAL;
  for (const u of [-L * .22, L * .2]){ const p = rot2(s.a, s.b, ang, u, 0); line3(p[0], p[1], 4 + z, p[0], p[1], 17 + z, 1); }
  const fp = rot2(s.a, s.b, ang, -L * .49, 0); line3(fp[0], fp[1], 4 + z, fp[0], fp[1], 11 + z, 1);
  const fq = prj(fp[0], fp[1], 11 + z); pennant(Math.round(fq[0]), Math.round(fq[1]), s.side, t, s.seed);
}
export function drawStackR(ca: number, cb: number, ang: number, u: number, v: number, n: number, m: number){
  SH.CUR = m;
  for (let i = 0; i < n; i++){ const du = (i % 3) * 3.3, h = Math.floor(i / 3) * 2.6; rbox(ca, cb, ang, u + du, u + du + 3, v, v + 3, h, h + 2.5, 1, 1); }
}
// mouton : une boule de laine qui broute et se deplace un peu
export function drawSheep(a: number, b: number, t: number, k: number){
  const p = prj(a, b, 0), x = Math.round(p[0]), y = Math.round(p[1]), hop = ((t * 1.3 + k) % 4) < .25 ? -1 : 0;
  SH.CUR = M.WOOL;
  for (let dy = -4; dy <= -1; dy++) for (let dx = -2; dx <= 2; dx++){ if ((dx === -2 || dx === 2) && (dy === -4 || dy === -1)) continue; fput(x + dx, y + dy + hop, dy === -4 || Math.abs(dx) === 2 ? 1 : (bz(x + dx, y + dy) < 12 ? 1 : 0)); }
  SH.CUR = M.CAT_BLACK; const f = (k & 1) ? 1 : -1; fput(x + 3 * f, y - 3 + hop, 0); fput(x + 3 * f, y - 2 + hop, 0); fput(x - 1, y, 0); fput(x + 1, y, 0);
}
Object.assign(TYPES, {
  // quartier general du debarquement : la mairie a l'ouest, le Palais du Peuple a l'est
  qg: { name: 'Mairie', nameCCP: 'Palais du Peuple', fem: true, build(lot: Building, seed: number){ return (lot.side === 'ccp' ? TYPES.peuple : TYPES.mairie).build(lot, seed); } },
  port: { name: 'Port', fem: false, coast: true, build(lot: Building, seed: number){
    const ca = lot.ca, cb = lot.cb, ang = DIR_ANG[lot.dir || 0], lv = lot.lvl || 1, side = lot.side, ccp = side === 'ccp';
    const at = (u: number, v: number) => rot2(ca, cb, ang, u, v), parts: Part[] = [], lights: Light[] = [];
    const P = (u: number, v: number, zb: number, f: (t: number) => void) => { const q = at(u, v); parts.push(part(q[0], q[1], zb, f)); };
    if (lv === 1){
      P(26, 0, 0, () => drawPier(ca, cb, ang, 10, 44, 3, 1.4));
      P(-2, -4, 0, () => drawShed(ca, cb, ang, -9, 5, -11, 1, 6, M.PIER, M.ROOF_USC2, 'PORT'));
      P(4, 8, 0, () => { SH.CUR = M.PIER; rbox(ca, cb, ang, 2, 5, 6, 9, 0, 2.5, 1, 1); rbox(ca, cb, ang, 6, 8.5, 7, 9.5, 0, 2, 1, 1); });
      const q = at(38, -6); lights.push(Lc(q[0], q[1], 9, 1.1));
    } else {
      // quai en beton le long de la cote, jetees, entrepot, grues
      P(9, 0, -.3, () => drawPier(ca, cb, ang, 4, 16, 15, 1.2, M.CONCRETE));
      P(36, -9, 0, () => drawPier(ca, cb, ang, 16, lv === 3 ? 62 : 52, 4, 1.4, M.CONCRETE));
      if (lv === 3) P(36, 10, 0, () => drawPier(ca, cb, ang, 16, 58, 4, 1.4, M.CONCRETE));
      P(-6, 0, 0, () => drawShed(ca, cb, ang, -14, 2, -12, 12, 8, ccp ? M.CONCRETE : M.BRICK, M.ROOF_CCP, ccp ? 'PORT DU PEUPLE' : 'DOCKS'));
      const c1 = at(26, -9); P(26, -9, .5, (t: number) => drawPortCrane(c1[0], c1[1], ang - Math.PI / 2, side, t, .3));
      if (lv === 3){
        const c2 = at(44, -9), c3 = at(40, 10);
        P(44, -9, .5, (t: number) => drawPortCrane(c2[0], c2[1], ang - Math.PI / 2, side, t, 1.1));
        P(40, 10, .5, (t: number) => drawPortCrane(c3[0], c3[1], ang + Math.PI / 2, side, t, .6));
        P(8, 7, 0, () => drawStackR(ca, cb, ang, 5, 5, 6, M.KVAS));
        P(8, -12, 0, () => drawStackR(ca, cb, ang, 5, -14, 5, ccp ? M.FLAG_RED : M.FLAG_BLUE));
        const sh = at(46, 21), shipAng = ang;
        P(46, 21, 0, (t: number) => drawCargo({ a: sh[0], b: sh[1], ang: shipAng, L: 44, W: 10, seed: seed % 5, side }, t));
      } else P(8, 7, 0, () => drawStackR(ca, cb, ang, 4, 5, 3, M.KVAS));
      for (const [u, v] of [[20, -14], [46, -6], [2, 14]]){ const q = at(u, v); lights.push(Lc(q[0], q[1], 12, 1.2)); }
    }
    return { parts, lights };
  } },
  pecherie: { name: 'Pêcherie', nameCCP: 'Coopérative de pêche', fem: true, coast: true, build(lot: Building, seed: number){
    const ca = lot.ca, cb = lot.cb, ang = DIR_ANG[lot.dir || 0], at = (u: number, v: number) => rot2(ca, cb, ang, u, v), parts: Part[] = [];
    const P = (u: number, v: number, zb: number, f: (t: number) => void) => { const q = at(u, v); parts.push(part(q[0], q[1], zb, f)); };
    P(22, 4, 0, () => drawPier(ca, cb, ang, 10, 34, 2.5, 1.2));
    P(-3, -5, 0, () => drawShed(ca, cb, ang, -9, 3, -12, -1, 5.5, M.PIER, M.ROOF_USC, lot.side === 'ccp' ? 'KOOP' : 'POISSON'));
    // sechoirs a poissons
    P(0, 8, 0, (t: number) => {
      for (const v of [4, 9]){
        const p0 = at(-6, v), p1 = at(6, v); SH.CUR = M.PIER;
        line3(p0[0], p0[1], 0, p0[0], p0[1], 4, 1); line3(p1[0], p1[1], 0, p1[0], p1[1], 4, 1); line3(p0[0], p0[1], 4, p1[0], p1[1], 4, 1);
        SH.CUR = M.FISH;
        for (let u = -5; u <= 5; u += 2){ const q = at(u, v), s = prj(q[0], q[1], 4); const x = Math.round(s[0]), y = Math.round(s[1]); fput(x, y + 1, 1); fput(x, y + 2, 1); fput(x, y + 3, 0); }
      }
    });
    const q = at(30, 0);
    return { parts, lights: [Lc(q[0], q[1], 8, 1.1)] };
  } },
  bergerie: { name: 'Bergerie', nameCCP: 'Bergerie du Peuple', fem: true, build(lot: Building, seed: number){
    const g = houseGeo(lot.a0 + 8, lot.b0 + 8, 12, 12, 6, 5, seed, 'b', 0);
    const barn = () => { SH.CUR = M.BRICK; gableWalls(g.a0, g.a1, g.b0, g.b1, g.hh, g.rh, 'b', (u, h, x, y, k) => { if (k === 0 && Math.abs(u - 6) < 2 && h < 4.5) return (Math.abs(u - 6) > 1.6 || h > 4.1) ? 1 : 0; return (Math.floor(u * 1.2) % 3 === 0) ? 1 : 0; }); gableRoof(g.a0, g.a1, g.b0, g.b1, g.hh, g.rh, 'b', 1, 6, 1); };
    const pa0 = lot.a0 + 2, pa1 = lot.a1 - 2, pb0 = lot.b0 + 2, pb1 = lot.b1 - 2;
    const fence = () => { SH.CUR = M.PIER; const fn = (u: number, h: number) => (h >= 1 && h < 1.4) || (h >= 2.2 && h < 2.6) ? 1 : ((Math.floor(u / 3) * 3 === Math.floor(u) && h < 2.8) ? 1 : -1);
      for (const [p, q] of [[[pa0, pb1], [pa1, pb1]], [[pa1, pb1], [pa1, pb0]], [[pa1, pb0], [pa0 + 16, pb0]], [[pa0, pb0 + 16], [pa0, pb1]]]) if (!wallFace(p[0], p[1], q[0], q[1], 0, 2.8, fn, -1)) wallFace(q[0], q[1], p[0], p[1], 0, 2.8, fn, -1); };
    const parts = [part(g.ca, g.cb, 0, barn), part(lot.ca, lot.cb, -.2, fence)];
    for (let k = 0; k < 5; k++){
      const ha = pa0 + 16 + hash2(seed, k) * (pa1 - pa0 - 20), hb = pb0 + 6 + hash2(k, seed) * (pb1 - pb0 - 10);
      parts.push(part(ha, hb, .1, (t) => { const a = ha + Math.sin(t * .13 + k * 2) * 3, b = hb + Math.cos(t * .11 + k) * 2; drawSheep(a, b, t, k); }));
    }
    return { parts, decals: [() => { SH.CUR = M.FIELD; drawFace([pa0, pb0, 0, pa1, pb0, 0, pa1, pb1, 0, pa0, pb1, 0], UP, (x: number, y: number) => hash2(x, y) < .12 ? 1 : 0, -1); }], lights: [Lc(g.ca, g.b1 + 5, 8, 1.1)] };
  } },
  phare: { name: 'Phare', fem: false, build(lot: Building, seed: number){
    const ca = lot.ca, cb = lot.cb, p = part(ca, cb, 0, () => SH.drawLighthouse(ca, cb, lot.side));
    p.shadow = SH.circ(ca, cb, 7, 0, 10).concat(SH.circ(ca, cb, 5, 46, 10));
    return { parts: [p], lights: [Lc(ca, cb, 14, 1.2)], beacon: [ca, cb] };
  } },
  drapeau: { name: 'Avant-poste', nameCCP: 'Avant-poste du Peuple', fem: false, build(lot: Building, seed: number){
    const ca = lot.ca, cb = lot.cb, side = lot.side;
    const tent = () => {
      SH.CUR = M.MILITARY;
      const a0 = ca - 6, a1 = ca + 1, b0 = cb - 4, b1 = cb + 4;
      wallFace(a0, b1, a1, b1, 0, 1.5, 0, 1, 5); wallFace(a1, b0, a0, b0, 0, 1.5, 0, 1, 5);
      drawFace([a0, b1, 1.5, a1, b1, 1.5, a1, cb, 5, a0, cb, 5], [0, 1, 1], (x: number, y: number) => bz(x, y) < 5 ? 1 : 0, 1);
      drawFace([a1, b0, 1.5, a0, b0, 1.5, a0, cb, 5, a1, cb, 5], [0, -1, 1], (x: number, y: number) => bz(x, y) < 3 ? 1 : 0, 1);
    };
    const bags = () => { SH.CUR = M.WHEAT; for (let k = 0; k < 10; k++){ const an = k / 10 * TAU, a = ca + 4 + Math.cos(an) * 4.5, b = cb + Math.sin(an) * 4.5; boxS(a - 1, a + 1, b - 1, b + 1, 0, 1.4, 1, 1); } };
    return { parts: [part(ca - 2, cb, 0, tent), part(ca + 4, cb, .1, bags), part(ca + 4, cb, .3, (t) => drawFlagPole(ca + 4, cb, 0, 26, side, t))], lights: [Lc(ca, cb + 4, 9, 1.1)] };
  } },
  checkpoint: { name: 'Checkpoint Minou', fem: false, build(lot: Building, seed: number){
    const ca = lot.ca, cb = lot.cb, side = lot.side, ccp = side === 'ccp';
    const booth = (t: number) => {
      SH.CUR = ccp ? M.CCP : M.USC;
      boxS(ca - 7, ca - 1, cb - 4, cb + 2, 0, 6.5, (u: number, h: number) => { if (h >= 2.5 && h < 4.8 && u > .6 && u < 5) return 3; return (h < .8 || h > 5.8) ? 1 : 0; }, (x: number, y: number) => bz(x, y) < 6 ? 1 : 0);
      SH.CUR_SIDE = side; plateW('CHECKPOINT', ca - 4, cb + 2, 7.5);
    };
    const barrier = (t: number) => {
      const up = (Math.sin(t * .4 + seed) > .75) ? 1 : 0, an = up * Math.PI * .45, len = 12;
      SH.CUR = M.FLAG_RED;
      const pv = prj(ca + 2, cb - 4, 0); lineS(pv[0], pv[1], pv[0], pv[1] - 4, 1);
      const p0 = prj(ca + 2, cb - 4, 3.5), p1 = prj(ca + 2, cb - 4 + len * Math.cos(an), 3.5 + len * Math.sin(an));
      const n = Math.max(1, Math.ceil(Math.hypot(p1[0] - p0[0], p1[1] - p0[1])));
      for (let s = 0; s <= n; s++){ const x = Math.floor(p0[0] + (p1[0] - p0[0]) * s / n), y = Math.floor(p0[1] + (p1[1] - p0[1]) * s / n), c = ((s >> 1) & 1) ? 1 : 0; fput(x, y, c); fput(x, y - 1, c); fput(x, y + 1, 0); }
    };
    return { parts: [part(ca - 4, cb - 1, 0, booth), part(ca + 2, cb, .2, barrier), part(ca + 6, cb + 5, 0, (t) => drawFlagPole(ca + 6, cb + 5, 0, 18, side, t))], lights: [Lc(ca, cb, 12, 1.3)] };
  } }
});
