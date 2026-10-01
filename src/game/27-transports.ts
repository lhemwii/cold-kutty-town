import { SH, type Building, type Side } from './00-shared.ts';
import { GAME, H, HOOKS, M, SIDES, UP, W, boxS, bz, dep, drawFace, drawStar, fput, gableRoof2, gableWalls, line3, prj, state, wallFace, win, winColor } from './01-core.ts';
import { GA0, GB0, type Vec2 } from './02-ground.ts';
import { Lc, facadePlate, frontVisible, part, rbox, sideLight, wallBase } from './03-buildings-base.ts';
import { TYPES } from './04-types.ts';
import { drawCyl } from './06-types-more.ts';
import { cutTreesAlong } from './07-world.ts';
import { TER, fogSeenAt } from './08-territory.ts';
import { RW, ROAD_COMP, graphOf, lineLength, lineProblem, makeRoad, nearRoad, overWater, polyAt, rectRoadDist, removeRoad, repaintRoad, roadCost, roadNearest, sampleLine, underRock, buildGraph, reseatCars, type Graph, type Road } from './09-roads.ts';
import { DECALS, FOOT, rebuildTown } from './10-town.ts';
import { $, CAT_ICON, ICONS, costHTML, dashPoly, setTool, shiftDown, snap16, toast } from './13-ui.ts';
import { CATS_MENU, ECO, bdef, canAfford, payPrice, type Price } from './15-economy.ts';
import { worldToScreen } from './11-render.ts';
import { isCity } from './25-villes.ts';
/* ================= etape 6 : transports et connexions ================= */
// Routes : d'abord un chemin de terre, qu'on goudronne (clic sur la route). Ponts au-dessus de l'eau, tunnels sous la roche.
// Chemin de fer : voies (outil V), gares, trains qui roulent d'une gare a l'autre. Une ville reliee a la capitale par la route
// ou le train profite de toute sa production ; isolee, elle en perd la moitie en route. Metro : des stations reliees entre
// elles distraient les quartiers. La vue Lignes (L) montre tout cela a la maniere d'un plan de metro.

/* ---- la categorie Transports ---- */
Object.assign(ICONS, {
  // une locomotive de face
  transport: [['..kkkkkkkk..', '.kyyyyyyyyk.', '.kywwkkwwyk.', '.kywwkkwwyk.', '.kyyyyyyyyk.', '.krrrrrrrrk.', '.krwrrrrwrk.', '.krrrrrrrrk.', '..kkkkkkkk..', '.kk.k..k.kk.', 'kmmmmmmmmmmk', '.k..k..k..k.'],
    { k: '#2a2a2e', y: '#e8b84a', w: '#cfe8ff', r: '#c8283a', m: '#8a8f99' }],
});
CAT_ICON.transport = 'transport';
if (!CATS_MENU.some(c => c[0] === 'transport')) CATS_MENU.push(['transport', 'Transports']);

/* ---- les voies ferrees ---- */
export const RAILS: Road[] = [];
SH.RAILS = RAILS;
let RG: Graph = graphOf([]);
export const RAIL_GAUGE = 1.8;
const gares = (): Building[] => (SH.BLD as Building[]).filter(l => l.type === 'gare' && l.done);
// la voie la plus proche d'une gare : le point ou le train s'arrete
const GARE_R = 26;
function gareStop(l: Building): Vec2 | null {
  let best: Vec2 | null = null, bd = GARE_R;
  for (const r of RAILS){ if (r.side !== l.side) continue; const n = roadNearest(r, l.ca, l.cb); if (n[0] < bd){ bd = n[0]; best = [n[2], n[3]]; } }
  return best;
}
const nodeNear = (p: Vec2): number => { for (let i = 0; i < RG.nodes.length; i++){ const n = RG.nodes[i]; if (Math.abs(n.a - p[0]) < 3 && Math.abs(n.b - p[1]) < 3) return i; } return -1; };
export function railCost(pts: Vec2[]): Price { const o = lineLength(pts); return { l: Math.max(3, Math.ceil(o.land / 6 + o.wet * 4 / 6 + o.rock * 5 / 6)), c: 0, r: Math.ceil((o.land + o.wet + o.rock) / 40) }; }
export function railProblem(pts: Vec2[], side: Side): string {
  const why = lineProblem(pts, side, 'voie'); if (why) return why;
  let over = 0; for (const [a, b] of pts) if (RAILS.some(r => roadNearest(r, a, b)[0] < 3)) over++;
  if (over > pts.length * .8) return 'Il y a déjà une voie ici.';
  return '';
}
export function addRail(pts: Vec2[], side: Side): Road {
  const r = makeRoad(pts, side); RAILS.push(r); cutTreesAlong(pts, 5); linesChanged(); return r;
}
export function removeRail(r: Road){ const k = RAILS.indexOf(r); if (k >= 0){ RAILS.splice(k, 1); linesChanged(); } }
// accrocher un point a un bout de voie, ou au milieu d'une voie
function snapRail(a: number, b: number, side: Side): Vec2 {
  let best: Vec2 | null = null, bd = 12;
  for (const r of RAILS){ if (r.side !== side) continue; for (const e of [r.pts[0], r.pts[r.pts.length - 1]]){ const d = Math.hypot(e[0] - a, e[1] - b); if (d < bd){ bd = d; best = [e[0], e[1]]; } } }
  if (best) return best;
  let nb: Vec2 | null = null, nd = 8;
  for (const r of RAILS){ if (r.side !== side) continue; const n = roadNearest(r, a, b); if (n[0] < nd){ nd = n[0]; nb = [n[2], n[3]]; } }
  return nb || [Math.round(a), Math.round(b)];
}

/* ---- quand une voie, une route ou une gare change : graphe, trains, liens entre villes, passages ---- */
let LINES_VER = 0;
export function linesChanged(){
  const stops: Vec2[] = []; for (const g of gares()){ const s = gareStop(g); if (s) stops.push(s); }
  RG = graphOf(RAILS, stops, 1);
  LINES_VER++; buildPassages(); planTrains(); computeLinks(); METRO_VER = -1;
  if (SH.passGridDirty) SH.passGridDirty();
  SH.TUNNEL_VER = LINES_VER;
  rebuildTown();
}
SH.linesChanged = linesChanged;

/* ---- ponts et tunnels : les unites a pied y passent (26-unites, SH.tunnelAt) ---- */
const PASS = new Set<number>();
const pkey = (a: number, b: number) => Math.floor((a - GA0) / 8) * 65536 + Math.floor((b - GB0) / 8);
function buildPassages(){
  PASS.clear();
  for (const r of [...SH.ROADS as Road[], ...RAILS]) for (const [a, b] of r.pts) if (overWater(a, b) || underRock(a, b)) for (const [da, db] of [[0, 0], [-4, 0], [4, 0], [0, -4], [0, 4]]) PASS.add(pkey(a + da, b + db));
}
SH.tunnelAt = (a: number, b: number): boolean => PASS.has(pkey(a, b));

/* ---- les trains : un par paire de gares voisines sur un meme reseau, en navette ---- */
interface Train { side: Side; pts: Vec2[]; cum: number[]; len: number; s: number; dir: 1 | -1; wait: number; cargo: number; id: number }
export const TRAINS: Train[] = [];
SH.TRAINS = TRAINS;
function shortest(n0: number, n1: number): Vec2[] | null {
  const N = RG.nodes.length, dist = new Float64Array(N).fill(1e18), from = new Int32Array(N).fill(-1), done = new Uint8Array(N);
  dist[n0] = 0;
  for (;;){
    let u = -1, best = 1e18; for (let i = 0; i < N; i++) if (!done[i] && dist[i] < best){ best = dist[i]; u = i; }
    if (u < 0 || u === n1) break; done[u] = 1;
    for (const ei of RG.nodeEdges[u]){ const e = RG.edges[ei], v = e.n0 === u ? e.n1 : e.n0, d = dist[u] + e.len; if (d < dist[v]){ dist[v] = d; from[v] = ei; } }
  }
  if (dist[n1] > 1e17) return null;
  const segs: Vec2[][] = []; let v = n1;
  while (v !== n0){ const e = RG.edges[from[v]], fwd = e.n1 === v; segs.push(fwd ? e.pts : e.pts.slice().reverse()); v = fwd ? e.n0 : e.n1; }
  segs.reverse();
  const out: Vec2[] = []; for (const s of segs) for (const p of s){ const l = out[out.length - 1]; if (!l || Math.hypot(l[0] - p[0], l[1] - p[1]) > .01) out.push(p); }
  return out;
}
function planTrains(){
  const old = new Map(TRAINS.map(t => [t.id, t])); TRAINS.length = 0;
  for (const side of SIDES){
    const list = gares().filter(g => g.side === side).map(g => ({ g, n: (() => { const s = gareStop(g); return s ? nodeNear(s) : -1; })() })).filter(x => x.n >= 0);
    const byComp = new Map<number, typeof list>();
    for (const x of list){ const c = RG.nodes[x.n].comp; if (!byComp.has(c)) byComp.set(c, []); byComp.get(c)?.push(x); }
    for (const grp of byComp.values()){
      grp.sort((u, v) => u.g.id - v.g.id);
      for (let k = 0; k + 1 < grp.length && k < 4; k++){
        const pts = shortest(grp[k].n, grp[k + 1].n); if (!pts || pts.length < 2) continue;
        const cum = [0]; for (let j = 1; j < pts.length; j++) cum.push(cum[j - 1] + Math.hypot(pts[j][0] - pts[j - 1][0], pts[j][1] - pts[j - 1][1]));
        const id = grp[k].g.id * 1000 + grp[k + 1].g.id, o = old.get(id), len = cum[cum.length - 1];
        TRAINS.push({ side, pts, cum, len, s: o ? Math.min(o.s, len) : 0, dir: o ? o.dir : 1, wait: o ? o.wait : 2, cargo: o ? o.cargo : k & 1, id });
      }
    }
  }
}
HOOKS.step.push((dt: number) => {
  if (GAME.mode !== 'play' || dt <= 0) return;
  for (const tr of TRAINS){
    if (tr.wait > 0){ tr.wait -= dt; continue; }
    tr.s += tr.dir * 26 * dt;
    if (tr.s >= tr.len){ tr.s = tr.len; tr.dir = -1; tr.wait = 4; tr.cargo ^= 1; }
    else if (tr.s <= 0){ tr.s = 0; tr.dir = 1; tr.wait = 4; tr.cargo ^= 1; }
  }
});
// la locomotive en tete, deux wagons derriere (laine ou croquettes)
function drawTrainCar(a: number, b: number, ang: number, k: number, side: Side, cargo: number){
  const ccp = side === 'ccp';
  if (k === 0){
    SH.CUR = ccp ? M.TRAIN_CCP : M.CAR_USC;
    rbox(a, b, ang, -6.5, 6.5, -2.6, 2.6, .6, 4.6, (_u: number, h: number) => h > 3 ? 1 : 0, 1, 1);
    rbox(a, b, ang, -6.5, -1.5, -2.6, 2.6, 4.6, 7, (_u: number, h: number) => h > 1 && h < 2 ? 3 : 0, 1, 1);
    SH.CUR = M.METAL; const p = prj(a + Math.cos(ang) * 4, b + Math.sin(ang) * 4, 7.5); fput(Math.round(p[0]), Math.round(p[1]), 0); fput(Math.round(p[0]), Math.round(p[1]) - 1, 0);
  } else {
    SH.CUR = M.METAL; rbox(a, b, ang, -5.5, 5.5, -2.4, 2.4, .6, 3.6, (_u: number, h: number) => h > 2.6 ? 1 : 0, 0, 1);
    SH.CUR = cargo ? M.WOOL : M.DIRT; rbox(a, b, ang, -4.5, 4.5, -1.8, 1.8, 3.6, 4.6, 1, 1, 1);
  }
}
HOOKS.dyn.push((_t: number, out) => {
  if (GAME.mode !== 'play') return;
  for (const tr of TRAINS){
    for (let k = 0; k < 3; k++){
      const s = tr.s - tr.dir * k * 13; if (s < -1 || s > tr.len + 1) continue;
      const p = polyAt(tr.pts, tr.cum, Math.max(0, Math.min(tr.len, s))), ang = tr.dir > 0 ? p[2] : p[2] + Math.PI;
      if (overWater(p[0], p[1]) === false && underRock(p[0], p[1])) continue;
      const q = prj(p[0], p[1], 0); if (q[0] < -30 || q[0] > W + 30 || q[1] < -30 || q[1] > H + 30) continue;
      const a = p[0], b = p[1], side = tr.side, cg = tr.cargo;
      out.push({ d: dep(a, b) + .3, a, b, side, f: () => drawTrainCar(a, b, ang, k, side, cg) });
    }
  }
});

/* ---- dessin des voies (au sol, sous tout le reste) et des ponts ---- */
function drawRails(){
  const me = GAME.side, fogOn = TER_FOG();
  for (const r of RAILS){
    const p0 = prj(r.box[0], r.box[2], 0), p1 = prj(r.box[1], r.box[3], 0), p2 = prj(r.box[0], r.box[3], 0), p3 = prj(r.box[1], r.box[2], 0);
    if (Math.max(p0[0], p1[0], p2[0], p3[0]) < -10 || Math.min(p0[0], p1[0], p2[0], p3[0]) > W + 10 || Math.max(p0[1], p1[1], p2[1], p3[1]) < -10 || Math.min(p0[1], p1[1], p2[1], p3[1]) > H + 10) continue;
    for (let s = 0; s < r.len; s += 3){
      const p = polyAt(r.pts, r.cum, s), a = p[0], b = p[1];
      if (overWater(a, b) || underRock(a, b)) continue;
      if (fogOn && r.side !== me && !fogSeenAt(a, b)) continue;
      const na = -Math.sin(p[2]), nb = Math.cos(p[2]);
      SH.CUR = M.GRAVEL; line3(a - na * 3.6, b - nb * 3.6, 0, a + na * 3.6, b + nb * 3.6, 0, 0);
      SH.CUR = M.PIER; line3(a - na * 2.8, b - nb * 2.8, .1, a + na * 2.8, b + nb * 2.8, .1, 0);
      const e = polyAt(r.pts, r.cum, Math.min(r.len, s + 3));
      SH.CUR = M.RAIL;
      for (const g of [-RAIL_GAUGE, RAIL_GAUGE]) line3(a + na * g, b + nb * g, .3, e[0] + na * g, e[1] + nb * g, .3, 1);
    }
  }
}
const TER_FOG = (): boolean => TER.fogOn;
// un pont : tablier, garde-corps et piles, pour chaque passage au-dessus de l'eau
function bridgeParts(r: Road, rail: boolean){
  const out: ReturnType<typeof part>[] = [];
  const wet = r.pts.map(p => overWater(p[0], p[1]));
  for (let k = 0; k < r.pts.length; k++){
    if (!wet[k] || (k > 0 && wet[k - 1])) continue;
    let j = k; while (j + 1 < r.pts.length && wet[j + 1]) j++;
    const i0 = Math.max(0, k - 1), i1 = Math.min(r.pts.length - 1, j + 1), seg = r.pts.slice(i0, i1 + 1), w = rail ? 3.6 : RW + .5;
    const mid = seg[Math.floor(seg.length / 2)];
    const draw = () => {
      for (let i = 0; i + 1 < seg.length; i++){
        const [pa, pb] = seg[i], [qa, qb] = seg[i + 1], L = Math.hypot(qa - pa, qb - pb) || 1, na = -(qb - pb) / L * w, nb = (qa - pa) / L * w;
        SH.CUR = rail ? M.GIRDER : M.CONCRETE;
        drawFace([pa - na, pb - nb, .6, qa - na, qb - nb, .6, qa + na, qb + nb, .6, pa + na, pb + nb, .6], UP, rail ? ((x: number, y: number) => ((x + y) & 1) ? 1 : 0) : 0, 1);
        wallFace(pa - na, pb - nb, qa - na, qb - nb, -.6, .6, 1, 1); wallFace(qa + na, qb + nb, pa + na, pb + nb, -.6, .6, 1, 1);
        SH.CUR = rail ? M.GIRDER : M.METAL;
        for (const s of [-1, 1]) line3(pa + na * s, pb + nb * s, 2.2, qa + na * s, qb + nb * s, 2.2, 1);
        if (rail){ SH.CUR = M.RAIL; for (const g of [-RAIL_GAUGE, RAIL_GAUGE]){ const ga = na / w * g, gb = nb / w * g; line3(pa + ga, pb + gb, .8, qa + ga, qb + gb, .8, 1); } }
        if (i % 4 === 0){ SH.CUR = M.CONCRETE; for (const s of [-1, 1]) line3(pa + na * s * .8, pb + nb * s * .8, -3, pa + na * s * .8, pb + nb * s * .8, .6, 0); }
      }
    };
    out.push(Object.assign(part(mid[0], mid[1], -4, draw), { side: r.side, m: rail ? M.GIRDER : M.CONCRETE }));
    k = j;
  }
  return out;
}
// l'entree d'un tunnel : une arche de pierre sombre, la ou la voie entre dans la roche
function tunnelParts(r: Road, rail: boolean){
  const out: ReturnType<typeof part>[] = [];
  const rock = r.pts.map(p => underRock(p[0], p[1]));
  for (let k = 1; k < r.pts.length; k++){
    if (rock[k] === rock[k - 1]) continue;
    const o = rock[k] ? r.pts[k - 1] : r.pts[k], i = rock[k] ? r.pts[k] : r.pts[k - 1], L = Math.hypot(i[0] - o[0], i[1] - o[1]) || 1, na = -(i[1] - o[1]) / L, nb = (i[0] - o[0]) / L, w = rail ? 4.5 : RW + 1.5;
    const draw = () => {
      SH.CUR = M.ROCK; wallFace(o[0] - na * w, o[1] - nb * w, o[0] + na * w, o[1] + nb * w, 0, 7, (u: number, h: number) => (Math.abs(u - w) < w - 1.4 && h < 5.4) ? 0 : 1, 1);
      SH.CUR = M.CAT_BLACK; wallFace(o[0] - na * (w - 1.4), o[1] - nb * (w - 1.4), o[0] + na * (w - 1.4), o[1] + nb * (w - 1.4), 0, 5.2, 0, 0);
    };
    out.push(Object.assign(part(o[0], o[1], .2, draw), { side: r.side, m: M.ROCK }));
  }
  return out;
}
HOOKS.town.push((parts) => {
  if (RAILS.length) DECALS.push(drawRails);
  for (const r of SH.ROADS as Road[]){ parts.push(...bridgeParts(r, false), ...tunnelParts(r, false)); }
  for (const r of RAILS){ parts.push(...bridgeParts(r, true), ...tunnelParts(r, true)); }
});

/* ---- l'outil Voie ferree (V) ---- */
let railPts: Vec2[] = [];
let hoverRail: Vec2 | null = null;
const railEnd = (a: number, b: number): Vec2 => { const e = snapRail(a, b, GAME.side); return shiftDown && railPts.length === 1 ? snap16(railPts[0], e) : e; };
SH.TOOLS = SH.TOOLS || {};
SH.TOOLS.rail = {
  hint: 'Voie ferrée : clique le départ, puis l’arrivée (Maj pour suivre l’une des seize directions). Pose ensuite une gare à côté de chaque bout : les trains roulent d’une gare à l’autre.',
  start(){ railPts = []; },
  esc(): boolean { if (railPts.length){ railPts = []; return true; } return false; },
  click(a: number, b: number){
    if (SH.hasTech && !SH.hasTech(GAME.side, 'chemin_de_fer')){ toast('Il faut d’abord la recherche « Chemin de fer » (écran E).'); return; }
    const p = railEnd(a, b); railPts.push(p);
    if (railPts.length < 2){ SH.sfx('click'); return; }
    const pts = sampleLine(railPts[0], railPts[1]), why = railProblem(pts, GAME.side);
    if (why){ toast(why); railPts.pop(); return; }
    const pr = railCost(pts);
    if (!canAfford(GAME.side, pr)){ toast('Il faut ' + SH.costLabel(pr) + ' pour cette voie.'); railPts.pop(); return; }
    payPrice(GAME.side, pr); addRail(pts, GAME.side);
    SH.sfx('click'); SH.saveSoon(); SH.renderHUD();
    railPts = [pts[pts.length - 1]];
  },
  preview(t: number, w: Vec2 | null){
    if (!w) return; hoverRail = w;
    const e = railEnd(w[0], w[1]);
    if (railPts.length === 1){ const pts = sampleLine(railPts[0], e); dashPoly(pts, !railProblem(pts, GAME.side), t); }
    SH.CUR = M.BEAM; for (const p of [...railPts, e]){ const q = prj(p[0], p[1], 0), x = Math.round(q[0]), y = Math.round(q[1]); for (let k = -4; k <= 4; k++){ fput(x + k, y, 1); fput(x, y + (k >> 1), 1); } }
  },
};
SH.KEYS = SH.KEYS || {};
SH.KEYS.v = () => setTool(GAME.mode === 'play' && state.tool === 'rail' ? 'walk' : 'rail');
void hoverRail;

/* ---- la gare et la station de metro ---- */
TYPES.gare = { name: 'Gare', nameCCP: 'Gare du Peuple', fem: true, build(lot: Building, seed: number){
  const ccp = lot.side === 'ccp', a0 = lot.ca - 12, a1 = lot.ca + 12, b0 = lot.cb - 6, b1 = lot.cb + 4, hh = ccp ? 10 : 8, rh = 4;
  const body = () => {
    SH.CUR = ccp ? M.CONCRETE : M.BRICK;
    if (ccp) boxS(a0, a1, b0, b1, 0, hh, (u: number, h: number, x: number, y: number, k: number) => { const kk = win(u % 4, h, 1, 2.5, 1.8, 5); if (kk && h < hh - 1.5) return winColor(kk, true, x, y); return h > hh - 1 ? 1 : wallBase(k, x, y); }, (x: number, y: number) => bz(x, y) < 2 ? 1 : 0);
    else { gableWalls(a0, a1, b0, b1, hh, rh, 'a', (u: number, h: number, x: number, y: number, k: number) => { const kk = win(u % 4.8, h, 1.2, 2.2, 2, 5); return kk ? winColor(kk, true, x, y) : wallBase(k, x, y); }); SH.CUR = M.ROOF_USC2; gableRoof2(a0, a1, b0, b1, hh, rh, 'a', 1, 7, 1); }
    // la marquise du quai, cote voie (derriere)
    SH.CUR = ccp ? M.CCP2 : M.METAL;
    drawFace([a0 - 4, b0 - 9, 6, a1 + 4, b0 - 9, 6, a1 + 4, b0, 6, a0 - 4, b0, 6], UP, (x: number, y: number) => ((x >> 1) + y) & 1 ? 1 : 0, 1);
    for (let k = 0; k <= 4; k++){ const pa = a0 - 4 + k * (a1 - a0 + 8) / 4; line3(pa, b0 - 8, 0, pa, b0 - 8, 6, 0); }
    if (ccp && frontVisible(0)){ const p = prj(lot.ca, b1, hh + 2.5); SH.CUR = M.SIGN_CCP; drawStar(fput, Math.round(p[0]) - 3, Math.round(p[1]) - 3, 0, true); }
  };
  // l'horloge (USC) au-dessus de l'entree
  const clock = () => { if (ccp || !frontVisible(0)) return; const p = prj(lot.ca, b1 + .2, hh + 2), x = Math.round(p[0]), y = Math.round(p[1]); SH.CUR = M.SIGN; for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if (dx * dx + dy * dy <= 5) fput(x + dx, y + dy, dx * dx + dy * dy > 3 ? 0 : 1); SH.CUR = M.CAT_BLACK; fput(x, y, 0); fput(x, y - 1, 0); fput(x + 1, y, 0); };
  void seed;
  return { parts: [part(lot.ca, lot.cb, 0, body), part(lot.ca, lot.cb, .6, () => facadePlate(ccp ? 'VOKZAL' : 'GARE', lot.ca, b1, b0, hh - 2.2)), part(lot.ca, b1, .7, clock)], lights: [sideLight(a0, a1, b0, b1, 0, 7, 1), Lc(lot.ca, b0 - 5, 10, 1.1)] };
} };
ECO.gare = bdef('transport', 40, { costR: 10, l: -.5, jobs: 3, rad: 40, desc: 'Se pose le long d’une voie ferrée. Deux gares sur un même réseau : un train fait la navette et relie leurs villes.' });
FOOT.gare = [30, 26];
TYPES.metro = { name: 'Station de métro', nameCCP: 'Station du métro du Peuple', fem: true, build(lot: Building, seed: number){
  const ccp = lot.side === 'ccp', a0 = lot.ca - 6, a1 = lot.ca + 6, b0 = lot.cb - 5, b1 = lot.cb + 5;
  const body = () => {
    if (ccp){
      // un pavillon de pierre a colonnes, et le grand M rouge
      SH.CUR = M.SANDSTONE; boxS(a0, a1, b0, b1, 0, 7, (u: number, h: number, x: number, y: number, k: number) => (k === 0 && (u % 2.4) < .9 && h < 6) ? 1 : (h > 6 ? 1 : wallBase(k, x, y)), 1);
      SH.CUR = M.DOME_A; drawCyl(lot.ca, lot.cb, 7, 4, 2, true);
      const p = prj(lot.ca, lot.cb, 12.5), x = Math.round(p[0]), y = Math.round(p[1]);
      SH.CUR = M.FLAG_RED; for (let dy = 0; dy < 5; dy++){ fput(x - 2, y + dy, 0); fput(x + 2, y + dy, 0); } fput(x - 1, y + 1, 0); fput(x + 1, y + 1, 0); fput(x, y + 2, 0);
    } else {
      // une bouche de metro : rambarde verte, escalier qui descend, deux globes
      SH.CUR = M.CONCRETE; drawFace([a0, b0, .2, a1, b0, .2, a1, b1, .2, a0, b1, .2], UP, 1, 1);
      SH.CUR = M.CAT_BLACK; drawFace([a0 + 2, b0 + 2, .3, a1 - 2, b0 + 2, .3, a1 - 2, b1 - 1, .3, a0 + 2, b1 - 1, .3], UP, (x: number, y: number) => (y & 1) ? 0 : 1, 0);
      SH.CUR = M.TREE; for (const [pa, pb, qa, qb] of [[a0 + 1, b0 + 1, a1 - 1, b0 + 1], [a0 + 1, b0 + 1, a0 + 1, b1 - 1], [a1 - 1, b0 + 1, a1 - 1, b1 - 1]]) line3(pa, pb, 2.4, qa, qb, 2.4, 1);
      for (const pa of [a0 + 1, a1 - 1]){ SH.CUR = M.TREE; line3(pa, b1 - 1, 0, pa, b1 - 1, 6, 0); const p = prj(pa, b1 - 1, 7); SH.CUR = M.LAMP; fput(Math.round(p[0]), Math.round(p[1]), 1); fput(Math.round(p[0]) + 1, Math.round(p[1]), 1); fput(Math.round(p[0]), Math.round(p[1]) - 1, 1); }
    }
  };
  void seed;
  return { parts: [part(lot.ca, lot.cb, 0, body), part(lot.ca, lot.cb, .6, () => facadePlate(ccp ? 'METRO' : 'SUBWAY', lot.ca, b1, b0, ccp ? 5.5 : 3))], lights: [Lc(lot.ca, b1 + 3, 9, 1.1)] };
} };
ECO.metro = bdef('transport', 35, { costR: 15, l: -.5, elec: -2, fun: 6, jobs: 2, rad: 30, desc: 'Reliée aux stations voisines (moins de 280 pas) : elle distrait le quartier, d’autant plus qu’elle a de lignes.' });
FOOT.metro = [16, 14];

// pose : rien sur une voie ; la gare le long d'une voie
HOOKS.place.push((type: string, side: Side, ca: number, cb: number): string => {
  const f = FOOT[type] || [20, 20], a0 = ca - f[0] / 2, a1 = ca + f[0] / 2, b0 = cb - f[1] / 2, b1 = cb + f[1] / 2;
  for (const r of RAILS) if (!(r.box[1] < a0 - 3 || r.box[0] > a1 + 3 || r.box[3] < b0 - 3 || r.box[2] > b1 + 3)) for (const [a, b] of r.pts) if (a > a0 - 3 && a < a1 + 3 && b > b0 - 3 && b < b1 + 3) return 'Une voie ferrée passe ici.';
  if (type === 'gare'){ let ok = false; for (const r of RAILS) if (r.side === side && roadNearest(r, ca, cb)[0] < GARE_R) ok = true; if (!ok) return 'La gare se pose le long d’une voie ferrée (outil V).'; }
  return '';
});

/* ---- le metro : chaque station se relie a ses deux voisines les plus proches ---- */
let METRO_VER = -1;
interface MetroLink { side: Side; a: Building; b: Building; line: number }
let METRO: MetroLink[] = [];
const METRO_R = 280;
function metroLinks(): MetroLink[] {
  const key = (SH.TOWN_VER || 0) + LINES_VER * 7919;
  if (METRO_VER === key) return METRO;
  METRO_VER = key; METRO = [];
  for (const side of SIDES){
    const st = (SH.BLD as Building[]).filter(l => l.type === 'metro' && l.side === side && l.done);
    const seen = new Set<string>();
    for (const s of st){
      const near = st.filter(o => o !== s && Math.hypot(o.ca - s.ca, o.cb - s.cb) < METRO_R).sort((u, v) => Math.hypot(u.ca - s.ca, u.cb - s.cb) - Math.hypot(v.ca - s.ca, v.cb - s.cb)).slice(0, 2);
      for (const o of near){ const k = Math.min(s.id, o.id) + ':' + Math.max(s.id, o.id); if (seen.has(k)) continue; seen.add(k); METRO.push({ side, a: s, b: o, line: 0 }); }
    }
    // une ligne par groupe de stations reliees
    const comp = new Map<number, number>(); let c = 0;
    for (const s of st){ if (comp.has(s.id)) continue; const stk = [s]; comp.set(s.id, c); while (stk.length){ const u = stk.pop() as Building; for (const m of METRO) if (m.side === side && (m.a === u || m.b === u)){ const v = m.a === u ? m.b : m.a; if (!comp.has(v.id)){ comp.set(v.id, c); stk.push(v); } } } c++; }
    for (const m of METRO) if (m.side === side) m.line = comp.get(m.a.id) || 0;
  }
  return METRO;
}
const metroDegree = (l: Building): number => metroLinks().filter(m => m.a === l || m.b === l).length;
SH.funMult = (l: Building): number => { if (l.type !== 'metro') return 1; const d = metroDegree(l); return d ? 1 + .5 * (d - 1) : 0; };

/* ---- les liens entre villes : une ville isolee de la capitale perd la moitie de sa production ---- */
const LINKED = new Map<number, boolean>();
const HOME = new Map<number, number>();
function computeLinks(){
  LINKED.clear(); HOME.clear();
  for (const side of SIDES){
    const cities = (SH.BLD as Building[]).filter(l => l.side === side && l.done && isCity(l));
    if (!cities.length) continue;
    const cap = cities.find(c => c.type === 'qg') || cities[0];
    const comps = (c: Building) => { const s = new Set<number | undefined>(); for (const r of SH.ROADS as Road[]) if (r.side === side && rectRoadDist(c, r) < RW + 10) s.add(ROAD_COMP.get(r.id)); return s; };
    const rcomp = (c: Building) => { const s = new Set<number>(); for (const g of gares()) if (g.side === side && Math.hypot(g.ca - c.ca, g.cb - c.cb) < 180){ const st = gareStop(g), n = st ? nodeNear(st) : -1; if (n >= 0) s.add(RG.nodes[n].comp); } return s; };
    const RC = cities.map(comps), TC2 = cities.map(rcomp);
    const ok = new Set<number>([cities.indexOf(cap)]), stk = [cities.indexOf(cap)];
    while (stk.length){ const i = stk.pop() as number; for (let j = 0; j < cities.length; j++){ if (ok.has(j)) continue; const road = [...RC[i]].some(x => x != null && RC[j].has(x)), rail = [...TC2[i]].some(x => TC2[j].has(x)); if (road || rail){ ok.add(j); stk.push(j); } } }
    for (let i = 0; i < cities.length; i++) LINKED.set(cities[i].id, ok.has(i));
    for (const l of SH.BLD as Building[]){ if (l.side !== side) continue; let best = cities[0], bd = 1e9; for (const c of cities){ const d = Math.hypot(c.ca - l.ca, c.cb - l.cb); if (d < bd){ bd = d; best = c; } } HOME.set(l.id, best.id); }
  }
}
let linkAcc = 0;
HOOKS.step.push((dt: number) => { if (GAME.mode !== 'play') return; linkAcc += dt; if (linkAcc < 2) return; linkAcc = 0; computeLinks(); });
export const isolated = (l: Building): boolean => { const h = HOME.get(l.id); return h != null && LINKED.get(h) === false; };
SH.prodMult = (l: Building): number => isolated(l) ? .5 : 1;
SH.isolated = isolated;

/* ---- le panneau d'un batiment : ville isolee, gare, metro ---- */
const prevSel = SH.selExtra;
SH.selExtra = (l: Building, btn: (label: string, sub: string, fn: () => void, why?: string) => HTMLButtonElement, act: HTMLElement) => {
  if (typeof prevSel === 'function') prevSel(l, btn, act);
  const note = (txt: string) => { const n = document.createElement('p'); n.className = 'sel-note'; n.textContent = txt; act.append(n); };
  if (isolated(l)) note('Ville isolée : la moitié de la production se perd en route. Relie-la à la capitale par la route ou par le train.');
  if (l.type === 'gare' && l.done){ const n = TRAINS.filter(t => t.id % 1000 === l.id || Math.floor(t.id / 1000) === l.id).length; note(n ? n + ' train' + (n > 1 ? 's' : '') + ' partent d’ici.' : 'Aucun train : pose une autre gare sur le même réseau de voies.'); }
  if (l.type === 'metro' && l.done){ const d = metroDegree(l); note(d ? 'Reliée à ' + d + ' station' + (d > 1 ? 's' : '') + '.' : 'Pas encore reliée : pose une autre station à moins de ' + METRO_R + ' pas.'); }
};

/* ---- la fiche d'une route ou d'une voie : goudronner, demolir ---- */
export function showCard(title: string, body: string, acts: [string, string, () => void, string?][]){
  const el = $('card');
  let h = '<div class="un-head"><b>' + title + '</b><button class="btn k" type="button" id="cardClose" aria-label="Fermer">×</button></div><p class="sel-note">' + body + '</p><div class="un-act">';
  acts.forEach(([lab, sub, , why], i) => { h += '<button class="btn' + (lab.startsWith('Démolir') ? ' danger' : '') + '" type="button" data-ca="' + i + '"' + (why ? ' disabled title="' + why + '"' : '') + '>' + lab + (sub ? '<i>' + sub + '</i>' : '') + '</button>'; });
  el.innerHTML = h + '</div>'; el.hidden = false; document.body.classList.add('card-open');
  $('cardClose').addEventListener('click', hideCard);
  for (const b of el.querySelectorAll('[data-ca]')) if (b instanceof HTMLElement) b.addEventListener('click', () => { const a = acts[+(b.dataset.ca || 0)]; a[2](); SH.sfx('click'); });
}
export function hideCard(){ const el = $('card'); if (!el.hidden){ el.hidden = true; document.body.classList.remove('card-open'); } }
SH.showCard = showCard; SH.hideCard = hideCard;
SH.cardEscape = (): boolean => { if ($('card').hidden) return false; hideCard(); return true; };
const prevSelect = SH.selectBuilding;
SH.selectBuilding = (l: Building | null) => { if (l) hideCard(); prevSelect(l); };
HOOKS.step.push(() => { if (!$('units').hidden) hideCard(); });
export const paveCost = (r: Road): Price => ({ l: Math.max(1, roadCost(r.pts) - roadCost(r.pts, true)), c: Math.ceil(r.len / 25), r: 0 });
function roadCard(r: Road){
  const L = Math.round(r.len), o = lineLength(r.pts), extra = (o.wet ? ', dont ' + Math.round(o.wet) + ' pas de pont' : '') + (o.rock ? ', dont ' + Math.round(o.rock) + ' pas de tunnel' : '');
  const acts: [string, string, () => void, string?][] = [];
  if (r.dirt){ const pr = paveCost(r); const noTar = SH.hasTech && !SH.hasTech(GAME.side, 'goudron') ? 'Il faut la recherche « Goudron ».' : ''; acts.push(['Goudronner', costHTML(pr), () => { if (noTar){ toast(noTar); return; } if (!canAfford(GAME.side, pr)){ toast('Il faut ' + SH.costLabel(pr) + '.'); return; } payPrice(GAME.side, pr); r.dirt = false; repaintRoad(r); buildGraph(); reseatCars(); toast('Route goudronnée : les voitures y roulent plus vite.'); hideCard(); SH.saveSoon(); SH.renderHUD(); }, noTar || (canAfford(GAME.side, pr) ? '' : 'Il manque ' + SH.costLabel(pr) + '.')]); }
  acts.push(['Démolir', '', () => { removeRoad(r); toast('Route démolie.'); hideCard(); SH.saveSoon(); }]);
  showCard(r.dirt ? 'Chemin de terre' : 'Route goudronnée', L + ' pas' + extra + '. ' + (r.dirt ? 'Les voitures y roulent moins vite.' : 'Les voitures y roulent à pleine vitesse.'), acts);
}
function railCard(r: Road){
  const L = Math.round(r.len), n = TRAINS.filter(t => t.side === r.side && t.pts.some(p => roadNearest(r, p[0], p[1])[0] < 1)).length;
  showCard('Voie ferrée', L + ' pas. ' + (n ? n + ' train' + (n > 1 ? 's y passent.' : ' y passe.') : 'Aucun train : il faut deux gares sur ce réseau.'), [['Démolir', '', () => { removeRail(r); toast('Voie démolie.'); hideCard(); SH.saveSoon(); }]]);
}
SH.pickLine = (a: number, b: number): boolean => {
  for (const r of RAILS) if (r.side === GAME.side && roadNearest(r, a, b)[0] < 4){ railCard(r); return true; }
  const n = nearRoad(a, b, RW, GAME.side); if (n){ roadCard(n.r); return true; }
  hideCard(); return false;
};
SH.demolishExtra = (a: number, b: number): boolean => {
  const r = RAILS.find(o => o.side === GAME.side && roadNearest(o, a, b)[0] < 4); if (!r) return false;
  removeRail(r); const c = railCost(r.pts); SH.RES[GAME.side].laine += Math.round(c.l / 2); toast('Voie démolie.'); SH.sfx('demolish', a, b); SH.saveSoon(); return true;
};

/* ---- la vue Lignes : trains, metro et routes, a la maniere d'un plan de metro ---- */
const LINE_COL = ['#e4572e', '#2e86ab', '#f2a541', '#5aa469', '#a05195', '#00a6a6', '#d1495b', '#6a4c93'];
let linesOn = false;
export function setLines(on: boolean){
  linesOn = on; const b = document.getElementById('btnLines'); if (b) b.setAttribute('aria-pressed', String(on));
  const cv = document.getElementById('linesCv'); if (cv instanceof HTMLCanvasElement){ cv.hidden = !on; if (!on) cv.getContext('2d')?.clearRect(0, 0, cv.width, cv.height); }
}
document.getElementById('btnLines')?.addEventListener('click', () => { setLines(!linesOn); SH.sfx('click'); });
SH.KEYS.l = () => setLines(!linesOn);
HOOKS.after.push(() => {
  if (!linesOn) return;
  const cv = document.getElementById('linesCv'); if (!(cv instanceof HTMLCanvasElement)) return;
  if (GAME.mode !== 'play'){ setLines(false); return; }
  const dpr = window.devicePixelRatio || 1, w = Math.round(innerWidth * dpr), h = Math.round(innerHeight * dpr);
  if (cv.width !== w || cv.height !== h){ cv.width = w; cv.height = h; }
  const g = cv.getContext('2d'); if (!g) return;
  g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, innerWidth, innerHeight);
  g.fillStyle = 'rgba(246,242,232,.55)'; g.fillRect(0, 0, innerWidth, innerHeight);
  g.lineCap = 'round'; g.lineJoin = 'round';
  const me = GAME.side, seen = (a: number, b: number) => !TER.fogOn || fogSeenAt(a, b);
  const poly = (pts: Vec2[], step: number) => { g.beginPath(); for (let k = 0; k < pts.length; k += step){ const q = worldToScreen(pts[k][0], pts[k][1], 0); if (k) g.lineTo(q[0], q[1]); else g.moveTo(q[0], q[1]); } const l = pts[pts.length - 1], q = worldToScreen(l[0], l[1], 0); g.lineTo(q[0], q[1]); };
  // les routes, en fin trait gris (pointille pour la terre battue)
  for (const r of SH.ROADS as Road[]){ if (r.side !== me && !seen(r.pts[0][0], r.pts[0][1])) continue; poly(r.pts, 3); g.strokeStyle = r.side === me ? '#8b8b8b' : '#b88'; g.lineWidth = 2; g.setLineDash(r.dirt ? [4, 4] : []); g.stroke(); }
  g.setLineDash([]);
  // les trains : une couleur par reseau
  const compOf = (r: Road): number => { const n = RG.edges.find(e => e.road === r.id); return n ? RG.nodes[n.n0].comp : 0; };
  for (const r of RAILS){ if (r.side !== me && !seen(r.pts[0][0], r.pts[0][1])) continue; poly(r.pts, 3); g.strokeStyle = '#1b1b1f'; g.lineWidth = 8; g.stroke(); g.strokeStyle = LINE_COL[compOf(r) % LINE_COL.length]; g.lineWidth = 5; g.stroke(); }
  // le metro : en tirets epais, une couleur par ligne
  for (const m of metroLinks()){ if (m.side !== me) continue; const p = worldToScreen(m.a.ca, m.a.cb, 0), q = worldToScreen(m.b.ca, m.b.cb, 0); g.beginPath(); g.moveTo(p[0], p[1]); g.lineTo(q[0], q[1]); g.strokeStyle = LINE_COL[(m.line + 3) % LINE_COL.length]; g.lineWidth = 4; g.setLineDash([8, 5]); g.stroke(); }
  g.setLineDash([]);
  // les arrets : ronds blancs cercles de noir ; les villes : leur nom
  const dot = (a: number, b: number, r: number) => { const q = worldToScreen(a, b, 0); g.beginPath(); g.arc(q[0], q[1], r, 0, Math.PI * 2); g.fillStyle = '#fff'; g.fill(); g.lineWidth = 2.5; g.strokeStyle = '#1b1b1f'; g.stroke(); };
  for (const l of SH.BLD as Building[]){ if (!l.done || (l.side !== me && !seen(l.ca, l.cb))) continue; if (l.type === 'gare') dot(l.ca, l.cb, 7); else if (l.type === 'metro') dot(l.ca, l.cb, 5); }
  g.font = '700 13px "Space Grotesk", system-ui, sans-serif'; g.textAlign = 'center';
  for (const l of SH.BLD as Building[]){ if (!l.done || !isCity(l) || !l.name || (l.side !== me && !seen(l.ca, l.cb))) continue; const q = worldToScreen(l.ca, l.cb, 0); const iso = isolated(l); g.fillStyle = '#1b1b1f'; g.fillRect(q[0] - 4, q[1] - 4, 8, 8); g.lineWidth = 4; g.strokeStyle = '#fff'; const txt = l.name + (iso ? ' (isolée)' : ''); g.strokeText(txt, q[0], q[1] - 10); g.fillStyle = l.side === 'ccp' ? '#9c1c2b' : '#1d4f91'; g.fillText(txt, q[0], q[1] - 10); }
  for (const tr of TRAINS){ if (tr.side !== me) continue; const p = polyAt(tr.pts, tr.cum, tr.s), q = worldToScreen(p[0], p[1], 0); g.fillStyle = '#1b1b1f'; g.fillRect(q[0] - 4, q[1] - 4, 8, 8); g.fillStyle = '#ffd23f'; g.fillRect(q[0] - 2, q[1] - 2, 4, 4); }
});

/* ---- sauvegarde ---- */
HOOKS.save.push((ext) => {
  ext.rails = RAILS.map(r => [r.side === 'usc' ? 0 : 1, r.pts.filter((_p, i) => i % 2 === 0 || i === r.pts.length - 1).map(p => [Math.round(p[0] * 10) / 10, Math.round(p[1] * 10) / 10])]);
  ext.dirt = (SH.ROADS as Road[]).map((r, i) => r.dirt ? i : -1).filter(i => i >= 0);
});
HOOKS.load.push((ext) => {
  RAILS.length = 0;
  if (Array.isArray(ext.rails)) for (const r of ext.rails) if (Array.isArray(r) && Array.isArray(r[1]) && r[1].length > 1){
    const raw = (r[1] as unknown[]).filter(Array.isArray).map(p => [+(p as number[])[0], +(p as number[])[1]] as Vec2), pts: Vec2[] = [raw[0]];
    for (let k = 1; k < raw.length; k++){ const s = sampleLine(raw[k - 1], raw[k]); for (let j = 1; j < s.length; j++) pts.push(s[j]); }
    RAILS.push(makeRoad(pts, r[0] ? 'ccp' : 'usc'));
  }
  if (Array.isArray(ext.dirt)){ for (const i of ext.dirt){ const r = (SH.ROADS as Road[])[+i]; if (r){ r.dirt = true; repaintRoad(r); } } buildGraph(); }
  linesChanged();
});
HOOKS.reset.push(() => { RAILS.length = 0; TRAINS.length = 0; RG = graphOf([]); PASS.clear(); LINKED.clear(); HOME.clear(); METRO = []; METRO_VER = -1; railPts = []; setLines(false); hideCard(); });
