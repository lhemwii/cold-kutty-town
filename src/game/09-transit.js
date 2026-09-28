/* ================= chemin de fer : une ligne par camp, la gare bute contre le mur ================= */
const TR = { cars: 4, carL: 13, gap: 1, acc: 5, vmax: 32, dwell: 14 };
TR.len = TR.cars * TR.carL + (TR.cars - 1) * TR.gap;
let RAIL = { usc: null, ccp: null };
let CROSSINGS = [];
function trapezoid(D, acc, vmax){
  let ta = vmax / acc, da = .5 * acc * ta * ta;
  if (2 * da > D){ ta = Math.sqrt(D / acc); da = D / 2; vmax = acc * ta; }
  const T = 2 * ta + (D - 2 * da) / vmax;
  return { T, at: (tau) => tau <= 0 ? 0 : tau >= T ? D : tau < ta ? .5 * acc * tau * tau : tau < T - ta ? da + vmax * (tau - ta) : D - .5 * acc * (T - tau) * (T - tau),
    vt: (tau) => tau <= 0 || tau >= T ? 0 : tau < ta ? acc * tau : tau < T - ta ? vmax : acc * (T - tau) };
}
function buildRail(){
  CROSSINGS = [];
  for (const side of ['usc', 'ccp']){
    let lo = null, hi = null;
    for (let a = GA0 + 1; a < GA0 + GW / GSC - 1; a += 1){
      if (sideOf(a) !== side) continue;
      if (baseAt(a, RAIL_B) === T_RAIL){ if (lo === null) lo = a; hi = a; }
    }
    if (lo === null || hi - lo < TR.len * 3){ RAIL[side] = null; continue; }
    const s = side === 'usc' ? 1 : -1, wallEnd = side === 'usc' ? hi : lo, farEnd = side === 'usc' ? lo : hi;
    const gare = wallEnd - s * (4 + TR.len / 2), halt = farEnd + s * (8 + TR.len / 2);
    const trip = trapezoid(Math.abs(gare - halt), TR.acc, TR.vmax);
    RAIL[side] = { side, lo, hi, s, wallEnd, farEnd, gare, halt, trip, cycle: 2 * (trip.T + TR.dwell), off: side === 'usc' ? 0 : 23 };
    for (const A of A_LINES){
      if (A === WALL_A || sideOf(A) !== side || A < lo + 8 || A > hi - 8) continue;
      if (typeAt(A, RAIL_B) !== T_ROAD) continue;
      CROSSINGS.push({ A, side, lift: 1 });
    }
  }
}
// position du train : centre le long de a, vitesse
function trainState(side, t){
  const R = RAIL[side]; if (!R || !unlocked(side, 'rail')) return null;
  const p = ((t + R.off) % R.cycle + R.cycle) % R.cycle, T = R.trip.T, dir = Math.sign(R.halt - R.gare);
  if (p < TR.dwell) return { c: R.gare, v: 0, at: 'gare' };
  if (p < TR.dwell + T) return { c: R.gare + dir * R.trip.at(p - TR.dwell), v: R.trip.vt(p - TR.dwell), heading: dir };
  if (p < 2 * TR.dwell + T) return { c: R.halt, v: 0, at: 'halte' };
  return { c: R.halt - dir * R.trip.at(p - 2 * TR.dwell - T), v: R.trip.vt(p - 2 * TR.dwell - T), heading: -dir };
}
function crossingClosed(cr, t){
  const s = trainState(cr.side, t); if (!s) return false;
  return Math.abs(s.c - cr.A) < TR.len / 2 + 48 && (s.v > 0 || Math.abs(s.c - cr.A) < TR.len / 2 + 6);
}
function stepCrossings(dt, t){ for (const cr of CROSSINGS){ const want = crossingClosed(cr, t) ? 0 : 1; cr.lift += (want - cr.lift) * Math.min(1, dt * 2.5); cr.closed = want === 0; } }
function crossingAt(a){ for (const cr of CROSSINGS) if (Math.abs(cr.A - a) < 8) return cr; return null; }
// une voiture de train : cabine profilee aux deux bouts de la rame
function drawTrainCar(a0, a1, style, cab, t){
  const b0 = RAIL_B - 1.9, b1 = RAIL_B + 1.9, usc = style === 'usc';
  CUR = M.METAL; boxS(a0 + 1, a1 - 1, b0 + .5, b1 - .5, .2, .8, 0, 0, 0);
  CUR = usc ? M.CHROME : M.TRAIN_CCP; ACC = usc ? M.FLAG_BLUE : M.SIGN_CCP;
  let ba0 = a0, ba1 = a1;
  if (cab < 0) ba0 += 2.4; if (cab > 0) ba1 -= 2.4;
  const sideSh = usc
    ? (u, h) => h < .35 ? 0 : (h > .7 && h < 1.25) ? 5 : (h > 1.8 && h < 3.1) ? (((u % 2.2) < 1.5) ? 3 : 1) : 1
    : (u, h) => h < 1.5 ? 0 : (h > 1.8 && h < 3.1) ? (((u % 2.2) < 1.5) ? 3 : 1) : (h > 3.9 ? 0 : 1);
  boxS(ba0, ba1, b0, b1, .8, 5.2, sideSh, 1, 0);
  if (cab){
    const n0 = cab < 0 ? a0 : a1 - 2.4, n1 = cab < 0 ? a0 + 2.4 : a1;
    boxS(n0, n1, b0 + .3, b1 - .3, .8, 4.1, (u, h) => h > 2.2 && h < 3.2 ? 3 : (usc ? (h > .7 && h < 1.25 ? 5 : 1) : (h < 1.5 ? 0 : 1)), 1, 0);
    CUR = M.LAMP; const tip = cab < 0 ? a0 : a1;
    for (const s of [-1, 1]){ const p = prj(tip, RAIL_B + s * 1.1, 1.7); if (faceVisible([cab, 0, 0])) fput(Math.round(p[0]), Math.round(p[1]), 1); }
    if (!usc){ CUR = M.SIGN_CCP; const p = prj(tip, RAIL_B, 3.6); if (faceVisible([cab, 0, 0])) drawStar(fput, Math.round(p[0]) - 2, Math.round(p[1]) - 2, 1, false); }
  }
}
function trainDrawables(t, out){
  for (const side of ['usc', 'ccp']){
    const s = trainState(side, t); if (!s) continue;
    const L = TR.carL, G = TR.gap, a0 = s.c - TR.len / 2;
    for (let k = 0; k < TR.cars; k++){
      const ca0 = a0 + k * (L + G), ca1 = ca0 + L, cab = k === 0 ? -1 : k === TR.cars - 1 ? 1 : 0;
      out.push({ d: dep((ca0 + ca1) / 2, RAIL_B) + .4, f: () => drawTrainCar(ca0, ca1, side, cab, t) });
      if (COLOR && DAY){
        const pts = [];
        for (const [aa, bb] of [[ca0, RAIL_B - 1.9], [ca1, RAIL_B - 1.9], [ca1, RAIL_B + 1.9], [ca0, RAIL_B + 1.9]]) for (const z of [.8, 5.2]) pts.push([aa + z * SHADOW_V[0], bb + z * SHADOW_V[1]]);
        DYN_SHADOWS.push(hull2(pts));
      }
    }
  }
}
// barrieres, croix de Saint-Andre et feux clignotants
function drawCrossing(cr, t){
  const A = cr.A;
  for (const s of [-1, 1]){
    const pb = RAIL_B + s * 7.5, pa = A + s * 6.8, dirA = -s;
    CUR = M.METAL;
    const base = prj(pa, pb, 0); lineS(base[0], base[1], base[0], base[1] - 4, 1);
    const ang = cr.lift * Math.PI * .47, len = 7.5;
    const p0 = prj(pa, pb, 3.2), p1 = prj(pa + dirA * len * Math.cos(ang), pb, 3.2 + len * Math.sin(ang));
    const n = Math.max(1, Math.ceil(Math.hypot(p1[0] - p0[0], p1[1] - p0[1])));
    CUR = M.FLAG_RED;
    for (let k = 0; k <= n; k++){ const x = Math.floor(p0[0] + (p1[0] - p0[0]) * k / n), y = Math.floor(p0[1] + (p1[1] - p0[1]) * k / n); fput(x, y, ((k >> 1) & 1) ? 1 : 0); fput(x, y - 1, ((k >> 1) & 1) ? 1 : 0); }
    // croix et feux sur un poteau au bord du trottoir
    const qa = A - s * 8.2, q = prj(qa, pb, 0), x = Math.round(q[0]), y = Math.round(q[1]);
    CUR = M.METAL; for (let k = 0; k < 10; k++) fput(x, y - k, 1);
    CUR = M.NEUTRAL; for (let k = -2; k <= 2; k++){ fput(x + k, y - 10 + k, 1); fput(x + k, y - 10 - k, 1); }
    if (cr.closed || cr.lift < .9){
      const on = Math.floor(t * 2.5) % 2; CUR = M.REDLIGHT;
      fput(x - 2, y - 6, on ? 1 : 0); fput(x + 2, y - 6, on ? 0 : 1);
    }
  }
}
// halte au bout de la ligne, cote mer
function drawHalt(R){
  const a0 = R.halt - TR.len / 2 + 6, a1 = R.halt + TR.len / 2 - 6, pb0 = RAIL_B + 2.4, pb1 = RAIL_B + 7;
  CUR = M.CONCRETE; boxS(a0, a1, pb0, pb1, 0, .8, (u, h) => h > .5 ? 1 : 0, 1, 0);
  CUR = R.side === 'usc' ? M.USC3 : M.CCP;
  const ca = (a0 + a1) / 2;
  boxS(ca - 5, ca + 5, pb1 - 3, pb1, .8, 5, (u, h, x, y, k) => (k === 2 && h > 1 && h < 3.5) ? 3 : (h > 3.8 ? 1 : 0), null, 0);
  gableRoof(ca - 6, ca + 6, pb1 - 3.8, pb1 + .8, 5, 2, 'a', 1, 6, 1);
  const p = prj(ca, pb1, 7.5); CUR_SIDE = R.side; plate(fput, 'HALTE', Math.round(p[0]), Math.round(p[1]));
}
function railParts(){
  const parts = [], lights = [];
  for (const side of ['usc', 'ccp']){
    const R = RAIL[side]; if (!R || !unlocked(side, 'rail')) continue;
    const hp = part(R.halt, RAIL_B + 5, 0, () => drawHalt(R)); hp.m = M.CONCRETE; hp.side = side; parts.push(hp);
    lights.push(Lc(R.halt, RAIL_B + 5, 12, 1.1));
    // butoir contre le mur
    const bp = part(R.wallEnd, RAIL_B, 0, () => { CUR = M.FLAG_RED; boxS(Math.min(R.wallEnd, R.wallEnd + R.s * 1.5), Math.max(R.wallEnd, R.wallEnd + R.s * 1.5), RAIL_B - 2.4, RAIL_B + 2.4, 0, 2.2, (u, h) => ((Math.floor(u * 1.4) + Math.floor(h * 1.4)) & 1) ? 1 : 0, 1, 0); });
    bp.side = side; parts.push(bp);
  }
  for (const cr of CROSSINGS){ if (!unlocked(cr.side, 'rail')) continue; const p = part(cr.A, RAIL_B, .2, (t) => drawCrossing(cr, t)); p.m = M.METAL; p.side = cr.side; parts.push(p); }
  return { parts, lights };
}

/* ================= metro aerien : un viaduc au-dessus d'une avenue dans chaque camp ================= */
const METRO = [
  { side: 'usc', A: -280, stations: [-270, -30, 210] },
  { side: 'ccp', A: 260, stations: [-270, -30, 210] }
];
const MT = { cars: 3, carL: 8, gap: .6, deckZ: 10, acc: 4, vmax: 20, dwell: 7, stHalf: 14 };
MT.len = MT.cars * MT.carL + (MT.cars - 1) * MT.gap;
for (const ml of METRO){
  ml.b0 = ml.stations[0] - MT.stHalf; ml.b1 = ml.stations[ml.stations.length - 1] + MT.stHalf;
  ml.legs = [];
  const seq = ml.stations.concat(ml.stations.slice(1, -1).reverse());
  for (let k = 0; k < seq.length; k++){ const from = seq[k], to = seq[(k + 1) % seq.length]; ml.legs.push({ from, to, tr: trapezoid(Math.abs(to - from), MT.acc, MT.vmax) }); }
  ml.cycle = ml.legs.reduce((s, l) => s + l.tr.T + MT.dwell, 0);
}
const inStation = (ml, b) => ml.stations.some(s => Math.abs(b - s) <= MT.stHalf);
function metroState(ml, t, off){
  let p = ((t + off) % ml.cycle + ml.cycle) % ml.cycle;
  for (const l of ml.legs){
    if (p < MT.dwell) return { b: l.from, v: 0 };
    p -= MT.dwell;
    if (p < l.tr.T) return { b: l.from + Math.sign(l.to - l.from) * l.tr.at(p), v: l.tr.vt(p) };
    p -= l.tr.T;
  }
  return { b: ml.stations[0], v: 0 };
}
function drawDeck(ml, s0, s1){
  const A = ml.A, usc = ml.side === 'usc', z = MT.deckZ, st = inStation(ml, (s0 + s1) / 2), hw = st ? 7 : 3.4;
  CUR = usc ? M.GIRDER : M.CONCRETE;
  boxS(A - hw, A + hw, s0, s1, z - .9, z + .4, usc ? ((u, h) => ((u % 3) < .5 || h < .25) ? 0 : 1) : ((u, h) => h < .3 ? 0 : 1), st ? 1 : ((x, y) => bz(x, y) < 3 ? 0 : 1), 0);
  if (usc){ CUR = M.GIRDER; boxS(A - 6.2, A + 6.2, (s0 + s1) / 2 - .5, (s0 + s1) / 2 + .5, z - 1.8, z - .9, 0, 0, 0); }
  CUR = M.RAIL;
  for (const da of [-2.3, -.9, .9, 2.3]) line3(A + da, s0, z + .45, A + da, s1, z + .45, 1);
  CUR = M.METAL;
  for (const s of [-1, 1]){ line3(A + s * hw, s0, z + 1.6, A + s * hw, s1, z + 1.6, 1); for (let b = Math.ceil(s0 / 3) * 3; b < s1; b += 3) line3(A + s * hw, b, z + .4, A + s * hw, b, z + 1.6, 1); }
}
function drawPillar(ml, a, b){
  const usc = ml.side === 'usc';
  CUR = usc ? M.GIRDER : M.CONCRETE;
  if (usc) boxS(a - .5, a + .5, b - .5, b + .5, 0, MT.deckZ - .9, (u, h) => ((h % 2) < .3) ? 1 : 0, null, 0);
  else boxS(a - 1, a + 1, b - .8, b + .8, 0, MT.deckZ - .9, (u, h) => h > MT.deckZ - 2.2 ? 1 : 0, null, 0);
}
function drawStationTop(ml, st, t){
  const A = ml.A, z = MT.deckZ, h0 = st - MT.stHalf + 2, h1 = st + MT.stHalf - 2, usc = ml.side === 'usc';
  CUR = M.METAL;
  for (const b of [h0, (h0 + h1) / 2, h1]) for (const s of [-1, 1]) line3(A + s * 6.4, b, z + .4, A + s * 6.4, b, z + 6.4, 1);
  CUR = usc ? M.GIRDER : M.CCP2;
  boxS(A - 7.4, A + 7.4, h0 - 1, h1 + 1, z + 6.4, z + 7.2, 1, (x, y) => bz(x, y) < 9 ? 1 : 0, 0);
  const p = prj(A + 7.4, st, z + 7.2); CUR_SIDE = ml.side;
  plate(fput, usc ? 'METRO' : 'METRO', Math.round(p[0]), Math.round(p[1]) - 1);
}
function drawStairs(ml, st){
  const A = ml.A, z = MT.deckZ, a0 = A + 7, a1 = A + 9, bs = st + MT.stHalf - 1;
  CUR = ml.side === 'usc' ? M.GIRDER : M.CONCRETE;
  const n = 8;
  for (let k = 0; k < n; k++){ const zz = z * (1 - k / n), b0 = bs + k * 1.3; boxS(a0, a1, b0, b0 + 1.3, Math.max(0, zz - 1), zz, (u, h) => h > .6 ? 1 : 0, 1, 0); }
}
function metroParts(){
  const parts = [], lights = [];
  for (const ml of METRO){
    if (!unlocked(ml.side, 'metro')) continue;
    const mk = (a, b, zb, f, m) => { const p = part(a, b, zb, f); p.m = m; p.side = ml.side; parts.push(p); return p; };
    const mat = ml.side === 'usc' ? M.GIRDER : M.CONCRETE;
    for (let b = ml.b0; b < ml.b1 - .01; b += 7){
      const s0 = b, s1 = Math.min(ml.b1, b + 7);
      mk(ml.A, (s0 + s1) / 2, 3.5, () => drawDeck(ml, s0, s1), mat);
    }
    for (let b = ml.b0 + 3; b < ml.b1; b += 10.5){
      if (B_LINES.some(B => Math.abs(b - B) < 9)) continue;
      if (inStation(ml, b)){ for (const s of [-1, 1]) mk(ml.A + s * 5.6, b, 0, () => drawPillar(ml, ml.A + s * 5.6, b), mat); continue; }
      if (ml.side === 'usc') for (const s of [-1, 1]) mk(ml.A + s * 5.6, b, 0, () => drawPillar(ml, ml.A + s * 5.6, b), mat);
      else mk(ml.A, b, 0, () => drawPillar(ml, ml.A, b), mat);
    }
    for (const st of ml.stations){
      mk(ml.A, st, 4.5, (t) => drawStationTop(ml, st, t), mat);
      mk(ml.A + 8, st + MT.stHalf + 4, 0, () => drawStairs(ml, st), mat);
      lights.push(Lc(ml.A, st, 13, 1.25));
    }
  }
  return { parts, lights };
}
function drawMetroCar(ml, a, b0, b1, cab, t){
  const usc = ml.side === 'usc', z = MT.deckZ + .4;
  CUR = usc ? M.CHROME : M.WATER; ACC = usc ? M.FLAG_BLUE : M.SIGN_CCP;
  boxS(a - 1.3, a + 1.3, b0, b1, z + .3, z + 3.6, (u, h) => h < .5 ? 0 : (h > 1.2 && h < 2.3) ? (((u % 1.9) < 1.2) ? 3 : 1) : (h < .9 ? 5 : 1), 1, 0);
  if (cab){ CUR = M.LAMP; const tip = cab < 0 ? b0 : b1; if (faceVisible([0, cab, 0])) for (const s of [-1, 1]){ const p = prj(a + s * .7, tip, z + 1); fput(Math.round(p[0]), Math.round(p[1]), 1); } }
}
function metroDrawables(t, out){
  for (const ml of METRO){
    if (!unlocked(ml.side, 'metro')) continue;
    for (const [k, off] of [[0, 0], [1, ml.cycle / 2]]){
      const s = metroState(ml, t, off), a = ml.A + (k ? 1.6 : -1.6), b0 = s.b - MT.len / 2;
      for (let c = 0; c < MT.cars; c++){
        const cb0 = b0 + c * (MT.carL + MT.gap), cb1 = cb0 + MT.carL, cab = c === 0 ? -1 : c === MT.cars - 1 ? 1 : 0;
        out.push({ d: dep(a, (cb0 + cb1) / 2) + 4, f: () => drawMetroCar(ml, a, cb0, cb1, cab, t) });
      }
    }
  }
}

/* ================= la limousine du Checkpoint Minou ================= */
const LIMO_PATH = [
  [-100, 10], [-26, 10, 3.2, 0], [-10, 10, 3.2, 1], [170, 10], [170, -70], [80, -70], [80, 10],
  [6, 10, 3.2, 1], [-10, 10, 3.2, 0], [-190, 10], [-190, -70], [-100, -70]
];
const LIMO = { v: 14, legs: [], cycle: 0 };
(() => {
  let T = 0;
  for (let k = 0; k < LIMO_PATH.length; k++){
    const p = LIMO_PATH[k], q = LIMO_PATH[(k + 1) % LIMO_PATH.length], L = Math.hypot(q[0] - p[0], q[1] - p[1]);
    LIMO.legs.push({ p, q, t0: T, dur: L / LIMO.v, stop: q[2] || 0, opens: q[3] });
    T += L / LIMO.v + (q[2] || 0);
  }
  LIMO.cycle = T;
})();
function limoState(t){
  const p = ((t + 30) % LIMO.cycle + LIMO.cycle) % LIMO.cycle;
  for (const l of LIMO.legs){
    if (p < l.t0 || p >= l.t0 + l.dur + l.stop) continue;
    const u = Math.min(1, (p - l.t0) / l.dur), da = Math.sign(l.q[0] - l.p[0]), db = Math.sign(l.q[1] - l.p[1]);
    const a = l.p[0] + (l.q[0] - l.p[0]) * u + db * 3, b = l.p[1] + (l.q[1] - l.p[1]) * u - da * 3;
    const waiting = u >= 1, left = l.dur + l.stop - (p - l.t0);
    return { a, b, axis: da ? 'a' : 'b', dir: da || db || 1, waiting, opens: waiting && left < 1.4 ? l.opens : null, moving: !waiting, la0: Math.min(l.p[0], l.q[0]), la1: Math.max(l.p[0], l.q[0]) };
  }
  return null;
}
// les barrieres du checkpoint s'ouvrent pour la limousine
function stepBarriers(dt, t){
  const s = limoState(t);
  BARRIERS.forEach((br, k) => {
    let want = 0;
    if (s && Math.abs(s.b - CHECK_B) < 5){
      const d = Math.abs(s.a - br.a);
      if (s.opens === k && d < 14) want = 1;
      else if (s.moving && d < 11 && br.a > s.la0 && br.a < s.la1) want = 1;
    }
    br.lift += (want - br.lift) * Math.min(1, dt * 3);
  });
}
function drawLimo(s){
  const { a, b, axis, dir } = s, la = 6.4, lb = 3.2;
  const A0 = axis === 'a' ? a - la : a - lb, A1 = axis === 'a' ? a + la : a + lb, B0 = axis === 'a' ? b - lb : b - la, B1 = axis === 'a' ? b + lb : b + la;
  CUR = M.SCREEN;
  boxS(A0, A1, B0, B1, .8, 3.2, (u, h) => h < .5 ? 1 : 0, 0, 1);
  const fa = axis === 'a' ? dir : 0, fb2 = axis === 'b' ? dir : 0, cl = 3.2, cw = lb - .6;
  const C0 = axis === 'a' ? a - cl - fa : a - cw, C1 = axis === 'a' ? a + cl - fa : a + cw, D0 = axis === 'a' ? b - cw : b - cl - fb2, D1 = axis === 'a' ? b + cw : b + cl - fb2;
  boxS(C0, C1, D0, D1, 3.2, 5.4, (u, h) => (h > .5 && h < 1.7) ? 3 : 0, 0, 1);
  // fanions sur les ailes avant
  const fr = [a + fa * (la - 1), b + fb2 * (la - 1)];
  for (const [s, m] of [[-1, M.FLAG_BLUE], [1, M.FLAG_RED]]){
    const pa = axis === 'a' ? fr[0] : a + s * (lb - .6), pb = axis === 'a' ? b + s * (lb - .6) : fr[1];
    const p = prj(pa, pb, 3.2); CUR = M.METAL; fput(Math.round(p[0]), Math.round(p[1]) - 1, 1); fput(Math.round(p[0]), Math.round(p[1]) - 2, 1);
    CUR = m; fput(Math.round(p[0]) + 1, Math.round(p[1]) - 3, 0); fput(Math.round(p[0]) + 2, Math.round(p[1]) - 3, 0);
  }
  CUR = M.LAMP;
  for (const s2 of [-1, 1]){ const pa = axis === 'a' ? a + fa * la : a + s2 * (lb - 1), pb = axis === 'a' ? b + s2 * (lb - 1) : b + fb2 * la; if (faceVisible([fa, fb2, 0])){ const p = prj(pa, pb, 2); fput(Math.round(p[0]), Math.round(p[1]), 1); } }
}
function limoDrawables(t, out){
  if (!wallUp()) return;
  const s = limoState(t); if (!s) return;
  out.push({ d: dep(s.a, s.b), f: () => drawLimo(s) });
  LIMO.pos = s;
}
function transitParts(){
  const r = railParts(), m = metroParts();
  return { parts: r.parts.concat(m.parts), lights: r.lights.concat(m.lights) };
}
