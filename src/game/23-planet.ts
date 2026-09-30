import { SH } from './00-shared.ts';
import { GAME, GEO, H, N, PC, PS, RAYHIT, RP, SC, SQ3, TAU, TX, TY, W, cam, clamp, hash2, prj, px32, vnoise } from './01-core.ts';
import { GA0, GB0, GH, GSC, GW } from './02-ground.ts';
import { CLOCK, MAPV, mapUpdate } from './11-render.ts';
/* ================= la planete : on dezoome en continu de l'ile jusqu'au globe entier, l'espace derriere ================= */
// L'ile est un morceau de la surface d'une planete de rayon RP (en unites du monde) : a = longitude * RP, b = -latitude * RP.
// Le jeu se dessine toujours a plat ; de loin, planetWarp pose cette image sur une sphere dont le rayon GR descend en continu
// jusqu'a RP (voir curvOf et geoSet). Sur l'ile, on reprend l'image du jeu (ou la carte MAPV hors du tampon) ; ailleurs, une texture
// tiree au sort avec la graine de l'ile : ocean, autres continents, banquise, nuages. Puis le jour et la nuit, le halo, les etoiles.
/** une etoile : direction (x, y, z) fixe dans l'espace, eclat (0 a 1), taille en pixels (1 ou 2) */
export type Star = [number, number, number, number, number];
/** la texture de la planete (W x H, en longitude et latitude), ses nuages, ses etoiles ; tableaux vides tant que planetBuild n'a pas tourne */
export interface Planet { W: number; H: number; seed: number; tex: Uint32Array; cloud: Uint8Array; stars: Star[] }
export const PLANET: Planet = { W: 1024, H: 512, seed: -1, tex: new Uint32Array(0), cloud: new Uint8Array(0), stars: [] };
export function planetBuild(seed: number){
  PLANET.seed = seed;
  const w = PLANET.W, h = PLANET.H, tex = new Uint32Array(w * h), cloud = new Uint8Array(w * h);
  const ox = (seed % 997) * .37, oy = (seed % 613) * .53;
  const rgb = (r: number, g: number, b: number) => (255 << 24) | (b << 16) | (g << 8) | r;
  for (let j = 0; j < h; j++){
    const lat = (.5 - (j + .5) / h) * Math.PI, cl = Math.cos(lat);
    for (let i = 0; i < w; i++){
      const lon = ((i + .5) / w - .5) * TAU, cx = Math.cos(lon) * cl, sy = Math.sin(lon) * cl;
      // bruit continu sur la sphere : deux bruits plans colles l'un a l'autre, sans couture en longitude
      const n = vnoise(cx * 2.2 + ox, sy * 2.2 + lat * 1.3 + oy) * .55 + vnoise(sy * 4.4 + lat * 2 + oy, cx * 4.4 + ox) * .3 + vnoise(cx * 11 + lat * 3, sy * 11 + ox) * .15;
      // pas d'autre continent pres de notre ile : elle reste seule dans son ocean
      const d = Math.acos(clamp(cl * Math.cos(lon), -1, 1)), calm = Math.max(0, 1 - d / .95);
      const land = n - calm * .45;
      let c: number;
      const al = Math.abs(lat);
      if (al > 1.22 + (vnoise(lon * 3, 7) - .5) * .12) c = rgb(232, 238, 244);
      else if (land > .6){
        const m = vnoise(cx * 9 + 40, sy * 9 + lat * 5), dry = al < .45 && m > .55;
        c = land > .74 ? (land > .8 ? rgb(236, 238, 240) : rgb(128, 122, 114)) : dry ? rgb(205, 178, 118) : (m > .5 ? rgb(58, 112, 50) : rgb(96, 150, 70));
      } else if (land > .565) c = rgb(63, 169, 204);
      else {
        // pres de l'ile, exactement le bleu de la carte de l'ile ; plus loin, un ocean plus profond
        const near = clamp(1 - (d - .38) / .5, 0, 1), k = clamp(.4 + land, 0, 1) * (1 - near) + near;
        c = rgb(Math.round(14 + 15 * k), Math.round(52 + 40 * k), Math.round(98 + 52 * k));
      }
      tex[j * w + i] = c;
      const cn = vnoise(cx * 5 + 90 + oy, sy * 5 + lat * 4) * .65 + vnoise(cx * 16 + 20, sy * 16 + lat * 9 + ox) * .35;
      // moins de nuages au-dessus de l'ile, pour qu'on la voie depuis l'espace
      cloud[j * w + i] = Math.round(clamp((cn - .56) * 3.2, 0, .85) * (1 - clamp(1 - (d - .3) / .4, 0, 1) * .85) * 255);
    }
  }
  PLANET.tex = tex; PLANET.cloud = cloud;
  // etoiles : des directions fixes dans l'espace, elles defilent quand on tourne autour de la planete
  PLANET.stars = [];
  for (let k = 0; k < 900; k++){
    const z = hash2(k, seed) * 2 - 1, ph = hash2(k + 7, seed + 3) * TAU, r = Math.sqrt(1 - z * z);
    PLANET.stars.push([r * Math.cos(ph), r * Math.sin(ph), z, hash2(k + 11, 5), hash2(k, 99) < .07 ? 2 : 1]);
  }
}
// le tampon plat sert-il encore ? (sinon l'ile est hors de l'image : on a tourne loin autour de la planete)
export function planetFlatNeeded(){
  let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
  const A = [GA0 - 300, GA0 + GW / GSC + 300], B = [GB0 - 300, GB0 + GH / GSC + 300];
  for (const a of A) for (const b of B){ const q = prj(a, b, 0); if (q[0] < x0) x0 = q[0]; if (q[0] > x1) x1 = q[0]; if (q[1] < y0) y0 = q[1]; if (q[1] > y1) y1 = q[1]; }
  return x1 > 0 && x0 < W && y1 > 0 && y0 - 120 * SC < H;
}
// un point de la sphere vise depuis l'ecran : sol (a, b), eclairage du soleil (sun) et angle de vue (mu : 1 de face, 0 au bord)
export const GS = { a: 0, b: 0, sun: 0, mu: 0 }, SUNV = [1, 0, 0];
export function geoSample(u: number, v: number){
  const g = GEO, gr = g.gr; v += g.oy;
  const al = g.p * u * .5 + g.q * v, be = g.q * u * .5 - g.p * v;
  const cd = (-gr - al * g.q + be * g.p) / SQ3, ab = al * al + be * be, disc = cd * cd - ab;
  if (disc < 0){ RAYHIT.miss = Math.sqrt(Math.max(0, gr * gr + ab - cd * cd)) / gr - 1; return false; }
  const t = -cd - Math.sqrt(disc);
  const Px = (gr * g.ux + al * g.ex + be * g.nx + t * g.dx) / gr, Py = (gr * g.uy + al * g.ey + be * g.ny + t * g.dy) / gr, Pz = (gr * g.uz + be * g.nz + t * g.dz) / gr;
  let dl = Math.atan2(Py, Px) - g.lon0; dl -= Math.round(dl / TAU) * TAU;
  GS.a = cam.a + dl * gr; GS.b = -Math.asin(Pz < -1 ? -1 : Pz > 1 ? 1 : Pz) * gr;
  GS.sun = Px * SUNV[0] + Py * SUNV[1] + Pz * SUNV[2];
  const mu = -(Px * g.dx + Py * g.dy + Pz * g.dz); GS.mu = mu < 0 ? 0 : mu;
  return true;
}
/** tampons de planetWarp : copie de l'image plate (src, N pixels), valeurs aux coins des blocs (c, nb coins, une par nom de WC), temps de la derniere image (ms) */
export interface Warp { src: Uint32Array; n: number; nb: number; c: Record<string, Float64Array>; ms: number[] | null }
export const WARP: Warp = { src: new Uint32Array(0), n: 0, nb: 0, c: {}, ms: null };
export const WC = ['a', 'b', 's', 'm', 'miss', 'fx', 'fy', 'f', 'hz', 'bb', 'cl', 'ti', 'tj', 'z'];
// reglages de l'image en cours, lus par les petites fonctions ci-dessous (hors de la boucle chaude)
export const WF = { flat: true, wrap: false, curv: 0, shade: false, nn: 0, cc2: 0, tx: 0, ty: 0, sc: 1, pp: 1, qq: 1, w: 1, h: 1, tia: 0, tjb: 0, cdrift: 0, R: 0, G: 0, B: 0, f: 1, hz: 0, bb: 0, cl: 0 };
export const NEAR_R2 = 1000 * 1000, SPACE0 = 0xFF140905;
// l'image plate du jeu couvre-t-elle ce point ? (sur l'ile, ou dans la mer toute proche : au-dela, la texture de la planete a le meme bleu)
export function warpFlatAt(a: number, b: number){ return WF.flat && ((a >= GA0 && a < GA0 + GW / GSC && b >= GB0 && b < GB0 + GH / GSC) || a * a + b * b < NEAR_R2); }
export function warpNorm(a: number){ return WF.wrap ? a - Math.round(a / (TAU * RP)) * TAU * RP : a; }
// eclairage d'un point : facteur jour et nuit, voile bleu du bord, bleu de la nuit, nuages
export function warpLight(a: number, b: number, sun: number, mu: number){
  if (!WF.shade){ WF.f = 1; WF.hz = 0; WF.bb = 0; WF.cl = 0; return; }
  const curv = WF.curv, day = clamp(sun * 1.6 + .35, .16, 1), TW = PLANET.W, TH = PLANET.H;
  WF.f = 1 + (day * (.55 + .45 * mu) - 1) * curv; WF.hz = (1 - mu) * .45 * curv; WF.bb = (1 - day) * 18 * curv;
  let ci = Math.floor((warpNorm(a) + WF.cdrift) * WF.tia + TW * .5) % TW; if (ci < 0) ci += TW;
  let cj = Math.floor(TH * .5 + b * WF.tjb); if (cj < 0) cj = 0; else if (cj >= TH) cj = TH - 1;
  WF.cl = PLANET.cloud[cj * TW + ci] * WF.cc2 / 255;
}
// couleur de fond d'un point (image du jeu, carte de l'ile ou texture de la planete), avant l'eclairage
export function warpBase(a: number, b: number){
  let c = -1;
  if (warpFlatAt(a, b)){ const fx = WF.tx + WF.sc * (a * WF.pp - b * WF.qq), fy = WF.ty + WF.sc * .5 * (a * WF.qq + b * WF.pp); if (fx >= 0 && fy >= 0 && fx < WF.w && fy < WF.h) c = WARP.src[(fy | 0) * WF.w + (fx | 0)]; }
  let night = false;
  if (c === -1){
    const an = warpNorm(a);
    if (an >= GA0 && an < GA0 + GW / GSC && b >= GB0 && b < GB0 + GH / GSC){ const mx = Math.min(MAPV.W - 1, ((an - GA0) * .5) | 0), my = Math.min(MAPV.H - 1, ((b - GB0) * .5) | 0); c = MAPV.px[my * MAPV.W + mx]; }
    else {
      const TW = PLANET.W, TH = PLANET.H;
      let ti = Math.floor(an * WF.tia + TW * .5) % TW; if (ti < 0) ti += TW;
      let tj = Math.floor(TH * .5 + b * WF.tjb); if (tj < 0) tj = 0; else if (tj >= TH) tj = TH - 1;
      c = PLANET.tex[tj * TW + ti];
    }
    night = true;
  }
  let r = c & 255, g = (c >> 8) & 255, bl = (c >> 16) & 255;
  const nn = WF.nn; if (night && nn > 0){ r += (r * .24 + 2 - r) * nn; g += (g * .28 + 4 - g) * nn; bl += (bl * .4 + 12 - bl) * nn; }
  WF.R = r; WF.G = g; WF.B = bl;
}
export function warpPut(i: number){
  let r = WF.R, g = WF.G, bl = WF.B;
  if (WF.shade){
    const ca = WF.cl, f = WF.f, hz = WF.hz;
    if (ca > 0){ r += (248 - r) * ca; g += (250 - g) * ca; bl += (252 - bl) * ca; }
    r *= f; g *= f; bl = bl * f + WF.bb;
    if (hz > 0){ r += (120 - r) * hz * .5; g += (190 - g) * hz * .5; bl += (255 - bl) * hz * .6; }
  }
  px32[i] = (255 << 24) | ((bl > 255 ? 255 : bl < 0 ? 0 : bl | 0) << 16) | ((g > 255 ? 255 : g < 0 ? 0 : g | 0) << 8) | (r > 255 ? 255 : r < 0 ? 0 : r | 0);
}
export function warpSky(i: number, ms: number, rim: number){
  const e = ms / rim;
  if (e < 1){ const k = (1 - e) * (1 - e) * .85; px32[i] = (255 << 24) | (Math.round(20 + 235 * k) << 16) | (Math.round(9 + 191 * k) << 8) | Math.round(5 + 115 * k); }
  else px32[i] = SPACE0;
}
export function planetWarp(t: number, flat: boolean){
  const T0 = performance.now();
  if (PLANET.seed !== GAME.seed || !PLANET.tex.length) planetBuild(GAME.seed);
  mapUpdate();
  const w = W, h = H, PX = px32, BS = 4, bw = Math.ceil(w / BS) + 1, bh = Math.ceil(h / BS) + 1, nb = bw * bh;
  if (WARP.n !== N){ WARP.n = N; WARP.src = new Uint32Array(N); }
  if (WARP.nb !== nb){ WARP.nb = nb; WARP.c = {}; for (const k of WC) WARP.c[k] = new Float64Array(nb); }
  const SRC = WARP.src, C = WARP.c, CA = C.a, CB = C.b, CS = C.s, CM = C.m, CMS = C.miss, CX = C.fx, CY = C.fy, CF = C.f, CH = C.hz, CBB = C.bb, CCL = C.cl, CTI = C.ti, CTJ = C.tj, CZ = C.z;
  if (flat) SRC.set(PX);
  const g = GEO, cx = Math.floor(w / 2), cy = Math.floor(h / 2), isc = 1 / SC, ik = 1 / (g.k * SC), curv = SH.CURV;
  // soleil : midi sur l'ile a 12 h, un peu au nord ou au sud selon la saison
  const sLon = (12 - CLOCK.h) / 24 * TAU, sLat = .35 * Math.sin((SH.CAL.m - 2.5) / 12 * TAU);
  SUNV[0] = Math.cos(sLat) * Math.cos(sLon); SUNV[1] = Math.cos(sLat) * Math.sin(sLon); SUNV[2] = Math.sin(sLat);
  const TW = PLANET.W, TH = PLANET.H, TEX = PLANET.tex, P2 = TAU * RP;
  const shade = curv > .02, nn = SH.NIGHT * (1 - curv), Rpx = Math.SQRT2 * SC * g.gr, rim = Math.max(.035, 2.5 / Math.max(1, Rpx));
  Object.assign(WF, { flat, wrap: curv > .999, curv, shade, nn, cc2: curv * curv, tx: TX, ty: TY, sc: SC, pp: PC - PS, qq: PS + PC, w, h, tia: TW / P2, tjb: TH / (Math.PI * RP), cdrift: t * .004 * RP });
  // 1) les coins des blocs de 4 x 4 pixels. Zone 0 : tout dans l'image du jeu ; 1 : tout sur la texture de la planete ; 2 : le reste
  for (let j = 0, k = 0; j < bh; j++) for (let i = 0; i < bw; i++, k++){
    if (!geoSample((i * BS - cx) * isc, (j * BS - cy) * ik)){ CMS[k] = RAYHIT.miss; continue; }
    const a = GS.a, b = GS.b; CA[k] = a; CB[k] = b; CS[k] = GS.sun; CM[k] = GS.mu; CMS[k] = -1;
    warpLight(a, b, GS.sun, GS.mu); CF[k] = WF.f; CH[k] = WF.hz; CBB[k] = WF.bb; CCL[k] = WF.cl;
    const fx = WF.tx + WF.sc * (a * WF.pp - b * WF.qq), fy = WF.ty + WF.sc * .5 * (a * WF.qq + b * WF.pp); CX[k] = fx; CY[k] = fy;
    const an = warpNorm(a), fl = warpFlatAt(a, b);
    if (fl && fx >= 0 && fy >= 0 && fx < w - 1 && fy < h - 1) CZ[k] = 0;
    else if (!fl && !(an > GA0 - 8 && an < GA0 + GW / GSC + 8 && b > GB0 - 8 && b < GB0 + GH / GSC + 8) && (!flat || a * a + b * b > NEAR_R2 * 1.02)){ CZ[k] = 1; let ti = (an * WF.tia + TW * .5) % TW; if (ti < 0) ti += TW; CTI[k] = ti; CTJ[k] = TH * .5 + b * WF.tjb; }
    else CZ[k] = 2;
  }
  const T1 = performance.now();
  // 2) chaque bloc
  let nFast = 0, nGen = 0, nMix = 0;
  const inv = 1 / BS;
  for (let bj = 0; bj < bh - 1; bj++){
    const y0 = bj * BS, y1 = Math.min(h, y0 + BS);
    for (let bi = 0; bi < bw - 1; bi++){
      const x0 = bi * BS, x1 = Math.min(w, x0 + BS), k00 = bj * bw + bi, k10 = k00 + 1, k01 = k00 + bw, k11 = k01 + 1;
      const m00 = CMS[k00], m10 = CMS[k10], m01 = CMS[k01], m11 = CMS[k11];
      if (m00 > .08 && m10 > .08 && m01 > .08 && m11 > .08){
        for (let y = y0; y < y1; y++){ const r0 = y * w; PX.fill(SPACE0, r0 + x0, r0 + x1); }
        continue;
      }
      if (m00 >= 0 && m10 >= 0 && m01 >= 0 && m11 >= 0){
        // tout dans l'espace, pres du bord : le halo varie doucement, on l'interpole
        for (let y = y0; y < y1; y++){
          const fy = (y - y0) * inv, gy = 1 - fy, e0 = m00 * gy + m01 * fy, de = (m10 * gy + m11 * fy - e0) * inv;
          for (let x = x0, i = y * w + x0, e = e0; x < x1; x++, i++, e += de) warpSky(i, e, rim);
        }
        continue;
      }
      const allHit = m00 < 0 && m10 < 0 && m01 < 0 && m11 < 0;
      const z = allHit ? CZ[k00] : 2;
      let fast = allHit && z < 2 && CZ[k10] === z && CZ[k01] === z && CZ[k11] === z;
      if (fast && z === 1){ const t0 = CTI[k00]; if (Math.abs(CTI[k10] - t0) > 16 || Math.abs(CTI[k01] - t0) > 16 || Math.abs(CTI[k11] - t0) > 16) fast = false; }
      if (fast){
        nFast++;
        const F00 = CF[k00], F10 = CF[k10], F01 = CF[k01], F11 = CF[k11], H00 = CH[k00], H10 = CH[k10], H01 = CH[k01], H11 = CH[k11];
        const Q00 = CBB[k00], Q10 = CBB[k10], Q01 = CBB[k01], Q11 = CBB[k11], L00 = CCL[k00], L10 = CCL[k10], L01 = CCL[k01], L11 = CCL[k11];
        const UA = z === 0 ? CX : CTI, VA = z === 0 ? CY : CTJ, U00 = UA[k00], U10 = UA[k10], U01 = UA[k01], U11 = UA[k11], V00 = VA[k00], V10 = VA[k10], V01 = VA[k01], V11 = VA[k11];
        for (let y = y0; y < y1; y++){
          const fy = (y - y0) * inv, gy = 1 - fy;
          const f0 = F00 * gy + F01 * fy, df = (F10 * gy + F11 * fy - f0) * inv, h0 = H00 * gy + H01 * fy, dh = (H10 * gy + H11 * fy - h0) * inv;
          const q0 = Q00 * gy + Q01 * fy, dq = (Q10 * gy + Q11 * fy - q0) * inv, l0 = L00 * gy + L01 * fy, dl = (L10 * gy + L11 * fy - l0) * inv;
          const u0 = U00 * gy + U01 * fy, du = (U10 * gy + U11 * fy - u0) * inv, v0 = V00 * gy + V01 * fy, dv = (V10 * gy + V11 * fy - v0) * inv;
          let f = f0, hz = h0, bb = q0, ca = l0, u = u0, v = v0;
          for (let x = x0, i = y * w + x0; x < x1; x++, i++, f += df, hz += dh, bb += dq, ca += dl, u += du, v += dv){
            let c: number;
            if (z === 0){ c = SRC[(v | 0) * w + (u | 0)]; if (!shade){ PX[i] = c; continue; } }
            else {
              let ti = u | 0; if (ti >= TW) ti -= TW; else if (ti < 0) ti += TW;
              let tj = v | 0; if (tj < 0) tj = 0; else if (tj >= TH) tj = TH - 1;
              c = TEX[tj * TW + ti];
            }
            let r = c & 255, gg = (c >> 8) & 255, bl = (c >> 16) & 255;
            if (z === 1 && nn > 0){ r += (r * .24 + 2 - r) * nn; gg += (gg * .28 + 4 - gg) * nn; bl += (bl * .4 + 12 - bl) * nn; }
            if (shade){
              if (ca > 0){ r += (248 - r) * ca; gg += (250 - gg) * ca; bl += (252 - bl) * ca; }
              r *= f; gg *= f; bl = bl * f + bb;
              if (hz > 0){ r += (120 - r) * hz * .5; gg += (190 - gg) * hz * .5; bl += (255 - bl) * hz * .6; }
            }
            PX[i] = (255 << 24) | ((bl > 255 ? 255 : bl < 0 ? 0 : bl | 0) << 16) | ((gg > 255 ? 255 : gg < 0 ? 0 : gg | 0) << 8) | (r > 255 ? 255 : r < 0 ? 0 : r | 0);
          }
        }
        continue;
      }
      // chemin general : point par point (interpole si le bloc est entierement sur la planete, exact sinon)
      if (allHit) nGen++; else nMix++;
      for (let y = y0; y < y1; y++){
        const fy = (y - y0) * inv, gy = 1 - fy;
        for (let x = x0, i = y * w + x0; x < x1; x++, i++){
          if (allHit){
            // la lumiere varie doucement : on l'interpole aussi
            const fx = (x - x0) * inv, gx = 1 - fx, w00 = gx * gy, w10 = fx * gy, w01 = gx * fy, w11 = fx * fy;
            warpBase(CA[k00] * w00 + CA[k10] * w10 + CA[k01] * w01 + CA[k11] * w11, CB[k00] * w00 + CB[k10] * w10 + CB[k01] * w01 + CB[k11] * w11);
            WF.f = CF[k00] * w00 + CF[k10] * w10 + CF[k01] * w01 + CF[k11] * w11; WF.hz = CH[k00] * w00 + CH[k10] * w10 + CH[k01] * w01 + CH[k11] * w11;
            WF.bb = CBB[k00] * w00 + CBB[k10] * w10 + CBB[k01] * w01 + CBB[k11] * w11; WF.cl = CCL[k00] * w00 + CCL[k10] * w10 + CCL[k01] * w01 + CCL[k11] * w11;
          } else {
            if (!geoSample((x + .5 - cx) * isc, (y + .5 - cy) * ik)){ warpSky(i, RAYHIT.miss, rim); continue; }
            warpBase(GS.a, GS.b); warpLight(GS.a, GS.b, GS.sun, GS.mu);
          }
          warpPut(i);
        }
      }
    }
  }
  const T2 = performance.now();
  // 3) les etoiles, fixes dans l'espace : elles defilent quand on tourne autour de la planete
  const s2 = Math.SQRT1_2, s15 = 1 / Math.sqrt(1.5);
  const Xx = (g.p * g.ex + g.q * g.nx) * s2, Xy = (g.p * g.ey + g.q * g.ny) * s2, Xz = g.q * g.nz * s2;
  const Yx = (g.q * .5 * g.ex - g.p * .5 * g.nx - g.ux) * s15, Yy = (g.q * .5 * g.ey - g.p * .5 * g.ny - g.uy) * s15, Yz = (-g.p * .5 * g.nz - g.uz) * s15;
  const half = Math.max(w, h) * .9;
  for (const [sx, sy, sz, br, size] of PLANET.stars){
    if (sx * g.dx + sy * g.dy + sz * g.dz <= 0) continue;
    const x = Math.round(cx + (sx * Xx + sy * Xy + sz * Xz) * half), y = Math.round(cy + (sx * Yx + sy * Yy + sz * Yz) * half);
    if (x < 0 || y < 0 || x >= w - 1 || y >= h - 1) continue;
    const i = y * w + x; if (PX[i] !== SPACE0) continue;
    const v = Math.round(120 + 135 * br * (.7 + .3 * Math.sin(t * (1 + br * 3) + sx * 50))), col = (255 << 24) | (v << 16) | (v << 8) | Math.round(v * .92);
    PX[i] = col; if (size > 1){ if (PX[i + 1] === SPACE0) PX[i + 1] = col; if (PX[i + w] === SPACE0) PX[i + w] = col; }
  }
  const T3 = performance.now();
  SH.presentImage();
  WARP.ms = [T1 - T0, T2 - T1, T3 - T2, performance.now() - T3, nFast, nGen, nMix];
}

// appeles depuis des modules plus petits en numero
Object.assign(SH, { planetFlatNeeded, WARP, planetWarp });
