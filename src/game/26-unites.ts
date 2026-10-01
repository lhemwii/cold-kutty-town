import { SH, type Building, type Side } from './00-shared.ts';
import { GAME, H, HOOKS, M, UP, W, bz, clamp, dep, drawFace, drawFlagPole, fput, line3, prj, state } from './01-core.ts';
import { GA0, GB0, T_ROCK, T_SEA, baseAt, type Vec2 } from './02-ground.ts';
import { Lc, part, rbox, sideLight, wallBase } from './03-buildings-base.ts';
import { TYPES } from './04-types.ts';
import { peaksIn, type Drawable } from './07-world.ts';
import { SID, TC, TER, claimDisc, fogSeenAt, fogVisible } from './08-territory.ts';
import { FOOT, makeBuilding, placeProblem } from './10-town.ts';
import { $, costHTML, toast } from './13-ui.ts';
import { lackText } from './14-hud.ts';
import { CATS_MENU, ECO, bdef, canAfford, payPrice, priceOf, type Price } from './15-economy.ts';
import { rleDecode, rleEncode } from './21-main.ts';
/* ================= etape 5 : brouillard et unites ================= */
// Le brouillard : chaque case de territoire est jamais vue (0), deja vue (1) ou en vue (2) pour le joueur ; ses batiments,
// ses unites et son territoire voient autour d'eux. Les unites : formees par des batiments, on les choisit d'un clic (Maj pour
// en ajouter, G pour toutes), clic droit pour les envoyer ; elles contournent l'eau et les montagnes. Les batisseurs posent un
// camp loin, meme hors du territoire. L'etape 9 ajoute les vehicules, les navires, les avions et le combat.

/* ---- les sortes d'unites ---- */
export type Domain = 'terre' | 'mer' | 'air';
export interface UnitDef {
  name: string; nameCCP?: string; desc: string;
  /** vitesse (unites de terrain par seconde), vue, points de vie, attaque par coup, portee, cadence (secondes entre deux coups) */
  speed: number; sight: number; hp: number; atk: number; range: number; rate: number;
  price: Price; time: number; from: string[]; domain: Domain;
  /** entretien par minute : croquettes (rations), petrole (carburant) */
  upkeep: { c: number; p: number };
  /** nombre de chats dessines, ou vehicule */
  look: 'chats' | 'jeep' | 'char' | 'canon' | 'barge' | 'navire' | 'sousmarin' | 'avion' | 'bombardier' | 'satellite' | 'espion';
  n?: number; tech?: string; carry?: number; bomb?: boolean; spy?: boolean;
}
export const UNIT_DEF: Record<string, UnitDef> = {
  explorateur: { name: 'Explorateur', nameCCP: 'Éclaireur du Peuple', desc: 'Rapide, voit loin : découvre le terrain, les gisements et l’autre camp.', speed: 22, sight: 110, hp: 20, atk: 0, range: 0, rate: 1,
    price: { l: 0, c: 25, r: 5 }, time: 8, from: ['qg', 'ville', 'caserne'], domain: 'terre', upkeep: { c: .3, p: 0 }, look: 'chats', n: 1 },
  batisseurs: { name: 'Bâtisseurs', nameCCP: 'Brigade de travailleurs', desc: 'Posent un camp loin, même hors du territoire : le début d’une nouvelle ville.', speed: 12, sight: 60, hp: 30, atk: 0, range: 0, rate: 1,
    price: { l: 20, c: 30, r: 10 }, time: 12, from: ['qg', 'ville'], domain: 'terre', upkeep: { c: .5, p: 0 }, look: 'chats', n: 2 },
  soldats: { name: 'Soldats', nameCCP: 'Soldats du Peuple', desc: 'Défendent, prennent les bâtiments ennemis, volent des ressources en territoire ennemi.', speed: 14, sight: 70, hp: 60, atk: 6, range: 18, rate: 1.2,
    price: { l: 10, c: 40, r: 15 }, time: 14, from: ['caserne'], domain: 'terre', upkeep: { c: .8, p: 0 }, look: 'chats', n: 3 },
};
SH.UNIT_DEF = UNIT_DEF;
export const unitName = (kind: string, side: Side): string => { const d = UNIT_DEF[kind]; return d ? (side === 'ccp' && d.nameCCP ? d.nameCCP : d.name) : kind; };

/* ---- les unites ---- */
export interface Unit {
  id: number; kind: string; side: Side; a: number; b: number; ang: number;
  path: Vec2[]; pi: number; hp: number; cool: number;
  /** ordre en cours : aller, poser un camp, attaquer une unite ou un batiment */
  order: null | { kind: 'move' } | { kind: 'camp'; a: number; b: number } | { kind: 'attack'; uid?: number; bid?: number; auto?: boolean } | { kind: 'board'; ship: number } | { kind: 'unload' } | { kind: 'home' };
  /** a bord d'un navire de transport (id), ou les unites qu'il porte */
  aboard?: number; cargo?: number[];
  /** fin de vie (degats) */
  dead?: boolean; flash?: number;
}
export const UNITS: Unit[] = [];
SH.UNITS = UNITS;
let UID = 1;
export const SEL = new Set<number>();
export function spawnUnit(kind: string, side: Side, a: number, b: number): Unit {
  const d = UNIT_DEF[kind], u: Unit = { id: UID++, kind, side, a, b, ang: 0, path: [], pi: 0, hp: d ? d.hp : 10, cool: 0, order: null };
  UNITS.push(u); return u;
}
export const unitById = (id: number): Unit | undefined => UNITS.find(u => u.id === id);
SH.spawnUnit = spawnUnit; SH.sendUnit = (u: Unit, a: number, b: number) => sendUnit(u, a, b); SH.passable = (d: Domain, a: number, b: number) => passable(d, a, b);

/* ---- la grille de passage : une case de 8 unites, terre praticable (ni mer, ni roche, ni pente de montagne) ou mer ---- */
export const GS8 = 8;
let PW = 0, PH = 0, PLAND = new Uint8Array(0), PSEA = new Uint8Array(0), passFor = '';
function passGrid(){
  const key = TER.W + 'x' + TER.H + ':' + GAME.seed + ':' + (SH.TUNNEL_VER || 0);
  if (key === passFor) return;
  passFor = key;
  PW = Math.ceil(TER.W * TC / GS8); PH = Math.ceil(TER.H * TC / GS8);
  PLAND = new Uint8Array(PW * PH); PSEA = new Uint8Array(PW * PH);
  for (let y = 0; y < PH; y++) for (let x = 0; x < PW; x++){
    const a = GA0 + (x + .5) * GS8, b = GB0 + (y + .5) * GS8, t = baseAt(a, b);
    if (t === T_SEA){ let deep = true; for (const [da, db] of [[-3, -3], [3, 3], [-3, 3], [3, -3]]) if (baseAt(a + da, b + db) !== T_SEA) deep = false; PSEA[y * PW + x] = deep ? 1 : 0; if (SH.tunnelAt && SH.tunnelAt(a, b)) PLAND[y * PW + x] = 1; continue; }
    let ok = t !== T_ROCK;
    if (ok) peaksIn(a - 60, a + 60, b - 60, b + 60, (pk) => { if (Math.hypot(pk.a - a, pk.b - b) < pk.R * .8) ok = false; });
    // un tunnel ouvre un passage dans la montagne (etape 6)
    if (!ok && SH.tunnelAt && SH.tunnelAt(a, b)) ok = true;
    PLAND[y * PW + x] = ok ? 1 : 0;
  }
}
SH.passGridDirty = () => { passFor = ''; };
const cellXY = (a: number, b: number): [number, number] => [Math.floor((a - GA0) / GS8), Math.floor((b - GB0) / GS8)];
export function passable(domain: Domain, a: number, b: number): boolean {
  if (domain === 'air') return true;
  passGrid(); const [x, y] = cellXY(a, b); if (x < 0 || y < 0 || x >= PW || y >= PH) return false;
  return (domain === 'mer' ? PSEA : PLAND)[y * PW + x] === 1;
}
// chemin le plus court (A*, huit voisins) ; null si on ne peut pas y aller. La neige ralentit, pas le chemin.
let HEAP = new Int32Array(0), GSC_ = new Float32Array(0), FROM = new Int32Array(0), STAMP = new Int32Array(0), stampN = 0;
export function findPath(domain: Domain, a0: number, b0: number, a1: number, b1: number): Vec2[] | null {
  if (domain === 'air') return [[a1, b1]];
  passGrid();
  const G = domain === 'mer' ? PSEA : PLAND, N = PW * PH;
  if (STAMP.length !== N){ HEAP = new Int32Array(N + 8); GSC_ = new Float32Array(N); FROM = new Int32Array(N); STAMP = new Int32Array(N); stampN = 0; }
  let [sx, sy] = cellXY(a0, b0), [tx, ty] = cellXY(a1, b1);
  const inside = (x: number, y: number) => x >= 0 && y >= 0 && x < PW && y < PH;
  if (!inside(sx, sy) || !inside(tx, ty)) return null;
  // arrivee sur une case interdite : la case permise la plus proche
  if (!G[ty * PW + tx]){ let best = -1, bd = 1e9; for (let r = 1; r < 6 && best < 0; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++){ const x = tx + dx, y = ty + dy; if (inside(x, y) && G[y * PW + x] && dx * dx + dy * dy < bd){ bd = dx * dx + dy * dy; best = y * PW + x; } } if (best < 0) return null; tx = best % PW; ty = (best / PW) | 0; }
  if (!G[sy * PW + sx]){ let best = -1, bd = 1e9; for (let r = 1; r < 4 && best < 0; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++){ const x = sx + dx, y = sy + dy; if (inside(x, y) && G[y * PW + x] && dx * dx + dy * dy < bd){ bd = dx * dx + dy * dy; best = y * PW + x; } } if (best < 0) return null; sx = best % PW; sy = (best / PW) | 0; }
  stampN++;
  const st = sy * PW + sx, goal = ty * PW + tx, hx = (i: number) => { const x = i % PW, y = (i / PW) | 0, dx = Math.abs(x - tx), dy = Math.abs(y - ty); return Math.max(dx, dy) + .414 * Math.min(dx, dy); };
  const FS = new Map<number, number>();
  let hn = 0;
  const push = (i: number, f: number) => { FS.set(i, f); let k = hn++; HEAP[k] = i; while (k > 0){ const pk = (k - 1) >> 1; if ((FS.get(HEAP[pk]) || 0) <= f) break; HEAP[k] = HEAP[pk]; HEAP[pk] = i; k = pk; } };
  const pop = (): number => { const top = HEAP[0]; const last = HEAP[--hn]; let k = 0; const f = FS.get(last) || 0; for (;;){ const l = 2 * k + 1, r = l + 1; let m = k, mf = f; if (l < hn && (FS.get(HEAP[l]) || 0) < mf){ m = l; mf = FS.get(HEAP[l]) || 0; } if (r < hn && (FS.get(HEAP[r]) || 0) < mf){ m = r; } if (m === k) break; HEAP[k] = HEAP[m]; k = m; } HEAP[k] = last; return top; };
  STAMP[st] = stampN; GSC_[st] = 0; FROM[st] = -1; push(st, hx(st));
  let found = false, iter = 0;
  while (hn > 0 && iter++ < 90000){
    const cur = pop(); if (cur === goal){ found = true; break; }
    const cx = cur % PW, cy = (cur / PW) | 0, g0 = GSC_[cur];
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++){
      if (!dx && !dy) continue;
      const x = cx + dx, y = cy + dy; if (!inside(x, y)) continue;
      const ni = y * PW + x; if (!G[ni]) continue;
      if (dx && dy && (!G[cy * PW + x] || !G[y * PW + cx])) continue;
      const g = g0 + (dx && dy ? 1.414 : 1);
      if (STAMP[ni] === stampN && GSC_[ni] <= g) continue;
      STAMP[ni] = stampN; GSC_[ni] = g; FROM[ni] = cur; push(ni, g + hx(ni));
    }
  }
  if (!found) return null;
  const out: Vec2[] = []; let k = goal;
  while (k !== st && k >= 0){ out.push([GA0 + (k % PW + .5) * GS8, GB0 + (((k / PW) | 0) + .5) * GS8]); k = FROM[k]; }
  out.reverse();
  if (out.length) out[out.length - 1] = [a1, b1];
  // lisser : on saute les points intermediaires d'une ligne droite praticable
  const sm: Vec2[] = []; let from: Vec2 = [a0, b0], i = 0;
  while (i < out.length){ let j = out.length - 1; while (j > i && !lineFree(G, from, out[j])) j--; sm.push(out[j]); from = out[j]; i = j + 1; }
  return sm;
}
function lineFree(G: Uint8Array, p: Vec2, q: Vec2): boolean {
  const L = Math.hypot(q[0] - p[0], q[1] - p[1]), n = Math.ceil(L / 4);
  for (let k = 1; k < n; k++){ const a = p[0] + (q[0] - p[0]) * k / n, b = p[1] + (q[1] - p[1]) * k / n, [x, y] = cellXY(a, b); if (x < 0 || y < 0 || x >= PW || y >= PH || !G[y * PW + x]) return false; }
  return true;
}
export function sendUnit(u: Unit, a: number, b: number): boolean {
  const d = UNIT_DEF[u.kind]; if (!d) return false;
  const p = findPath(d.domain, u.a, u.b, a, b); if (!p){ return false; }
  u.path = p; u.pi = 0; return true;
}

/* ---- production : un batiment forme ses unites, une a la fois ---- */
export interface Training { bid: number; kind: string; t0: number; dur: number }
export const TRAIN: Training[] = [];
export function trainUnit(l: Building, kind: string): string {
  const d = UNIT_DEF[kind]; if (!d) return 'Unité inconnue.';
  if (d.tech && SH.hasTech && !SH.hasTech(l.side, d.tech)) return 'Il faut d’abord la recherche « ' + (SH.techName ? SH.techName(d.tech) : d.tech) + ' ».';
  if (!canAfford(l.side, d.price)) return 'Il faut ' + SH.costLabel(d.price) + '.';
  payPrice(l.side, d.price);
  const last = TRAIN.filter(t => t.bid === l.id).reduce((m, t) => Math.max(m, t.t0 + t.dur), GAME.t);
  TRAIN.push({ bid: l.id, kind, t0: last, dur: d.time });
  return '';
}
// la sortie d'un batiment : devant sa porte, ou sur l'eau pour un navire
function exitOf(l: Building, d: UnitDef): Vec2 {
  if (d.domain === 'mer' && SH.pierEnd) return SH.pierEnd(l);
  return [l.ca + (Math.random() - .5) * 8, l.b1 + 6];
}

/* ---- pas de jeu : production, deplacement, ordres, combat ---- */
const speedOf = (u: Unit, d: UnitDef): number => d.speed * (SH.groundSlow ? SH.groundSlow(u.a, u.b, d.domain) : 1);
HOOKS.step.push((dt: number) => {
  if (GAME.mode !== 'play' || dt <= 0) return;
  // production
  for (let k = TRAIN.length - 1; k >= 0; k--){
    const tr = TRAIN[k]; if (GAME.t < tr.t0 + tr.dur) continue;
    TRAIN.splice(k, 1);
    const l = (SH.BLD as Building[]).find(o => o.id === tr.bid); if (!l) continue;
    const d = UNIT_DEF[tr.kind], [a, b] = exitOf(l, d), u = spawnUnit(tr.kind, l.side, a, b);
    if (l.side === GAME.side){ toast(unitName(tr.kind, l.side) + ' : prêt' + (d.n && d.n > 1 ? 's' : '') + '.'); SH.sfx('click'); }
    if (SH.logDay) SH.logDay(l.side, 'unit', unitName(tr.kind, l.side), { id: u.id });
  }
  for (const u of UNITS){
    if (u.dead || u.aboard) continue;
    const d = UNIT_DEF[u.kind]; if (!d) continue;
    u.cool = Math.max(0, u.cool - dt);
    if (u.flash) u.flash = Math.max(0, u.flash - dt);
    // ordre d'attaque : on suit la cible jusqu'a portee
    if (u.order && u.order.kind === 'attack' && SH.combatChase) SH.combatChase(u, d);
    if (u.pi < u.path.length){
      const [ta, tb] = u.path[u.pi], da = ta - u.a, db = tb - u.b, L = Math.hypot(da, db), step = speedOf(u, d) * dt;
      if (L <= step){ u.a = ta; u.b = tb; u.pi++; }
      else { u.a += da / L * step; u.b += db / L * step; u.ang = Math.atan2(db, da); }
      if (u.pi >= u.path.length) arrived(u);
    }
  }
  if (SH.combatStep) SH.combatStep(dt);
  for (let k = UNITS.length - 1; k >= 0; k--) if (UNITS[k].dead){ SEL.delete(UNITS[k].id); UNITS.splice(k, 1); }
});
// arrivee : les batisseurs posent leur camp
function arrived(u: Unit){
  const o = u.order;
  if (o && o.kind === 'camp'){
    u.order = null;
    const why = placeProblem('drapeau', u.side, o.a, o.b, 0, true);
    if (why){ if (u.side === GAME.side) toast('Pas de camp ici : ' + why.charAt(0).toLowerCase() + why.slice(1)); return; }
    const pr = priceOf('drapeau', u.side);
    if (!canAfford(u.side, pr)){ if (u.side === GAME.side) toast('Il faut ' + SH.costLabel(pr) + ' pour le camp.'); return; }
    payPrice(u.side, pr);
    const l = makeBuilding('drapeau', u.side, o.a, o.b, 0);
    SH.startBuilding(l); claimDisc(o.a, o.b, 14, u.side);
    if (u.side === GAME.side){ toast('Les bâtisseurs montent le camp.'); SH.sfx('build', o.a, o.b); }
  } else if (o && o.kind === 'move') u.order = null;
  else if (typeof SH.unitArrived === 'function') SH.unitArrived(u);
}

/* ---- brouillard : ce que voit le joueur, deux fois par seconde ---- */
let fogAcc = 0;
export function updateFog(){
  if (!TER.fog.length || TER.fog.length !== TER.N) return;
  const F = TER.fog, own = TER.own, sid = SID[GAME.side], Wd = TER.W;
  for (let i = 0, n = TER.N; i < n; i++){ if (F[i] === 2) F[i] = 1; if (own[i] === sid) F[i] = 2; }
  const see = (a: number, b: number, r: number) => {
    const x0 = Math.max(0, Math.floor((a - r - GA0) / TC)), x1 = Math.min(Wd - 1, Math.floor((a + r - GA0) / TC));
    const y0 = Math.max(0, Math.floor((b - r - GB0) / TC)), y1 = Math.min(TER.H - 1, Math.floor((b + r - GB0) / TC)), r2 = r * r;
    for (let y = y0; y <= y1; y++){ const db = GB0 + (y + .5) * TC - b, db2 = db * db; for (let x = x0; x <= x1; x++){ const da = GA0 + (x + .5) * TC - a; if (da * da + db2 <= r2) F[y * Wd + x] = 2; } }
  };
  for (const l of SH.BLD as Building[]) if (l.side === GAME.side) see(l.ca, l.cb, l.type === 'qg' || l.type === 'ville' ? 110 : l.type === 'radar' ? 260 : 60);
  for (const u of UNITS) if (u.side === GAME.side && !u.aboard){ const d = UNIT_DEF[u.kind]; if (d) see(u.a, u.b, d.sight); }
  for (const f of SH.FOG_SOURCES || []) f(see);
}
HOOKS.step.push((dt: number) => {
  if (GAME.mode !== 'play'){ if (TER.fogOn){ TER.fogOn = false; } return; }
  if (!TER.fogOn && SH.fogWanted !== false){
    // nouvelle partie (tout est encore a 2) : rien n'a encore ete vu ; une partie chargee garde son brouillard
    if (TER.fog.every(v => v === 2)) TER.fog.fill(0);
    TER.fogOn = true; updateFog();
  }
  fogAcc += dt; if (fogAcc < .5 && dt > 0) return; fogAcc = 0;
  if (TER.fogOn) updateFog();
});
// le joueur voit-il ce gisement (pour le poser) ? l'IA, elle, connait l'ile
SH.fogSeen = (side: Side, a: number, b: number): boolean => side !== GAME.side || !TER.fogOn || fogSeenAt(a, b);

/* ---- dessin des unites ---- */
// un petit chat en uniforme : le corps a la couleur du camp, la tete, un casque ou un chapeau
function drawTrooper(x: number, y: number, side: Side, kind: string, k: number, t: number, moving: boolean){
  const step = moving ? (Math.floor(t * 8 + k) & 1) : 0;
  SH.CUR = M.METAL; fput(x - 1, y, 0); fput(x + 1, y, 0); if (step){ fput(x - 1, y - 1, 0); } else fput(x + 1, y - 1, 0);
  SH.CUR = side === 'ccp' ? M.FLAG_RED : M.FLAG_BLUE;
  for (let dy = 2; dy <= 4; dy++) for (let dx = -1; dx <= 1; dx++) fput(x + dx, y - dy, dx === -1 ? 0 : 1);
  SH.CUR = M.CAT_OR; for (let dx = -1; dx <= 1; dx++){ fput(x + dx, y - 5, 1); fput(x + dx, y - 6, 1); } fput(x - 1, y - 7, 0); fput(x + 1, y - 7, 0);
  if (kind === 'soldats'){ SH.CUR = M.MILITARY; for (let dx = -2; dx <= 2; dx++) fput(x + dx, y - 7, 0); fput(x, y - 8, 0); fput(x - 1, y - 8, 0); fput(x + 1, y - 8, 0); SH.CUR = M.METAL; fput(x + 2, y - 3, 0); fput(x + 2, y - 4, 0); fput(x + 2, y - 5, 0); fput(x + 2, y - 6, 1); }
  else if (kind === 'batisseurs'){ SH.CUR = M.ICON_Y; for (let dx = -1; dx <= 1; dx++) fput(x + dx, y - 7, 1); fput(x, y - 8, 1); }
  else if (kind === 'explorateur'){ SH.CUR = side === 'ccp' ? M.CAT_GRAY : M.PIER; for (let dx = -2; dx <= 2; dx++) fput(x + dx, y - 7, 0); fput(x, y - 8, 0); fput(x - 1, y - 8, 0); }
}
export function drawUnit(u: Unit, t: number){
  const d = UNIT_DEF[u.kind]; if (!d) return;
  if (SH.drawVehicle && d.look !== 'chats' && SH.drawVehicle(u, d, t)) { /* dessine par l'etape 9 */ }
  else {
    const p = prj(u.a, u.b, 0), x = Math.round(p[0]), y = Math.round(p[1]), moving = u.pi < u.path.length;
    const n = d.n || 1;
    for (let k = 0; k < n; k++) drawTrooper(x + (k - (n - 1) / 2) * 5, y + (k & 1), u.side, u.kind, k, t, moving);
  }
  const p = prj(u.a, u.b, 0), x = Math.round(p[0]), y = Math.round(p[1]);
  if (SEL.has(u.id)){ SH.CUR = M.ICON_Y; for (let k = 0; k < 20; k++){ const an = k / 20 * Math.PI * 2; fput(x + Math.round(Math.cos(an) * 9), y + Math.round(Math.sin(an) * 4), 1); } }
  if (SEL.has(u.id) || u.hp < d.hp){
    const w = 12, f = clamp(u.hp / d.hp, 0, 1), by = y - 14;
    SH.CUR = M.BUBBLE; for (let i = -1; i <= w; i++){ fput(x - 6 + i, by - 1, 0); fput(x - 6 + i, by + 1, 0); }
    SH.CUR = f > .5 ? M.FW_GREEN : M.ICON_R; for (let i = 0; i < w; i++) fput(x - 6 + i, by, i < Math.round(f * w) ? 0 : 1);
  }
  if (u.flash){ SH.CUR = M.ICON_Y; fput(x + 3, y - 10, 1); fput(x + 4, y - 11, 1); }
}
HOOKS.dyn.push((t: number, out: Drawable[]) => {
  if (GAME.mode !== 'play') return;
  for (const u of UNITS){
    if (u.aboard || (SH.hiddenUnit && SH.hiddenUnit(u))) continue;
    const q = prj(u.a, u.b, 0); if (q[0] < -30 || q[0] > W + 30 || q[1] < -30 || q[1] > H + 30) continue;
    const d = UNIT_DEF[u.kind], air = d && d.domain === 'air';
    out.push({ d: dep(u.a, u.b) + (air ? 60 : .3), a: u.a, b: u.b, side: u.side, f: (tt: number) => drawUnit(u, tt) });
  }
});

/* ---- choisir et commander les unites ---- */
// action en attente de sa cible (poser un camp...)
let aim: null | { kind: 'camp' } = null;
function pickUnit(a: number, b: number): Unit | null {
  let best: Unit | null = null, bd = 12;
  for (const u of UNITS){ if (u.aboard || (u.side !== GAME.side && TER.fogOn && !fogVisible(u.a, u.b))) continue; const dd = Math.hypot(u.a - a, u.b - b); if (dd < bd){ bd = dd; best = u; } }
  return best;
}
SH.unitClick = (a: number, b: number, _lx: number, _ly: number, shift: boolean): boolean => {
  if (aim){
    const builders = [...SEL].map(unitById).filter((u): u is Unit => !!u && u.kind === 'batisseurs');
    aim = null; document.body.classList.remove('aiming'); $('modeHint').textContent = '';
    if (!builders.length) return true;
    const why = placeProblem('drapeau', GAME.side, a, b, 0, true);
    if (why){ toast(why); return true; }
    const u = builders[0]; if (!sendUnit(u, a, b)){ toast('Les bâtisseurs ne trouvent pas de chemin jusque-là.'); return true; }
    u.order = { kind: 'camp', a, b }; toast('Les bâtisseurs partent poser le camp.'); SH.sfx('click');
    return true;
  }
  const u = pickUnit(a, b);
  if (!u){ if (SEL.size && !shift){ SEL.clear(); renderUnitPanel(); } return false; }
  if (u.side !== GAME.side){ toast(unitName(u.kind, u.side) + ' de l’autre camp.'); return true; }
  if (!shift) SEL.clear();
  if (SEL.has(u.id) && shift) SEL.delete(u.id); else SEL.add(u.id);
  SH.selectBuilding(null); if (state.chatCat) SH.closeChat();
  renderUnitPanel(); SH.sfx('click');
  return true;
};
SH.unitOrder = (a: number, b: number): boolean => {
  if (!SEL.size) return false;
  // une cible ennemie sous le clic : attaquer
  const foe = UNITS.find(u => u.side !== GAME.side && !u.aboard && Math.hypot(u.a - a, u.b - b) < 12 && (!TER.fogOn || fogVisible(u.a, u.b)));
  const bfoe = (SH.BLD as Building[]).find(l => l.side !== GAME.side && a > l.a0 && a < l.a1 && b > l.b0 && b < l.b1 && (!TER.fogOn || fogSeenAt(l.ca, l.cb)));
  let n = 0, lost = 0, k = 0;
  const sel = [...SEL].map(unitById).filter((u): u is Unit => !!u);
  for (const u of sel){
    const d = UNIT_DEF[u.kind];
    if ((foe || bfoe) && d && d.atk > 0){ u.order = foe ? { kind: 'attack', uid: foe.id } : { kind: 'attack', bid: bfoe ? bfoe.id : 0 }; n++; continue; }
    // en formation : on ecarte un peu les points d'arrivee
    const off = k++ * 7, an = k * 2.4;
    if (SH.boardOrder && SH.boardOrder(u, a, b, sel)){ n++; continue; }
    if (sendUnit(u, a + Math.cos(an) * off * .5, b + Math.sin(an) * off * .5)){ u.order = { kind: 'move' }; n++; } else lost++;
  }
  if (n){ SH.sfx('click'); markOrder(a, b); }
  if (lost) toast(lost === sel.length ? 'Pas de chemin jusque-là.' : 'Certaines unités ne trouvent pas de chemin.');
  return true;
};
// Ctrl glisse : toutes ses unites dans le cadre (Maj pour les ajouter a la selection)
SH.unitBox = (x0: number, y0: number, x1: number, y1: number, shift: boolean): void => {
  const xa = Math.min(x0, x1), xb = Math.max(x0, x1), ya = Math.min(y0, y1), yb = Math.max(y0, y1);
  if (!shift) SEL.clear();
  for (const u of UNITS){ if (u.side !== GAME.side || u.aboard) continue; const q = prj(u.a, u.b, 0); if (q[0] >= xa && q[0] <= xb && q[1] - 4 >= ya - 4 && q[1] - 4 <= yb + 4) SEL.add(u.id); }
  if (SEL.size){ SH.selectBuilding(null); SH.sfx('click'); }
  renderUnitPanel();
};
HOOKS.top.push(() => {
  const bx: number[] | null = SH.selBox; if (!bx) return;
  const xa = Math.round(Math.min(bx[0], bx[2])), xb = Math.round(Math.max(bx[0], bx[2])), ya = Math.round(Math.min(bx[1], bx[3])), yb = Math.round(Math.max(bx[1], bx[3]));
  SH.CUR = M.ICON_Y;
  for (let x = xa; x <= xb; x++){ fput(x, ya, 1); fput(x, yb, 1); }
  for (let y = ya; y <= yb; y++){ fput(xa, y, 1); fput(xb, y, 1); }
});
SH.unitEscape = (): boolean => { if (aim){ aim = null; document.body.classList.remove('aiming'); $('modeHint').textContent = ''; return true; } if (SEL.size){ SEL.clear(); renderUnitPanel(); return true; } return false; };
// G : toutes ses unites a l'ecran
window.addEventListener('keydown', e => {
  if (e.target instanceof Element && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
  if (e.key.toLowerCase() !== 'g' || GAME.mode !== 'play' || e.ctrlKey || e.metaKey) return;
  SEL.clear();
  for (const u of UNITS){ if (u.side !== GAME.side || u.aboard) continue; const q = prj(u.a, u.b, 0); if (q[0] >= 0 && q[0] < W && q[1] >= 0 && q[1] < H) SEL.add(u.id); }
  renderUnitPanel(); SH.sfx('click');
});
// le point vise clignote un instant
let orderMark: null | { a: number; b: number; t: number } = null;
function markOrder(a: number, b: number){ orderMark = { a, b, t: GAME.t }; }
HOOKS.top.push((t: number) => {
  if (!orderMark || GAME.t - orderMark.t > 1.2) return;
  const p = prj(orderMark.a, orderMark.b, 0), x = Math.round(p[0]), y = Math.round(p[1]), r = 3 + ((GAME.t - orderMark.t) * 6) % 4;
  SH.CUR = M.ICON_Y; for (let k = 0; k < 16; k++){ const an = k / 16 * Math.PI * 2; fput(x + Math.round(Math.cos(an) * r * 2), y + Math.round(Math.sin(an) * r), 1); }
  void t;
});

/* ---- le panneau des unites choisies ---- */
export function renderUnitPanel(){
  const el = $('units'), sel = [...SEL].map(unitById).filter((u): u is Unit => !!u);
  el.hidden = !sel.length; document.body.classList.toggle('units-open', !!sel.length);
  if (!sel.length) return;
  if (!$('sel').hidden) SH.selectBuilding(null);
  const kinds = new Map<string, Unit[]>(); for (const u of sel){ if (!kinds.has(u.kind)) kinds.set(u.kind, []); kinds.get(u.kind)?.push(u); }
  let h = '<div class="un-head"><b>' + (sel.length === 1 ? unitName(sel[0].kind, sel[0].side) : sel.length + ' unités') + '</b><button class="btn k" type="button" id="unClose" aria-label="Fermer">×</button></div><div class="un-list">';
  for (const [k, us] of kinds){ const d = UNIT_DEF[k], hp = us.reduce((s, u) => s + u.hp, 0), mx = us.length * d.hp; h += '<div class="un-row"><span>' + unitName(k, GAME.side) + (us.length > 1 ? ' × ' + us.length : '') + '</span><span class="xr-bar"><i style="width:' + Math.round(hp / mx * 100) + '%"></i></span></div>'; }
  h += '</div><p class="sel-note">' + (sel.length === 1 ? UNIT_DEF[sel[0].kind].desc + ' ' : '') + 'Clic droit pour les envoyer, sur un ennemi pour l’attaquer. Ctrl glissé : un cadre. G : toutes tes unités à l’écran.</p><div class="un-act">';
  if (kinds.has('batisseurs')) h += '<button class="btn" type="button" data-un="camp">Poser un camp<i>' + costHTML(priceOf('drapeau', GAME.side)) + '</i></button>';
  if (SH.unitActions) h += SH.unitActions(sel);
  h += '<button class="btn" type="button" data-un="stop">Halte</button><button class="btn danger" type="button" data-un="dissoudre">Dissoudre</button></div>';
  el.innerHTML = h;
  $('unClose').addEventListener('click', () => { SEL.clear(); renderUnitPanel(); });
  for (const b of el.querySelectorAll('[data-un]')) if (b instanceof HTMLElement) b.addEventListener('click', () => {
    const k = b.dataset.un;
    if (k === 'camp'){ aim = { kind: 'camp' }; document.body.classList.add('aiming'); $('modeHint').textContent = 'Clique où poser le camp : les bâtisseurs y vont, même hors de ton territoire.'; }
    else if (k === 'stop'){ for (const u of sel){ u.path = []; u.pi = 0; u.order = null; } }
    else if (k && SH.unitAct && SH.unitAct(k, sel)) { /* action d'un autre module (espions...) */ }
    else if (k === 'dissoudre'){ for (const u of sel) u.dead = true; SEL.clear(); renderUnitPanel(); toast('Unités dissoutes.'); }
    SH.sfx('click');
  });
}
let unAcc = 0;
HOOKS.step.push((dt: number) => { unAcc += dt; if (unAcc > 1 && SEL.size){ unAcc = 0; for (const id of [...SEL]) if (!unitById(id)) SEL.delete(id); if (!SEL.size) renderUnitPanel(); } });
// un batiment choisi : les unites qu'il forme
SH.selExtra = (l: Building, btn: (label: string, sub: string, fn: () => void, why?: string) => HTMLButtonElement, act: HTMLElement) => {
  if (!l.done) return;
  for (const k of Object.keys(UNIT_DEF)){
    const d = UNIT_DEF[k]; if (!d.from.includes(l.type)) continue;
    const lack = lackText(d.price), techMiss = d.tech && SH.hasTech && !SH.hasTech(l.side, d.tech);
    btn('Former : ' + unitName(k, l.side), costHTML(d.price), () => { const why = trainUnit(l, k); if (why) toast(why); else { toast(unitName(k, l.side) + ' : en formation (' + d.time + ' s).'); SH.sfx('click'); } }, techMiss ? 'Il faut la recherche « ' + (SH.techName ? SH.techName(d.tech) : d.tech) + ' ».' : lack ? 'Il manque ' + lack + '.' : '');
  }
  const q = TRAIN.filter(t => t.bid === l.id);
  if (q.length){ const n = document.createElement('p'); n.className = 'sel-note'; n.textContent = 'En formation : ' + q.map(t => unitName(t.kind, l.side)).join(', ') + '.'; act.append(n); }
};

/* ---- entretien : les rations des unites, et le carburant des vehicules ---- */
SH.unitUpkeep = (side: Side) => { let c = 0, p = 0; for (const u of UNITS){ if (u.side !== side) continue; const d = UNIT_DEF[u.kind]; if (d){ c += d.upkeep.c; p += d.upkeep.p; } } return { c, p }; };

/* ---- la caserne ---- */
TYPES.caserne = { name: 'Base militaire', nameCCP: 'Caserne du Peuple', fem: true, build(lot: Building, seed: number){
  const ccp = lot.side === 'ccp', a0 = lot.ca - 13, a1 = lot.ca + 9, b0 = lot.cb - 7, b1 = lot.cb + 5;
  const body = () => {
    SH.CUR = ccp ? M.CONCRETE : M.MILITARY;
    rbox(lot.ca - 2, lot.cb - 1, 0, -11, 11, -6, 6, 0, 7, (u: number, h: number, x: number, y: number) => (h > 2.5 && h < 4.5 && (u % 3) > 1.2) ? 3 : (h > 6 ? 1 : wallBase(0, x, y)), (x: number, y: number) => bz(x, y) < 2 ? 1 : 0);
  };
  const mast = (t: number) => { SH.CUR = M.METAL; line3(a1 + 3, b1 + 3, 0, a1 + 3, b1 + 3, 20, 1); drawFlagPole(a1 + 3, b1 + 3, 0, 20, lot.side, t); };
  const yard = () => { SH.CUR = M.DIRT; drawFace([a0, b1 + 2, 0, a1, b1 + 2, 0, a1, b1 + 9, 0, a0, b1 + 9, 0], UP, (x: number, y: number) => bz(x, y) < 3 ? 1 : 0, -1); };
  void seed;
  return { parts: [part(lot.ca, lot.cb, 0, body), part(a1 + 3, b1 + 3, .3, mast)], decals: [yard], lights: [sideLight(a0, a1, b0, b1, 0, 8, 1), Lc(lot.ca, b1 + 6, 10, 1.1)] };
} };
ECO.caserne = bdef('armee', 50, { c: -2, jobs: 6, rad: 40, up: true, desc: 'Forme les soldats et les explorateurs. Les soldats coûtent des rations.' });
FOOT.caserne = [32, 28];
if (!CATS_MENU.some(c => c[0] === 'armee')) CATS_MENU.push(['armee', 'Armée']);

/* ---- sauvegarde ---- */
HOOKS.save.push((ext) => {
  ext.units = UNITS.filter(u => !u.dead).map(u => [u.kind, u.side === 'usc' ? 0 : 1, Math.round(u.a * 10) / 10, Math.round(u.b * 10) / 10, Math.round(u.hp)]);
  ext.train = TRAIN.map(t => [t.bid, t.kind, Math.round(t.t0 - GAME.t), t.dur]);
  if (TER.fog.length) ext.fog = rleEncode(TER.fog);
});
HOOKS.load.push((ext) => {
  UNITS.length = 0; SEL.clear(); TRAIN.length = 0;
  if (Array.isArray(ext.units)) for (const r of ext.units) if (Array.isArray(r) && UNIT_DEF[String(r[0])]){ const u = spawnUnit(String(r[0]), r[1] ? 'ccp' : 'usc', +r[2], +r[3]); u.hp = +r[4] || u.hp; }
  if (typeof ext.fog === 'string' && TER.fog.length){ rleDecode(ext.fog, TER.fog); for (let i = 0; i < TER.fog.length; i++) if (TER.fog[i] === 2) TER.fog[i] = 1; }
});
HOOKS.reset.push(() => { UNITS.length = 0; SEL.clear(); TRAIN.length = 0; passFor = ''; aim = null; });

/* ---- le brouillard sur la mini-carte ---- */
let mapSeen = -1;
HOOKS.after.push(() => {
  if (!TER.fogOn || GAME.mode !== 'play' || !document.body.classList.contains('has-map')) return;
  if (SH.MINI_T === mapSeen) return; mapSeen = SH.MINI_T;
  const cv = document.getElementById('mapCv'); if (!(cv instanceof HTMLCanvasElement)) return;
  const g = cv.getContext('2d'); if (!g || !SH.miniAB) return;
  for (let y = 0; y < cv.height; y += 3) for (let x = 0; x < cv.width; x += 3){
    const [a, b] = SH.miniAB(x + 1.5, y + 1.5), f = fogSeenAt(a, b) ? (fogVisible(a, b) ? 2 : 1) : 0;
    if (f === 0){ g.fillStyle = '#0f0f12'; g.fillRect(x, y, 3, 3); } else if (f === 1){ g.fillStyle = 'rgba(15,15,18,.35)'; g.fillRect(x, y, 3, 3); }
  }
});
