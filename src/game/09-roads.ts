import { SH } from './00-shared.ts';
import type { Building, Light, Side } from './00-shared.ts';
import type { Vec2 } from './02-ground.ts';
import { M, SIDES, clamp, hash2 } from './01-core.ts';
import { GA0, GB0, GH, GSC, GW, T_DIRT, T_ROAD, T_ROCK, T_SEA, T_WALK, cellOf, gBase, gLand, groundDirty, gTone, gType, resetArea, typeAt } from './02-ground.ts';
import { LAMP_POS, cutTreesAlong } from './07-world.ts';
import { sideAt } from './08-territory.ts';
/* ================= routes : droites ou courbes, raccordees entre elles, parcourues par les voitures ================= */
export const RW = 6, SW = 3, RWS = RW + SW;
/** Une route : ses points tous les ~4 unites, la longueur cumulee a chaque point, sa longueur et sa boite (a0, a1, b0, b1). */
export interface Road { id: number; side: Side; pts: Vec2[]; cum: number[]; len: number; box: [number, number, number, number]; dirt?: boolean }
/** Graphe des routes : un noeud a chaque bout et croisement, une arete entre deux noeuds (avec sa geometrie). */
export interface RoadNode { a: number; b: number; side: Side; comp: number }
export interface RoadEdge { n0: number; n1: number; pts: Vec2[]; cum: number[]; len: number; side: Side; road: number; dirt?: boolean }
/** Une voiture : son arete, sa position le long (s), son sens, sa vitesse, et ses phares. */
export interface Car { id: number; side: Side; e: number; s: number; dir: number; v: number; hops: number; pos: { a: number; b: number; ang: number } | null; light: Light & { kind: 'cone' } }
/** Un rectangle au sol (un batiment, une zone). */
type Rect = { a0: number; a1: number; b0: number; b1: number };
SH.ROADS = []; export let ROAD_ID = 1;
export function makeRoad(pts: Vec2[], side: Side, id?: number): Road {
  const cum = [0];
  for (let k = 1; k < pts.length; k++) cum.push(cum[k - 1] + Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]));
  let a0 = 1e9, a1 = -1e9, b0 = 1e9, b1 = -1e9;
  for (const [a, b] of pts){ a0 = Math.min(a0, a); a1 = Math.max(a1, a); b0 = Math.min(b0, b); b1 = Math.max(b1, b); }
  return { id: id || ROAD_ID++, side, pts, cum, len: cum[cum.length - 1], box: [a0, a1, b0, b1] };
}
export function sampleLine(p: Vec2, q: Vec2): Vec2[] {
  const L = Math.hypot(q[0] - p[0], q[1] - p[1]), n = Math.max(1, Math.ceil(L / 4)), out: Vec2[] = [];
  for (let k = 0; k <= n; k++) out.push([p[0] + (q[0] - p[0]) * k / n, p[1] + (q[1] - p[1]) * k / n]);
  return out;
}
export function sampleCurve(p: Vec2, c: Vec2, q: Vec2): Vec2[] {
  const L = Math.hypot(c[0] - p[0], c[1] - p[1]) + Math.hypot(q[0] - c[0], q[1] - c[1]), n = Math.max(2, Math.ceil(L / 4)), out: Vec2[] = [];
  for (let k = 0; k <= n; k++){ const t = k / n, u = 1 - t; out.push([u * u * p[0] + 2 * u * t * c[0] + t * t * q[0], u * u * p[1] + 2 * u * t * c[1] + t * t * q[1]]); }
  return out;
}
// point d'un segment le plus proche : [distance, s entre 0 et 1]
export function segDist(pa: number, pb: number, qa: number, qb: number, a: number, b: number): [number, number] {
  const da = qa - pa, db = qb - pb, L2 = da * da + db * db || 1;
  const s = clamp(((a - pa) * da + (b - pb) * db) / L2, 0, 1);
  return [Math.hypot(pa + da * s - a, pb + db * s - b), s];
}
// point d'une route le plus proche : distance, position le long, coordonnees
export function roadNearest(r: Road, a: number, b: number): [number, number, number, number] {
  let best: [number, number, number, number] = [1e9, 0, 0, 0];
  for (let k = 0; k + 1 < r.pts.length; k++){
    const [d, s] = segDist(r.pts[k][0], r.pts[k][1], r.pts[k + 1][0], r.pts[k + 1][1], a, b);
    if (d < best[0]){ const L = r.cum[k + 1] - r.cum[k]; best = [d, r.cum[k] + s * L, r.pts[k][0] + (r.pts[k + 1][0] - r.pts[k][0]) * s, r.pts[k][1] + (r.pts[k + 1][1] - r.pts[k][1]) * s]; }
  }
  return best;
}
export function nearRoad(a: number, b: number, maxD: number, side?: Side): { r: Road; d: number; s: number; a: number; b: number } | null {
  let best: { r: Road; d: number; s: number; a: number; b: number } | null = null;
  for (const r of SH.ROADS){
    if (side && r.side !== side) continue;
    if (a < r.box[0] - maxD || a > r.box[1] + maxD || b < r.box[2] - maxD || b > r.box[3] + maxD) continue;
    const n = roadNearest(r, a, b); if (n[0] <= maxD && (!best || n[0] < best.d)) best = { r, d: n[0], s: n[1], a: n[2], b: n[3] };
  }
  return best;
}
// point a la position s (en unites) le long d'une polyligne, et le cap
export function polyAt(pts: Vec2[], cum: number[], s: number): [number, number, number] {
  let k = 0; while (k < cum.length - 2 && cum[k + 1] < s) k++;
  const L = (cum[k + 1] - cum[k]) || 1, f = clamp((s - cum[k]) / L, 0, 1);
  return [pts[k][0] + (pts[k + 1][0] - pts[k][0]) * f, pts[k][1] + (pts[k + 1][1] - pts[k][1]) * f, Math.atan2(pts[k + 1][1] - pts[k][1], pts[k + 1][0] - pts[k][0])];
}

/* ---- peinture au sol : trottoirs, chaussee, ligne blanche en tirets, carrefours sans ligne ---- */
export function paintRoadsArea(a0: number, a1: number, b0: number, b1: number): void {
  const ia0 = Math.max(0, Math.floor((a0 - GA0) * GSC)), ia1 = Math.min(GW - 1, Math.ceil((a1 - GA0) * GSC));
  const ib0 = Math.max(0, Math.floor((b0 - GB0) * GSC)), ib1 = Math.min(GH - 1, Math.ceil((b1 - GB0) * GSC));
  if (ia0 > ia1 || ib0 > ib1) return;
  // les grandes zones sont peintes par tuiles, pour garder des tableaux de travail petits
  const T = 512;
  if (ia1 - ia0 > T || ib1 - ib0 > T){
    for (let y = ib0; y <= ib1; y += T) for (let x = ia0; x <= ia1; x += T) paintTile(x, Math.min(ia1, x + T - 1), y, Math.min(ib1, y + T - 1));
    return;
  }
  paintTile(ia0, ia1, ib0, ib1);
}
export function paintTile(ia0: number, ia1: number, ib0: number, ib1: number): void {
  resetArea(ia0, ia1, ib0, ib1);
  const w = ia1 - ia0 + 1, h = ib1 - ib0 + 1, cnt = new Uint8Array(w * h), last = new Int32Array(w * h);
  const A0 = GA0 + ia0 / GSC, A1 = GA0 + (ia1 + 1) / GSC, B0 = GB0 + ib0 / GSC, B1 = GB0 + (ib1 + 1) / GSC;
  const list = SH.ROADS.filter(r => r.box[1] + RWS >= A0 && r.box[0] - RWS <= A1 && r.box[3] + RWS >= B0 && r.box[2] - RWS <= B1);
  if (!list.length) return;
  const each = (r: Road, pad: number, f: (i: number, j: number, d: number, along: number) => void): void => {
    for (let k = 0; k + 1 < r.pts.length; k++){
      const [pa, pb] = r.pts[k], [qa, qb] = r.pts[k + 1], segL = r.cum[k + 1] - r.cum[k];
      const xa = Math.max(ia0, Math.floor((Math.min(pa, qa) - pad - GA0) * GSC)), xb = Math.min(ia1, Math.ceil((Math.max(pa, qa) + pad - GA0) * GSC));
      const ya = Math.max(ib0, Math.floor((Math.min(pb, qb) - pad - GB0) * GSC)), yb = Math.min(ib1, Math.ceil((Math.max(pb, qb) + pad - GB0) * GSC));
      for (let ib = ya; ib <= yb; ib++) for (let ia = xa; ia <= xb; ia++){
        const a = GA0 + (ia + .5) / GSC, b = GB0 + (ib + .5) / GSC, [d, s] = segDist(pa, pb, qa, qb, a, b);
        if (d >= pad) continue;
        const i = ib * GW + ia, t = gBase[i];
        if (t === T_SEA || t === T_ROCK) continue;
        f(i, (ib - ib0) * w + (ia - ia0), d, r.cum[k] + s * segL);
      }
    }
  };
  // chemin de terre : de la terre battue, sans trottoir ni ligne (etape 6)
  for (const r of list) if (r.dirt) each(r, RW - 1, (i, _j, d, along) => { if (gType[i] === T_ROAD) return; gType[i] = T_DIRT; gTone[i] = (d > 1.6 && d < 2.6) || hash2(Math.floor(along * 2), Math.floor(d * 3)) < .25 ? 2 : 0; });
  const paved = list.filter(r => !r.dirt);
  for (const r of paved) each(r, RWS, (i, j, d) => { if (gType[i] === T_ROAD) return; gType[i] = T_WALK; gTone[i] = (d >= RW && d < RW + .7) ? 16 : 1; });
  for (const r of paved) each(r, RW, (i, j, d, along) => {
    gType[i] = T_ROAD;
    if (last[j] !== r.id){ last[j] = r.id; if (cnt[j] < 9) cnt[j]++; }
    gTone[i] = (d < .5 && (Math.floor(along / 5) & 1) === 0 && along > RW + 2 && along < r.len - RW - 2) ? 16 : 0;
  });
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (cnt[y * w + x] > 1) gTone[(ib0 + y) * GW + ia0 + x] = 0;
  groundDirty(ia0, ia1, ib0, ib1);
}

// le sol vient d'etre refait : on ne repeint que la ou passent des routes (repeindre toute la carte prenait une demi-seconde sur les grandes)
export function repaintAllRoads(): void { for (const r of SH.ROADS) repaintRoad(r); }
export function repaintRoad(r: Road): void { paintRoadsArea(r.box[0] - RWS - 2, r.box[1] + RWS + 2, r.box[2] - RWS - 2, r.box[3] + RWS + 2); SH.mapDirtyRect(r.box[0] - RWS, r.box[1] + RWS, r.box[2] - RWS, r.box[3] + RWS); }

/* ---- graphe : noeuds aux bouts et aux croisements, aretes avec leur geometrie ---- */
export let NODES: RoadNode[] = [], EDGES: RoadEdge[] = [], NODE_EDGES: number[][] = [];
/** un graphe de voies (routes, rails) : noeuds aux bouts, aux croisements et aux points d'arret demandes */
export interface Graph { nodes: RoadNode[]; edges: RoadEdge[]; nodeEdges: number[][] }
export function nodeIn(g: Graph, a: number, b: number, side: Side): number {
  for (let i = 0; i < g.nodes.length; i++){ const n = g.nodes[i]; if (Math.abs(n.a - a) < 2.5 && Math.abs(n.b - b) < 2.5) return i; }
  g.nodes.push({ a, b, side, comp: -1 }); g.nodeEdges.push([]); return g.nodes.length - 1;
}
export function nodeAt(a: number, b: number, side: Side): number { return nodeIn({ nodes: NODES, edges: EDGES, nodeEdges: NODE_EDGES }, a, b, side); }
export function segInter(p: number[], q: number[], r: number[], s: number[]): number | null {
  const d = (q[0] - p[0]) * (s[1] - r[1]) - (q[1] - p[1]) * (s[0] - r[0]); if (Math.abs(d) < 1e-9) return null;
  const t = ((r[0] - p[0]) * (s[1] - r[1]) - (r[1] - p[1]) * (s[0] - r[0])) / d, u = ((r[0] - p[0]) * (q[1] - p[1]) - (r[1] - p[1]) * (q[0] - p[0])) / d;
  return (t >= -1e-6 && t <= 1 + 1e-6 && u >= -1e-6 && u <= 1 + 1e-6) ? t : null;
}
// stops : des points ou couper les voies qui passent a moins de stopR (les gares)
export function graphOf(list: Road[], stops: Vec2[] = [], stopR = 0): Graph {
  const g: Graph = { nodes: [], edges: [], nodeEdges: [] };
  for (const r of list){
    const cuts = [0, r.len];
    for (const o of list){
      if (o === r || o.box[0] > r.box[1] + 3 || o.box[1] < r.box[0] - 3 || o.box[2] > r.box[3] + 3 || o.box[3] < r.box[2] - 3) continue;
      // croisements
      for (let k = 0; k + 1 < r.pts.length; k++) for (let j = 0; j + 1 < o.pts.length; j++){
        const t = segInter(r.pts[k], r.pts[k + 1], o.pts[j], o.pts[j + 1]); if (t != null) cuts.push(r.cum[k] + t * (r.cum[k + 1] - r.cum[k]));
      }
      // un bout de l'autre voie pose sur celle-ci
      for (const e of [o.pts[0], o.pts[o.pts.length - 1]]){ const n = roadNearest(r, e[0], e[1]); if (n[0] < 2) cuts.push(n[1]); }
    }
    for (const sp of stops){ const n = roadNearest(r, sp[0], sp[1]); if (n[0] < stopR) cuts.push(n[1]); }
    cuts.sort((x, y) => x - y);
    const st = cuts.filter((v, i) => i === 0 || v - cuts[i - 1] > 3);
    if (r.len - st[st.length - 1] > .01) st.push(r.len); else st[st.length - 1] = r.len;
    for (let k = 0; k + 1 < st.length; k++){
      const s0 = st[k], s1 = st[k + 1]; if (s1 - s0 < 1) continue;
      const p0 = polyAt(r.pts, r.cum, s0), p1 = polyAt(r.pts, r.cum, s1), pts: Vec2[] = [[p0[0], p0[1]]];
      for (let j = 0; j < r.pts.length; j++) if (r.cum[j] > s0 + .01 && r.cum[j] < s1 - .01) pts.push(r.pts[j]);
      pts.push([p1[0], p1[1]]);
      const n0 = nodeIn(g, pts[0][0], pts[0][1], r.side), n1 = nodeIn(g, pts[pts.length - 1][0], pts[pts.length - 1][1], r.side);
      if (n0 === n1) continue;
      const cum = [0]; for (let j = 1; j < pts.length; j++) cum.push(cum[j - 1] + Math.hypot(pts[j][0] - pts[j - 1][0], pts[j][1] - pts[j - 1][1]));
      const e: RoadEdge = { n0, n1, pts, cum, len: cum[cum.length - 1], side: r.side, road: r.id, dirt: r.dirt };
      g.nodeEdges[n0].push(g.edges.length); g.nodeEdges[n1].push(g.edges.length); g.edges.push(e);
    }
  }
  // composantes connexes
  let c = 0;
  for (let i = 0; i < g.nodes.length; i++){
    if (g.nodes[i].comp >= 0) continue;
    const stk = [i]; g.nodes[i].comp = c;
    while (stk.length){ const n = stk.pop() as number; for (const ei of g.nodeEdges[n]){ const e = g.edges[ei], m = e.n0 === n ? e.n1 : e.n0; if (g.nodes[m].comp < 0){ g.nodes[m].comp = c; stk.push(m); } } }
    c++;
  }
  return g;
}
export function buildGraph(): void {
  const g = graphOf(SH.ROADS);
  NODES = g.nodes; EDGES = g.edges; NODE_EDGES = g.nodeEdges;
  // une route n'est utile que si elle rejoint le QG
  ROAD_COMP.clear();
  for (const e of EDGES) ROAD_COMP.set(e.road, NODES[e.n0].comp);
  rebuildLamps();
}
export const ROAD_COMP = new Map<number, number>();
// lampadaires tous les ~46 unites, un cote puis l'autre
export function rebuildLamps(): void {
  LAMP_POS.length = 0;
  for (const r of SH.ROADS){
    let k = 0;
    for (let s = 14; s < r.len - 8; s += 46, k++){
      const p = polyAt(r.pts, r.cum, s), n = (k & 1) ? 1 : -1, off = RW + 1.6;
      const a = p[0] - Math.sin(p[2]) * off * n, b = p[1] + Math.cos(p[2]) * off * n;
      if (typeAt(a, b) === T_WALK) LAMP_POS.push([a, b]);
    }
  }
}
// distance entre un rectangle et une route
export function rectRoadDist(l: Rect, r: Road): number {
  if (l.a1 < r.box[0] - 30 || l.a0 > r.box[1] + 30 || l.b1 < r.box[2] - 30 || l.b0 > r.box[3] + 30) return 1e9;
  let best = 1e9;
  for (const [a, b] of r.pts){ const d = Math.hypot(Math.max(l.a0 - a, 0, a - l.a1), Math.max(l.b0 - b, 0, b - l.b1)); if (d < best) best = d; }
  return best;
}
// un batiment est desservi s'il touche une route reliee a celle du QG de son camp
export function roadAccess(l: Building): boolean {
  const E = SH.ECO[l.type]; if (E && E.noRoad) return true;
  // relie a un hotel de ville : le QG ou un chef-lieu (etape 4)
  const hqComps = new Set<number | undefined>();
  for (const hq of SH.BLD) if ((hq.type === 'qg' || hq.type === 'ville') && hq.side === l.side) for (const r of SH.ROADS) if (r.side === l.side && rectRoadDist(hq, r) < RW + 10) hqComps.add(ROAD_COMP.get(r.id));
  for (const r of SH.ROADS){
    if (r.side !== l.side || rectRoadDist(l, r) > RW + 10) continue;
    if (hqComps.has(ROAD_COMP.get(r.id))) return true;
  }
  return false;
}

/* ---- tracer une route : verifications ---- */
// un pont passe au-dessus de l'eau (90 pas au plus), un tunnel sous la roche (avec la recherche des tunnels, etape 8)
export const BRIDGE_MAX = 90;
export const overWater = (a: number, b: number): boolean => { const i = cellOf(a, b); return i < 0 || gBase[i] === T_SEA || gLand[i] < 3; };
export const underRock = (a: number, b: number): boolean => { const i = cellOf(a, b); return i >= 0 && gBase[i] === T_ROCK; };
export function lineProblem(pts: Vec2[], side: Side, what: string): string {
  let L = 0; for (let k = 1; k < pts.length; k++) L += Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]);
  if (L < 12) return 'Trop court : tire la ' + what + ' un peu plus loin.';
  if (L > 700) return 'Trop long : fais-la en plusieurs morceaux.';
  const ends = [pts[0], pts[pts.length - 1]];
  for (const [a, b] of ends) if (overWater(a, b)) return 'Une ' + what + ' commence et finit sur la terre ferme.';
  let wet = 0;
  for (let k = 0; k < pts.length; k++){
    const [a, b] = pts[k];
    if (overWater(a, b)){
      wet += k ? Math.hypot(a - pts[k - 1][0], b - pts[k - 1][1]) : 0;
      if (wet > BRIDGE_MAX) return 'Trop de mer : un pont ne dépasse pas ' + BRIDGE_MAX + ' pas.';
      continue;
    }
    wet = 0;
    if (underRock(a, b)){
      if (SH.hasTech && !SH.hasTech(side, 'tunnels')) return 'Des rochers barrent le passage : il faut la recherche des tunnels.';
      continue;
    }
    if (sideAt(a, b) !== side) return 'Une ' + what + ' ne se trace que dans ton territoire.';
    for (const l of SH.BLD){ if (a > l.a0 - RWS + 1 && a < l.a1 + RWS - 1 && b > l.b0 - RWS + 1 && b < l.b1 + RWS - 1) return 'Un bâtiment bloque le passage.'; }
  }
  for (const w of SH.WALLS) for (let k = 0; k + 1 < pts.length; k++) if (segInter(pts[k], pts[k + 1], [w.pa, w.pb], [w.qa, w.qb]) != null) return 'Le Rideau de Laine ne se traverse pas. Pose un Checkpoint à côté.';
  return '';
}
export function roadProblem(pts: Vec2[], side: Side): string {
  const why = lineProblem(pts, side, 'route'); if (why) return why;
  // pas de doublon : une route posee presque entierement sur une autre
  let over = 0; for (const [a, b] of pts){ const n = nearRoad(a, b, 3); if (n) over++; }
  if (over > pts.length * .8) return 'Il y a déjà une route ici.';
  return '';
}
// prix en laine : la terre battue coute moitie moins, un pont quatre fois plus, un tunnel cinq fois plus
export const lineLength = (pts: Vec2[]): { land: number; wet: number; rock: number } => {
  const o = { land: 0, wet: 0, rock: 0 };
  for (let k = 1; k < pts.length; k++){ const L = Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]), m = [(pts[k][0] + pts[k - 1][0]) / 2, (pts[k][1] + pts[k - 1][1]) / 2]; if (overWater(m[0], m[1])) o.wet += L; else if (underRock(m[0], m[1])) o.rock += L; else o.land += L; }
  return o;
};
export const roadCost = (pts: Vec2[], dirt?: boolean): number => { const o = lineLength(pts); return Math.max(2, Math.ceil(o.land / (dirt ? 18 : 9) + o.wet * 4 / 9 + o.rock * 5 / 9)); };
// pose effective (le joueur comme l'IA passent par ici)
export function addRoad(pts: Vec2[], side: Side, dirt?: boolean): Road {
  const r = makeRoad(pts, side); if (dirt) r.dirt = true;
  SH.ROADS.push(r);
  cutTreesAlong(pts, RWS);
  repaintRoad(r); buildGraph(); reseatCars(); SH.refreshAccess();
  if (SH.linesChanged) SH.linesChanged();
  return r;
}
export function removeRoad(r: Road): void {
  const k = SH.ROADS.indexOf(r); if (k < 0) return;
  SH.ROADS.splice(k, 1); repaintRoad(r); buildGraph(); reseatCars(); SH.refreshAccess();
  if (SH.linesChanged) SH.linesChanged();
}
// accrocher un point a une route ou un bout de route proche
export function snapRoadPoint(a: number, b: number, side?: Side): Vec2 {
  let best: Vec2 | null = null, bd = 12;
  for (const r of SH.ROADS){ if (side && r.side !== side) continue; for (const e of [r.pts[0], r.pts[r.pts.length - 1]]){ const d = Math.hypot(e[0] - a, e[1] - b); if (d < bd){ bd = d; best = [e[0], e[1]]; } } }
  if (best) return best;
  const n = nearRoad(a, b, 10, side);
  return n ? [n.a, n.b] : [Math.round(a), Math.round(b)];
}

/* ---- voitures : elles roulent a droite sur les aretes du graphe ---- */
export const CARS: Car[] = [];
export function reseatCars(): void {
  const want: Record<Side, number> = { usc: 0, ccp: 0 };
  for (const s of SIDES) want[s] = Math.min(28, Math.floor((SH.RES[s] ? SH.RES[s].pop : 0) / 9));
  CARS.length = 0;
  for (const s of SIDES){
    const pool: number[] = []; EDGES.forEach((e, i) => { if (e.side === s && e.len > 10) pool.push(i); });
    if (!pool.length) continue;
    for (let k = 0; k < want[s]; k++){
      const ei = pool[Math.floor(hash2(k * 13 + (s === 'usc' ? 1 : 2), CARS.length) * pool.length)], e = EDGES[ei];
      CARS.push({ id: CARS.length, side: s, e: ei, s: hash2(k, 5) * e.len, dir: hash2(k, 9) < .5 ? 1 : -1, v: 12 + hash2(k, 11) * 7, hops: 0, pos: null,
        light: { kind: 'cone', a: 0, b: 0, da: 1, db: 0, tan: .32, w0: 1.5, len: 30, k: 1.3, att: .8, m: M.GLOW } });
    }
  }
}
export function stepCars(dt: number): void {
  for (const c of CARS){
    let e = EDGES[c.e]; if (!e){ c.pos = null; continue; }
    c.s += c.v * dt * c.dir * (e.dirt ? .6 : 1);
    let guard = 0;
    while ((c.s > e.len || c.s < 0) && guard++ < 6){
      const node = c.s > e.len ? e.n1 : e.n0, over = c.s > e.len ? c.s - e.len : -c.s;
      const opts = NODE_EDGES[node].filter(i => i !== c.e);
      const ni = opts.length ? opts[Math.floor(hash2(c.id * 97 + c.hops++, 31) * opts.length)] : c.e;
      const ne = EDGES[ni];
      c.e = ni; e = ne;
      if (ne.n0 === node){ c.dir = 1; c.s = over; } else { c.dir = -1; c.s = ne.len - over; }
    }
    const p = polyAt(e.pts, e.cum, clamp(c.s, 0, e.len)), ang = c.dir > 0 ? p[2] : p[2] + Math.PI;
    const a = p[0] - Math.sin(ang) * 3, b = p[1] + Math.cos(ang) * 3;
    c.pos = { a, b, ang };
    Object.assign(c.light, { a: a + Math.cos(ang) * 6, b: b + Math.sin(ang) * 6, da: Math.cos(ang), db: Math.sin(ang) });
  }
}
