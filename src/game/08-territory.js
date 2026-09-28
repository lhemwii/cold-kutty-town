/* ================= territoires : chaque camp etend sa couleur case par case, en direct ================= */
// une case = TC x TC unites. own : 0 personne, 1 USC, 2 CCR. Seule la terre ferme se conquiert.
const TC = 4, SID = { usc: 1, ccp: 2 }, SNAME = [null, 'usc', 'ccp'];
const TER = { W: GW / GSC / TC, H: GH / GSC / TC, own: null, land: null, lock: null, tgt: { usc: null, ccp: null }, cnt: { usc: 0, ccp: 0 }, landN: 1,
  ver: 0, srcVer: -1, acc: 0, fightAcc: 0, rate: { usc: 0, ccp: 0 }, fresh: null, lastGain: { usc: 0, ccp: 0 } };
TER.N = TER.W * TER.H;
const terIdx = (a, b) => { const x = Math.floor((a - GA0) / TC), y = Math.floor((b - GB0) / TC); return (x < 0 || y < 0 || x >= TER.W || y >= TER.H) ? -1 : y * TER.W + x; };
const ownerAt = (a, b) => { const i = terIdx(a, b); return i < 0 ? 0 : TER.own[i]; };
const sideAt = (a, b) => SNAME[ownerAt(a, b)] || null;
function initTerritory(){
  TER.own = new Uint8Array(TER.N); TER.land = new Uint8Array(TER.N); TER.lock = new Uint8Array(TER.N); TER.fresh = new Float32Array(TER.N);
  TER.tgt.usc = new Uint8Array(TER.N); TER.tgt.ccp = new Uint8Array(TER.N);
  let n = 0;
  for (let y = 0; y < TER.H; y++) for (let x = 0; x < TER.W; x++){
    // une case compte comme terre si son centre et la majorite de ses coins sont a terre
    const a = GA0 + (x + .5) * TC, b = GB0 + (y + .5) * TC;
    let k = 0; for (const [da, db] of [[0, 0], [-1.5, -1.5], [1.5, -1.5], [-1.5, 1.5], [1.5, 1.5]]) if (baseAt(a + da, b + db) !== T_SEA) k++;
    if (k >= 3){ TER.land[y * TER.W + x] = 1; n++; }
  }
  TER.landN = Math.max(1, n); TER.cnt.usc = TER.cnt.ccp = 0; TER.ver++; TER.srcVer = -1;
}
// sources d'influence : chaque batiment rayonne autour de lui ; le QG rayonne d'autant plus que la ville est peuplee
function influenceOf(l){
  const E = ECO[l.type]; if (!E) return 0;
  let r = E.rad || 0;
  if (l.type === 'qg') r += Math.min(80, Math.sqrt(RES[l.side].pop || 0) * 5);
  if (E.up && (l.lvl || 1) > 1) r *= 1 + .15 * ((l.lvl || 1) - 1);
  return r;
}
// distance normalisee a la source la plus proche (0 au centre, 250 au bord du rayon, 255 hors d'atteinte)
function rebuildTargets(){
  for (const s of SIDES) TER.tgt[s].fill(255);
  for (const l of BLD){
    if (!l.side || !TER.tgt[l.side]) continue;
    const r = influenceOf(l); if (r <= 0) continue;
    const T = TER.tgt[l.side];
    const x0 = Math.max(0, Math.floor((l.ca - r - GA0) / TC)), x1 = Math.min(TER.W - 1, Math.floor((l.ca + r - GA0) / TC));
    const y0 = Math.max(0, Math.floor((l.cb - r - GB0) / TC)), y1 = Math.min(TER.H - 1, Math.floor((l.cb + r - GB0) / TC));
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++){
      const i = y * TER.W + x; if (!TER.land[i]) continue;
      const d = Math.hypot(GA0 + (x + .5) * TC - l.ca, GB0 + (y + .5) * TC - l.cb) / r;
      if (d <= 1){ const v = Math.round(d * 250); if (v < T[i]) T[i] = v; }
    }
  }
  TER.srcVer = TOWN_VER;
}
// verrous : sous un batiment ou pres d'un pan du Rideau de Laine, la case ne change plus de camp
function lockCells(a0, a1, b0, b1, sid){
  const x0 = Math.max(0, Math.floor((a0 - GA0) / TC)), x1 = Math.min(TER.W - 1, Math.floor((a1 - GA0) / TC));
  const y0 = Math.max(0, Math.floor((b0 - GB0) / TC)), y1 = Math.min(TER.H - 1, Math.floor((b1 - GB0) / TC));
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) TER.lock[y * TER.W + x] = sid;
}
function rebuildLocks(){
  TER.lock.fill(0);
  for (const l of BLD) if (l.side) lockCells(l.a0, l.a1, l.b0, l.b1, SID[l.side]);
  for (const w of WALLS){
    const L = Math.hypot(w.qa - w.pa, w.qb - w.pb) || 1;
    for (let s = 0; s <= L; s += TC / 2){ const a = w.pa + (w.qa - w.pa) * s / L, b = w.pb + (w.qb - w.pb) * s / L; lockCells(a - 8, a + 8, b - 8, b + 8, SID[w.side]); }
  }
}
// prendre une case (debarquement, drapeau pose par barge) : on ne vole jamais une case verrouillee
function claimCell(i, sid, t){
  const o = TER.own[i]; if (o === sid || !TER.land[i]) return false;
  if (o && TER.lock[i] && TER.lock[i] !== sid) return false;
  if (o) TER.cnt[SNAME[o]]--;
  TER.own[i] = sid; TER.cnt[SNAME[sid]]++; TER.fresh[i] = t; TER.ver++;
  mapDirtyCell(i);
  return true;
}
function claimDisc(a, b, r, side){
  const sid = SID[side], t = GAME.t;
  const x0 = Math.max(0, Math.floor((a - r - GA0) / TC)), x1 = Math.min(TER.W - 1, Math.floor((a + r - GA0) / TC));
  const y0 = Math.max(0, Math.floor((b - r - GB0) / TC)), y1 = Math.min(TER.H - 1, Math.floor((b + r - GB0) / TC));
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++){
    if (Math.hypot(GA0 + (x + .5) * TC - a, GB0 + (y + .5) * TC - b) > r) continue;
    const i = y * TER.W + x; if (!TER.own[i]) claimCell(i, sid, t);
  }
}
// vitesse de conquete, en cases par seconde : les ronrons font avancer la frontiere
function claimRate(side){
  const R = RES[side]; if (!R) return 0;
  return clamp(14 + Math.max(0, R.rr) * .25 + R.pop * .05, 6, 60) * (R.short ? .45 : 1);
}
// force d'un camp sur une case disputee
function pressureAt(side, i){ const d = TER.tgt[side][i]; if (d === 255) return 0; const R = RES[side]; return (1 - d / 255) * (1 + clamp((R.rr || 0) / 45, 0, 1.6)) * (R.short ? .6 : 1); }
const CAND = new Int32Array(8192), CANDD = new Uint8Array(8192);
function stepTerritory(dt){
  if (!TER.own || GAME.mode !== 'play') return;
  if (TER.srcVer !== TOWN_VER){ rebuildTargets(); rebuildLocks(); }
  TER.acc += dt; TER.fightAcc += dt;
  if (TER.acc < .25) return;
  const step = TER.acc; TER.acc = 0;
  const Wd = TER.W, own = TER.own, land = TER.land, t = GAME.t;
  for (const side of SIDES){
    const sid = SID[side], T = TER.tgt[side];
    TER.rate[side] = claimRate(side);
    let budget = TER.rate[side] * step + (TER.carry && TER.carry[side] || 0);
    const whole = Math.floor(budget); (TER.carry || (TER.carry = {}))[side] = budget - whole;
    if (whole <= 0) continue;
    // cases neutres a portee, collees a notre territoire ; on prend d'abord les plus proches d'une source
    let n = 0;
    for (let y = 1; y < TER.H - 1 && n < 8192; y++) for (let x = 1; x < Wd - 1; x++){
      const i = y * Wd + x;
      if (own[i] || !land[i] || T[i] === 255) continue;
      if (own[i - 1] !== sid && own[i + 1] !== sid && own[i - Wd] !== sid && own[i + Wd] !== sid) continue;
      CAND[n] = i; CANDD[n] = T[i]; n++; if (n >= 8192) break;
    }
    if (!n) continue;
    const idx = Array.from({ length: n }, (_, k) => k).sort((p, q) => (CANDD[p] - CANDD[q]) || (hash2(CAND[p], t | 0) - hash2(CAND[q], t | 0)));
    let got = 0;
    for (let k = 0; k < idx.length && got < whole; k++) if (claimCell(CAND[idx[k]], sid, t)) got++;
    TER.lastGain[side] = got;
  }
  // frontiere commune : la case passe au camp le plus fort, lentement, sauf si elle est verrouillee
  if (TER.fightAcc >= 1){
    const fstep = TER.fightAcc; TER.fightAcc = 0;
    for (const side of SIDES){
      const sid = SID[side], eid = SID[other(side)], T = TER.tgt[side];
      let budget = Math.floor(2.5 * fstep);
      const list = [];
      for (let y = 1; y < TER.H - 1; y++) for (let x = 1; x < Wd - 1; x++){
        const i = y * Wd + x;
        if (own[i] !== eid || T[i] === 255 || TER.lock[i]) continue;
        if (own[i - 1] !== sid && own[i + 1] !== sid && own[i - Wd] !== sid && own[i + Wd] !== sid) continue;
        const ps = pressureAt(side, i), pe = pressureAt(other(side), i);
        if (ps > pe * 1.3 + .06) list.push([i, ps - pe]);
      }
      list.sort((p, q) => q[1] - p[1]);
      for (const [i] of list){ if (budget-- <= 0) break; claimCell(i, sid, t); }
    }
  }
}
const terPct = (side) => TER.cnt[side] / TER.landN;
