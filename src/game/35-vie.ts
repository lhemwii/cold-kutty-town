import { SH, type Side } from './00-shared.ts';
import { GAME, HOOKS, clamp } from './01-core.ts';
import { FRONT } from './08-territory.ts';
import { EVENTS, RES, SPACE } from './15-economy.ts';
import { UNITS } from './26-unites.ts';
import { SCI, TECH } from './29-recherche.ts';
import { DIP, treatyOn } from './32-diplomatie.ts';
import { OPT, progress, WIN_NAME, type WinKind } from './33-victoire.ts';
/* ================= etape 14 : vie et contenu ================= */
// Les chats parlent de ce qui se passe (famine, frontiere qui recule, guerre, traites, fusees, victoire en vue) ; la radio
// annonce les vrais evenements de la partie ; de nouveaux evenements a choix, lies a la frontiere, a la mer et au commerce.

/* ---- ce qui se passe, vu par un chat de son camp ---- */
const other = (s: Side): Side => s === 'usc' ? 'ccp' : 'usc';
let lostT = -999, warT = -999;
HOOKS.step.push(() => {
  if (GAME.mode !== 'play') return;
  const me = GAME.side;
  for (const f of FRONT) if (f.side !== me && GAME.t - f.t < 2) lostT = GAME.t;
  if (UNITS.some(u => u.flash && u.flash > 0)) warT = GAME.t;
});
const pickOne = <T,>(a: T[]): T => a[Math.floor(Math.random() * a.length)];
export function situation(side: Side): string[] {
  const R = RES[side], ccp = side === 'ccp', out: string[] = [], me = GAME.side;
  if (R.short) out.push(ccp ? 'Le Gastronom est vide depuis trois jours. Je fais la queue par discipline, mais j’ai faim.' : 'Plus une croquette au supermarché ! Si ça continue, je mange le poisson rouge du voisin.');
  if (side === me && GAME.t - lostT < 90) out.push(ccp ? 'La frontière recule, camarade. On dit que l’USC avance ses panneaux la nuit.' : 'La frontière recule ! Les rouges plantent leurs drapeaux jusque dans nos pelouses.');
  if (GAME.t - warT < 60) out.push(ccp ? 'On entend les chars depuis le kolkhoze. Je dors avec mon casque.' : 'Ça tire du côté de la frontière. J’ai rentré le linge et le chat du voisin.');
  if (treatyOn('paix')) out.push(ccp ? 'La paix est signée. Je n’y crois pas encore, mais la soupe a meilleur goût.' : 'La paix ! On va enfin pouvoir aller voir leur fanfare.');
  else if (treatyOn('treve')) out.push(ccp ? 'Trêve au checkpoint. Le Bureau du Peuple garde un œil ouvert, et moi aussi.' : 'C’est la trêve. Profitons-en pour repeindre la clôture.');
  else if (treatyOn('commerce')) out.push(ccp ? 'Depuis l’accord commercial, il y a du soda au Gastronom. Il est très sucré.' : 'Depuis l’accord commercial, on trouve des poupées gigognes au drugstore. Ma fille adore.');
  if (SPACE[side].stage > 0) out.push(ccp ? 'Nos cosmonautes ont réussi ' + SPACE[side].stage + ' jalon' + (SPACE[side].stage > 1 ? 's' : '') + ' sur cinq. La Lune n’a qu’à bien se tenir.' : 'Nos fusées ont déjà ' + SPACE[side].stage + ' jalon' + (SPACE[side].stage > 1 ? 's' : '') + ' sur cinq. Prochaine étape : la Lune, et un milkshake là-haut.');
  const last = [...SCI[side].done].pop(); if (last) out.push(ccp ? 'Les savants du Peuple maîtrisent maintenant ' + (TECH.get(last)?.name || '').toLowerCase() + '. On me l’a dit à la radio.' : 'Il paraît que nos labos ont trouvé ' + (TECH.get(last)?.name || '').toLowerCase() + '. Le progrès, quoi.');
  if (DIP.fled[other(side)] > 4) out.push(ccp ? 'Encore des chats de l’USC arrivés chez nous. Ils posent beaucoup de questions sur les files d’attente.' : 'Des chats de la CCR passent le Rideau chaque semaine. Ils adorent les juke-box.');
  if (DIP.fled[side] > 4) out.push(ccp ? 'Mon cousin est parti de l’autre côté. On ne parle plus de lui à table.' : 'Mon voisin est passé à l’Est. Il voulait une médaille, je crois.');
  // une victoire en vue, d'un cote ou de l'autre
  for (const k of Object.keys(WIN_NAME) as WinKind[]){
    if (!OPT.wins[k]) continue;
    const pm = progress(k, side), po = progress(k, other(side));
    if (pm > .75) out.push((ccp ? 'Le Plan touche au but : ' : 'On y est presque : ') + 'la victoire ' + WIN_NAME[k].toLowerCase() + ' est à portée de patte.');
    if (po > .75) out.push((ccp ? 'Attention, l’USC approche de la victoire ' : 'Attention, la CCR approche de la victoire ') + WIN_NAME[k].toLowerCase() + '. Il faut réagir.');
  }
  return out;
}
SH.situationLine = (side: Side): string => { const s = situation(side); return s.length ? pickOne(s) : ''; };
// les repliques des chats : une fois sur deux, ils parlent de l'actualite
const prevReply = SH.fallbackHook;
const said = new Set<string>();
SH.fallbackHook = (side: Side, msg: string): string => {
  const m = msg.toLowerCase(), s = situation(side).filter(x => !said.has(x));
  if (!s.length) return typeof prevReply === 'function' ? prevReply(side, msg) : '';
  if (/nouvelles|quoi de neuf|actualit|situation|guerre|paix|ça va|ca va|autre camp|frontière/.test(m) || Math.random() < .35){ const x = pickOne(s); said.add(x); if (said.size > 12) said.clear(); return x; }
  return typeof prevReply === 'function' ? prevReply(side, msg) : '';
};

/* ---- la radio parle des vrais evenements ---- */
const prevLog = SH.logDay;
const radioOf = (s: Side): [string, string] => s === 'ccp' ? ['ccp', 'Radio Miaou-Scou'] : ['usc', 'Radio Kutty Libre'];
SH.logDay = (side: Side | 'both', kind: string, txt: string, data?: Record<string, unknown>) => {
  prevLog(side, kind, txt, data);
  if (GAME.mode !== 'play') return;
  const q = SH.radioQueue as [string, string, string][];
  if (kind === 'capture' && side !== 'both'){ const r = radioOf(side); q.push([r[0], r[1], side === 'ccp' ? 'Les héros du Peuple ont libéré un bâtiment de l’USC (' + txt.toLowerCase() + '). L’étoile rouge flotte dessus.' : 'Nos gars ont pris un bâtiment de la CCR (' + txt.toLowerCase() + ') ! Le drapeau étoilé flotte dessus.']); }
  else if (kind === 'battle') q.push(['neutre', 'Radio du port', 'Accrochage à la frontière cette nuit. Les deux camps parlent d’une provocation.']);
  else if (kind === 'spy' && side !== 'both'){ const r = radioOf(other(side)); q.push([r[0], r[1], side === 'ccp' ? 'Nos services ont repéré un agent du Peuple. L’USC reste vigilante.' : 'Le Bureau du Peuple signale une activité suspecte. Rien à craindre, camarades.']); }
};
// pour que les chats puissent piocher l'actualite : 21-main lit SH.fallbackHook (voir plus bas)

/* ---- de nouveaux evenements : la frontiere, la mer, le commerce ---- */
const dipMood = (d: number) => { DIP.mood = clamp(DIP.mood + d, -100, 100); };
EVENTS.push(
  { side: 'both', title: 'Valises au checkpoint', text: 'Une famille de l’autre camp attend au checkpoint, valises à la patte, et demande à passer.',
    a: ['Les accueillir', (E) => { DIP.popAdj[E.side] += 3; dipMood(-6); E.me.ron += 6; }], b: ['Les renvoyer poliment', () => { dipMood(5); }] },
  { side: 'both', title: 'Brouillard sur le Rideau', text: 'Un pan du Rideau de Laine s’effiloche dans le brouillard. Des ombres passent dans les deux sens.',
    a: ['Retricoter tout de suite', (E) => { E.me.laine -= 30; }], b: ['Laisser filer', (E) => { DIP.popAdj[E.side] -= 2; DIP.popAdj[GAME.rival] += 2; }] },
  { side: 'both', title: 'Banc de sardines', text: 'Un banc de sardines grand comme l’île passe au large. Les pêcheurs trépignent.',
    a: ['Tous les chalutiers dehors', (E) => { E.me.croq += 80; E.me.laine -= 10; }], b: ['Les laisser passer', (E) => { E.me.ron += 6; }] },
  { side: 'both', title: 'Cargo en détresse', text: 'Un cargo des nations amies s’est échoué près de la côte. Son équipage agite des drapeaux.',
    a: ['Le secourir', (E) => { E.me.x.coins += 60; E.me.croq -= 20; E.me.ron += 8; }], b: ['Récupérer la cargaison', (E) => { E.me.laine += 45; dipMood(-8); }] },
  { side: 'usc', title: 'Foire commerciale', text: 'Une foire de l’Ouest veut ses stands sur notre port : réfrigérateurs, juke-box et cadillattes.',
    a: ['Vitrine de l’Ouest', (E) => { E.me.x.coins += 80; E.me.laine -= 30; }], b: ['Rester discrets', (E) => { E.me.ron += 5; }] },
  { side: 'ccp', title: 'Plan d’exportation', text: 'Le Comité veut exporter des pelotes vers la République des Harengs, pour des Catcoins.',
    a: ['Exporter la laine', (E) => { E.me.laine -= 50; E.me.x.coins += 90; }], b: ['Garder tout pour le Plan', (E) => { E.me.ron += 10; }] },
  { side: 'both', title: 'Ballon au-dessus de la ville', text: 'Un ballon-sonde de l’autre camp dérive au-dessus des toits. Il a une drôle d’antenne.',
    a: ['L’abattre', (E) => { E.me.ron += 10; dipMood(-10); }], b: ['Le laisser passer', () => { dipMood(5); }] },
  { side: 'both', title: 'Marché noir', text: 'Des contrebandiers proposent du pâté sous le manteau, à la sortie du port.',
    a: ['Acheter quand même', (E) => { E.me.x.coins -= 40; E.me.x.pate += 20; }], b: ['Les dénoncer', (E) => { E.me.ron += 8; }] },
  { side: 'both', title: 'Tempête en mer', text: 'La mer se lève. Les chalutiers restent à quai, sauf les plus fous.',
    a: ['Attendre au port', (E) => { E.me.croq -= 30; }], b: ['Sortir quand même', (E) => { E.me.croq += 20; E.me.ron -= 15; }] },
  { side: 'both', title: 'Troc au pont des échanges', text: 'L’autre camp propose d’échanger des pelotes contre des croquettes, au milieu du pont.',
    a: ['Accepter le troc', (E) => { E.me.laine -= 40; E.me.croq += 60; dipMood(6); }], b: ['Refuser', () => { dipMood(-4); }] },
);
