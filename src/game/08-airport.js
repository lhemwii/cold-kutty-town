/* ================= avions : cap libre, vrais tours de piste ================= */
// th : cap en radians (0 = vers +a, PI/2 = vers +b)
function planeGeo(a, b, th){
  const c = Math.cos(th), s = Math.sin(th);
  return (u, v) => [a + u * c - v * s, b + u * s + v * c];
}
const PL = { L: 11, W: 1.5, S: 10 };
// contour au sol de l'avion (u, v, hauteur) pour l'ombre portee
const PLANE_OUTLINE = [[-PL.L - 1, 0, 3], [-PL.L, -1.5, 1], [PL.L + .8, 0, 2], [-PL.L, 1.5, 1], [2.5, -1.5, 1.8], [-1.8, -PL.S, 1.8], [-3.8, -PL.S, 1.8], [2.5, 1.5, 1.8], [-1.8, PL.S, 1.8], [-3.8, PL.S, 1.8], [-PL.L + 2.6, -4, 3], [-PL.L + 2.6, 4, 3], [-PL.L - .8, 0, 7]];
// boite orientee dans le repere de l'avion
function oBox(X, u0, u1, v0, v1, z0, z1, side, top, edge){
  const P = [X(u0, v1), X(u1, v1), X(u1, v0), X(u0, v0)], e = edge == null ? 0 : edge;
  for (let k = 0; k < 4; k++){ const p = P[k], q = P[(k + 1) % 4]; wallFace(p[0], p[1], q[0], q[1], z0, z1, side, e); }
  if (top !== null && top !== undefined){ const A = X(u0, v0), B = X(u1, v0), C = X(u1, v1), D = X(u0, v1); drawFace([A[0], A[1], z1, B[0], B[1], z1, C[0], C[1], z1, D[0], D[1], z1], UP, top, e); }
}
function drawPlane(a, b, z, th, style, t, bank){
  const X = planeGeo(a, b, th), L = PL.L, Wd = PL.W, S = PL.S, bk = bank || 0;
  const P3 = (u, v, zz) => { const p = X(u, v); return [p[0], p[1], zz]; };
  const quad = (pts, zz) => { const o = []; for (const [u, v] of pts) o.push(...P3(u, v, zz + (bk ? v * bk : 0))); return o; };
  const usc = style === 'usc';
  ACC = usc ? M.FLAG_BLUE : M.FLAG_RED;
  const nearPos = dep(...X(0, 1)) > dep(...X(0, -1)) ? 1 : -1;
  const half = (s) => {
    CUR = M.ROCKET;
    drawFace(quad([[2.6, 0], [-1.6, 0], [-3.8, s * S], [-1.8, s * S]], z + 1.8), UP, 0, -1);
    CUR = M.METAL;
    for (const e of usc ? [3.6, 6.8] : [4.2]) oBox(X, -1.2 - e * .22, 1.4 - e * .22, s * e - .55, s * e + .55, z + .9 + s * e * bk, z + 1.8 + s * e * bk, 0, 1, 0);
    CUR = M.ROCKET;
    drawFace(quad([[-L + 3, 0], [-L + .4, 0], [-L - .6, s * 4], [-L + 1, s * 4]], z + 3), UP, 0, -1);
  };
  half(-nearPos);
  CUR = M.ROCKET;
  oBox(X, -L, L - 2.2, -Wd, Wd, z + .8, z + 3.3, (u, h) => h < .45 ? 0 : h < .9 ? 5 : (h > 1.25 && h < 1.75) ? (((u * 1.5) % 2) < 1 ? 3 : 1) : 1, 1, 0);
  oBox(X, L - 2.2, L, -Wd * .75, Wd * .75, z + 1, z + 3.05, (u, h) => h < .4 ? 0 : (h > 1.1 && h < 1.7) ? 3 : 1, 1, 0);
  oBox(X, L, L + .8, -Wd * .4, Wd * .4, z + 1.5, z + 2.5, 1, 1, 0);
  oBox(X, -L - 1, -L, -Wd * .55, Wd * .55, z + 1.9, z + 3.2, 1, 1, 0);
  { const p = X(-L - .8, 0), q = X(-L + 3, 0); if (!wallFace(p[0], p[1], q[0], q[1], z + 3.3, z + 7, 5, 0, null)) wallFace(q[0], q[1], p[0], p[1], z + 3.3, z + 7, 5, 0, null); }
  half(nearPos);
  if (!(COLOR && DAY) || z > 2){
    const blink = Math.floor((t || 0) * 2) % 2 === 0;
    for (const s of [-1, 1]){ CUR = s > 0 ? M.REDLIGHT : M.SIGN_CCP; const p = prj(...P3(-2.8, s * S, z + 1.8 + s * S * bk)); if (blink) fput(Math.round(p[0]), Math.round(p[1]), 1); }
  }
}
function planeShadow(a, b, z, th){
  const X = planeGeo(a, b, th), out = [];
  for (const [u, v, zz] of PLANE_OUTLINE){ const p = X(u, v), h = z + zz; out.push([p[0] + h * SHADOW_V[0], p[1] + h * SHADOW_V[1]]); }
  return hull2(out);
}

/* ================= tour de piste : decollage, virage, vent arriere, virage, finale, roulage ================= */
// trace ecrit pour l'aeroport de l'USC, la CCR en est le miroir par rapport au mur
const CIRCUIT = (() => {
  const segs = [], add = (dur, f) => segs.push({ dur, f });
  const lerp = (x, y, u) => x + (x === y ? 0 : (y - x) * u), ease = (u) => u * u * (3 - 2 * u);
  const hold = -723, lift = -840, R = 260;
  add(5, () => ({ a: hold, b: 0, z: 0, th: Math.PI }));
  add(5.2, (u) => ({ a: hold - (hold - lift) * u * u, b: 0, z: 0, th: Math.PI }));
  add(5.9, (u) => ({ a: lerp(lift, -1150, u), b: 0, z: 90 * Math.pow(u, .85), th: Math.PI }));
  add(13.6, (u) => { const al = Math.PI / 2 + Math.PI * u; return { a: -1150 + R * Math.cos(al), b: -260 + R * Math.sin(al), z: lerp(90, 140, ease(u)), th: al + Math.PI / 2, bank: .12 }; });
  add(14.2, (u) => ({ a: lerp(-1150, -300, u), b: -520, z: 140, th: 0 }));
  add(13.6, (u) => { const al = -Math.PI / 2 + Math.PI * u; return { a: -300 + R * Math.cos(al), b: -260 + R * Math.sin(al), z: lerp(140, 80, ease(u)), th: al + Math.PI / 2, bank: .12 }; });
  add(8.6, (u) => ({ a: lerp(-300, -730, u), b: 0, z: 80 * (1 - u), th: Math.PI }));
  add(6.5, (u) => ({ a: -730 - 130 * (1 - (1 - u) * (1 - u)), b: 0, z: 0, th: Math.PI }));
  add(2.5, (u) => ({ a: -860, b: 0, z: 0, th: Math.PI - Math.PI * ease(u) }));
  add(13.7, (u) => ({ a: lerp(-860, hold, u), b: 0, z: 0, th: 0 }));
  add(2.5, (u) => ({ a: hold, b: 0, z: 0, th: -Math.PI * ease(u) }));
  let T = 0; for (const s of segs){ s.t0 = T; T += s.dur; }
  return { segs, T };
})();
function planeState(ap, t, k){
  const off = (ap.side === 'usc' ? 0 : 21) + (k || 0) * CIRCUIT.T / 2;
  const p = ((t + off) % CIRCUIT.T + CIRCUIT.T) % CIRCUIT.T;
  let s = CIRCUIT.segs[CIRCUIT.segs.length - 1];
  for (const g of CIRCUIT.segs) if (p >= g.t0 && p < g.t0 + g.dur){ s = g; break; }
  const r = s.f(Math.min(1, (p - s.t0) / s.dur));
  if (ap.side === 'usc') return r;
  return { a: mirA(r.a), b: r.b, z: r.z, th: Math.PI - r.th, bank: r.bank ? -r.bank : 0 };
}
function airportParts(ap){
  const ccp = ap.side === 'ccp', T = ap.terminal, TW = ap.tower, parts = [];
  const mat = ccp ? M.CCP2 : M.USC5;
  const tc = [(T[0] + T[1]) / 2, (T[2] + T[3]) / 2];
  const P = (a, b, zb, draw, m) => { const p = part(a, b, zb, draw); p.m = m == null ? mat : m; p.side = ap.side; return p; };
  parts.push(P(tc[0], tc[1], 0, () => boxS(T[0], T[1], T[2], T[3], 0, 9, (u, h, x, y, k) => {
    if (h > 7.8) return 1;
    if ((k === 0 || k === 2) && h > 1.5 && h < 7) return ((u % 3) < .4) ? 1 : 3;
    return wallBase(k, x, y);
  }, (x, y) => bz(x, y) < 3 ? 1 : 0)));
  parts.push(P(tc[0], tc[1], .5, (t) => {
    const p = prj(tc[0], T[2], 9), x = Math.round(p[0]), y = Math.round(p[1]);
    plate(fput, 'AEROPORT', x, y - 1);
    drawFlagPole(T[1] - 2, T[3] + 2, 0, 20, ap.side, t);
  }));
  const tw = [(TW[0] + TW[1]) / 2, (TW[2] + TW[3]) / 2];
  parts.push(P(tw[0], tw[1], 0, (t) => {
    CUR = M.CONCRETE; boxS(TW[0], TW[1], TW[2], TW[3], 0, 24, (u, h) => ((h % 4) < .4) ? 1 : 0, null);
    CUR = mat; boxS(tw[0] - 4, tw[0] + 4, tw[1] - 4, tw[1] + 4, 24, 29, (u, h) => (h > .8 && h < 4.3) ? (((u % 2) < .3) ? 1 : 3) : 1, null);
    CUR = M.METAL; boxS(tw[0] - 4.6, tw[0] + 4.6, tw[1] - 4.6, tw[1] + 4.6, 29, 30, 1, 0);
    line3(tw[0], tw[1], 30, tw[0], tw[1], 35, 1);
    const b = prj(tw[0], tw[1], 35); CUR = M.REDLIGHT; if (!(COLOR && DAY) || (t % 1.4) < .7) fput(Math.round(b[0]), Math.round(b[1]) - 1, 1);
  }));
  for (const H of ap.hangars){
    const hc = [(H[0] + H[1]) / 2, (H[2] + H[3]) / 2];
    parts.push(P(hc[0], hc[1], 0, () => {
      CUR = M.METAL;
      gableWalls(H[0], H[1], H[2], H[3], 8, 5, 'b', (u, h, x, y, k) => (k === 2 && u > 2 && u < (H[1] - H[0]) - 2 && h < 7) ? (((u % 2) < .2) ? 1 : 0) : ((u % 1.5) < .3 ? 1 : 0));
      gableRoof(H[0], H[1], H[2], H[3], 8, 5, 'b', 1, 6, 1);
    }, M.METAL));
  }
  // avions gares sur le tarmac
  const A = ap.apron;
  for (const [k, ua] of [[0, .35], [1, .62]]){
    const pa = A[0] + (A[1] - A[0]) * ua, pb = (A[2] + A[3]) / 2 + 2;
    const p = P(pa, pb, 0, (t) => drawPlane(pa, pb, 0, -Math.PI / 2, ap.side, t), M.ROCKET);
    p.shadow = [];
    for (const [u, v, zz] of PLANE_OUTLINE){ const q = planeGeo(pa, pb, -Math.PI / 2)(u, v); p.shadow.push(q[0], q[1], zz); }
    parts.push(p);
  }
  return parts;
}
// balisage de piste la nuit
function airportDecal(ap){
  return () => {
    if (COLOR && DAY) return;
    const R = ap.runway;
    CUR = M.LAMP;
    for (let a = R[0] + 2; a < R[1]; a += 8) for (const b of [R[2] + .5, R[3] - .5]){ const p = prj(a, b, 0); fput(Math.round(p[0]), Math.round(p[1]), 1); }
    CUR = M.REDLIGHT;
    for (const a of [R[0] + .5, R[1] - .5]) for (let b = R[2] + 1; b < R[3]; b += 2.5){ const p = prj(a, b, 0); fput(Math.round(p[0]), Math.round(p[1]), 1); }
  };
}

/* ================= defile militaire en CCR ================= */
const PARADE = { b: -70 + 3, a0: 440, a1: 22, speed: 9, period: 180, units: ['drapeau', 'soldats', 'soldats', 'tank', 'tank', 'tank', 'missile', 'missile'] };
const paradeHead = (t) => { if (!TRIBUNE_OK) return null; const p = t % PARADE.period; return p < 60 ? PARADE.a0 - p * PARADE.speed : null; };
function drawTank(a, b, dir){
  CUR = M.MILITARY;
  boxS(a - 4.8, a + 4.8, b - 2.9, b + 2.9, 0, 1.1, 0, null);
  boxS(a - 4.4, a + 4.4, b - 2.6, b + 2.6, 1.1, 2.5, (u, h) => h > 1 ? 1 : 0, (x, y) => bz(x, y) < 6 ? 1 : 0);
  boxS(a - 2.2, a + 1.6, b - 1.8, b + 1.8, 2.5, 3.9, 0, 1);
  line3(a + dir * 1.6, b, 3.2, a + dir * 8.5, b, 3.4, 1);
  CUR = M.SIGN_CCP; const p = prj(a - dir * .5, b + 1.8, 3.2); fput(Math.round(p[0]), Math.round(p[1]), 1);
}
function drawMissile(a, b, dir){
  CUR = M.MILITARY;
  boxS(a + dir * 4 - 1.3, a + dir * 4 + 1.3, b - 2.2, b + 2.2, .8, 3.6, (u, h) => (h > 1.6 && h < 2.5) ? 3 : 0, 1);
  boxS(a - 5.5, a + 2.6, b - 2.4, b + 2.4, .6, 1.5, 0, 1);
  CUR = M.ROCKET; ACC = M.FLAG_RED;
  boxS(a - 6.5, a + 3, b - .9, b + .9, 1.6, 3.4, 1, 1);
  const tip = a + dir * 3.5; boxS(Math.min(tip, tip + dir * 1.5), Math.max(tip, tip + dir * 1.5), b - .6, b + .6, 1.9, 3.1, 5, 5);
}
function drawSoldiers(a, b, dir, t){
  const pts = [];
  for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) pts.push([a + r * 2.6 * -dir, b + (c - 1) * 2.2, r]);
  pts.sort((p, q) => dep(p[0], p[1]) - dep(q[0], q[1]));
  for (const [x, y, r] of pts){
    const st = Math.sin(t * 9 + r * 1.7) * .45;
    CUR = M.MILITARY;
    line3(x + st, y, 0, x, y, 1.1, 0); line3(x - st, y, 0, x, y, 1.1, 0);
    line3(x, y, 1.1, x, y, 2.5, 1);
    const h = prj(x, y, 2.9); CUR = M.FLAG_RED; fput(Math.round(h[0]), Math.round(h[1]), 0);
  }
}
function drawBannerTruck(a, b, dir, t){
  CUR = M.MILITARY;
  boxS(a - 4.5, a + 4.5, b - 2.2, b + 2.2, .8, 2.2, 0, 1, 0);
  const cab = a + dir * 3.2; boxS(Math.min(cab, cab + dir * 2), Math.max(cab, cab + dir * 2), b - 2, b + 2, 2.2, 4.2, (u, h) => h > 1 ? 3 : 0, 1, 0);
  // grand drapeau rouge qui ondule, etoile jaune
  CUR = M.FLAG_RED;
  const fa = a - dir * 2.5, wave = (x, y) => 0;
  line3(fa, b, 2.2, fa, b, 14, 1);
  const p = [fa, b], q = [fa - dir * 7, b];
  if (!wallFace(p[0], p[1], q[0], q[1], 8.5, 14, wave, -1, null)) wallFace(q[0], q[1], p[0], p[1], 8.5, 14, wave, -1, null);
  const st = prj(fa - dir * 1.8, b, 12.6); CUR = M.SIGN_CCP; fput(Math.round(st[0]), Math.round(st[1]), 1); fput(Math.round(st[0]) + 1, Math.round(st[1]), 1);
}
let DYN_SHADOWS = [];
function dynamicDrawables(t){
  const out = [];
  DYN_SHADOWS = [];
  for (const ap of AIRPORTS) for (const k of [0, 1]){
    if (!unlocked(ap.side, 'air')) continue;
    const s = planeState(ap, t, k); if (!s) continue;
    out.push({ d: dep(s.a, s.b) + (s.z > 4 ? 1e6 + s.z : 0), f: () => drawPlane(s.a, s.b, s.z, s.th, ap.side, t, s.bank) });
    if (COLOR && DAY && s.z > 0) DYN_SHADOWS.push(planeShadow(s.a, s.b, s.z, s.th));
  }
  const head = TRIBUNE_OK ? paradeHead(t) : null;
  if (head != null) PARADE.units.forEach((u, k) => {
    const a = head + k * 16; if (a > PARADE.a0 || a < PARADE.a1) return;
    const draw = u === 'tank' ? drawTank : u === 'missile' ? drawMissile : u === 'soldats' ? drawSoldiers : drawBannerTruck;
    out.push({ d: dep(a, PARADE.b), f: () => draw(a, PARADE.b, -1, t) });
  });
  trainDrawables(t, out);
  metroDrawables(t, out);
  limoDrawables(t, out);
  frontDrawables(t, out);
  for (const f of HOOKS.dyn) f(t, out);
  return out;
}
