import { SH, type Building, type Side } from './00-shared.ts';
import { GAME, HOOKS, SIDES } from './01-core.ts';
import { $ } from './13-ui.ts';
import { RES } from './15-economy.ts';
import { RIVAL, count, rivalBuild, type Level } from './20-rival.ts';
import { store } from './22-home.ts';
import { isCity } from './25-villes.ts';
import { UNITS, UNIT_DEF, sendUnit, trainUnit } from './26-unites.ts';
import { hasTech } from './29-recherche.ts';
import { NUKES, nuke } from './30-armee.ts';
import { treatyOn, strength } from './32-diplomatie.ts';
/* ================= etape 16 : l'IA adverse, deuxieme couche ================= */
// 20-rival construit la ville (logements, nourriture, laine, loisirs, routes en grille, avant-postes, Rideau, barges).
// Ici, ce que le joueur fait depuis les etapes 3 a 12 : recherche, eau et entrepots, luxe, armee et defense, espace,
// renseignement, attaque quand elle est la plus forte. La difficulte change le rythme, la production et l'agressivite.

/* ---- la difficulte, choisie dans « Nouvelle partie » ---- */
const LEVEL_KEY = 'ckt-niveau';
let pickLevel: Level = (() => { const v = store.get(LEVEL_KEY, 'normal'); return v === 'facile' || v === 'difficile' ? v : 'normal'; })();
function markLevel(){ for (const b of $('newLevel').children) if (b instanceof HTMLElement) b.setAttribute('aria-checked', String(b.dataset.v === pickLevel)); }
for (const b of $('newLevel').children) if (b instanceof HTMLElement) b.addEventListener('click', () => { const v = b.dataset.v; if (v === 'facile' || v === 'normal' || v === 'difficile'){ pickLevel = v; store.set(LEVEL_KEY, v); markLevel(); SH.sfx('click'); } });
markLevel();
HOOKS.reset.push(() => { RIVAL.level = pickLevel; });
HOOKS.save.push((ext) => { ext.ai = RIVAL.level; });
HOOKS.load.push((ext) => { RIVAL.level = ext.ai === 'facile' || ext.ai === 'difficile' ? ext.ai : 'normal'; });
// production de l'IA selon la difficulte
const prevMult = SH.prodMult;
SH.prodMult = (l: Building): number => { const m = typeof prevMult === 'function' ? prevMult(l) : 1; if (!RIVAL.auto[l.side]) return m; return m * (RIVAL.level === 'facile' ? .85 : RIVAL.level === 'difficile' ? 1.25 : 1); };

/* ---- chaque camp joue par l'IA, toutes les six secondes ---- */
const has = (s: Side, t: string) => count(s, t) > 0;
const other = (s: Side): Side => s === 'usc' ? 'ccp' : 'usc';
const lastAttack: Record<Side, number> = { usc: 0, ccp: 0 }, lastTrain: Record<Side, number> = { usc: 0, ccp: 0 };
let acc = 0;
HOOKS.step.push((dt: number) => {
  if (GAME.mode !== 'play' || dt <= 0) return;
  acc += dt; if (acc < 6) return; acc = 0;
  for (const side of SIDES) if (RIVAL.auto[side]) think(side);
});
function think(side: Side){
  const R = RES[side], pop = R.pop, lvl = RIVAL.level, tryB = (t: string) => rivalBuild(t, side);
  // la recherche : une universite, puis un laboratoire
  if (pop >= 25 && !has(side, 'universite') && tryB('universite')) return;
  if (pop >= 50 && hasTech(side, 'education') && count(side, 'labo') < 1 + Math.floor(pop / 120) && tryB('labo')) return;
  // les stocks pleins : un entrepot ; le luxe pour le niveau 3
  if ((R.laine > R.cap * .85 || R.croq > R.cap * .85) && tryB('entrepot')) return;
  if (pop >= 40 && !has(side, 'conserverie') && tryB('conserverie')) return;
  if (pop >= 40 && !has(side, 'atelier') && tryB('atelier')) return;
  if (pop >= 45 && !has(side, 'banque') && tryB('banque')) return;
  // la defense : une caserne, des bunkers devant la menace
  const threat = UNITS.filter(u => u.side !== side && !u.dead && (SH.BLD as Building[]).some(l => l.side === side && Math.hypot(l.ca - u.a, l.cb - u.b) < 160));
  if ((threat.length || pop >= 35) && !has(side, 'caserne') && tryB('caserne')) return;
  if (threat.length && count(side, 'bunker') < 1 + Math.floor(pop / 60) && tryB('bunker')) return;
  if (threat.some(u => UNIT_DEF[u.kind]?.domain === 'air') && hasTech(side, 'radar') && count(side, 'dca') < 2 && tryB('dca')) return;
  // l'armee : quelques groupes de soldats, puis des chars
  const army = UNITS.filter(u => u.side === side && !u.dead && (UNIT_DEF[u.kind]?.atk || 0) > 0);
  const want = Math.min(12, 2 + Math.floor(pop / 25) + (lvl === 'difficile' ? 2 : 0) - (lvl === 'facile' ? 1 : 0));
  if (army.length < want && GAME.t - lastTrain[side] > 20){
    const cas = (SH.BLD as Building[]).find(l => l.side === side && l.type === 'caserne' && l.done);
    const usine = (SH.BLD as Building[]).find(l => l.side === side && l.type === 'usinechars' && l.done);
    const kind = usine && hasTech(side, 'blindes') && Math.random() < .4 ? 'char' : 'soldats', from = kind === 'char' ? usine : cas;
    if (from && !trainUnit(from, kind)) lastTrain[side] = GAME.t;
  }
  if (hasTech(side, 'blindes') && pop >= 60 && !has(side, 'usinechars') && tryB('usinechars')) return;
  // l'espace et le renseignement
  if (hasTech(side, 'fusees') && pop >= 60 && !has(side, 'fusee') && tryB('fusee')) return;
  if (hasTech(side, 'espionnage') && pop >= 55 && !has(side, 'agence') && tryB('agence')) return;
  // l'attaque : quand elle est nettement plus forte, et pas en treve
  const foe = other(side), ratio = strength(side) / Math.max(1, strength(foe));
  const minT = lvl === 'facile' ? 1e9 : lvl === 'difficile' ? 900 : 1500, need = lvl === 'difficile' ? 1.2 : 1.5;
  if (GAME.t > minT && ratio > need && army.length >= 4 && !treatyOn('treve') && !treatyOn('paix') && GAME.t - lastAttack[side] > 240){
    const targets = (SH.BLD as Building[]).filter(l => l.side === foe && l.done);
    if (targets.length){
      const home = (SH.BLD as Building[]).find(l => l.side === side && l.type === 'qg') || targets[0];
      targets.sort((x, y) => Math.hypot(x.ca - home.ca, x.cb - home.cb) - Math.hypot(y.ca - home.ca, y.cb - home.cb));
      const t = targets.find(l => !isCity(l)) || targets[0];
      lastAttack[side] = GAME.t;
      for (const u of army.slice(0, Math.ceil(army.length * .7))){ u.order = { kind: 'attack', bid: t.id }; sendUnit(u, t.ca, t.cb); }
      if (side !== GAME.side) SH.radioQueue.unshift(side === 'ccp' ? ['ccp', 'Radio Miaou-Scou', 'Les forces du Peuple avancent pour libérer la frontière.'] : ['usc', 'Radio Kutty Libre', 'Nos troupes passent à l’offensive. Pour la liberté !']);
    }
  }
  // la bombe, en dernier recours (difficile seulement)
  if (lvl === 'difficile' && NUKES[side] > 0 && ratio < .6 && !treatyOn('paix')){
    const c = (SH.BLD as Building[]).filter(l => l.side === foe && l.done && isCity(l)).sort((x, y) => (y.lvl || 1) - (x.lvl || 1))[0];
    if (c){ NUKES[side]--; nuke(side, c.ca + 30, c.cb + 30); }
  }
}
