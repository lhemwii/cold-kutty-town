/* ================= outils du joueur : observer, construire, routes, Rideau de Laine, demolir ================= */
const $ = (id) => document.getElementById(id);
// state.tool : walk, build, road, curve, wall, demolish, barge (choix d'une cote), landing (choix de la plage)
state.tool = 'walk'; state.buildType = 'maison'; state.sel = null;
const HINTS = {
  walk: 'Glisse pour te déplacer, molette pour zoomer, clic droit glissé pour tourner. Clique sur un bâtiment ou un chat.',
  build: 'Choisis un bâtiment puis clique dans ton territoire. Les bâtiments de la mer se posent face à l’eau.',
  road: 'Clique le départ, puis l’arrivée. La route continue depuis son bout : clic droit ou Échap pour arrêter.',
  curve: 'Clique le départ, puis le point qui tire la courbe, puis l’arrivée.',
  wall: 'Clique le début du Rideau de Laine puis sa fin. Il fige ta frontière. 3 laine tous les 10 pas.',
  demolish: 'Clique sur un bâtiment, une route ou un pan de mur pour le démolir. La moitié de la laine revient.',
  barge: 'Clique sur une côte : la barge part du port et y plante un avant-poste.',
  landing: 'Clique sur une côte de l’île pour y débarquer.'
};
let toolPts = [], hoverW = null, hoverB = null, ghost = null;
function setTool(m){
  state.tool = m; toolPts = [];
  for (const b of document.querySelectorAll('[data-tool]')) b.setAttribute('aria-pressed', String(b.dataset.tool === m));
  $('buildMenu').hidden = m !== 'build';
  $('modeHint').textContent = HINTS[m] || '';
  scene.classList.toggle('build', m === 'build' || m === 'road' || m === 'curve' || m === 'wall' || m === 'barge' || m === 'landing');
  scene.classList.toggle('demolish', m === 'demolish');
  ghost = null;
}
for (const b of document.querySelectorAll('[data-tool]')) b.addEventListener('click', () => { setTool(state.tool === b.dataset.tool && b.dataset.tool !== 'walk' ? 'walk' : b.dataset.tool); sfx('click'); });

let toastTimer = 0;
function toast(msg){ const el = $('toast'); el.textContent = msg; el.hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => el.hidden = true, 2800); }

/* ---- construire ---- */
// position proposee pour le batiment sous le curseur (arrondie a 2 unites), et sa direction s'il est au bord de l'eau
function buildSpot(a, b){
  const type = state.buildType, e = ECO[type], ca = Math.round(a / 2) * 2, cb = Math.round(b / 2) * 2;
  const dir = e && e.coast ? coastDir(ca, cb) : 0;
  return { type, ca, cb, dir, why: placeProblem(type, GAME.side, ca, cb, dir, false) };
}
function tryBuild(a, b){
  const s = buildSpot(a, b);
  if (s.why){ toast(s.why); sfx('click'); return; }
  const pr = priceOf(s.type, GAME.side);
  if (!canAfford(GAME.side, pr)){ toast('Il faut ' + costLabel(pr) + '.'); return; }
  pay(GAME.side, pr.l, pr.r, pr.c);
  const l = makeBuilding(s.type, GAME.side, s.ca, s.cb, s.dir);
  startBuilding(l);
  pushHistory({ kind: 'build', id: l.id, l: pr.l, r: pr.r, c: pr.c });
  toast(typeName(s.type, GAME.side) + ' : chantier lancé.');
  sfx('click'); ghost = null; saveSoon(); renderHUD();
}

/* ---- routes ---- */
function roadPreviewPts(){
  if (!hoverW) return null;
  const end = snapRoadPoint(hoverW[0], hoverW[1], GAME.side);
  if (state.tool === 'road' && toolPts.length === 1) return sampleLine(toolPts[0], end);
  if (state.tool === 'curve' && toolPts.length === 1) return sampleLine(toolPts[0], end);
  if (state.tool === 'curve' && toolPts.length === 2) return sampleCurve(toolPts[0], toolPts[1], end);
  return null;
}
function roadClick(a, b){
  const p = state.tool === 'curve' && toolPts.length === 1 ? [Math.round(a), Math.round(b)] : snapRoadPoint(a, b, GAME.side);
  toolPts.push(p);
  const need = state.tool === 'curve' ? 3 : 2;
  if (toolPts.length < need){ sfx('click'); return; }
  const pts = state.tool === 'curve' ? sampleCurve(toolPts[0], toolPts[1], toolPts[2]) : sampleLine(toolPts[0], toolPts[1]);
  const why = roadProblem(pts, GAME.side);
  if (why){ toast(why); toolPts.pop(); return; }
  const cost = roadCost(pts);
  if (!canPay(GAME.side, cost, 0)){ toast('Il faut ' + cost + ' laine pour cette route.'); toolPts.pop(); return; }
  pay(GAME.side, cost, 0);
  const r = addRoad(pts, GAME.side);
  pushHistory({ kind: 'road', id: r.id, l: cost });
  sfx('click'); saveSoon(); renderHUD();
  // on repart du bout pour enchainer
  toolPts = [pts[pts.length - 1]];
}

/* ---- Rideau de Laine ---- */
const WALL_STEP = 10, WALL_COST = 3;
function wallPieces(p, q){
  const L = Math.hypot(q[0] - p[0], q[1] - p[1]), n = Math.max(1, Math.round(L / WALL_STEP)), out = [];
  for (let k = 0; k < n; k++) out.push([p[0] + (q[0] - p[0]) * k / n, p[1] + (q[1] - p[1]) * k / n, p[0] + (q[0] - p[0]) * (k + 1) / n, p[1] + (q[1] - p[1]) * (k + 1) / n]);
  return out;
}
function wallProblem(pieces, side){
  if (!pieces.length) return 'Trop court.';
  for (const [pa, pb, qa, qb] of pieces) for (const f of [0, .5, 1]){
    const a = pa + (qa - pa) * f, b = pb + (qb - pb) * f;
    if (baseAt(a, b) === T_SEA || landDAt(a, b) < 2) return 'Pas de mur dans la mer.';
    if (sideAt(a, b) !== side) return 'Le Rideau se tricote dans ton territoire.';
    for (const l of BLD) if (a > l.a0 - 1 && a < l.a1 + 1 && b > l.b0 - 1 && b < l.b1 + 1) return 'Un bâtiment est sur le chemin.';
    if (nearRoad(a, b, RW + 1)) return 'Une route passe ici : pose un Checkpoint plutôt qu’un mur.';
  }
  return '';
}
function addWall(p, q, side){
  const pieces = wallPieces(p, q), line = Date.now() % 100000 + Math.floor(Math.random() * 1000);
  pieces.forEach(([pa, pb, qa, qb], k) => WALLS.push({ side, pa, pb, qa, qb, g: side === 'usc' && k % 4 === 1 ? (k >> 2) % GRAFFITI.length : -1, line }));
  for (let k = 6; k < pieces.length; k += 12){ const [pa, pb, qa, qb] = pieces[k], L = Math.hypot(qa - pa, qb - pb) || 1; WALL_TOWERS.push({ side, a: (pa + qa) / 2 + (qb - pb) / L * 5 * (side === 'usc' ? -1 : 1), b: (pb + qb) / 2 - (qa - pa) / L * 5 * (side === 'usc' ? -1 : 1), ph: k * 2.1, line }); }
  cutTreesAlong([p, q], 3);
  rebuildLocks(); rebuildTown();
  mapDirtyRect(Math.min(p[0], q[0]) - 4, Math.max(p[0], q[0]) + 4, Math.min(p[1], q[1]) - 4, Math.max(p[1], q[1]) + 4);
  return line;
}
function wallClick(a, b){
  toolPts.push([Math.round(a), Math.round(b)]);
  if (toolPts.length < 2){ sfx('click'); return; }
  const pieces = wallPieces(toolPts[0], toolPts[1]), why = wallProblem(pieces, GAME.side), cost = pieces.length * WALL_COST;
  if (why){ toast(why); toolPts.pop(); return; }
  if (!canPay(GAME.side, cost, 0)){ toast('Il faut ' + cost + ' laine pour ce pan de Rideau.'); toolPts.pop(); return; }
  pay(GAME.side, cost, 0);
  const line = addWall(toolPts[0], toolPts[1], GAME.side);
  pushHistory({ kind: 'wall', line, l: cost });
  logDay(GAME.side, 'wall', 'le Rideau de Laine');
  sfx('wall'); toast('Rideau de Laine tricoté : cette frontière ne bougera plus.');
  toolPts = [toolPts[1]]; saveSoon(); renderHUD();
}
function removeWallLine(line){
  WALLS = WALLS.filter(w => w.line !== line); WALL_TOWERS = WALL_TOWERS.filter(w => w.line !== line);
  rebuildLocks(); rebuildTown(); mapDirtyAll();
}

/* ---- demolir, annuler ---- */
const HISTORY = [];
function pushHistory(h){ h.t = GAME.t; HISTORY.push(h); if (HISTORY.length > 30) HISTORY.shift(); updateUndo(); }
function updateUndo(){ const b = $('btnUndo'); if (b) b.disabled = !HISTORY.length; }
function undo(){
  const h = HISTORY.pop(); updateUndo();
  if (!h){ toast('Rien à annuler.'); return; }
  const R = RES[GAME.side];
  if (h.kind === 'build'){
    const l = BLD.find(o => o.id === h.id);
    if (l){ BLD.splice(BLD.indexOf(l), 1); if (!l.done){ R.laine += h.l; R.ron += h.r || 0; R.croq += h.c || 0; } else R.laine += Math.round(h.l / 2); rebuildLocks(); TER.srcVer = -1; rebuildTown(); refreshAccess(); mapDirtyRect(l.a0, l.a1, l.b0, l.b1); }
    toast('Construction annulée.');
  } else if (h.kind === 'road'){
    const r = ROADS.find(o => o.id === h.id); if (r){ removeRoad(r); R.laine += h.l; } toast('Route effacée.');
  } else if (h.kind === 'wall'){ removeWallLine(h.line); R.laine += h.l; toast('Rideau détricoté.'); }
  if (state.sel && !BLD.includes(state.sel)) selectBuilding(null);
  saveSoon(); renderHUD();
}
function demolishAt(a, b){
  const l = bldAt(a, b);
  if (l){
    if (l.side !== GAME.side){ toast('Ce bâtiment appartient à l’autre camp.'); return; }
    if (l.type === 'qg'){ toast('On ne démolit pas son QG.'); return; }
    const refund = demolishBuilding(l);
    toast(typeName(l.type, l.side) + (TYPES[l.type].fem ? ' démolie' : ' démoli') + ', ' + refund + ' laine récupérée.');
    sfx('demolish', l.ca, l.cb); if (state.sel === l) selectBuilding(null); saveSoon(); renderHUD(); return;
  }
  const n = nearRoad(a, b, RW + 2, GAME.side);
  if (n){ removeRoad(n.r); RES[GAME.side].laine += Math.round(roadCost(n.r.pts) / 2); toast('Route démolie.'); sfx('demolish', a, b); saveSoon(); renderHUD(); return; }
  const w = WALLS.find(o => o.side === GAME.side && segDist(o.pa, o.pb, o.qa, o.qb, a, b)[0] < 4);
  if (w){ const n2 = WALLS.filter(o => o.line === w.line).length; removeWallLine(w.line); RES[GAME.side].laine += Math.round(n2 * WALL_COST / 2); toast('Rideau détricoté.'); sfx('demolish', a, b); saveSoon(); return; }
  toast('Rien à démolir ici.');
}

/* ---- apercu de l'outil : fantome du batiment, trace de la route ou du mur ---- */
function dashRect(a0, a1, b0, b1, ok){
  const C = [[a0, b0], [a1, b0], [a1, b1], [a0, b1]];
  CUR = ok ? M.BEAM : M.ICON_R;
  for (let k = 0; k < 4; k++){ const p = prj(C[k][0], C[k][1], 0), q = prj(C[(k + 1) % 4][0], C[(k + 1) % 4][1], 0); lineS(p[0], p[1], q[0], q[1], 1, ok); }
}
function dashRing(a, b, r, t){
  CUR = M.BEAM; const n = Math.ceil(r * 1.3);
  for (let k = 0; k < n; k++){ if (((k + ((t * 6) | 0)) & 3) !== 0) continue; const an = k / n * TAU, p = prj(a + Math.cos(an) * r, b + Math.sin(an) * r, 0); fput(Math.round(p[0]), Math.round(p[1]), 1); }
}
function dashPoly(pts, ok, t){
  GHOST_T = Math.floor(t * 8);
  CUR = ok ? M.BEAM : M.ICON_R;
  for (let k = 0; k + 1 < pts.length; k++){
    const [pa, pb] = pts[k], [qa, qb] = pts[k + 1], L = Math.hypot(qa - pa, qb - pb) || 1, na = -(qb - pb) / L * RW, nb = (qa - pa) / L * RW;
    for (const s of [-1, 1]){ const p = prj(pa + na * s, pb + nb * s, 0), q = prj(qa + na * s, qb + nb * s, 0); lineS(p[0], p[1], q[0], q[1], 1, ok); }
  }
}
function drawToolPreview(t){
  GHOST_T = Math.floor(t * 8);
  if (state.sel && state.sel.side){ const l = state.sel; dashRect(l.a0 - 1, l.a1 + 1, l.b0 - 1, l.b1 + 1, true); const r = influenceOf(l); if (r) dashRing(l.ca, l.cb, r, t); }
  if (!hoverW || GAME.mode !== 'play') { if (state.tool === 'landing' && hoverW) drawLandingMark(t); return; }
  const tool = state.tool;
  if (tool === 'build'){
    const s = buildSpot(hoverW[0], hoverW[1]), key = s.type + ':' + s.ca + ':' + s.cb + ':' + s.dir;
    if (!ghost || ghost.key !== key){
      const l = makeBuilding(s.type, GAME.side, s.ca, s.cb, Math.max(0, s.dir));
      ghost = { key, l, parts: s.why ? null : TYPES[s.type].build(l, 7).parts.slice().sort((u, v) => (dep(u.a, u.b) + u.zb) - (dep(v.a, v.b) + v.zb)), why: s.why };
    }
    const l = ghost.l;
    dashRect(l.a0, l.a1, l.b0, l.b1, !ghost.why);
    if (!ghost.why){ dashRing(l.ca, l.cb, influenceOf(l), t); GHOST = true; for (const p of ghost.parts) p.draw(t); GHOST = false; }
  } else if (tool === 'road' || tool === 'curve'){
    const cross = (a, b) => { const p = prj(a, b, 0), x = Math.round(p[0]), y = Math.round(p[1]); CUR = M.BEAM; for (let k = -4; k <= 4; k++){ fput(x + k, y, 1); fput(x, y + (k >> 1), 1); } };
    const pts = roadPreviewPts();
    if (pts){ dashPoly(pts, !roadProblem(pts, GAME.side), t); }
    for (const p of toolPts) cross(p[0], p[1]);
    const e = snapRoadPoint(hoverW[0], hoverW[1], GAME.side); cross(e[0], e[1]);
  } else if (tool === 'wall'){
    if (toolPts.length === 1){
      const pieces = wallPieces(toolPts[0], [Math.round(hoverW[0]), Math.round(hoverW[1])]), ok = !wallProblem(pieces, GAME.side);
      GHOST = ok; for (const [pa, pb, qa, qb] of pieces){ if (ok) drawWallPiece(pa, pb, qa, qb, '', GAME.side); else { CUR = M.ICON_R; const p = prj(pa, pb, 0), q = prj(qa, qb, 0); lineS(p[0], p[1], q[0], q[1], 1); } } GHOST = false;
    }
  } else if (tool === 'demolish'){
    const l = bldAt(hoverW[0], hoverW[1]); if (l && l.side === GAME.side) dashRect(l.a0, l.a1, l.b0, l.b1, false);
  } else if (tool === 'barge') drawLandingMark(t);
}
function drawLandingMark(t){
  const s = nearestShore(hoverW[0], hoverW[1], 60); if (!s) return;
  const p = prj(s[0], s[1], 0), x = Math.round(p[0]), y = Math.round(p[1]), r = 6 + Math.round(Math.sin(t * 4) * 2);
  CUR = M.BEAM; for (let k = 0; k < 24; k++){ const an = k / 24 * TAU; fput(Math.round(x + Math.cos(an) * r * 1.4), Math.round(y + Math.sin(an) * r * .7), 1); }
  pennant(x, y - 12, GAME.side, t, 1); CUR = M.METAL; for (let k = 0; k < 12; k++) fput(x, y - k, 1);
}

/* ---- zoom et rotation : boutons et boussole ---- */
const compassCv = $('compass').querySelector('canvas');
function updateZoomUI(){
  $('zoomLabel').textContent = Math.round(ZT / KDEF * 100) + ' %';
  $('zoomIn').disabled = ZT >= KMAX - 1e-6; $('zoomOut').disabled = ZT <= ZMIN() + 1e-6;
}
function drawCompass(){
  const g = compassCv.getContext('2d'), im = g.createImageData(11, 11), d = new Uint32Array(im.data.buffer);
  d.fill(BLACK);
  let vx = (0 * PC - (-1) * PS) - (0 * PS + (-1) * PC), vy = ((0 * PC - (-1) * PS) + (0 * PS + (-1) * PC)) * .5;
  const l = Math.hypot(vx, vy) || 1; vx /= l; vy /= l;
  for (let s = -4; s <= 4; s += .25){ const x = Math.round(5 + vx * s), y = Math.round(5 + vy * s); if (x >= 0 && y >= 0 && x < 11 && y < 11) d[y * 11 + x] = WHITE; }
  const tx = Math.round(5 + vx * 4), ty = Math.round(5 + vy * 4);
  for (const [ox, oy] of [[0,0],[1,0],[-1,0],[0,1],[0,-1]]){ const x = tx + ox, y = ty + oy; if (x >= 0 && y >= 0 && x < 11 && y < 11) d[y * 11 + x] = WHITE; }
  g.putImageData(im, 0, 0);
}
// de loin, l'ile est gardee en images tous les 45 degres : en lachant, on se cale sur l'angle le plus proche, deja pret
function snapTurn(){ if (OV_ON) cam.phiT = Math.round(cam.phi / (Math.PI / 4)) * (Math.PI / 4); }
function rotateBy(delta){ const base = cam.phiT == null ? cam.phi : cam.phiT; cam.phiT = Math.round((base + delta) / (Math.PI / 4)) * (Math.PI / 4); }
$('zoomIn').addEventListener('click', () => { zoomStep(1); updateZoomUI(); });
$('zoomOut').addEventListener('click', () => { zoomStep(-1); updateZoomUI(); });
$('zoomLabel').addEventListener('click', () => setZoom(KDEF));
$('rotL').addEventListener('click', () => rotateBy(-Math.PI / 4));
$('rotR').addEventListener('click', () => rotateBy(Math.PI / 4));
$('compass').addEventListener('click', () => { const k = Math.round(cam.phi / TAU); cam.phiT = k * TAU; });
const WX_MODES = ['auto', 'clair', 'pluie', 'neige', 'brouillard'], WX_LABEL = { auto: 'Météo auto', clair: 'Soleil', pluie: 'Pluie', neige: 'Neige', brouillard: 'Brouillard' };
$('btnWx').addEventListener('click', () => { WEATHER.mode = WX_MODES[(WX_MODES.indexOf(WEATHER.mode) + 1) % WX_MODES.length]; $('btnWx').textContent = WX_LABEL[WEATHER.mode]; if (WEATHER.mode === 'auto') WEATHER.next = 0; });

/* ---- temps : pause et vitesse (le temps du jeu, pas seulement l'horloge) ---- */
const SPEEDS = [1, 2, 4];
const PAUSE_SVG = $('clockPlay').innerHTML, PLAY_SVG = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 2.5v11l9.5-5.5z" fill="currentColor"/></svg>';
function setPaused(p){ GAME.paused = p; const b = $('clockPlay'); b.innerHTML = p ? PLAY_SVG : PAUSE_SVG; b.setAttribute('aria-pressed', String(p)); b.setAttribute('aria-label', p ? 'Reprendre' : 'Mettre en pause'); document.body.classList.toggle('paused', p); }
function setSpeed(s){ GAME.speed = s; $('clockSpeed').textContent = '×' + s; }
$('clockPlay').addEventListener('click', () => setPaused(!GAME.paused));
$('clockSpeed').addEventListener('click', () => setSpeed(SPEEDS[(SPEEDS.indexOf(GAME.speed) + 1) % SPEEDS.length]));
const pad2 = (n) => String(n).padStart(2, '0');
let clockShown = -1;
function updateClockUI(){
  const m = Math.floor(CLOCK.h * 60) % 1440; if (m === clockShown) return;
  clockShown = m; $('clockTime').textContent = pad2(Math.floor(m / 60)) + ':' + pad2(m % 60);
}

/* ---- pointeur : se balader, zoomer, tourner, agir ---- */
let drag = null, pointer = null;
const touches = new Map();
let pinch = null;
const keys = new Set();
function toLogical(e){ const r = scene.getBoundingClientRect(); return [Math.floor((e.clientX - r.left) / r.width * W), Math.floor((e.clientY - r.top) / r.height * H)]; }
// point du sol sous le curseur, dans les deux vues
function worldUnder(e){ if (OV_ON) return screenToWorld(e.clientX, e.clientY); const [lx, ly] = toLogical(e); return unprj(lx + .5, ly + .5); }
function catUnder(lx, ly){
  let best = null, bd = 10;
  for (const c of CATS){ if (!c.screen) continue; const dx = c.screen[0] - lx, dy = c.screen[1] - 3 - ly; const d = Math.hypot(dx, dy * 1.3); if (d < bd){ bd = d; best = c; } }
  return best;
}
// batiment sous le curseur : on remonte le long de la verticale pour attraper les facades
const TIP_H = { maison: 13, immeuble: 22, artdeco: 50, stalinien: 50, stade: 8, parc: 3, fontaine: 5, usine: 22, bulbes: 28, fusee: 40, radio: 48, cirque: 16, tribune: 10, statue: 22, panneau: 20, chateau: 32, qg: 24, supermarche: 11, grandmagasin: 20, kolkhoze: 12, kiosque: 10, cinema: 15, bowling: 11, drivein: 12, diner: 9, motel: 12, station: 9, epicerie: 10, port: 12, pecherie: 8, bergerie: 10, phare: 44, drapeau: 26, checkpoint: 8 };
function bldPick(lx, ly){
  for (let z = 50; z >= 0; z -= 1){
    const [a, b] = unprj(lx + .5, ly + .5 + z), l = bldAt(a, b);
    if (l && z <= (TIP_H[l.type] || 14)) return l;
  }
  return null;
}
scene.addEventListener('contextmenu', e => e.preventDefault());
scene.addEventListener('pointerdown', e => {
  if (e.pointerType === 'touch'){
    touches.set(e.pointerId, [e.clientX, e.clientY]);
    if (touches.size === 2){
      const [p, q] = [...touches.values()];
      pinch = { d: Math.hypot(q[0] - p[0], q[1] - p[1]), ang: Math.atan2(q[1] - p[1], q[0] - p[0]), phi: cam.phi, z: Z };
      drag = null; cam.target = null; cam.follow = null; return;
    }
  }
  const turn = e.pointerType === 'mouse' && (e.button === 2 || (e.button === 0 && e.shiftKey));
  if (e.pointerType === 'mouse' && e.button !== 0 && e.button !== 2) return;
  drag = { x: e.clientX, y: e.clientY, a: cam.a, b: cam.b, phi: cam.phi, moved: false, id: e.pointerId, turn, right: e.button === 2 };
  try { scene.setPointerCapture(e.pointerId); } catch (_) {}
});
scene.addEventListener('pointermove', e => {
  const [lx, ly] = OV_ON ? [-9999, -9999] : toLogical(e);
  if (e.pointerType === 'mouse') pointer = [lx, ly];
  if (e.pointerType === 'touch' && touches.has(e.pointerId)) touches.set(e.pointerId, [e.clientX, e.clientY]);
  if (pinch && touches.size === 2){
    const [p, q] = [...touches.values()];
    const d = Math.hypot(q[0] - p[0], q[1] - p[1]), ang = Math.atan2(q[1] - p[1], q[0] - p[0]);
    const mx = (p[0] + q[0]) / 2, my = (p[1] + q[1]) / 2;
    { const nz = clamp(pinch.z * d / pinch.d, ZMIN(), KMAX); ZANCH = [mx, my]; ZT = nz; setZNow(nz); }
    let da = ang - pinch.ang; while (da > Math.PI) da -= TAU; while (da < -Math.PI) da += TAU;
    if (Math.abs(da) > .08 || pinch.turning){ pinch.turning = true; cam.phi = pinch.phi - da; cam.phiT = null; }
    return;
  }
  if (drag && drag.id === e.pointerId){
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (!drag.moved && Math.hypot(dx, dy) > 5){ drag.moved = true; scene.classList.add(drag.turn ? 'turning' : 'panning'); cam.target = null; cam.follow = null; }
    if (drag.moved){
      if (drag.turn){ cam.phi = drag.phi + dx * 0.008; cam.phiT = null; }
      else {
        const s = DPR / Z, sv = { a: cam.a, b: cam.b };
        cam.a = drag.a; cam.b = drag.b; setProj();
        const g = groundDelta(dx * s, dy * s);
        cam.a = drag.a - g[0]; cam.b = drag.b - g[1]; clampCam();
        if (!isFinite(cam.a)) Object.assign(cam, sv);
      }
    }
  }
  if (!drag || !drag.moved){
    hoverW = worldUnder(e);
    hoverCat = !OV_ON && state.tool === 'walk' ? catUnder(lx, ly) : null;
    hoverB = !OV_ON && state.tool === 'walk' && !hoverCat ? bldPick(lx, ly) : null;
    scene.classList.toggle('pick', !!hoverCat || !!hoverB);
    if (state.tool === 'build' && GAME.mode === 'play' && !OV_ON){
      const s = buildSpot(hoverW[0], hoverW[1]), e2 = ECO[s.type];
      $('modeHint').textContent = s.why || (typeName(s.type, GAME.side) + ' : ' + costLabel(priceOf(s.type, GAME.side)) + ' · ' + (e2.desc || ''));
    }
    if (typeof showTip === 'function') showTip(e, hoverB);
  }
});
function endPointer(e){
  if (e.pointerType === 'touch'){ touches.delete(e.pointerId); if (touches.size < 2 && pinch){ const tn = pinch.turning; pinch = null; drag = null; snapZoom(); if (tn) snapTurn(); return; } }
  const d = drag; drag = null; scene.classList.remove('panning', 'turning');
  if (d && d.turn && d.moved) snapTurn();
  if (!d || d.moved || d.id !== e.pointerId || e.type === 'pointercancel') return;
  if (d.right){ if (toolPts.length){ toolPts = []; toast('Tracé interrompu.'); } else if (state.tool !== 'walk') setTool('walk'); return; }
  if (d.turn) return;
  const w = worldUnder(e);
  if (state.tool === 'landing'){ if (typeof chooseLanding === 'function') chooseLanding(w[0], w[1]); return; }
  if (GAME.mode !== 'play') return;
  if (state.tool === 'barge'){ bargeTarget(w[0], w[1]); return; }
  // sur la carte : un clic rapproche la vue de cet endroit
  if (OV_ON){ cam.follow = [w[0], w[1]]; setZoom(KDEF, e.clientX, e.clientY); if (state.tool !== 'walk') toast('Rapproche-toi pour construire.'); return; }
  const [lx, ly] = toLogical(e);
  if (state.tool === 'walk'){
    const c = catUnder(lx, ly); if (c){ openChat(c); return; }
    selectBuilding(bldPick(lx, ly)); return;
  }
  if (state.tool === 'build') tryBuild(w[0], w[1]);
  else if (state.tool === 'road' || state.tool === 'curve') roadClick(w[0], w[1]);
  else if (state.tool === 'wall') wallClick(w[0], w[1]);
  else if (state.tool === 'demolish') demolishAt(w[0], w[1]);
}
scene.addEventListener('pointerup', endPointer);
scene.addEventListener('pointercancel', endPointer);
scene.addEventListener('pointerleave', () => { pointer = null; hoverCat = null; hoverB = null; if (!drag) hoverW = null; });
let wheelAcc = 0, wheelT = 0, wheelSnap = 0;
scene.addEventListener('wheel', e => {
  e.preventDefault();
  const now2 = performance.now(); if (now2 - wheelT > 400) wheelAcc = 0; wheelT = now2;
  if (e.ctrlKey){ const nz = clamp(ZT * Math.exp(-e.deltaY * .012), ZMIN(), KMAX); setZoom(nz, e.clientX, e.clientY); clearTimeout(wheelSnap); wheelSnap = setTimeout(snapZoom, 220); return; }
  wheelAcc += e.deltaY * (e.deltaMode === 1 ? 30 : 1);
  if (wheelAcc < -60){ zoomStep(1, e.clientX, e.clientY); wheelAcc = 0; }
  else if (wheelAcc > 60){ zoomStep(-1, e.clientX, e.clientY); wheelAcc = 0; }
}, { passive: false });

const typing = (e) => e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA');
window.addEventListener('keydown', e => {
  if (!typing(e) && (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z'){ e.preventDefault(); undo(); return; }
  if (typing(e) || e.metaKey || e.ctrlKey || e.altKey) return;
  const k = e.key.toLowerCase();
  if (['arrowleft','arrowright','arrowup','arrowdown','q','a','z','w','s','d'].includes(k)){ keys.add(k); cam.target = null; cam.follow = null; e.preventDefault(); return; }
  if (k === 'escape'){ if (state.chatCat) closeChat(); else if (toolPts.length) toolPts = []; else if (state.sel) selectBuilding(null); else if (state.tool !== 'landing') setTool('walk'); return; }
  if (GAME.mode !== 'play'){ if (k === '+' || k === '=') zoomStep(1); else if (k === '-' || k === '_') zoomStep(-1); return; }
  if (k === 'b') setTool(state.tool === 'build' ? 'walk' : 'build');
  else if (k === 'r') setTool('road');
  else if (k === 'c') setTool('curve');
  else if (k === 'm') setTool('wall');
  else if (k === 'x') setTool('demolish');
  else if (k === ' ') { e.preventDefault(); setPaused(!GAME.paused); }
  else if (k === '1' || k === '2' || k === '3') setSpeed(SPEEDS[+k - 1]);
  else if (k === 'pageup') rotateBy(-Math.PI / 4);
  else if (k === 'pagedown') rotateBy(Math.PI / 4);
  else if (k === 'n') { const n = Math.round(cam.phi / TAU); cam.phiT = n * TAU; }
  else if (k === '+' || k === '=') zoomStep(1);
  else if (k === '-' || k === '_') zoomStep(-1);
});
window.addEventListener('keyup', e => keys.delete(e.key.toLowerCase()));
window.addEventListener('blur', () => keys.clear());
function stepKeys(dt){
  let dx = 0, dy = 0;
  if (keys.has('arrowleft') || keys.has('q') || keys.has('a')) dx -= 1;
  if (keys.has('arrowright') || keys.has('d')) dx += 1;
  if (keys.has('arrowup') || keys.has('z') || keys.has('w')) dy -= 1;
  if (keys.has('arrowdown') || keys.has('s')) dy += 1;
  if (dx || dy){ const s = 700 * dt * DPR / Z; const g = groundDelta(dx * s, dy * s); cam.a += g[0]; cam.b += g[1]; clampCam(); }
}
