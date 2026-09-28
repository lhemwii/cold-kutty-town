/* ================= statues ================= */
const STATUE_CCP = artSprite([
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
const STATUE_USC = artSprite([
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
function seedOf(lot){ return Math.abs(Math.round(lot.ca * 7 + lot.cb * 13)) % 97; }
const TYPES = {
  maison: { name: 'Maison', fem: true, build(lot, seed){
    const lv = lot.lvl || 1;
    const la = 14 + (seed % 3) * 2 + (lv === 3 ? 6 : 0), lb = 12 + (lv === 3 ? 2 : 0), hh = 8 + (seed % 2) + (lv >= 2 ? 5 : 0), rh = 6;
    const g = houseGeo(lot.ca, lot.cb - 2, la, lb, hh, rh, seed, 'a', 0);
    const usc = lot.side === 'usc', chim = seed % 3 === 0;
    const parts = [part(g.ca, g.cb, 0, (t) => { drawHouse(g); if (!chim) antennaAt(g); })];
    if (chim) parts.push(part(g.ca, g.cb, .5, (t) => drawChimney(g, t, seed)));
    const decals = [];
    if (lv === 3){
      // piscine a l'ouest, potager a l'est
      const pa0 = lot.a0 + 3, pb0 = lot.b1 - 9;
      decals.push(() => { const sv = CUR; CUR = usc ? M.WATER : M.FIELD; drawFace([pa0, pb0, 0, pa0 + 8, pb0, 0, pa0 + 8, pb0 + 5, 0, pa0, pb0 + 5, 0], UP, usc ? ((x, y) => bz(x, y) < 3 ? 1 : 0) : ((x, y) => (x + y) & 1), usc ? 1 : 0); CUR = sv; });
    }
    if (usc){
      const fb0 = lot.b1 - 2;
      parts.push(part(lot.ca, fb0, 0, () => { picket(lot.a0 + 3, fb0, lot.ca - 2, fb0); picket(lot.ca + 2, fb0, lot.a1 - 3, fb0); }));
      if (seed % 2 === 0) parts.push(part(lot.a1 - 5, lot.cb + 9, 0, () => drawCar(lot.a1 - 5, lot.cb + 9, 'b', 1, 'usc')));
    } else {
      decals.push(() => { for (let r = 0; r < 4; r++){ const b = g.b1 + 3 + r * 1.6; for (let a = g.a0; a <= g.a1; a += 1){ if ((Math.round(a) + r) & 1) continue; const p = prj(a, b, 0); fput(Math.round(p[0]), Math.round(p[1]), 1); } } });
    }
    return { parts, decals, lights: houseLights(g) };
  } },
  mairie: { name: 'Mairie', fem: true, build(lot, seed){
    const g = houseGeo(lot.ca, lot.cb - 2, 26, 18, 12, 8, seed, 'a', 0);
    g.lit = [true, true, false, true];
    const parts = [part(g.ca, g.cb, 0, () => drawHouse(g)), part(g.ca, g.cb, .5, (t) => {
      const p = prj(g.ca, (g.b0 + g.b1) / 2, g.hh + g.rh), bx = Math.round(p[0]), by = Math.round(p[1]);
      for (let y = by - 11; y <= by; y++) for (let x = bx - 3; x <= bx + 3; x++) fput(x, y, (x === bx - 3 || x === bx + 3 || y === by - 11) ? 1 : 0);
      fput(bx, by - 8, 1); fput(bx - 1, by - 7, 1); fput(bx + 1, by - 7, 1); fput(bx, by - 7, Math.sin(t * 2) > .6 ? 1 : 0);
      for (let r = 1; r <= 5; r++) for (let x = bx - 4 + r; x <= bx + 4 - r; x++) fput(x, by - 11 - r, (x === bx - 4 + r || x === bx + 4 - r) ? 1 : 0);
      fput(bx, by - 17, 1); fput(bx, by - 18, 1);
    }), part(g.ca + 10, g.b1 + 4, 0, (t) => drawFlagPole(g.ca + 10, g.b1 + 4, 0, 20, 'usc', t)),
      part(g.ca, g.b1, .3, () => { if (!frontVisible(0)) return; const p = prj(g.ca, g.b1, g.hh - 1); plate(fput, 'MAIRIE', Math.round(p[0]), Math.round(p[1])); })];
    return { parts, lights: houseLights(g).concat([Lc(g.ca, g.b1 + 9, 14, 1.3)]) };
  } },
  diner: { name: 'Diner', fem: false, build(lot, seed){
    const la = 26, lb = 12, hh = 7;
    const a0 = Math.round(lot.ca - la / 2), a1 = a0 + la, b0 = Math.round(lot.cb - lb / 2), b1 = b0 + lb;
    const body = () => boxS(a0, a1, b0, b1, 0, hh, (u, h, x, y, k) => {
      if (h < 1.2) return 1;
      if (h >= 6) return bz(x, y) < 8 ? 1 : 0;
      if (k === 0 && u >= 11 && u < 14 && h < 5.5) return (u < 11.6 || u >= 13.4 || h >= 5) ? 1 : 0;
      const len = (k & 1) ? lb : la;
      if (k !== 2 && h >= 2.3 && h < 5.5 && u >= 1.5 && u < len - 1.5) return (Math.floor(u) % 4 === 0) ? 0 : 3;
      if (k === 2){ const kk = win(u, h, 4, 2.3, 3, 3); if (kk) return winColor(kk, false, x, y); }
      return 0;
    }, 0);
    const sign = (t) => {
      const on = (COLOR && DAY) || Math.floor(t * 2.5) % 5 !== 4;
      const p = prj(lot.ca, lot.cb, hh), bx = Math.round(p[0]), by = Math.round(p[1]);
      for (let k = 0; k <= 3; k++){ fput(bx - 6, by - k, 1); fput(bx + 6, by - k, 1); }
      const r = plate(fput, 'DINER', bx, by - 3, { off: !on });
      CUR = M.SIGN; if (on) drawStar(fput, bx - 2, r[1] - 6, 1);
    };
    return { parts: [part(lot.ca, lot.cb, 0, body), part(lot.ca, lot.cb, .5, sign)],
      lights: [Lc(lot.ca, b1 + 7, 15, 1.45), sideLight(a0, a1, b0, b1, 1, 9, 1.2), sideLight(a0, a1, b0, b1, 3, 9, 1.2)] };
  } },
  cinema: { name: 'Cinéma', fem: false, build(lot, seed){
    const la = 22, lb = 18, hh = 15;
    const a0 = Math.round(lot.ca - la / 2), a1 = a0 + la, b0 = Math.round(lot.cb - lb / 2) - 2, b1 = b0 + lb;
    const body = () => boxS(a0, a1, b0, b1, 0, hh, (u, h, x, y, k) => {
      if (h >= 11) return (Math.floor(u) % 3 === 0) ? 1 : 0;
      if (k === 0){
        if (u >= 8 && u < 14 && h < 5.5) return (u < 8.6 || u >= 13.4 || h >= 5 || Math.abs(u - 11) < .5) ? 1 : 0;
        for (const pu of [2, 16.5]){ const kk = win(u, h, pu, 1.5, 3.5, 5); if (kk) return kk === 'in' ? (bz(x, y) < 7 ? 1 : 0) : 1; }
        return 0;
      }
      return wallBase(k, x, y);
    }, 0);
    const marquee = (t) => {
      boxS(a0 + 1, a1 - 1, b1, b1 + 4, 7, 10, 0, (x, y) => bz(x, y) < 6 ? 1 : 0);
      if (!frontVisible(0)) return;
      const ph = Math.floor(t * 4) & 1;
      CUR = M.WIN;
      for (let u = 1; u < la - 2; u += 2){ const p = prj(a0 + 1 + u + .5, b1 + 4, 8.5); fput(Math.round(p[0]), Math.round(p[1]), ((u >> 1) & 1) === ph ? 1 : 0); }
    };
    const blade = (t) => {
      const p = prj(a1 - 3, b1 + 2, 10), bx = Math.round(p[0]), by = Math.round(p[1]);
      const word = 'CINE', h = word.length * 6 + 3, k = Math.floor(t * 6) % 5;
      CUR = M.SIGN;
      for (let y = by - h; y <= by; y++) for (let x = bx - 3; x <= bx + 3; x++){
        const edge = x === bx - 3 || x === bx + 3 || y === by - h || y === by;
        fput(x, y, edge ? (((y + x) >> 1) % 5 === k ? 0 : 1) : 0);
      }
      for (let i = 0; i < word.length; i++) drawText(fput, word[i], bx - 1, by - h + 2 + i * 6, 1);
    };
    return { parts: [part(lot.ca, lot.cb - 2, 0, body), part(lot.ca, lot.cb - 2, .3, marquee), part(lot.ca, lot.cb - 2, .6, blade)],
      lights: [Lc(lot.ca, b1 + 9, 18, 1.6)] };
  } },
  station: { name: 'Station-service', fem: true, build(lot, seed){
    const a0 = Math.round(lot.a0 + 5), b0 = Math.round(lot.b0 + 3);
    const kiosk = () => boxS(a0, a0 + 10, b0, b0 + 9, 0, 7, (u, h, x, y, k) => {
      if (k === 0){ if (u >= 6.5 && u < 9 && h < 5.2) return (u < 7 || h >= 4.7) ? 1 : 0; const kk = win(u, h, 1.5, 2.3, 4, 3.4); return kk ? winColor(kk, true, x, y) : 0; }
      return wallBase(k, x, y);
    }, 0);
    const pump = (pa) => () => boxS(pa, pa + 2, b0 + 16, b0 + 18, 0, 5, (u, h) => h > 3 ? 1 : 0, 1);
    const canopy = () => {
      for (const [pa, pb] of [[a0 + 3, b0 + 22], [a0 + 22, b0 + 22], [a0 + 22, b0 + 12], [a0 + 3, b0 + 12]]) line3(pa, pb, 0, pa, pb, 9, 1);
      boxS(a0 + 1, a0 + 24, b0 + 11, b0 + 24, 9, 10.5, 1, (x, y) => bz(x, y) < 5 ? 1 : 0);
    };
    const sign = () => {
      const pp = prj(a0 + 27, b0 + 2, 0), px = Math.round(pp[0]), py = Math.round(pp[1]);
      CUR = M.SIGN;
      for (let k = 0; k < 19; k++) fput(px, py - k, 1);
      for (let dy = -7; dy <= 7; dy++) for (let dx = -7; dx <= 7; dx++){ const r = Math.hypot(dx, dy); if (r > 7.4) continue; fput(px + dx, py - 25 + dy, r > 6.3 ? 1 : 0); }
      drawText(fput, 'GAZ', px - 5, py - 27, 1);
    };
    return { parts: [part(a0 + 5, b0 + 4.5, 0, kiosk), part(a0 + 8, b0 + 17, 0, pump(a0 + 7)), part(a0 + 15, b0 + 17, 0, pump(a0 + 14)),
      part(a0 + 12.5, b0 + 17.5, 1, canopy), part(a0 + 27, b0 + 2, 0, sign)],
      lights: [Lc(a0 + 13, b0 + 17, 16, 1.6)] };
  } },
  epicerie: { name: 'Épicerie', nameCCP: 'Gastronom', fem: true, build(lot, seed){
    const la = 16, lb = 12, hh = 9, ccp = lot.side === 'ccp';
    const a0 = Math.round(lot.ca - la / 2), a1 = a0 + la, b0 = Math.round(lot.cb - lb / 2) - 3, b1 = b0 + lb;
    const body = () => boxS(a0, a1, b0, b1, 0, hh, (u, h, x, y, k) => {
      if (k === 0){ if (h >= 1 && h < 4.8 && u >= 1.5 && u < la - 1.5) return (Math.floor(u) % 4 === 0) ? 0 : (ccp && Math.floor(u) % 4 === 2 ? 0 : 3); return 0; }
      return wallBase(k, x, y);
    }, 0);
    const awning = () => {
      const savedM = CUR; if (!ccp) CUR = M.FLAG_RED;
      drawFace([a0 + 1, b1, 7, a1 - 1, b1, 7, a1 - 1, b1 + 4, 5, a0 + 1, b1 + 4, 5], [0, 2, 4],
        ccp ? ((x, y) => bz(x, y) < 3 ? 1 : 0) : alongSh(a0 + 1, b1 + 4, 5, a1 - 1, b1 + 4, 5, la - 2, (u) => (Math.floor(u / 1.5) & 1) ? 1 : 0), 1);
      CUR = savedM;
      if (!frontVisible(0) && !faceVisible([0, 2, 4])) return;
      const p = prj(lot.ca, b1, hh + .5); plate(fput, ccp ? 'GASTRONOM' : 'EPICERIE', Math.round(p[0]), Math.round(p[1]));
    };
    const parts = [part(lot.ca, lot.cb - 3, 0, body), part(lot.ca, lot.cb - 3, .3, awning)];
    // la file avance : toutes les 7 s, le premier entre, les autres font un pas, un nouveau arrive au bout
    if (ccp) for (let i = 0; i < 6; i++){ const qa = a0 - 1 + i * 3.4, qb = b1 + 7, ph = seed * .37; parts.push(part(qa, qb, 0, (t) => {
      const c = ((t + ph) % 7 + 7) % 7, p = Math.min(1, c / 1.2), slot = i + 1 - p;
      if (slot > 5 || (i === 5 && c < .15)) return;
      const hop = p < 1 ? Math.round(Math.abs(Math.sin(p * Math.PI * 3)) * -1) : 0;
      CUR = M.CAT_BLACK; blitAt(QUEUE_CAT, a0 - 1 + slot * 3.4, qb, -hop);
    })); }
    return { parts, lights: [Lc(lot.ca, b1 + 6, 12, 1.3)] };
  } },
  chateau: { name: 'Château d’eau', fem: false, build(lot, seed){
    const ca = lot.ca, cb = lot.cb, ccp = lot.side === 'ccp';
    const draw = () => {
      CUR = M.METAL;
      const legs = [[-6,-6],[6,-6],[6,6],[-6,6]], at = (d, z) => d * (1 - .2 * z / 20);
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
    const beacon = (t) => { const C = prj(ca, cb, 20), cx = Math.round(C[0]), cy = Math.round(C[1]); const on = (t % 1.6) < .5; fput(cx, cy - 22, on ? 1 : 0); if (on){ fput(cx - 1, cy - 22, 1); fput(cx + 1, cy - 22, 1); fput(cx, cy - 23, 1); } };
    return { parts: [part(ca, cb, 0, draw), part(ca, cb, .5, beacon)], lights: [] };
  } },
  kiosque: { name: 'Kiosque à musique', fem: false, build(lot, seed){
    const ca = lot.ca, cb = lot.cb;
    const draw = () => {
      CUR = M.NEUTRAL;
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
  parc: { name: 'Parc', fem: false, build(lot, seed){
    const T = [[lot.ca - 8, lot.cb - 6, 5], [lot.ca + 9, lot.cb - 3, 4], [lot.ca - 2, lot.cb + 8, 5]];
    const parts = T.map(([a, b, r]) => part(a, b, 0, () => { CUR = M.TREE; blitAt(treeSpr(r), a, b, 0); }));
    const ba = lot.ca + 6, bb = lot.cb + 7;
    parts.push(part(ba + 3, bb, 0, () => {
      CUR = M.PIER;
      line3(ba, bb, 2, ba + 6, bb, 2, 1); line3(ba, bb - 1, 4, ba + 6, bb - 1, 4, 1);
      line3(ba, bb, 0, ba, bb, 2, 1); line3(ba + 6, bb, 0, ba + 6, bb, 2, 1);
    }));
    return { parts, lights: [] };
  } },
  immeuble: { name: 'Immeuble', fem: false, build(lot, seed){
    const lv = lot.lvl || 1, la = 28, lb = 13, hh = [22, 32, 44][lv - 1];
    const a0 = Math.round(lot.ca - la / 2), a1 = a0 + la, b0 = Math.round(lot.cb - lb / 2), b1 = b0 + lb;
    const litW = (k, col, fl) => hash2(seed * 7 + k * 31 + col, fl * 13 + 5) < .34;
    const body = () => boxS(a0, a1, b0, b1, 0, hh, (u, h, x, y, k) => {
      const len = (k & 1) ? lb : la;
      if (k === 0 && u >= len / 2 - 2 && u < len / 2 + 2 && h < 4) return (u < len / 2 - 1.4 || u >= len / 2 + 1.4 || h >= 3.5) ? 1 : 0;
      if (h >= 1 && h < hh - 1.5){
        const fl = Math.floor((h - 1) / 3.5), fh = (h - 1) - fl * 3.5;
        if (fh < .5) return bz(x, y) < 5 ? 1 : 0;
        const nC = Math.floor((len - 2) / 3.5), off = (len - nC * 3.5) / 2, cu = u - off;
        if (cu >= 0 && fh >= 1 && fh < 2.9){ const col = Math.floor(cu / 3.5), cx = cu - col * 3.5; if (col < nC && cx >= .9 && cx < 2.7) return litW(k, col, fl) ? 3 : (bz(x, y) < 3 ? 1 : 0); }
      }
      return wallBase(k, x, y);
    }, 0);
    const roof = () => {
      const p = prj(lot.ca, lot.cb, hh), x = Math.round(p[0]), y = Math.round(p[1]);
      if (seed % 4 === 0){ for (let k = 0; k < 7; k++) fput(x, y - k, 1); drawStar(fput, x - 3, y - 14, 1, true); }
      else if (seed % 4 === 1){ for (let k = 0; k < 3; k++){ fput(x - 5, y - k, 1); fput(x + 5, y - k, 1); } plate(fput, 'CCR', x, y - 2, { inv: true }); }
      else boxS(lot.ca + 4, lot.ca + 8, lot.cb - 3, lot.cb + 1, hh, hh + 3, (u, h, xx, yy, k) => wallBase(k, xx, yy), 0);
    };
    const lights = [];
    for (const k of [seed % 4, (seed + 2) % 4]) lights.push(sideLight(a0, a1, b0, b1, k, 7, .9));
    return { parts: [part(lot.ca, lot.cb, 0, body), part(lot.ca, lot.cb, .5, roof)], lights };
  } },
  peuple: { name: 'Palais du Peuple', fem: false, build(lot, seed){
    const ca = lot.ca, cb = lot.cb;
    const tier = (hw, hb, z0, z1, cols) => () => boxS(ca - hw, ca + hw, cb - hb, cb + hb, z0, z1, (u, h, x, y, k) => {
      if (z0 === 0 && k === 0 && h < 8 && u > 6 && u < hw * 2 - 6) return (Math.floor(u) % 3 === 0) ? 1 : 0;
      if (h > (z1 - z0) - 1.2) return 1;
      const ph = u % cols;
      if (ph >= cols * .35 && ph < cols * .7 && h > 2 && h < (z1 - z0) - 3) return hash2(Math.floor(u / cols) + k * 17, Math.floor(h / 4) + z0) < .5 ? 3 : (bz(x, y) < 3 ? 1 : 0);
      return wallBase(k, x, y);
    }, 0);
    const spire = (t) => {
      line3(ca, cb, 33, ca, cb, 45, 1);
      const p = prj(ca, cb, 45), x = Math.round(p[0]), y = Math.round(p[1]);
      CUR = M.SIGN_CCP;
      drawStar(fput, x - 3, y - 7, 1, true);
      if (Math.sin(t * 1.3) > .7) for (let k = 0; k < 4; k++){ fput(x - 5 - k, y - 4, 1); fput(x + 5 + k, y - 4, 1); }
    };
    return { parts: [part(ca, cb, 0, tier(15, 11, 0, 12, 3)), part(ca, cb, .3, tier(9, 7, 12, 24, 3)), part(ca, cb, .6, tier(5, 4, 24, 33, 2.5)), part(ca, cb, .9, spire),
      part(ca + 12, cb + 13, 0, (t) => drawFlagPole(ca + 12, cb + 13, 0, 22, 'ccp', t))],
      lights: [Lc(ca, cb + 17, 16, 1.4), sideLight(ca - 15, ca + 15, cb - 11, cb + 11, 1, 9, 1.1), sideLight(ca - 15, ca + 15, cb - 11, cb + 11, 3, 9, 1.1)] };
  } },
  usine: { name: 'Usine', fem: true, build(lot, seed){
    const la = 28, lb = 18, hh = 10, ccp = lot.side === 'ccp';
    const a0 = Math.round(lot.ca - la / 2), a1 = a0 + la, b0 = Math.round(lot.cb - lb / 2), b1 = b0 + lb;
    const body = () => boxS(a0, a1, b0, b1, 0, hh, (u, h, x, y, k) => {
      const len = (k & 1) ? lb : la;
      if (k === 0 && u >= 3 && u < 9 && h < 7) return (u < 3.6 || u >= 8.4 || h >= 6.4) ? 1 : ((Math.floor(h) & 1) ? 1 : 0);
      if (h >= 4 && h < 8){ const ph = u % 4; if (ph >= 1 && ph < 3.4) return (hash2(Math.floor(u / 4) + k * 9, seed) < .6) ? ((Math.floor(ph * 2) === 4) ? 0 : 3) : 0; }
      return wallBase(k, x, y);
    }, 0);
    const parts = [part(lot.ca, lot.cb, 0, body)];
    for (let i = 0; i < 3; i++){ const s0 = a0 + 2 + i * 8.5; parts.push(part(s0 + 3, lot.cb, .4, () => { wallFace(s0, b1 - 1, s0 + 6, b1 - 1, hh, hh, (u, h) => h > .8 && h < 2 && u > 1.5 && u < 4.5 ? 1 : 0, 1, hh + 3); wallFace(s0 + 6, b0 + 1, s0, b0 + 1, hh, hh, 0, 1, hh + 3); gableRoof(s0, s0 + 6, b0 + 1, b1 - 1, hh, 3, 'b', 1, 6, 0); })); }
    for (const [cx, cy2, sd] of [[a0 + 4, b0 + 3, 1], [a1 - 5, b0 + 3, 2]]){
      parts.push(part(cx, cy2, .5, (t) => {
        boxS(cx - 1.5, cx + 1.5, cy2 - 1.5, cy2 + 1.5, hh, 32, (u, h) => (Math.floor(h) % 6 === 0) ? 1 : 0, 0);
        const p = prj(cx, cy2, 32); smokeAt(p[0], p[1] - 1, t * 1.4, sd + seed); smokeAt(p[0] + 2, p[1] - 3, t * 1.1 + .5, sd * 3 + seed);
      }));
    }
    parts.push(part(lot.ca, b1, .6, () => { if (!frontVisible(0)) return; const p = prj(lot.ca, b1, hh + .5); plate(fput, ccp ? 'USINE 7' : 'KUTTY MOTORS', Math.round(p[0]), Math.round(p[1])); }));
    return { parts, lights: [sideLight(a0, a1, b0, b1, 0, 10, 1.2), sideLight(a0, a1, b0, b1, 1, 8, 1.1)] };
  } },
  statue: { name: 'Statue', fem: true, build(lot, seed){
    const ca = lot.ca, cb = lot.cb, ccp = lot.side === 'ccp';
    const draw = () => {
      boxS(ca - 5, ca + 5, cb - 5, cb + 5, 0, 1.5, (u, h, x, y, k) => bz(x, y) < 5 ? 1 : 0, 0);
      boxS(ca - 3.5, ca + 3.5, cb - 3.5, cb + 3.5, 1.5, 9, (u, h, x, y, k) => { const kk = win(u, h, 1.5, 2.5, 4, 3); if (kk) return kk === 'frame' ? 1 : 0; return wallBase(k, x, y); }, 0);
      CUR = M.STATUE; blitAt(ccp ? STATUE_CCP : STATUE_USC, ca, cb, 9);
    };
    return { parts: [part(ca, cb, 0, draw)], lights: [Lc(ca, cb + 8, 13, 1.4)] };
  } },
  panneau: { name: 'Panneau', fem: false, build(lot, seed){
    const ca = lot.ca, cb = lot.cb, ccp = lot.side === 'ccp';
    const L1 = ccp ? 'GLOIRE AU' : 'BOIS', L2 = ccp ? 'PLAN !' : 'KUTTY COLA';
    const draw = (t) => {
      CUR = M.METAL;
      line3(ca - 7, cb, 0, ca - 7, cb, 9, 1); line3(ca + 7, cb, 0, ca + 7, cb, 9, 1);
      const p = prj(ca, cb, 9), x = Math.round(p[0]), y = Math.round(p[1]);
      CUR = ccp ? M.SIGN_CCP : M.SIGN;
      const w = 45, h = 19, x0 = x - 22, y0 = y - h;
      for (let yy = y0; yy <= y; yy++) for (let xx = x0; xx < x0 + w; xx++){ const e = xx === x0 || xx === x0 + w - 1 || yy === y0 || yy === y; fput(xx, yy, e ? 1 : (ccp ? 1 : 0)); }
      const c = ccp ? 0 : 1;
      drawText(fput, L1, x - (textW(L1) >> 1), y0 + 3, c); drawText(fput, L2, x - (textW(L2) >> 1), y0 + 10, c);
      if (ccp){ drawStar(fput, x0 + 2, y0 + 2, 0); drawStar(fput, x0 + w - 7, y0 + 2, 0); }
      else if (Math.floor(t * 1.5) % 2) { fput(x0 + 3, y0 + 3, 1); fput(x0 + w - 4, y0 + 3, 1); }
    };
    return { parts: [part(ca, cb, 0, draw)], lights: [Lc(ca, cb + 7, 14, 1.5)] };
  } }
};
