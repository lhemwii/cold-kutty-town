import { SH } from './00-shared.js';
import { COLOR, GAME, H, HOOKS, M, N, PC, PS, TAU, W, clamp, dep, fb, fput, hash2, lb, mb, prj, unprj } from './01-core.js';
import { PED_FUR } from './03-buildings-base.js';
import { sideAt } from './08-territory.js';
import { RW, nearRoad, polyAt } from './09-roads.js';
import { CLOCK, OV_ON, PAL_HEX, WEATHER } from './11-render.js';
import { feteOf } from './17-calendar.js';
/* ================= fetes : sapins illumines et feux d'artifice ================= */
SH.XMAS_ON = false;
export const TWINKLE = [M.ICON_R, M.ICON_Y, M.FW_BLUE, M.FW_GREEN];
export function drawTreeLights(a, b, r, t){
  const p = prj(a, b, 0), cx = Math.round(p[0]), cy = Math.round(p[1]) - r - 3;
  const n = 4 + r;
  for (let k = 0; k < n; k++){
    const ang = hash2(a * 3 + k, b) * TAU, rr = .45 + hash2(k, a + b) * .5;
    const x = Math.round(cx + Math.cos(ang) * (r + 1) * rr), y = Math.round(cy + Math.sin(ang) * r * rr);
    if (((t * 2 + k * .7 + a) | 0) % 3 === 0) continue;
    SH.CUR = TWINKLE[(k + ((t * 1.5) | 0)) & 3]; fput(x, y, 1);
  }
}
export const FW = { list: [], next: 0 };
// un point de tir visible a l'ecran : l'explosion tombe dans le haut de la vue
export function fwPick(side){
  for (let k = 0; k < 8; k++){
    const x = W * (.12 + Math.random() * .76), yb = H * (.1 + Math.random() * .36);
    const gy = Math.min(H * 1.05, yb + 45 + Math.random() * 55), g = unprj(x, gy);
    if (side && side !== 'both' && sideAt(g[0], g[1]) !== side) continue;
    return { a: g[0], b: g[1], h: gy - yb };
  }
  return null;
}
export function fwSpawn(a, b, t, big, h){
  const mats = [M.ICON_R, M.ICON_Y, M.FW_BLUE, M.FW_GREEN, M.SIGN];
  FW.list.push({ a, b, t0: t, h: h || 70 + Math.random() * 55, dur: 1.2 + Math.random() * .7, mat: mats[(Math.random() * mats.length) | 0], mat2: mats[(Math.random() * mats.length) | 0], n: big ? 90 : 50 + ((Math.random() * 24) | 0), r: big ? 50 : 28 + Math.random() * 14, seed: (Math.random() * 1000) | 0 });
  if (typeof SH.sfx === 'function') SH.sfx('fw', a, b);
}
// salve de celebration : lancement reussi, mur, nouvel an
export function fwSalvo(side, n){
  if (!COLOR) return;
  for (let k = 0; k < n; k++) setTimeout(() => { if (OV_ON) return; const p = fwPick(side); if (p) fwSpawn(p.a, p.b, SH.NOW_T, k % 3 === 0, p.h); }, k * 380);
}
export function stepFw(dt, t){
  FW.list = FW.list.filter(f => t < f.t0 + f.dur + 2.4);
  SH.XMAS_ON = COLOR && SH.CAL.m === 11;
  if (!COLOR || OV_ON) return;
  const f = feteOf(SH.CAL.m);
  if (!f || GAME.mode !== 'play' || SH.NIGHT < .55 || t < FW.next) return;
  FW.next = t + .6 + Math.random() * 1.4;
  const p = fwPick(f.side); if (p) fwSpawn(p.a, p.b, t, Math.random() < .15, p.h);
}
export function drawFw(t){
  for (const f of FW.list){
    const e = t - f.t0; if (e < 0) continue;
    if (e < f.dur){
      const z = f.h * Math.sin(e / f.dur * Math.PI / 2), p = prj(f.a, f.b, z), x = Math.round(p[0]), y = Math.round(p[1]);
      SH.CUR = M.GLOW; fput(x, y, 1); fput(x, y + 1, 1); if (hash2(f.seed, (e * 20) | 0) < .6) fput(x + (hash2(f.seed, (e * 30) | 0) < .5 ? -1 : 1), y + 3, 1);
      continue;
    }
    const k = e - f.dur, p = prj(f.a, f.b, f.h), cx = p[0], cy = p[1], grow = 1 - Math.pow(1 - Math.min(1, k / .7), 3);
    for (let i = 0; i < f.n; i++){
      if (k > 1 && hash2(f.seed + i, (k * 8) | 0) < (k - 1) / 1.3) continue;
      const ang = i / f.n * TAU + f.seed, sp = f.r * (.8 + hash2(f.seed, i) * .35);
      const g = k * k * 7, x = Math.round(cx + Math.cos(ang) * sp * grow), y = Math.round(cy + Math.sin(ang) * sp * grow * .82 + g);
      SH.CUR = i & 1 ? f.mat : f.mat2; fput(x, y, 1); fput(x + 1, y, 1); fput(x, y + 1, 1);
      if (k < 1.3){ for (const q of [.86, .74]){ const x2 = Math.round(cx + Math.cos(ang) * sp * grow * q), y2 = Math.round(cy + Math.sin(ang) * sp * grow * .82 * q + g * q); fput(x2, y2, 1); } }
      else if (hash2(i, (k * 12) | 0) < .5){ SH.CUR = M.BEAM; fput(x, y + 2, 1); }
    }
    if (k < .18){ SH.CUR = M.BEAM; const rr = 4 - k * 12; for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) if (Math.abs(dx) + Math.abs(dy) < rr) fput(Math.round(cx) + dx, Math.round(cy) + dy, 1); }
  }
}
HOOKS.step.push(stepFw);
HOOKS.top.unshift(drawFw);

/* ================= la foule : passants sur les trottoirs, match au stade ================= */
export const PEDS = [];
// les passants font les cent pas sur le trottoir devant les batiments desservis
export function buildPeds(){
  PEDS.length = 0;
  const built = SH.BLD.filter(l => l.done && l.active && l.type !== 'parc' && l.type !== 'drapeau');
  for (let k = 0; k < built.length && PEDS.length < 110; k++){
    const l = built[k], n = Math.min(3, 1 + Math.floor(SH.popOf(l) / 6));
    const near = nearRoad(l.ca, l.cb, 40, l.side); if (!near) continue;
    const r = near.r, p = polyAt(r.pts, r.cum, near.s), nx = -Math.sin(p[2]), nb = Math.cos(p[2]);
    const sideSign = ((l.ca - p[0]) * nx + (l.cb - p[1]) * nb) >= 0 ? 1 : -1;
    for (let j = 0; j < n; j++){
      if (hash2(l.id * 5 + j, 31) > .7) continue;
      PEDS.push({ r, s0: clamp(near.s - 22, 2, r.len - 2), s1: clamp(near.s + 22, 2, r.len - 2), off: sideSign * (RW + 1.6), side: l.side, sp: 3 + hash2(k, j + 9) * 3, ph: hash2(k, j + 13) * 100,
        fur: PED_FUR[(hash2(k, j + 17) * 5) | 0], hat: l.side === 'ccp' ? hash2(k, j + 19) < .4 : hash2(k, j + 23) < .25 });
    }
  }
}
export function pedPos(p, t){
  const L = Math.max(1, p.s1 - p.s0), per = 2 * L / p.sp, ph = ((t + p.ph) / per) % 1, f = ph < .5 ? ph * 2 : 2 - ph * 2;
  const q = polyAt(p.r.pts, p.r.cum, p.s0 + L * f);
  return { a: q[0] - Math.sin(q[2]) * p.off, b: q[1] + Math.cos(q[2]) * p.off, ang: q[2] + (ph < .5 ? 0 : Math.PI) };
}
export function drawPed(p, q, t){
  const s = prj(q.a, q.b, 0), bx = Math.round(s[0]), by = Math.round(s[1]);
  const da = Math.cos(q.ang), db = Math.sin(q.ang);
  const f = ((da * PC - db * PS) - (da * PS + db * PC)) >= 0 ? 1 : -1, fr = Math.floor(t * 6 + p.ph) & 1;
  const px = [[1, -4], [2, -4], [1, -3], [2, -3], [-1, -2], [0, -2], [1, -2], [-2, -3], fr ? [-1, -1] : [0, -1], fr ? [1, -1] : [-1, -1]];
  SH.CUR = p.fur;
  for (const [x, y] of px) for (const [ox, oy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) fput(bx + x * f + ox, by + y + oy, 0);
  for (const [x, y] of px) fput(bx + x * f, by + y, 1);
  if (p.hat){ SH.CUR = p.side === 'ccp' ? M.MILITARY : M.HULL; fput(bx + f, by - 5, 1); fput(bx + 2 * f, by - 5, 1); }
}
// match : deux equipes et une balle sur la pelouse, l'apres-midi et le soir
export function stadeDrawables(t, out){
  const h = CLOCK.h; if (h < 13 || h > 22.5) return;
  for (const l of SH.BLD){
    if (l.type !== 'stade' || !l.done) continue;
    const a0 = l.a0 + 8, a1 = l.a1 - 3, b0 = l.b0 + 8, b1 = l.b1 - 3, ccp = l.side === 'ccp';
    const ball = [ (a0 + a1) / 2 + Math.sin(t * .9 + l.ca) * (a1 - a0) * .38, (b0 + b1) / 2 + Math.sin(t * 1.3) * (b1 - b0) * .34 ];
    for (let k = 0; k < 12; k++){
      const team = k & 1, home = [a0 + (a1 - a0) * (.15 + .7 * hash2(k, l.ca | 0)), b0 + (b1 - b0) * (.15 + .7 * hash2(k + 5, l.cb | 0))];
      const pull = .25 + .35 * hash2(k, 3), pa = home[0] + (ball[0] - home[0]) * pull + Math.sin(t * 2 + k) * .8, pb = home[1] + (ball[1] - home[1]) * pull + Math.cos(t * 1.7 + k) * .8;
      out.push({ d: dep(pa, pb), f: () => { const q = prj(pa, pb, 0), x = Math.round(q[0]), y = Math.round(q[1]); SH.CUR = team ? (ccp ? M.FLAG_RED : M.FLAG_BLUE) : (ccp ? M.KVAS : M.FLAG_RED); fput(x, y - 1, 1); fput(x, y - 2, 1); SH.CUR = M.CAT; fput(x, y - 3, 1); } });
    }
    out.push({ d: dep(ball[0], ball[1]) + .1, f: () => { const bz2 = Math.abs(Math.sin(t * 3)) * 3, q = prj(ball[0], ball[1], bz2); SH.CUR = M.CHROME; fput(Math.round(q[0]), Math.round(q[1]) - 1, 1); } });
  }
}
HOOKS.dyn.push((t, out) => {
  if (SH.Z < SH.KDEF * .6) return;
  const key = SH.TOWN_VER + ':' + SH.ROADS.length;
  if (PEDS.key !== key){ buildPeds(); PEDS.key = key; }
  for (let k = 0; k < PEDS.length; k++){
    const p = PEDS[k], q = pedPos(p, t);
    const s = prj(q.a, q.b, 0); if (s[0] < -8 || s[1] < -8 || s[0] > W + 8 || s[1] > H + 8) continue;
    if (SH.NIGHT > .8 && hash2(k, 3) < .7) continue;
    out.push({ d: dep(q.a, q.b) + .1, f: () => drawPed(p, q, t) });
  }
  stadeDrawables(t, out);
});

/* ================= reflets de nuit : lumieres dans l'eau et sur les routes mouillees ================= */
export let WET = 0;
HOOKS.step.push((dt) => { const rain = WEATHER.shown === 'pluie' ? WEATHER.k : 0; WET = rain > .3 ? Math.min(1, WET + dt * .25 * rain) : Math.max(0, WET - dt / 90); });
export const GLOWS = new Uint8Array(PAL_HEX.length);
[M.WIN, M.LAMP, M.SIGN, M.SIGN_CCP, M.REDLIGHT, M.FW_BLUE, M.FW_GREEN, M.ICON_R, M.ICON_Y].forEach(m => GLOWS[m] = 1);
export const WATERS = new Uint8Array(PAL_HEX.length); [M.SEA, M.SEA_MID, M.SEA_SHALLOW, M.FOAM].forEach(m => WATERS[m] = 1);
export const KEEP_TINT = new Uint8Array(PAL_HEX.length); [M.SIGN, M.SIGN_CCP, M.REDLIGHT, M.FW_BLUE, M.FW_GREEN, M.ICON_R, M.ICON_Y].forEach(m => KEEP_TINT[m] = 1);
export function reflections(t){
  if (SH.NIGHT < .45 || N > 900000) return;
  const road = WET > .15, MR = M.ROAD, RF = M.REFLECT, tick = (t * 7) | 0, maxW = Math.round(20 + 10 * (SH.K <= 2 ? 1 : 0)), maxR = Math.round(9 * WET);
  const FB = fb, MB = mb, LB = lb;
  for (let x = 0; x < W; x++){
    let gy = -999, gm = 0;
    for (let y = 0, i = x; y < H; y++, i += W){
      const m = MB[i];
      if (FB[i] === 1 && GLOWS[m]){ gy = y; gm = m; continue; }
      const d = y - gy; if (d > maxW) continue;
      if (WATERS[m]){
        if (((y + (tick >> 1)) % 3) !== 0 && hash2(x * 3 + ((y + tick) >> 1), y) < .7 - d / maxW){ FB[i] = 1; MB[i] = KEEP_TINT[gm] ? gm : RF; LB[i] = 0; }
      } else if (road && m === MR && d <= maxR && FB[i] === 0){
        if (hash2(x, y + tick * 3) < (.5 - d / (maxR * 2.2)) * WET){ FB[i] = 1; MB[i] = KEEP_TINT[gm] ? gm : RF; LB[i] = 0; }
      }
    }
  }
}
HOOKS.post.push(reflections);

// appeles depuis des modules plus petits en numero
Object.assign(SH, { drawTreeLights, fwSalvo });
