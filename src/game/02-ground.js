/* ================= l'ile : tiree au sort a chaque partie, vide, avec forets, plages, rochers et ilots ================= */
// (a, b) : axes du monde au sol, en unites. L'ile est centree sur (0, 0).
const IS = { ca: 0, cb: 0, ra: 660, rb: 430 };
const T_SEA = 0, T_GRASS = 1, T_BEACH = 2, T_ROAD = 3, T_WALK = 4, T_PATH = 5, T_PIER = 6, T_ROCK = 7, T_FOREST = 8, T_DIRT = 9, T_QUAY = 10;
const TYPE_MAT = [M.SEA, M.GRASS, M.BEACH, M.ROAD, M.WALK, M.GRAVEL, M.PIER, M.ROCK, M.FOREST, M.DIRT, M.CONCRETE];
// trame du sol : 2 cellules par unite. gBase garde le sol sans les routes pour pouvoir repeindre.
const GSC = 2, GA0 = -800, GB0 = -540, GW = 1600 * GSC, GH = 1080 * GSC, GN = GW * GH;
const GQW = GW >> 2, GQH = GH >> 2;
// basse resolution : nuances de l'herbe et phase de l'ecume
const gVar = new Uint8Array(GQW * GQH), gPh = new Uint8Array(GQW * GQH);
const gType = new Uint8Array(GN), gBase = new Uint8Array(GN), gTone = new Uint8Array(GN), gSea = new Uint8Array(GN), gLand = new Uint8Array(GN);
const cellOf = (a, b) => { const ia = Math.floor((a - GA0) * GSC), ib = Math.floor((b - GB0) * GSC); return (ia < 0 || ib < 0 || ia >= GW || ib >= GH) ? -1 : ib * GW + ia; };
const typeAt = (a, b) => { const i = cellOf(a, b); return i < 0 ? T_SEA : gType[i]; };
const baseAt = (a, b) => { const i = cellOf(a, b); return i < 0 ? T_SEA : gBase[i]; };
const landDAt = (a, b) => { const i = cellOf(a, b); return i < 0 ? 0 : gLand[i]; };
const seaDAt = (a, b) => { const i = cellOf(a, b); return i < 0 ? 255 : gSea[i]; };
const isLand = (t) => t !== T_SEA && t !== T_PIER;

// forme de l'ile : une super-ellipse cabossee par du bruit (baies, caps), plus quelques ilots au large
const ISEED = { ox: 0, oy: 0, islets: [] };
function seedIsland(seed){
  const r = (k) => hash2(seed * 7 + k, 913);
  ISEED.ox = r(1) * 50; ISEED.oy = r(2) * 50;
  ISEED.islets = [];
  const n = 3 + Math.floor(r(3) * 2);
  for (let k = 0; k < n; k++){
    const ang = (k / n) * TAU + r(10 + k) * 1.2, d = 1.12 + r(20 + k) * .08, rr = 30 + r(30 + k) * 28;
    // l'ilot reste entier dans la zone de jeu
    const a = clamp(Math.cos(ang) * IS.ra * d, GA0 + rr * 1.6 + 30, GA0 + GW / GSC - rr * 1.6 - 30), b = clamp(Math.sin(ang) * IS.rb * d, GB0 + rr * 1.3 + 30, GB0 + GH / GSC - rr * 1.3 - 30);
    ISEED.islets.push({ a, b, r: rr });
  }
}
function islandF(a, b){
  const u = (a - IS.ca) / IS.ra, v = (b - IS.cb) / IS.rb;
  const r = Math.pow(u * u * u * u + v * v * v * v, .25) * .6 + Math.hypot(u, v) * .4;
  const ang = Math.atan2(v, u);
  const n = (vnoise(Math.cos(ang) * 2.1 + ISEED.ox, Math.sin(ang) * 2.1 + ISEED.oy) - .5) * .36
    + (vnoise(a * .005 + ISEED.ox, b * .005 + ISEED.oy) - .5) * .2
    + (vnoise(a * .018 + 7 + ISEED.ox, b * .018 + 3 + ISEED.oy) - .5) * .07;
  let f = 1 + n - r;
  for (const it of ISEED.islets){
    const d = Math.hypot((a - it.a) / it.r, (b - it.b) / (it.r * .75));
    const g = (1 - d) * .6 + (vnoise(a * .04 + it.a * .01, b * .04 + it.b * .01) - .5) * .25;
    if (g > f) f = g;
  }
  // pres des bords de la carte, la terre s'efface toujours dans la mer
  const edge = Math.min(a - GA0, GA0 + GW / GSC - a, b - GB0, GB0 + GH / GSC - b);
  if (edge < 60) f -= (60 - edge) / 60 * .8;
  return f;
}
// bruits de la nature : forets et rochers
const forestN = (a, b) => vnoise(a * .011 + ISEED.ox + 30, b * .011 + ISEED.oy + 11) * .75 + vnoise(a * .05 + 3, b * .05 + ISEED.oy) * .25;
// montagnes : des chaines larges, avec un peu de relief fin
const mountN = (a, b) => vnoise(a * .0052 + ISEED.ox + 70, b * .0052 + ISEED.oy + 41) * .82 + vnoise(a * .028 + 3, b * .028 + ISEED.ox) * .18;
const MOUNT_T = .66;

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
function buildGround(seed){
  seedIsland(seed);
  // 1. la forme, calculee toutes les 2 unites puis interpolee (rapide et lisse)
  const S = 4, cw = Math.ceil(GW / S) + 2, ch = Math.ceil(GH / S) + 2, F = new Float32Array(cw * ch);
  for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) F[y * cw + x] = islandF(GA0 + x * S / GSC, GB0 + y * S / GSC);
  for (let ib = 0, i = 0; ib < GH; ib++){
    const fy = (ib + .5) / S, y0 = Math.floor(fy), ty = fy - y0;
    for (let ia = 0; ia < GW; ia++, i++){
      const fx = (ia + .5) / S, x0 = Math.floor(fx), tx = fx - x0, k = y0 * cw + x0;
      const f = (F[k] * (1 - tx) + F[k + 1] * tx) * (1 - ty) + (F[k + cw] * (1 - tx) + F[k + cw + 1] * tx) * ty;
      gBase[i] = f > 0 ? T_GRASS : T_SEA;
    }
  }
  // 2. distances a la cote, des deux cotes
  let d = new Uint16Array(GN);
  for (let i = 0; i < GN; i++) d[i] = gBase[i] === T_SEA ? 60000 : 0;
  chamfer(d, GW, GH);
  for (let i = 0; i < GN; i++) gSea[i] = Math.min(255, d[i] >> 1);
  for (let i = 0; i < GN; i++) d[i] = gBase[i] === T_SEA ? 0 : 60000;
  chamfer(d, GW, GH);
  for (let i = 0; i < GN; i++) gLand[i] = Math.min(255, d[i] >> 1);
  d = null;
  // 3. plages, rochers, forets (le bruit est lu en basse resolution)
  const RS = 8, rw = Math.ceil(GW / RS) + 1, rh = Math.ceil(GH / RS) + 1, FO = new Float32Array(rw * rh), RO = new Float32Array(rw * rh);
  for (let y = 0; y < rh; y++) for (let x = 0; x < rw; x++){ const a = GA0 + x * RS / GSC, b = GB0 + y * RS / GSC; FO[y * rw + x] = forestN(a, b); RO[y * rw + x] = mountN(a, b); }
  for (let ib = 0, i = 0; ib < GH; ib++){
    const ry = Math.min(rh - 1, Math.round(ib / RS));
    for (let ia = 0; ia < GW; ia++, i++){
      if (gBase[i] === T_SEA) continue;
      const ld = gLand[i];
      if (ld < 12){ gBase[i] = T_BEACH; continue; }
      const k = ry * rw + Math.min(rw - 1, Math.round(ia / RS));
      if (RO[k] > MOUNT_T && ld > 34) gBase[i] = T_ROCK;
      else if (FO[k] > .56 && ld > 18) gBase[i] = T_FOREST;
    }
  }
  for (let q = 0, qi = 0; q < GQH; q++) for (let p = 0; p < GQW; p++, qi++){
    const a = GA0 + (p * 4 + 2) / GSC, b = GB0 + (q * 4 + 2) / GSC;
    gVar[qi] = (vnoise(a * .04 + 1.3, b * .04 + 2.7) > .6 || vnoise(a * .21 + 9, b * .21 + 4) > .8) ? 1 : 0;
    gPh[qi] = Math.round(vnoise(a * .06, b * .06) * 60);
  }
  for (let ib = 0, i = 0; ib < GH; ib++) for (let ia = 0; ia < GW; ia++, i++){
    gType[i] = gBase[i];
    gTone[i] = (gBase[i] === T_SEA && gSea[i] > 10) ? 0 : baseTone(gBase[i], gLand[i], gSea[i], ia, ib);
  }
}
function baseTone(t, ld, sd, ia, ib){
  switch (t){
    case T_SEA: return (sd >= 1 && sd <= 10) ? 32 + sd : 0;
    case T_BEACH: if (ld <= 2) return 16; return Math.max(1, Math.round(4 - ld * .25));
    // roche : des taches claires accrochees au sol, pas de trame a l'ecran (elle faisait des carres en tournant et au dezoom)
    case T_ROCK: return (hash2(ia >> 2, ib >> 2) < .18 || hash2(ia, ib) < .16) ? 16 : 0;
    case T_FOREST: return hash2(ia * 3 + 1, ib * 5 + 2) < .05 ? 16 : (hash2(ia, ib + 7) < .5 ? 1 : 0);
    case T_DIRT: return hash2(ia + 5, ib) < .4 ? 2 : 0;
    default: return hash2((hash2(ia, ib) * 4294967296) | 0, (ia * 31) ^ ib) < 0.012 ? 16 : 0;
  }
}
// remet le sol d'une zone a son etat de base (avant de repeindre les routes)
function resetArea(ia0, ia1, ib0, ib1){
  for (let ib = ib0; ib <= ib1; ib++) for (let ia = ia0; ia <= ia1; ia++){
    const i = ib * GW + ia; gType[i] = gBase[i];
    gTone[i] = (gBase[i] === T_SEA && gSea[i] > 10) ? 0 : baseTone(gBase[i], gLand[i], gSea[i], ia, ib);
  }
}
// defricher : la foret redevient de l'herbe sous un batiment ou une route
function clearForest(a0, a1, b0, b1){
  const ia0 = Math.max(0, Math.floor((a0 - GA0) * GSC)), ia1 = Math.min(GW - 1, Math.ceil((a1 - GA0) * GSC));
  const ib0 = Math.max(0, Math.floor((b0 - GB0) * GSC)), ib1 = Math.min(GH - 1, Math.ceil((b1 - GB0) * GSC));
  let n = 0;
  for (let ib = ib0; ib <= ib1; ib++) for (let ia = ia0; ia <= ia1; ia++){ const i = ib * GW + ia; if (gBase[i] === T_FOREST){ gBase[i] = T_GRASS; n++; } }
  if (n) resetArea(ia0, ia1, ib0, ib1);
  return n;
}
// point de cote le plus proche d'un endroit, cote terre (pour les debarquements)
function nearestShore(a, b, maxR){
  let best = null, bd = 1e9;
  for (let r = 0; r <= (maxR || 80); r += 2) for (let k = 0; k < Math.max(1, r * 1.2); k++){
    const an = k / Math.max(1, r * 1.2) * TAU, pa = a + Math.cos(an) * r, pb = b + Math.sin(an) * r, i = cellOf(pa, pb);
    if (i < 0 || gBase[i] === T_SEA) continue;
    if (gLand[i] > 4) continue;
    const dd = Math.hypot(pa - a, pb - b); if (dd < bd){ bd = dd; best = [pa, pb]; }
    if (best && r > bd + 4) return best;
  }
  return best;
}
