import { SH } from './00-shared.ts';
/* ================= bases ================= */
export const BAYER = new Uint8Array([0,8,2,10, 12,4,14,6, 3,11,1,9, 15,7,13,5]);
export const TAU = Math.PI * 2;
export const WHITE = 0xFFFFFFFF, BLACK = 0xFF000000;
export const PAT_NAMES = { dots:'Points', stripes:'Rayures', noise:'Bruit', diamond:'Losanges' };
export const reduceMotion = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
export const COLOR = true;
// matieres : chaque pixel garde une matiere, la version couleur en tire deux teintes (sombre, claire)
export const M = { SEA:0, GRASS:1, BEACH:2, ROAD:3, WALK:4, STRIP:5, ROCK:6, PIER:7, BEAM:8, GLOW:9, USC:10, CCP:11, ROOF_USC:12, ROOF_CCP:13,
  WIN:14, SIGN:15, SIGN_CCP:16, WALL:17, CAT:18, CAT_OR:19, TREE:20, METAL:21, CAR_USC:22, CAR_CCP:23, FLAG_RED:24, FLAG_BLUE:25,
  FLAG_CCP:26, FOAM:27, LAMP:28, STATUE:29, SMOKE:30, NEUTRAL:31, WATER:32, TENT:33, ROCKET:34, CAT_SIAM:35, SCREEN:36, CAT_GRAY:37, CAT_BLACK:38, REDLIGHT:39,
  USC2:40, USC3:41, USC4:42, USC5:43, CCP2:44, CCP3:45, BRICK:46, SANDSTONE:47, SEA_MID:48, SEA_SHALLOW:49, ROOF_USC2:50, ROOF_USC3:51, GRAVEL:52, CHROME:53,
  MILITARY:54, WHEAT:55, DOME_A:56, DOME_B:57, DOME_C:58, CONCRETE:59, KVAS:60, FIELD:61, DIRT:62,
  RAIL:63, RAIN:64, SNOW:65, GIRDER:66, TRAIN_CCP:67, FW_BLUE:68, FW_GREEN:69, BUBBLE:70, ICON_R:71, ICON_Y:72, REFLECT:73, HULL:74,
  FOREST:75, WOOL:76, FISH:77 };
// crochets : chaque module ajoute ses fonctions (pas de jeu, dessins dynamiques, dessus de l'image, retouche finale, apres rendu)
export const HOOKS = { step: [], dyn: [], top: [], post: [], after: [], town: [], map: [] };
// couleur d'accent : un shader peut rendre 4 (accent clair) ou 5 (accent sombre)
SH.ACC = 24;
// version couleur : niveau d'eclairage par pixel (0 plein soleil ... 3 face a l'ombre, 4 ombre portee au sol)
SH.LV = 0; SH.DAY = true; SH.CAPTURE = null;
export const SUN = (() => { const v = [-0.45, 0.6, 0.78], l = Math.hypot(v[0], v[1], v[2]); return v.map(x => x / l); })();
export const SHADOW_V = [-SUN[0] / SUN[2], -SUN[1] / SUN[2]];
export const ROOF_OF = [];
SH.CUR = 0; SH.CUR_SIDE = 'usc';
export const DASHES = new RegExp('[' + String.fromCharCode(0x2014, 0x2013) + ']', 'g');

export function hash2(x, y){
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
export function vnoise(x, y){
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf*xf*(3-2*xf), v = yf*yf*(3-2*yf);
  const a = hash2(xi, yi), b = hash2(xi+1, yi), c = hash2(xi, yi+1), d = hash2(xi+1, yi+1);
  return a + (b-a)*u + (c-a)*v + (a-b-c+d)*u*v;
}
export const bay = (x, y) => BAYER[((y & 3) << 2) | (x & 3)];
export const clamp = (v, a, b) => v < a ? a : v > b ? b : v;

export function litAt(x, y, mode, I){
  switch (mode){
    case 'dots':    return bay(x, y) < I * 16;
    case 'stripes': return ((x + y) & 3) < I * 4;
    case 'noise':   return hash2(x * 7 + 1013, y * 13 + 7) < I;
    case 'diamond': {
      let dx = x & 3, dy = y & 3;
      if (dx > 2) dx -= 4; if (dy > 2) dy -= 4;
      return Math.abs(dx) + Math.abs(dy) < I * 4;
    }
  }
  return false;
}

/* ================= etat ================= */
export const state = {
  pattern: 'dots', intensity: 0.40, auto: true, period: reduceMotion ? 32 : 16,
  theta: -1.9, patternView: false, spread: 0, inspOn: false, uiHidden: false,
  mode: 'walk', buildType: 'maison', chatCat: null
};

/* ================= camera : rotation libre, zoom par paliers entiers ================= */
// (a, b) : axes de la ville au sol, z : hauteur. La camera tourne autour de (cam.a, cam.b).
/** @type {{ a: number, b: number, phi: number, phiT: number | null, target: [number, number] | null, follow?: any }} */
export const cam = { a: 40, b: -20, phi: 0, phiT: null, target: null };
// la vue (projection, taille et tampons de l'image) : variables du module, lues partout par import ;
// un autre module la change par setView (et la garde par getView pour la remettre ensuite)
export let PC = 1, PS = 0, TX = 0, TY = 0;
export let W = 0, H = 0, N = 0;
SH.K = 2; SH.DPR = 1; SH.KDEF = 2; SH.KMIN = 1; SH.KMAX = 8;
export let fb = null, mb = null, lb = null, img = null, px32 = null;
SH.ctx = null;
SH.GHOST = false; SH.GHOST_T = 0;

// SC : echelle du monde dans le tampon (1 de pres ; plus petit dans la vue de loin, ou tout est dessine en petit)
export let PROJ_FIX = null, SC = 1;
SH.NOW_T = 0;
export function getView(){ return { PC, PS, TX, TY, SC, W, H, N, fb, mb, lb, PROJ_FIX, img, px32 }; }
export function setView(v){
  if ('PC' in v) PC = v.PC; if ('PS' in v) PS = v.PS; if ('TX' in v) TX = v.TX; if ('TY' in v) TY = v.TY; if ('SC' in v) SC = v.SC;
  if ('W' in v) W = v.W; if ('H' in v) H = v.H; if ('N' in v) N = v.N; if ('fb' in v) fb = v.fb; if ('mb' in v) mb = v.mb; if ('lb' in v) lb = v.lb;
  if ('PROJ_FIX' in v) PROJ_FIX = v.PROJ_FIX; if ('img' in v) img = v.img; if ('px32' in v) px32 = v.px32;
}
// partie : 'menu' (accueil), 'landing' (choix de la plage), 'play', 'over'. side : le camp du joueur, rival : l'IA en face
/** @typedef {import('./00-shared.ts').Side} Side */
/** @type {{ mode: string, side: Side, rival: Side, speed: number, paused: boolean, t: number, seed: number, winner: Side | null, size: string, conf: string, slot?: string, name?: string, landing?: [number, number] | null, rivalLanding?: [number, number] | null }} */
export const GAME = { mode: 'menu', side: 'usc', rival: 'ccp', speed: 1, paused: false, t: 0, seed: 1, winner: null, size: 'moyenne', conf: 'une' };
/** @type {Side[]} */
export const SIDES = ['usc', 'ccp'];
/** @type {(s: Side) => Side} */
export const other = (s) => s === 'usc' ? 'ccp' : 'usc';
/** @type {Record<Side, string>} */
export const CAMP_FULL = { usc: 'United Sands of Cats', ccp: 'Cats Communist Republic' };
export const CAMP_SHORT = { usc: 'USC', ccp: 'CCR' };
// Vue de loin courbee : tout au bout du dezoom, le monde est pose sur une sphere de rayon GR (immense juste sous la vue rapprochee,
// le rayon de la planete RP tout au bout). CURV va de 0 (plat) a 1 (la planete entiere). Le jeu se dessine toujours a plat (prj, unprj) ;
// une derniere passe (planetWarp, 23-planet.js) pose l'image sur la sphere. geoCast et geoProj font le lien entre l'ecran et la sphere.
// GLOBE_ON : le globe est garde pour le futur mode espace (voir docs/PLAN.md), mais eteint pour l'instant : le jeu reste a plat.
export const GLOBE_ON = false;
export const RP = 2600, SQ3 = Math.sqrt(3);
SH.CURV = 0; SH.GR = Infinity;
// oy : de combien (en unites du monde) le point vise remonte a l'ecran, pour que la planete finisse centree
export const GEO = { on: false, gr: 1, lon0: 0, ex: 0, ey: 0, nx: 0, ny: 0, nz: 0, ux: 0, uy: 0, uz: 0, p: 1, q: 1, k: 1, oy: 0, dx: 0, dy: 0, dz: 0 };
export function geoSet(c, w){
  const g = GEO;
  g.on = c > 0; if (!g.on) return;
  const gr = RP / c, lon0 = cam.a / gr, lat0 = -cam.b / gr, so = Math.sin(lon0), co = Math.cos(lon0), sa = Math.sin(lat0), ca = Math.cos(lat0);
  g.gr = gr; g.lon0 = lon0;
  g.ex = -so; g.ey = co;
  g.nx = -sa * co; g.ny = -sa * so; g.nz = ca;
  g.ux = ca * co; g.uy = ca * so; g.uz = sa;
  g.p = Math.cos(cam.phi) - Math.sin(cam.phi); g.q = Math.sin(cam.phi) + Math.cos(cam.phi);
  // de loin, la hauteur de l'ecran s'allonge un peu : la projection du jeu tasse la verticale, la planete doit rester ronde
  g.k = 1 + c * .1547;
  g.oy = (w || 0) * gr;
  // direction du regard (vers le sol) : -q e + p n - u, normalisee
  g.dx = (-g.q * g.ex + g.p * g.nx - g.ux) / SQ3; g.dy = (-g.q * g.ey + g.p * g.ny - g.uy) / SQ3; g.dz = (g.p * g.nz - g.uz) / SQ3;
}
// point de l'ecran (u, v : ecart au centre en unites du monde, v deja divise par k) vers le sol de la sphere : [a, b], ou null si on vise l'espace
// (RAYHIT.miss : distance au bord de la planete, en rayons, pour le halo)
export const RAYHIT = { miss: 0 };
export function geoCast(u, v){
  const g = GEO, gr = g.gr; v += g.oy;
  const al = g.p * u * .5 + g.q * v, be = g.q * u * .5 - g.p * v;
  const cd = (-gr - al * g.q + be * g.p) / SQ3, ab = al * al + be * be, disc = cd * cd - ab;
  if (disc < 0){ RAYHIT.miss = Math.sqrt(Math.max(0, gr * gr + ab - cd * cd)) / gr - 1; return null; }
  const t = -cd - Math.sqrt(disc);
  const Px = gr * g.ux + al * g.ex + be * g.nx + t * g.dx, Py = gr * g.uy + al * g.ey + be * g.ny + t * g.dy, Pz = gr * g.uz + be * g.nz + t * g.dz;
  let dl = Math.atan2(Py, Px) - g.lon0; dl -= Math.round(dl / TAU) * TAU;
  return [cam.a + dl * gr, -Math.asin(clamp(Pz / gr, -1, 1)) * gr];
}
// et l'inverse : [u, v] (meme echelle), ou null si le point est sur la face cachee
export function geoProj(a, b, z){
  const g = GEO, gr = g.gr, lon = a / gr, lat = -b / gr, cl = Math.cos(lat), r = gr + (z || 0);
  const Px = r * cl * Math.cos(lon), Py = r * cl * Math.sin(lon), Pz = r * Math.sin(lat);
  if (Px * g.dx + Py * g.dy + Pz * g.dz >= 0) return null;
  const Dx = Px - gr * g.ux, Dy = Py - gr * g.uy, Dz = Pz - gr * g.uz;
  const de = Dx * g.ex + Dy * g.ey, dn = Dx * g.nx + Dy * g.ny + Dz * g.nz, du = Dx * g.ux + Dy * g.uy + Dz * g.uz;
  return [g.p * de + g.q * dn, g.q * .5 * de - g.p * .5 * dn - du - g.oy];
}
export function setProj(){
  PC = Math.cos(cam.phi); PS = Math.sin(cam.phi);
  if (PROJ_FIX){ TX = PROJ_FIX[0]; TY = PROJ_FIX[1]; return; }
  const car = cam.a * PC - cam.b * PS, cbr = cam.a * PS + cam.b * PC;
  TX = Math.round(Math.floor(W / 2) - (car - cbr) * SC);
  TY = Math.round(Math.floor(H / 2) - (car + cbr) * .5 * SC);
  geoSet(SH.CURV, SH.CURV > 0 ? SH.centerOf(SH.Z) : 0);
}
export function prj(a, b, z){ const ar = a * PC - b * PS, br = a * PS + b * PC; return [TX + (ar - br) * SC, TY + ((ar + br) * .5 - (z || 0)) * SC]; }
export const dep = (a, b) => a * (PC + PS) + b * (PC - PS);
export function unprj(x, y){
  const X = (x - TX) / SC, Y = (y - TY) / SC, ar = (X + 2 * Y) * .5, br = (2 * Y - X) * .5; return [ar * PC + br * PS, -ar * PS + br * PC];
}
export function groundDelta(dx, dy){ const ar = (dx + 2 * dy) * .5, br = (2 * dy - dx) * .5; return [ar * PC + br * PS, -ar * PS + br * PC]; }
// motif ancre sur l'origine du monde : il ne glisse pas quand on se deplace
export const bz = (x, y) => BAYER[(((y - TY) & 3) << 2) | ((x - TX) & 3)];

/* ================= primitives de dessin ================= */
// (dans les boucles de pixels, on lit SH une fois dans des variables locales : c'est nettement plus rapide)
export function fput(x, y, c){
  const w = W;
  if (SH.CAPTURE || x < 0 || y < 0 || x >= w || y >= H) return;
  const i = y * w + x;
  if (COLOR) lb[i] = SH.LV;
  if (SH.GHOST){ if (c >= 1 && ((x + y + SH.GHOST_T) & 1)){ fb[i] = 1; mb[i] = M.BEAM; } return; }
  if (c === 3){ fb[i] = 1; mb[i] = M.WIN; } else if (c >= 4){ fb[i] = c === 4 ? 1 : 0; mb[i] = SH.ACC; } else { fb[i] = c; mb[i] = SH.CUR; }
}
export function lineS(x0, y0, x1, y1, c, dash){
  x0 = Math.floor(x0); y0 = Math.floor(y0); x1 = Math.floor(x1); y1 = Math.floor(y1);
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx + dy, k = 0;
  for (;;){
    if (!dash) fput(x0, y0, c);
    else if (!SH.CAPTURE && ((k + SH.GHOST_T) >> 1) & 1){ if (x0 >= 0 && y0 >= 0 && x0 < W && y0 < H){ fb[y0 * W + x0] = 1; mb[y0 * W + x0] = M.BEAM; if (COLOR) lb[y0 * W + x0] = 0; } }
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy){ err += dy; x0 += sx; }
    if (e2 <= dx){ err += dx; y0 += sy; }
    k++;
  }
}
export function line3(a0, b0, z0, a1, b1, z1, c){ const p = prj(a0, b0, z0), q = prj(a1, b1, z1); lineS(p[0], p[1], q[0], q[1], c, SH.GHOST); }

// remplissage d'un polygone convexe, centres de pixels
export function fillConvex(xs, ys, n, shade){
  let y0 = 1e9, y1 = -1e9;
  for (let i = 0; i < n; i++){ if (ys[i] < y0) y0 = ys[i]; if (ys[i] > y1) y1 = ys[i]; }
  const ya = Math.max(0, Math.ceil(y0 - .5)), yb = Math.min(H - 1, Math.floor(y1 - .5));
  for (let y = ya; y <= yb; y++){
    const yc = y + .5; let xl = 1e9, xr = -1e9;
    for (let i = 0, j = n - 1; i < n; j = i++){
      const yi = ys[i], yj = ys[j];
      if ((yi <= yc && yj > yc) || (yj <= yc && yi > yc)){
        const x = xs[i] + (yc - yi) * (xs[j] - xs[i]) / (yj - yi);
        if (x < xl) xl = x; if (x > xr) xr = x;
      }
    }
    if (xl > xr) continue;
    const xa = Math.max(0, Math.ceil(xl - .5)), xb = Math.min(W - 1, Math.floor(xr - .5));
    const row = y * W, FB = fb, MB = mb, LB = lb;
    for (let x = xa; x <= xb; x++){ const v = shade(x, y); if (v >= 0){ if (COLOR) LB[row + x] = SH.LV; if (v === 3){ FB[row + x] = 1; MB[row + x] = M.WIN; } else if (v >= 4){ FB[row + x] = v === 4 ? 1 : 0; MB[row + x] = SH.ACC; } else { FB[row + x] = v; MB[row + x] = SH.CUR; } } }
  }
}
export const FX = new Float64Array(16), FY = new Float64Array(16);
export const UP = [0, 0, 1];
export const MOON = (() => { const v = [-0.35, 0.62, 0.70], l = Math.hypot(v[0], v[1], v[2]); return v.map(x => x / l); })();
export const CONST_SH = [0, 1, 2, 3, 4, 5].map(v => () => v);
export function faceVisible(n){ return (n[0] * PC - n[1] * PS) + (n[0] * PS + n[1] * PC) + n[2] > 1e-4; }
export function moonDot(n){ const l = Math.hypot(n[0], n[1], n[2]) || 1; return (n[0] * MOON[0] + n[1] * MOON[1] + n[2] * MOON[2]) / l; }
export function shOf(s){ return typeof s === 'number' ? CONST_SH[s] : s; }
// pts : [a,b,z, a,b,z, ...], n : normale sortante, sh : 0, 1, fonction(x, y) ou null, edge : couleur du contour ou -1
export function sunLevel(n){ const l = Math.hypot(n[0], n[1], n[2]) || 1, d = (n[0] * SUN[0] + n[1] * SUN[1] + n[2] * SUN[2]) / l; return d > .55 ? 0 : d > .3 ? 1 : d > .05 ? 2 : 3; }
export function drawFace(pts, n, sh, edge){
  if (SH.CAPTURE){ for (let i = 0; i < pts.length; i += 3) SH.CAPTURE.push(pts[i], pts[i + 1], pts[i + 2]); return false; }
  if (!faceVisible(n)) return false;
  if (COLOR) SH.LV = sunLevel(n);
  const k = pts.length / 3;
  for (let i = 0; i < k; i++){ const a = pts[i*3], b = pts[i*3+1], z = pts[i*3+2]; const ar = a * PC - b * PS, br = a * PS + b * PC; FX[i] = TX + (ar - br) * SC; FY[i] = TY + ((ar + br) * .5 - z) * SC; }
  if (SH.GHOST){ for (let i = 0, j = k - 1; i < k; j = i++) lineS(FX[j], FY[j], FX[i], FY[i], 1, true); return true; }
  if (sh !== null && sh !== undefined) fillConvex(FX, FY, k, shOf(sh));
  if (edge >= 0) for (let i = 0, j = k - 1; i < k; j = i++) lineS(FX[j], FY[j], FX[i], FY[i], edge);
  SH.LV = 0;
  return true;
}
// mur de p vers q (normale sortante a droite), fn(u, h, x, y) : u le long du mur, h hauteur au-dessus de z0
export function wallFace(pa, pb, qa, qb, z0, z1, fn, edge, zPeak){
  const L = Math.hypot(qa - pa, qb - pb) || 1, ea = (qa - pa) / L, eb = (qb - pb) / L;
  const n = [-eb, ea, 0];
  if (!SH.CAPTURE && !faceVisible(n)) return false;
  const pts = zPeak == null ? [pa,pb,z0, qa,qb,z0, qa,qb,z1, pa,pb,z1] : [pa,pb,z0, qa,qb,z0, qa,qb,z1, (pa+qa)/2,(pb+qb)/2,zPeak, pa,pb,z1];
  let sh = fn;
  if (typeof fn === 'function'){
    const era = ea * PC - eb * PS, erb = ea * PS + eb * PC, sxu = era - erb, syu = (era + erb) * .5;
    const P = prj(pa, pb, z0), px = P[0], py = P[1];
    const inv = Math.abs(sxu) > 1e-3 ? 1 / sxu : 0;
    sh = (x, y) => { const u = (x + .5 - px) * inv; return fn(u, py + u * syu - (y + .5), x, y); };
  }
  return drawFace(pts, n, sh, edge == null ? 1 : edge);
}
// boite alignee : side(u, h, x, y, k) avec k = 0 (+b), 1 (+a), 2 (-b), 3 (-a)
export function boxS(a0, a1, b0, b1, z0, z1, side, top, edge){
  const e = edge == null ? 1 : edge;
  const Wl = [a0,b1,a1,b1, a1,b1,a1,b0, a1,b0,a0,b0, a0,b0,a0,b1];
  for (let k = 0; k < 4; k++){
    const f = typeof side === 'function' ? ((kk) => (u, h, x, y) => side(u, h, x, y, kk))(k) : side;
    wallFace(Wl[k*4], Wl[k*4+1], Wl[k*4+2], Wl[k*4+3], z0, z1, f, e);
  }
  if (top !== null && top !== undefined) drawFace([a0,b0,z1, a1,b0,z1, a1,b1,z1, a0,b1,z1], UP, top, e);
}
// ton de lune pour une face, motif de Bayer ancre
export function moonSh(n, lo, hi){ const t = lo + (hi - lo) * Math.max(0, moonDot(n)); return (x, y) => bz(x, y) < t ? 1 : 0; }
// toit a deux pentes, faitage le long de a (axis 'a') ou de b
export function gableRoof(a0, a1, b0, b1, hh, rh, axis, lo, hi, ov){
  const savedM = SH.CUR; SH.CUR = ROOF_OF[savedM] != null ? ROOF_OF[savedM] : savedM;
  gableRoof2(a0, a1, b0, b1, hh, rh, axis, lo, hi, ov);
  SH.CUR = savedM;
}
export function gableRoof2(a0, a1, b0, b1, hh, rh, axis, lo, hi, ov){
  ov = ov == null ? 1 : ov;
  if (axis === 'a'){
    const bm = (b0 + b1) / 2, hb = (b1 - b0) / 2, zd = hh - ov * rh / hb;
    const nP = [0, rh, hb], nM = [0, -rh, hb];
    const rp = prj(a0 - ov, bm, hh + rh), rq = prj(a1 + ov, bm, hh + rh);
    const sP = roofSh(nP, rp, rq, lo, hi), sM = roofSh(nM, rp, rq, lo, hi);
    drawFace([a0-ov,b1+ov,zd, a1+ov,b1+ov,zd, a1+ov,bm,hh+rh, a0-ov,bm,hh+rh], nP, sP, 1);
    drawFace([a1+ov,b0-ov,zd, a0-ov,b0-ov,zd, a0-ov,bm,hh+rh, a1+ov,bm,hh+rh], nM, sM, 1);
  } else {
    const am = (a0 + a1) / 2, ha = (a1 - a0) / 2, zd = hh - ov * rh / ha;
    const nP = [rh, 0, ha], nM = [-rh, 0, ha];
    const rp = prj(am, b0 - ov, hh + rh), rq = prj(am, b1 + ov, hh + rh);
    const sP = roofSh(nP, rp, rq, lo, hi), sM = roofSh(nM, rp, rq, lo, hi);
    drawFace([a1+ov,b1+ov,zd, a1+ov,b0-ov,zd, am,b0-ov,hh+rh, am,b1+ov,hh+rh], nP, sP, 1);
    drawFace([a0-ov,b0-ov,zd, a0-ov,b1+ov,zd, am,b1+ov,hh+rh, am,b0-ov,hh+rh], nM, sM, 1);
  }
}
export function roofSh(n, rp, rq, lo, hi){
  const t = lo + (hi - lo) * Math.max(0, moonDot(n));
  let dx = rq[0] - rp[0], dy = rq[1] - rp[1]; const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
  if (COLOR) return (x, y) => (Math.floor(Math.abs((x + .5 - rp[0]) * -dy + (y + .5 - rp[1]) * dx)) % 3) === 2 ? 1 : 0;
  return (x, y) => {
    const d = Math.abs((x + .5 - rp[0]) * -dy + (y + .5 - rp[1]) * dx);
    if ((Math.floor(d) % 3) === 2) return t > 4 ? 0 : (bz(x, y) < 2 ? 1 : 0);
    return bz(x, y) < t ? 1 : 0;
  };
}
// murs d'une maison a pignon (murs pentagonaux du cote du pignon)
export function gableWalls(a0, a1, b0, b1, hh, rh, axis, fn){
  const zp = hh + rh;
  const Wl = [a0,b1,a1,b1, a1,b1,a1,b0, a1,b0,a0,b0, a0,b0,a0,b1];
  for (let k = 0; k < 4; k++){
    const peak = axis === 'a' ? (k === 1 || k === 3) : (k === 0 || k === 2);
    const f = typeof fn === 'function' ? ((kk) => (u, h, x, y) => fn(u, h, x, y, kk))(k) : fn;
    wallFace(Wl[k*4], Wl[k*4+1], Wl[k*4+2], Wl[k*4+3], 0, hh, f, 1, peak ? zp : null);
  }
}
// fenetres
export const win = (u, h, u0, h0, w, hh) => (u >= u0 && u < u0 + w && h >= h0 && h < h0 + hh) ? ((u >= u0 + .5 && u < u0 + w - .5 && h >= h0 + .5 && h < h0 + hh - .5) ? 'in' : 'frame') : null;
export const winColor = (k, lit, x, y) => (COLOR && SH.DAY) ? (k === 'in' ? 3 : 1) : k === 'in' ? (lit ? 3 : 0) : (lit ? 0 : (bz(x, y) < 8 ? 1 : 0));

/* ================= sprites (panneaux toujours face a la camera) ================= */
export function makeSprite(draw){
  const pts = [];
  draw((x, y, c) => pts.push(x | 0, y | 0, c));
  let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
  for (let i = 0; i < pts.length; i += 3){ x0 = Math.min(x0, pts[i]); x1 = Math.max(x1, pts[i]); y0 = Math.min(y0, pts[i+1]); y1 = Math.max(y1, pts[i+1]); }
  if (!pts.length){ x0 = x1 = y0 = y1 = 0; }
  const w = x1 - x0 + 1, h = y1 - y0 + 1, buf = new Uint8Array(w * h).fill(2);
  for (let i = 0; i < pts.length; i += 3) buf[(pts[i+1] - y0) * w + (pts[i] - x0)] = pts[i+2];
  return { x0, y0, w, h, buf };
}
export function blit(s, dx, dy){
  const ox = s.x0 + dx, oy = s.y0 + dy;
  const FB = fb, MB = mb, LB = lb, LV = SH.LV, CUR = SH.CUR, GH = SH.GHOST, GT = SH.GHOST_T;
  if (SH.CAPTURE || ox > W || oy > H || ox + s.w < 0 || oy + s.h < 0) return;
  for (let y = 0; y < s.h; y++){
    const sy = oy + y; if (sy < 0 || sy >= H) continue;
    for (let x = 0; x < s.w; x++){
      const v = s.buf[y * s.w + x]; if (v === 2) continue;
      const sx = ox + x; if (sx < 0 || sx >= W) continue;
      const j = sy * W + sx;
      if (COLOR) LB[j] = LV;
      if (GH){ if (v >= 1 && ((x + y + GT) & 1)){ FB[j] = 1; MB[j] = M.BEAM; } }
      else if (v === 3){ FB[j] = 1; MB[j] = M.WIN; } else { FB[j] = v; MB[j] = CUR; }
    }
  }
}
export function blitAt(s, a, b, z){ const p = prj(a, b, z || 0); blit(s, Math.round(p[0]), Math.round(p[1])); }

/* ================= petite police 3x5 pour les enseignes ================= */
export const FONT = {};
('A010101111101101 B110101110101110 C011100100100011 D110101101101110 E111100110100111 F111100110100100 ' +
 'G011100101101011 H101101111101101 I111010010010111 J001001001101010 K101101110101101 L100100100100111 ' +
 'M101111111101101 N110101101101101 O010101101101010 P110101110100100 Q010101101110011 R110101110101101 ' +
 'S011100010001110 T111010010010010 U101101101101111 V101101101101010 W101101111111101 X101101010101101 ' +
 'Y101101010010010 Z111001010100111 0111101101101111 1010110010010111 2110001010100111 3110001010001110 ' +
 '4101101111001001 5111100110001110 6011100111101111 7111001010010010 8111101111101111 9111101111001110 ' +
 '!010010010000010 .000000000000010 \'010010000000000').split(' ').forEach(s => FONT[s[0]] = s.slice(1));
export const textW = (s) => s.length * 4 - 1;
export function drawText(put, s, x, y, c){
  for (let i = 0; i < s.length; i++){
    const g = FONT[s[i]]; if (!g) continue;
    for (let r = 0; r < 5; r++) for (let q = 0; q < 3; q++) if (g[r * 3 + q] === '1') put(x + i * 4 + q, y + r, c);
  }
}
export const STAR7 = ['0001000','0001000','1111111','0111110','0011100','0110110','0100010'];
export const STAR5 = ['00100','01110','11111','01110','01010'];
export function drawStar(put, x, y, c, big){ const S = big ? STAR7 : STAR5; for (let r = 0; r < S.length; r++) for (let q = 0; q < S.length; q++) if (S[r][q] === '1') put(x + q, y + r, c); }
// plaque avec texte, centree en x, bas en y
export function plate(put, s, cx, by, opt){
  const savedM = SH.CUR; SH.CUR = SH.CUR_SIDE === 'ccp' ? M.SIGN_CCP : M.SIGN;
  const r = plate2(put, s, cx, by, opt || {});
  SH.CUR = savedM; return r;
}
export function plate2(put, s, cx, by, opt){
  const tw = textW(s), w = tw + 4, h = 9, x0 = cx - (w >> 1), y0 = by - h;
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++){
    const edge = x === x0 || x === x0 + w - 1 || y === y0 || y === y0 + h - 1;
    put(x, y, opt.inv ? (edge ? 0 : 1) : (edge ? 1 : 0));
  }
  if (!opt.off) drawText(put, s, x0 + 2, y0 + 2, opt.inv ? 0 : 1);
  return [x0, y0, w, h];
}
// Dessin colle au monde : une image w x h (une case par unite le long du sol, une par unite de hauteur) posee debout
// le long de la direction (ea, eb), bas au milieu en (a, b, z). Elle tourne avec la ville au lieu de rester face a l'ecran,
// se lit toujours dans le bon sens et, vue par la tranche, n'est plus qu'un trait.
export function wallBitmap(a, b, z, ea, eb, w, h, pix){
  const era = ea * PC - eb * PS, erb = ea * PS + eb * PC;
  let sx = era - erb, sy = (era + erb) * .5;
  if (sx < 0){ sx = -sx; sy = -sy; }
  const P = prj(a, b, z), px = Math.round(P[0]), py = P[1];
  if (sx < .3){ const top = Math.round(py) - h; for (let ly = 0; ly < h; ly++) fput(px, top + ly, 1); return [px, top, 1, h]; }
  const half = w / 2, xa = Math.ceil(-half * sx), xb = Math.floor(half * sx);
  let y0 = 1e9;
  for (let dx = xa; dx <= xb; dx++){
    const u = dx / sx, lx = Math.floor(u + half); if (lx < 0 || lx >= w) continue;
    const top = Math.round(py + u * sy) - h; if (top < y0) y0 = top;
    for (let ly = 0; ly < h; ly++){ const v = pix[ly * w + lx]; if (v >= 0) fput(px + dx, top + ly, v); }
  }
  return [px + xa, y0, xb - xa + 1, h];
}
// plaque avec texte collee au monde : bas au milieu en (a, b, z), le long de dir (par defaut l'axe a, face +b ou -b)
export function plateW(s, a, b, z, opt, dir){
  opt = opt || {};
  const w = textW(s) + 4, h = 9, pix = new Int8Array(w * h).fill(-1);
  const savedM = SH.CUR; SH.CUR = SH.CUR_SIDE === 'ccp' ? M.SIGN_CCP : M.SIGN;
  plate2((x, y, c) => { if (x >= 0 && y >= 0 && x < w && y < h) pix[y * w + x] = c; }, s, w >> 1, h, opt);
  const r = wallBitmap(a, b, z, dir ? dir[0] : 1, dir ? dir[1] : 0, w, h, pix);
  SH.CUR = savedM; return r;
}

/* ================= drapeaux ================= */
// USC : les bandes rouges et blanches, et au centre du coin bleu la tete de chat de la CCR, en blanc.
// CCR : fond rouge, au centre une tete de chat jaune et, a cote, le marteau et la faucille.
// b bleu, c chat blanc du coin, r rouge, w blanc des bandes ; R rouge et y jaune de la CCR
export const FLAG_W = 19, FLAG_H = 11;
export const FLAG_ART = {
  usc: ['bbbbbbbbbrrrrrrrrrr', 'bcbbbbbcbwwwwwwwwww', 'bccbbbccbrrrrrrrrrr', 'bcccccccbwwwwwwwwww',
    'bcbcccbcbrrrrrrrrrr', 'bcccbcccbwwwwwwwwww', 'bbcccccbbrrrrrrrrrr', 'bbbbbbbbbwwwwwwwwww',
    'rrrrrrrrrrrrrrrrrrr', 'wwwwwwwwwwwwwwwwwww', 'rrrrrrrrrrrrrrrrrrr'],
  ccp: ['RRRRRRRRRRRRRRRRRRR', 'RRRRRRRRRRRRRyyyRRR', 'RRRRRRRRRRRRRRRyyRR', 'RyRRRRRyRRRRRyyRyyR',
    'RyyRRRyyRRRRyyyRyyR', 'RyyyyyyyRRRRRRyyyRR', 'RyRyyyRyRRRyRRyyyRR', 'RyyyRyyyRRyyyyyRyyR',
    'RRyyyyyRRyyRRRRRRyy', 'RRRRRRRRRyyRRRRRRRy', 'RRRRRRRRRRRRRRRRRRR']
};
export function flagPixels(kind, t){
  const out = [], w = FLAG_W, h = FLAG_H, art = FLAG_ART[kind];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++){
    const wave = Math.round(Math.sin(t * 4 - x * .4) * (x / w) * 1.3);
    let v;
    if (art){ const c = art[y][x]; v = (c === 'w' || c === 'c' || c === 'R') ? 1 : 0; }
    else v = ((x >> 1) + (y >> 1)) & 1;
    out.push([x, y + wave, v]);
  }
  return out;
}
// USC : bandes sur FLAG_RED (rouge, blanc), coin sur FLAG_BLUE (bleu, blanc) ; CCR sur FLAG_CCP (jaune, rouge)
export function flagMat(kind, x, y){ if (kind === 'usc'){ const c = FLAG_ART.usc[y][x]; return (c === 'r' || c === 'w') ? M.FLAG_RED : M.FLAG_BLUE; } return kind === 'ccp' ? M.FLAG_CCP : M.NEUTRAL; }
// le meme drapeau en plus petit (w x h), sans vent : [matiere, 0 ou 1] pour chaque case
export function flagSmall(kind, w, h){
  const out = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++){
    const fx = Math.min(FLAG_W - 1, Math.floor((x + .5) * FLAG_W / w)), fy = Math.min(FLAG_H - 1, Math.floor((y + .5) * FLAG_H / h)), c = FLAG_ART[kind][fy][fx];
    out.push([x, y, flagMat(kind, fx, fy), (c === 'w' || c === 'c' || c === 'R') ? 1 : 0]);
  }
  return out;
}
export function drawFlagPole(a, b, z0, hgt, kind, t){
  const savedM = SH.CUR;
  const p = prj(a, b, z0), bx = Math.round(p[0]), by = Math.round(p[1]);
  SH.CUR = M.METAL;
  for (let k = 0; k <= hgt; k++){ fput(bx, by - k, 1); fput(bx + 1, by - k, 0); }
  fput(bx, by - hgt - 1, 1);
  for (let x = 0; x <= FLAG_W + 1; x++) { fput(bx + 1 + x, by - hgt - 1 + Math.round(Math.sin(t * 4 - x * .4) * (x / FLAG_W) * 1.3), 0); }
  const F = flagPixels(kind, t);
  for (let i = 0; i < F.length; i++){ const [x, y, v] = F[i]; SH.CUR = flagMat(kind, i % FLAG_W, (i / FLAG_W) | 0); fput(bx + 1 + x, by - hgt + y, v); }
  SH.CUR = savedM;
}
