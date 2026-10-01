import { SH, type Building, type Side } from './00-shared.ts';
import { GAME, H, HOOKS, M, UP, W, boxS, bz, drawFace, drawStar, fput, gableRoof2, gableWalls, line3, prj, wallFace, winColor } from './01-core.ts';
import { nearestShore } from './02-ground.ts';
import { Lc, drawHull, part, rbox, rot2, sideLight, wallBase } from './03-buildings-base.ts';
import { TYPES } from './04-types.ts';
import { typeName } from './05-types-extra.ts';
import { drawCyl } from './06-types-more.ts';
import { cutTrees, type Drawable } from './07-world.ts';
import { TER, claimDisc, fogVisible, sideAt } from './08-territory.ts';
import { FOOT, rebuildTown } from './10-town.ts';
import { $, toast } from './13-ui.ts';
import { ECO, RES, bdef, demolishBuilding, refreshAccess } from './15-economy.ts';
import { SEL, UNITS, UNIT_DEF, renderUnitPanel, sendUnit, unitById, unitName, type Unit, type UnitDef } from './26-unites.ts';
/* ================= etape 9 : l'armee ================= */
// Usine de chars, chantier naval, aerodrome ; jeeps, chars, navires de guerre, navires de transport, chasseurs, bombardiers.
// Combat : chaque unite a ses points de vie, sa portee, sa cadence ; une unite au repos tire sur l'ennemi qui passe.
// Les soldats prennent un batiment ennemi ; vehicules et bombardiers le detruisent. En territoire ennemi, on pille
// des ressources et on prend du terrain. Defenses : bunker, canon cotier, DCA, radar. Au bout de la branche de l'atome : la bombe.

/* ---- les unites de l'armee ---- */
Object.assign(UNIT_DEF, {
  jeep: { name: 'Jeep', nameCCP: 'Jeep du Peuple', desc: 'Rapide, voit loin, tire un peu. Pille vite en territoire ennemi.', speed: 30, sight: 95, hp: 50, atk: 4, range: 22, rate: 1, price: { l: 30, c: 20, r: 10 }, time: 10, from: ['usinechars'], domain: 'terre', upkeep: { c: .1, p: .3 }, look: 'jeep', tech: 'blindes' },
  char: { name: 'Char', nameCCP: 'Char du Peuple', desc: 'Lent, solide, frappe fort : détruit les bâtiments.', speed: 11, sight: 70, hp: 170, atk: 14, range: 30, rate: 2, price: { l: 80, c: 30, r: 30 }, time: 20, from: ['usinechars'], domain: 'terre', upkeep: { c: .2, p: .6 }, look: 'char', tech: 'blindes' },
  navire: { name: 'Destroyer', nameCCP: 'Croiseur du Peuple', desc: 'Navire de guerre : coule les bateaux, bombarde la côte.', speed: 16, sight: 110, hp: 150, atk: 12, range: 45, rate: 1.6, price: { l: 90, c: 30, r: 30 }, time: 22, from: ['chantier'], domain: 'mer', upkeep: { c: .2, p: .5 }, look: 'navire', tech: 'marine' },
  transport: { name: 'Navire de transport', nameCCP: 'Transport du Peuple', desc: 'Emmène six unités à terre par la mer ou une rivière. Clic droit d’unités sur lui pour les embarquer, puis clic droit sur une côte.', speed: 18, sight: 80, hp: 90, atk: 0, range: 0, rate: 1, price: { l: 60, c: 20, r: 15 }, time: 16, from: ['chantier', 'port'], domain: 'mer', upkeep: { c: .1, p: .3 }, look: 'barge', carry: 6, tech: 'marine' },
  chasseur: { name: 'Chasseur', nameCCP: 'Chasseur du Peuple', desc: 'Avion rapide : abat les avions, mitraille les unités.', speed: 55, sight: 120, hp: 60, atk: 8, range: 26, rate: .8, price: { l: 70, c: 20, r: 30 }, time: 18, from: ['aerodrome'], domain: 'air', upkeep: { c: .1, p: .8 }, look: 'avion', tech: 'aviation' },
  bombardier: { name: 'Bombardier', nameCCP: 'Bombardier du Peuple', desc: 'Détruit des bâtiments ; la DCA et les chasseurs le guettent.', speed: 34, sight: 90, hp: 100, atk: 45, range: 10, rate: 4, price: { l: 120, c: 30, r: 50 }, time: 26, from: ['aerodrome'], domain: 'air', upkeep: { c: .1, p: 1.2 }, look: 'bombardier', bomb: true, tech: 'bombardiers' },
} satisfies Record<string, UnitDef>);
UNIT_DEF.soldats.desc = 'Défendent, prennent les bâtiments ennemis (à zéro de solidité), pillent en territoire ennemi.';

/* ---- solidite des batiments ---- */
export const bhpMax = (l: Building): number => Math.round((60 + (ECO[l.type] ? ECO[l.type].cost : 20) * 1.6) * (l.lvl || 1) * (l.type === 'qg' || l.type === 'ville' ? 2.5 : l.type === 'bunker' ? 3 : 1));
const bhp = (l: Building): number => l.hp == null ? bhpMax(l) : l.hp;
SH.bhp = bhp; SH.bhpMax = bhpMax;

/* ---- tirs et explosions, pour les yeux ---- */
interface Shot { a0: number; b0: number; z0: number; a1: number; b1: number; z1: number; t: number; big: boolean }
const SHOTS: Shot[] = [];
interface Boom { a: number; b: number; t: number; r: number }
const BOOMS: Boom[] = [];
const zOf = (u: Unit): number => { const d = UNIT_DEF[u.kind]; return d && d.domain === 'air' ? 30 : 4; };
function shoot(a0: number, b0: number, z0: number, a1: number, b1: number, z1: number, big: boolean){ SHOTS.push({ a0, b0, z0, a1, b1, z1, t: GAME.t, big }); if (SHOTS.length > 200) SHOTS.shift(); }
function boom(a: number, b: number, r: number){ BOOMS.push({ a, b, t: GAME.t, r }); if (BOOMS.length > 80) BOOMS.shift(); }
HOOKS.top.push(() => {
  const now = GAME.t;
  for (let k = SHOTS.length - 1; k >= 0; k--){
    const s = SHOTS[k], age = now - s.t; if (age > .25){ SHOTS.splice(k, 1); continue; }
    const p = prj(s.a0, s.b0, s.z0), q = prj(s.a1, s.b1, s.z1), f = Math.min(1, age / .15);
    SH.CUR = s.big ? M.FLAG_RED : M.ICON_Y;
    const x0 = p[0] + (q[0] - p[0]) * Math.max(0, f - .4), y0 = p[1] + (q[1] - p[1]) * Math.max(0, f - .4), x1 = p[0] + (q[0] - p[0]) * f, y1 = p[1] + (q[1] - p[1]) * f, n = Math.ceil(Math.hypot(x1 - x0, y1 - y0));
    for (let i = 0; i <= n; i++) fput(Math.round(x0 + (x1 - x0) * i / Math.max(1, n)), Math.round(y0 + (y1 - y0) * i / Math.max(1, n)), 1);
  }
  for (let k = BOOMS.length - 1; k >= 0; k--){
    const e = BOOMS[k], age = now - e.t; if (age > 1.2){ BOOMS.splice(k, 1); continue; }
    const c = prj(e.a, e.b, 2), R = e.r * (.4 + age * 1.2);
    for (let i = 0; i < 18 + e.r * 2; i++){
      const an = i * 2.39, rr = R * ((i * 37 % 10) / 10), x = Math.round(c[0] + Math.cos(an) * rr * 1.4), y = Math.round(c[1] + Math.sin(an) * rr * .7 - age * 6);
      SH.CUR = age < .3 ? M.ICON_Y : age < .6 ? M.FLAG_RED : M.SMOKE; fput(x, y, 1); fput(x + 1, y, age < .6 ? 1 : 0);
    }
  }
});

/* ---- qui peut tirer sur qui ---- */
// rien ne touche un avion que la DCA, un chasseur ou un navire ; le bombardier ne vise que les batiments
function canHit(d: UnitDef, td: UnitDef | null): boolean {
  if (d.atk <= 0) return false;
  if (!td) return !!(d.bomb || d.domain !== 'air' || d.look === 'avion');
  if (d.bomb) return false;
  if (td.domain === 'air') return d.look === 'avion' || d.domain === 'mer';
  return true;
}
const sees = (side: Side, a: number, b: number): boolean => side !== GAME.side || !TER.fogOn || fogVisible(a, b);
const dist = (a0: number, b0: number, a1: number, b1: number) => Math.hypot(a1 - a0, b1 - b0);
function bldDist(l: Building, a: number, b: number){ return Math.hypot(Math.max(l.a0 - a, 0, a - l.a1), Math.max(l.b0 - b, 0, b - l.b1)); }

/* ---- suivre sa cible ---- */
const chaseT = new Map<number, number>();
SH.combatChase = (u: Unit, d: UnitDef) => {
  const o = u.order; if (!o || o.kind !== 'attack') return;
  const tu = o.uid ? unitById(o.uid) : undefined, tb = o.bid ? (SH.BLD as Building[]).find(l => l.id === o.bid) : undefined;
  if ((o.uid && (!tu || tu.dead || tu.aboard)) || (o.bid && !tb) || (!o.uid && !o.bid)){ u.order = null; if (d.bomb) goHome(u); return; }
  const ta = tu ? tu.a : (tb as Building).ca, tbb = tu ? tu.b : (tb as Building).cb;
  const dd = tb ? bldDist(tb, u.a, u.b) : dist(u.a, u.b, ta, tbb);
  if (dd <= Math.max(6, d.range * .9)){ u.path = []; u.pi = 0; return; }
  // on refait le chemin de temps en temps
  const last = chaseT.get(u.id) || -9;
  if (GAME.t - last > 1.2 || u.pi >= u.path.length){ chaseT.set(u.id, GAME.t); if (!sendUnit(u, ta, tbb) && o.auto) u.order = null; }
};
function goHome(u: Unit){
  const home = (SH.BLD as Building[]).filter(l => l.side === u.side && l.type === 'aerodrome' && l.done).sort((x, y) => dist(x.ca, x.cb, u.a, u.b) - dist(y.ca, y.cb, u.a, u.b))[0];
  if (home){ sendUnit(u, home.ca, home.cb); u.order = { kind: 'home' }; }
}

/* ---- le combat, a chaque pas ---- */
let acqAcc = 0, lootAcc = 0;
const HIT_T = new Map<number, number>();
SH.combatStep = (dt: number) => {
  acqAcc += dt; const acq = acqAcc > .5; if (acq) acqAcc = 0;
  for (const u of UNITS){
    if (u.dead || u.aboard) continue;
    const d = UNIT_DEF[u.kind]; if (!d || d.atk <= 0) continue;
    // au repos : on vise l'ennemi qui passe a portee de vue
    if (acq && !u.order && u.pi >= u.path.length){
      let best: Unit | null = null, bd = d.sight * .8;
      for (const e of UNITS){ if (e.side === u.side || e.dead || e.aboard) continue; const ed = UNIT_DEF[e.kind]; if (!canHit(d, ed || null)) continue; const dd = dist(u.a, u.b, e.a, e.b); if (dd < bd && sees(u.side, e.a, e.b)){ bd = dd; best = e; } }
      if (best) u.order = { kind: 'attack', uid: best.id, auto: true };
    }
    const o = u.order; if (!o || o.kind !== 'attack' || u.cool > 0) continue;
    if (o.uid){
      const t = unitById(o.uid); if (!t || t.dead) continue; const td = UNIT_DEF[t.kind];
      if (!canHit(d, td || null) || dist(u.a, u.b, t.a, t.b) > d.range) continue;
      hitUnit(t, d.atk, u.side); u.cool = d.rate; shoot(u.a, u.b, zOf(u), t.a, t.b, zOf(t), u.kind === 'char' || u.kind === 'navire');
      if (t.dead && o.auto) u.order = null;
    } else if (o.bid){
      const l = (SH.BLD as Building[]).find(x => x.id === o.bid); if (!l || bldDist(l, u.a, u.b) > d.range) continue;
      if (!canHit(d, null)) continue;
      u.cool = d.rate;
      if (d.bomb){ boom(l.ca, l.cb, 10); shoot(u.a, u.b, 30, l.ca, l.cb, 0, true); } else shoot(u.a, u.b, zOf(u), l.ca, l.cb, 4, u.kind === 'char' || u.kind === 'navire');
      hitBuilding(l, d.atk, u);
    }
  }
  // les defenses tirent sur ce qui passe
  for (const l of SH.BLD as Building[]){
    const df = DEF[l.type]; if (!df || !l.done) continue;
    const k = 'def' + l.id, cd = (DEFCOOL.get(k) || 0) - dt; DEFCOOL.set(k, cd); if (cd > 0) continue;
    let best: Unit | null = null, bd = df.range;
    for (const e of UNITS){ if (e.side === l.side || e.dead || e.aboard) continue; const ed = UNIT_DEF[e.kind]; if (!ed || !df.vs.includes(ed.domain)) continue; const dd = dist(l.ca, l.cb, e.a, e.b); if (dd < bd){ bd = dd; best = e; } }
    if (!best) continue;
    DEFCOOL.set(k, df.rate); hitUnit(best, df.atk, l.side); shoot(l.ca, l.cb, df.z, best.a, best.b, zOf(best), df.atk > 12);
  }
  // en territoire ennemi : piller et prendre du terrain
  lootAcc += dt; if (lootAcc < 3) return; lootAcc = 0;
  for (const u of UNITS){
    if (u.dead || u.aboard) continue;
    const d = UNIT_DEF[u.kind]; if (!d || d.domain !== 'terre' || d.atk <= 0) continue;
    const owner = sideAt(u.a, u.b); if (!owner || owner === u.side) continue;
    const near = (SH.BLD as Building[]).find(l => l.side === owner && l.done && bldDist(l, u.a, u.b) < 22);
    if (near){ const R0 = RES[owner], R1 = RES[u.side], take = u.kind === 'jeep' ? 6 : 3, c = Math.min(take, R0.croq), w = Math.min(take, R0.laine); R0.croq -= c; R0.laine -= w; R1.croq += c; R1.laine += w; if (u.side === GAME.side && (c + w) > 0 && SH.floatText) SH.floatText(u.a, u.b, '+' + Math.round(c + w) + ' pillé'); if (owner === GAME.side) warn('On pille ' + typeName(near.type, owner).toLowerCase() + ' !', near.ca, near.cb); }
    // personne pour defendre a la ronde : la case passe a l'envahisseur
    else if (!UNITS.some(e => e.side === owner && !e.dead && dist(e.a, e.b, u.a, u.b) < 50)) claimDisc(u.a, u.b, 10, u.side);
  }
};
function hitUnit(t: Unit, atk: number, by: Side){
  const td = UNIT_DEF[t.kind]; if (!td) return;
  t.hp -= atk; t.flash = .2;
  if (t.hp <= 0){ t.dead = true; boom(t.a, t.b, td.domain === 'mer' ? 10 : 6); if (t.cargo) for (const id of t.cargo){ const c = unitById(id); if (c) c.dead = true; } if (t.side === GAME.side) warn(unitName(t.kind, t.side) + ' perdu' + (td.n && td.n > 1 ? 's' : '') + '.', t.a, t.b); else if (by === GAME.side) SH.sfx('demolish', t.a, t.b); }
  else if (t.side === GAME.side) warn('Nos unités sont attaquées.', t.a, t.b);
}
// a zero : les soldats prennent le batiment, le reste le detruit ; un hotel de ville tombe, pas plus
function hitBuilding(l: Building, atk: number, by: Unit){
  const mx = bhpMax(l); l.hp = bhp(l) - atk; HIT_T.set(l.id, GAME.t);
  if (l.side === GAME.side) warn(typeName(l.type, l.side) + ' attaqué' + (TYPES[l.type] && TYPES[l.type].fem ? 'e' : '') + ' !', l.ca, l.cb);
  if (l.hp > 0) return;
  const side = by.side, old = l.side;
  if (by.kind === 'soldats' && l.type !== 'qg'){
    l.side = side; l.hp = Math.round(mx * .4); claimDisc(l.ca, l.cb, 24, side);
    SH.rebuildTownAll(); toast((side === GAME.side ? 'Nos soldats prennent ' : 'L’ennemi prend ') + typeName(l.type, old).toLowerCase() + '.');
    if (SH.logDay) SH.logDay(side, 'capture', typeName(l.type, old), { id: l.id });
  } else {
    boom(l.ca, l.cb, 16); destroyBuilding(l);
    toast((old === GAME.side ? 'Nous perdons ' : 'Détruit : ') + typeName(l.type, old).toLowerCase() + '.');
  }
  for (const u of UNITS) if (u.order && u.order.kind === 'attack' && u.order.bid === l.id){ u.order = null; const d = UNIT_DEF[u.kind]; if (d && d.bomb) goHome(u); }
  if ((l.type === 'qg' || l.type === 'ville') && SH.onCityLost) SH.onCityLost(old, l);
}
export function destroyBuilding(l: Building){
  const refund = demolishBuilding(l); RES[l.side].laine -= refund;
  cutTrees(l.a0 - 4, l.a1 + 4, l.b0 - 4, l.b1 + 4);
}
SH.destroyBuilding = destroyBuilding;
SH.rebuildTownAll = () => { rebuildTown(); refreshAccess(); };
let warnT = -99;
function warn(msg: string, a: number, b: number){ if (GAME.t - warnT < 8) return; warnT = GAME.t; toast(msg); SH.sfx('click', a, b); SH.lastAlert = [a, b]; }

/* ---- les ordres : clic droit sur un batiment ennemi, embarquer, debarquer ---- */
SH.boardOrder = (u: Unit, a: number, b: number, sel: Unit[]): boolean => {
  const d = UNIT_DEF[u.kind]; if (!d) return false;
  // un navire de transport choisi, clic sur la terre : il y va et debarque
  if (u.kind === 'transport'){
    if (!u.cargo || !u.cargo.length) return false;
    const s = nearestShore(a, b, 160); if (!s){ if (u.side === GAME.side) toast('Vise une côte pour débarquer.'); return true; }
    if (!sendUnit(u, s[0], s[1])){ if (u.side === GAME.side) toast('Le navire ne trouve pas de route jusqu’à cette côte.'); return true; }
    u.order = { kind: 'unload' }; return true;
  }
  // des unites a terre, clic sur un de ses navires de transport : elles montent a bord
  if (d.domain !== 'terre') return false;
  const ship = UNITS.find(o => o.side === u.side && o.kind === 'transport' && !o.dead && dist(o.a, o.b, a, b) < 16);
  if (!ship) return false;
  const s = nearestShore(ship.a, ship.b, 50); if (!s || !sendUnit(u, s[0], s[1])) return false;
  u.order = { kind: 'board', ship: ship.id }; void sel; return true;
};
SH.unitArrived = (u: Unit) => {
  const o = u.order; if (!o) return;
  if (o.kind === 'board'){
    u.order = null;
    const ship = unitById(o.ship), cap = ship ? (UNIT_DEF[ship.kind].carry || 0) : 0;
    if (!ship || ship.dead || dist(ship.a, ship.b, u.a, u.b) > 40){ if (u.side === GAME.side) toast('Le navire est trop loin du rivage.'); return; }
    ship.cargo = ship.cargo || []; if (ship.cargo.length >= cap){ if (u.side === GAME.side) toast('Le navire est plein.'); return; }
    ship.cargo.push(u.id); u.aboard = ship.id; SEL.delete(u.id); renderUnitPanel();
    if (u.side === GAME.side) toast(unitName(u.kind, u.side) + ' à bord (' + ship.cargo.length + ' sur ' + cap + ').');
  } else if (o.kind === 'unload'){
    u.order = null;
    const s = nearestShore(u.a, u.b, 60); if (!s || !u.cargo){ return; }
    u.cargo.forEach((id, k) => { const c = unitById(id); if (c){ c.aboard = undefined; c.a = s[0] + (k % 3 - 1) * 6; c.b = s[1] + (Math.floor(k / 3) - .5) * 6; c.path = []; c.pi = 0; c.order = null; } });
    if (u.side === GAME.side) toast(u.cargo.length + ' unité' + (u.cargo.length > 1 ? 's débarquent.' : ' débarque.'));
    u.cargo = [];
  } else if (o.kind === 'home') u.order = null;
};
// clic droit sur un batiment ennemi decouvert : 26-unites en fait deja un ordre d'attaque (bid)

/* ---- le dessin des vehicules, navires et avions ---- */
SH.drawVehicle = (u: Unit, d: UnitDef, t: number): boolean => {
  const ccp = u.side === 'ccp', a = u.a, b = u.b, ang = u.ang, moving = u.pi < u.path.length;
  if (d.look === 'jeep'){
    SH.CUR = ccp ? M.MILITARY : M.MILITARY; rbox(a, b, ang, -4.5, 4.5, -2.6, 2.6, .8, 2.8, (_u: number, h: number) => h > 1.6 ? 1 : 0, 1, 1);
    SH.CUR = M.METAL; const g = rot2(a, b, ang, -1, 0); line3(g[0], g[1], 2.8, g[0], g[1], 4.6, 1); const e = rot2(a, b, ang, 2.5, 0); line3(g[0], g[1], 4.6, e[0], e[1], 4.6, 1);
    SH.CUR = ccp ? M.FLAG_RED : M.FLAG_BLUE; const s = prj(a, b, 2.9); fput(Math.round(s[0]), Math.round(s[1]), 1);
    return true;
  }
  if (d.look === 'char'){
    SH.CUR = M.CAT_BLACK; for (const s of [-1, 1]) rbox(a, b, ang, -6.5, 6.5, s * 3.6 - 1, s * 3.6 + 1, .2, 2.2, (u2: number) => ((u2 * 2 + (moving ? t * 12 : 0)) | 0) & 1 ? 1 : 0, 0, 1);
    SH.CUR = M.MILITARY; rbox(a, b, ang, -6, 6, -3, 3, 1.6, 3.8, (_u: number, h: number) => h > 1.6 ? 1 : 0, 1, 1);
    // la tourelle regarde sa cible
    const o = u.order, tgt = o && o.kind === 'attack' ? (o.uid ? unitById(o.uid) : null) : null, ta = tgt ? Math.atan2(tgt.b - b, tgt.a - a) : ang;
    rbox(a, b, ta, -2.6, 2.6, -2.2, 2.2, 3.8, 6, 0, 1, 1);
    SH.CUR = M.METAL; const m0 = rot2(a, b, ta, 2.4, 0), m1 = rot2(a, b, ta, 9, 0); line3(m0[0], m0[1], 5, m1[0], m1[1], 5, 1);
    SH.CUR = ccp ? M.FLAG_RED : M.FLAG_BLUE; const s = prj(a, b, 6.1); if (ccp) drawStar(fput, Math.round(s[0]) - 3, Math.round(s[1]) - 3, 0, true); else fput(Math.round(s[0]), Math.round(s[1]), 1);
    return true;
  }
  if (d.look === 'navire' || (d.look === 'barge' && u.kind === 'transport')){
    const war = d.look === 'navire', z = Math.sin(t * 1.3 + u.id) > .55 ? .6 : 0, L = war ? 30 : 24, Wd = war ? 7 : 8;
    drawHull(a, b, ang, L, Wd, z, 2.6 + z, M.METAL, war ? M.CONCRETE : M.PIER, ccp ? M.FLAG_RED : M.FLAG_BLUE);
    SH.CUR = M.METAL;
    if (war){
      rbox(a, b, ang, -4, 4, -2.4, 2.4, 2.6 + z, 7 + z, (_u: number, h: number) => (h > 2.4 && h < 3.2) ? 3 : 0, 1, 1);
      for (const off of [8, -10]){ const c = rot2(a, b, ang, off, 0); drawCyl(c[0], c[1], 2.6 + z, 1.6, 1.4, true); const m = rot2(a, b, ang, off + (off > 0 ? 4 : -4), 0); line3(c[0], c[1], 3.4 + z, m[0], m[1], 3.4 + z, 1); }
      const mm = rot2(a, b, ang, -1, 0); line3(mm[0], mm[1], 7 + z, mm[0], mm[1], 13 + z, 1);
    } else {
      rbox(a, b, ang, -11, -6, -3, 3, 2.6 + z, 6.5 + z, (_u: number, h: number) => (h > 1.5 && h < 2.4) ? 3 : 0, 1, 1);
      // les unites a bord : des caisses kaki sur le pont
      const n = u.cargo ? u.cargo.length : 0; SH.CUR = M.MILITARY;
      for (let k = 0; k < n; k++){ const c = rot2(a, b, ang, -3 + (k % 3) * 4, (Math.floor(k / 3) - .5) * 3.4); boxS(c[0] - 1.3, c[0] + 1.3, c[1] - 1.3, c[1] + 1.3, 2.6 + z, 4.6 + z, 0, 1); }
    }
    if (moving){ SH.CUR = M.FOAM; for (let k = 0; k < 12; k++){ const p = rot2(a, b, ang, -L / 2 - k * 1.3, ((k * 7) % 5 - 2) * (1 + k * .25)), r = prj(p[0], p[1], 0); fput(Math.round(r[0]), Math.round(r[1]), 1); } }
    return true;
  }
  if (d.domain === 'air'){
    const big = d.look === 'bombardier', z = 30 + Math.sin(t * 2 + u.id) * 1.2, span = big ? 9 : 6, len = big ? 8 : 6;
    // l'ombre au sol
    SH.CUR = M.CAT_BLACK; { const s = prj(a + 6, b + 6, 0); for (let k = -span; k <= span; k += 2) fput(Math.round(s[0]) + k, Math.round(s[1]), 0); }
    SH.CUR = big ? M.METAL : (ccp ? M.CCP2 : M.CHROME);
    const n0 = rot2(a, b, ang, len, 0), t0 = rot2(a, b, ang, -len, 0); line3(n0[0], n0[1], z, t0[0], t0[1], z, 1);
    const w0 = rot2(a, b, ang, 1, -span), w1 = rot2(a, b, ang, 1, span); line3(w0[0], w0[1], z, w1[0], w1[1], z, 1);
    const s0 = rot2(a, b, ang, -len + 1, -span * .4), s1 = rot2(a, b, ang, -len + 1, span * .4); line3(s0[0], s0[1], z, s1[0], s1[1], z, 1);
    if (big){ const e0 = rot2(a, b, ang, 2, -span * .5), e1 = rot2(a, b, ang, 2, span * .5); SH.CUR = M.CAT_BLACK; line3(e0[0], e0[1], z - .5, e0[0], e0[1], z, 1); line3(e1[0], e1[1], z - .5, e1[0], e1[1], z, 1); }
    SH.CUR = ccp ? M.FLAG_RED : M.FLAG_BLUE; const c = prj(a, b, z + .3); fput(Math.round(c[0]), Math.round(c[1]), 1);
    return true;
  }
  return false;
};

/* ---- les batiments de l'armee ---- */
interface DefDef { range: number; atk: number; rate: number; vs: string[]; z: number }
const DEF: Record<string, DefDef> = {
  bunker: { range: 50, atk: 8, rate: 1.4, vs: ['terre'], z: 3 },
  canoncotier: { range: 95, atk: 22, rate: 3, vs: ['mer'], z: 5 },
  dca: { range: 85, atk: 10, rate: 1, vs: ['air'], z: 6 },
};
const DEFCOOL = new Map<string, number>();
SH.DEF = DEF;
const flagOf = (side: Side) => side === 'ccp' ? M.FLAG_RED : M.FLAG_BLUE;
Object.assign(TYPES, {
  usinechars: { name: 'Usine de chars', nameCCP: 'Usine de chars du Peuple', fem: true, build(lot: Building, seed: number){
    const ccp = lot.side === 'ccp', a0 = lot.ca - 15, a1 = lot.ca + 15, b0 = lot.cb - 9, b1 = lot.cb + 6, hh = 10;
    const body = () => {
      SH.CUR = ccp ? M.CONCRETE : M.MILITARY;
      gableWalls(a0, a1, b0, b1, hh, 4, 'a', (u: number, h: number, x: number, y: number, k: number) => { if (k === 0 && h < 7 && (u % 10) > 2 && (u % 10) < 8) return (Math.floor(h * 1.4) & 1) ? 1 : 0; return (h > 7.5 && h < 9 && (u % 3) > 1) ? winColor('in', true, x, y) : wallBase(k, x, y); });
      SH.CUR = M.ROOF_USC; gableRoof2(a0, a1, b0, b1, hh, 4, 'a', 1, 5, 1);
    };
    const stack = () => { SH.CUR = M.BRICK; drawCyl(a1 - 3, b0 + 3, hh, 1.6, 10, true); SH.CUR = flagOf(lot.side); drawCyl(a1 - 3, b0 + 3, hh + 7, 1.65, 1.2, false); };
    void seed;
    return { parts: [part(lot.ca, lot.cb, 0, body), part(a1 - 3, b0 + 3, .4, stack)], lights: [sideLight(a0, a1, b0, b1, 0, 8, 1)] };
  } },
  chantier: { name: 'Chantier naval', nameCCP: 'Chantier naval du Peuple', fem: false, build(lot: Building, seed: number){
    const ccp = lot.side === 'ccp', a0 = lot.ca - 14, a1 = lot.ca + 14, b0 = lot.cb - 8, b1 = lot.cb + 4;
    const body = () => { SH.CUR = ccp ? M.CONCRETE : M.USC5; boxS(a0, a1, b0, b1 - 4, 0, 9, (u: number, h: number, x: number, y: number, k: number) => (h > 6 && h < 8 && (u % 3) > 1.4) ? winColor('in', true, x, y) : wallBase(k, x, y), 1); };
    // la cale et la grue portique
    const crane = () => {
      SH.CUR = M.CONCRETE; drawFace([a0 + 2, b1 - 4, .2, a1 - 2, b1 - 4, .2, a1 - 2, b1 + 10, .2, a0 + 2, b1 + 10, .2], UP, (x: number, y: number) => bz(x, y) < 3 ? 1 : 0, 1);
      SH.CUR = ccp ? M.FLAG_RED : M.ICON_Y; for (const pa of [a0 + 3, a1 - 3]) line3(pa, b1 + 8, 0, pa, b1 + 8, 16, 1);
      line3(a0 + 3, b1 + 8, 16, a1 - 3, b1 + 8, 16, 1); line3(lot.ca + 4, b1 + 8, 16, lot.ca + 4, b1 + 8, 9, 0);
    };
    void seed;
    return { parts: [part(lot.ca, lot.cb, 0, body), part(lot.ca, b1 + 8, .3, crane)], lights: [sideLight(a0, a1, b0, b1, 0, 8, 1)] };
  } },
  aerodrome: { name: 'Aérodrome', nameCCP: 'Aérodrome du Peuple', fem: false, build(lot: Building, seed: number){
    const ccp = lot.side === 'ccp', a0 = lot.ca - 24, a1 = lot.ca + 24, b0 = lot.cb - 12, b1 = lot.cb + 12;
    const strip = () => { SH.CUR = M.ROAD; drawFace([a0, b0 + 4, .1, a1, b0 + 4, .1, a1, b0 + 11, .1, a0, b0 + 11, .1], UP, (x: number, y: number) => ((x >> 2) & 1) && y % 7 === 3 ? 1 : 0, 1); };
    const hangar = () => {
      SH.CUR = ccp ? M.CONCRETE : M.METAL;
      for (let k = 0; k < 6; k++){ const z = Math.sin(k / 5 * Math.PI) * 7; wallFace(a0 + 4, b1 - 2 - k * 1.4, a0 + 20, b1 - 2 - k * 1.4, 0, z, 1, 1); }
      boxS(a1 - 8, a1 - 2, b1 - 8, b1 - 2, 0, 14, (u: number, h: number) => h > 11 ? 3 : 0, 1);
      SH.CUR = flagOf(lot.side); const p = prj(a1 - 5, b1 - 5, 15); fput(Math.round(p[0]), Math.round(p[1]), 1); fput(Math.round(p[0]) + 1, Math.round(p[1]), 1);
    };
    void seed;
    return { decals: [strip], parts: [part(lot.ca, lot.cb + 6, 0, hangar)], lights: [Lc(a1 - 5, b1 - 5, 10, 1.2)] };
  } },
  bunker: { name: 'Bunker', nameCCP: 'Casemate du Peuple', fem: false, build(lot: Building, seed: number){
    const body = () => { SH.CUR = M.CONCRETE; boxS(lot.ca - 6, lot.ca + 6, lot.cb - 5, lot.cb + 5, 0, 4.5, (u: number, h: number) => (h > 2.4 && h < 3.2 && (u % 6) > 2 && (u % 6) < 4) ? 3 : 0, (x: number, y: number) => bz(x, y) < 3 ? 1 : 0); SH.CUR = flagOf(lot.side); const p = prj(lot.ca, lot.cb, 5); fput(Math.round(p[0]), Math.round(p[1]), 1); };
    void seed; return { parts: [part(lot.ca, lot.cb, 0, body)], lights: [] };
  } },
  canoncotier: { name: 'Canon côtier', nameCCP: 'Batterie côtière du Peuple', fem: false, build(lot: Building, seed: number){
    const body = () => { SH.CUR = M.CONCRETE; drawCyl(lot.ca, lot.cb, 0, 6, 2.5, true); SH.CUR = M.MILITARY; boxS(lot.ca - 3, lot.ca + 3, lot.cb - 3, lot.cb + 3, 2.5, 5, 0, 1); SH.CUR = M.METAL; line3(lot.ca, lot.cb + 3, 4, lot.ca, lot.cb + 14, 5, 1); };
    void seed; return { parts: [part(lot.ca, lot.cb, 0, body)], lights: [] };
  } },
  dca: { name: 'DCA', nameCCP: 'DCA du Peuple', fem: true, build(lot: Building, seed: number){
    const body = (t: number) => { SH.CUR = M.CONCRETE; boxS(lot.ca - 5, lot.ca + 5, lot.cb - 5, lot.cb + 5, 0, 2, 0, 1); SH.CUR = M.MILITARY; drawCyl(lot.ca, lot.cb, 2, 2.5, 2, true); const an = t * .6 + lot.id; SH.CUR = M.METAL; for (const s of [-1, 1]){ const o = rot2(lot.ca, lot.cb, an, 0, s * .9), e = rot2(lot.ca, lot.cb, an, 6, s * .9); line3(o[0], o[1], 4, e[0], e[1], 10, 1); } };
    void seed; return { parts: [part(lot.ca, lot.cb, 0, body)], lights: [] };
  } },
  radar: { name: 'Radar', nameCCP: 'Radar du Peuple', fem: false, build(lot: Building, seed: number){
    const body = (t: number) => { SH.CUR = M.CONCRETE; boxS(lot.ca - 5, lot.ca + 5, lot.cb - 4, lot.cb + 4, 0, 5, (u: number, h: number) => h > 2 && h < 3.4 && (u % 3) > 1.5 ? 3 : 0, 1); SH.CUR = M.METAL; line3(lot.ca, lot.cb, 5, lot.ca, lot.cb, 12, 1); const an = t * 1.5; const p = rot2(lot.ca, lot.cb, an, 0, -5), q = rot2(lot.ca, lot.cb, an, 0, 5); SH.CUR = M.CHROME; line3(p[0], p[1], 13, q[0], q[1], 13, 1); line3(p[0], p[1], 14.5, q[0], q[1], 14.5, 1); };
    void seed; return { parts: [part(lot.ca, lot.cb, 0, body)], lights: [Lc(lot.ca, lot.cb, 8, 1)] };
  } },
  centreatome: { name: 'Centre atomique', nameCCP: 'Combinat atomique secret', fem: false, build(lot: Building, seed: number){
    const body = () => { SH.CUR = M.CONCRETE; boxS(lot.ca - 12, lot.ca + 12, lot.cb - 8, lot.cb + 8, 0, 6, (u: number, h: number) => h > 3 && h < 4.4 && (u % 5) > 3 ? 3 : 0, 1); SH.CUR = M.ICON_Y; const p = prj(lot.ca, lot.cb + 8, 4); for (let k = 0; k < 3; k++){ const an = k * 2.09 - 1.57; for (let r = 1; r < 4; r++) fput(Math.round(p[0] + Math.cos(an) * r * 1.3), Math.round(p[1] + Math.sin(an) * r), 1); } };
    void seed; return { parts: [part(lot.ca, lot.cb, 0, body)], lights: [sideLight(lot.ca - 12, lot.ca + 12, lot.cb - 8, lot.cb + 8, 0, 6, 1)] };
  } },
  silo: { name: 'Silo', nameCCP: 'Silo du Peuple', fem: false, build(lot: Building, seed: number){
    const body = () => { SH.CUR = M.CONCRETE; drawCyl(lot.ca, lot.cb, 0, 7, 1.2, true); SH.CUR = M.CAT_BLACK; drawCyl(lot.ca, lot.cb, 1.2, 4, .2, true); if ((SH.NUKES ? SH.NUKES[lot.side] : 0) > 0){ SH.CUR = M.ROCKET; line3(lot.ca, lot.cb, 1.2, lot.ca, lot.cb, 14, 1); SH.CUR = flagOf(lot.side); const p = prj(lot.ca, lot.cb, 14.5); fput(Math.round(p[0]), Math.round(p[1]), 1); } };
    void seed; return { parts: [part(lot.ca, lot.cb, 0, body)], lights: [] };
  } },
});
Object.assign(ECO, {
  usinechars: bdef('armee', 90, { costR: 30, l: -1, jobs: 8, rad: 40, elec: -4, tech: 'blindes', desc: 'Fabrique jeeps et chars (pétrole pour les faire rouler).' }),
  chantier: bdef('armee', 90, { costR: 30, l: -1, jobs: 8, rad: 40, coast: true, noRoad: true, tech: 'marine', desc: 'Sur la côte : destroyers et navires de transport. Le port militaire.' }),
  aerodrome: bdef('armee', 120, { costR: 40, l: -1, jobs: 8, rad: 50, elec: -4, tech: 'aviation', desc: 'Chasseurs, puis bombardiers.' }),
  bunker: bdef('armee', 40, { costR: 10, rad: 30, noRoad: true, desc: 'Tire sur les unités ennemies à terre (portée 50).' }),
  canoncotier: bdef('armee', 60, { costR: 15, rad: 30, noRoad: true, tech: 'radar', desc: 'Tire sur les navires ennemis (portée 95).' }),
  dca: bdef('armee', 50, { costR: 15, rad: 30, noRoad: true, tech: 'radar', desc: 'Tire sur les avions ennemis (portée 85).' }),
  radar: bdef('armee', 60, { costR: 20, rad: 40, elec: -3, tech: 'radar', desc: 'Voit loin autour de lui, même à travers le brouillard.' }),
  centreatome: bdef('armee', 200, { costR: 80, jobs: 10, elec: -10, tech: 'bombe', desc: 'Fabrique une bombe atomique avec 20 d’uranium (une minute).' }),
  silo: bdef('armee', 120, { costR: 40, noRoad: true, tech: 'bombe', desc: 'Lance la bombe atomique. Elle rase tout dans un grand rayon, des deux côtés.' }),
});
Object.assign(FOOT, { usinechars: [34, 22], chantier: [32, 18], aerodrome: [52, 30], bunker: [14, 12], canoncotier: [14, 14], dca: [12, 12], radar: [12, 12], centreatome: [28, 20], silo: [16, 16] });
ECO.canoncotier.nearWater = true;
UNIT_DEF.soldats.from = ['caserne'];
UNIT_DEF.explorateur.from = ['qg', 'ville', 'caserne', 'usinechars'];

/* ---- la bombe atomique ---- */
export const NUKES: Record<Side, number> = { usc: 0, ccp: 0 };
SH.NUKES = NUKES;
const BOMB_T = new Map<number, number>();
let aimNuke: Building | null = null;
HOOKS.step.push((dt: number) => {
  if (GAME.mode !== 'play' || dt <= 0) return;
  for (const l of SH.BLD as Building[]){
    if (l.type !== 'centreatome' || !l.done || !l.active) continue;
    const R = RES[l.side];
    if (!BOMB_T.has(l.id)){ if (R.x.uranium >= 20 && NUKES[l.side] < 3){ R.x.uranium -= 20; BOMB_T.set(l.id, GAME.t + 60); if (l.side === GAME.side) toast('Le centre atomique commence une bombe (une minute).'); } continue; }
    if (GAME.t >= (BOMB_T.get(l.id) || 0)){ BOMB_T.delete(l.id); NUKES[l.side]++; if (l.side === GAME.side) toast('Une bombe atomique est prête. Elle se lance depuis un silo.'); SH.rebuildTownAll(); }
  }
});
export function nuke(side: Side, a: number, b: number){
  const R = 70;
  boom(a, b, 40); boom(a + 20, b, 30); boom(a - 20, b + 10, 30);
  for (const l of [...SH.BLD as Building[]]) if (Math.hypot(l.ca - a, l.cb - b) < R && l.type !== 'qg') destroyBuilding(l); else if (Math.hypot(l.ca - a, l.cb - b) < R) l.hp = 1;
  for (const u of UNITS) if (Math.hypot(u.a - a, u.b - b) < R) u.dead = true;
  cutTrees(a - R, a + R, b - R, b + R);
  SH.radioQueue.unshift(['neutre', 'Radio du port', (side === 'ccp' ? 'La CCR' : 'L’USC') + ' a lancé la bombe atomique. Le monde entier retient son souffle.']);
  if (SH.logDay) SH.logDay(side, 'nuke', 'la bombe atomique');
  if (SH.onNuke) SH.onNuke(side, a, b);
  SH.sfx('launch');
}
SH.nuke = nuke;
const prevSel = SH.selExtra;
SH.selExtra = (l: Building, btn: (label: string, sub: string, fn: () => void, why?: string) => HTMLButtonElement, act: HTMLElement) => {
  if (typeof prevSel === 'function') prevSel(l, btn, act);
  const note = (txt: string) => { const n = document.createElement('p'); n.className = 'sel-note'; n.textContent = txt; act.append(n); };
  if (l.hp != null && l.hp < bhpMax(l)) note('Solidité : ' + Math.max(0, Math.round(l.hp)) + ' sur ' + bhpMax(l) + '. Elle se répare doucement hors des combats.');
  if (DEF[l.type]) note('Portée ' + DEF[l.type].range + ', ' + DEF[l.type].atk + ' de dégâts par tir.');
  if (l.type === 'centreatome' && l.done) note(BOMB_T.has(l.id) ? 'Une bombe est en fabrication.' : 'Il faut 20 uranium pour une bombe (' + Math.floor(RES[l.side].x.uranium) + ' en stock).');
  if (l.type === 'silo' && l.done){
    btn('Lancer la bombe', NUKES[l.side] + ' prête' + (NUKES[l.side] > 1 ? 's' : ''), () => { aimNuke = l; document.body.classList.add('aiming'); $('modeHint').textContent = 'Clique la cible de la bombe atomique (Échap pour renoncer).'; SH.selectBuilding(null); }, NUKES[l.side] ? '' : 'Aucune bombe prête : il faut un centre atomique et de l’uranium.');
  }
};
// la cible de la bombe : avant les unites (26) et les bateaux (28)
const prevClick = SH.unitClick;
SH.unitClick = (a: number, b: number, lx: number, ly: number, shift: boolean): boolean => {
  if (aimNuke){
    const s = aimNuke; aimNuke = null; document.body.classList.remove('aiming'); $('modeHint').textContent = '';
    if (NUKES[s.side] <= 0) return true;
    NUKES[s.side]--; SH.rebuildTownAll();
    toast('Bombe lancée. Impact dans dix secondes.');
    const side = s.side; setTimeout(() => { if (GAME.mode === 'play') nuke(side, a, b); }, 10000 / Math.max(1, GAME.speed || 1));
    return true;
  }
  return typeof prevClick === 'function' ? prevClick(a, b, lx, ly, shift) : false;
};
const prevEsc = SH.unitEscape;
SH.unitEscape = (): boolean => { if (aimNuke){ aimNuke = null; document.body.classList.remove('aiming'); $('modeHint').textContent = ''; return true; } return typeof prevEsc === 'function' ? prevEsc() : false; };

/* ---- les batiments abimes fument et se reparent hors des combats ---- */
let repAcc = 0;
HOOKS.step.push((dt: number) => {
  if (GAME.mode !== 'play') return;
  repAcc += dt; if (repAcc < 2) return;
  for (const l of SH.BLD as Building[]) if (l.hp != null){ if (GAME.t - (HIT_T.get(l.id) || -99) > 20) l.hp = Math.min(bhpMax(l), l.hp + bhpMax(l) * .02 * repAcc); if (l.hp >= bhpMax(l)) l.hp = undefined; }
  repAcc = 0;
});
HOOKS.dyn.push((_t: number, out: Drawable[]) => {
  if (GAME.mode !== 'play') return;
  for (const l of SH.BLD as Building[]){
    if (l.hp == null || l.hp > bhpMax(l) * .6) continue;
    const q = prj(l.ca, l.cb, 0); if (q[0] < -30 || q[0] > W + 30 || q[1] < -30 || q[1] > H + 30) continue;
    out.push({ d: 1e6, a: l.ca, b: l.cb, side: l.side, f: (tt: number) => { SH.CUR = M.SMOKE; for (let k = 0; k < 8; k++){ const z = 8 + ((tt * 6 + k * 3) % 18), p = prj(l.ca + Math.sin(tt + k) * 3, l.cb, z); fput(Math.round(p[0]) + (k % 3) - 1, Math.round(p[1]), 1); } } });
  }
});

/* ---- sauvegarde : solidite des batiments, bombes ---- */
HOOKS.save.push((ext) => {
  ext.bhp = (SH.BLD as Building[]).map((l, i) => l.hp != null ? [i, Math.round(l.hp)] : null).filter(Boolean);
  ext.nukes = [NUKES.usc, NUKES.ccp];
});
HOOKS.load.push((ext) => {
  if (Array.isArray(ext.bhp)) for (const r of ext.bhp) if (Array.isArray(r)){ const l = (SH.BLD as Building[])[+r[0]]; if (l) l.hp = +r[1]; }
  NUKES.usc = 0; NUKES.ccp = 0;
  if (Array.isArray(ext.nukes)){ NUKES.usc = +ext.nukes[0] || 0; NUKES.ccp = +ext.nukes[1] || 0; }
});
HOOKS.reset.push(() => { NUKES.usc = 0; NUKES.ccp = 0; BOMB_T.clear(); SHOTS.length = 0; BOOMS.length = 0; aimNuke = null; DEFCOOL.clear(); });
