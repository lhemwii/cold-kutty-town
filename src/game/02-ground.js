/* ================= l'ile, encore plus grande, avec deux aeroports ================= */
const A_LINES = [-640, -550, -460, -370, -280, -190, -100, -10, 80, 170, 260, 350, 440, 530, 620];
const B_LINES = [-470, -390, -310, -230, -150, -70, 10, 90, 170, 250, 330, 410, 490];
// la ligne de chemin de fer suit une ligne de la grille, sans route dessus
const RAIL_B = -390, RAIL_W = 5;
const RW = 6, SW = 3, RWS = RW + SW;
const WALL_A = -10, CHECK_B = 10, STRIP = RW + SW;
const IS = { ca: -10, cb: 20, ra: 1040, rb: 560 };
const LH = { a: 80, b: -612, r: 16 };
const T_SEA = 0, T_GRASS = 1, T_BEACH = 2, T_ROAD = 3, T_WALK = 4, T_PATH = 5, T_PIER = 6, T_ROCK = 7, T_STRIP = 8, T_TARMAC = 9, T_APRON = 10, T_RAIL = 11;
const sideOf = (a) => a < WALL_A ? 'usc' : 'ccp';
const TYPE_MAT = [M.SEA, M.GRASS, M.BEACH, M.ROAD, M.WALK, M.GRAVEL, M.PIER, M.ROCK, M.STRIP, M.ROAD, M.CONCRETE, M.RAIL];
// aeroports : a l'ouest pour l'USC, a l'est pour la CCR (symetrique par rapport au mur)
const mirA = (a) => 2 * WALL_A - a;
function airportDef(side){
  const m = side === 'usc' ? (a) => a : mirA;
  const box = (a0, a1, b0, b1) => { const x0 = m(a0), x1 = m(a1); return [Math.min(x0, x1), Math.max(x0, x1), b0, b1]; };
  return {
    side, dir: side === 'usc' ? -1 : 1, m,
    runway: box(-905, -715, -8, 8), taxi: box(-890, -730, 20, 28),
    links: [box(-894, -886, 8, 20), box(-734, -726, 8, 20)],
    apron: box(-865, -760, 28, 62),
    terminal: box(-850, -798, 64, 78), tower: box(-790, -784, 66, 72),
    hangars: [box(-902, -880, 34, 56), box(-876, -854, 34, 56)],
    road: { o: 'a', c: 90, s0: Math.min(m(-800), m(-640)), s1: Math.max(m(-800), m(-640)) },
    parking: box(-796, -766, 64, 80)
  };
}
const AIRPORTS = [airportDef('usc'), airportDef('ccp')];
const inBox = (r, a, b) => a >= r[0] && a < r[1] && b >= r[2] && b < r[3];
for (const ap of AIRPORTS){ const rs = [ap.runway, ap.taxi, ap.apron, ap.terminal, ap.tower, ap.parking, ...ap.hangars]; ap.bbox = [Math.min(...rs.map(r => r[0])), Math.max(...rs.map(r => r[1])), Math.min(...rs.map(r => r[2])), Math.max(...rs.map(r => r[3]))]; }
const nearAirport = (a, b, m) => AIRPORTS.some(ap => a >= ap.bbox[0] - m && a < ap.bbox[1] + m && b >= ap.bbox[2] - m && b < ap.bbox[3] + m);
function airportAt(a, b){
  for (const ap of AIRPORTS){
    if (inBox(ap.runway, a, b) || inBox(ap.taxi, a, b) || ap.links.some(r => inBox(r, a, b))) return [ap, T_TARMAC];
    if (inBox(ap.apron, a, b) || inBox(ap.parking, a, b)) return [ap, T_APRON];
  }
  return null;
}

function islandF(a, b){
  const u = (a - IS.ca) / IS.ra, v = (b - IS.cb) / IS.rb;
  const r = Math.pow(u * u * u * u + v * v * v * v, 0.25);
  const ang = Math.atan2(v, u);
  const n = (vnoise(Math.cos(ang) * 3 + 10, Math.sin(ang) * 3 + 10) - .5) * .1 + (vnoise(a * .015 + 5, b * .015 + 9) - .5) * .06;
  return 1 + n - r;
}
function classifyBase(a, b){
  if (islandF(a, b) <= 0){
    if (Math.hypot(a - LH.a, b - LH.b) < LH.r) return T_ROCK;
    if (a >= LH.a - 4 && a < LH.a + 4 && b > LH.b && b < LH.b + 140) return T_PIER;
    return T_SEA;
  }
  if (Math.abs(a - WALL_A) < STRIP) return T_STRIP;
  if (a >= LH.a - 4 && a < LH.a + 4 && b < B_LINES[0] - RWS) return T_PATH;
  const ap = airportAt(a, b); if (ap) return ap[1];
  if (Math.abs(b - RAIL_B) < RAIL_W && Math.abs(a - WALL_A) > STRIP + 22 && islandF(a, b) > .06) return T_RAIL;
  return T_GRASS;
}

// ports : un quai en beton sur la cote sud, pres de chaque bout de l'ile, avec deux jetees
const T_QUAY = 12; TYPE_MAT[T_QUAY] = M.CONCRETE;
function coastAt(a){ let b = 420; while (b < 800 && islandF(a, b) > 0) b += .5; return b; }
const PORTS = [['usc', -640], ['ccp', 620]].map(([side, ca]) => {
  let lo = 1e9, hi = -1e9; for (let a = ca - 72; a <= ca + 72; a += 2){ const c = coastAt(a); lo = Math.min(lo, c); hi = Math.max(hi, c); }
  const top = Math.floor(lo - 7), bot = Math.ceil(hi + 9);
  return { side, ca, top, bot, slab: [ca - 70, ca + 70, top, bot], jet: [[ca - 54, ca - 46, bot - 1, bot + 58], [ca + 44, ca + 52, bot - 1, bot + 58]] };
});
function quayAt(a, b){ for (const P of PORTS) if (inBox(P.slab, a, b) || inBox(P.jet[0], a, b) || inBox(P.jet[1], a, b)) return P; return null; }
function quayTone(a, b){
  const P = quayAt(a, b); if (!P) return 0;
  const inJet = P.jet.find(r => inBox(r, a, b)), R = inJet || P.slab;
  const e = Math.min(a - R[0], R[1] - a, inJet ? R[3] - b : b - R[2] < 1 ? 9 : R[3] - b);
  if (e < .8) return 16;
  if (!inJet && Math.abs(a - P.ca) < 6 && b < R[2] + 3) return 0;
  return ((Math.floor(a) % 9 === 0) || (Math.floor(b) % 9 === 0)) ? 5 : 1;
}
// trame du sol : 2 cellules par unite. gBase garde le sol sans les routes pour pouvoir repeindre.
const GSC = 2, GA0 = -1160, GB0 = -660, GW = 4560, GH = 2640, GN = GW * GH;
const GQW = GW >> 2, GQH = GH >> 2;
// basse resolution : nuances de l'herbe et phase de l'ecume
const gVar = new Uint8Array(GQW * GQH), gPh = new Uint8Array(GQW * GQH);
const gType = new Uint8Array(GN), gBase = new Uint8Array(GN), gTone = new Uint8Array(GN), gSea = new Uint8Array(GN), gLand = new Uint8Array(GN);
const cellOf = (a, b) => { const ia = Math.floor((a - GA0) * GSC), ib = Math.floor((b - GB0) * GSC); return (ia < 0 || ib < 0 || ia >= GW || ib >= GH) ? -1 : ib * GW + ia; };
const typeAt = (a, b) => { const i = cellOf(a, b); return i < 0 ? T_SEA : gType[i]; };
const baseAt = (a, b) => { const i = cellOf(a, b); return i < 0 ? T_SEA : gBase[i]; };
const landDAt = (a, b) => { const i = cellOf(a, b); return i < 0 ? 0 : gLand[i]; };

// distance de chanfrein en entiers (2 en droit, 3 en diagonale)
function chamfer(dist, w, h){
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++){
    const i = y * w + x; let v = dist[i]; if (v === 0) continue;
    if (x > 0 && dist[i-1] + 2 < v) v = dist[i-1] + 2;
    if (y > 0){ if (dist[i-w] + 2 < v) v = dist[i-w] + 2; if (x > 0 && dist[i-w-1] + 3 < v) v = dist[i-w-1] + 3; if (x < w-1 && dist[i-w+1] + 3 < v) v = dist[i-w+1] + 3; }
    dist[i] = v;
  }
  for (let y = h - 1; y >= 0; y--) for (let x = w - 1; x >= 0; x--){
    const i = y * w + x; let v = dist[i]; if (v === 0) continue;
    if (x < w-1 && dist[i+1] + 2 < v) v = dist[i+1] + 2;
    if (y < h-1){ if (dist[i+w] + 2 < v) v = dist[i+w] + 2; if (x < w-1 && dist[i+w+1] + 3 < v) v = dist[i+w+1] + 3; if (x > 0 && dist[i+w-1] + 3 < v) v = dist[i+w-1] + 3; }
    dist[i] = v;
  }
}
function buildGround(){
  for (let ib = 0, i = 0; ib < GH; ib++){
    const b = GB0 + (ib + .5) / GSC;
    for (let ia = 0; ia < GW; ia++, i++){
      const a = GA0 + (ia + .5) / GSC;
      const u = (a - IS.ca) / IS.ra, v = (b - IS.cb) / IS.rb;
      gBase[i] = (u * u * u * u + v * v * v * v > 1.9 && Math.hypot(a - LH.a, b - LH.b) > LH.r + 2 && !(a >= LH.a - 4 && a < LH.a + 4 && b < LH.b + 140 && b > LH.b)) ? T_SEA : classifyBase(a, b);
      if (b > 380 && quayAt(a, b)) gBase[i] = T_QUAY;
    }
  }
  let d = new Uint16Array(GN);
  for (let i = 0; i < GN; i++) d[i] = gBase[i] === T_SEA ? 60000 : 0;
  chamfer(d, GW, GH);
  for (let i = 0; i < GN; i++) gSea[i] = Math.min(255, d[i] >> 1);
  for (let i = 0; i < GN; i++) d[i] = gBase[i] === T_SEA ? 0 : 60000;
  chamfer(d, GW, GH);
  for (let i = 0; i < GN; i++){ gLand[i] = Math.min(255, d[i] >> 1); if (gBase[i] === T_GRASS && gLand[i] < 14) gBase[i] = T_BEACH; }
  d = null;
  for (let q = 0, qi = 0; q < GQH; q++) for (let p = 0; p < GQW; p++, qi++){
    const a = GA0 + (p * 4 + 2) / GSC, b = GB0 + (q * 4 + 2) / GSC;
    gVar[qi] = (vnoise(a * .04 + 1.3, b * .04 + 2.7) > .6 || vnoise(a * .21 + 9, b * .21 + 4) > .8) ? 1 : 0;
    gPh[qi] = Math.round(vnoise(a * .06, b * .06) * 60);
  }
  for (let ib = 0, i = 0; ib < GH; ib++){
    const b = GB0 + (ib + .5) / GSC;
    for (let ia = 0; ia < GW; ia++, i++){
      gType[i] = gBase[i];
      if (gBase[i] === T_SEA && gSea[i] > 10){ gTone[i] = 0; continue; }
      gTone[i] = baseTone(GA0 + (ia + .5) / GSC, b, gBase[i], gLand[i], gSea[i], ia, ib);
    }
  }
}
function airportTone(a, b){
  const hit = airportAt(a, b); if (!hit) return 0;
  const ap = hit[0], R = ap.runway;
  if (hit[1] === T_APRON){
    // joints de dalles
    return ((Math.floor(a) % 8 === 0) || (Math.floor(b) % 8 === 0)) ? 3 : 1;
  }
  if (inBox(R, a, b)){
    const L = R[1] - R[0], u = a - R[0], v = b - (R[2] + R[3]) / 2;
    if (Math.abs(v) > 7.2) return 16;
    // bandes de seuil aux deux bouts, axe en tirets
    if (u < 8 || u > L - 8) return (Math.floor((v + 8) / 1.5) & 1) && Math.abs(v) < 6.5 ? 16 : 0;
    if (u < 11 || u > L - 11) return 0;
    if (Math.abs(v) < .45 && (Math.floor(u / 6) & 1)) return 16;
    if ((u < 22 || u > L - 22) && Math.abs(Math.abs(v) - 4) < .8) return 16;
    return 0;
  }
  // voie de circulation : ligne centrale
  const T = ap.taxi;
  if (inBox(T, a, b)) return Math.abs(b - (T[2] + T[3]) / 2) < .45 ? 16 : 0;
  return 0;
}
// voie ferree : deux rails clairs, traverses sombres, ballast mouchete
function railTone(a, b){
  const d = Math.abs(b - RAIL_B);
  if (Math.abs(d - 1.6) < .35) return 16;
  if (d < 2.7 && (((a * 1.25) % 2 + 2) % 2) < .7) return 0;
  if (d > RAIL_W - .6) return 1;
  return hash2(Math.floor(a * 2), Math.floor(b * 2) + 91) < .5 ? 6 : 2;
}
function baseTone(a, b, t, ld, sd, ia, ib){
  switch (t){
    case T_SEA: return (sd >= 1 && sd <= 10) ? 32 + sd : 0;
    case T_ROCK: return Math.hypot(a - LH.a, b - LH.b) > LH.r - 1 ? 16 : 3;
    case T_PIER: if (a < LH.a - 3 || a >= LH.a + 3) return 16; return (Math.floor(b / 3) & 1) ? 3 : 0;
    case T_PATH: if (a < LH.a - 3 || a >= LH.a + 3) return (Math.floor(b / 2) & 1) ? 16 : 0; return 2;
    case T_BEACH: if (ld <= 2) return 16; return Math.max(1, Math.round(4 - ld * .25));
    case T_STRIP: {
      const d = Math.abs(a - WALL_A);
      if (d >= STRIP - .5) return 16;
      if (d < 1.2) return 0;
      return (Math.floor((a - WALL_A) * 2 + 40) % 3 === 0) ? 5 : 2;
    }
    case T_TARMAC: case T_APRON: return airportTone(a, b);
    case T_RAIL: return railTone(a, b);
    case T_QUAY: return quayTone(a, b);
    default: return hash2((hash2(ia, ib) * 4294967296) | 0, (ia * 31) ^ ib) < 0.012 ? 16 : 0;
  }
}

/* ================= routes : segments droits, ceux de la grille et ceux du joueur ================= */
// o 'a' : route le long de a (b fixe = c). o 'b' : route le long de b (a fixe = c). s0..s1 : etendue.
let ROADS = [], USER_ROADS = [];
const segPt = (s, t) => s.o === 'a' ? [t, s.c] : [s.c, t];
const isCheckpoint = (s) => s.o === 'a' && Math.abs(s.c - CHECK_B) < .01;
function roadOk(a, b, strict, o){ const i = cellOf(a, b); if (i < 0) return false; const t = gBase[i]; return (t === T_GRASS || (t === T_STRIP && !strict) || (t === T_RAIL && o === 'b')) && gLand[i] >= 20; }
// decoupe une ligne de la grille en morceaux poses sur la terre ferme
function clipLine(o, c, s0, s1){
  const out = []; let run = null;
  for (let t = s0; t <= s1 + .01; t += 2){
    const [a, b] = o === 'a' ? [t, c] : [c, t];
    const inStrip = Math.abs(a - WALL_A) < STRIP;
    const ok = inStrip ? (o === 'a' && Math.abs(c - CHECK_B) < .01) : roadOk(a, b, true, o);
    if (ok){ if (!run) run = [t, t]; else run[1] = t; }
    else if (run){ out.push(run); run = null; }
  }
  if (run) out.push(run);
  return out.filter(r => r[1] - r[0] >= 30).map(r => ({ o, c, s0: r[0], s1: r[1], grid: true }));
}
function buildGridRoads(){
  ROADS = [];
  const aMin = A_LINES[0], aMax = A_LINES[A_LINES.length - 1], bMin = B_LINES[0], bMax = B_LINES[B_LINES.length - 1];
  for (const A of A_LINES){ if (A === WALL_A) continue; ROADS.push(...clipLine('b', A, bMin, bMax)); }
  for (const B of B_LINES){
    if (B === RAIL_B) continue;
    // de part et d'autre du mur, sauf au checkpoint ou la route traverse
    if (Math.abs(B - CHECK_B) < .01) ROADS.push(...clipLine('a', B, aMin, aMax));
    else { ROADS.push(...clipLine('a', B, aMin, WALL_A - STRIP)); ROADS.push(...clipLine('a', B, WALL_A + STRIP, aMax)); }
  }
  for (const ap of AIRPORTS) ROADS.push(...clipLine('a', ap.road.c, ap.road.s0, ap.road.s1));
  // route du port : prolonge la derniere avenue jusqu'au quai
  for (const P of PORTS) ROADS.push({ o: 'b', c: P.ca, s0: B_LINES[B_LINES.length - 1], s1: P.top + 5 });
  // accroche les bouts de route aux lignes perpendiculaires proches
  for (const s of ROADS){
    for (const p of ROADS){
      if (p.o === s.o) continue;
      if (s.c < p.s0 - .5 || s.c > p.s1 + .5) continue;
      if (Math.abs(p.c - s.s0) < RWS + 2) s.s0 = p.c;
      if (Math.abs(p.c - s.s1) < RWS + 2) s.s1 = p.c;
    }
  }
}
const allRoads = () => ROADS.concat(USER_ROADS);
// points d'arret d'un segment : ses bouts et ses croisements
function stopsOf(s, list){
  const st = [s.s0, s.s1];
  for (const p of list){ if (p.o === s.o) continue; if (p.c >= s.s0 - .5 && p.c <= s.s1 + .5 && s.c >= p.s0 - .5 && s.c <= p.s1 + .5) st.push(p.c); }
  st.sort((x, y) => x - y);
  return st.filter((v, i) => i === 0 || v - st[i - 1] > .5);
}
function paintRoads(ra0, ra1, rb0, rb1){
  const ia0 = Math.max(0, Math.floor((ra0 - GA0) * GSC)), ia1 = Math.min(GW - 1, Math.ceil((ra1 - GA0) * GSC));
  const ib0 = Math.max(0, Math.floor((rb0 - GB0) * GSC)), ib1 = Math.min(GH - 1, Math.ceil((rb1 - GB0) * GSC));
  // 1. remise a zero
  for (let ib = ib0; ib <= ib1; ib++) for (let ia = ia0; ia <= ia1; ia++){
    const i = ib * GW + ia; gType[i] = gBase[i];
    gTone[i] = baseTone(GA0 + (ia + .5) / GSC, GB0 + (ib + .5) / GSC, gBase[i], gLand[i], gSea[i], ia, ib);
  }
  const list = allRoads();
  const cellsOf = (s, pad, f) => {
    const lo = s.s0 - pad, hi = s.s1 + pad, c0 = s.c - pad, c1 = s.c + pad;
    const A0 = s.o === 'a' ? lo : c0, A1 = s.o === 'a' ? hi : c1, B0 = s.o === 'a' ? c0 : lo, B1 = s.o === 'a' ? c1 : hi;
    const xa = Math.max(ia0, Math.floor((A0 - GA0) * GSC)), xb = Math.min(ia1, Math.ceil((A1 - GA0) * GSC) - 1);
    const ya = Math.max(ib0, Math.floor((B0 - GB0) * GSC)), yb = Math.min(ib1, Math.ceil((B1 - GB0) * GSC) - 1);
    for (let ib = ya; ib <= yb; ib++) for (let ia = xa; ia <= xb; ia++){
      const a = GA0 + (ia + .5) / GSC, b = GB0 + (ib + .5) / GSC, i = ib * GW + ia;
      const t = gBase[i];
      if (t === T_SEA || t === T_ROCK || t === T_PIER) continue;
      if (t === T_STRIP && !isCheckpoint(s)) continue;
      if (t === T_RAIL && s.o === 'a') continue;
      f(i, a, b, s.o === 'a' ? a : b, s.o === 'a' ? b - s.c : a - s.c);
    }
  };
  // 2. trottoirs
  for (const s of list) cellsOf(s, RWS, (i, a, b, along, d) => {
    if (gType[i] === T_ROAD || gBase[i] === T_RAIL) return;
    const ad = Math.abs(d);
    gType[i] = T_WALK; gTone[i] = (ad >= RW && ad < RW + .6) ? 16 : 1;
  });
  // 3. chaussees avec ligne blanche
  for (const s of list) cellsOf(s, RW, (i, a, b, along, d) => {
    gType[i] = T_ROAD;
    if (gBase[i] === T_RAIL){ const dr = Math.abs(b - RAIL_B); gTone[i] = Math.abs(dr - 1.6) < .35 ? 16 : (dr > RAIL_W - 1 && (Math.floor(a * 1.5) & 1) ? 16 : 0); return; }
    gTone[i] = (Math.abs(d) < .5 && (Math.floor(along / 5) & 1) === 0 && !isCheckpoint(s)) || (isCheckpoint(s) && Math.abs(d) < .5 && Math.abs(a - WALL_A) < STRIP && (Math.floor(a / 3) & 1)) ? 16 : 0;
  });
  // 4. carrefours : pas de ligne au milieu, passages pietons sur chaque branche
  for (const s of list){
    for (const x of stopsOf(s, list)){
      if (x === s.s0 || x === s.s1){ let cross = false; for (const p of list) if (p.o !== s.o && Math.abs(p.c - x) < .5 && s.c >= p.s0 - .5 && s.c <= p.s1 + .5) cross = true; if (!cross) continue; }
      cellsOf({ o: s.o, c: s.c, s0: x, s1: x }, RW, (i, a, b, along, d) => { if (gType[i] === T_ROAD) gTone[i] = 0; });
      for (const dir of [-1, 1]){
        const e = x + dir * (RW + 3);
        if (e < s.s0 || e > s.s1) continue;
        cellsOf({ o: s.o, c: s.c, s0: e, s1: e }, RW, (i, a, b, along, d) => {
          if (gType[i] !== T_ROAD || gBase[i] === T_RAIL) return;
          const off = Math.abs(along - x);
          if (off >= RW + 1 && off < RW + 5) gTone[i] = (Math.floor(d + 20) & 1) ? 16 : 0;
        });
      }
    }
  }
}

/* ================= terrains ================= */
let LOTS = [];
function buildLots(){
  const cols = [[A_LINES[0] - 45, A_LINES[0] - 9]], rows = [[B_LINES[0] - 40, B_LINES[0] - 9]];
  for (let i = 0; i < A_LINES.length - 1; i++){ const s = A_LINES[i] + 9; cols.push([s, s + 36], [s + 36, A_LINES[i + 1] - 9]); }
  for (let j = 0; j < B_LINES.length - 1; j++){ const s = B_LINES[j] + 9; rows.push([s, s + 31], [s + 31, B_LINES[j + 1] - 9]); }
  cols.push([A_LINES[A_LINES.length - 1] + 9, A_LINES[A_LINES.length - 1] + 45]); rows.push([B_LINES[B_LINES.length - 1] + 9, B_LINES[B_LINES.length - 1] + 40]);
  LOTS = [];
  cols.forEach((c, ci) => rows.forEach((r, ri) => {
    let ok = true;
    for (let p = 0; p <= 2 && ok; p++) for (let q = 0; q <= 2 && ok; q++){
      const a = c[0] + 2 + (c[1] - c[0] - 4) * p / 2, b = r[0] + 2 + (r[1] - r[0] - 4) * q / 2;
      if (typeAt(a, b) !== T_GRASS || landDAt(a, b) < 10) ok = false;
    }
    if (ok) LOTS.push({ id: 'L' + ci + '-' + ri, a0: c[0], a1: c[1], b0: r[0], b1: r[1], ca: (c[0] + c[1]) / 2, cb: (r[0] + r[1]) / 2, type: '', side: sideOf((c[0] + c[1]) / 2), blocked: false });
  }));
}
const lotAt = (a, b) => LOTS.find(l => a >= l.a0 && a < l.a1 && b >= l.b0 && b < l.b1) || null;
function nearestLot(a, b){ let best = null, bd = 1e9; for (const l of LOTS){ const d = Math.hypot(l.ca - a, l.cb - b); if (d < bd){ bd = d; best = l; } } return best; }
function refreshBlocked(){
  for (const l of LOTS){
    l.blocked = false;
    for (const s of USER_ROADS){
      const A0 = s.o === 'a' ? s.s0 - RWS : s.c - RWS, A1 = s.o === 'a' ? s.s1 + RWS : s.c + RWS;
      const B0 = s.o === 'a' ? s.c - RWS : s.s0 - RWS, B1 = s.o === 'a' ? s.c + RWS : s.s1 + RWS;
      if (A0 < l.a1 && A1 > l.a0 && B0 < l.b1 && B1 > l.b0){ l.blocked = true; break; }
    }
  }
}
