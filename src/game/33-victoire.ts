import { SH, type Building, type Side } from './00-shared.ts';
import { GAME, HOOKS, SIDES } from './01-core.ts';
import { terPct } from './08-territory.ts';
import { $, achieve } from './13-ui.ts';
import { RES, SPACE } from './15-economy.ts';
import { store } from './22-home.ts';
import { isCity } from './25-villes.ts';
import { TRAINS } from './27-transports.ts';
import { SCI } from './29-recherche.ts';
import { DIP, strength, treatyOn, wellbeing } from './32-diplomatie.ts';
/* ================= etape 12 : gagner, et les types de partie ================= */
// Cinq facons de gagner, chacune activable a la creation de la partie : militaire (aneantissement ou capitulation),
// scientifique (les cinq jalons), sociale (habitants nombreux et heureux), economique (richesse), de circonstance
// (territoire, ou une paix durable). Deux types de partie : Sans fin (jusqu'a une victoire) et Blitz (une duree choisie ;
// a la fin, le meilleur score gagne). Un clic sur le bloc du territoire ouvre la course aux victoires.

export type WinKind = 'militaire' | 'science' | 'sociale' | 'economie' | 'circonstance';
export const WIN_NAME: Record<WinKind, string> = { militaire: 'Militaire', science: 'Scientifique', sociale: 'Sociale', economie: 'Économique', circonstance: 'De circonstance' };
const WIN_DESC: Record<WinKind, string> = {
  militaire: 'Plus aucun hôtel de ville à l’autre camp, ou sa capitulation.',
  science: 'Réussir le premier les cinq jalons de la science.',
  sociale: 'Au moins 150 habitants, deux fois plus que l’autre camp, sans famine, pendant trois minutes.',
  economie: '4 000 Catcoins et une production une fois et demie celle de l’autre camp, pendant trois minutes.',
  circonstance: 'Tenir 70 % de l’île deux minutes, ou dix minutes de paix signée (le meilleur score l’emporte).',
};
export interface GameOpt { minutes: number; wins: Record<WinKind, boolean> }
const allWins = (): Record<WinKind, boolean> => ({ militaire: true, science: true, sociale: true, economie: true, circonstance: true });
export const OPT: GameOpt = { minutes: 0, wins: allWins() };
SH.GAMEOPT = OPT;
SH.winEnabled = (k: WinKind): boolean => OPT.wins[k];

/* ---- le formulaire de nouvelle partie ---- */
const KEY = 'ckt-victoires';
let pick: GameOpt = { minutes: 0, wins: allWins() };
{ const v = store.get(KEY, {}); if (v && typeof v === 'object'){ const o = v as { minutes?: unknown; wins?: unknown }; if (typeof o.minutes === 'number') pick.minutes = o.minutes; if (o.wins && typeof o.wins === 'object') for (const k of Object.keys(WIN_NAME) as WinKind[]){ const w = (o.wins as Record<string, unknown>)[k]; if (typeof w === 'boolean') pick.wins[k] = w; } } }
function markForm(){
  for (const b of $('newType').children) if (b instanceof HTMLElement) b.setAttribute('aria-checked', String(+(b.dataset.v || 0) === pick.minutes));
  for (const c of $('newWins').querySelectorAll('input')) if (c instanceof HTMLInputElement) c.checked = pick.wins[c.dataset.w as WinKind] !== false;
  $('newTypeNote').textContent = pick.minutes ? 'Blitz : la partie dure ' + pick.minutes + ' minutes de jeu ; à la fin, le meilleur score gagne, sauf victoire avant.' : 'Sans fin : la partie dure jusqu’à une victoire.';
}
for (const b of $('newType').children) if (b instanceof HTMLElement) b.addEventListener('click', () => { pick.minutes = +(b.dataset.v || 0); store.set(KEY, pick); markForm(); SH.sfx('click'); });
for (const c of $('newWins').querySelectorAll('input')) if (c instanceof HTMLInputElement) c.addEventListener('change', () => { pick.wins[c.dataset.w as WinKind] = c.checked; if (!Object.values(pick.wins).some(Boolean)){ c.checked = true; pick.wins[c.dataset.w as WinKind] = true; } store.set(KEY, pick); markForm(); });
markForm();
document.querySelectorAll('.hm[data-page="new"]').forEach(b => b.addEventListener('click', markForm));

/* ---- le score (Blitz, et la paix) ---- */
export function score(side: Side): number {
  const R = RES[side];
  const cities = (SH.BLD as Building[]).filter(l => l.side === side && l.done && isCity(l)).length;
  return Math.round(terPct(side) * 1000 + R.pop * 3 + SCI[side].done.size * 30 + SPACE[side].stage * 150 + R.x.coins / 10 + (R.rc + R.rl + R.rr) * 2 + cities * 80 + strength(side) * .3);
}
SH.score = score;

/* ---- la progression de chaque victoire, pour chaque camp (0 a 1) ---- */
const other = (s: Side): Side => s === 'usc' ? 'ccp' : 'usc';
const maxCities: Record<Side, number> = { usc: 0, ccp: 0 };
const cityCount = (s: Side) => (SH.BLD as Building[]).filter(l => l.side === s && l.done && isCity(l)).length;
export function progress(k: WinKind, s: Side): number {
  const o = other(s), R = RES[s], Ro = RES[o];
  switch (k){
    case 'militaire': return maxCities[o] ? 1 - cityCount(o) / maxCities[o] : 0;
    case 'science': return SPACE[s].stage / 5;
    case 'sociale': return R.short ? 0 : Math.min(1, R.pop / Math.max(150, Ro.pop * 2));
    case 'economie': { const pr = Math.max(0, R.rc + R.rl + R.rr), po = Math.max(1, Ro.rc + Ro.rl + Ro.rr); return Math.min(1, R.x.coins / 4000, pr / po / 1.5); }
    case 'circonstance': return Math.max(Math.min(1, terPct(s) / .7), treatyOn('paix') ? Math.min(1, (GAME.t - (PEACE_T ?? GAME.t)) / 600) : 0);
  }
}
const HOLD_NEED: Record<WinKind, number> = { militaire: 0, science: 0, sociale: 180, economie: 180, circonstance: 120 };
const HOLD: Record<WinKind, Record<Side, number | null>> = { militaire: { usc: null, ccp: null }, science: { usc: null, ccp: null }, sociale: { usc: null, ccp: null }, economie: { usc: null, ccp: null }, circonstance: { usc: null, ccp: null } };
let PEACE_T: number | null = null;

/* ---- fin de partie ---- */
function win(s: Side, k: WinKind | 'blitz', how: string){
  if (GAME.winner) return;
  const me = GAME.side, mine = s === me, camp = s === 'ccp' ? 'La CCR' : 'L’USC';
  const title = (mine ? 'Victoire ' : 'Défaite : victoire ') + (k === 'blitz' ? 'au score' : WIN_NAME[k].toLowerCase()) + (mine ? '' : ' de l’autre camp');
  SH.endGame(s, title.charAt(0).toUpperCase() + title.slice(1), camp + ' ' + how);
  if (mine){
    achieve(k === 'militaire' ? 'V_MILITAIRE' : k === 'science' ? 'V_SCIENCE' : k === 'sociale' ? 'V_SOCIALE' : k === 'economie' ? 'V_ECONOMIE' : k === 'circonstance' ? 'V_CIRCONSTANCE' : 'VICTOIRE');
    if (OPT.minutes) achieve('BLITZ');
  }
}
SH.onCapitulate = (loser: Side) => { if (OPT.wins.militaire) win(other(loser), 'militaire', 'gagne : l’autre camp a capitulé.'); };
SH.checkWin = () => {
  if (GAME.mode !== 'play' || GAME.winner) return;
  if (GAME.t < 90) return;
  for (const s of SIDES) maxCities[s] = Math.max(maxCities[s], cityCount(s));
  if (treatyOn('paix')){ if (PEACE_T == null) PEACE_T = GAME.t; } else PEACE_T = null;
  for (const k of Object.keys(WIN_NAME) as WinKind[]){
    if (!OPT.wins[k]) continue;
    for (const s of SIDES){
      const done = progress(k, s) >= 1;
      if (!done){ HOLD[k][s] = null; continue; }
      if (HOLD[k][s] == null) HOLD[k][s] = GAME.t;
      if (GAME.t - (HOLD[k][s] as number) < HOLD_NEED[k]) continue;
      if (k === 'circonstance' && treatyOn('paix') && terPct(s) < .7){ const w = score('usc') >= score('ccp') ? 'usc' : 'ccp'; win(w, k, 'l’emporte au score après dix minutes de paix : la guerre froide finit par une poignée de pattes.'); return; }
      win(s, k, k === 'militaire' ? 'gagne : l’autre camp n’a plus une seule ville.' : k === 'science' ? 'réussit le premier les cinq jalons de la science : un chat marche sur la Lune.' : k === 'sociale' ? 'gagne : ses habitants sont plus nombreux et plus heureux.' : k === 'economie' ? 'gagne : ses Catcoins et ses usines ont eu raison de l’autre camp.' : 'gagne : elle tient presque toute l’île.');
      return;
    }
  }
  // Blitz : a la fin du temps, le meilleur score
  if (OPT.minutes && GAME.t >= OPT.minutes * 60){
    const su = score('usc'), sc = score('ccp'), w: Side = su >= sc ? 'usc' : 'ccp';
    win(w, 'blitz', 'l’emporte au score : ' + Math.max(su, sc) + ' contre ' + Math.min(su, sc) + '.');
  }
  achievements();
};
// le temps du Blitz, a cote de l'horloge
HOOKS.step.push(() => {
  const el = $('blitzT');
  if (!OPT.minutes || GAME.mode !== 'play'){ el.hidden = true; return; }
  const left = Math.max(0, OPT.minutes * 60 - GAME.t), m = Math.floor(left / 60), s = Math.floor(left % 60);
  el.hidden = false; el.textContent = 'Blitz ' + m + ':' + String(s).padStart(2, '0');
});

/* ---- succes ---- */
function achievements(){
  const me = GAME.side;
  if ((SH.BLD as Building[]).some(l => l.side === me && l.type === 'ville' && l.done)) achieve('VILLE');
  if (TRAINS.some(t => t.side === me)) achieve('TRAIN');
  if (SCI[me].done.size >= 10) achieve('SAVANT');
  if (SPACE[me].stage >= 5) achieve('LUNE');
  if (treatyOn('paix')) achieve('DIPLOMATE');
  if (DIP.fled[other(me)] >= 20) achieve('TRANSFUGES');
}

/* ---- la course aux victoires (clic sur le bloc du territoire, ou O) ---- */
export function renderVic(){
  const el = $('vic');
  let h = '<div class="sci-head"><b>Course aux victoires</b><span>' + (OPT.minutes ? 'Blitz de ' + OPT.minutes + ' minutes ; score : USC ' + score('usc') + ', CCR ' + score('ccp') + '.' : 'Sans fin : jusqu’à une victoire. Score : USC ' + score('usc') + ', CCR ' + score('ccp') + '.') + '</span><button class="btn k" type="button" id="vicClose" aria-label="Fermer">×</button></div><div class="vic-list">';
  for (const k of Object.keys(WIN_NAME) as WinKind[]){
    const on = OPT.wins[k];
    const bar = (s: Side) => { const p = Math.round(progress(k, s) * 100), hd = HOLD[k][s]; return '<div class="vic-bar ' + (s === 'usc' ? 'u' : 'c') + '">' + (s === 'usc' ? 'USC' : 'CCR') + ' ' + p + ' %' + (hd != null && HOLD_NEED[k] ? ', encore ' + Math.max(0, Math.ceil(HOLD_NEED[k] - (GAME.t - hd))) + ' s' : '') + '<span><i style="width:' + p + '%"></i></span></div>'; };
    h += '<div class="vic-row' + (on ? '' : ' vic-off') + '"><div><b>' + WIN_NAME[k] + (on ? '' : ' (désactivée)') + '</b><small>' + WIN_DESC[k] + '</small></div>' + bar('usc') + bar('ccp') + '</div>';
  }
  h += '</div><p class="sel-note">Bien-être : USC ' + wellbeing('usc').toFixed(1).replace('.', ',') + ', CCR ' + wellbeing('ccp').toFixed(1).replace('.', ',') + '.</p>';
  el.innerHTML = h;
  $('vicClose').addEventListener('click', () => toggleVic(false));
}
export function toggleVic(on?: boolean){ const el = $('vic'), show = on == null ? el.hidden : on; el.hidden = !show; if (show){ $('sci').hidden = true; $('dip').hidden = true; renderVic(); } }
$('hudRace').addEventListener('click', () => { toggleVic(); SH.sfx('click'); });
SH.KEYS = SH.KEYS || {};
SH.KEYS.o = () => toggleVic();
const prevEsc = SH.cardEscape;
SH.cardEscape = (): boolean => { if (!$('vic').hidden){ toggleVic(false); return true; } return typeof prevEsc === 'function' ? prevEsc() : false; };
setInterval(() => { if (!$('vic').hidden && GAME.mode === 'play') renderVic(); }, 1000);

/* ---- options de la partie : prises dans le formulaire, gardees dans la sauvegarde ---- */
HOOKS.reset.push(() => {
  OPT.minutes = pick.minutes; OPT.wins = { ...pick.wins };
  maxCities.usc = 0; maxCities.ccp = 0; PEACE_T = null;
  for (const k of Object.keys(HOLD) as WinKind[]) for (const s of SIDES) HOLD[k][s] = null;
  toggleVic(false);
});
HOOKS.save.push((ext) => { ext.opt = { m: OPT.minutes, w: (Object.keys(WIN_NAME) as WinKind[]).filter(k => OPT.wins[k]) }; ext.maxc = [maxCities.usc, maxCities.ccp]; });
HOOKS.load.push((ext) => {
  const o = ext.opt as { m?: unknown; w?: unknown } | undefined;
  OPT.minutes = o && typeof o.m === 'number' ? o.m : 0;
  OPT.wins = allWins(); if (o && Array.isArray(o.w)) for (const k of Object.keys(WIN_NAME) as WinKind[]) OPT.wins[k] = o.w.includes(k);
  if (Array.isArray(ext.maxc)){ maxCities.usc = +ext.maxc[0] || 0; maxCities.ccp = +ext.maxc[1] || 0; }
});
