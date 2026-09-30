import { SH } from './00-shared.ts';
import type { Building, Side } from './00-shared.ts';
import type { Drawable } from './07-world.ts';
import { CAMP_FULL, GAME, H, M, SC, SIDES, TAU, W, bz, cam, clamp, dep, fput, hash2, line3, other, prj, state } from './01-core.ts';
import { pennant } from './03-buildings-base.ts';
import { TYPES } from './04-types.ts';
import { typeName } from './05-types-extra.ts';
import { cutTrees } from './07-world.ts';
import { SID, TER, lockCells, rebuildLocks, terPct } from './08-territory.ts';
import { reseatCars, roadAccess } from './09-roads.ts';
import { rebuildTown } from './10-town.ts';
import { $, achieve, andList, toast } from './13-ui.ts';
/* ================= economie : croquettes, laine et ronrons ================= */
// Par batiment, au niveau 1 et par minute : c croquettes, l laine, r ronrons (negatif = fonctionnement),
// pop habitants, jobs emplois, fun loisirs, rad rayon d'influence, cost laine a la construction, costR ronrons,
// up : ameliorable, coast : au bord de l'eau, noRoad : n'a pas besoin de route, time : secondes de chantier.
/** Categorie du menu de construction. */
export type Cat = 'base' | 'logement' | 'nourriture' | 'laine' | 'loisirs' | 'prestige' | 'mer' | 'frontiere';
/** Un flux de ressource : c croquettes, l laine, r ronrons. */
export type Flow = 'c' | 'l' | 'r';
/** Fiche economique d'un type de batiment (voir le commentaire au-dessus). */
export interface EcoDef {
  cat: Cat; cost: number; costR: number; costC: number;
  c: number; l: number; r: number; pop: number; jobs: number; fun: number; rad: number;
  up: boolean; time: number; coast?: boolean; noRoad?: boolean; desc?: string;
}
/** Prix d'un batiment ou d'une amelioration. */
export interface Price { l: number; c: number; r: number }
export const bdef = (cat: Cat, cost: number, o: Partial<EcoDef>): EcoDef => Object.assign({ cat, cost, costR: 0, costC: 0, c: 0, l: 0, r: 0, pop: 0, jobs: 0, fun: 0, rad: 34, up: false, time: 0 }, o);
export const ECO: Record<string, EcoDef> = {
  qg: bdef('base', 0, { c: 10, l: 12, r: 6, pop: 6, rad: 150, noRoad: true, time: 12 }),
  maison: bdef('logement', 20, { pop: 5, rad: 34, up: true, desc: 'Des habitants : ils mangent, travaillent et ronronnent.' }),
  immeuble: bdef('logement', 45, { l: -1, pop: 14, rad: 34, up: true, desc: 'Beaucoup d’habitants, un peu d’entretien.' }),
  pecherie: bdef('nourriture', 25, { c: 12, l: -.5, jobs: 4, rad: 40, up: true, coast: true, noRoad: true, desc: 'Sur la côte. Les chalutiers rapportent des croquettes de poisson.' }),
  kolkhoze: bdef('nourriture', 35, { c: 16, l: -1, jobs: 6, rad: 40, up: true, desc: 'Des champs et un tracteur : beaucoup de croquettes.' }),
  epicerie: bdef('nourriture', 25, { c: 5, r: 1, jobs: 3, up: true, desc: 'Un peu de croquettes et des habitants contents.' }),
  supermarche: bdef('nourriture', 70, { c: 14, r: 2, l: -2, jobs: 8, rad: 40, up: true, desc: 'Grand magasin de croquettes. Coûte de l’entretien.' }),
  diner: bdef('nourriture', 35, { c: 3, r: 3, l: -.5, jobs: 3, fun: 8, up: true, desc: 'Milkshakes à la sardine : croquettes et ronrons.' }),
  bergerie: bdef('laine', 25, { l: 12, jobs: 4, rad: 40, up: true, desc: 'Des moutons tondus : de la laine.' }),
  usine: bdef('laine', 60, { l: 24, c: -1, r: -2, jobs: 10, rad: 40, up: true, desc: 'Beaucoup de laine, mais les voisins ronronnent moins.' }),
  station: bdef('laine', 30, { l: 4, r: 1, jobs: 2, up: true, desc: 'Pompes à essence et un peu de laine synthétique.' }),
  parc: bdef('loisirs', 10, { r: 2, fun: 6, noRoad: true, desc: 'Des arbres et un banc. Ronrons garantis.' }),
  fontaine: bdef('loisirs', 15, { r: 2, fun: 5, noRoad: true, desc: 'Un peu de fraîcheur pour le quartier.' }),
  statue: bdef('loisirs', 25, { r: 3, fun: 3, rad: 40, noRoad: true, desc: 'Un héros de bronze. La fierté du camp.' }),
  panneau: bdef('loisirs', 15, { r: 2, fun: 2, noRoad: true, desc: 'Publicité à l’ouest, slogan à l’est.' }),
  kiosque: bdef('loisirs', 20, { r: 3, fun: 8, noRoad: true, desc: 'Musique le dimanche.' }),
  cinema: bdef('loisirs', 50, { r: 5, l: -1, jobs: 3, fun: 16, up: true, desc: 'Films de souris martiennes.' }),
  drivein: bdef('loisirs', 45, { r: 5, l: -1, jobs: 2, fun: 14, up: true, desc: 'Cinéma en plein air, en voiture.' }),
  bowling: bdef('loisirs', 45, { r: 5, l: -1, jobs: 3, fun: 14, up: true, desc: 'Strikes et néons.' }),
  cirque: bdef('loisirs', 55, { r: 6, c: -1, jobs: 4, fun: 18, up: true, desc: 'L’ours fait du vélo.' }),
  bulbes: bdef('loisirs', 60, { r: 5, l: -.5, fun: 12, rad: 34, desc: 'Des dômes dorés qui tournent avec la vue.' }),
  motel: bdef('loisirs', 35, { r: 4, c: -1, jobs: 3, fun: 6, up: true, desc: 'Des visiteurs de passage.' }),
  chateau: bdef('loisirs', 30, { r: 3, rad: 34, noRoad: true, desc: 'Le château d’eau du quartier.' }),
  radio: bdef('prestige', 55, { r: 6, l: -1, jobs: 3, rad: 64, up: true, desc: 'La radio porte loin : grande influence.' }),
  stade: bdef('prestige', 110, { r: 9, l: -2, jobs: 6, fun: 30, rad: 42, up: true, desc: 'Matchs le soir. Beaucoup de ronrons.' }),
  grandmagasin: bdef('prestige', 90, { c: 6, r: 4, l: -2, jobs: 10, fun: 12, rad: 36, up: true, desc: 'Vitrines, escalators et croquettes.' }),
  tribune: bdef('prestige', 60, { r: 6, fun: 10, rad: 40, desc: 'Pour les grands discours.' }),
  artdeco: bdef('prestige', 120, { l: 6, r: 3, c: -2, pop: 16, jobs: 12, rad: 44, up: true, desc: 'Un gratte-ciel de bureaux et d’appartements.' }),
  stalinien: bdef('prestige', 120, { l: 6, r: 3, c: -2, pop: 16, jobs: 12, rad: 44, up: true, desc: 'Un gratte-ciel monumental.' }),
  fusee: bdef('prestige', 150, { costR: 60, l: -3, jobs: 8, rad: 40, desc: 'La course à l’espace : chaque lancement rapporte des ronrons.' }),
  port: bdef('mer', 40, { c: 6, l: -.5, jobs: 5, rad: 48, up: true, coast: true, noRoad: true, time: 14, desc: 'Ponton, puis quai, puis grand port. Lance des barges et des chalutiers.' }),
  phare: bdef('mer', 40, { r: 3, l: -.5, rad: 54, coast: true, noRoad: true, desc: 'Éclaire la côte la nuit. Bonne influence.' }),
  drapeau: bdef('frontiere', 0, { costC: 30, costR: 20, rad: 78, noRoad: true, time: 5, desc: 'Un avant-poste : des pionniers à nourrir, et ton territoire avance autour. Chaque nouveau coûte un peu plus.' }),
  checkpoint: bdef('frontiere', 40, { c: 3, l: 3, r: 2, jobs: 2, rad: 40, noRoad: true, desc: 'Au bord du Rideau de Laine : petits échanges avec l’autre camp.' })
};
export const CATS_MENU: [Cat, string][] = [['logement', 'Logement'], ['nourriture', 'Croquettes'], ['laine', 'Laine'], ['loisirs', 'Loisirs'], ['prestige', 'Prestige'], ['mer', 'Mer'], ['frontiere', 'Frontière']];
// chaque camp a ses gouts : un diner fait plus ronronner l'ouest, une usine fache moins l'est
export const CAMP_VAL: Record<string, [number, number]> = {
  maison: [2, 1], immeuble: [1, 3], diner: [5, 1], cinema: [5, 2], drivein: [6, 1], motel: [3, 1], bowling: [5, 1], station: [3, 2],
  epicerie: [3, 3], supermarche: [7, 1], grandmagasin: [6, 4], artdeco: [6, 2], stalinien: [2, 7], usine: [1, 8],
  kolkhoze: [1, 7], bulbes: [2, 4], stade: [7, 5], radio: [3, 4], fusee: [5, 7], cirque: [3, 5], statue: [2, 4], panneau: [3, 3],
  fontaine: [2, 2], chateau: [2, 2], kiosque: [3, 2], parc: [2, 1], tribune: [2, 6]
};
export const taste = (type: string, side: Side): number => { const v = CAMP_VAL[type]; return v ? .55 + v[side === 'usc' ? 0 : 1] / 7 : 1; };
export const LVL_POP: Record<string, number[]> = { maison: [5, 8, 12], immeuble: [14, 22, 34] };
export const LVL_MULT = [1, 1.7, 2.5];
export const LVL_NAME: Record<string, string[]> = { maison: ['Maison', 'Pavillon', 'Villa'], immeuble: ['Immeuble', 'Barre', 'Tour'], port: ['Ponton', 'Quai', 'Grand port'] };
export const LVL_NAME_CCP: Record<string, string[]> = { maison: ['Isba', 'Datcha', 'Datcha de ministre'], immeuble: ['Immeuble', 'Barre du Plan', 'Tour du Peuple'], port: ['Ponton', 'Quai du Peuple', 'Port du Peuple'] };
export function lvlName(l: Building): string { const L = (l.side === 'ccp' ? LVL_NAME_CCP : LVL_NAME)[l.type]; return L ? L[(l.lvl || 1) - 1] : typeName(l.type, l.side); }
export const costOf = (type: string): number => (ECO[type] ? ECO[type].cost : 20);
// prix complet d'un batiment pour un camp : laine, croquettes, ronrons (les avant-postes coutent de plus en plus cher)
export function priceOf(type: string, side: Side): Price {
  const e = ECO[type]; if (!e) return { l: 20, c: 0, r: 0 };
  const n = type === 'drapeau' ? SH.BLD.filter(l => l.side === side && l.type === 'drapeau').length : 0;
  return { l: e.cost, c: e.costC + n * 5, r: e.costR + n * 3 };
}
export const costLabel = (p: Price): string => andList([p.l ? p.l + ' laine' : '', p.c ? p.c + ' croquettes' : '', p.r ? p.r + ' ronrons' : '']) || 'gratuit';
export const canAfford = (side: Side, p: Price): boolean => canPay(side, p.l, p.r, p.c);
export const upCost = (l: Building): { l: number; r: number } | null => { const e = ECO[l.type], lv = l.lvl || 1; return lv >= 3 || !e || !e.up ? null : { l: Math.round(Math.max(30, e.cost) * (lv === 1 ? 1.5 : 2.6)), r: lv === 1 ? 15 : 40 }; };
export const buildTime = (type: string): number => { const e = ECO[type]; return e && e.time ? e.time : Math.round(7 + (e ? e.cost : 20) / 7); };
export const popOf = (l: Building): number => LVL_POP[l.type] ? LVL_POP[l.type][(l.lvl || 1) - 1] : (ECO[l.type] ? ECO[l.type].pop : 0);

/** Les reserves d'un camp, ses flux par minute (rc, rl, rr), sa population et le detail des flux pour les infobulles. */
export interface Resources {
  croq: number; laine: number; ron: number;
  rc: number; rl: number; rr: number;
  pop: number; jobs: number; fun: number; eff: number; funRatio: number;
  /** 1 pendant une penurie de croquettes */
  short: number; shortL: number;
  split: Record<Flow, [string, number][]>;
}
export const newRes = (): Resources => ({ croq: 150, laine: 260, ron: 60, rc: 0, rl: 0, rr: 0, pop: 0, jobs: 0, fun: 0, eff: 1, funRatio: 0, short: 0, shortL: 0, split: { c: [], l: [], r: [] } });
export const RES: Record<Side, Resources> = { usc: newRes(), ccp: newRes() };
// bilan d'un camp : ce qui entre et ce qui sort, avec le detail pour les infobulles
export function ecoTally(side: Side): void {
  const R = RES[side], sp: Resources['split'] = { c: [], l: [], r: [] };
  let pop = 0, jobs = 0, fun = 0;
  const mine = SH.BLD.filter(l => l.side === side && l.done);
  for (const l of mine){ pop += popOf(l); if (l.active) jobs += (ECO[l.type] ? ECO[l.type].jobs : 0) * LVL_MULT[(l.lvl || 1) - 1] ** .5; }
  const eff = jobs ? clamp(pop / jobs, .3, 1) : 1;
  const acc: Record<Flow, number> = { c: 0, l: 0, r: 0 }, add = (k: Flow, v: number, why: string): void => { if (!v) return; acc[k] += v; const e = sp[k].find(x => x[0] === why); if (e) e[1] += v; else sp[k].push([why, v]); };
  for (const l of mine){
    const e = ECO[l.type]; if (!e) continue;
    const mult = LVL_MULT[(l.lvl || 1) - 1], nm = typeName(l.type, side);
    if (!l.active){ for (const k of ['c', 'l'] as const) if (e[k] < 0) add(k, e[k], nm + ' (sans route)'); continue; }
    for (const k of ['c', 'l', 'r'] as const){
      const v = e[k]; if (!v) continue;
      if (v > 0) add(k, v * mult * (e.jobs ? eff : 1) * (k === 'r' ? taste(l.type, side) : 1), nm);
      else add(k, v * (1 + (mult - 1) * .5), nm + ' (fonctionnement)');
    }
    fun += e.fun * mult * taste(l.type, side);
  }
  // les habitants mangent, et ronronnent s'ils ont a manger et de quoi se distraire
  add('c', -pop * .35, 'Repas des habitants');
  const funRatio = pop ? clamp(fun / pop, 0, 1.5) : 0;
  if (R.short) add('r', -pop * .06, 'Habitants affamés');
  else add('r', pop * .3 * (.5 + funRatio), 'Habitants heureux');
  Object.assign(R, { rc: acc.c, rl: acc.l, rr: acc.r, pop, jobs: Math.round(jobs), fun: Math.round(fun), eff, funRatio, split: sp });
}
export function refreshAccess(): void { for (const l of SH.BLD) l.active = roadAccess(l); for (const s of SIDES) ecoTally(s); }
export let ecoAcc = 0;
export function stepEco(dt: number): void {
  if (GAME.mode !== 'play') return;
  ecoAcc += dt;
  if (ecoAcc < 1) return;
  const k = ecoAcc / 60; ecoAcc = 0;
  for (const side of SIDES){
    ecoTally(side);
    const R = RES[side];
    R.croq = clamp(R.croq + R.rc * k, 0, 99999); R.laine = clamp(R.laine + R.rl * k, 0, 99999); R.ron = clamp(R.ron + R.rr * k, 0, 99999);
    const was = R.short; R.short = R.croq <= 0 && R.rc < 0 ? 1 : 0;
    if (R.short && !was){
      SH.logDay(side, 'short', 'pénurie de croquettes');
      if (side === GAME.side){ toast('Pénurie de croquettes ! Les habitants ne ronronnent plus. Construis une pêcherie, une ferme ou une épicerie.'); SH.sfx('event'); }
      SH.radioQueue.unshift(side === 'ccp' ? ['ccp', 'Radio Miaou-Scou', 'Pause technique dans la distribution de croquettes. Le Plan prévoit des kolkhozes, vite.'] : ['usc', 'Radio Kutty Libre', 'Pénurie de croquettes au secteur USC ! Il faut des pêcheries et des épiceries.']);
    }
  }
  stepSites();
  if (typeof SH.renderHUD === 'function') SH.renderHUD();
}

/* ================= chantiers : construire, ameliorer, demolir ================= */
export const DUST_DUR = 1.4;
export function canPay(side: Side, l: number, r?: number, c?: number): boolean { const R = RES[side]; return R.laine >= l && R.ron >= (r || 0) && R.croq >= (c || 0); }
export function pay(side: Side, l: number, r?: number, c?: number): void { const R = RES[side]; R.laine -= l; R.ron -= (r || 0); R.croq -= (c || 0); }
export function startBuilding(l: Building): void {
  l.done = false; l.buildT = GAME.t; l.bdur = buildTime(l.type) * (l.side === GAME.side ? 1 : 1.05);
  cutTrees(l.a0, l.a1, l.b0, l.b1);
  SH.BLD.push(l);
  SH.mapDirtyRect(l.a0, l.a1, l.b0, l.b1);
  lockCells(l.a0, l.a1, l.b0, l.b1, SID[l.side]);
  TER.srcVer = -1;
}
export function stepSites(): void {
  let changed = false;
  for (const l of SH.BLD){
    if (!l.done && GAME.t >= l.buildT + l.bdur){
      l.done = true; l.doneT = GAME.t; changed = true; SH.mapDirtyRect(l.a0 - 4, l.a1 + 4, l.b0 - 4, l.b1 + 4);
      l.active = roadAccess(l);
      onBuilt(l);
    }
    if (l.upT && GAME.t >= l.upT + (l.udur || 0)){ SH.mapDirtyRect(l.a0 - 4, l.a1 + 4, l.b0 - 4, l.b1 + 4); l.upT = 0; l.lvl = Math.min(3, (l.lvl || 1) + 1); l.doneT = GAME.t; changed = true; onUpgraded(l); }
  }
  if (changed){ rebuildTown(); refreshAccess(); reseatCars(); }
}
export function onBuilt(l: Building): void {
  SH.logDay(l.side, 'build', typeName(l.type, l.side), { id: l.id, type: l.type });
  if (l.side === GAME.side){
    const nm = typeName(l.type, l.side);
    toast(nm + (TYPES[l.type].fem ? ' terminée' : ' terminé') + '.' + (!l.active ? ' Attention : pas de route jusqu’au QG, il reste à l’arrêt.' : ''));
    SH.sfx('build', l.ca, l.cb);
    if (typeof SH.radioFlash === 'function' && l.type !== 'maison') SH.radioFlash(l);
    if (l.type !== 'qg') achieve('PREMIERE_PIERRE');
  }
  if (typeof SH.boatsForBuilding === 'function') SH.boatsForBuilding(l);
}
export function onUpgraded(l: Building): void {
  SH.logDay(l.side, 'upgrade', lvlName(l), { id: l.id, type: l.type });
  if (l.side === GAME.side){ toast(typeName(l.type, l.side) + ' amélioré' + (TYPES[l.type].fem ? 'e' : '') + ' : ' + lvlName(l).toLowerCase() + ', niveau ' + l.lvl + '.'); SH.sfx('build', l.ca, l.cb); if (l.type === 'port' && l.lvl >= 3) achieve('PORT_NIVEAU_3'); }
  if (typeof SH.boatsForBuilding === 'function') SH.boatsForBuilding(l);
}
export function upgradeBuilding(l: Building): string {
  const c = upCost(l); if (!c) return 'Déjà au niveau maximum.';
  if (!l.done || l.upT) return 'Déjà en chantier.';
  if (!canPay(l.side, c.l, c.r)) return 'Il faut ' + c.l + ' laine et ' + c.r + ' ronrons.';
  pay(l.side, c.l, c.r);
  l.upT = GAME.t; l.udur = buildTime(l.type) * .7;
  SH.saveSoon();
  return '';
}
export function demolishBuilding(l: Building): number {
  const k = SH.BLD.indexOf(l); if (k < 0) return 0;
  SH.BLD.splice(k, 1);
  const refund = l.done ? Math.round(costOf(l.type) / 2) : costOf(l.type);
  RES[l.side].laine += refund;
  l.demoT = GAME.t; DEMOS.push(l);
  SH.CATS = SH.CATS.filter((c: { homeId?: number }) => c.homeId !== l.id);
  rebuildLocks(); TER.srcVer = -1;
  rebuildTown(); refreshAccess(); SH.mapDirtyRect(l.a0, l.a1, l.b0, l.b1);
  return refund;
}
export const DEMOS: Building[] = [];
// chantier : palissade, echafaudage qui monte, grue qui tourne, poussiere
export function drawSite(l: Building, t: number, p: number): void {
  const a0 = l.a0 + 3, a1 = l.a1 - 3, b0 = l.b0 + 3, b1 = l.b1 - 3, Hh = 4 + p * 16;
  SH.CUR = M.WHEAT;
  for (const [pa, pb, qa, qb] of [[a0, b1, a1, b1], [a1, b1, a1, b0], [a0, b0, a0, b1], [a0, b0, a1, b0]]){ const n = Math.ceil(Math.hypot(qa - pa, qb - pb) / 2); for (let k = 0; k <= n; k++){ const a = pa + (qa - pa) * k / n, b = pb + (qb - pb) * k / n; line3(a, b, 0, a, b, 2.2, (k & 1) ? 1 : 0); } }
  SH.CUR = M.METAL;
  const e0 = a0 + 4, e1 = a1 - 4, f0 = b0 + 4, f1 = b1 - 4;
  for (const [a, b] of [[e0, f0], [e1, f0], [e1, f1], [e0, f1]]) line3(a, b, 0, a, b, Hh, 1);
  for (let z = 3; z < Hh; z += 3.5){ line3(e0, f1, z, e1, f1, z, 1); line3(e1, f0, z, e1, f1, z, 1); line3(e0, f0, z, e0, f1, z, 0); line3(e0, f0, z, e1, f0, z, 0); }
  const ga = a1 - 1, gb = b0 + 1, gh = 26, ang = t * .8 + l.ca;
  SH.CUR = M.KVAS; line3(ga, gb, 0, ga, gb, gh, 1); line3(ga + .6, gb, 0, ga + .6, gb, gh, 1);
  const ja = ga + Math.cos(ang) * 14, jb = gb + Math.sin(ang) * 14, ca2 = ga - Math.cos(ang) * 4, cb2 = gb - Math.sin(ang) * 4;
  line3(ca2, cb2, gh, ja, jb, gh, 1); line3(ga, gb, gh + 3, ja, jb, gh, 1);
  SH.CUR = M.METAL; const hook = gh - 4 - 6 * Math.abs(Math.sin(t * 1.3)); line3(ja, jb, gh, ja, jb, hook, 0);
  const fp = prj(a0, b1, 0); SH.CUR = M.METAL; for (let k = 0; k < 9; k++) fput(Math.round(fp[0]), Math.round(fp[1]) - k, 1);
  pennant(Math.round(fp[0]), Math.round(fp[1]) - 9, l.side, t, l.id);
  drawDust(l, t, .3 + .2 * Math.sin(t * 6));
  // barre d'avancement
  const bp = prj(l.ca, l.cb, Hh + 8), bx = Math.round(bp[0]) - 8, by = Math.round(bp[1]);
  SH.CUR = M.BUBBLE; for (let x = 0; x < 17; x++){ fput(bx + x, by, 0); fput(bx + x, by + 2, 0); } fput(bx - 1, by + 1, 0); fput(bx + 17, by + 1, 0);
  SH.CUR = l.side === 'usc' ? M.FLAG_BLUE : M.FLAG_RED; for (let x = 0; x < 17; x++) fput(bx + x, by + 1, x < Math.round(p * 17) ? 0 : 1);
}
export function drawDust(l: Building, t: number, amt: number): void {
  SH.CUR = M.SMOKE;
  const c = prj(l.ca, l.cb, 0), cx = Math.round(c[0]), cy = Math.round(c[1]);
  const n = Math.round(70 * amt);
  for (let i = 0; i < n; i++){
    const ang = hash2(i, 3) * TAU, r = (hash2(i, 5) * 18 + (t * 9 % 6)) * (.6 + amt * .6), h = hash2(i, 9) * 10 * amt;
    const x = Math.round(cx + Math.cos(ang) * r * 1.4), y = Math.round(cy + Math.sin(ang) * r * .7 - h);
    if (bz(x, y) < 8) fput(x, y, 1);
  }
}
export function siteDrawables(t: number, out: Drawable[]): void {
  const gt = GAME.t;
  for (const l of SH.BLD){
    const q = prj(l.ca, l.cb, 0); if (q[0] < -60 * SC || q[0] > W + 60 * SC || q[1] < -60 * SC || q[1] > H + 80 * SC) continue;
    if (!l.done) out.push({ d: dep(l.ca, l.cb) + 2, a: l.ca, b: l.cb, f: () => drawSite(l, t, clamp((gt - l.buildT) / l.bdur, 0, 1)) });
    else if (l.upT) out.push({ d: dep(l.ca, l.cb) + 6, a: l.ca, b: l.cb, f: () => drawDust(l, t, .45 + .2 * Math.sin(t * 5)) });
    else if (l.doneT && gt < l.doneT + .7) out.push({ d: dep(l.ca, l.cb) + 6, a: l.ca, b: l.cb, f: () => drawDust(l, t, 1 - (gt - (l.doneT || 0)) / .7) });
    if (l.done && !l.active && !l.upT) out.push({ d: dep(l.ca, l.cb) + 8, a: l.ca, b: l.cb, f: () => drawNoRoad(l, t) });
  }
  for (let k = DEMOS.length - 1; k >= 0; k--){ const l = DEMOS[k]; if (gt > (l.demoT || 0) + DUST_DUR){ DEMOS.splice(k, 1); continue; } out.push({ d: dep(l.ca, l.cb) + 6, a: l.ca, b: l.cb, f: () => drawDust(l, t, 1.2 * (1 - (gt - (l.demoT || 0)) / DUST_DUR)) }); }
}
// icone au-dessus d'un batiment sans route : un petit panneau barre
export function drawNoRoad(l: Building, t: number): void {
  if (Math.floor(t * 2) % 3 === 2) return;
  const p = prj(l.ca, l.cb, 30), x = Math.round(p[0]), y = Math.round(p[1]);
  SH.CUR = M.BUBBLE;
  for (let dy = -6; dy <= 6; dy++) for (let dx = -6; dx <= 6; dx++){ const r = Math.hypot(dx, dy); if (r <= 6.4) fput(x + dx, y + dy, r > 5.2 ? 0 : 1); }
  SH.CUR = M.ICON_R; for (let d = -4; d <= 4; d++){ fput(x + d, y + d, 1); fput(x + d + 1, y + d, 1); }
  SH.CUR = M.ROAD; for (let dy = -3; dy <= 3; dy++){ fput(x - 2, y + dy, 0); fput(x + 2, y + dy, 0); }
}

/* ================= evenements : un choix a faire ================= */
// E.me et E.them : ressources du joueur et de l'IA ; E.ron, E.croq, E.laine : raccourcis sur le joueur
/** Ce que voit un choix d'evenement : le camp du joueur, ses ressources et celles d'en face. */
export interface EventCtx { side: Side; me: Resources; them: Resources }
export type EventChoice = [string, (E: EventCtx) => void];
export interface GameEvent { side: Side | 'both'; title: string; text: string; a: EventChoice; b: EventChoice }
export const EVENTS: GameEvent[] = [
  { side: 'ccp', title: 'Pénurie au Gastronom', text: 'Plus une sardine au Gastronom. La file fait trois fois le tour du pâté de maisons.',
    a: ['Acheter des croquettes à l’USC', (E) => { E.me.laine -= 40; E.me.croq += 90; }], b: ['Rationner en chantant', (E) => { E.me.ron -= 20; }] },
  { side: 'usc', title: 'Grève des dockers', text: 'Les dockers réclament une prime en sardines avant de décharger les barges.',
    a: ['Payer la prime', (E) => { E.me.croq -= 40; E.me.ron += 12; }], b: ['Tenir bon', (E) => { E.me.laine -= 30; E.me.ron -= 15; }] },
  { side: 'both', title: 'Échange d’espions', text: 'Chaque camp a attrapé un espion. On les échange à l’aube, dans le brouillard ?',
    a: ['Échanger les espions', (E) => { E.me.ron += 15; E.them.ron += 10; }], b: ['Garder le nôtre', (E) => { E.me.laine += 30; E.me.ron -= 10; }] },
  { side: 'usc', title: 'Visite officielle', text: 'Un ministre du Monde Libre débarque pour admirer la vitrine de l’Ouest.',
    a: ['Grande parade de voitures', (E) => { E.me.laine -= 30; E.me.ron += 35; }], b: ['Visite discrète', (E) => { E.me.ron += 8; }] },
  { side: 'ccp', title: 'Record à l’usine n° 7', text: 'L’usine n° 7 annonce 400 % du Plan. Personne n’a vraiment compté.',
    a: ['Médailles pour tous', (E) => { E.me.laine -= 20; E.me.ron += 28; }], b: ['Recompter les pelotes', (E) => { E.me.laine += 35; E.me.ron -= 10; }] },
  { side: 'both', title: 'Tempête sur l’île', text: 'Un coup de vent arrache des tuiles dans toute la ville.',
    a: ['Réparer tout de suite', (E) => { E.me.laine -= 25; }], b: ['Attendre le soleil', (E) => { E.me.ron -= 20; }] },
  { side: 'usc', title: 'Concert de rock à la frontière', text: 'Zazou veut brancher les amplis face à l’autre camp. De l’autre côté, on tend l’oreille.',
    a: ['Brancher les amplis', (E) => { E.me.ron += 25; E.them.ron -= 12; }], b: ['Baisser le son', (E) => { E.me.ron += 5; }] },
  { side: 'ccp', title: 'Défilé exceptionnel', text: 'Le Général propose un défilé de plus. Avec les tracteurs repeints.',
    a: ['Défilé exceptionnel', (E) => { E.me.croq -= 20; E.me.ron += 32; }], b: ['Défilé modeste', (E) => { E.me.ron += 8; }] },
  { side: 'both', title: 'Contrebande de chewing-gum', text: 'Des chats échangent en douce caviar de sardine et chewing-gum à la frontière.',
    a: ['Fermer les yeux', (E) => { E.me.croq += 25; E.them.croq += 15; }], b: ['Renforcer les contrôles', (E) => { E.me.ron -= 10; E.me.laine += 20; }] },
  { side: 'both', title: 'Téléphone rouge', text: 'Le téléphone rouge sonne entre les deux QG. C’est une erreur de numéro. Ou pas.',
    a: ['Discuter un peu', (E) => { E.me.ron += 12; E.them.ron += 12; }], b: ['Raccrocher sèchement', (E) => { E.me.ron += 16; E.them.ron -= 16; }] },
  { side: 'both', title: 'Banc de sardines', text: 'Un banc de sardines géant passe au large. Les chalutiers trépignent.',
    a: ['Tout le monde en mer', (E) => { E.me.croq += SH.BLD.some(l => l.side === E.side && (l.type === 'port' || l.type === 'pecherie')) ? 70 : 20; E.me.laine -= 10; }], b: ['Laisser filer', (E) => { E.me.ron += 6; }] },
  { side: 'both', title: 'Laine en solde', text: 'Un cargo de passage vend des pelotes à prix d’ami.',
    a: ['Acheter la cargaison', (E) => { E.me.croq -= 40; E.me.laine += 75; }], b: ['Non merci', () => {}] }
];
export const EV: { next: number; cur: GameEvent | null; shownAt: number; last: number } = { next: 150, cur: null, shownAt: 0, last: -1 };
export function stepEvents(dt: number, t: number): void {
  if (GAME.mode !== 'play') return;
  const gt = GAME.t;
  if (EV.cur){ if (gt - EV.shownAt > 50) resolveEvent(EV.cur.b, true); return; }
  if (gt < EV.next || state.chatCat) return;
  const pool = EVENTS.map((e, k) => k).filter(k => EVENTS[k].side === 'both' || EVENTS[k].side === GAME.side);
  let k = pool[Math.floor(Math.random() * pool.length)]; if (k === EV.last) k = pool[(pool.indexOf(k) + 1) % pool.length];
  EV.last = k; EV.cur = EVENTS[k]; EV.shownAt = gt;
  EV.next = gt + 170 + Math.random() * 90;
  const el = $('eventCard'); el.hidden = false;
  $('evSide').textContent = EV.cur.side === 'both' ? 'L’ÎLE DE KUTTY' : CAMP_FULL[GAME.side].toUpperCase();
  $('evTitle').textContent = EV.cur.title; $('evText').textContent = EV.cur.text;
  $('evA').textContent = EV.cur.a[0]; $('evB').textContent = EV.cur.b[0];
  el.dataset.side = EV.cur.side === 'both' ? 'both' : GAME.side;
  SH.sfx('event');
}
export function resolveEvent(choice: EventChoice, auto?: boolean): void {
  const E = { side: GAME.side, me: RES[GAME.side], them: RES[GAME.rival] };
  choice[1](E);
  for (const s of SIDES){ const R = RES[s]; R.laine = Math.max(0, R.laine); R.croq = Math.max(0, R.croq); R.ron = Math.max(0, R.ron); }
  const ev = EV.cur; if (!ev) return;
  SH.logDay(GAME.side, 'event', ev.title, { choice: choice[0] });
  toast((auto ? 'Personne n’a tranché : ' : '') + choice[0] + '.');
  SH.radioQueue.unshift(['neutre', 'Radio du port', ev.title + ' : ' + choice[0].toLowerCase() + '.']);
  EV.cur = null; $('eventCard').hidden = true;
  for (const s of SIDES) ecoTally(s);
  if (typeof SH.renderHUD === 'function') SH.renderHUD();
  SH.saveSoon();
}
$('evA').addEventListener('click', () => { if (EV.cur) resolveEvent(EV.cur.a); });
$('evB').addEventListener('click', () => { if (EV.cur) resolveEvent(EV.cur.b); });

/* ================= course a l'espace : avec une base de lancement, chaque palier de territoire fait decoller une fusee ================= */
/** Course a l'espace d'un camp : palier atteint, et date du lancement en cours. */
export interface SpaceState { stage: number; launchT: number | null }
export const SPACE: Record<Side, SpaceState> = { usc: { stage: 0, launchT: null }, ccp: { stage: 0, launchT: null } };
export const SPACE_STEPS: [number, string, number][] = [[.18, 'le premier satellite', 90], [.30, 'le premier chat en orbite', 160], [.42, 'le premier chat sur la Lune', 260]];
export let spaceCount: { side: Side; t0: number; what: string; first: boolean; gain: number } | null = null;
export function stepSpace(t: number): void {
  if (GAME.mode !== 'play') return;
  const gt = GAME.t;
  for (const side of SIDES){
    const S = SPACE[side];
    if (S.launchT && gt > S.launchT + 70) S.launchT = null;
    if (S.launchT || spaceCount) continue;
    const step = SPACE_STEPS[S.stage]; if (!step || terPct(side) < step[0]) continue;
    const pad = SH.BLD.find(l => l.side === side && l.type === 'fusee' && l.done && l.active);
    if (!pad) continue;
    S.launchT = gt + 10; S.stage++;
    const first = SPACE[other(side)].stage < S.stage;
    spaceCount = { side, t0: gt, what: step[1], first, gain: Math.round(step[2] * (first ? 1.5 : 1)) };
    SH.radioQueue.unshift([side, side === 'ccp' ? 'Radio Miaou-Scou' : 'Radio Kutty Libre', 'Compte à rebours lancé : ' + step[1] + ' décolle dans dix secondes !']);
    if (side === GAME.side && !state.chatCat) cam.follow = [pad.ca - 20, pad.cb - 20];
  }
  if (spaceCount){
    const left = Math.ceil(spaceCount.t0 + 10 - gt), el = $('countdown');
    if (left > 0){ el.hidden = spaceCount.side !== GAME.side; el.textContent = String(left); el.dataset.side = spaceCount.side; }
    else {
      el.hidden = true;
      const sc = spaceCount; spaceCount = null;
      SH.sfx('launch');
      if (sc.side === GAME.side) achieve('DECOLLAGE');
      RES[sc.side].ron += sc.gain;

      SH.logDay(sc.side, 'space', sc.what, { first: sc.first });
      SH.fwSalvo(sc.side, 7);
      toast((sc.side === 'ccp' ? 'La CCR' : 'L’USC') + ' envoie ' + sc.what + (sc.first ? ', avant l’autre camp !' : ', mais l’autre camp était déjà passé.') + (sc.side === GAME.side ? ' +' + sc.gain + ' ronrons.' : ''));
      SH.radioQueue.unshift([sc.side, sc.side === 'ccp' ? 'Radio Miaou-Scou' : 'Radio Kutty Libre', sc.side === 'ccp' ? 'Victoire de la science du peuple : ' + sc.what + ' ! La CCR touche les étoiles.' : 'Historique : ' + sc.what + ' ! L’USC monte jusqu’au ciel.']);
      SH.saveSoon();
    }
  }
}

// appeles depuis des modules plus petits en numero
Object.assign(SH, { ECO, CATS_MENU, taste, LVL_POP, LVL_MULT, lvlName, costOf, priceOf, costLabel, canAfford, upCost, popOf, RES, refreshAccess, canPay, pay, startBuilding, upgradeBuilding, demolishBuilding, siteDrawables, SPACE });
