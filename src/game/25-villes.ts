import { SH, type Building, type Side } from './00-shared.ts';
import { GAME, H, HOOKS, M, W, dep, fput, plateW, prj } from './01-core.ts';
import { part } from './03-buildings-base.ts';
import { TYPES } from './04-types.ts';
import { type Drawable } from './07-world.ts';
import { GA0, GB0 } from './02-ground.ts';
import { FRONT, TC, TER } from './08-territory.ts';
import { FOOT, rebuildTown } from './10-town.ts';
import { toast } from './13-ui.ts';
import { ECO, LVL_NAME, LVL_NAME_CCP, bdef } from './15-economy.ts';
/* ================= etape 4 : territoire et villes ================= */
// Le camp (l'ancien avant-poste) s'ameliore : camp, baraquements, puis chef-lieu. Arrive au niveau 3, il devient une ville
// a part entiere ('ville') : un hotel de ville a la maniere de son camp, un nom, un noeud du reseau de routes, un peu d'eau
// et d'electricite. La premiere ville est le QG, fonde au debarquement.

/* ---- le camp et le chef-lieu ---- */
Object.assign(TYPES.drapeau, { name: 'Camp', nameCCP: 'Camp du Peuple' });
Object.assign(ECO.drapeau, { up: true, desc: 'Un camp de pionniers : le territoire avance autour. Amélioré deux fois, il devient un chef-lieu, une nouvelle ville.' });
LVL_NAME.drapeau = ['Camp', 'Baraquements', 'Chef-lieu'];
LVL_NAME_CCP.drapeau = ['Camp du Peuple', 'Baraquements du Peuple', 'Chef-lieu du Peuple'];
TYPES.ville = { name: 'Hôtel de ville', nameCCP: 'Soviet de ville', fem: false, build(lot: Building, seed: number){ return TYPES.qg.build(lot, seed); } };
ECO.ville = bdef('base', 0, { c: 5, l: 5, r: 4, pop: 6, rad: 120, noRoad: true, up: true, elec: 4, eau: 30, time: 10, desc: 'Le cœur d’une ville : les routes de ses quartiers s’y relient.' });
FOOT.ville = [30, 28];
FOOT.drapeau = [30, 28];
LVL_NAME.ville = ['Chef-lieu', 'Ville', 'Grande ville'];
LVL_NAME_CCP.ville = ['Chef-lieu du Peuple', 'Ville du Peuple', 'Grande ville du Peuple'];

/* ---- les noms des villes ---- */
export const CITY_NAMES: Record<Side, string[]> = {
  usc: ['Port-Kutty', 'Ronronville', 'Moustache City', 'Griffon Springs', 'Sardine Bay', 'Pelote Falls', 'Minou Heights', 'Croquette Creek', 'Matou Valley', 'Vibrisse Harbor', 'Coussinet Hills', 'Gouttière Park'],
  ccp: ['Kuttygrad', 'Miaoukhovsk', 'Pelotegorsk', 'Ronronsk', 'Sardinovo', 'Moustachev', 'Croquettinsk', 'Griffonovo', 'Matouïevsk', 'Vibrissograd', 'Coussinetsk', 'Ronronovsk'],
};
export function nextCityName(side: Side): string {
  const used = new Set(SH.BLD.filter((l: Building) => l.name).map((l: Building) => l.name));
  const free = CITY_NAMES[side].find(n => !used.has(n));
  return free || (CITY_NAMES[side][0] + ' ' + (used.size + 1));
}
export const isCity = (l: Building): boolean => l.type === 'qg' || l.type === 'ville';

// chaque seconde : nommer les villes, faire d'un chef-lieu une ville
let cityAcc = 0;
HOOKS.step.push((dt: number) => {
  if (GAME.mode !== 'play') return;
  cityAcc += dt; if (cityAcc < 1) return; cityAcc = 0;
  let changed = false;
  for (const l of SH.BLD as Building[]){
    if (!l.done) continue;
    if (l.type === 'drapeau' && (l.lvl || 1) >= 3 && !l.upT){
      l.type = 'ville'; l.lvl = 1; l.name = nextCityName(l.side); changed = true;
      SH.logDay(l.side, 'build', 'la ville de ' + l.name, { id: l.id, type: 'ville' });
      if (l.side === GAME.side){ toast('Le chef-lieu devient une ville : ' + l.name + '.'); SH.sfx('build', l.ca, l.cb); }
      SH.radioQueue.push(l.side === 'ccp' ? ['ccp', 'Radio Miaou-Scou', 'Une nouvelle ville du Peuple est née : ' + l.name + '. Le Plan la prévoyait.'] : ['usc', 'Radio Kutty Libre', 'Bienvenue à ' + l.name + ', la toute nouvelle ville de l’USC !']);
    }
    if (isCity(l) && !l.name){ l.name = nextCityName(l.side); changed = true; }
  }
  if (changed){ rebuildTown(); SH.refreshAccess(); SH.saveSoon(); }
});
// le nom au-dessus de chaque hotel de ville
HOOKS.town.push((parts) => {
  for (const l of SH.BLD as Building[]){
    if (!l.done || !isCity(l) || !l.name) continue;
    const nm = l.name.toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    parts.push(Object.assign(part(l.ca, l.cb + 1, 2, () => { SH.CUR_SIDE = l.side; plateW(nm, l.ca, l.cb, 34, { inv: true }); }), { side: l.side, lot: l, m: M.SIGN }));
  }
});
// sauvegarde : le nom de chaque ville, retrouve par sa position
HOOKS.save.push((ext) => { ext.cities = (SH.BLD as Building[]).filter(l => isCity(l) && l.name).map(l => [Math.round(l.ca), Math.round(l.cb), l.name]); });
HOOKS.load.push((ext) => {
  const cs = ext.cities; if (!Array.isArray(cs)) return;
  for (const c of cs) if (Array.isArray(c)){ const l = (SH.BLD as Building[]).find(o => isCity(o) && Math.abs(o.ca - +c[0]) < 2 && Math.abs(o.cb - +c[1]) < 2); if (l) l.name = String(c[2]); }
});

/* ---- la frontiere qui bouge : des chevrons du camp qui gagne, la ou il prend des cases a l'autre ---- */
HOOKS.dyn.push((t: number, out: Drawable[]) => {
  if (GAME.mode !== 'play') return;
  const now = GAME.t;
  while (FRONT.length && now - FRONT[0].t > 5) FRONT.shift();
  for (let k = 0; k < FRONT.length; k += 2){
    const f = FRONT[k], a = GA0 + ((f.i % TER.W) + .5) * TC, b = GB0 + (Math.floor(f.i / TER.W) + .5) * TC;
    const q = prj(a, b, 0); if (q[0] < -10 || q[0] > W + 10 || q[1] < -10 || q[1] > H + 10) continue;
    out.push({ d: dep(a, b) + 1, a, b, f: (tt: number) => {
      const p = prj(a, b, 0), x = Math.round(p[0]), y = Math.round(p[1]) - 3 - Math.round(((tt * 3) % 1) * 3);
      SH.CUR = f.side === 'ccp' ? M.FLAG_RED : M.FLAG_BLUE;
      for (let d = 0; d < 3; d++){ fput(x - d, y + d, 0); fput(x + d, y + d, 0); }
    } });
  }
});

/* ---- le Rideau de Laine coute un peu d'entretien ---- */
// (compte dans le bilan des ressources : voir 15-economy, ligne « Rideau de Laine »)
SH.wallUpkeep = (side: Side): number => SH.WALLS.filter((w: { side: Side }) => w.side === side).length * .03;
