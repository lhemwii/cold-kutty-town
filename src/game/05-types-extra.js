/* ================= nouveaux batiments ================= */
const PIN_SPR = artSprite(['  ##  ', ' #### ', ' #### ', '  ##  ', '  ..  ', '  ##  ', ' #### ', '######', '######', '######', ' #### ', '  ##  ']);
Object.assign(TYPES, {
  motel: { name: 'Motel', nameCCP: 'Hôtel du Peuple', fem: false, build(lot, seed){
    const ccp = lot.side === 'ccp';
    const a0 = Math.round(lot.a0 + 2), a1 = a0 + 27, b0 = Math.round(lot.cb - 10), b1 = b0 + 10;
    const body = () => boxS(a0, a1, b0, b1, 0, 6, (u, h, x, y, k) => {
      if (k === 0){
        if (h > 5.3) return 1;
        const r = u % 4.5;
        if (r > .6 && r < 1.9 && h < 4.4) return (r < .9 || r > 1.6 || h > 4.1) ? 1 : 0;
        if (r > 2.4 && r < 4 && h > 2 && h < 4) return hash2(Math.floor(u / 4.5), seed) < .6 ? 3 : (bz(x, y) < 6 ? 1 : 0);
        return 0;
      }
      return wallBase(k, x, y);
    }, 0);
    const porch = () => {
      drawFace([a0, b1, 5, a1, b1, 5, a1, b1 + 3, 4.4, a0, b1 + 3, 4.4], [0, 1, 6], (x, y) => bz(x, y) < 3 ? 1 : 0, 1);
      for (let u = 0; u <= 27; u += 9) line3(a0 + u, b1 + 3, 0, a0 + u, b1 + 3, 4.4, 1);
    };
    const sign = (t) => {
      CUR = M.METAL;
      const p0 = prj(a1 + 3, b1 + 5, 0), x = Math.round(p0[0]), y = Math.round(p0[1]);
      for (let k = 0; k < 22; k++){ fput(x, y - k, 1); fput(x + 1, y - k, 0); }
      plateW(ccp ? 'HOTEL' : 'MOTEL', a1 + 3, b1 + 5, 20);
      const on = Math.floor(t * 2) % 3 !== 2;
      plateW(ccp ? 'COMPLET' : 'LIBRE', a1 + 3, b1 + 5, 10, { inv: true, off: !on });
    };
    const parts = [part(lot.ca, lot.cb - 5, 0, body), part(lot.ca, b1 + 1.5, .3, porch), part(a1 + 3, b1 + 5, 0, sign)];
    if (!ccp) for (const ca of [a0 + 7, a0 + 18]) parts.push(part(ca, b1 + 10, 0, () => drawCar(ca, b1 + 10, 'b', -1, 'usc')));
    return { parts, lights: [Lc(lot.ca, b1 + 6, 12, 1.2), Lc(a1 + 3, b1 + 5, 9, 1.4)] };
  } },
  drivein: { name: 'Drive-in', nameCCP: 'Ciné plein air', fem: false, build(lot, seed){
    const ccp = lot.side === 'ccp';
    const a0 = lot.a0 + 4, a1 = lot.a1 - 4, sb = lot.b0 + 4, L = a1 - a0;
    const screen = (t) => {
      CUR = M.METAL;
      for (const pa of [a0 + 4, a1 - 4]) line3(pa, sb - .5, 0, pa, sb - .5, 5, 1);
      CUR = M.SCREEN;
      boxS(a0, a1, sb - 1, sb, 5, 17, (u, h, x, y, k) => {
        if (k !== 0) return bz(x, y) < 2 ? 1 : 0;
        if (h < .6 || h > 11.4 || u < .6 || u > L - .6) return 1;
        const px = ((t * 3) % (L + 12)) - 6, py = 6 + Math.sin(t * 2) * 1.5, dx = u - px, dy = h - py;
        if (!ccp){
          if ((dx / 4) ** 2 + (dy / 1.1) ** 2 < 1) return 0;
          if (dy > 0 && (dx / 1.8) ** 2 + ((dy - 1) / 1.3) ** 2 < 1) return 0;
          if (Math.abs(dx) < .5 && dy < -1 && dy > -5 && ((t * 6) | 0) & 1) return 0;
        } else {
          if (dx > -4 && dx < 3 && Math.abs(dy) < 1) return 0;
          if (dx >= 3 && dx < 5.5 && Math.abs(dy) < (5.5 - dx) * .45) return 0;
          if (dx <= -4 && dx > -7.5 && Math.abs(dy) < .7 && (((t * 8) | 0) & 1)) return 0;
        }
        return bz(x, y) < 12 ? 1 : 0;
      }, 0);
    };
    const parts = [part(lot.ca, sb, 0, screen)];
    [[a0 + 5, sb + 12], [a0 + 14, sb + 12], [a0 + 23, sb + 12], [a0 + 9, sb + 21], [a0 + 19, sb + 21]].forEach(([ca, cb], k) => {
      if (hash2(seed + k, 3) < .2) return;
      parts.push(part(ca, cb, 0, () => { drawCar(ca, cb, 'b', -1, lot.side); CUR = M.METAL; line3(ca + 4, cb, 0, ca + 4, cb, 3, 1); }));
    });
    parts.push(part(lot.a1 - 3, lot.b1 - 3, 0, () => { const sa = lot.a1 - 3, sb = lot.b1 - 3; CUR = M.METAL; line3(sa - 6, sb, 0, sa - 6, sb, 8, 1); line3(sa + 6, sb, 0, sa + 6, sb, 8, 1); plateW(ccp ? 'CINE' : 'DRIVE IN', sa, sb, 8); }));
    return { parts, lights: [Lc(lot.ca, sb + 12, 17, 1.2)] };
  } },
  bowling: { name: 'Bowling', fem: false, build(lot, seed){
    const la = 28, lb = 17, hh = 8;
    const a0 = Math.round(lot.ca - la / 2), a1 = a0 + la, b0 = Math.round(lot.cb - lb / 2) - 2, b1 = b0 + lb;
    const body = () => boxS(a0, a1, b0, b1, 0, hh, (u, h, x, y, k) => {
      if (h > hh - 1.4) return (Math.floor(u * 1.5) & 1) ? 1 : 0;
      if (k === 0){
        if (u >= 12 && u < 16 && h < 5) return (u < 12.5 || u >= 15.5 || h >= 4.6) ? 1 : 3;
        if (h > 2 && h < 5 && u > 2 && u < la - 2 && !(u > 11 && u < 17)) return (Math.floor(u) % 3 === 0) ? 0 : 3;
        return 0;
      }
      return wallBase(k, x, y);
    }, 0);
    const sign = (t) => {
      const p = prj(lot.ca - 8, b1 - 2, hh), x = Math.round(p[0]), y = Math.round(p[1]);
      CUR = M.NEUTRAL; blit(PIN_SPR, x, y);
      const on = (COLOR && DAY) || Math.floor(t * 3) % 6 !== 5; facadePlate('BOWLING', lot.ca + 4, b1, b0, hh + 1, { off: !on });
    };
    return { parts: [part(lot.ca, lot.cb - 2, 0, body), part(lot.ca, lot.cb - 2, .5, sign)], lights: [Lc(lot.ca, b1 + 7, 14, 1.4)] };
  } },
  radio: { name: 'Tour radio', fem: true, build(lot, seed){
    const ca = lot.ca - 5, cb = lot.cb - 3, HT = 50, ccp = lot.side === 'ccp';
    const legs = [[-6, -6], [6, -6], [6, 6], [-6, 6]];
    const at = (d, z) => d * (1 - .82 * z / HT);
    const mast = (t) => {
      CUR = M.METAL;
      for (const [da, db] of legs) line3(ca + da, cb + db, 0, ca + at(da, HT), cb + at(db, HT), HT, 1);
      for (let z = 0; z < HT - 4; z += 7) for (let i = 0; i < 4; i++){
        const p = legs[i], q = legs[(i + 1) % 4];
        line3(ca + at(p[0], z), cb + at(p[1], z), z, ca + at(q[0], z + 7), cb + at(q[1], z + 7), z + 7, 1);
      }
      line3(ca, cb, HT, ca, cb, HT + 7, 1);
      const top = prj(ca, cb, HT + 8), tx = Math.round(top[0]), ty = Math.round(top[1]);
      CUR = M.REDLIGHT;
      if ((t % 1.2) < .6){ fput(tx, ty, 1); fput(tx - 1, ty, 1); fput(tx + 1, ty, 1); fput(tx, ty - 1, 1); }
      CUR = M.BEAM;
      for (let k = 0; k < 2; k++){
        const r = ((t * 14 + k * 11) % 22) + 4;
        for (let a = -Math.PI * .85; a < -Math.PI * .15; a += .12){ const x = Math.round(tx + Math.cos(a) * r * 1.3), y = Math.round(ty + Math.sin(a) * r * .8); if (bz(x, y) < 10) fput(x, y, 1); }
      }
    };
    const cabin = () => {
      boxS(lot.ca + 5, lot.ca + 14, lot.cb + 3, lot.cb + 10, 0, 5, (u, h, x, y, k) => { const kk = win(u, h, 2, 2, 3, 2); if (kk) return winColor(kk, true, x, y); return wallBase(k, x, y); }, 0);
      facadePlate(ccp ? 'RADIO MS' : 'RADIO KL', lot.ca + 9.5, lot.cb + 10, lot.cb + 3, 6);
    };
    return { parts: [part(ca, cb, 0, mast), part(lot.ca + 9.5, lot.cb + 6.5, 0, cabin)], lights: [Lc(lot.ca + 9.5, lot.cb + 14, 9, 1.2)] };
  } },
  fusee: { name: 'Base spatiale', nameCCP: 'Cosmodrome', fem: false, build(lot, seed){
    const ca = lot.ca - 2, cb = lot.cb, ccp = lot.side === 'ccp';
    const pad = () => {
      CUR = M.METAL;
      boxS(ca - 11, ca + 11, cb - 10, cb + 10, 0, 1.5, 0, (x, y) => bz(x, y) < 3 ? 1 : 0);
      const ga = ca + 7, gb = cb - 2;
      for (const [da, db] of [[0, 0], [3, 0], [3, 3], [0, 3]]) line3(ga + da, gb + db, 1.5, ga + da, gb + db, 36, 1);
      for (let z = 4; z < 36; z += 5){ line3(ga, gb + 3, z, ga + 3, gb + 3, z + 5, 1); line3(ga, gb, z, ga, gb + 3, z + 5, 1); }
      for (const z of [12, 26]) line3(ga, gb + 1.5, z, ca + 1.5, cb, z, 1);
    };
    const rocket = (t) => {
      const L = SPACE[lot.side] && SPACE[lot.side].launchT;
      const p = L == null ? 0 : 64 + (t - L), rise = p < 70 ? 0 : (p - 70) * (p - 70) * 1.3;
      const base = prj(ca, cb, 2), bx = Math.round(base[0]), by0 = Math.round(base[1]);
      if (p >= 64 && p < 78){
        CUR = M.SMOKE;
        const k = Math.min(1, (p - 64) / 4);
        for (let dy = -6; dy <= 4; dy++) for (let dx = -18; dx <= 18; dx++){ const q = (dx / (18 * k + 1)) ** 2 + (dy / 5) ** 2; if (q < 1 && bz(bx + dx, by0 + dy) < (1 - q) * 13 * (p < 74 ? 1 : (78 - p) / 4)) fput(bx + dx, by0 + dy, 1); }
      }
      if (rise > 400) return;
      const by = by0 - Math.round(rise);
      CUR = M.ROCKET;
      for (let dx = -3; dx <= 3; dx++){
        const xn = dx / 3.5, top = 28 - Math.round(Math.abs(dx) * .4);
        for (let h = 0; h <= top; h++){
          let c = h === 0 || Math.abs(dx) === 3 ? 1 : (bz(bx + dx, by - h) < clamp(13 - (xn + .3) * 9, 1, 16) ? 1 : 0);
          if (h > 6 && h < 9) c = 0;
          const word = ccp ? 'CCR' : 'USC', li = Math.floor((h - 11) / 6), lr = (h - 11) - li * 6;
          if (li >= 0 && li < 3 && lr < 5 && dx >= -1 && dx <= 1){ const g = FONT[word[2 - li]]; if (g) c = g[(4 - lr) * 3 + (dx + 1)] === '1' ? 0 : 1; }
          fput(bx + dx, by - h, c);
        }
      }
      for (let k = 0; k < 7; k++) for (let dx = -Math.max(0, 2 - (k >> 1)); dx <= Math.max(0, 2 - (k >> 1)); dx++) fput(bx + dx, by - 29 - k, k === 6 ? 1 : (dx < 0 ? 1 : 0));
      for (const s of [-1, 1]) for (let k = 0; k < 5; k++){ fput(bx + s * (4 + (k >> 1)), by - k, 1); if (k < 3) fput(bx + s * (5 + (k >> 1)), by - k, 1); }
      if (p >= 68 && rise <= 400){
        CUR = M.LAMP;
        const fl = 5 + ((t * 20) | 0) % 4 + Math.min(10, rise * .05);
        for (let k = 1; k <= fl; k++){ const w = Math.max(0, 2 - Math.floor(k / 3)); for (let dx = -w; dx <= w; dx++) if (bz(bx + dx, by + k) < 16 - k) fput(bx + dx, by + k, 1); }
      }
    };
    return { parts: [part(ca, cb, 0, pad), part(ca, cb, .5, rocket)], lights: [Lc(ca, cb + 4, 15, 1.2)] };
  } },
  cirque: { name: 'Cirque', nameCCP: 'Cirque du Peuple', fem: false, build(lot, seed){
    const ca = lot.ca, cb = lot.cb - 2, R = 12, ccp = lot.side === 'ccp';
    const draw = (t) => {
      const C = prj(ca, cb, 0), cx = Math.round(C[0]), cy = Math.round(C[1]);
      const rx = R * 1.414, ry = rx / 2, wallH = 7, apexY = cy - wallH - 19, baseY = cy - wallH;
      const stripe = (th) => (Math.floor(((th + cam.phi) / TAU) * 18 + 100) & 1);
      CUR = M.TENT;
      for (let dx = -Math.ceil(rx); dx <= Math.ceil(rx); dx++){
        const s = Math.sqrt(Math.max(0, 1 - (dx / (rx + .5)) ** 2)); if (s <= 0) continue;
        const yf = Math.round(cy + ry * s), th = Math.acos(clamp(dx / rx, -1, 1));
        const st = stripe(th);
        for (let y = yf - wallH; y <= yf; y++){
          let c = y === yf ? 1 : (st ? 1 : (bz(cx + dx, y) < 3 ? 1 : 0));
          if (Math.abs(dx) < 3 && y > yf - 6) c = (Math.abs(dx) === 2 || y === yf - 5) ? 1 : 0;
          fput(cx + dx, y, c);
        }
        const yTop = Math.round(apexY + (baseY - apexY) * Math.abs(dx) / rx), yBot = Math.round(baseY + ry * s) - 1;
        for (let y = yTop; y <= yBot; y++){
          const f = Math.max(.06, (y - apexY) / (baseY + ry * s - apexY));
          const th2 = Math.acos(clamp(dx / (rx * f), -1, 1));
          const edge = y === yTop || y === yBot;
          fput(cx + dx, y, edge ? 1 : (stripe(th2) ? 1 : (bz(cx + dx, y) < 4 ? 1 : 0)));
        }
      }
      CUR = M.METAL;
      for (let k = 1; k <= 5; k++) fput(cx, apexY - k, 1);
      for (const [x, y, m, v] of flagSmall(ccp ? 'ccp' : 'usc', 9, 6)){ CUR = m; fput(cx + 1 + x, apexY - 6 + y, v); }
      CUR = M.LAMP;
      for (let k = 0; k < 14; k++){ const a = Math.PI * (k / 13), x = Math.round(cx + Math.cos(a) * rx * .98), y = Math.round(cy - wallH + Math.sin(a) * ry * .98 - 1); if (((k + ((t * 3) | 0)) & 1)) fput(x, y, 1); }
    };
    const sign = () => { const sb = cb + R + 4; CUR = M.METAL; line3(ca - 8, sb, 0, ca - 8, sb, 4, 1); line3(ca + 8, sb, 0, ca + 8, sb, 4, 1); plateW('CIRQUE', ca, sb, 4); };
    return { parts: [part(ca, cb, 0, draw), part(ca, cb + R + 4, 0, sign)], lights: [Lc(ca, cb + 14, 13, 1.4), Lc(ca, cb, 10, .8)] };
  } },
  fontaine: { name: 'Fontaine', fem: true, build(lot, seed){
    const ca = lot.ca, cb = lot.cb;
    const decal = () => {
      CUR = M.WALK;
      for (const [r, st] of [[14, .05], [11.5, .09]]) for (let a = 0; a < TAU; a += st){ const p = prj(ca + Math.cos(a) * r, cb + Math.sin(a) * r, 0); fput(Math.round(p[0]), Math.round(p[1]), 1); }
    };
    const draw = (t) => {
      const C = prj(ca, cb, 0), cx = Math.round(C[0]), cy = Math.round(C[1]);
      const rx = 11, ry = 5.5;
      for (let dx = -rx; dx <= rx; dx++){
        const s = Math.sqrt(Math.max(0, 1 - (dx / (rx + .5)) ** 2));
        const yf = Math.round(cy + ry * s), yb = Math.round(cy - ry * s);
        CUR = M.WATER;
        for (let y = yb - 2; y <= yf - 2; y++) fput(cx + dx, y, (y === yb - 2 || y === yf - 2) ? 1 : (((y + Math.floor(t * 4 + dx * .3)) % 3 === 0) ? 1 : (bz(cx + dx, y) < 3 ? 1 : 0)));
        CUR = M.WALL;
        for (let y = yf - 1; y <= yf; y++) fput(cx + dx, y, y === yf ? 1 : (bz(cx + dx, y) < 6 ? 1 : 0));
        fput(cx + dx, yb - 3, 1);
      }
      CUR = M.WALL;
      for (let y = cy - 8; y <= cy - 2; y++){ fput(cx - 1, y, 1); fput(cx, y, 0); fput(cx + 1, y, 1); }
      CUR = M.WATER;
      for (let k = 0; k < 14; k++){
        const p = ((t * .9 + k / 14) % 1), a = k * TAU / 14 + t * .15;
        const x = Math.round(cx + Math.cos(a) * p * 9), y = Math.round(cy - 9 - 30 * p * (1 - p) + Math.sin(a) * p * 4.5 + p * 7);
        fput(x, y, 1); if (p < .5) fput(x, y - 1, 1);
      }
      if ((t * 4 | 0) & 1) fput(cx, cy - 10, 1);
    };
    const bench = (ba, bb) => part(ba, bb, 0, () => { CUR = M.PIER; line3(ba - 3, bb, 2, ba + 3, bb, 2, 1); line3(ba - 3, bb, 0, ba - 3, bb, 2, 1); line3(ba + 3, bb, 0, ba + 3, bb, 2, 1); });
    return { parts: [part(ca, cb, 0, draw), bench(ca, cb + 12), bench(ca, cb - 12)], decals: [decal], lights: [Lc(ca, cb, 13, 1.1)] };
  } }
});
const typeName = (key, side) => (side === 'ccp' && TYPES[key].nameCCP) ? TYPES[key].nameCCP : TYPES[key].name;
