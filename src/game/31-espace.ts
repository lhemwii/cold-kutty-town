import { SH, type Building, type Side } from './00-shared.ts';
import { GAME, HOOKS, M, SIDES, boxS, drawStar, fput, line3, prj, winColor } from './01-core.ts';
import { IS } from './02-ground.ts';
import { Lc, facadePlate, part, sideLight, wallBase } from './03-buildings-base.ts';
import { TYPES } from './04-types.ts';
import { typeName } from './05-types-extra.ts';
import { drawCyl } from './06-types-more.ts';
import { FOOT } from './10-town.ts';
import { achieve, costHTML, toast } from './13-ui.ts';
import { lackText, refreshPalette } from './14-hud.ts';
import { ECO, RES, SPACE, SPACE_STEPS, bdef, canAfford, payPrice, type Price } from './15-economy.ts';
import { UNITS, UNIT_DEF, type Unit, type UnitDef } from './26-unites.ts';
import { SCI, TECH, hasTech } from './29-recherche.ts';
import { isCity } from './25-villes.ts';
/* ================= etape 10 : l'espace et le renseignement ================= */
// La base spatiale lance les cinq jalons de la science, chacun apres sa recherche : le premier satellite, un reseau de
// satellites, le premier chat dans l'espace, une station en orbite, le premier chat sur la Lune. Les satellites revelent
// l'ile et les villes ennemies. Le renseignement : l'agence forme des espions (observer, voler une recherche, saboter),
// la station d'ecoute voit les unites ennemies, le contre-espionnage prend plus souvent les espions de l'autre camp.

/* ---- les cinq jalons ---- */
export const STAGE_TECH = ['fusees', 'satellites', 'cosmonautes', 'station', 'lune'];
export const launchPrice = (stage: number): Price => ({ l: 80 + stage * 50, c: 30 + stage * 10, r: 40 + stage * 35 });
const launchFuel = (stage: number): number => 10 + stage * 8;
const ORDER: Record<Side, number> = { usc: -1, ccp: -1 };
ECO.fusee.tech = 'fusees';
ECO.fusee.desc = 'La course à l’espace : chaque jalon se lance d’ici, une fois sa recherche faite. Le premier camp à les réussir tous les cinq gagne la victoire scientifique.';
SH.spaceReady = (side: Side, stage: number): boolean => ORDER[side] === stage;
export function orderLaunch(side: Side): string {
  const st = SPACE[side].stage;
  if (st >= SPACE_STEPS.length) return 'Les cinq jalons sont atteints.';
  if (SPACE[side].launchT || ORDER[side] === st) return 'Un lancement est déjà en préparation.';
  if (!hasTech(side, STAGE_TECH[st])) return 'Il faut d’abord la recherche « ' + (TECH.get(STAGE_TECH[st])?.name || '') + ' ».';
  const pr = launchPrice(st), fuel = launchFuel(st), R = RES[side];
  if (!canAfford(side, pr)) return 'Il faut ' + SH.costLabel(pr) + '.';
  if (R.x.petrole < fuel) return 'Il faut ' + fuel + ' pétrole pour la fusée.';
  payPrice(side, pr); R.x.petrole -= fuel; ORDER[side] = st;
  return '';
}
// l'autre camp lance des qu'il peut
let aiAcc = 0;
HOOKS.step.push((dt: number) => {
  if (GAME.mode !== 'play') return;
  aiAcc += dt; if (aiAcc < 5) return; aiAcc = 0;
  for (const side of SIDES){
    if (side === GAME.side) continue;
    if (!(SH.BLD as Building[]).some(l => l.side === side && l.type === 'fusee' && l.done)) continue;
    orderLaunch(side);
  }
  renderRace();
});
const prevSel = SH.selExtra;
SH.selExtra = (l: Building, btn: (label: string, sub: string, fn: () => void, why?: string) => HTMLButtonElement, act: HTMLElement) => {
  if (typeof prevSel === 'function') prevSel(l, btn, act);
  if (l.type === 'fusee' && l.done && l.side === GAME.side){
    const st = SPACE[l.side].stage;
    if (st < SPACE_STEPS.length){
      const pr = launchPrice(st), fuel = launchFuel(st), tech = STAGE_TECH[st];
      const why = !l.active ? 'La base est à l’arrêt : relie-la par la route à un hôtel de ville.' : !hasTech(l.side, tech) ? 'Il faut la recherche « ' + (TECH.get(tech)?.name || '') + ' ».' : (SPACE[l.side].launchT || ORDER[l.side] === st) ? 'Lancement en préparation.' : lackText(pr) ? 'Il manque ' + lackText(pr) + '.' : RES[l.side].x.petrole < fuel ? 'Il faut ' + fuel + ' pétrole.' : '';
      btn('Lancer : ' + SPACE_STEPS[st][1], costHTML(pr) + ' + ' + fuel + ' pétrole', () => { const w = orderLaunch(l.side); if (w) toast(w); else toast('Lancement commandé : ' + SPACE_STEPS[st][1] + '.'); SH.sfx('click'); }, why);
    }
    const n = document.createElement('p'); n.className = 'sel-note'; n.textContent = 'Jalons de la science : ' + st + ' sur 5 (l’autre camp : ' + SPACE[l.side === 'usc' ? 'ccp' : 'usc'].stage + ').'; act.append(n);
  }
};

/* ---- les satellites revelent l'ile ---- */
const fogSources: ((see: (a: number, b: number, r: number) => void) => void)[] = SH.FOG_SOURCES || (SH.FOG_SOURCES = []);
fogSources.push((see) => {
  const st = SPACE[GAME.side].stage; if (st < 1) return;
  // un satellite en orbite basse : un grand cercle qui balaie l'ile
  const t = GAME.t * .05, a = IS.ca + Math.cos(t) * IS.ra * .7, b = IS.cb + Math.sin(t * 1.7) * IS.rb * .7;
  see(a, b, 90);
  // le reseau : les villes ennemies restent en vue
  if (st >= 2) for (const l of SH.BLD as Building[]) if (l.side !== GAME.side && l.done && isCity(l)) see(l.ca, l.cb, 120);
});

/* ---- la course a l'espace, a l'ecran : cinq cases par camp ---- */
function renderRace(){
  const el = document.getElementById('spaceRace'); if (!el) return;
  const row = (s: Side) => '<span class="sr-row" data-side="' + s + '">' + SPACE_STEPS.map((x, i) => '<i class="' + (SPACE[s].stage > i ? 'on' : '') + '" title="' + x[1] + '"></i>').join('') + '</span>';
  const h = row('usc') + '<span class="sr-lab">espace</span>' + row('ccp');
  if (el.innerHTML !== h) el.innerHTML = h;
  el.title = 'Jalons de la science : USC ' + SPACE.usc.stage + ' sur 5, CCR ' + SPACE.ccp.stage + ' sur 5.';
}
HOOKS.reset.push(() => { ORDER.usc = -1; ORDER.ccp = -1; renderRace(); });
HOOKS.load.push(() => renderRace());

/* ---- le renseignement : agence, station d'ecoute ---- */
TYPES.agence = { name: 'Agence de renseignement', nameCCP: 'Bureau du Peuple', fem: true, build(lot: Building, seed: number){
  const ccp = lot.side === 'ccp', a0 = lot.ca - 9, a1 = lot.ca + 9, b0 = lot.cb - 7, b1 = lot.cb + 5, hh = 14;
  const body = () => {
    SH.CUR = ccp ? M.CONCRETE : M.SANDSTONE;
    boxS(a0, a1, b0, b1, 0, hh, (u: number, h: number, x: number, y: number, k: number) => ((u % 2.4) < 1 && (h % 3.4) > 1.2 && h < hh - 1) ? winColor('in', (x + y) % 5 === 0, x, y) : (h > hh - 1 ? 1 : wallBase(k, x, y)), 1);
    SH.CUR = M.METAL; line3(a1 - 2, b0 + 2, hh, a1 - 2, b0 + 2, hh + 10, 1); line3(a1 - 4, b0 + 2, hh + 8, a1, b0 + 2, hh + 8, 1);
    if (ccp){ const p = prj(lot.ca, b1, hh + 1.5); SH.CUR = M.SIGN_CCP; drawStar(fput, Math.round(p[0]) - 3, Math.round(p[1]) - 3, 0, true); }
  };
  void seed;
  return { parts: [part(lot.ca, lot.cb, 0, body), part(lot.ca, lot.cb, .6, () => facadePlate(ccp ? 'BUREAU' : 'AGENCE', lot.ca, b1, b0, 3))], lights: [sideLight(a0, a1, b0, b1, 0, 7, 1)] };
} };
ECO.agence = bdef('armee', 80, { costR: 40, jobs: 4, rad: 34, elec: -2, tech: 'espionnage', desc: 'Forme les espions : observer, voler une recherche, saboter.' });
FOOT.agence = [22, 16];
TYPES.ecoute = { name: 'Station d’écoute', nameCCP: 'Station d’écoute du Peuple', fem: true, build(lot: Building, seed: number){
  const body = () => { SH.CUR = M.CONCRETE; boxS(lot.ca - 8, lot.ca + 2, lot.cb - 5, lot.cb + 5, 0, 5, (u: number, h: number) => h > 2 && h < 3.4 && (u % 3) > 1.5 ? 3 : 0, 1); };
  // les grands domes blancs
  const domes = () => { SH.CUR = M.SNOW; for (const [da, db, r] of [[6, -3, 4], [7, 5, 3]] as [number, number, number][]){ for (let z = 0; z < r; z += .8){ const rr = Math.sqrt(Math.max(0, r * r - z * z)); drawCyl(lot.ca + da, lot.cb + db, z, rr, .8, z + .8 >= r); } } };
  void seed;
  return { parts: [part(lot.ca - 3, lot.cb, 0, body), part(lot.ca + 6, lot.cb, .3, domes)], lights: [Lc(lot.ca, lot.cb, 8, 1)] };
} };
ECO.ecoute = bdef('armee', 70, { costR: 30, jobs: 3, rad: 34, elec: -3, tech: 'ecoute', desc: 'Voit les unités ennemies dans un grand rayon, même dans le brouillard.' });
FOOT.ecoute = [24, 18];
fogSources.push((see) => { for (const l of SH.BLD as Building[]) if (l.side === GAME.side && l.type === 'ecoute' && l.done) see(l.ca, l.cb, 240); });

/* ---- les espions ---- */
UNIT_DEF.espion = { name: 'Espion', nameCCP: 'Agent du Peuple', desc: 'Invisible tant qu’il reste loin de l’ennemi. Près d’un bâtiment ennemi : observer, voler une recherche, saboter.', speed: 16, sight: 80, hp: 15, atk: 0, range: 0, rate: 1, price: { l: 20, c: 20, r: 30 }, time: 14, from: ['agence'], domain: 'terre', upkeep: { c: .2, p: 0 }, look: 'espion', spy: true, tech: 'espionnage' };
// un espion ennemi ne se voit que tout pres de nos unites ou de nos batiments (plus loin avec le contre-espionnage)
SH.hiddenUnit = (u: Unit): boolean => {
  if (u.kind !== 'espion' || u.side === GAME.side) return false;
  const r = hasTech(GAME.side, 'contre') ? 60 : 25;
  for (const o of UNITS) if (o.side === GAME.side && !o.dead && Math.hypot(o.a - u.a, o.b - u.b) < r) return false;
  for (const l of SH.BLD as Building[]) if (l.side === GAME.side && Math.hypot(l.ca - u.a, l.cb - u.b) < r + 10) return false;
  return true;
};
const prevDraw = SH.drawVehicle;
SH.drawVehicle = (u: Unit, d: UnitDef, t: number): boolean => {
  if (d.look === 'espion'){
    const p = prj(u.a, u.b, 0), x = Math.round(p[0]), y = Math.round(p[1]), step = u.pi < u.path.length ? (Math.floor(t * 8) & 1) : 0;
    SH.CUR = M.CAT_BLACK; fput(x - 1, y, 0); fput(x + 1, y, 0); if (step) fput(x - 1, y - 1, 0); else fput(x + 1, y - 1, 0);
    // l'imperméable et le chapeau
    SH.CUR = u.side === 'ccp' ? M.CAT_GRAY : M.SANDSTONE; for (let dy = 2; dy <= 5; dy++) for (let dx = -1; dx <= 1; dx++) fput(x + dx, y - dy, dx === -1 ? 0 : 1);
    SH.CUR = M.CAT_OR; fput(x, y - 6, 1); fput(x - 1, y - 6, 1); fput(x + 1, y - 6, 1);
    SH.CUR = M.CAT_BLACK; for (let dx = -2; dx <= 2; dx++) fput(x + dx, y - 7, 0); fput(x, y - 8, 0); fput(x - 1, y - 8, 0); fput(x + 1, y - 8, 0);
    return true;
  }
  return typeof prevDraw === 'function' ? prevDraw(u, d, t) : false;
};
// les missions, depuis le panneau des unites choisies
const near = (u: Unit): Building | null => { let best: Building | null = null, bd = 30; for (const l of SH.BLD as Building[]){ if (l.side === u.side || !l.done) continue; const d = Math.hypot(Math.max(l.a0 - u.a, 0, u.a - l.a1), Math.max(l.b0 - u.b, 0, u.b - l.b1)); if (d < bd){ bd = d; best = l; } } return best; };
SH.unitActions = (sel: Unit[]): string => {
  const spy = sel.find(u => u.kind === 'espion'); if (!spy) return '';
  const l = near(spy);
  if (!l) return '<p class="sel-note">Approche l’espion d’un bâtiment ennemi pour ses missions.</p>';
  const sab = hasTech(spy.side, 'sabotage'), lab = l.type === 'universite' || l.type === 'labo';
  return '<button class="btn" type="button" data-un="spy-obs">Observer les environs</button>'
    + '<button class="btn" type="button" data-un="spy-vol"' + (sab && lab ? '' : ' disabled title="' + (!sab ? 'Il faut la recherche « Sabotage ».' : 'Il faut une université ou un laboratoire ennemi.') + '"') + '>Voler une recherche</button>'
    + '<button class="btn" type="button" data-un="spy-sab"' + (sab ? '' : ' disabled title="Il faut la recherche « Sabotage »."') + '>Saboter : ' + typeName(l.type, l.side).toLowerCase() + '</button>';
};
interface Reveal { a: number; b: number; until: number }
const REVEAL: Reveal[] = [];
fogSources.push((see) => { for (let k = REVEAL.length - 1; k >= 0; k--){ const r = REVEAL[k]; if (GAME.t > r.until){ REVEAL.splice(k, 1); continue; } see(r.a, r.b, 220); } });
const SAB = new Map<number, number>();
const prevMult = SH.prodMult;
SH.prodMult = (l: Building): number => ((SAB.get(l.id) || 0) > GAME.t ? 0 : 1) * (typeof prevMult === 'function' ? prevMult(l) : 1);
// reussir ou se faire prendre : un sur trois, la moitie si l'autre camp a le contre-espionnage
const caught = (by: Side): boolean => Math.random() < (hasTech(by === 'usc' ? 'ccp' : 'usc', 'contre') ? .5 : .3);
export function spyMission(kind: string, side: Side, l: Building, spy?: Unit): string {
  const foe = l.side;
  if (kind !== 'obs' && caught(side)){ if (spy) spy.dead = true; return 'pris'; }
  if (kind === 'obs'){ REVEAL.push({ a: l.ca, b: l.cb, until: GAME.t + 90 }); return 'Les environs restent en vue une minute et demie.'; }
  if (kind === 'vol'){
    const mine = SCI[side], theirs = SCI[foe], can = [...theirs.done].filter(id => !mine.done.has(id));
    if (!can.length) return 'Rien à voler : l’autre camp ne sait rien de plus.';
    const id = can[Math.floor(Math.random() * can.length)]; mine.done.add(id); refreshPalette(); if (side === GAME.side) achieve('ESPION');
    return 'Recherche volée : ' + (TECH.get(id)?.name || id) + '.';
  }
  SAB.set(l.id, GAME.t + 60); l.hp = Math.min(l.hp == null ? (SH.bhpMax ? SH.bhpMax(l) : 100) : l.hp, (SH.bhpMax ? SH.bhpMax(l) : 100) * .3);
  return typeName(l.type, foe) + ' sabotée : à l’arrêt une minute.';
}
SH.unitAct = (k: string, sel: Unit[]): boolean => {
  if (!k.startsWith('spy-')) return false;
  const spy = sel.find(u => u.kind === 'espion'); if (!spy) return true;
  const l = near(spy); if (!l){ toast('Plus de bâtiment ennemi à portée.'); return true; }
  const r = spyMission(k.slice(4), spy.side, l, spy);
  toast(r === 'pris' ? 'Notre espion s’est fait prendre.' : r);
  if (SH.logDay && r !== 'pris') SH.logDay(spy.side, 'spy', r);
  return true;
};
// les espions de l'autre camp, de temps en temps (s'il a une agence)
let spyAcc = 0;
HOOKS.step.push((dt: number) => {
  if (GAME.mode !== 'play' || dt <= 0) return;
  spyAcc += dt; if (spyAcc < 150) return; spyAcc = 0;
  const foe = GAME.rival, me = GAME.side;
  if (!(SH.BLD as Building[]).some(l => l.side === foe && l.type === 'agence' && l.done)) return;
  const targets = (SH.BLD as Building[]).filter(l => l.side === me && l.done && l.type !== 'qg');
  if (!targets.length) return;
  const l = targets[Math.floor(Math.random() * targets.length)], kind = hasTech(foe, 'sabotage') && Math.random() < .5 ? 'sab' : 'vol';
  const r = spyMission(kind, foe, l);
  if (r === 'pris') toast('Un espion de l’autre camp s’est fait prendre près de ' + typeName(l.type, me).toLowerCase() + '.');
  else if (kind === 'sab') toast('Sabotage ennemi : ' + typeName(l.type, me).toLowerCase() + ' à l’arrêt une minute.');
  else if (!r.startsWith('Rien')) toast('L’autre camp nous a volé une recherche.');
});
HOOKS.reset.push(() => { REVEAL.length = 0; SAB.clear(); spyAcc = 0; });
