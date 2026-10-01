import { SH, type Building, type Side } from './00-shared.ts';
import { GAME, HOOKS, M, SIDES, boxS, clamp, fput, line3, prj } from './01-core.ts';
import { part } from './03-buildings-base.ts';
import { TYPES } from './04-types.ts';
import { drawCyl } from './06-types-more.ts';
import { FOOT } from './10-town.ts';
import { $, ICONS, ico, toast } from './13-ui.ts';
import { ECO, RES, TALLY, bdef, type XRes } from './15-economy.ts';
import { launchBoat, offshoreFrom, pierEnd } from './16-boats.ts';
import { UNITS, UNIT_DEF } from './26-unites.ts';
import { isCity } from './25-villes.ts';
/* ================= etape 11 : le commerce et la diplomatie ================= */
// Le Rideau de Laine est aussi l'endroit ou l'on parle a l'ennemi : checkpoint, ambassade, points de passage.
// Ecran P (pourparlers) : l'humeur de l'autre camp, les traites (accord commercial, treve, ouverture des frontieres, paix)
// qu'il accepte ou refuse apres reflexion en disant pourquoi, le marche du checkpoint en Catcoins, le commerce au large par
// le port avec les nations amies, les habitants qui passent d'un camp a l'autre, la capitulation.

/* ---- les traites ---- */
export type TreatyKind = 'commerce' | 'treve' | 'frontieres' | 'paix';
export const TREATY_NAME: Record<TreatyKind, string> = { commerce: 'Accord commercial', treve: 'Trêve', frontieres: 'Ouverture des frontières', paix: 'Traité de paix' };
const TREATY_DESC: Record<TreatyKind, string> = {
  commerce: 'Des Catcoins pour les deux camps chaque minute, et le marché du checkpoint ouvert.',
  treve: 'Cinq minutes sans combat. Une attaque la rompt, et l’autre camp s’en souvient.',
  frontieres: 'Les habitants passent librement d’un camp à l’autre, deux fois plus nombreux.',
  paix: 'Plus de combat du tout. Il faut une vraie confiance.',
};
interface Pending { kind: TreatyKind | 'capitulation'; from: Side; t0: number; due: number }
export const DIP = {
  mood: -20,                      // humeur de l'autre camp envers le joueur, de -100 a 100
  lastHostile: -999,              // derniere attaque du joueur
  treaties: {} as Partial<Record<TreatyKind, number>>,   // fin (temps de jeu), Infinity pour toujours
  pending: [] as Pending[],
  offer: null as Pending | null,  // proposition de l'autre camp au joueur
  popAdj: { usc: 0, ccp: 0 } as Record<Side, number>,
  fled: { usc: 0, ccp: 0 } as Record<Side, number>,
  capitulated: null as Side | null,
  lastAnswer: null as null | { kind: string; ok: boolean; why: string; t: number },
};
SH.DIP = DIP;
export const treatyOn = (k: TreatyKind): boolean => (DIP.treaties[k] || 0) > GAME.t;
SH.atPeace = (a: Side, b: Side): boolean => a !== b && (treatyOn('treve') || treatyOn('paix'));
SH.breakPeace = (by: Side) => {
  if (!treatyOn('treve') && !treatyOn('paix')) return;
  delete DIP.treaties.treve; delete DIP.treaties.paix;
  if (by === GAME.side){ DIP.mood = clamp(DIP.mood - 45, -100, 100); toast('Nous rompons la trêve. L’autre camp ne l’oubliera pas.'); }
  else toast('L’autre camp rompt la trêve !');
  say(by === GAME.side ? 'Trahison ! Le camp d’en face a rompu la trêve.' : 'La trêve est rompue.');
};
SH.onHostile = (by: Side, victim: Side, w: number) => {
  if (by !== GAME.side || victim === by) return;
  DIP.mood = clamp(DIP.mood - w * .4, -100, 100); DIP.lastHostile = GAME.t;
};
SH.popAdj = (side: Side): number => DIP.popAdj[side];
const other = (s: Side): Side => s === 'usc' ? 'ccp' : 'usc';
const radioOf = (s: Side): [string, string] => s === 'ccp' ? ['ccp', 'Radio Miaou-Scou'] : ['usc', 'Radio Kutty Libre'];
function say(txt: string, side?: Side){ const r = side ? radioOf(side) : ['neutre', 'Radio du port']; SH.radioQueue.unshift([r[0], r[1], txt]); }

/* ---- la force de chaque camp, pour juger ---- */
export function strength(side: Side): number {
  let s = 0;
  for (const u of UNITS){ if (u.side !== side || u.dead) continue; const d = UNIT_DEF[u.kind]; if (d) s += u.hp * (d.atk + 1) / 20; }
  for (const l of SH.BLD as Building[]){ if (l.side !== side || !l.done) continue; if (isCity(l)) s += 60; if (SH.DEF && SH.DEF[l.type]) s += 25; }
  return s + RES[side].pop * .5;
}
export function wellbeing(side: Side): number {
  const R = RES[side], pop = Math.max(1, R.pop);
  return R.rr / pop * 6 + R.funRatio * 2 + R.eauCov + (R.short ? -2 : 0) + (R.x.pate > .5 ? .5 : 0) + (R.x.herbe > .5 ? .5 : 0);
}
const hasNear = (side: Side, type: string) => (SH.BLD as Building[]).some(l => l.side === side && l.type === type && l.done);
const canTalk = (): boolean => (SH.BLD as Building[]).some(l => (l.type === 'checkpoint' || l.type === 'ambassade') && l.done);

/* ---- proposer un traite : l'autre camp reflechit, puis repond en disant pourquoi ---- */
export function propose(kind: TreatyKind | 'capitulation'): string {
  if (DIP.capitulated) return 'La guerre est finie.';
  if (!canTalk()) return 'Il faut un checkpoint ou une ambassade au bord du Rideau pour parler à l’autre camp.';
  if (DIP.pending.some(p => p.kind === kind)) return 'Cette proposition attend déjà sa réponse.';
  if (kind !== 'capitulation' && treatyOn(kind)) return 'Ce traité est déjà en vigueur.';
  const delay = 30 + Math.random() * 30;
  DIP.pending.push({ kind, from: GAME.side, t0: GAME.t, due: GAME.t + delay });
  return '';
}
// la reponse de l'autre camp : oui, ou non et pourquoi
function judge(kind: TreatyKind | 'capitulation'): string {
  const me = GAME.side, ai = other(me), mood = DIP.mood, recent = GAME.t - DIP.lastHostile, ratio = strength(ai) / Math.max(1, strength(me));
  const ccp = ai === 'ccp';
  switch (kind){
    case 'commerce':
      if (recent < 120) return ccp ? 'Vos troupes viennent de nous attaquer. Le Bureau du Peuple ne commerce pas sous les bombes.' : 'Vous venez de nous attaquer. Les marchands de l’USC ne signent pas avec l’agresseur.';
      if (mood < -40) return ccp ? 'Le Plan prévoit l’autosuffisance. Revenez quand vous serez plus aimables.' : 'Notre opinion publique ne veut pas entendre parler de vous.';
      return '';
    case 'treve':
      if (ratio > 1.4 && mood < 0) return ccp ? 'Pourquoi une trêve ? La victoire du Peuple est proche.' : 'Pourquoi une trêve ? Nous gagnons.';
      if (recent < 30) return 'Les combats sont trop chauds : attendez un peu.';
      return '';
    case 'frontieres':
      if (mood < 20) return 'Ouvrir nos frontières ? Nous ne vous faisons pas assez confiance.';
      if (wellbeing(ai) < wellbeing(me) - .4) return ccp ? 'Nos habitants sont parfaitement heureux. Inutile de leur montrer autre chose.' : 'Nos habitants n’ont pas besoin de partir chez vous, merci.';
      return '';
    case 'paix':
      if (mood < 40) return 'La paix se mérite. Commencez par commercer, et cessez les provocations.';
      if (recent < 300) return 'Vous nous avez attaqués il y a trop peu de temps.';
      return '';
    case 'capitulation': {
      if (SH.winEnabled && !SH.winEnabled('militaire')) return 'La victoire militaire n’est pas au programme de cette partie.';
      const cities = (SH.BLD as Building[]).filter(l => l.side === ai && isCity(l) && l.done).length;
      if (ratio < .25 || cities === 0 || (RES[ai].pop < RES[me].pop * .25 && ratio < .6)) return '';
      return ccp ? 'Capituler ? Le Peuple n’a jamais capitulé.' : 'Capituler ? L’USC ne capitule jamais.';
    }
  }
  return '';
}
function apply(kind: TreatyKind){
  DIP.treaties[kind] = kind === 'treve' ? GAME.t + 300 : Infinity;
  if (kind === 'paix') DIP.treaties.treve = Infinity;
  DIP.mood = clamp(DIP.mood + 10, -100, 100);
  say('Signature au checkpoint : ' + TREATY_NAME[kind].toLowerCase() + ' entre l’USC et la CCR.');
  if (SH.logDay){ for (const s of SIDES) SH.logDay(s, 'treaty', TREATY_NAME[kind]); }
}
let dipAcc = 0, offerAcc = 0;
HOOKS.step.push((dt: number) => {
  if (GAME.mode !== 'play' || dt <= 0) return;
  // reponses aux propositions du joueur
  for (let k = DIP.pending.length - 1; k >= 0; k--){
    const p = DIP.pending[k]; if (GAME.t < p.due) continue;
    DIP.pending.splice(k, 1);
    const why = judge(p.kind), nm = p.kind === 'capitulation' ? 'la capitulation' : TREATY_NAME[p.kind].toLowerCase();
    if (why){ toast('Refusé : ' + why); DIP.lastAnswer = { kind: p.kind, ok: false, why, t: GAME.t }; }
    else if (p.kind === 'capitulation'){ capitulate(other(GAME.side)); }
    else { apply(p.kind); toast('Accepté : ' + nm + '.'); DIP.lastAnswer = { kind: p.kind, ok: true, why: '', t: GAME.t }; }
    renderDipSoon();
  }
  dipAcc += dt; if (dipAcc < 1) return; const k = dipAcc / 60; dipAcc = 0;
  // l'humeur revient doucement vers zero ; le commerce la rechauffe
  DIP.mood = clamp(DIP.mood + (DIP.mood < 0 ? 1 : -.3) * k * 2 + (treatyOn('commerce') ? .5 * k * 2 : 0), -100, 100);
  if (DIP.treaties.treve && !treatyOn('treve') && DIP.treaties.treve !== Infinity){ delete DIP.treaties.treve; toast('La trêve est terminée.'); }
  // l'autre camp propose de temps en temps
  offerAcc += k * 60;
  if (offerAcc > 240 && !DIP.offer && canTalk()){
    offerAcc = 0;
    const ai = other(GAME.side), ratio = strength(ai) / Math.max(1, strength(GAME.side));
    const kind: TreatyKind | null = (GAME.t - DIP.lastHostile < 200 && ratio < .7 && !treatyOn('treve')) ? 'treve' : (!treatyOn('commerce') && DIP.mood > -10) ? 'commerce' : (DIP.mood > 50 && !treatyOn('paix')) ? 'paix' : null;
    if (kind){ DIP.offer = { kind, from: ai, t0: GAME.t, due: GAME.t + 120 }; toast('L’autre camp propose : ' + TREATY_NAME[kind].toLowerCase() + '. Écran P pour répondre.'); renderDipSoon(); }
  }
  if (DIP.offer && GAME.t > DIP.offer.due){ DIP.offer = null; DIP.mood = clamp(DIP.mood - 5, -100, 100); renderDipSoon(); }
  $('btnDip').classList.toggle('alert', !!DIP.offer);
});
// le commerce rapporte des Catcoins aux deux camps
TALLY.push((side, _add, addX) => { if (treatyOn('commerce')) addX('coins', 4 + RES[side].pop * .02, 'Accord commercial'); });

/* ---- capituler ---- */
export function capitulate(loser: Side){
  if (DIP.capitulated) return;
  DIP.capitulated = loser;
  say((loser === 'ccp' ? 'La CCR' : 'L’USC') + ' capitule. La guerre froide est finie.');
  toast((loser === GAME.side ? 'Nous capitulons.' : 'L’autre camp capitule !'));
  if (SH.onCapitulate) SH.onCapitulate(loser);
}

/* ---- le marche du checkpoint (en Catcoins) et le commerce au large (par le port) ---- */
type Good = 'croq' | 'laine' | 'ron' | XRes;
const GOOD_NAME: Record<string, string> = { croq: 'croquettes', laine: 'laine', ron: 'ronrons', pate: 'pâté', tricot: 'tricot', charbon: 'charbon', petrole: 'pétrole', uranium: 'uranium', herbe: 'herbe à chat' };
const GOOD_ICO: Record<string, string> = { croq: 'croq', laine: 'laine', ron: 'ron', pate: 'pate', tricot: 'tricot', charbon: 'charbon', petrole: 'petrole', herbe: 'herbe' };
// prix de 10 unites, en Catcoins
const PRICE: Record<string, number> = { croq: 4, laine: 5, ron: 8, pate: 12, tricot: 14, charbon: 6, petrole: 10, herbe: 9 };
const stock = (side: Side, g: Good): number => { const R = RES[side]; return g === 'croq' ? R.croq : g === 'laine' ? R.laine : g === 'ron' ? R.ron : R.x[g as XRes]; };
const addGood = (side: Side, g: Good, v: number) => { const R = RES[side]; if (g === 'croq') R.croq += v; else if (g === 'laine') R.laine += v; else if (g === 'ron') R.ron += v; else R.x[g as XRes] += v; };
export function trade(side: Side, g: Good, buy: boolean, where: 'checkpoint' | 'large'): string {
  const R = RES[side], n = 10, bridge = hasNear(side, 'pontech') ? .85 : 1;
  const unit = where === 'checkpoint' ? PRICE[g] * (buy ? 1.3 * bridge : 1 / bridge) : PRICE[g] * (buy ? 1.6 : .7);
  const coins = Math.round(unit);
  if (buy){ if (R.x.coins < coins) return 'Il faut ' + coins + ' Catcoins.'; R.x.coins -= coins; addGood(side, g, n); if (where === 'checkpoint') addGood(other(side), g, -Math.min(n, stock(other(side), g))); }
  else { if (stock(side, g) < n) return 'Il faut ' + n + ' ' + GOOD_NAME[g] + '.'; addGood(side, g, -n); R.x.coins += coins; }
  if (where === 'checkpoint') RES[other(side)].x.coins += Math.round(coins * .2);
  return '';
}
const ALLIES: Record<Side, string> = { usc: 'les Îles de la Truite', ccp: 'la République des Harengs' };
let cargoT = -99;
function cargoArrives(side: Side){
  if (GAME.t - cargoT < 30) return; cargoT = GAME.t;
  const port = (SH.BLD as Building[]).find(l => l.side === side && l.type === 'port' && l.done); if (!port) return;
  const e = pierEnd(port), off = offshoreFrom(e[0], e[1]);
  const b = launchBoat('cargo', side, off, e); if (b) b.onArrive = (bb) => { bb.state = 'gone'; };
}
export function immigrate(side: Side): string {
  const R = RES[side]; if (R.x.coins < 40) return 'Il faut 40 Catcoins.';
  R.x.coins -= 40; DIP.popAdj[side] += 3; return '';
}

/* ---- les habitants qui passent d'un camp a l'autre, a travers le Rideau ---- */
let fleeAcc = 0;
HOOKS.step.push((dt: number) => {
  if (GAME.mode !== 'play' || dt <= 0 || DIP.capitulated) return;
  fleeAcc += dt; if (fleeAcc < 30) return; fleeAcc = 0;
  const wu = wellbeing('usc'), wc = wellbeing('ccp'), diff = wu - wc;
  if (Math.abs(diff) < .3) return;
  const from: Side = diff > 0 ? 'ccp' : 'usc', to = other(from), R = RES[from];
  if (R.pop < 12 || DIP.popAdj[from] < -R.pop * .4) return;
  let f = clamp(Math.abs(diff), .3, 2);
  const walls = (SH.WALLS as { side: Side }[]).some(w => w.side === from);
  if (walls && !hasNear(to, 'tunnelev')) f *= .3;
  if (hasNear(from, 'mirador')) f *= .5;
  if (hasNear(to, 'hautparleurs')) f *= 1.5;
  if (treatyOn('frontieres')) f *= 2;
  const n = Math.round(f * 2); if (n < 1) return;
  DIP.popAdj[from] -= n; DIP.popAdj[to] += n; DIP.fled[from] += n;
  if (SH.logDay) SH.logDay(to, 'flee', String(n));
  if (from === GAME.side) toast(n + ' habitant' + (n > 1 ? 's passent' : ' passe') + ' chez l’autre camp, où l’on vit mieux.');
  else toast(n + ' habitant' + (n > 1 ? 's de l’autre camp nous rejoignent.' : ' de l’autre camp nous rejoint.'));
  if (Math.random() < .4) say(from === 'ccp' ? 'Encore des chats de la CCR passés à l’Ouest. Le Bureau du Peuple parle de touristes égarés.' : 'Des chats de l’USC rejoignent le Peuple. Ils disent préférer la soupe au kolkhoze.', to);
});

/* ---- l'ambassade et les points de passage, au bord du Rideau ---- */
const nearWall = (ca: number, cb: number) => (SH.WALLS as { pa: number; pb: number; qa: number; qb: number }[]).some(w => Math.hypot((w.pa + w.qa) / 2 - ca, (w.pb + w.qb) / 2 - cb) < 45);
HOOKS.place.push((type: string, _side: Side, ca: number, cb: number): string => {
  if (['ambassade', 'mirador', 'hautparleurs', 'pontech', 'tunnelev'].includes(type) && !nearWall(ca, cb)) return 'Il se pose au bord du Rideau de Laine.';
  return '';
});
const flag = (s: Side) => s === 'ccp' ? M.FLAG_RED : M.FLAG_BLUE;
Object.assign(TYPES, {
  ambassade: { name: 'Ambassade', nameCCP: 'Ambassade du Peuple', fem: true, build(lot: Building, seed: number){
    const ccp = lot.side === 'ccp';
    const body = () => { SH.CUR = ccp ? M.SANDSTONE : M.USC4; boxS(lot.ca - 8, lot.ca + 8, lot.cb - 6, lot.cb + 5, 0, 9, (u: number, h: number) => (h > 2 && h < 7 && (u % 3.2) < 1.2) ? 3 : (h > 8.2 ? 1 : 0), 1); for (const s of [-1, 1]){ SH.CUR = M.METAL; line3(lot.ca + s * 6, lot.cb + 6, 0, lot.ca + s * 6, lot.cb + 6, 14, 1); SH.CUR = s < 0 ? M.FLAG_BLUE : M.FLAG_RED; const p = prj(lot.ca + s * 6, lot.cb + 6, 14); for (let y = 0; y < 3; y++) for (let x = 1; x <= 4; x++) fput(Math.round(p[0]) + x, Math.round(p[1]) + y, 0); } };
    void seed; return { parts: [part(lot.ca, lot.cb, 0, body)], lights: [] };
  } },
  mirador: { name: 'Mirador', nameCCP: 'Mirador du Peuple', fem: false, build(lot: Building, seed: number){
    const body = (t: number) => { SH.CUR = M.PIER; for (const [da, db] of [[-2, -2], [2, -2], [2, 2], [-2, 2]]) line3(lot.ca + da, lot.cb + db, 0, lot.ca + da * .6, lot.cb + db * .6, 14, 1); boxS(lot.ca - 3, lot.ca + 3, lot.cb - 3, lot.cb + 3, 14, 17, (_u: number, h: number) => h > .8 && h < 2 ? 3 : 0, 1); SH.CUR = M.BEAM; const an = t * 1.2 + lot.id, p = prj(lot.ca + Math.cos(an) * 8, lot.cb + Math.sin(an) * 8, 0); fput(Math.round(p[0]), Math.round(p[1]), 1); };
    void seed; return { parts: [part(lot.ca, lot.cb, 0, body)], lights: [] };
  } },
  hautparleurs: { name: 'Haut-parleurs', nameCCP: 'Haut-parleurs du Peuple', fem: false, build(lot: Building, seed: number){
    const body = (t: number) => { SH.CUR = M.METAL; line3(lot.ca, lot.cb, 0, lot.ca, lot.cb, 16, 1); for (const s of [-1, 1]){ boxS(lot.ca + s * 2 - 1.2, lot.ca + s * 2 + 1.2, lot.cb - 1.2, lot.cb + 1.2, 13, 15.5, 0, 1); } if (((t * 2) | 0) % 2){ SH.CUR = flag(lot.side); const p = prj(lot.ca, lot.cb - 4, 15); for (let k = 0; k < 3; k++) fput(Math.round(p[0]) + k * 2 - 2, Math.round(p[1]) - k, 1); } };
    void seed; return { parts: [part(lot.ca, lot.cb, 0, body)], lights: [] };
  } },
  pontech: { name: 'Pont des échanges', nameCCP: 'Pont des échanges du Peuple', fem: false, build(lot: Building, seed: number){
    const body = () => { SH.CUR = M.GIRDER; for (let k = -8; k <= 8; k += 4) line3(lot.ca + k, lot.cb - 4, 0, lot.ca + k, lot.cb - 4, 6, 1); line3(lot.ca - 9, lot.cb - 4, 6, lot.ca + 9, lot.cb - 4, 6, 1); line3(lot.ca - 9, lot.cb + 4, 6, lot.ca + 9, lot.cb + 4, 6, 1); SH.CUR = M.ROAD; boxS(lot.ca - 9, lot.ca + 9, lot.cb - 4, lot.cb + 4, 0, .6, 0, 1); SH.CUR = M.ICON_Y; for (let k = -8; k <= 8; k += 2){ const p = prj(lot.ca + k, lot.cb, .7); fput(Math.round(p[0]), Math.round(p[1]), 1); } };
    void seed; return { parts: [part(lot.ca, lot.cb, 0, body)], lights: [] };
  } },
  tunnelev: { name: 'Tunnel d’évasion', nameCCP: 'Tunnel du Peuple', fem: false, build(lot: Building, seed: number){
    const body = () => { SH.CUR = M.DIRT; drawCyl(lot.ca, lot.cb, 0, 4, 1, true); SH.CUR = M.CAT_BLACK; drawCyl(lot.ca, lot.cb, .9, 2.4, .2, true); SH.CUR = M.PIER; line3(lot.ca - 4, lot.cb + 4, 0, lot.ca - 4, lot.cb + 4, 4, 1); };
    void seed; return { parts: [part(lot.ca, lot.cb, 0, body)], lights: [] };
  } },
});
Object.assign(ECO, {
  ambassade: bdef('frontiere', 60, { costR: 20, r: 1, rad: 30, noRoad: true, desc: 'Au bord du Rideau : on y parle à l’autre camp (traités, écran P).' }),
  mirador: bdef('frontiere', 25, { rad: 26, noRoad: true, desc: 'Au bord du Rideau : moitié moins de nos habitants s’enfuient.' }),
  hautparleurs: bdef('frontiere', 30, { costR: 10, rad: 26, noRoad: true, desc: 'Au bord du Rideau : la propagande attire les habitants d’en face.' }),
  pontech: bdef('frontiere', 50, { costR: 15, rad: 30, noRoad: true, desc: 'Au bord du Rideau : de meilleurs prix au marché du checkpoint.' }),
  tunnelev: bdef('frontiere', 30, { rad: 20, noRoad: true, desc: 'Sous le Rideau : le mur d’en face ne retient plus ceux qui veulent nous rejoindre.' }),
});
Object.assign(FOOT, { ambassade: [20, 16], mirador: [10, 10], hautparleurs: [10, 10], pontech: [22, 12], tunnelev: [10, 10] });

/* ---- l'ecran des pourparlers (P) ---- */
Object.assign(ICONS, {
  paix: [['............', '...kk.......', '..kwwk......', '.kwwwwk..kk.', '.kwkwwwkkwwk', 'kwwwwwwwwwk.', '.kwwwwwwwk..', '..kwwwwwk...', '...kkgkk....', '....kgg.....', '.....kg.....', '............'], { k: '#2a2a2e', w: '#f4f1e8', g: '#5aa469' }],
});
const btnDip = $('btnDip'); { const di = btnDip.querySelector('.dip-ico'); if (di) di.innerHTML = ico('paix'); }
const MOOD_TXT = (m: number) => m < -60 ? 'glaciale' : m < -20 ? 'froide' : m < 20 ? 'tiède' : m < 60 ? 'cordiale' : 'chaleureuse';
let dipSoon = false;
function renderDipSoon(){ if (!dipSoon){ dipSoon = true; setTimeout(() => { dipSoon = false; if (!$('dip').hidden) renderDip(); }, 50); } }
export function renderDip(){
  const el = $('dip'), me = GAME.side, ai = other(me), R = RES[me];
  const talk = canTalk(), port = hasNear(me, 'port'), cp = hasNear(me, 'checkpoint');
  let h = '<div class="sci-head"><b>Pourparlers</b><span>Humeur de l’autre camp : <b>' + MOOD_TXT(DIP.mood) + '</b> (' + Math.round(DIP.mood) + '). ' + Math.floor(R.x.coins) + ' Catcoins.</span><button class="btn k" type="button" id="dipClose" aria-label="Fermer">×</button></div>';
  h += '<div class="dip-grid">';
  // traites
  h += '<section class="dip-box"><h3>Traités</h3>';
  if (!talk) h += '<p class="sel-note">Pour parler à l’autre camp, il faut un checkpoint ou une ambassade au bord du Rideau de Laine.</p>';
  if (DIP.offer){ const o = DIP.offer; h += '<div class="dip-offer"><b>L’autre camp propose : ' + (o.kind === 'capitulation' ? 'la capitulation' : TREATY_NAME[o.kind]) + '</b><div><button class="btn" type="button" data-dip="oui">Accepter</button><button class="btn" type="button" data-dip="non">Refuser</button></div></div>'; }
  for (const k of Object.keys(TREATY_NAME) as TreatyKind[]){
    const on = treatyOn(k), pend = DIP.pending.some(p => p.kind === k), left = on && DIP.treaties[k] !== Infinity ? Math.ceil(((DIP.treaties[k] || 0) - GAME.t) / 60) + ' min' : '';
    h += '<div class="dip-row"><span><b>' + TREATY_NAME[k] + '</b><small>' + TREATY_DESC[k] + '</small></span>' + (on ? '<i class="dip-on">En vigueur' + (left ? ', ' + left : '') + '</i>' : pend ? '<i>Réponse attendue…</i>' : '<button class="btn" type="button" data-prop="' + k + '"' + (talk ? '' : ' disabled') + '>Proposer</button>') + '</div>';
  }
  const la = DIP.lastAnswer; if (la && GAME.t - la.t < 120) h += '<p class="sel-note">' + (la.ok ? 'Dernière réponse : oui.' : 'Dernière réponse : non. « ' + la.why + ' »') + '</p>';
  h += '</section>';
  // marche du checkpoint
  h += '<section class="dip-box"><h3>Marché du checkpoint</h3>';
  if (!cp || !treatyOn('commerce')) h += '<p class="sel-note">' + (!cp ? 'Il faut ton propre checkpoint.' : 'Il faut un accord commercial.') + '</p>';
  else for (const g of ['croq', 'laine', 'ron', 'pate', 'tricot', 'charbon', 'petrole'] as Good[]) h += goodRow(g, 'checkpoint');
  h += '</section>';
  // au large
  h += '<section class="dip-box"><h3>Au large : ' + ALLIES[me] + '</h3>';
  if (!port) h += '<p class="sel-note">Il faut un port pour commercer avec les nations amies.</p>';
  else { for (const g of ['croq', 'laine', 'pate', 'tricot', 'charbon', 'petrole'] as Good[]) h += goodRow(g, 'large'); h += '<div class="dip-row"><span><b>Accueillir des habitants</b><small>Trois chats venus du large, pour 40 Catcoins.</small></span><button class="btn" type="button" data-imm="1">Accueillir</button></div>'; }
  h += '</section>';
  // habitants et fin de guerre
  h += '<section class="dip-box"><h3>Habitants et fin de la guerre</h3><p class="sel-note">Bien-être : nous ' + wellbeing(me).toFixed(1).replace('.', ',') + ', eux ' + wellbeing(ai).toFixed(1).replace('.', ',') + '. Partis de chez nous : ' + DIP.fled[me] + ' ; venus de chez eux : ' + DIP.fled[ai] + '. Mirador, haut-parleurs, tunnel d’évasion et pont des échanges se posent au bord du Rideau.</p>';
  h += '<div class="dip-row"><span><b>Exiger la capitulation</b><small>Elle n’est acceptée que par un camp à bout de forces.</small></span><button class="btn" type="button" data-prop="capitulation"' + (talk && !DIP.pending.some(p => p.kind === 'capitulation') ? '' : ' disabled') + '>Exiger</button></div>';
  h += '<div class="dip-row"><span><b>Capituler</b><small>La partie est perdue.</small></span><button class="btn danger" type="button" data-cap="1">Capituler</button></div></section>';
  el.innerHTML = h + '</div>';
  $('dipClose').addEventListener('click', () => toggleDip(false));
  for (const b of el.querySelectorAll('[data-prop]')) if (b instanceof HTMLElement) b.addEventListener('click', () => { const w = propose(b.dataset.prop as TreatyKind); toast(w || 'Proposition envoyée. L’autre camp réfléchit.'); SH.sfx('click'); renderDip(); });
  for (const b of el.querySelectorAll('[data-tr]')) if (b instanceof HTMLElement) b.addEventListener('click', () => { const [g, w, d] = (b.dataset.tr || '').split(':'); const why = trade(me, g as Good, d === 'buy', w as 'checkpoint' | 'large'); if (why) toast(why); else { SH.sfx('click'); if (w === 'large') cargoArrives(me); } renderDip(); SH.renderHUD(); });
  for (const b of el.querySelectorAll('[data-imm]')) if (b instanceof HTMLElement) b.addEventListener('click', () => { const why = immigrate(me); toast(why || 'Trois chats débarquent du large.'); if (!why) cargoArrives(me); renderDip(); });
  // capituler : un second clic pour confirmer
  for (const b of el.querySelectorAll('[data-cap]')) if (b instanceof HTMLElement) b.addEventListener('click', () => { if (b.dataset.cap === '2') capitulate(me); else { b.dataset.cap = '2'; b.textContent = 'Vraiment ?'; } });
  for (const b of el.querySelectorAll('[data-dip]')) if (b instanceof HTMLElement) b.addEventListener('click', () => { const o = DIP.offer; DIP.offer = null; if (!o || o.kind === 'capitulation') return; if (b.dataset.dip === 'oui'){ apply(o.kind); toast('Accepté : ' + TREATY_NAME[o.kind].toLowerCase() + '.'); } else { DIP.mood = clamp(DIP.mood - 8, -100, 100); toast('Refusé.'); } renderDip(); });
}
function goodRow(g: Good, where: 'checkpoint' | 'large'): string {
  const me = GAME.side, bridge = hasNear(me, 'pontech') ? .85 : 1;
  const sell = Math.round(where === 'checkpoint' ? PRICE[g] / bridge : PRICE[g] * .7), buy = Math.round(where === 'checkpoint' ? PRICE[g] * 1.3 * bridge : PRICE[g] * 1.6);
  return '<div class="dip-good"><span>' + ico(GOOD_ICO[g] || 'coins', GOOD_NAME[g]) + ' 10 ' + GOOD_NAME[g] + '</span><button class="btn" type="button" data-tr="' + g + ':' + where + ':sell">Vendre ' + sell + '</button><button class="btn" type="button" data-tr="' + g + ':' + where + ':buy">Acheter ' + buy + '</button></div>';
}
export function toggleDip(on?: boolean){ const el = $('dip'), show = on == null ? el.hidden : on; el.hidden = !show; btnDip.setAttribute('aria-pressed', String(show)); if (show){ $('sci').hidden = true; renderDip(); } }
btnDip.addEventListener('click', () => { toggleDip(); SH.sfx('click'); });
SH.KEYS = SH.KEYS || {};
SH.KEYS.p = () => toggleDip();
const prevEsc = SH.cardEscape;
SH.cardEscape = (): boolean => { if (!$('dip').hidden){ toggleDip(false); return true; } return typeof prevEsc === 'function' ? prevEsc() : false; };
setInterval(() => { if (!$('dip').hidden && GAME.mode === 'play') renderDip(); }, 3000);

/* ---- sauvegarde ---- */
HOOKS.save.push((ext) => { ext.dip = { m: Math.round(DIP.mood), tr: Object.fromEntries(Object.entries(DIP.treaties).map(([k, v]) => [k, v === Infinity ? -1 : Math.round((v || 0) - GAME.t)])), pa: [DIP.popAdj.usc, DIP.popAdj.ccp], fl: [DIP.fled.usc, DIP.fled.ccp], cap: DIP.capitulated || '' }; });
HOOKS.load.push((ext) => {
  resetDip();
  const d = ext.dip; if (!d || typeof d !== 'object') return;
  const o = d as { m?: unknown; tr?: unknown; pa?: unknown; fl?: unknown; cap?: unknown };
  DIP.mood = clamp(+(o.m as number) || -20, -100, 100);
  if (o.tr && typeof o.tr === 'object') for (const [k, v] of Object.entries(o.tr as Record<string, number>)) if (k in TREATY_NAME) DIP.treaties[k as TreatyKind] = v === -1 ? Infinity : GAME.t + (+v || 0);
  if (Array.isArray(o.pa)){ DIP.popAdj.usc = +o.pa[0] || 0; DIP.popAdj.ccp = +o.pa[1] || 0; }
  if (Array.isArray(o.fl)){ DIP.fled.usc = +o.fl[0] || 0; DIP.fled.ccp = +o.fl[1] || 0; }
  DIP.capitulated = o.cap === 'usc' || o.cap === 'ccp' ? o.cap : null;
});
function resetDip(){ Object.assign(DIP, { mood: -20, lastHostile: -999, treaties: {}, pending: [], offer: null, popAdj: { usc: 0, ccp: 0 }, fled: { usc: 0, ccp: 0 }, capitulated: null, lastAnswer: null }); }
HOOKS.reset.push(() => { resetDip(); toggleDip(false); });
