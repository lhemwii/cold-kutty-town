import { SH, type Building, type BuiltParts, type Part } from './00-shared.ts';
import { COLOR, CONST_SH, M, TAU, UP, blitAt, boxS, bz, clamp, dep, drawFace, drawFlagPole, drawStar, drawText, fillConvex, fput, gableRoof, gableRoof2, gableWalls, hash2, line3, lineS, plateW, prj, textW, wallBitmap, wallFace, win, winColor } from './01-core.ts';
import { Lc, QUEUE_CAT, alongSh, antennaAt, artSprite, drawCar, drawChimney, drawHouse, facadePlate, frontVisible, houseGeo, houseLights, part, picket, sideLight, smokeAt, treeSpr, wallBase, type HouseGeo } from './03-buildings-base.ts';
/* ================= statues ================= */
export const STATUE_CCP = artSprite([
  '  # #        ',
  '  ###        ',
  '  #.#        ',
  '  ###        ',
  ' +++++#####  ',
  '+++++++      ',
  '+++++++      ',
  '+#####+      ',
  '+#####+      ',
  '+#####+      ',
  '+#####+      ',
  '++###++      ',
  '++###++      ',
  ' +###+       ',
  ' ## ##       ',
  ' ## ##       ',
  ' ## ##       ',
  '### ###      '
]);
export const STATUE_USC = artSprite([
  '      #  ',
  '     ### ',
  '      #  ',
  '# # # #  ',
  '#####+#  ',
  ' # # +#  ',
  ' ###  #  ',
  ' #.#  #  ',
  ' ### ##  ',
  '+++++++  ',
  '+++++#   ',
  '++#++    ',
  '+++++    ',
  '+++++    ',
  '+++++    ',
  '++#++    ',
  '+++++    ',
  '+++++    ',
  '#####    '
]);

/* ================= les types de batiments ================= */
export function seedOf(lot: Building){ return Math.abs(Math.round(lot.ca * 7 + lot.cb * 13)) % 97; }
/** un type de batiment : son nom (et celui de la CCR), son genre pour les phrases, s'il se pose sur la cote, et son dessin */
export interface BuildingType { name: string; nameCCP?: string; fem: boolean; coast?: boolean; build: (lot: Building, seed: number) => BuiltParts }
export const TYPES: Record<string, BuildingType> = {
  maison: { name: 'Maison', fem: true, build(lot: Building, seed: number){
    return lot.side === 'ccp' ? maisonCCR(lot, seed, lot.lvl || 1) : maisonUSC(lot, seed, lot.lvl || 1);
  } },
  mairie: { name: 'Mairie', fem: true, build(lot: Building, seed: number){
    // chaque niveau se voit (etape 0.22) : deux ailes au niveau 2, un etage et un beffroi plus haut au niveau 3
    const lv = lot.lvl || 1, g = houseGeo(lot.ca, lot.cb - 2, 26, 18, lv >= 3 ? 16 : 12, 8, seed, 'a', 0);
    g.lit = [true, true, false, true];
    const wings = lv >= 2 ? [-1, 1].map(sg => { const w = houseGeo(lot.ca + sg * 15, lot.cb - 1, 8, 14, lv >= 3 ? 10 : 8, 4, seed + 3 + sg, 'b', null); w.lit = [true, true, true, true]; return part(w.ca, w.cb, 0, () => drawHouse(w)); }) : [];
    const parts = [...wings, part(g.ca, g.cb, 0, () => drawHouse(g)), part(g.ca, g.cb, .5, (t) => {
      const p = prj(g.ca, (g.b0 + g.b1) / 2, g.hh + g.rh), bx = Math.round(p[0]), by = Math.round(p[1]);
      for (let y = by - 11; y <= by; y++) for (let x = bx - 3; x <= bx + 3; x++) fput(x, y, (x === bx - 3 || x === bx + 3 || y === by - 11) ? 1 : 0);
      fput(bx, by - 8, 1); fput(bx - 1, by - 7, 1); fput(bx + 1, by - 7, 1); fput(bx, by - 7, Math.sin(t * 2) > .6 ? 1 : 0);
      for (let r = 1; r <= 5; r++) for (let x = bx - 4 + r; x <= bx + 4 - r; x++) fput(x, by - 11 - r, (x === bx - 4 + r || x === bx + 4 - r) ? 1 : 0);
      fput(bx, by - 17, 1); fput(bx, by - 18, 1);
    }), part(g.ca + 10, g.b1 + 4, 0, (t) => drawFlagPole(g.ca + 10, g.b1 + 4, 0, 20, lot.side, t)),
      part(g.ca, g.cb, .6, () => facadePlate('MAIRIE', g.ca, g.b1, g.b0, g.hh - 1))];
    return { parts, lights: houseLights(g).concat([Lc(g.ca, g.b1 + 9, 14, 1.3)]) };
  } },
  diner: { name: 'Diner', nameCCP: 'Cantine du Peuple', fem: false, build(lot: Building, seed: number){
    const ccp = lot.side === 'ccp';
    const la = 26, lb = 12, hh = 7;
    const a0 = Math.round(lot.ca - la / 2), a1 = a0 + la, b0 = Math.round(lot.cb - lb / 2), b1 = b0 + lb;
    const body = () => boxS(a0, a1, b0, b1, 0, hh, (u: number, h: number, x: number, y: number, k: number) => {
      if (h < 1.2) return 1;
      if (h >= 6) return bz(x, y) < 8 ? 1 : 0;
      if (k === 0 && u >= 11 && u < 14 && h < 5.5) return (u < 11.6 || u >= 13.4 || h >= 5) ? 1 : 0;
      const len = (k & 1) ? lb : la;
      if (k !== 2 && h >= 2.3 && h < 5.5 && u >= 1.5 && u < len - 1.5) return (Math.floor(u) % 4 === 0) ? 0 : 3;
      if (k === 2){ const kk = win(u, h, 4, 2.3, 3, 3); if (kk) return winColor(kk, false, x, y); }
      return 0;
    }, 0);
    const sign = (t: number) => {
      const on = (COLOR && SH.DAY) || Math.floor(t * 2.5) % 5 !== 4;
      const p = prj(lot.ca, lot.cb, hh), bx = Math.round(p[0]);
      SH.CUR = M.METAL; line3(lot.ca - 6, lot.cb, hh, lot.ca - 6, lot.cb, hh + 3, 1); line3(lot.ca + 6, lot.cb, hh, lot.ca + 6, lot.cb, hh + 3, 1);
      const r = plateW(ccp ? 'CANTINE' : 'DINER', lot.ca, lot.cb, hh + 3, { off: !on });
      SH.CUR = M.SIGN; if (on) drawStar(fput, bx - 2, r[1] - 6, 1);
    };
    return { parts: [part(lot.ca, lot.cb, 0, body), part(lot.ca, lot.cb, .5, sign)],
      lights: [Lc(lot.ca, b1 + 7, 15, 1.45), sideLight(a0, a1, b0, b1, 1, 9, 1.2), sideLight(a0, a1, b0, b1, 3, 9, 1.2)] };
  } },
  cinema: { name: 'Cinéma', nameCCP: 'Cinéma du Peuple', fem: false, build(lot: Building, seed: number){
    const ccp = lot.side === 'ccp';
    const la = 22, lb = 18, hh = 15;
    const a0 = Math.round(lot.ca - la / 2), a1 = a0 + la, b0 = Math.round(lot.cb - lb / 2) - 2, b1 = b0 + lb;
    const body = () => boxS(a0, a1, b0, b1, 0, hh, (u: number, h: number, x: number, y: number, k: number) => {
      if (h >= 11) return (Math.floor(u) % 3 === 0) ? 1 : 0;
      if (k === 0){
        if (u >= 8 && u < 14 && h < 5.5) return (u < 8.6 || u >= 13.4 || h >= 5 || Math.abs(u - 11) < .5) ? 1 : 0;
        for (const pu of [2, 16.5]){ const kk = win(u, h, pu, 1.5, 3.5, 5); if (kk) return kk === 'in' ? (bz(x, y) < 7 ? 1 : 0) : 1; }
        return 0;
      }
      return wallBase(k, x, y);
    }, 0);
    const marquee = (t: number) => {
      boxS(a0 + 1, a1 - 1, b1, b1 + 4, 7, 10, 0, (x: number, y: number) => bz(x, y) < 6 ? 1 : 0);
      if (!frontVisible(0)) return;
      const ph = Math.floor(t * 4) & 1;
      SH.CUR = M.WIN;
      for (let u = 1; u < la - 2; u += 2){ const p = prj(a0 + 1 + u + .5, b1 + 4, 8.5); fput(Math.round(p[0]), Math.round(p[1]), ((u >> 1) & 1) === ph ? 1 : 0); }
    };
    const blade = (t: number) => {
      const p = prj(a1 - 3, b1 + 2, 10), bx = Math.round(p[0]), by = Math.round(p[1]);
      const word = ccp ? 'KINO' : 'CINE', h = word.length * 6 + 3, k = Math.floor(t * 6) % 5;
      SH.CUR = M.SIGN;
      for (let y = by - h; y <= by; y++) for (let x = bx - 3; x <= bx + 3; x++){
        const edge = x === bx - 3 || x === bx + 3 || y === by - h || y === by;
        fput(x, y, edge ? (((y + x) >> 1) % 5 === k ? 0 : 1) : 0);
      }
      for (let i = 0; i < word.length; i++) drawText(fput, word[i], bx - 1, by - h + 2 + i * 6, 1);
    };
    return { parts: [part(lot.ca, lot.cb - 2, 0, body), part(lot.ca, lot.cb - 2, .3, marquee), part(lot.ca, lot.cb - 2, .6, blade)],
      lights: [Lc(lot.ca, b1 + 9, 18, 1.6)] };
  } },
  station: { name: 'Station-service', nameCCP: 'Station du Peuple', fem: true, build(lot: Building, seed: number){
    const ccp = lot.side === 'ccp';
    const a0 = Math.round(lot.a0 + 5), b0 = Math.round(lot.b0 + 3);
    const kiosk = () => boxS(a0, a0 + 10, b0, b0 + 9, 0, 7, (u: number, h: number, x: number, y: number, k: number) => {
      if (k === 0){ if (u >= 6.5 && u < 9 && h < 5.2) return (u < 7 || h >= 4.7) ? 1 : 0; const kk = win(u, h, 1.5, 2.3, 4, 3.4); return kk ? winColor(kk, true, x, y) : 0; }
      return wallBase(k, x, y);
    }, 0);
    const pump = (pa: number) => () => boxS(pa, pa + 2, b0 + 16, b0 + 18, 0, 5, (u: number, h: number) => h > 3 ? 1 : 0, 1);
    const canopy = () => {
      for (const [pa, pb] of [[a0 + 3, b0 + 22], [a0 + 22, b0 + 22], [a0 + 22, b0 + 12], [a0 + 3, b0 + 12]]) line3(pa, pb, 0, pa, pb, 9, 1);
      boxS(a0 + 1, a0 + 24, b0 + 11, b0 + 24, 9, 10.5, 1, (x: number, y: number) => bz(x, y) < 5 ? 1 : 0);
    };
    const sign = () => {
      const pp = prj(a0 + 27, b0 + 2, 0), px = Math.round(pp[0]), py = Math.round(pp[1]);
      SH.CUR = ccp ? M.SIGN_CCP : M.SIGN;
      for (let k = 0; k < 19; k++) fput(px, py - k, 1);
      for (let dy = -7; dy <= 7; dy++) for (let dx = -7; dx <= 7; dx++){ const r = Math.hypot(dx, dy); if (r > 7.4) continue; fput(px + dx, py - 25 + dy, r > 6.3 ? 1 : 0); }
      if (ccp) drawStar(fput, px - 3, py - 28, 1, true); else drawText(fput, 'GAZ', px - 5, py - 27, 1);
    };
    return { parts: [part(a0 + 5, b0 + 4.5, 0, kiosk), part(a0 + 8, b0 + 17, 0, pump(a0 + 7)), part(a0 + 15, b0 + 17, 0, pump(a0 + 14)),
      part(a0 + 12.5, b0 + 17.5, 1, canopy), part(a0 + 27, b0 + 2, 0, sign)],
      lights: [Lc(a0 + 13, b0 + 17, 16, 1.6)] };
  } },
  epicerie: { name: 'Épicerie', nameCCP: 'Gastronom', fem: true, build(lot: Building, seed: number){
    const la = 16, lb = 12, hh = 9, ccp = lot.side === 'ccp';
    const a0 = Math.round(lot.ca - la / 2), a1 = a0 + la, b0 = Math.round(lot.cb - lb / 2) - 3, b1 = b0 + lb;
    const body = () => boxS(a0, a1, b0, b1, 0, hh, (u: number, h: number, x: number, y: number, k: number) => {
      if (k === 0){ if (h >= 1 && h < 4.8 && u >= 1.5 && u < la - 1.5) return (Math.floor(u) % 4 === 0) ? 0 : (ccp && Math.floor(u) % 4 === 2 ? 0 : 3); return 0; }
      return wallBase(k, x, y);
    }, 0);
    const awning = () => {
      const savedM = SH.CUR; if (!ccp) SH.CUR = M.FLAG_RED;
      drawFace([a0 + 1, b1, 7, a1 - 1, b1, 7, a1 - 1, b1 + 4, 5, a0 + 1, b1 + 4, 5], [0, 2, 4],
        ccp ? ((x: number, y: number) => bz(x, y) < 3 ? 1 : 0) : alongSh(a0 + 1, b1 + 4, 5, a1 - 1, b1 + 4, 5, la - 2, (u) => (Math.floor(u / 1.5) & 1) ? 1 : 0), 1);
      SH.CUR = savedM;
      facadePlate(ccp ? 'GASTRONOM' : 'EPICERIE', lot.ca, b1, b0, hh + .5);
    };
    const parts = [part(lot.ca, lot.cb - 3, 0, body), part(lot.ca, lot.cb - 3, .3, awning)];
    // la file avance : toutes les 7 s, le premier entre, les autres font un pas, un nouveau arrive au bout
    if (ccp) for (let i = 0; i < 6; i++){ const qa = a0 - 1 + i * 3.4, qb = b1 + 7, ph = seed * .37; parts.push(part(qa, qb, 0, (t) => {
      const c = ((t + ph) % 7 + 7) % 7, p = Math.min(1, c / 1.2), slot = i + 1 - p;
      if (slot > 5 || (i === 5 && c < .15)) return;
      const hop = p < 1 ? Math.round(Math.abs(Math.sin(p * Math.PI * 3)) * -1) : 0;
      SH.CUR = M.CAT_BLACK; blitAt(QUEUE_CAT, a0 - 1 + slot * 3.4, qb, -hop);
    })); }
    return { parts, lights: [Lc(lot.ca, b1 + 6, 12, 1.3)] };
  } },
  chateau: { name: 'Château d’eau', fem: false, build(lot: Building, seed: number){
    const ca = lot.ca, cb = lot.cb, ccp = lot.side === 'ccp';
    const draw = () => {
      SH.CUR = M.METAL;
      const legs = [[-6,-6],[6,-6],[6,6],[-6,6]], at = (d: number, z: number) => d * (1 - .2 * z / 20);
      for (const [da, db] of legs) line3(ca + da, cb + db, 0, ca + da * .8, cb + db * .8, 20, 1);
      for (const z of [7, 14]) for (let i = 0; i < 4; i++){ const p = legs[i], q = legs[(i + 1) % 4]; line3(ca + at(p[0], z), cb + at(p[1], z), z, ca + at(q[0], z), cb + at(q[1], z), z, 1); }
      const C = prj(ca, cb, 20), cx = Math.round(C[0]), cy = Math.round(C[1]);
      const rx = 11, ry = 5.5, H2 = 10;
      for (let dx = -rx; dx <= rx; dx++){
        const s = Math.sqrt(Math.max(0, 1 - (dx / (rx + .5)) ** 2));
        const yb = Math.round(cy + ry * s), yt = Math.round(cy - H2 + ry * s);
        for (let y = yt; y <= yb; y++){ const edge = Math.abs(dx) >= rx || y === yb; fput(cx + dx, y, edge ? 1 : (bz(cx + dx, y) < clamp(5 - dx * .4, 0, 16) ? 1 : 0)); }
        const yTop = Math.round(cy - H2 - ry * s);
        for (let y = yTop; y < yt; y++) fput(cx + dx, y, (y === yTop) ? 1 : (bz(cx + dx, y) < 3 ? 1 : 0));
      }
      if (ccp){ for (let y = cy - 8; y <= cy + 1; y++) for (let x = cx - 5; x <= cx + 3; x++) fput(x, y, 0); drawStar(fput, cx - 4, cy - 7, 1, true); }
      else { for (let y = cy - 7; y <= cy - 1; y++) for (let x = cx - 10; x <= cx + 10; x++) fput(x, y, 0); drawText(fput, 'KUTTY', cx - 9, cy - 6, 1); }
      for (let r = 0; r <= 8; r++){ const hw = Math.round(rx * (1 - r / 8)); for (let x = -hw; x <= hw; x++) fput(cx + x, cy - H2 - r - 1, (x === -hw || x === hw) ? 1 : (x < 0 && bz(cx + x, cy - H2 - r) < 4 ? 1 : 0)); }
    };
    const beacon = (t: number) => { const C = prj(ca, cb, 20), cx = Math.round(C[0]), cy = Math.round(C[1]); const on = (t % 1.6) < .5; fput(cx, cy - 22, on ? 1 : 0); if (on){ fput(cx - 1, cy - 22, 1); fput(cx + 1, cy - 22, 1); fput(cx, cy - 23, 1); } };
    return { parts: [part(ca, cb, 0, draw), part(ca, cb, .5, beacon)], lights: [] };
  } },
  kiosque: { name: 'Kiosque à musique', fem: false, build(lot: Building, seed: number){
    const ca = lot.ca, cb = lot.cb;
    const draw = () => {
      SH.CUR = M.NEUTRAL;
      const C = prj(ca, cb, 0), cx = Math.round(C[0]), cy = Math.round(C[1]);
      const rx = 14, ry = 7;
      for (let dx = -rx; dx <= rx; dx++){
        const s = Math.sqrt(Math.max(0, 1 - (dx / (rx + .5)) ** 2));
        const yf = Math.round(cy + ry * s), yb = Math.round(cy - ry * s);
        for (let y = yb - 3; y <= yf - 3; y++) fput(cx + dx, y, (y === yb - 3 || y === yf - 3) ? 1 : (bz(cx + dx, y) < 3 ? 1 : 0));
        for (let y = yf - 2; y <= yf; y++) fput(cx + dx, y, y === yf ? 1 : 0);
      }
      const posts = [];
      for (let k = 0; k < 8; k++){ const an = k * TAU / 8 + TAU / 16, pa = ca + Math.cos(an) * 8.5, pb = cb + Math.sin(an) * 8.5; posts.push([pa, pb, dep(pa, pb)]); }
      posts.sort((p, q) => p[2] - q[2]);
      for (const [pa, pb] of posts){ const p = prj(pa, pb, 3), x = Math.round(p[0]), y = Math.round(p[1]); for (let k = 0; k <= 9; k++) fput(x, y - k, 1); }
      const top = [cx, cy - 21], arcX = [], arcY = [];
      for (let k = 0; k <= 16; k++){ const an = k * Math.PI / 16; arcX.push(cx + Math.cos(an) * 16); arcY.push(cy - 12 + Math.sin(an) * 8); }
      const xs = [top[0], ...arcX], ys = [top[1], ...arcY];
      fillConvex(xs, ys, xs.length, CONST_SH[0]);
      for (let k = 0; k <= 16; k += 4) lineS(top[0], top[1], arcX[k], arcY[k], 1);
      for (let k = 0; k < 16; k++) lineS(arcX[k], arcY[k], arcX[k + 1], arcY[k + 1], 1);
      for (let k = 0; k < 4; k++) fput(top[0], top[1] - k, 1);
      fput(top[0] + 1, top[1] - 3, 1); fput(top[0] + 2, top[1] - 3, 1); fput(top[0] + 1, top[1] - 2, 1);
    };
    return { parts: [part(ca, cb, 0, draw)], lights: [Lc(ca, cb, 14, 1.3)] };
  } },
  parc: { name: 'Parc', fem: false, build(lot: Building, seed: number){
    const T = [[lot.ca - 8, lot.cb - 6, 5], [lot.ca + 9, lot.cb - 3, 4], [lot.ca - 2, lot.cb + 8, 5]];
    const parts = T.map(([a, b, r]) => part(a, b, 0, () => { SH.CUR = M.TREE; blitAt(treeSpr(r), a, b, 0); }));
    const ba = lot.ca + 6, bb = lot.cb + 7;
    parts.push(part(ba + 3, bb, 0, () => {
      SH.CUR = M.PIER;
      line3(ba, bb, 2, ba + 6, bb, 2, 1); line3(ba, bb - 1, 4, ba + 6, bb - 1, 4, 1);
      line3(ba, bb, 0, ba, bb, 2, 1); line3(ba + 6, bb, 0, ba + 6, bb, 2, 1);
    }));
    return { parts, lights: [] };
  } },
  immeuble: { name: 'Immeuble', fem: false, build(lot: Building, seed: number){
    return lot.side === 'ccp' ? immeubleCCR(lot, seed, lot.lvl || 1) : immeubleUSC(lot, seed, lot.lvl || 1);
  } },
  peuple: { name: 'Palais du Peuple', fem: false, build(lot: Building, seed: number){
    const ca = lot.ca, cb = lot.cb;
    const tier = (hw: number, hb: number, z0: number, z1: number, cols: number) => () => boxS(ca - hw, ca + hw, cb - hb, cb + hb, z0, z1, (u: number, h: number, x: number, y: number, k: number) => {
      if (z0 === 0 && k === 0 && h < 8 && u > 6 && u < hw * 2 - 6) return (Math.floor(u) % 3 === 0) ? 1 : 0;
      if (h > (z1 - z0) - 1.2) return 1;
      const ph = u % cols;
      if (ph >= cols * .35 && ph < cols * .7 && h > 2 && h < (z1 - z0) - 3) return hash2(Math.floor(u / cols) + k * 17, Math.floor(h / 4) + z0) < .5 ? 3 : (bz(x, y) < 3 ? 1 : 0);
      return wallBase(k, x, y);
    }, 0);
    // chaque niveau se voit (etape 0.22) : deux etages au niveau 1, trois au niveau 2, quatre et des ailes au niveau 3
    const lv = lot.lvl || 1, top = lv >= 3 ? 40 : lv >= 2 ? 33 : 22, sp = top + 12;
    const spire = (t: number) => {
      line3(ca, cb, top, ca, cb, sp, 1);
      const p = prj(ca, cb, sp), x = Math.round(p[0]), y = Math.round(p[1]);
      SH.CUR = M.SIGN_CCP;
      drawStar(fput, x - 3, y - 7, 1, true);
      if (Math.sin(t * 1.3) > .7) for (let k = 0; k < 4; k++){ fput(x - 5 - k, y - 4, 1); fput(x + 5 + k, y - 4, 1); }
    };
    const tiers = [part(ca, cb, 0, tier(15, 11, 0, 12, 3)), part(ca, cb, .3, tier(9, 7, 12, lv >= 2 ? 24 : 22, 3))];
    if (lv >= 2) tiers.push(part(ca, cb, .6, tier(5, 4, 24, 33, 2.5)));
    if (lv >= 3) tiers.push(part(ca, cb, .75, tier(3, 2.5, 33, 40, 2)), part(ca - 17, cb, 0, () => boxS(ca - 18, ca - 15, cb - 8, cb + 8, 0, 9, 1, 0)), part(ca + 17, cb, 0, () => boxS(ca + 15, ca + 18, cb - 8, cb + 8, 0, 9, 1, 0)));
    return { parts: [...tiers, part(ca, cb, .9, spire),
      part(ca + 12, cb + 13, 0, (t) => drawFlagPole(ca + 12, cb + 13, 0, 22, 'ccp', t))],
      lights: [Lc(ca, cb + 17, 16, 1.4), sideLight(ca - 15, ca + 15, cb - 11, cb + 11, 1, 9, 1.1), sideLight(ca - 15, ca + 15, cb - 11, cb + 11, 3, 9, 1.1)] };
  } },
  usine: { name: 'Filature', nameCCP: 'Combinat textile', fem: true, build(lot: Building, seed: number){
    const la = 28, lb = 18, hh = 10, ccp = lot.side === 'ccp';
    const a0 = Math.round(lot.ca - la / 2), a1 = a0 + la, b0 = Math.round(lot.cb - lb / 2), b1 = b0 + lb;
    const body = () => boxS(a0, a1, b0, b1, 0, hh, (u: number, h: number, x: number, y: number, k: number) => {
      if (k === 0 && u >= 3 && u < 9 && h < 7) return (u < 3.6 || u >= 8.4 || h >= 6.4) ? 1 : ((Math.floor(h) & 1) ? 1 : 0);
      if (h >= 4 && h < 8){ const ph = u % 4; if (ph >= 1 && ph < 3.4) return (hash2(Math.floor(u / 4) + k * 9, seed) < .6) ? ((Math.floor(ph * 2) === 4) ? 0 : 3) : 0; }
      return wallBase(k, x, y);
    }, 0);
    const parts = [part(lot.ca, lot.cb, 0, body)];
    for (let i = 0; i < 3; i++){ const s0 = a0 + 2 + i * 8.5; parts.push(part(s0 + 3, lot.cb, .4, () => { wallFace(s0, b1 - 1, s0 + 6, b1 - 1, hh, hh, (u: number, h: number) => h > .8 && h < 2 && u > 1.5 && u < 4.5 ? 1 : 0, 1, hh + 3); wallFace(s0 + 6, b0 + 1, s0, b0 + 1, hh, hh, 0, 1, hh + 3); gableRoof(s0, s0 + 6, b0 + 1, b1 - 1, hh, 3, 'b', 1, 6, 0); })); }
    for (const [cx, cy2, sd] of [[a0 + 4, b0 + 3, 1], [a1 - 5, b0 + 3, 2]]){
      parts.push(part(cx, cy2, .5, (t) => {
        boxS(cx - 1.5, cx + 1.5, cy2 - 1.5, cy2 + 1.5, hh, 32, (u: number, h: number) => (Math.floor(h) % 6 === 0) ? 1 : 0, 0);
        const p = prj(cx, cy2, 32); smokeAt(p[0], p[1] - 1, t * 1.4, sd + seed); smokeAt(p[0] + 2, p[1] - 3, t * 1.1 + .5, sd * 3 + seed);
      }));
    }
    parts.push(part(lot.ca, lot.cb, .7, () => facadePlate(ccp ? 'COMBINAT' : 'TEXTILES', lot.ca, b1, b0, hh + .5)));
    return { parts, lights: [sideLight(a0, a1, b0, b1, 0, 10, 1.2), sideLight(a0, a1, b0, b1, 1, 8, 1.1)] };
  } },
  statue: { name: 'Statue', fem: true, build(lot: Building, seed: number){
    const ca = lot.ca, cb = lot.cb, ccp = lot.side === 'ccp';
    const draw = () => {
      boxS(ca - 5, ca + 5, cb - 5, cb + 5, 0, 1.5, (u: number, h: number, x: number, y: number, k: number) => bz(x, y) < 5 ? 1 : 0, 0);
      boxS(ca - 3.5, ca + 3.5, cb - 3.5, cb + 3.5, 1.5, 9, (u: number, h: number, x: number, y: number, k: number) => { const kk = win(u, h, 1.5, 2.5, 4, 3); if (kk) return kk === 'frame' ? 1 : 0; return wallBase(k, x, y); }, 0);
      SH.CUR = M.STATUE; blitAt(ccp ? STATUE_CCP : STATUE_USC, ca, cb, 9);
    };
    return { parts: [part(ca, cb, 0, draw)], lights: [Lc(ca, cb + 8, 13, 1.4)] };
  } },
  panneau: { name: 'Panneau', fem: false, build(lot: Building, seed: number){
    const ca = lot.ca, cb = lot.cb, ccp = lot.side === 'ccp';
    const L1 = ccp ? 'GLOIRE AU' : 'BOIS', L2 = ccp ? 'PLAN !' : 'KUTTY COLA';
    const draw = (t: number) => {
      SH.CUR = M.METAL;
      line3(ca - 12, cb, 0, ca - 12, cb, 9, 1); line3(ca + 12, cb, 0, ca + 12, cb, 9, 1);
      SH.CUR = ccp ? M.SIGN_CCP : M.SIGN;
      // le panneau est dessine a plat puis pose debout entre ses deux poteaux : il tourne avec la ville
      const w = 45, h = 20, pix = new Int8Array(w * h).fill(-1), put = (x: number, y: number, v: number) => { if (x >= 0 && y >= 0 && x < w && y < h) pix[y * w + x] = v; };
      for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++){ const e = xx === 0 || xx === w - 1 || yy === 0 || yy === h - 1; put(xx, yy, e ? 1 : (ccp ? 1 : 0)); }
      const c = ccp ? 0 : 1, x = w >> 1;
      drawText(put, L1, x - (textW(L1) >> 1), 3, c); drawText(put, L2, x - (textW(L2) >> 1), 10, c);
      if (ccp){ drawStar(put, 2, 2, 0); drawStar(put, w - 7, 2, 0); }
      else if (Math.floor(t * 1.5) % 2) { put(3, 3, 1); put(w - 4, 3, 1); }
      wallBitmap(ca, cb, 9, 1, 0, w, h, pix);
    };
    return { parts: [part(ca, cb, 0, draw)], lights: [Lc(ca, cb + 7, 14, 1.5)] };
  } }
};

/* ================= l'immeuble, a la maniere de chaque camp (etape 2) ================= */
// fenetres en grille sur une face : colonnes de largeur cw centrees, etages de hauteur fh a partir de z0 ; null hors des fenetres
function gridWin(u: number, h: number, len: number, z0: number, fh: number, cw: number, ww: number, wh: number, lit: (c: number, f: number) => boolean, x: number, y: number): number | null {
  if (h < z0) return null;
  const f = Math.floor((h - z0) / fh), fz = (h - z0) - f * fh;
  const nC = Math.floor((len - 1) / cw), off = (len - nC * cw) / 2, cu = u - off;
  if (cu < 0 || cu >= nC * cw) return null;
  const col = Math.floor(cu / cw), cx = cu - col * cw;
  const kk = win(cx, fz, (cw - ww) / 2, (fh - wh) / 2, ww, wh);
  return kk ? winColor(kk, lit(col, f), x, y) : null;
}
// toit plat goudronne, sombre
function roofTar(a0: number, a1: number, b0: number, b1: number, z: number){
  const sv = SH.CUR; SH.CUR = M.ROAD;
  drawFace([a0, b0, z, a1, b0, z, a1, b1, z, a0, b1, z], UP, 0, -1);
  SH.CUR = sv;
}
// petit toit en pyramide (reservoir, couronne)
export function pyramid(ca: number, cb: number, hw: number, z0: number, z1: number, edge: number){
  const dz = z1 - z0, A = [ca - hw, cb + hw], B = [ca + hw, cb + hw], C = [ca + hw, cb - hw], D = [ca - hw, cb - hw];
  const faces: [number[], number[], number[]][] = [[A, B, [0, dz, hw]], [B, C, [dz, 0, hw]], [C, D, [0, -dz, hw]], [D, A, [-dz, 0, hw]]];
  for (const [p, q, n] of faces) drawFace([p[0], p[1], z0, q[0], q[1], z0, ca, cb, z1], n, (x: number, y: number) => bz(x, y) < 4 ? 1 : 0, edge);
}
// USC : immeuble de briques a escaliers de secours, puis plus haut avec un reservoir d'eau, puis gratte-ciel
function immeubleUSC(lot: Building, seed: number, lv: number): BuiltParts {
  const nf = lv === 1 ? 4 : 6, fh = 4, la = 24, lb = 14, hh = nf * fh + 1.5;
  const a0 = Math.round(lot.ca - la / 2), a1 = a0 + la, b0 = Math.round(lot.cb - lb / 2), b1 = b0 + lb;
  const litW = (k: number) => (col: number, f: number) => hash2(seed * 7 + k * 31 + col, f * 13 + 5) < .34;
  const body = () => {
    SH.CUR = M.BRICK;
    boxS(a0, a1, b0, b1, 0, hh, (u: number, h: number, x: number, y: number, k: number) => {
      const len = (k & 1) ? lb : la, mid = len / 2;
      if (k === 0 && u >= mid - 1.8 && u < mid + 1.8 && h < 3.4) return (u < mid - 1.2 || u >= mid + 1.2 || h >= 2.9) ? 1 : 0;
      if (h < 1) return 1;
      if (h >= hh - 1.2) return (Math.floor(u * 1.5) & 1) ? 1 : 0;
      const w = gridWin(u, h, len, 1, fh, 3, 1.8, 2.6, litW(k), x, y); if (w != null) return w;
      return wallBase(k, x, y);
    }, null);
    roofTar(a0, a1, b0, b1, hh);
    // corniche de pierre claire, en anneau autour du toit
    SH.CUR = M.SANDSTONE;
    boxS(a0 - .6, a1 + .6, b0 - .6, b1 + .6, hh, hh + 1.2, (u: number) => (Math.floor(u * 2) & 1) ? 1 : 0, null);
  };
  // escaliers de secours en fer, sur les deux grandes faces (chacun dessine seulement s'il se voit)
  const escape = (face: number) => () => {
    if (!frontVisible(face)) return;
    const bb = face === 0 ? b1 + 1.4 : b0 - 1.4, A0 = face === 0 ? a0 + 3 : a1 - 10, A1 = A0 + 7;
    SH.CUR = M.METAL;
    for (let f = 1; f < nf; f++){
      const z = 1 + f * fh;
      line3(A0, bb, z, A1, bb, z, 0); line3(A0, bb, z + 1.4, A1, bb, z + 1.4, 0);
      line3(A0, bb, z, A0, bb, z + 1.4, 0); line3(A1, bb, z, A1, bb, z + 1.4, 0);
      if (f < nf - 1) line3((f & 1) ? A0 + 1 : A1 - 1, bb, z, (f & 1) ? A1 - 1 : A0 + 1, bb, z + fh, 0);
    }
    line3(A0 + 1, bb, 1 + fh, A0 + 1, bb, 2, 0);
  };
  const parts: Part[] = [part(lot.ca, lot.cb, 0, body), part(a0 + 6, b1 + 1.4, .2, escape(0)), part(a1 - 6, b0 - 1.4, .2, escape(2))];
  if (lv === 2){
    // le reservoir d'eau en bois sur le toit, sur ses pieds
    const ta = a1 - 6, tb = lot.cb, z0 = hh + 1.2;
    parts.push(part(ta, tb, .6, () => {
      SH.CUR = M.METAL; for (const [da, db] of [[-1.6, -1.6], [1.6, -1.6], [1.6, 1.6], [-1.6, 1.6]]) line3(ta + da, tb + db, z0, ta + da, tb + db, z0 + 3, 0);
      SH.CUR = M.PIER; boxS(ta - 2, ta + 2, tb - 2, tb + 2, z0 + 3, z0 + 7, (u: number) => (Math.floor(u * 1.5) & 1) ? 1 : 0, null);
      pyramid(ta, tb, 2.2, z0 + 7, z0 + 9, 1);
    }));
  }
  if (lv === 3) return gratteCielUSC(lot, seed, a0, a1, b0, b1, hh, parts);
  return { parts, lights: [sideLight(a0, a1, b0, b1, seed % 4, 7, .9), sideLight(a0, a1, b0, b1, (seed + 2) % 4, 7, .9)] };
}
// niveau 3 cote USC : la tour de pierre en retrait au-dessus des briques, couronne a gradins et fleche
function gratteCielUSC(lot: Building, seed: number, a0: number, a1: number, b0: number, b1: number, hh: number, parts: Part[]): BuiltParts {
  const t0 = hh + 1.2, t1 = t0 + 30, ta0 = a0 + 5, ta1 = a1 - 5, tb0 = b0 + 3, tb1 = b1 - 3;
  const lit = (k: number) => (col: number, f: number) => hash2(seed * 11 + k * 7 + col, f * 5 + 1) < .4;
  parts.push(part(lot.ca, lot.cb, .5, (t: number) => {
    SH.CUR = M.SANDSTONE;
    boxS(ta0, ta1, tb0, tb1, t0, t1, (u: number, h: number, x: number, y: number, k: number) => {
      const len = (k & 1) ? tb1 - tb0 : ta1 - ta0;
      if ((u % 2) < .6) return 1;
      const w = gridWin(u, h, len, .5, 3, 2, 1.2, 2.2, lit(k), x, y); if (w != null) return w;
      return wallBase(k, x, y);
    }, (x: number, y: number) => bz(x, y) < 3 ? 1 : 0);
    boxS(ta0 + 2, ta1 - 2, tb0 + 1.5, tb1 - 1.5, t1, t1 + 4, (u: number) => (u % 1.5) < .5 ? 1 : 0, 0);
    boxS(ta0 + 4, ta1 - 4, tb0 + 2.5, tb1 - 2.5, t1 + 4, t1 + 7, 1, 0);
    SH.CUR = M.METAL; line3(lot.ca, lot.cb, t1 + 7, lot.ca, lot.cb, t1 + 15, 1);
    // feu d'obstacle qui clignote au sommet
    const p = prj(lot.ca, lot.cb, t1 + 15); SH.CUR = M.REDLIGHT; if ((t % 1.4) < .5) fput(Math.round(p[0]), Math.round(p[1]) - 1, 1);
  }));
  return { parts, lights: [sideLight(a0, a1, b0, b1, seed % 4, 8, 1), sideLight(a0, a1, b0, b1, (seed + 2) % 4, 8, 1)] };
}
// CCR : barre de beton en panneaux, puis barre plus haute avec son slogan a etoile, puis tour du Peuple a etoile rouge
function immeubleCCR(lot: Building, seed: number, lv: number): BuiltParts {
  if (lv === 3) return tourCCR(lot, seed);
  const nf = lv === 1 ? 5 : 9, fh = 3.5, la = 30, lb = 12, hh = nf * fh + 1.5;
  const a0 = Math.round(lot.ca - la / 2), a1 = a0 + la, b0 = Math.round(lot.cb - lb / 2), b1 = b0 + lb;
  const litW = (k: number) => (col: number, f: number) => hash2(seed * 5 + k * 17 + col, f * 11 + 3) < .3;
  const body = () => {
    SH.CUR = M.CONCRETE; const acc = SH.ACC; SH.ACC = M.METAL;
    boxS(a0, a1, b0, b1, 0, hh, (u: number, h: number, x: number, y: number, k: number) => {
      const len = (k & 1) ? lb : la;
      // trois entrees sous auvent
      if (k === 0 && h < 2.8) for (const e of [len / 4, len / 2, 3 * len / 4]) if (u >= e - 1.2 && u < e + 1.2) return 5;
      if (h < 1.5) return 1;
      const z = h - 1.5, f = Math.floor(z / fh), fz = z - f * fh;
      if (fz < .5) return 1;
      const w = gridWin(u, h, len, 1.5, fh, 3.5, 2, 2, litW(k), x, y); if (w != null) return w === 1 ? 0 : w;
      return wallBase(k, x, y);
    }, null);
    SH.ACC = acc;
    roofTar(a0, a1, b0, b1, hh);
    // les auvents et les cages d'ascenseur sur le toit
    if (frontVisible(0)) for (const e of [la / 4, la / 2, 3 * la / 4]) boxS(a0 + e - 1.6, a0 + e + 1.6, b1, b1 + 1.6, 2.8, 3.3, 1, 1);
    boxS(a0 + 5, a0 + 9, lot.cb - 2, lot.cb + 2, hh, hh + 2.5, 0, 1);
    boxS(a1 - 9, a1 - 5, lot.cb - 2, lot.cb + 2, hh, hh + 2.5, 0, 1);
  };
  const parts: Part[] = [part(lot.ca, lot.cb, 0, body)];
  if (lv === 2) parts.push(part(lot.ca, lot.cb, .6, () => {
    // panneau rouge a etoile sur le toit, entre deux montants (dessine a plat puis pose debout : il tourne avec la ville)
    SH.CUR = M.METAL; line3(lot.ca - 6, lot.cb, hh, lot.ca - 6, lot.cb, hh + 3, 0); line3(lot.ca + 6, lot.cb, hh, lot.ca + 6, lot.cb, hh + 3, 0);
    SH.CUR = M.SIGN_CCP;
    const w = 21, h = 9, pix = new Int8Array(w * h);
    for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) pix[yy * w + xx] = (xx === 0 || yy === 0 || xx === w - 1 || yy === h - 1) ? 1 : 0;
    drawStar((x: number, y: number, v: number) => { if (x >= 0 && y >= 0 && x < w && y < h) pix[y * w + x] = v; }, 7, 1, 1, true);
    for (const xx of [2, 4, 16, 18]) for (let yy = 3; yy < 6; yy++) pix[yy * w + xx] = 1;
    wallBitmap(lot.ca, lot.cb, hh + 3, 1, 0, w, h, pix);
  }));
  return { parts, lights: [sideLight(a0, a1, b0, b1, seed % 4, 7, .9), sideLight(a0, a1, b0, b1, (seed + 2) % 4, 7, .9)] };
}
// niveau 3 cote CCR : la tour du Peuple, bandes de balcons, fleche et grande etoile rouge
function tourCCR(lot: Building, seed: number): BuiltParts {
  const la = 16, lb = 14, nf = 15, fh = 3.5, hh = nf * fh + 1.5;
  const a0 = Math.round(lot.ca - la / 2), a1 = a0 + la, b0 = Math.round(lot.cb - lb / 2), b1 = b0 + lb;
  const lit = (k: number) => (col: number, f: number) => hash2(seed * 3 + k * 13 + col, f * 7 + 2) < .32;
  const body = () => {
    SH.CUR = M.CONCRETE;
    boxS(a0, a1, b0, b1, 0, hh, (u: number, h: number, x: number, y: number, k: number) => {
      const len = (k & 1) ? lb : la, mid = len / 2;
      if (k === 0 && u >= mid - 2 && u < mid + 2 && h < 4) return (u < mid - 1.4 || u >= mid + 1.4 || h >= 3.5) ? 1 : 0;
      if (h < 2) return 1;
      const z = h - 2, f = Math.floor(z / fh), fz = z - f * fh;
      // bande verticale de balcons au milieu de chaque face
      if (Math.abs(u - mid) < 2.2) return fz < 1 ? 1 : (bz(x, y) < 6 ? 1 : 0);
      if (fz < .35) return 1;
      const w = gridWin(u, h, len, 2, fh, 2.6, 1.4, 1.8, lit(k), x, y); if (w != null) return w;
      return wallBase(k, x, y);
    }, (x: number, y: number) => bz(x, y) < 2 ? 1 : 0);
    boxS(a0 + 3, a1 - 3, b0 + 3, b1 - 3, hh, hh + 4, (u: number) => (u % 2) < .6 ? 1 : 0, 1);
  };
  const spire = (t: number) => {
    SH.CUR = M.METAL; line3(lot.ca, lot.cb, hh + 4, lot.ca, lot.cb, hh + 14, 1);
    const p = prj(lot.ca, lot.cb, hh + 14), x = Math.round(p[0]), y = Math.round(p[1]);
    SH.CUR = M.SIGN_CCP; drawStar(fput, x - 3, y - 7, 0, true);
    if (Math.sin(t * 1.3) > .8) drawStar(fput, x - 3, y - 7, 1, true);
  };
  return { parts: [part(lot.ca, lot.cb, 0, body), part(lot.ca, lot.cb, .7, spire)],
    lights: [sideLight(a0, a1, b0, b1, seed % 4, 8, 1), sideLight(a0, a1, b0, b1, (seed + 2) % 4, 8, 1)] };
}

/* ================= la maison, a la maniere de chaque camp (etape 2) ================= */
// murs d'une maison a pignon : porte sur la face g.door, fenetres sur un ou deux etages ; skin donne le motif du mur (planches, rondins)
// et frame la valeur de l'encadrement des fenetres (1 clair, 5 la couleur d'accent : volets bleus de l'isba)
function houseWalls(g: HouseGeo, skin: (u: number, h: number, len: number, x: number, y: number, k: number) => number, frame: number){
  const { a0, a1, b0, b1, hh, rh, axis, lit, door } = g, L = [a1 - a0, b1 - b0, a1 - a0, b1 - b0], two = hh >= 11;
  gableWalls(a0, a1, b0, b1, hh, rh, axis, (u: number, h: number, x: number, y: number, k: number) => {
    const len = L[k];
    if (h < hh){
      if (k === door){ const d0 = len / 2 - 1.5; if (u >= d0 && u < d0 + 3 && h < 5.5) return (u < d0 + .6 || u >= d0 + 2.4 || h >= 5) ? 1 : 0; }
      for (const h0 of two ? [2.5, 8] : [2.5]){
        const cols = len >= 12 ? [2, len - 5] : [len / 2 - 1.5];
        if (len >= 18) cols.push(len / 2 - 1.5);
        for (const u0 of cols){
          if (k === door && h0 < 5 && Math.abs(u0 + 1.5 - len / 2) < 2) continue;
          const kk = win(u, h, u0, h0, 3, 3.6);
          if (kk) return kk === 'frame' ? frame : winColor(kk, lit[k], x, y);
        }
      }
    } else {
      const kk = win(u, h, len / 2 - 1, hh + 1.2, 2, 2); if (kk) return kk === 'in' ? (lit[k] ? 3 : 0) : frame;
    }
    return skin(u, h, len, x, y, k);
  });
}
// USC : maison de bois a planches et porche, puis pavillon a garage, puis villa a deux etages et piscine
function maisonUSC(lot: Building, seed: number, lv: number): BuiltParts {
  const la = lv === 1 ? 14 : lv === 2 ? 16 : 20, lb = 11, hh = lv === 3 ? 13 : 8, rh = 5;
  const g = houseGeo(lot.ca - (lv >= 2 ? 3 : 0), lot.cb - 3, la, lb, hh, rh, seed, 'a', 0);
  const planks = (u: number, h: number, len: number, x: number, y: number, k: number) => (h % 2.4) < .35 ? 1 : wallBase(k, x, y);
  const parts: Part[] = [part(g.ca, g.cb, 0, () => { houseWalls(g, planks, 1); gableRoof(g.a0, g.a1, g.b0, g.b1, hh, rh, 'a', 1, 7, 1); antennaAt(g); })];
  // porche : plancher, deux poteaux blancs et un auvent
  const pa0 = lv === 3 ? g.ca - 4 : g.a0 + 1, pa1 = lv === 3 ? g.ca + 4 : g.a1 - 1, pb = g.b1 + 3.2, pz = lv === 3 ? 5.5 : 5;
  parts.push(part((pa0 + pa1) / 2, g.b1 + 1.6, .2, () => {
    const sv = SH.CUR; SH.CUR = M.NEUTRAL;
    boxS(pa0, pa1, g.b1, pb, 0, .7, 1, 0);
    line3(pa0 + .5, pb - .5, .7, pa0 + .5, pb - .5, pz, 1); line3(pa1 - .5, pb - .5, .7, pa1 - .5, pb - .5, pz, 1);
    SH.CUR = sv; const rm = SH.CUR; SH.CUR = M.ROOF_USC;
    drawFace([pa0, g.b1, pz + 1.5, pa1, g.b1, pz + 1.5, pa1, pb + .3, pz, pa0, pb + .3, pz], [0, 1.5, 3.3], (x: number, y: number) => bz(x, y) < 6 ? 1 : 0, 1);
    SH.CUR = rm;
  }));
  if (lv >= 2){
    // garage accole, porte a lames
    const ga0 = g.a1, ga1 = g.a1 + 7, gb0 = g.b0 + 2, gb1 = g.b1;
    parts.push(part((ga0 + ga1) / 2, (gb0 + gb1) / 2, 0, () => boxS(ga0, ga1, gb0, gb1, 0, 6, (u: number, h: number, x: number, y: number, k: number) => {
      if (k === 0 && u >= 1 && u < 6 && h < 4.6) return (Math.floor(h * 1.4) & 1) ? 1 : 0;
      return (h % 2) < .45 ? 1 : wallBase(k, x, y);
    }, (x: number, y: number) => bz(x, y) < 3 ? 1 : 0)));
  }
  const fb0 = lot.b1 - 2, decals: (() => void)[] = [];
  parts.push(part(lot.ca, fb0, 0, () => { picket(lot.a0 + 3, fb0, lot.ca - 2, fb0); picket(lot.ca + 2, fb0, lot.a1 - 3, fb0); }));
  if (lv >= 2 || seed % 2 === 0) parts.push(part(lot.a1 - 5, lot.cb + 9, 0, () => drawCar(lot.a1 - 5, lot.cb + 9, 'b', 1, 'usc')));
  if (lv === 3){
    const qa = lot.a0 + 2, qb = lot.b1 - 7;
    decals.push(() => { const sv = SH.CUR; SH.CUR = M.WATER; drawFace([qa, qb, 0, qa + 8, qb, 0, qa + 8, qb + 4, 0, qa, qb + 4, 0], UP, (x: number, y: number) => bz(x, y) < 3 ? 1 : 0, 1); SH.CUR = sv; });
  }
  return { parts, decals, lights: houseLights(g) };
}
// CCR : isba en rondins aux volets bleus, puis datcha verte a veranda vitree, puis datcha de ministre a etage, avec sa voiture noire
function maisonCCR(lot: Building, seed: number, lv: number): BuiltParts {
  const la = lv === 1 ? 13 : lv === 2 ? 16 : 20, lb = 11, hh = lv === 1 ? 7 : lv === 2 ? 8 : 13, rh = lv === 1 ? 7 : 6;
  const g = houseGeo(lot.ca, lot.cb - 3, la, lb, hh, rh, seed, 'a', 0);
  const mat = lv === 1 ? M.PIER : lv === 2 ? M.USC2 : M.CCP3;
  // rondins couches, bouts qui depassent aux angles ; ou planches verticales peintes
  const logs = (u: number, h: number, len: number, x: number, y: number, k: number) => (h % 1.5) < .5 ? 1 : ((u < .7 || u > len - .7) ? ((Math.floor(h / 1.5) & 1) ? 1 : 0) : wallBase(k, x, y));
  const boards = (u: number, h: number, len: number, x: number, y: number, k: number) => (u % 2) < .45 ? 1 : wallBase(k, x, y);
  const parts: Part[] = [part(g.ca, g.cb, 0, (t: number) => {
    SH.CUR = mat; const acc = SH.ACC; SH.ACC = M.FLAG_BLUE;
    houseWalls(g, lv === 1 ? logs : boards, lv === 1 ? 5 : 1);
    SH.ACC = acc;
    SH.CUR = lv === 2 ? M.ROOF_CCP : M.ROOF_USC; gableRoof2(g.a0, g.a1, g.b0, g.b1, hh, rh, 'a', 1, 7, 1);
    SH.CUR = mat;
  }), part(g.ca, g.cb, .5, (t: number) => { SH.CUR = M.BRICK; drawChimney(g, t, seed); })];
  if (lv >= 2){
    // veranda vitree devant la porte
    const va0 = g.ca - (lv === 3 ? 6 : 5), va1 = g.ca + (lv === 3 ? 6 : 5), vb1 = g.b1 + 4;
    parts.push(part(g.ca, g.b1 + 2, .2, () => {
      SH.CUR = M.NEUTRAL;
      boxS(va0, va1, g.b1, vb1, 0, 5, (u: number, h: number, x: number, y: number) => (h < 1.2 || h > 4.4 || (u % 2) < .5) ? 1 : (COLOR && SH.DAY ? 3 : (bz(x, y) < 4 ? 3 : 0)), (x: number, y: number) => bz(x, y) < 5 ? 1 : 0);
    }));
  }
  const decals: (() => void)[] = [() => { for (let r = 0; r < 4; r++){ const b = g.b1 + 6 + r * 1.6; for (let a = g.a0 - 4; a <= g.a0 + 4; a += 1){ if ((Math.round(a) + r) & 1) continue; const p = prj(a, b, 0); fput(Math.round(p[0]), Math.round(p[1]), 1); } } }];
  if (lv === 3){
    // palissade et la voiture noire du ministre
    const fb0 = lot.b1 - 2;
    parts.push(part(lot.ca, fb0, 0, () => { SH.CUR = M.CCP3; wallFace(lot.a0 + 3, fb0, lot.ca - 3, fb0, 0, 2.4, (u: number) => (u % 1.2) < .5 ? 1 : 0, 1) || wallFace(lot.ca - 3, fb0, lot.a0 + 3, fb0, 0, 2.4, 0, 1); }));
    parts.push(part(lot.a1 - 5, lot.cb + 9, 0, () => drawCar(lot.a1 - 5, lot.cb + 9, 'b', 1, 'ccp')));
  }
  return { parts, decals, lights: houseLights(g) };
}
