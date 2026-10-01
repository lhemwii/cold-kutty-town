import { SH, type Building, type Side } from './00-shared.ts';
import { GAME, HOOKS, M, SIDES, boxS, bz, drawStar, fput, gableRoof2, gableWalls, line3, prj, win, winColor } from './01-core.ts';
import { Lc, facadePlate, frontVisible, part, sideLight, wallBase } from './03-buildings-base.ts';
import { TYPES, pyramid } from './04-types.ts';
import { typeName } from './05-types-extra.ts';
import { drawCyl } from './06-types-more.ts';
import { FOOT } from './10-town.ts';
import { $, ico, toast } from './13-ui.ts';
import { refreshPalette } from './14-hud.ts';
import { CATS_MENU, ECO, LVL_MULT, RES, TALLY, bdef } from './15-economy.ts';
/* ================= etape 8 : la recherche ================= */
// L'universite et les laboratoires produisent des points de recherche (avec des habitants au metier Recherche).
// On choisit une recherche dans l'arbre (ecran E) : les points s'y versent ; finie, elle debloque des batiments, des
// ameliorations, des unites. Sept branches. L'autre camp cherche de son cote (la moins chere qui soit ouverte).

/* ---- l'arbre ---- */
export type Branch = 'industrie' | 'societe' | 'transports' | 'armee' | 'espace' | 'atome' | 'renseignement';
export const BRANCH_NAME: Record<Branch, string> = { industrie: 'Industrie et énergie', societe: 'Société', transports: 'Transports', armee: 'Armée', espace: 'Espace', atome: 'Atome', renseignement: 'Renseignement' };
export interface Tech { id: string; name: string; branch: Branch; cost: number; req: string[]; gives: string }
export const TECHS: Tech[] = [
  { id: 'mecanisation', name: 'Mécanisation', branch: 'industrie', cost: 40, req: [], gives: 'Fermes, mines et filatures produisent 15 % de plus.' },
  { id: 'hydro', name: 'Hydroélectricité', branch: 'industrie', cost: 70, req: ['mecanisation'], gives: 'Le barrage, au bord des rivières.' },
  { id: 'petrochimie', name: 'Pétrochimie', branch: 'industrie', cost: 110, req: ['mecanisation'], gives: 'Les derricks tirent moitié plus de pétrole.' },
  { id: 'automatisation', name: 'Automatisation', branch: 'industrie', cost: 220, req: ['hydro', 'petrochimie'], gives: 'Les usines tournent même à court de bras (au moins 60 %).' },
  { id: 'education', name: 'Éducation', branch: 'societe', cost: 35, req: [], gives: 'Le laboratoire.' },
  { id: 'urbanisme', name: 'Urbanisme', branch: 'societe', cost: 80, req: ['education'], gives: 'Le niveau 3 des immeubles et des maisons.' },
  { id: 'medecine', name: 'Médecine', branch: 'societe', cost: 120, req: ['education'], gives: 'Des habitants en meilleure santé : plus de ronrons.' },
  { id: 'television', name: 'Télévision', branch: 'societe', cost: 200, req: ['urbanisme'], gives: 'Plus de loisirs dans chaque foyer, et plus d’influence.' },
  { id: 'chemin_de_fer', name: 'Chemin de fer', branch: 'transports', cost: 45, req: [], gives: 'La gare et les trains.' },
  { id: 'goudron', name: 'Goudron', branch: 'transports', cost: 40, req: [], gives: 'Goudronner les chemins de terre.' },
  { id: 'tunnels', name: 'Tunnels', branch: 'transports', cost: 90, req: ['chemin_de_fer'], gives: 'Routes et voies sous la roche.' },
  { id: 'metro', name: 'Métro', branch: 'transports', cost: 150, req: ['tunnels'], gives: 'La station de métro.' },
  { id: 'blindes', name: 'Blindés', branch: 'armee', cost: 80, req: ['mecanisation'], gives: 'L’usine de chars : chars et jeeps.' },
  { id: 'marine', name: 'Marine', branch: 'armee', cost: 90, req: [], gives: 'Le chantier naval : navires de guerre et de transport.' },
  { id: 'aviation', name: 'Aviation', branch: 'armee', cost: 150, req: ['blindes'], gives: 'L’aérodrome : chasseurs.' },
  { id: 'radar', name: 'Radar', branch: 'armee', cost: 120, req: ['aviation'], gives: 'Le radar, la DCA et le canon côtier.' },
  { id: 'bombardiers', name: 'Bombardiers', branch: 'armee', cost: 240, req: ['aviation'], gives: 'Les bombardiers, qui détruisent des bâtiments.' },
  { id: 'fusees', name: 'Fusées', branch: 'espace', cost: 120, req: ['education'], gives: 'La base de lancement et le premier satellite.' },
  { id: 'satellites', name: 'Satellites', branch: 'espace', cost: 180, req: ['fusees'], gives: 'Un réseau de satellites qui révèle l’île.' },
  { id: 'cosmonautes', name: 'Chats de l’espace', branch: 'espace', cost: 260, req: ['satellites'], gives: 'Un chat dans l’espace.' },
  { id: 'station', name: 'Station orbitale', branch: 'espace', cost: 360, req: ['cosmonautes'], gives: 'Une station en orbite.' },
  { id: 'lune', name: 'Programme lunaire', branch: 'espace', cost: 500, req: ['station'], gives: 'Un chat sur la Lune.' },
  { id: 'atome', name: 'Atome', branch: 'atome', cost: 140, req: ['education'], gives: 'La mine d’uranium.' },
  { id: 'nucleaire', name: 'Centrale nucléaire', branch: 'atome', cost: 220, req: ['atome'], gives: 'La centrale nucléaire : énormément d’électricité.' },
  { id: 'bombe', name: 'Bombe atomique', branch: 'atome', cost: 600, req: ['nucleaire', 'bombardiers'], gives: 'Le centre atomique et le silo.' },
  { id: 'espionnage', name: 'Espionnage', branch: 'renseignement', cost: 70, req: [], gives: 'L’agence de renseignement et les espions.' },
  { id: 'ecoute', name: 'Écoute', branch: 'renseignement', cost: 110, req: ['espionnage'], gives: 'La station d’écoute : voir les unités ennemies.' },
  { id: 'contre', name: 'Contre-espionnage', branch: 'renseignement', cost: 130, req: ['espionnage'], gives: 'Les espions ennemis se font prendre plus souvent.' },
  { id: 'sabotage', name: 'Sabotage', branch: 'renseignement', cost: 200, req: ['ecoute'], gives: 'Les espions peuvent saboter et voler une recherche.' },
];
export const TECH = new Map(TECHS.map(t => [t.id, t]));

/* ---- l'etat de chaque camp ---- */
export interface SciState { done: Set<string>; cur: string | null; prog: Record<string, number>; rate: number; bank: number }
const newSci = (): SciState => ({ done: new Set(), cur: null, prog: {}, rate: 0, bank: 0 });
export const SCI: Record<Side, SciState> = { usc: newSci(), ccp: newSci() };
SH.SCI = SCI;
export const hasTech = (side: Side, id: string): boolean => !TECH.has(id) || SCI[side].done.has(id);
SH.hasTech = hasTech;
SH.techName = (id: string): string => TECH.get(id)?.name || id;
export const techOpen = (side: Side, t: Tech): boolean => !SCI[side].done.has(t.id) && t.req.every(r => SCI[side].done.has(r));

/* ---- les batiments de la recherche ---- */
if (!CATS_MENU.some(c => c[0] === 'recherche')) CATS_MENU.push(['recherche', 'Recherche']);
TYPES.universite = { name: 'Université', nameCCP: 'Université du Peuple', fem: true, build(lot: Building, seed: number){
  const ccp = lot.side === 'ccp', a0 = lot.ca - 14, a1 = lot.ca + 14, b0 = lot.cb - 9, b1 = lot.cb + 6, hh = ccp ? 12 : 9;
  const body = () => {
    SH.CUR = ccp ? M.SANDSTONE : M.BRICK;
    if (ccp) boxS(a0, a1, b0, b1, 0, hh, (u: number, h: number, x: number, y: number, k: number) => { const kk = win(u % 3.4, h, 1, 2.2, 1.6, 3); if (kk && h < hh - 1) return winColor(kk, true, x, y); return h > hh - 1 ? 1 : wallBase(k, x, y); }, (x: number, y: number) => bz(x, y) < 2 ? 1 : 0);
    else { gableWalls(a0, a1, b0, b1, hh, 4, 'a', (u: number, h: number, x: number, y: number, k: number) => { const kk = win(u % 3.6, h, 1.2, 2.4, 1.6, 3); return kk ? winColor(kk, true, x, y) : wallBase(k, x, y); }); SH.CUR = M.ROOF_USC3; gableRoof2(a0, a1, b0, b1, hh, 4, 'a', 1, 7, 1); }
  };
  // la tour : clocher de campus a l'USC ; a la CCR, la grande tour a fleche et etoile
  const tower = () => {
    const ta = lot.ca, tb = lot.cb - 1;
    if (ccp){
      SH.CUR = M.SANDSTONE; boxS(ta - 4, ta + 4, tb - 4, tb + 4, hh, hh + 14, (u: number, h: number, x: number, y: number, k: number) => (u % 2.6) < 1 && h % 4 > 1.5 ? winColor('in', true, x, y) : wallBase(k, x, y), 1);
      boxS(ta - 2.5, ta + 2.5, tb - 2.5, tb + 2.5, hh + 14, hh + 20, 0, 1);
      SH.CUR = M.DOME_A; line3(ta, tb, hh + 20, ta, tb, hh + 32, 1);
      const p = prj(ta, tb, hh + 33); SH.CUR = M.SIGN_CCP; drawStar(fput, Math.round(p[0]) - 3, Math.round(p[1]) - 3, 0, true);
    } else {
      SH.CUR = M.BRICK; boxS(ta - 3, ta + 3, tb - 3, tb + 3, hh, hh + 12, (u: number, h: number) => (h > 8 && h < 10.5 && (u % 6) > 2 && (u % 6) < 4) ? 3 : 0, 1);
      SH.CUR = M.ROOF_USC3; pyramid(ta, tb, 3.6, hh + 12, hh + 18, 1);
      if (frontVisible(0)){ const p = prj(ta, tb + 3.1, hh + 9.5), x = Math.round(p[0]), y = Math.round(p[1]); SH.CUR = M.SIGN; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) fput(x + dx, y + dy, 1); SH.CUR = M.CAT_BLACK; fput(x, y, 0); }
    }
  };
  void seed;
  return { parts: [part(lot.ca, lot.cb, 0, body), part(lot.ca, lot.cb + 2, 3, tower)], lights: [sideLight(a0, a1, b0, b1, 0, 8, 1), Lc(lot.ca, b1 + 6, 12, 1.2)] };
} };
ECO.universite = bdef('recherche', 60, { costR: 20, l: -1, jobs: 6, sci: 6, rad: 44, up: true, elec: -2, desc: 'Des chercheurs : des points de recherche (écran E).' });
FOOT.universite = [32, 22];
TYPES.labo = { name: 'Laboratoire', nameCCP: 'Institut du Plan', fem: false, build(lot: Building, seed: number){
  const ccp = lot.side === 'ccp', a0 = lot.ca - 10, a1 = lot.ca + 10, b0 = lot.cb - 7, b1 = lot.cb + 5, hh = 8;
  const body = () => {
    SH.CUR = ccp ? M.CONCRETE : M.USC4;
    boxS(a0, a1, b0, b1, 0, hh, (u: number, h: number, x: number, y: number, k: number) => (h > 2 && h < 6.5 && (u % 3) > .6) ? winColor('in', true, x, y) : (h > hh - 1 ? 1 : wallBase(k, x, y)), (x: number, y: number) => bz(x, y) < 2 ? 1 : 0);
    // une coupole d'observatoire (USC) ou une antenne (CCR) sur le toit
    if (ccp){ SH.CUR = M.METAL; line3(a1 - 4, b0 + 3, hh, a1 - 4, b0 + 3, hh + 14, 1); for (const z of [hh + 6, hh + 10]) line3(a1 - 6, b0 + 3, z, a1 - 2, b0 + 3, z, 1); }
    else { SH.CUR = M.CHROME; drawCyl(a1 - 5, b0 + 4, hh, 3.5, 2, false); drawCyl(a1 - 5, b0 + 4, hh + 2, 2.8, 1.6, true); SH.CUR = M.CAT_BLACK; line3(a1 - 5, b0 + 4, hh + 3.5, a1 - 3, b0 + 2, hh + 5.5, 0); }
  };
  void seed;
  return { parts: [part(lot.ca, lot.cb, 0, body), part(lot.ca, lot.cb, .6, () => facadePlate(ccp ? 'INSTITUT' : 'LAB', lot.ca - 2, b1, b0, 7.4))], lights: [sideLight(a0, a1, b0, b1, 0, 7, 1)] };
} };
ECO.labo = bdef('recherche', 50, { costR: 25, l: -1, jobs: 4, sci: 10, rad: 34, up: true, elec: -3, tech: 'education', desc: 'Plus de points de recherche que l’université ; demande l’Éducation.' });
FOOT.labo = [24, 16];
// la centrale nucleaire (branche Atome)
TYPES.nucleaire = { name: 'Centrale nucléaire', nameCCP: 'Centrale atomique du Peuple', fem: true, build(lot: Building, seed: number){
  const ccp = lot.side === 'ccp', a0 = lot.ca - 16, a1 = lot.ca + 4, b0 = lot.cb - 8, b1 = lot.cb + 6;
  const body = () => { SH.CUR = M.CONCRETE; boxS(a0, a1, b0, b1, 0, 8, (u: number, h: number, x: number, y: number, k: number) => (h > 3 && h < 5 && (u % 4) > 2.5) ? 3 : wallBase(k, x, y), 1); SH.CUR = M.CHROME; drawCyl(a0 + 6, lot.cb, 8, 4, 4, true); };
  // la tour de refroidissement et son panache
  const tower = (t: number) => {
    const ta = lot.ca + 10, tb = lot.cb; SH.CUR = M.CONCRETE;
    for (let z = 0; z < 22; z += 2){ const r = 7 - Math.sin(z / 22 * Math.PI) * 2.4; drawCyl(ta, tb, z, r, 2, z >= 20); }
    SH.CUR = M.SMOKE; for (let k = 0; k < 6; k++){ const p = prj(ta + Math.sin(t + k) * 2, tb, 24 + k * 2.5 + ((t * 3) % 2.5)); fput(Math.round(p[0]) + (k % 3) - 1, Math.round(p[1]), 1); fput(Math.round(p[0]) + 1, Math.round(p[1]), 1); }
    if (ccp){ const p = prj(ta, tb + 6.5, 16); SH.CUR = M.SIGN_CCP; drawStar(fput, Math.round(p[0]) - 3, Math.round(p[1]) - 3, 0, true); }
  };
  void seed;
  return { parts: [part(lot.ca - 6, lot.cb, 0, body), part(lot.ca + 10, lot.cb, .4, tower)], lights: [sideLight(a0, a1, b0, b1, 0, 7, 1)] };
} };
ECO.nucleaire = bdef('industrie', 160, { costR: 40, x: { uranium: -.5 }, elec: 80, jobs: 10, conv: true, tech: 'nucleaire', desc: 'Brûle un peu d’uranium : énormément d’électricité.' });
FOOT.nucleaire = [40, 22];

/* ---- ce que l'arbre debloque ---- */
ECO.gare.tech = 'chemin_de_fer';
ECO.metro.tech = 'metro';
ECO.barrage.tech = 'hydro';
ECO.mineu.tech = 'atome';
ECO.mineu.desc = 'Sur un gisement d’uranium. Il faut la recherche de l’Atome.';
// niveau 3 des logements : l'Urbanisme
SH.upTech = (l: Building): string => {
  if ((l.lvl || 1) === 2 && ['maison', 'immeuble'].includes(l.type) && !hasTech(l.side, 'urbanisme')) return 'Il faut d’abord la recherche « Urbanisme ».';
  return '';
};
// effets : production, pétrole, bras, sante, television
const prevMult = SH.prodMult;
SH.prodMult = (l: Building): number => {
  let m = typeof prevMult === 'function' ? prevMult(l) : 1;
  const e = ECO[l.type];
  if (e && hasTech(l.side, 'mecanisation') && (e.cat === 'nourriture' || e.cat === 'industrie' || e.cat === 'laine')) m *= 1.15;
  if (l.type === 'derrick' && hasTech(l.side, 'petrochimie')) m *= 1.5;
  if (e && e.cat === 'industrie' && hasTech(l.side, 'automatisation')){ const R = RES[l.side]; if (R.effM.industrie < .6) m *= .6 / Math.max(.3, R.effM.industrie); }
  return m;
};
TALLY.push((side, add) => {
  const R = RES[side];
  if (hasTech(side, 'medecine')) add('r', R.pop * .04, 'Médecine');
  if (hasTech(side, 'television')) add('r', R.pop * .05, 'Télévision');
});

/* ---- les points : chaque seconde, la recherche en cours avance ---- */
export function sciRate(side: Side): number {
  const R = RES[side]; let r = 1;
  for (const l of SH.BLD as Building[]){
    if (l.side !== side || !l.done || !l.active) continue;
    const e = ECO[l.type]; if (!e || !e.sci) continue;
    r += e.sci * LVL_MULT[(l.lvl || 1) - 1] * Math.max(.3, R.effM.recherche) * (.5 + .5 * R.elecCov) * (SH.prodMult ? SH.prodMult(l) : 1);
  }
  return r;
}
let sciAcc = 0;
HOOKS.step.push((dt: number) => {
  if (GAME.mode !== 'play' || dt <= 0) return;
  sciAcc += dt; if (sciAcc < 1) return;
  const k = sciAcc / 60; sciAcc = 0;
  for (const side of SIDES){
    const S = SCI[side]; S.rate = sciRate(side);
    // l'autre camp choisit lui-meme : la moins chere des recherches ouvertes
    if (!S.cur && side !== GAME.side){ const open = TECHS.filter(t => techOpen(side, t)).sort((u, v) => u.cost - v.cost); if (open.length) S.cur = open[0].id; }
    if (!S.cur){ S.bank += S.rate * k; continue; }
    const t = TECH.get(S.cur); if (!t){ S.cur = null; continue; }
    S.prog[t.id] = (S.prog[t.id] || 0) + S.rate * k + S.bank; S.bank = 0;
    if (S.prog[t.id] >= t.cost){ S.done.add(t.id); S.cur = null; finished(side, t); }
  }
  renderSciButton(); if (!$('sci').hidden) renderSci();
});
function finished(side: Side, t: Tech){
  if (SH.logDay) SH.logDay(side, 'tech', t.name);
  if (side === GAME.side){ toast('Recherche terminée : ' + t.name + '. ' + t.gives); SH.sfx('build'); refreshPalette(); }
  SH.radioQueue.push(side === 'ccp' ? ['ccp', 'Radio Miaou-Scou', 'Les savants du Peuple maîtrisent ' + t.name.toLowerCase() + '. Le Plan avait raison.'] : ['usc', 'Radio Kutty Libre', 'Percée de nos chercheurs : ' + t.name.toLowerCase() + ' ! Le progrès, c’est l’USC.']);
}

/* ---- le bouton du HUD et l'ecran de la recherche ---- */
const btn = $('btnSci');
const sciIco = btn.querySelector('.sci-ico'); if (sciIco) sciIco.innerHTML = ico('science');
function renderSciButton(){
  const S = SCI[GAME.side], t = S.cur ? TECH.get(S.cur) : null, bar = document.getElementById('sciBar');
  if (bar) bar.style.width = t ? Math.min(100, Math.round((S.prog[t.id] || 0) / t.cost * 100)) + '%' : '0';
  btn.title = t ? 'Recherche : ' + t.name + ' (' + Math.round((S.prog[t.id] || 0) / t.cost * 100) + ' %). E pour l’arbre.' : 'Recherche : rien en cours. E pour choisir.';
  btn.classList.toggle('idle', !t);
}
export function renderSci(){
  const el = $('sci'), S = SCI[GAME.side], side = GAME.side;
  const cur = S.cur ? TECH.get(S.cur) : null;
  let h = '<div class="sci-head"><b>Recherche</b><span>' + Math.round(S.rate * 10) / 10 + ' points par minute' + (cur ? ' ; en cours : ' + cur.name : ' ; choisis une recherche') + (S.bank > 1 ? ' ; ' + Math.round(S.bank) + ' points en réserve' : '') + '. Construis des universités et des laboratoires pour aller plus vite.</span><button class="btn k" type="button" id="sciClose" aria-label="Fermer">×</button></div><div class="sci-cols">';
  for (const br of Object.keys(BRANCH_NAME) as Branch[]){
    h += '<div class="sci-col"><h3>' + BRANCH_NAME[br] + '</h3>';
    for (const t of TECHS.filter(x => x.branch === br)){
      const done = S.done.has(t.id), open = techOpen(side, t), p = S.prog[t.id] || 0, isCur = S.cur === t.id;
      const reqTxt = t.req.length ? 'Demande : ' + t.req.map(r => TECH.get(r)?.name || r).join(', ') + '. ' : '';
      h += '<button type="button" class="tech' + (done ? ' done' : '') + (isCur ? ' cur' : '') + (!done && !open ? ' lock' : '') + '" data-tech="' + t.id + '"' + (!done && !open ? ' aria-disabled="true"' : '') + '><b>' + t.name + '</b><span class="tc">' + (done ? 'Faite' : Math.round(p) + ' / ' + t.cost + ' points') + '</span><small>' + (done ? '' : reqTxt) + t.gives + '</small>' + (!done && p > 0 ? '<span class="tbar"><i style="width:' + Math.round(p / t.cost * 100) + '%"></i></span>' : '') + '</button>';
    }
    h += '</div>';
  }
  el.innerHTML = h + '</div>';
  $('sciClose').addEventListener('click', () => toggleSci(false));
  for (const b of el.querySelectorAll('[data-tech]')) if (b instanceof HTMLElement) b.addEventListener('click', () => {
    const t = TECH.get(b.dataset.tech || ''); if (!t) return;
    if (S.done.has(t.id)) return;
    if (!techOpen(side, t)){ toast('Il faut d’abord : ' + t.req.filter(r => !S.done.has(r)).map(r => TECH.get(r)?.name || r).join(', ') + '.'); return; }
    S.cur = t.id; toast('Recherche choisie : ' + t.name + '.'); SH.sfx('click'); renderSci(); renderSciButton();
  });
}
export function toggleSci(on?: boolean){
  const el = $('sci'), show = on == null ? el.hidden : on;
  el.hidden = !show; btn.setAttribute('aria-pressed', String(show));
  if (show){ const d = document.getElementById('dip'); if (d) d.hidden = true; renderSci(); }
}
btn.addEventListener('click', () => { toggleSci(); SH.sfx('click'); });
SH.KEYS = SH.KEYS || {};
SH.KEYS.e = () => toggleSci();
const prevEsc = SH.cardEscape;
SH.cardEscape = (): boolean => { if (!$('sci').hidden){ toggleSci(false); return true; } return typeof prevEsc === 'function' ? prevEsc() : false; };
// au survol d'un batiment de recherche : ses points
const prevSel = SH.selExtra;
SH.selExtra = (l: Building, b: (label: string, sub: string, fn: () => void, why?: string) => HTMLButtonElement, act: HTMLElement) => {
  if (typeof prevSel === 'function') prevSel(l, b, act);
  const e = ECO[l.type]; if (!e || !e.sci || !l.done) return;
  const n = document.createElement('p'); n.className = 'sel-note'; n.textContent = typeName(l.type, l.side) + ' : ' + Math.round(e.sci * LVL_MULT[(l.lvl || 1) - 1] * 10) / 10 + ' points de recherche par minute (selon les chercheurs et l’électricité).'; act.append(n);
};

/* ---- sauvegarde ---- */
HOOKS.save.push((ext) => { ext.sci = SIDES.map(s => ({ d: [...SCI[s].done], c: SCI[s].cur, p: SCI[s].prog, b: Math.round(SCI[s].bank) })); });
HOOKS.load.push((ext) => {
  for (const s of SIDES) Object.assign(SCI[s], newSci());
  // une partie d'avant la recherche : on lui donne ce qu'elle avait deja (gares, metro...)
  const arr = ext.sci;
  if (!Array.isArray(arr)){ for (const s of SIDES) for (const t of TECHS) if (['chemin_de_fer', 'goudron', 'tunnels', 'metro', 'hydro', 'urbanisme'].includes(t.id)) SCI[s].done.add(t.id); return; }
  arr.forEach((o: unknown, i: number) => { const s = SIDES[i]; if (!s || !o || typeof o !== 'object') return; const r = o as { d?: unknown; c?: unknown; p?: unknown; b?: unknown };
    if (Array.isArray(r.d)) for (const id of r.d) if (TECH.has(String(id))) SCI[s].done.add(String(id));
    SCI[s].cur = typeof r.c === 'string' && TECH.has(r.c) ? r.c : null;
    if (r.p && typeof r.p === 'object') for (const [k, v] of Object.entries(r.p as Record<string, unknown>)) if (TECH.has(k)) SCI[s].prog[k] = +(v as number) || 0;
    SCI[s].bank = +(r.b as number) || 0; });
});
HOOKS.reset.push(() => { for (const s of SIDES) Object.assign(SCI[s], newSci()); toggleSci(false); });
