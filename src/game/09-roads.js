/* ================= routes : droites ou courbes, raccordees entre elles, parcourues par les voitures ================= */
const RW = 6, SW = 3, RWS = RW + SW;
let ROADS = [], ROAD_ID = 1;
// une route : ses points tous les ~4 unites, la longueur cumulee, sa boite
function makeRoad(pts, side, id){
  const cum = [0];
  for (let k = 1; k < pts.length; k++) cum.push(cum[k - 1] + Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]));
  let a0 = 1e9, a1 = -1e9, b0 = 1e9, b1 = -1e9;
  for (const [a, b] of pts){ a0 = Math.min(a0, a); a1 = Math.max(a1, a); b0 = Math.min(b0, b); b1 = Math.max(b1, b); }
  return { id: id || ROAD_ID++, side, pts, cum, len: cum[cum.length - 1], box: [a0, a1, b0, b1] };
}
function sampleLine(p, q){
  const L = Math.hypot(q[0] - p[0], q[1] - p[1]), n = Math.max(1, Math.ceil(L / 4)), out = [];
  for (let k = 0; k <= n; k++) out.push([p[0] + (q[0] - p[0]) * k / n, p[1] + (q[1] - p[1]) * k / n]);
  return out;
}
function sampleCurve(p, c, q){
  const L = Math.hypot(c[0] - p[0], c[1] - p[1]) + Math.hypot(q[0] - c[0], q[1] - c[1]), n = Math.max(2, Math.ceil(L / 4)), out = [];
  for (let k = 0; k <= n; k++){ const t = k / n, u = 1 - t; out.push([u * u * p[0] + 2 * u * t * c[0] + t * t * q[0], u * u * p[1] + 2 * u * t * c[1] + t * t * q[1]]); }
  return out;
}
// point d'un segment le plus proche : [distance, s entre 0 et 1]
function segDist(pa, pb, qa, qb, a, b){
  const da = qa - pa, db = qb - pb, L2 = da * da + db * db || 1;
  const s = clamp(((a - pa) * da + (b - pb) * db) / L2, 0, 1);
  return [Math.hypot(pa + da * s - a, pb + db * s - b), s];
}
// point d'une route le plus proche : distance, position le long, coordonnees
function roadNearest(r, a, b){
  let best = [1e9, 0, 0, 0];
  for (let k = 0; k + 1 < r.pts.length; k++){
    const [d, s] = segDist(r.pts[k][0], r.pts[k][1], r.pts[k + 1][0], r.pts[k + 1][1], a, b);
    if (d < best[0]){ const L = r.cum[k + 1] - r.cum[k]; best = [d, r.cum[k] + s * L, r.pts[k][0] + (r.pts[k + 1][0] - r.pts[k][0]) * s, r.pts[k][1] + (r.pts[k + 1][1] - r.pts[k][1]) * s]; }
  }
  return best;
}
function nearRoad(a, b, maxD, side){
  let best = null;
  for (const r of ROADS){
    if (side && r.side !== side) continue;
    if (a < r.box[0] - maxD || a > r.box[1] + maxD || b < r.box[2] - maxD || b > r.box[3] + maxD) continue;
    const n = roadNearest(r, a, b); if (n[0] <= maxD && (!best || n[0] < best.d)) best = { r, d: n[0], s: n[1], a: n[2], b: n[3] };
  }
  return best;
}
// point a la position s (en unites) le long d'une polyligne, et le cap
function polyAt(pts, cum, s){
  let k = 0; while (k < cum.length - 2 && cum[k + 1] < s) k++;
  const L = (cum[k + 1] - cum[k]) || 1, f = clamp((s - cum[k]) / L, 0, 1);
  return [pts[k][0] + (pts[k + 1][0] - pts[k][0]) * f, pts[k][1] + (pts[k + 1][1] - pts[k][1]) * f, Math.atan2(pts[k + 1][1] - pts[k][1], pts[k + 1][0] - pts[k][0])];
}

/* ---- peinture au sol : trottoirs, chaussee, ligne blanche en tirets, carrefours sans ligne ---- */
function paintRoadsArea(a0, a1, b0, b1){
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
function paintTile(ia0, ia1, ib0, ib1){
  resetArea(ia0, ia1, ib0, ib1);
  const w = ia1 - ia0 + 1, h = ib1 - ib0 + 1, cnt = new Uint8Array(w * h), last = new Int32Array(w * h);
  const A0 = GA0 + ia0 / GSC, A1 = GA0 + (ia1 + 1) / GSC, B0 = GB0 + ib0 / GSC, B1 = GB0 + (ib1 + 1) / GSC;
  const list = ROADS.filter(r => r.box[1] + RWS >= A0 && r.box[0] - RWS <= A1 && r.box[3] + RWS >= B0 && r.box[2] - RWS <= B1);
  if (!list.length) return;
  const each = (r, pad, f) => {
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
  for (const r of list) each(r, RWS, (i, j, d) => { if (gType[i] === T_ROAD) return; gType[i] = T_WALK; gTone[i] = (d >= RW && d < RW + .7) ? 16 : 1; });
  for (const r of list) each(r, RW, (i, j, d, along) => {
    gType[i] = T_ROAD;
    if (last[j] !== r.id){ last[j] = r.id; if (cnt[j] < 9) cnt[j]++; }
    gTone[i] = (d < .5 && (Math.floor(along / 5) & 1) === 0 && along > RW + 2 && along < r.len - RW - 2) ? 16 : 0;
  });
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (cnt[y * w + x] > 1) gTone[(ib0 + y) * GW + ia0 + x] = 0;
}
function repaintAllRoads(){ paintRoadsArea(GA0, GA0 + GW / GSC, GB0, GB0 + GH / GSC); }
function repaintRoad(r){ paintRoadsArea(r.box[0] - RWS - 2, r.box[1] + RWS + 2, r.box[2] - RWS - 2, r.box[3] + RWS + 2); mapDirtyRect(r.box[0] - RWS, r.box[1] + RWS, r.box[2] - RWS, r.box[3] + RWS); }

/* ---- graphe : noeuds aux bouts et aux croisements, aretes avec leur geometrie ---- */
let NODES = [], EDGES = [], NODE_EDGES = [];
function nodeAt(a, b, side){
  for (let i = 0; i < NODES.length; i++){ const n = NODES[i]; if (Math.abs(n.a - a) < 2.5 && Math.abs(n.b - b) < 2.5) return i; }
  NODES.push({ a, b, side, comp: -1 }); NODE_EDGES.push([]); return NODES.length - 1;
}
function segInter(p, q, r, s){
  const d = (q[0] - p[0]) * (s[1] - r[1]) - (q[1] - p[1]) * (s[0] - r[0]); if (Math.abs(d) < 1e-9) return null;
  const t = ((r[0] - p[0]) * (s[1] - r[1]) - (r[1] - p[1]) * (s[0] - r[0])) / d, u = ((r[0] - p[0]) * (q[1] - p[1]) - (r[1] - p[1]) * (q[0] - p[0])) / d;
  return (t >= -1e-6 && t <= 1 + 1e-6 && u >= -1e-6 && u <= 1 + 1e-6) ? t : null;
}
function buildGraph(){
  NODES = []; EDGES = []; NODE_EDGES = [];
  for (const r of ROADS){
    const cuts = [0, r.len];
    for (const o of ROADS){
      if (o === r || o.box[0] > r.box[1] + 3 || o.box[1] < r.box[0] - 3 || o.box[2] > r.box[3] + 3 || o.box[3] < r.box[2] - 3) continue;
      // croisements
      for (let k = 0; k + 1 < r.pts.length; k++) for (let j = 0; j + 1 < o.pts.length; j++){
        const t = segInter(r.pts[k], r.pts[k + 1], o.pts[j], o.pts[j + 1]); if (t != null) cuts.push(r.cum[k] + t * (r.cum[k + 1] - r.cum[k]));
      }
      // un bout de l'autre route pose sur celle-ci
      for (const e of [o.pts[0], o.pts[o.pts.length - 1]]){ const n = roadNearest(r, e[0], e[1]); if (n[0] < 2) cuts.push(n[1]); }
    }
    cuts.sort((x, y) => x - y);
    const stops = cuts.filter((v, i) => i === 0 || v - cuts[i - 1] > 3);
    if (r.len - stops[stops.length - 1] > .01) stops.push(r.len); else stops[stops.length - 1] = r.len;
    for (let k = 0; k + 1 < stops.length; k++){
      const s0 = stops[k], s1 = stops[k + 1]; if (s1 - s0 < 1) continue;
      const pts = [polyAt(r.pts, r.cum, s0).slice(0, 2)];
      for (let j = 0; j < r.pts.length; j++) if (r.cum[j] > s0 + .01 && r.cum[j] < s1 - .01) pts.push(r.pts[j]);
      pts.push(polyAt(r.pts, r.cum, s1).slice(0, 2));
      const n0 = nodeAt(pts[0][0], pts[0][1], r.side), n1 = nodeAt(pts[pts.length - 1][0], pts[pts.length - 1][1], r.side);
      if (n0 === n1) continue;
      const cum = [0]; for (let j = 1; j < pts.length; j++) cum.push(cum[j - 1] + Math.hypot(pts[j][0] - pts[j - 1][0], pts[j][1] - pts[j - 1][1]));
      const e = { n0, n1, pts, cum, len: cum[cum.length - 1], side: r.side, road: r.id };
      NODE_EDGES[n0].push(EDGES.length); NODE_EDGES[n1].push(EDGES.length); EDGES.push(e);
    }
  }
  // composantes connexes : une route n'est utile que si elle rejoint le QG
  let c = 0;
  for (let i = 0; i < NODES.length; i++){
    if (NODES[i].comp >= 0) continue;
    const st = [i]; NODES[i].comp = c;
    while (st.length){ const n = st.pop(); for (const ei of NODE_EDGES[n]){ const e = EDGES[ei], m = e.n0 === n ? e.n1 : e.n0; if (NODES[m].comp < 0){ NODES[m].comp = c; st.push(m); } } }
    c++;
  }
  ROAD_COMP.clear();
  for (const e of EDGES) ROAD_COMP.set(e.road, NODES[e.n0].comp);
  rebuildLamps();
}
const ROAD_COMP = new Map();
// lampadaires tous les ~46 unites, un cote puis l'autre
function rebuildLamps(){
  LAMP_POS.length = 0;
  for (const r of ROADS){
    let k = 0;
    for (let s = 14; s < r.len - 8; s += 46, k++){
      const p = polyAt(r.pts, r.cum, s), n = (k & 1) ? 1 : -1, off = RW + 1.6;
      const a = p[0] - Math.sin(p[2]) * off * n, b = p[1] + Math.cos(p[2]) * off * n;
      if (typeAt(a, b) === T_WALK) LAMP_POS.push([a, b]);
    }
  }
}
// distance entre un rectangle et une route
function rectRoadDist(l, r){
  if (l.a1 < r.box[0] - 30 || l.a0 > r.box[1] + 30 || l.b1 < r.box[2] - 30 || l.b0 > r.box[3] + 30) return 1e9;
  let best = 1e9;
  for (const [a, b] of r.pts){ const d = Math.hypot(Math.max(l.a0 - a, 0, a - l.a1), Math.max(l.b0 - b, 0, b - l.b1)); if (d < best) best = d; }
  return best;
}
// un batiment est desservi s'il touche une route reliee a celle du QG de son camp
function roadAccess(l){
  const E = ECO[l.type]; if (E && E.noRoad) return true;
  const hq = BLD.find(o => o.type === 'qg' && o.side === l.side);
  const hqComps = new Set();
  if (hq) for (const r of ROADS) if (r.side === l.side && rectRoadDist(hq, r) < RW + 10) hqComps.add(ROAD_COMP.get(r.id));
  for (const r of ROADS){
    if (r.side !== l.side || rectRoadDist(l, r) > RW + 10) continue;
    if (hqComps.has(ROAD_COMP.get(r.id))) return true;
  }
  return false;
}

/* ---- tracer une route : verifications ---- */
function roadProblem(pts, side){
  let L = 0; for (let k = 1; k < pts.length; k++) L += Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]);
  if (L < 12) return 'Trop court : tire la route un peu plus loin.';
  if (L > 700) return 'Trop long : fais-la en plusieurs morceaux.';
  for (const [a, b] of pts){
    const i = cellOf(a, b);
    if (i < 0 || gBase[i] === T_SEA || gLand[i] < 3) return 'Pas de route dans la mer.';
    if (gBase[i] === T_ROCK) return 'Des rochers barrent le passage.';
    if (sideAt(a, b) !== side) return 'Une route ne se trace que dans ton territoire.';
    for (const l of BLD){ if (a > l.a0 - RWS + 1 && a < l.a1 + RWS - 1 && b > l.b0 - RWS + 1 && b < l.b1 + RWS - 1) return 'Un bâtiment bloque le passage.'; }
  }
  for (const w of WALLS) for (let k = 0; k + 1 < pts.length; k++) if (segInter(pts[k], pts[k + 1], [w.pa, w.pb], [w.qa, w.qb]) != null) return 'Le Rideau de Laine ne se traverse pas. Pose un Checkpoint à côté.';
  // pas de doublon : une route posee presque entierement sur une autre
  let over = 0; for (const [a, b] of pts){ const n = nearRoad(a, b, 3); if (n) over++; }
  if (over > pts.length * .8) return 'Il y a déjà une route ici.';
  return '';
}
const roadCost = (pts) => { let L = 0; for (let k = 1; k < pts.length; k++) L += Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]); return Math.max(2, Math.ceil(L / 9)); };
// pose effective (le joueur comme l'IA passent par ici)
function addRoad(pts, side){
  const r = makeRoad(pts, side);
  ROADS.push(r);
  cutTreesAlong(pts, RWS);
  repaintRoad(r); buildGraph(); reseatCars(); refreshAccess();
  return r;
}
function removeRoad(r){
  const k = ROADS.indexOf(r); if (k < 0) return;
  ROADS.splice(k, 1); repaintRoad(r); buildGraph(); reseatCars(); refreshAccess();
}
// accrocher un point a une route ou un bout de route proche
function snapRoadPoint(a, b, side){
  let best = null, bd = 12;
  for (const r of ROADS){ if (side && r.side !== side) continue; for (const e of [r.pts[0], r.pts[r.pts.length - 1]]){ const d = Math.hypot(e[0] - a, e[1] - b); if (d < bd){ bd = d; best = [e[0], e[1]]; } } }
  if (best) return best;
  const n = nearRoad(a, b, 10, side);
  return n ? [n.a, n.b] : [Math.round(a), Math.round(b)];
}

/* ---- voitures : elles roulent a droite sur les aretes du graphe ---- */
const CARS = [];
function reseatCars(){
  const want = { usc: 0, ccp: 0 };
  for (const s of SIDES) want[s] = Math.min(28, Math.floor((RES[s] ? RES[s].pop : 0) / 9));
  CARS.length = 0;
  for (const s of SIDES){
    const pool = []; EDGES.forEach((e, i) => { if (e.side === s && e.len > 10) pool.push(i); });
    if (!pool.length) continue;
    for (let k = 0; k < want[s]; k++){
      const ei = pool[Math.floor(hash2(k * 13 + (s === 'usc' ? 1 : 2), CARS.length) * pool.length)], e = EDGES[ei];
      CARS.push({ id: CARS.length, side: s, e: ei, s: hash2(k, 5) * e.len, dir: hash2(k, 9) < .5 ? 1 : -1, v: 12 + hash2(k, 11) * 7, hops: 0, pos: null,
        light: { kind: 'cone', a: 0, b: 0, da: 1, db: 0, tan: .32, w0: 1.5, len: 30, k: 1.3, att: .8, m: M.GLOW } });
    }
  }
}
function stepCars(dt){
  for (const c of CARS){
    let e = EDGES[c.e]; if (!e){ c.pos = null; continue; }
    c.s += c.v * dt * c.dir;
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
