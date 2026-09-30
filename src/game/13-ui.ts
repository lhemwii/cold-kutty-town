import { SH, type Building, type Part, type Side } from './00-shared.ts';
import { BLACK, GAME, H, M, PC, PS, TAU, W, WHITE, cam, clamp, dep, fput, groundDelta, lineS, prj, setProj, state, unprj } from './01-core.ts';
import { T_SEA, baseAt, landDAt, nearestShore, type Vec2 } from './02-ground.ts';
import { pennant } from './03-buildings-base.ts';
import { TYPES } from './04-types.ts';
import { typeName } from './05-types-extra.ts';
import { GRAFFITI, cutTreesAlong, drawWallPiece, vestAt, type Vestige } from './07-world.ts';
import { TER, influenceOf, rebuildLocks, sideAt } from './08-territory.ts';
import { RW, addRoad, nearRoad, removeRoad, roadCost, roadProblem, sampleCurve, sampleLine, segDist, snapRoadPoint } from './09-roads.ts';
import { bldAt, buildParts, coastDir, makeBuilding, placeProblem, rebuildTown, type Cat } from './10-town.ts';
import { CLOCK, OV_ON, WEATHER, ZMIN, clampCam, mapDirtyAll, scene, screenToWorld, setZNow, setZoom, snapZoom, zoomStep } from './11-render.ts';
import type { EcoDef, Price, Resources } from './15-economy.ts';
import { ACHIEVEMENTS, unlock, type AchievementId } from '../platform/achievements.ts';
/* ================= outils du joueur : observer, construire, routes, Rideau de Laine, demolir ================= */
// element de la page par son id : la page les contient tous, une absence est une erreur de la page
export function $(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error('élément absent de la page : #' + id);
  return el;
}
// le meme, d'un type precis (champ, canvas, bouton...) : $of('newSeed', HTMLInputElement).value
export function $of<T extends HTMLElement>(id: string, kind: new () => T): T {
  const el = $(id);
  if (!(el instanceof kind)) throw new Error('#' + id + " n'est pas du type attendu");
  return el;
}
/* ================= petites illustrations (pixel art) : ressources, saisons, niveau ================= */
export type Pal = Record<string, string>;
/** un dessin en caracteres (une chaine par ligne) et sa palette */
export type PixelArt = [string[], Pal];
export function pixelSVG(art: string[], pal: Pal, cls?: string){
  const h = art.length, w = Math.max(...art.map(r => r.length));
  let s = '<svg' + (cls ? ' class="' + cls + '"' : '') + ' viewBox="0 0 ' + w + ' ' + h + '" shape-rendering="crispEdges" aria-hidden="true">';
  for (let y = 0; y < h; y++){
    // une ligne = des rectangles qui fusionnent les pixels voisins de meme couleur
    let x = 0;
    while (x < art[y].length){
      const c = art[y][x], col = pal[c]; let n = 1;
      while (x + n < art[y].length && art[y][x + n] === c) n++;
      if (col) s += '<rect x="' + x + '" y="' + y + '" width="' + n + '" height="1.02" fill="' + col + '"/>';
      x += n;
    }
  }
  return s + '</svg>';
}
export const ICONS: Record<string, PixelArt> = {
  // patte de chat : quatre doigts et le coussinet
  paw: [['.....kk..kk.....', '....kPPkkPPk....', '....kPpkkPpk....', '.kk..kk..kk..kk.', 'kPPk........kPPk', 'kPpk..kkkk..kPpk', '.kk..kPPPPk..kk.', '....kPpPPPPk....', '...kPPPPPPPPk...', '...kPPPPPPPPk...', '....kPPkkPPk....', '.....kk..kk.....'],
    { k: '#8a3452', P: '#f28cab', p: '#ffd3df' }],
  // habitants : un grand chat noir et un petit chat gris a cote
  pop: [['.k...k..........', '.kk.kk..........', '.kkkkk.....g...g', '.kykyk.....gg.gg', '.kkkkk.....ggggg', '..kpk......gygyg', '.kkkkk.....ggggg', 'kkkkkkk.....ggg.', 'kkkkkkk....ggggg', 'kkkkkkk...ggggggg', 'kkkkkkkk..ggggggg', '.kkkkk.kk..ggggg.'],
    { k: '#2a2622', y: '#ffe45c', p: '#f28cab', g: '#8e8a93' }]
};
// les memes dessins, et quelques autres, en petit dans le texte : ico('laine') + 30 plutot que '30 laine'
Object.assign(ICONS, {
  // croquette : un poisson dore
  croq: [['................', '................', '.......kkk......', '.....kkoook..k..', '...kkoooooookkk.', '..kooOooooookok.', '.koooooooooookk.', '.kooooooooooook.', '..koooOoooookok.', '...kkooooookkk..', '.....kkoook..k..', '.......kkk......'],
    { k: '#3a220f', o: '#c9782f', O: '#f2c27a' }],
  // pelote de laine
  laine: [['.....kkkkk......', '...kkwwwwwkk....', '..kwwpwwwwwwk...', '.kwwwwpwwwwwwk..', '.kwpwwwpwwwwwk..', 'kwwwpwwwpwwwwwk.', 'kwwwwpwwwpwwwwk.', 'kwpwwwpwwwpwwwk.', '.kwwpwwwpwwwpk..', '.kwwwpwwwpwwwk.p', '..kwwwpwwwwwk.p.', '...kkwwwwwkkpp..', '.....kkkkk......'],
    { k: '#5b3f82', w: '#e8e1f0', p: '#8f6fb5' }],
  // emplois : une mallette
  jobs: [['.....kkkkkk.....', '.....k....k.....', '.kkkkkkkkkkkkkk.', 'kBBBBBBBBBBBBBBk', 'kBbbbbbbbbbbbbBk', 'kBbbbbbyybbbbbBk', 'kkkkkkkyykkkkkkk', 'kBbbbbbbbbbbbbBk', 'kBbbbbbbbbbbbbBk', 'kBBBBBBBBBBBBBBk', '.kkkkkkkkkkkkkk.'],
    { k: '#2a2622', B: '#7b5231', b: '#b08254', y: '#ffd23f' }],
  // loisirs : une etoile
  fun: [['.....k.....', '....kyk....', '....kyk....', 'kkkkyyykkkk', 'kyyyyyyyyyk', '.kyyyYyyyk.', '..kyyyyyk..', '.kyyykyyyk.', '.kyk...kyk.', 'kk.......kk'],
    { k: '#8a6a10', y: '#ffd23f', Y: '#fff0b3' }],
  // saisons
  hiver: [['.....b.....', '...b.b.b...', '....bbb....', '.b...b...b.', '..b..b..b..', 'bbbbbwbbbbb', '..b..b..b..', '.b...b...b.', '....bbb....', '...b.b.b...', '.....b.....'],
    { b: '#2677b5', w: '#9fd6ff' }],
  printemps: [['...pp.pp...', '..pPPpPPp..', '..pPPyPPp..', '...pyyyp...', '..pPPyPPp..', '..pPPpPPp..', '...pp.pp...', '.....g.....', '..gg.g.....', '...ggg.gg..', '.....ggg...'],
    { p: '#c2456e', P: '#f6a8c0', y: '#ffd23f', g: '#3f8f3a' }],
  été: [['.....y.....', '.y...y...y.', '..y.yyy.y..', '...yYYYy...', '..yYYYYYy..', 'yyyYYYYYyyy', '..yYYYYYy..', '...yYYYy...', '..y.yyy.y..', '.y...y...y.', '.....y.....'],
    { y: '#d9a21e', Y: '#ffd23f' }],
  automne: [['........oo.', '......ooOo.', '....ooOOOo.', '...oOOrOOo.', '..oOOrOOo..', '.oOOrOOo...', '.oOrOOo....', '.orOoo.....', '.ro........', 'r..........'],
    { o: '#b8531e', O: '#e08a2e', r: '#6e3a1a' }],
});
ICONS.ron = ICONS.paw;
// categories du tiroir de construction qui n'ont pas deja une icone de ressource
Object.assign(ICONS, {
  // prestige : une medaille a ruban
  prestige: [['..rr....bb..', '..rrr..bbb..', '...rr..bb...', '....rrbb....', '....kkkk....', '..kkyyyykk..', '.kyyYYyyyyk.', '.kyYyyyyyyk.', '.kyyyyyyyyk.', '.kyyyyyyyyk.', '..kkyyyykk..', '....kkkk....'],
    { r: '#c8283a', b: '#2a45a6', k: '#8a6a10', y: '#ffd23f', Y: '#fff0b3' }],
  // mer : une ancre
  mer: [['.....kk.....', '....k..k....', '.....kk.....', '..kkkkkkkk..', '.....kk.....', '.....kk.....', '.....kk.....', 'k....kk....k', 'kk...kk...kk', '.kk..kk..kk.', '..kkkkkkkk..', '....kkkk....'],
    { k: '#1d4f86' }],
  // frontiere : une barriere rayee
  frontiere: [['............', '............', '..kk........', '..kk........', 'kkkkkkkkkkkk', 'kwwrrwwrrwwk', 'kkkkkkkkkkkk', '..kk........', '..kk........', '..kk........', '.kkkk.......', '.kkkk.......'],
    { k: '#2a2622', w: '#fbf7ee', r: '#c8283a' }],
});
/** icone de chaque categorie du tiroir de construction */
export const CAT_ICON: Record<string, string> = { logement: 'pop', nourriture: 'croq', laine: 'laine', loisirs: 'fun', prestige: 'prestige', mer: 'mer', frontiere: 'frontiere' };
/** une petite illustration dans le texte (title : ce qu'elle veut dire, lu par les lecteurs d'ecran) */
export function ico(name: string, title?: string): string {
  const ic = ICONS[name]; if (!ic) return '';
  const svg = pixelSVG(ic[0], ic[1], 'i');
  return title ? '<span class="iw" role="img" aria-label="' + title + '" title="' + title + '">' + svg + '</span>' : svg;
}
/** une liste en francais : « a, b et c » (les vides sont ignores) */
export function andList(xs: string[]): string { const a = xs.filter(Boolean); return a.length <= 1 ? (a[0] || '') : a.slice(0, -1).join(', ') + ' et ' + a[a.length - 1]; }
/** un prix en illustrations : laine, croquettes, ronrons */
export function costHTML(p: Price): string {
  const it = (n: number, k: string, nm: string) => n ? '<span class="ci">' + ico(k, nm) + '<b>' + n + '</b></span>' : '';
  return '<span class="cost">' + it(p.l, 'laine', 'laine') + it(p.c, 'croq', 'croquettes') + it(p.r, 'ron', 'ronrons') + '</span>';
}
/** niveau en pastilles (lv sur max) */
export function pips(lv: number, max = 3): string {
  let s = '<span class="pips" role="img" aria-label="niveau ' + lv + ' sur ' + max + '" title="niveau ' + lv + ' sur ' + max + '">';
  for (let k = 1; k <= max; k++) s += '<i' + (k <= lv ? ' class="on"' : '') + '></i>';
  return s + '</span>';
}
/** avancement en barre, et en pourcentage */
export function progress(f: number): string { const p = Math.floor(clamp(f, 0, 1) * 100); return '<span class="pbar"><i style="width:' + p + '%"></i></span>' + p + ' %'; }

// state.tool : walk, build, road, curve, wall, demolish, barge (choix d'une cote), landing (choix de la plage)
state.tool = 'walk'; state.buildType = 'maison'; state.sel = null;
export const HINTS: Record<string, string> = {
  walk: 'Glisse pour te déplacer, molette pour zoomer, clic droit glissé pour tourner. Clique sur un bâtiment ou un chat.',
  build: 'Choisis un bâtiment puis clique dans ton territoire. Clic droit glissé ou T pour le tourner. Les bâtiments de la mer se posent face à l’eau.',
  road: 'Clique le départ, puis l’arrivée. La route continue depuis son bout : clic droit ou Échap pour arrêter.',
  curve: 'Clique le départ, puis le point qui tire la courbe, puis l’arrivée.',
  wall: 'Clique le début du Rideau de Laine puis sa fin. Il fige ta frontière. 3 laine tous les 10 pas.',
  demolish: 'Clique sur un bâtiment, une route ou un pan de mur pour le démolir. La moitié de la laine revient.',
  barge: 'Clique sur une côte : la barge part du port et y plante un avant-poste.',
  landing: 'Clique sur une côte de l’île pour y débarquer.'
};
/** apercu du batiment a poser (SH.ghost) : refait seulement quand la place, le type ou la direction changent */
export interface Ghost { key: string; l: Building; parts: Part[] | null; why: string }
export let toolPts: Vec2[] = [], hoverW: Vec2 | null = null, hoverB: Building | null = null; SH.ghost = null;
export function setTool(m: string){
  state.tool = m; toolPts = [];
  for (const b of document.querySelectorAll('[data-tool]')) if (b instanceof HTMLElement) b.setAttribute('aria-pressed', String(b.dataset.tool === m));
  $('buildMenu').hidden = m !== 'build';
  $('modeHint').textContent = HINTS[m] || '';
  scene.classList.toggle('build', m === 'build' || m === 'road' || m === 'curve' || m === 'wall' || m === 'barge' || m === 'landing');
  scene.classList.toggle('demolish', m === 'demolish');
  SH.ghost = null;
}
for (const b of document.querySelectorAll('[data-tool]')) if (b instanceof HTMLElement) b.addEventListener('click', () => { const m = b.dataset.tool || 'walk'; setTool(state.tool === m && m !== 'walk' ? 'walk' : m); SH.sfx('click'); });

export let toastTimer = 0;
export function toast(msg: string){ const el = $('toast'); el.textContent = msg; el.hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => el.hidden = true, 2800); }
// succes du joueur : debloque (et envoye a Steam dans la version de bureau), avec un mot a l'ecran la premiere fois
// (apres le message du moment, qui reste lisible)
export function achieve(id: AchievementId){ if (unlock(id)) setTimeout(() => toast('Succès : ' + ACHIEVEMENTS[id].name + '.'), 1500); }


/* ---- construire ---- */
// position proposee pour le batiment sous le curseur (arrondie a 2 unites), et sa direction s'il est au bord de l'eau
export function buildSpot(a: number, b: number){
  const type = state.buildType, e: EcoDef = SH.ECO[type], ca = Math.round(a / 2) * 2, cb = Math.round(b / 2) * 2;
  const dir = e && e.coast ? coastDir(ca, cb) : (state.buildDir || 0);
  return { type, ca, cb, dir, why: placeProblem(type, GAME.side, ca, cb, dir, false) };
}
export function tryBuild(a: number, b: number){
  const s = buildSpot(a, b);
  if (s.why){ toast(s.why); SH.sfx('click'); return; }
  const pr: Price = SH.priceOf(s.type, GAME.side);
  if (!SH.canAfford(GAME.side, pr)){ toast('Il faut ' + SH.costLabel(pr) + '.'); return; }
  SH.pay(GAME.side, pr.l, pr.r, pr.c);
  const l = makeBuilding(s.type, GAME.side, s.ca, s.cb, s.dir);
  SH.startBuilding(l);
  pushHistory({ kind: 'build', id: l.id, l: pr.l, r: pr.r, c: pr.c });
  toast(typeName(s.type, GAME.side) + ' : chantier lancé.');
  SH.sfx('click'); SH.ghost = null; SH.saveSoon(); SH.renderHUD();
}

/* ---- routes ---- */
export function roadPreviewPts(){
  if (!hoverW) return null;
  const end = snapRoadPoint(hoverW[0], hoverW[1], GAME.side);
  if (state.tool === 'road' && toolPts.length === 1) return sampleLine(toolPts[0], end);
  if (state.tool === 'curve' && toolPts.length === 1) return sampleLine(toolPts[0], end);
  if (state.tool === 'curve' && toolPts.length === 2) return sampleCurve(toolPts[0], toolPts[1], end);
  return null;
}
export function roadClick(a: number, b: number){
  const p: Vec2 = state.tool === 'curve' && toolPts.length === 1 ? [Math.round(a), Math.round(b)] : snapRoadPoint(a, b, GAME.side);
  toolPts.push(p);
  const need = state.tool === 'curve' ? 3 : 2;
  if (toolPts.length < need){ SH.sfx('click'); return; }
  const pts = state.tool === 'curve' ? sampleCurve(toolPts[0], toolPts[1], toolPts[2]) : sampleLine(toolPts[0], toolPts[1]);
  const why = roadProblem(pts, GAME.side);
  if (why){ toast(why); toolPts.pop(); return; }
  const cost = roadCost(pts);
  if (!SH.canPay(GAME.side, cost, 0)){ toast('Il faut ' + cost + ' laine pour cette route.'); toolPts.pop(); return; }
  SH.pay(GAME.side, cost, 0);
  const r = addRoad(pts, GAME.side);
  pushHistory({ kind: 'road', id: r.id, l: cost });
  SH.sfx('click'); SH.saveSoon(); SH.renderHUD();
  // on repart du bout pour enchainer
  toolPts = [pts[pts.length - 1]];
}

/* ---- Rideau de Laine ---- */
export const WALL_STEP = 10, WALL_COST = 3;
/** un pan de Rideau : de (pa, pb) a (qa, qb) */
export type WallPiece = [number, number, number, number];
export function wallPieces(p: Vec2, q: Vec2){
  const L = Math.hypot(q[0] - p[0], q[1] - p[1]), n = Math.max(1, Math.round(L / WALL_STEP)), out: WallPiece[] = [];
  for (let k = 0; k < n; k++) out.push([p[0] + (q[0] - p[0]) * k / n, p[1] + (q[1] - p[1]) * k / n, p[0] + (q[0] - p[0]) * (k + 1) / n, p[1] + (q[1] - p[1]) * (k + 1) / n]);
  return out;
}
export function wallProblem(pieces: WallPiece[], side: Side){
  if (!pieces.length) return 'Trop court.';
  for (const [pa, pb, qa, qb] of pieces) for (const f of [0, .5, 1]){
    const a = pa + (qa - pa) * f, b = pb + (qb - pb) * f;
    if (baseAt(a, b) === T_SEA || landDAt(a, b) < 2) return 'Pas de mur dans la mer.';
    if (sideAt(a, b) !== side) return 'Le Rideau se tricote dans ton territoire.';
    for (const l of SH.BLD) if (a > l.a0 - 1 && a < l.a1 + 1 && b > l.b0 - 1 && b < l.b1 + 1) return 'Un bâtiment est sur le chemin.';
    if (nearRoad(a, b, RW + 1)) return 'Une route passe ici : pose un Checkpoint plutôt qu’un mur.';
  }
  return '';
}
export function addWall(p: Vec2, q: Vec2, side: Side){
  const pieces = wallPieces(p, q), line = Date.now() % 100000 + Math.floor(Math.random() * 1000);
  if (side === GAME.side && GAME.mode === 'play' && pieces.length) achieve('RIDEAU');
  pieces.forEach(([pa, pb, qa, qb], k) => SH.WALLS.push(
{ side, pa, pb, qa, qb, g: side === 'usc' && k % 4 === 1 ? (k >> 2) % GRAFFITI.length : -1, line }));
  for (let k = 6; k < pieces.length; k += 12){ const [pa, pb, qa, qb] = pieces[k], L = Math.hypot(qa - pa, qb - pb) || 1; SH.WALL_TOWERS.push({ side, a: (pa + qa) / 2 + (qb - pb) / L * 5 * (side === 'usc' ? -1 : 1), b: (pb + qb) / 2 - (qa - pa) / L * 5 * (side === 'usc' ? -1 : 1), ph: k * 2.1, line }); }
  cutTreesAlong([p, q], 3);
  rebuildLocks(); rebuildTown();
  SH.mapDirtyRect(Math.min(p[0], q[0]) - 4, Math.max(p[0], q[0]) + 4, Math.min(p[1], q[1]) - 4, Math.max(p[1], q[1]) + 4);
  return line;
}
export function wallClick(a: number, b: number){
  toolPts.push([Math.round(a), Math.round(b)]);
  if (toolPts.length < 2){ SH.sfx('click'); return; }
  const pieces = wallPieces(toolPts[0], toolPts[1]), why = wallProblem(pieces, GAME.side), cost = pieces.length * WALL_COST;
  if (why){ toast(why); toolPts.pop(); return; }
  if (!SH.canPay(GAME.side, cost, 0)){ toast('Il faut ' + cost + ' laine pour ce pan de Rideau.'); toolPts.pop(); return; }
  SH.pay(GAME.side, cost, 0);
  const line = addWall(toolPts[0], toolPts[1], GAME.side);
  pushHistory({ kind: 'wall', line, l: cost });
  SH.logDay(GAME.side, 'wall', 'le Rideau de Laine');
  SH.sfx('wall'); toast('Rideau de Laine tricoté : cette frontière ne bougera plus.');
  toolPts = [toolPts[1]]; SH.saveSoon(); SH.renderHUD();
}
export function removeWallLine(line: number){
  SH.WALLS = SH.WALLS.filter(w => w.line !== line); SH.WALL_TOWERS = SH.WALL_TOWERS.filter(w => w.line !== line);
  rebuildLocks(); rebuildTown(); mapDirtyAll();
}

/* ---- demolir, annuler ---- */
/** une action du joueur qu'on peut annuler, avec ce qu'elle a coute (t : temps de jeu) */
export type HistoryEntry = ({ kind: 'build'; id: number; l: number; r: number; c: number } | { kind: 'road'; id: number; l: number } | { kind: 'wall'; line: number; l: number }) & { t?: number };
export const HISTORY: HistoryEntry[] = [];
export function pushHistory(h: HistoryEntry){ h.t = GAME.t; HISTORY.push(h); if (HISTORY.length > 30) HISTORY.shift(); updateUndo(); }
export function updateUndo(){ const b = $of('btnUndo', HTMLButtonElement); b.disabled = !HISTORY.length; b.title = HISTORY.length ? 'Annuler la dernière construction (Ctrl+Z)' : 'Rien à annuler'; }
export function undo(){
  const h = HISTORY.pop(); updateUndo();
  if (!h){ toast('Rien à annuler.'); return; }
  const R: Resources = SH.RES[GAME.side];
  if (h.kind === 'build'){
    const l = SH.BLD.find(o => o.id === h.id);
    if (l){ SH.BLD.splice(SH.BLD.indexOf(l), 1); if (!l.done){ R.laine += h.l; R.ron += h.r || 0; R.croq += h.c || 0; } else R.laine += Math.round(h.l / 2); rebuildLocks(); TER.srcVer = -1; rebuildTown(); SH.refreshAccess(); SH.mapDirtyRect(l.a0, l.a1, l.b0, l.b1); }
    toast('Construction annulée.');
  } else if (h.kind === 'road'){
    const r = SH.ROADS.find(o => o.id === h.id); if (r){ removeRoad(r); R.laine += h.l; } toast('Route effacée.');
  } else if (h.kind === 'wall'){ removeWallLine(h.line); R.laine += h.l; toast('Rideau détricoté.'); }
  if (state.sel && !SH.BLD.includes(state.sel)) SH.selectBuilding(null);
  SH.saveSoon(); SH.renderHUD();
}
export function demolishAt(a: number, b: number){
  const l = bldAt(a, b);
  if (l){
    if (l.side !== GAME.side){ toast('Ce bâtiment appartient à l’autre camp.'); return; }
    if (l.type === 'qg'){ toast('On ne démolit pas son QG.'); return; }
    const refund = SH.demolishBuilding(l);
    toast(typeName(l.type, l.side) + (TYPES[l.type].fem ? ' démolie' : ' démoli') + ', ' + refund + ' laine récupérée.');
    SH.sfx('demolish', l.ca, l.cb); if (state.sel === l) SH.selectBuilding(null); SH.saveSoon(); SH.renderHUD(); return;
  }
  const n = nearRoad(a, b, RW + 2, GAME.side);
  if (n){ removeRoad(n.r); SH.RES[GAME.side].laine += Math.round(roadCost(n.r.pts) / 2); toast('Route démolie.'); SH.sfx('demolish', a, b); SH.saveSoon(); SH.renderHUD(); return; }
  const w = SH.WALLS.find(o => o.side === GAME.side && segDist(o.pa, o.pb, o.qa, o.qb, a, b)[0] < 4);
  if (w){ const n2 = SH.WALLS.filter(o => o.line === w.line).length; removeWallLine(w.line); SH.RES[GAME.side].laine += Math.round(n2 * WALL_COST / 2); toast('Rideau détricoté.'); SH.sfx('demolish', a, b); SH.saveSoon(); return; }
  toast('Rien à démolir ici.');
}

/* ---- apercu de l'outil : fantome du batiment, trace de la route ou du mur ---- */
export function dashRect(a0: number, a1: number, b0: number, b1: number, ok: boolean){
  const C = [[a0, b0], [a1, b0], [a1, b1], [a0, b1]];
  SH.CUR = ok ? M.BEAM : M.ICON_R;
  for (let k = 0; k < 4; k++){ const p = prj(C[k][0], C[k][1], 0), q = prj(C[(k + 1) % 4][0], C[(k + 1) % 4][1], 0); lineS(p[0], p[1], q[0], q[1], 1, ok); }
}
export function dashRing(a: number, b: number, r: number, t: number){
  SH.CUR = M.BEAM; const n = Math.ceil(r * 1.3);
  for (let k = 0; k < n; k++){ if (((k + ((t * 6) | 0)) & 3) !== 0) continue; const an = k / n * TAU, p = prj(a + Math.cos(an) * r, b + Math.sin(an) * r, 0); fput(Math.round(p[0]), Math.round(p[1]), 1); }
}
export function dashPoly(pts: Vec2[], ok: boolean, t: number){
  SH.GHOST_T = Math.floor(t * 8);
  SH.CUR = ok ? M.BEAM : M.ICON_R;
  for (let k = 0; k + 1 < pts.length; k++){
    const [pa, pb] = pts[k], [qa, qb] = pts[k + 1], L = Math.hypot(qa - pa, qb - pb) || 1, na = -(qb - pb) / L * RW, nb = (qa - pa) / L * RW;
    for (const s of [-1, 1]){ const p = prj(pa + na * s, pb + nb * s, 0), q = prj(qa + na * s, qb + nb * s, 0); lineS(p[0], p[1], q[0], q[1], 1, ok); }
  }
}
export function drawToolPreview(t: number){
  SH.GHOST_T = Math.floor(t * 8);
  if (state.sel && state.sel.side){ const l = state.sel; dashRect(l.a0 - 1, l.a1 + 1, l.b0 - 1, l.b1 + 1, true); const r = influenceOf(l); if (r) dashRing(l.ca, l.cb, r, t); }
  if (!hoverW || GAME.mode !== 'play') { if (state.tool === 'landing' && hoverW) drawLandingMark(t); return; }
  const tool = state.tool;
  if (tool === 'build'){
    const s = buildSpot(hoverW[0], hoverW[1]), key = s.type + ':' + s.ca + ':' + s.cb + ':' + s.dir;
    if (!SH.ghost || SH.ghost.key !== key){
      const l = makeBuilding(s.type, GAME.side, s.ca, s.cb, Math.max(0, s.dir));
      SH.ghost = { key, l, parts: s.why ? null : buildParts(l, 7).parts.slice().sort((u, v) => (dep(u.a, u.b) + u.zb) - (dep(v.a, v.b) + v.zb)), why: s.why } satisfies Ghost;
    }
    const G: Ghost = SH.ghost, l = G.l;
    dashRect(l.a0, l.a1, l.b0, l.b1, !G.why);
    if (!G.why){ dashRing(l.ca, l.cb, influenceOf(l), t); SH.GHOST = true; for (const p of G.parts || []) p.draw(t); SH.GHOST = false; }
  } else if (tool === 'road' || tool === 'curve'){
    const cross = (a: number, b: number) => { const p = prj(a, b, 0), x = Math.round(p[0]), y = Math.round(p[1]); SH.CUR = M.BEAM; for (let k = -4; k <= 4; k++){ fput(x + k, y, 1); fput(x, y + (k >> 1), 1); } };
    const pts = roadPreviewPts();
    if (pts){ dashPoly(pts, !roadProblem(pts, GAME.side), t); }
    for (const p of toolPts) cross(p[0], p[1]);
    const e = snapRoadPoint(hoverW[0], hoverW[1], GAME.side); cross(e[0], e[1]);
  } else if (tool === 'wall'){
    if (toolPts.length === 1){
      const pieces = wallPieces(toolPts[0], [Math.round(hoverW[0]), Math.round(hoverW[1])]), ok = !wallProblem(pieces, GAME.side);
      SH.GHOST = ok; for (const [pa, pb, qa, qb] of pieces){ if (ok) drawWallPiece(pa, pb, qa, qb, '', GAME.side); else { SH.CUR = M.ICON_R; const p = prj(pa, pb, 0), q = prj(qa, qb, 0); lineS(p[0], p[1], q[0], q[1], 1); } } SH.GHOST = false;
    }
  } else if (tool === 'demolish'){
    const l = bldAt(hoverW[0], hoverW[1]); if (l && l.side === GAME.side) dashRect(l.a0, l.a1, l.b0, l.b1, false);
  } else if (tool === 'barge') drawLandingMark(t);
}
export function drawLandingMark(t: number){
  if (!hoverW) return;
  const s = nearestShore(hoverW[0], hoverW[1], 60); if (!s) return;
  const p = prj(s[0], s[1], 0), x = Math.round(p[0]), y = Math.round(p[1]), r = 6 + Math.round(Math.sin(t * 4) * 2);
  SH.CUR = M.BEAM; for (let k = 0; k < 24; k++){ const an = k / 24 * TAU; fput(Math.round(x + Math.cos(an) * r * 1.4), Math.round(y + Math.sin(an) * r * .7), 1); }
  pennant(x, y - 12, GAME.side, t, 1); SH.CUR = M.METAL; for (let k = 0; k < 12; k++) fput(x, y - k, 1);
}

/* ---- zoom et rotation : boutons et boussole ---- */
export const compassCv = $('compass').querySelector('canvas');
export function updateZoomUI(){
  $('zoomLabel').textContent = Math.round(SH.ZT / SH.KDEF * 100) + ' %';
  $of('zoomIn', HTMLButtonElement).disabled = SH.ZT >= SH.KMAX - 1e-6; $of('zoomOut', HTMLButtonElement).disabled = SH.ZT <= ZMIN() + 1e-6;
}
export function drawCompass(){
  const g = compassCv ? compassCv.getContext('2d') : null; if (!g) return;
  const im = g.createImageData(11, 11), d = new Uint32Array(im.data.buffer);
  d.fill(BLACK);
  let vx = (0 * PC - (-1) * PS) - (0 * PS + (-1) * PC), vy = ((0 * PC - (-1) * PS) + (0 * PS + (-1) * PC)) * .5;
  const l = Math.hypot(vx, vy) || 1; vx /= l; vy /= l;
  for (let s = -4; s <= 4; s += .25){ const x = Math.round(5 + vx * s), y = Math.round(5 + vy * s); if (x >= 0 && y >= 0 && x < 11 && y < 11) d[y * 11 + x] = WHITE; }
  const tx = Math.round(5 + vx * 4), ty = Math.round(5 + vy * 4);
  for (const [ox, oy] of [[0,0],[1,0],[-1,0],[0,1],[0,-1]]){ const x = tx + ox, y = ty + oy; if (x >= 0 && y >= 0 && x < 11 && y < 11) d[y * 11 + x] = WHITE; }
  g.putImageData(im, 0, 0);
}
export function rotateBy(delta: number){ const base = cam.phiT == null ? cam.phi : cam.phiT; cam.phiT = Math.round((base + delta) / (Math.PI / 4)) * (Math.PI / 4); }
$('zoomIn').addEventListener('click', () => { zoomStep(1); updateZoomUI(); });
$('zoomOut').addEventListener('click', () => { zoomStep(-1); updateZoomUI(); });
$('zoomLabel').addEventListener('click', () => setZoom(SH.KDEF));
$('rotL').addEventListener('click', () => rotateBy(-Math.PI / 4));
$('rotR').addEventListener('click', () => rotateBy(Math.PI / 4));
$('compass').addEventListener('click', () => { const k = Math.round(cam.phi / TAU); cam.phiT = k * TAU; });
export const WX_MODES = ['auto', 'clair', 'pluie', 'neige', 'brouillard'], WX_LABEL: Record<string, string> = { auto: 'automatique', clair: 'soleil', pluie: 'pluie', neige: 'neige', brouillard: 'brouillard' };
// la meteo choisie, dessinee sur le bouton de la colonne de vue
const wxSvg = (body: string) => '<svg viewBox="0 0 16 16" aria-hidden="true">' + body + '</svg>';
export const WX_ICON: Record<string, string> = {
  auto: wxSvg('<circle cx="5.5" cy="5.5" r="2.6" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M5 0h1v1.6H5zM0 5h1.6v1H0zM1.2 1.2l.8-.8 1.1 1.1-.8.8zM8.9 1.3l.8.8-1.1 1.1-.8-.8z" fill="currentColor"/><path d="M7 14h6.5a2.5 2.5 0 0 0 .2-5A3.5 3.5 0 0 0 7.2 8.4 2.8 2.8 0 0 0 7 14z" fill="currentColor"/>'),
  clair: wxSvg('<path d="M7 0h2v3H7zM7 13h2v3H7zM0 7h3v2H0zM13 7h3v2h-3zM2 3.4 3.4 2l2 2L4 5.4zM10.6 12l1.4-1.4 2 2-1.4 1.4zM2 12.6l2-2 1.4 1.4-2 2zM10.6 4l2-2L14 3.4l-2 2zM8 4.2a3.8 3.8 0 1 1 0 7.6 3.8 3.8 0 0 1 0-7.6z" fill="currentColor"/>'),
  pluie: wxSvg('<path d="M4 9h8.5a2.5 2.5 0 0 0 .2-5A4 4 0 0 0 5 3.2 3 3 0 0 0 4 9z" fill="currentColor"/><path d="M4 11h1.5l-1 4H3zM8 11h1.5l-1 4H7zM12 11h1.5l-1 4H11z" fill="currentColor"/>'),
  neige: wxSvg('<path d="M7.2 0h1.6v16H7.2zM0 7.2h16v1.6H0zM1.9 3l1.1-1.1 11.1 11.1-1.1 1.1zM13 1.9l1.1 1.1L3 14.1l-1.1-1.1z" fill="currentColor"/><circle cx="8" cy="8" r="2.4" fill="var(--ink)"/><circle cx="8" cy="8" r="1.2" fill="currentColor"/>'),
  brouillard: wxSvg('<path d="M1 3h11v2H1zM4 7h11v2H4zM1 11h11v2H1z" fill="currentColor"/>'),
};
export function updateWxUI(){ const b = $('btnWx'), nm = 'Météo : ' + (WX_LABEL[WEATHER.mode] || WEATHER.mode); b.innerHTML = WX_ICON[WEATHER.mode] || WX_ICON.auto; b.title = nm; b.setAttribute('aria-label', nm); }
$('btnWx').addEventListener('click', () => { WEATHER.mode = WX_MODES[(WX_MODES.indexOf(WEATHER.mode) + 1) % WX_MODES.length]; updateWxUI(); if (WEATHER.mode === 'auto') WEATHER.next = 0; });
updateWxUI();

/* ---- temps : pause et vitesse (le temps du jeu, pas seulement l'horloge) ---- */
export const SPEEDS = [1, 2, 4];
export const PAUSE_SVG = $('clockPlay').innerHTML, PLAY_SVG = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 2.5v11l9.5-5.5z" fill="currentColor"/></svg>';
export function setPaused(p: boolean){ GAME.paused = p; const b = $('clockPlay'); b.innerHTML = p ? PLAY_SVG : PAUSE_SVG; b.setAttribute('aria-pressed', String(p)); b.setAttribute('aria-label', p ? 'Reprendre' : 'Mettre en pause'); document.body.classList.toggle('paused', p); }
export function setSpeed(s: number){ GAME.speed = s; $('clockSpeed').textContent = '×' + s; }
$('clockPlay').addEventListener('click', () => setPaused(!GAME.paused));
$('clockSpeed').addEventListener('click', () => setSpeed(SPEEDS[(SPEEDS.indexOf(GAME.speed) + 1) % SPEEDS.length]));
export const pad2 = (n: number) => String(n).padStart(2, '0');
export let clockShown = -1;
export function updateClockUI(){
  const m = Math.floor(CLOCK.h * 60) % 1440; if (m === clockShown) return;
  clockShown = m; $('clockTime').textContent = pad2(Math.floor(m / 60)) + ':' + pad2(m % 60);
}

/* ---- pointeur : se balader, zoomer, tourner, agir ---- */
/** un glisser en cours : ou il a commence, la camera d'alors, et ce qu'il fait (tourner la vue, tourner le batiment, ou deplacer) */
export interface Drag { x: number; y: number; a: number; b: number; phi: number; moved: boolean; id: number; turn: boolean; spin: boolean; dir0: number; right: boolean }
/** un pincement a deux doigts : ecart, angle, rotation et zoom au debut */
export interface Pinch { d: number; ang: number; phi: number; z: number; turning?: boolean }
export let drag: Drag | null = null, pointer: Vec2 | null = null;
export const touches = new Map<number, Vec2>();
export let pinch: Pinch | null = null;
export const keys = new Set<string>();
export function toLogical(e: MouseEvent): Vec2 { const r = scene.getBoundingClientRect(); return [Math.floor((e.clientX - r.left) / r.width * W), Math.floor((e.clientY - r.top) / r.height * H)]; }
// point du sol sous le curseur, dans les deux vues
export function worldUnder(e: MouseEvent): Vec2 { if (OV_ON) return screenToWorld(e.clientX, e.clientY); const [lx, ly] = toLogical(e); return unprj(lx + .5, ly + .5); }
export function catUnder(lx: number, ly: number){
  let best: Cat | null = null, bd = 10;
  for (const c of SH.CATS){ if (!c.screen) continue; const dx = c.screen[0] - lx, dy = c.screen[1] - 3 - ly; const d = Math.hypot(dx, dy * 1.3); if (d < bd){ bd = d; best = c; } }
  return best;
}
// batiment sous le curseur : on remonte le long de la verticale pour attraper les facades
export const TIP_H: Record<string, number> = { maison: 13, immeuble: 22, artdeco: 50, stalinien: 50, stade: 8, parc: 3, fontaine: 5, usine: 22, bulbes: 28, fusee: 40, radio: 48, cirque: 16, tribune: 10, statue: 22, panneau: 29, chateau: 32, qg: 24, supermarche: 11, grandmagasin: 20, kolkhoze: 12, kiosque: 10, cinema: 15, bowling: 11, drivein: 12, diner: 9, motel: 12, station: 9, epicerie: 10, port: 12, pecherie: 8, bergerie: 10, phare: 44, drapeau: 26, checkpoint: 8 };
export function bldPick(lx: number, ly: number){
  for (let z = 50; z >= 0; z -= 1){
    const [a, b] = unprj(lx + .5, ly + .5 + z), l = bldAt(a, b);
    if (l && z <= (TIP_H[l.type] || 14)) return l;
  }
  return null;
}
// vestige catzi sous le curseur (on remonte un peu pour attraper les ruines)
export function vestPick(lx: number, ly: number){ for (let z = 0; z <= 12; z += 2){ const [a, b] = unprj(lx + .5, ly + .5 + z), v = vestAt(a, b, 14); if (v) return v; } return null; }
scene.addEventListener('contextmenu', e => e.preventDefault());
scene.addEventListener('pointerdown', e => {
  if (e.pointerType === 'touch'){
    touches.set(e.pointerId, [e.clientX, e.clientY]);
    if (touches.size === 2){
      const [p, q] = [...touches.values()];
      pinch = { d: Math.hypot(q[0] - p[0], q[1] - p[1]), ang: Math.atan2(q[1] - p[1], q[0] - p[0]), phi: cam.phi, z: SH.Z };
      drag = null; cam.target = null; cam.follow = null; return;
    }
  }
  // en construction, le clic droit glisse fait tourner le batiment au lieu de la vue
  const spin = e.pointerType === 'mouse' && e.button === 2 && state.tool === 'build' && !OV_ON;
  const turn = !spin && e.pointerType === 'mouse' && (e.button === 2 || (e.button === 0 && e.shiftKey));
  if (e.pointerType === 'mouse' && e.button !== 0 && e.button !== 2) return;
  drag = { x: e.clientX, y: e.clientY, a: cam.a, b: cam.b, phi: cam.phi, moved: false, id: e.pointerId, turn, spin, dir0: state.buildDir || 0, right: e.button === 2 };
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
    { const nz = clamp(pinch.z * d / pinch.d, ZMIN(), SH.KMAX); SH.ZANCH = [mx, my]; SH.ZT = nz; setZNow(nz); }
    let da = ang - pinch.ang; while (da > Math.PI) da -= TAU; while (da < -Math.PI) da += TAU;
    if (Math.abs(da) > .08 || pinch.turning){ pinch.turning = true; cam.phi = pinch.phi - da; cam.phiT = null; }
    return;
  }
  if (drag && drag.id === e.pointerId){
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (!drag.moved && Math.hypot(dx, dy) > 5){ drag.moved = true; scene.classList.add(drag.turn || drag.spin ? 'turning' : 'panning'); cam.target = null; cam.follow = null; }
    if (drag.moved){
      if (drag.spin){ const nd = ((drag.dir0 + Math.round(dx / 50)) % 4 + 4) % 4; if (nd !== (state.buildDir || 0)){ state.buildDir = nd; SH.ghost = null; SH.sfx('click'); } }
      else if (drag.turn){ cam.phi = drag.phi + dx * 0.008; cam.phiT = null; }
      else {
        const s = SH.DPR / SH.Z, sv = { a: cam.a, b: cam.b };
        cam.a = drag.a; cam.b = drag.b; setProj();
        const g = groundDelta(dx * s, dy * s);
        cam.a = drag.a - g[0]; cam.b = drag.b - g[1]; clampCam();
        if (!isFinite(cam.a)) Object.assign(cam, sv);
      }
    }
  }
  if (!drag || !drag.moved){
    hoverW = worldUnder(e);
    SH.hoverCat = !OV_ON && state.tool === 'walk' ? catUnder(lx, ly) : null;
    hoverB = !OV_ON && state.tool === 'walk' && !SH.hoverCat ? bldPick(lx, ly) : null;
    scene.classList.toggle('pick', !!SH.hoverCat || !!hoverB || (!OV_ON && state.tool === 'walk' && !!vestPick(lx, ly)));
    if (state.tool === 'build' && GAME.mode === 'play' && !OV_ON){
      const s = buildSpot(hoverW[0], hoverW[1]), e2: EcoDef = SH.ECO[s.type];
      if (s.why) $('modeHint').textContent = s.why;
      else $('modeHint').innerHTML = '<b>' + typeName(s.type, GAME.side) + '</b>' + costHTML(SH.priceOf(s.type, GAME.side)) + '<span>' + (e2.desc || '') + '</span>';
    }
    if (typeof SH.showTip === 'function') SH.showTip(e, hoverB);
  }
});
export function endPointer(e: PointerEvent){
  if (e.pointerType === 'touch'){ touches.delete(e.pointerId); if (touches.size < 2 && pinch){ pinch = null; drag = null; snapZoom(); return; } }
  const d = drag; drag = null; scene.classList.remove('panning', 'turning');
  if (!d || d.moved || d.id !== e.pointerId || e.type === 'pointercancel') return;
  if (d.right){ if (toolPts.length){ toolPts = []; toast('Tracé interrompu.'); } else if (state.tool !== 'walk') setTool('walk'); return; }
  if (d.turn) return;
  const w = worldUnder(e);
  if (state.tool === 'landing'){ if (typeof SH.chooseLanding === 'function') SH.chooseLanding(w[0], w[1]); return; }
  if (GAME.mode !== 'play') return;
  if (state.tool === 'barge'){ SH.bargeTarget(w[0], w[1]); return; }
  // sur la carte : un clic rapproche la vue de cet endroit
  if (OV_ON){ cam.follow = [w[0], w[1]]; setZoom(SH.KDEF, e.clientX, e.clientY); if (state.tool !== 'walk') toast('Rapproche-toi pour construire.'); return; }
  const [lx, ly] = toLogical(e);
  if (state.tool === 'walk'){
    const c = catUnder(lx, ly); if (c){ SH.openChat(c); return; }
    const v = vestPick(lx, ly); if (v){ SH.selectVestige(v); return; }
    SH.selectBuilding(bldPick(lx, ly)); return;
  }
  if (state.tool === 'build') tryBuild(w[0], w[1]);
  else if (state.tool === 'road' || state.tool === 'curve') roadClick(w[0], w[1]);
  else if (state.tool === 'wall') wallClick(w[0], w[1]);
  else if (state.tool === 'demolish') demolishAt(w[0], w[1]);
}
scene.addEventListener('pointerup', endPointer);
scene.addEventListener('pointercancel', endPointer);
scene.addEventListener('pointerleave', () => { pointer = null; SH.hoverCat = null; hoverB = null; if (!drag) hoverW = null; });
export let wheelAcc = 0, wheelT = 0, wheelSnap = 0;
scene.addEventListener('wheel', e => {
  e.preventDefault();
  const now2 = performance.now(); if (now2 - wheelT > 400) wheelAcc = 0; wheelT = now2;
  if (e.ctrlKey){ const nz = clamp(SH.ZT * Math.exp(-e.deltaY * .012), ZMIN(), SH.KMAX); setZoom(nz, e.clientX, e.clientY); clearTimeout(wheelSnap); wheelSnap = setTimeout(snapZoom, 220); return; }
  wheelAcc += e.deltaY * (e.deltaMode === 1 ? 30 : 1);
  if (wheelAcc < -60){ zoomStep(1, e.clientX, e.clientY); wheelAcc = 0; }
  else if (wheelAcc > 60){ zoomStep(-1, e.clientX, e.clientY); wheelAcc = 0; }
}, { passive: false });

export const typing = (e: KeyboardEvent) => e.target instanceof Element && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA');
window.addEventListener('keydown', e => {
  if (!typing(e) && (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z'){ e.preventDefault(); undo(); return; }
  if (typing(e) || e.metaKey || e.ctrlKey || e.altKey) return;
  const k = e.key.toLowerCase();
  if (['arrowleft','arrowright','arrowup','arrowdown','q','a','z','w','s','d'].includes(k)){ keys.add(k); cam.target = null; cam.follow = null; e.preventDefault(); return; }
  if (k === 'escape'){ if (state.chatCat) SH.closeChat(); else if (toolPts.length) toolPts = []; else if (state.sel || state.selV) SH.selectBuilding(null); else if (state.tool !== 'landing') setTool('walk'); return; }
  if (GAME.mode !== 'play'){ if (k === '+' || k === '=') zoomStep(1); else if (k === '-' || k === '_') zoomStep(-1); return; }
  if (k === 'b') setTool(state.tool === 'build' ? 'walk' : 'build');
  else if (k === 'r') setTool('road');
  else if (k === 't' && state.tool === 'build'){ state.buildDir = ((state.buildDir || 0) + 1) % 4; SH.ghost = null; SH.sfx('click'); }
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
export function stepKeys(dt: number){
  let dx = 0, dy = 0;
  if (keys.has('arrowleft') || keys.has('q') || keys.has('a')) dx -= 1;
  if (keys.has('arrowright') || keys.has('d')) dx += 1;
  if (keys.has('arrowup') || keys.has('z') || keys.has('w')) dy -= 1;
  if (keys.has('arrowdown') || keys.has('s')) dy += 1;
  if (dx || dy){ const s = 700 * dt * SH.DPR / SH.Z; const g = groundDelta(dx * s, dy * s); cam.a += g[0]; cam.b += g[1]; clampCam(); }
}

// appeles depuis des modules plus petits en numero
Object.assign(SH, { drawToolPreview, updateZoomUI });
