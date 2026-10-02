import { SH, type Building, type Side } from './00-shared.ts';
import { GAME, HOOKS, M, SIDES, fput, prj, state } from './01-core.ts';
import { GA0, GB0, type Vec2 } from './02-ground.ts';
import { SID, TC, TER, claimDisc } from './08-territory.ts';
import { scene } from './11-render.ts';
import { $, setTool, toast, worldUnder } from './13-ui.ts';
import { TOOL_TILES } from './14-hud.ts';
import { RES, canAfford, payPrice, type Price } from './15-economy.ts';
import { store } from './22-home.ts';
import { SCI } from './29-recherche.ts';
/* ================= etape 13 : l'ecran, deuxieme version ================= */
// Plus d'outil Observer : sans outil, on choisit (Echap y revient). Le luxe et les Catcoins dans le bloc des ressources.
// Un ecran d'aide (H). Un tutoriel au premier lancement. Au telephone : un dock repliable et l'appui long pour le clic droit.

/* ---- acheter du terrain (etape 0.22) : un disque au bord de son territoire, contre des Catcoins, de la laine et des ronrons ---- */
const BUY_R = 34;
const BOUGHT: Record<Side, number> = { usc: 0, ccp: 0 };
export const buyPrice = (side: Side): Price & { coins: number } => ({ l: 15 + 5 * BOUGHT[side], c: 0, r: 15 + 5 * BOUGHT[side], coins: 25 + 10 * BOUGHT[side] });
// les cases du disque : combien de terre libre, et touche-t-il deja le territoire du camp ?
function buyCheck(side: Side, a: number, b: number): string {
  const sid = SID[side], r = BUY_R + 8; let free = 0, mine = 0;
  const x0 = Math.max(0, Math.floor((a - r - GA0) / TC)), x1 = Math.min(TER.W - 1, Math.floor((a + r - GA0) / TC)), y0 = Math.max(0, Math.floor((b - r - GB0) / TC)), y1 = Math.min(TER.H - 1, Math.floor((b + r - GB0) / TC));
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++){
    const i = y * TER.W + x, d = Math.hypot(GA0 + (x + .5) * TC - a, GB0 + (y + .5) * TC - b); if (d > r || !TER.land[i]) continue;
    if (TER.own[i] === sid) mine++; else if (!TER.own[i] && d <= BUY_R) free++;
  }
  if (!mine) return 'Achète au bord de ton territoire : le terrain doit toucher le tien.';
  if (free < 12) return 'Rien à acheter ici : le terrain est déjà pris (ou c’est la mer).';
  return '';
}
export function buyLand(side: Side, a: number, b: number): string {
  const why = buyCheck(side, a, b); if (why) return why;
  const p = buyPrice(side);
  if (!canAfford(side, p) || RES[side].x.coins < p.coins) return 'Il faut ' + p.coins + ' Catcoins, ' + p.l + ' laine et ' + p.r + ' ronrons.';
  payPrice(side, p); RES[side].x.coins -= p.coins; BOUGHT[side]++;
  claimDisc(a, b, BUY_R, side); return '';
}
let buyHover: Vec2 | null = null;
SH.TOOLS = SH.TOOLS || {};
SH.TOOLS.buyland = {
  hint: 'Acheter du terrain : clique au bord de ton territoire. Le prix monte à chaque achat.',
  start(){ const p = buyPrice(GAME.side); $('modeHint').textContent = 'Acheter du terrain : clique au bord de ton territoire. Prix : ' + p.coins + ' Catcoins, ' + p.l + ' laine, ' + p.r + ' ronrons. Il monte à chaque achat.'; },
  click(a: number, b: number){
    const why = buyLand(GAME.side, a, b); if (why){ toast(why); return; }
    toast('Terrain acheté.'); SH.sfx('build'); SH.floatText(a, b, 'Terrain acheté'); SH.saveSoon(); SH.renderHUD();
    const t = SH.TOOLS.buyland; if (t && t.start) t.start();
  },
  preview(t: number, w: Vec2 | null){
    if (!w) return; buyHover = w;
    const ok = !buyCheck(GAME.side, w[0], w[1]);
    SH.CUR = ok ? M.BEAM : M.FLAG_RED;
    for (let k = 0; k < 64; k++){ if (((k + Math.floor(t * 8)) & 3) === 3) continue; const an = k * Math.PI / 32, q = prj(w[0] + Math.cos(an) * BUY_R, w[1] + Math.sin(an) * BUY_R, 0); fput(Math.round(q[0]), Math.round(q[1]), 1); fput(Math.round(q[0]) + 1, Math.round(q[1]), 1); }
  },
};
void buyHover;
(TOOL_TILES.frontiere = TOOL_TILES.frontiere || []).unshift({ tool: 'buyland', name: 'Acheter du terrain', svg: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M1 13l4-3 3 2 3-4 4 3v4H1z" fill="currentColor"/><circle cx="11" cy="4" r="3" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M10.4 2.6h1.2v2.8h-1.2z" fill="currentColor"/></svg>', cost: 'Catcoins', desc: 'Un morceau de terrain au bord de ton territoire, contre des Catcoins, de la laine et des ronrons.' });
HOOKS.reset.push(() => { for (const s of SIDES) BOUGHT[s] = 0; });
HOOKS.save.push((ext) => { ext.buy = [BOUGHT.usc, BOUGHT.ccp]; });
HOOKS.load.push((ext) => { const v = ext.buy; BOUGHT.usc = Array.isArray(v) ? +v[0] || 0 : 0; BOUGHT.ccp = Array.isArray(v) ? +v[1] || 0 : 0; });

/* ---- ce que font les batiments qui ne produisent pas (etape 0.22) : un mot dans le tiroir et la fiche ---- */
const TAGS: Record<string, [string, string]> = {
  fusee: ['science', 'course à l’espace'], drapeau: ['frontiere', 'nouveau territoire'], foret: ['laine', 'laine de la forêt'], caserne: ['armee', 'soldats, explorateurs'],
  gare: ['transport', 'trains entre villes'], usinechars: ['armee', 'chars et jeeps'], chantier: ['mer', 'navires'], aerodrome: ['armee', 'avions'],
  bunker: ['armee', 'défense à terre'], canoncotier: ['armee', 'défense côtière'], dca: ['armee', 'défense aérienne'], radar: ['influence', 'voit loin'],
  centreatome: ['uranium', 'bombe atomique'], silo: ['uranium', 'lance la bombe'], agence: ['influence', 'espions'], ecoute: ['influence', 'voit l’ennemi'],
  mirador: ['frontiere', 'moins de fuites'], hautparleurs: ['influence', 'propagande'], pontech: ['coins', 'meilleurs prix'], tunnelev: ['pop', 'évasions vers nous'],
  ambassade: ['influence', 'parler à l’autre camp'], checkpoint: ['coins', 'marché'], entrepot: ['croq', 'plus de stock'], port: ['mer', 'barges, chalutiers'],
};
for (const [k, t] of Object.entries(TAGS)) if (SH.ECO[k]) SH.ECO[k].tag = t;

/* ---- les parametres : son, mode photo, aide, tutoriel, menu (etape 0.22) ---- */
function toggleGear(on?: boolean){
  const el = $('gearPop'), show = on == null ? el.hidden : on;
  el.hidden = !show; $('btnGear').setAttribute('aria-expanded', String(show));
}
$('btnGear').addEventListener('click', (e) => { e.stopPropagation(); toggleGear(); SH.sfx('click'); });
// un choix fait, ou un clic ailleurs, referme les parametres (le son reste ouvert pour voir son etat)
for (const id of ['btnPhoto', 'btnHelp', 'btnTuto', 'btnMenu']) $(id).addEventListener('click', () => toggleGear(false));
document.addEventListener('pointerdown', (e) => { const el = $('gearPop'); if (!el.hidden && e.target instanceof Node && !el.contains(e.target) && !$('btnGear').contains(e.target)) toggleGear(false); });

/* ---- les fenetres se deplacent en les tirant par leur titre (etape 0.22) ---- */
const MOVABLE = '#xres, #sci, #dip, #vic, #help, #units, #card, #sel, #chat';
const HEADS = '.sci-head, .xr-head, .un-head, .sel-head, .chat-head, .pp-head';
document.addEventListener('pointerdown', (e) => {
  const t = e.target; if (!(t instanceof Element) || e.button !== 0 || t.closest('button, input, a, select, canvas')) return;
  const head = t.closest(HEADS), win = head ? head.closest(MOVABLE) : null; if (!(win instanceof HTMLElement)) return;
  const r = win.getBoundingClientRect(), dx = e.clientX - r.left, dy = e.clientY - r.top;
  Object.assign(win.style, { transform: 'none', left: r.left + 'px', top: r.top + 'px', right: 'auto', bottom: 'auto', margin: '0', width: r.width + 'px' });
  win.classList.add('moving'); e.preventDefault();
  const move = (ev: PointerEvent) => { win.style.left = Math.round(Math.max(60 - r.width, Math.min(window.innerWidth - 60, ev.clientX - dx))) + 'px'; win.style.top = Math.round(Math.max(0, Math.min(window.innerHeight - 30, ev.clientY - dy))) + 'px'; };
  const up = () => { win.classList.remove('moving'); window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up); };
  window.addEventListener('pointermove', move); window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up);
});

/* ---- l'aide : toutes les commandes ---- */
const HELP: [string, [string, string][]][] = [
  ['La vue', [['Glisser', 'se déplacer'], ['Molette, + et -', 'zoomer'], ['Clic droit glissé', 'tourner la vue'], ['Page préc., Page suiv.', 'tourner d’un huitième'], ['N', 'le nord en haut'], ['Flèches, ZQSD', 'se déplacer au clavier'], ['L', 'la vue des lignes (trains, métro)']]],
  ['Bâtir', [['B', 'construire : bâtiments, et dans l’onglet Routes et voies les routes, voies et Rideau'], ['T, Maj+T', 'tourner le bâtiment'], ['R', 'route droite (Maj : seize directions)'], ['Ctrl glissé', 'route à main levée'], ['C', 'route courbe'], ['V', 'voie ferrée'], ['M', 'Rideau de Laine'], ['X', 'démolir'], ['Ctrl+Z', 'annuler la dernière action'], ['Échap', 'arrêter, revenir au choix']]],
  ['Unités', [['Clic', 'en choisir une (Maj : en ajouter)'], ['Ctrl glissé', 'un cadre'], ['G', 'toutes celles à l’écran'], ['Clic droit', 'y aller, ou attaquer un ennemi'], ['Clic droit sur un navire', 'embarquer'], ['Appui long (téléphone)', 'comme le clic droit']]],
  ['Écrans', [['E', 'la recherche'], ['P ou téléphone rouge', 'appeler l’autre camp (traités, commerce)'], ['Téléphone vert', 'l’autre camp appelle : sa proposition'], ['O ou la coupe', 'la course aux victoires'], ['Clic sur une ressource', 'l’onglet Ressources : luxe, électricité, eau, métiers'], ['Engrenage', 'son, mode photo, aide, tutoriel, menu'], ['H', 'cette aide'], ['Titre d’une fenêtre', 'la glisser pour la déplacer']]],
  ['La partie', [['Espace', 'pause'], ['1, 2, 3', 'vitesse'], ['Clic sur un chat', 'son passeport, lui parler'], ['Clic sur une route', 'la goudronner'], ['Le journal, en bas à droite', 'la Gazette et la Pravdachat']]],
];
export function toggleHelp(on?: boolean){
  const el = $('help'), show = on == null ? el.hidden : on;
  el.hidden = !show;
  if (!show) return;
  for (const id of ['sci', 'dip', 'vic']){ const o = document.getElementById(id); if (o) o.hidden = true; }
  el.innerHTML = '<div class="sci-head"><b>Aide</b><span>Les commandes du jeu. Le tutoriel peut se relancer d’ici.</span><button class="btn" type="button" id="helpTuto">Relancer le tutoriel</button><button class="btn k" type="button" id="helpClose" aria-label="Fermer">×</button></div><div class="help-cols">'
    + HELP.map(([t, rows]) => '<section><h3>' + t + '</h3><dl>' + rows.map(([k, v]) => '<dt>' + k + '</dt><dd>' + v + '</dd>').join('') + '</dl></section>').join('') + '</div>';
  $('helpClose').addEventListener('click', () => toggleHelp(false));
  $('helpTuto').addEventListener('click', () => { tutoStep = 0; store.set(TUTO_KEY, '0'); toggleHelp(false); renderTuto(); });
}
$('btnHelp').addEventListener('click', () => { toggleHelp(); SH.sfx('click'); });
$('btnTuto').addEventListener('click', () => { tutoStep = 0; store.set(TUTO_KEY, '0'); toggleHelp(false); renderTuto(); SH.sfx('click'); });
SH.KEYS = SH.KEYS || {};
SH.KEYS.h = () => toggleHelp();
const prevEsc = SH.cardEscape;
SH.cardEscape = (): boolean => { if (!$('help').hidden){ toggleHelp(false); return true; } return typeof prevEsc === 'function' ? prevEsc() : false; };

/* ---- le tutoriel du premier lancement ---- */
const TUTO_KEY = 'ckt-tuto';
interface Step { t: string; txt: string; done: () => boolean }
const mine = (f: (l: Building) => boolean) => (SH.BLD as Building[]).some(l => l.side === GAME.side && f(l));
const TUTO: Step[] = [
  { t: 'Bienvenue sur Kutty', txt: 'Tes barges accostent : ton QG se construit. Glisse pour te déplacer, molette pour zoomer.', done: () => mine(l => l.type === 'qg' && l.done) },
  { t: 'Des habitants', txt: 'Construire (B), onglet Logement, puis une maison : pose-la dans ton territoire.', done: () => mine(l => l.type === 'maison') },
  { t: 'Les routes', txt: 'Pas obligatoires : elles font rouler les voitures et relient tes villes à la capitale. Construire, onglet Routes et voies. Un chemin de terre suffit, même en montagne.', done: () => (SH.ROADS as { side: string }[]).filter(r => r.side === GAME.side).length >= 1 },
  { t: 'À manger', txt: 'Les chats mangent des croquettes : une pêcherie sur la côte, ou une ferme (onglet Croquettes).', done: () => mine(l => !!SH.ECO[l.type] && SH.ECO[l.type].cat === 'nourriture') },
  { t: 'La laine', txt: 'La laine paie presque tout : une bergerie (onglet Laine), ou une exploitation forestière en forêt.', done: () => mine(l => !!SH.ECO[l.type] && SH.ECO[l.type].cat === 'laine') },
  { t: 'La recherche', txt: 'Bâtis une université (onglet Recherche), puis choisis une recherche avec E.', done: () => SCI[GAME.side].done.size > 0 || !!SCI[GAME.side].cur },
  { t: 'Gagner', txt: 'La coupe, en haut à droite, montre les cinq façons de gagner. Le téléphone rouge appelle l’autre camp. L’engrenage : son, aide et mode photo.', done: () => false },
];
let tutoStep = (() => { const v = store.get(TUTO_KEY, 0); return typeof v === 'number' ? v : +String(v) || 0; })();
let tutoShown = -1;
function renderTuto(){
  const el = $('tuto');
  if (GAME.mode !== 'play' || tutoStep >= TUTO.length || state.uiHidden){ el.hidden = true; tutoShown = -1; return; }
  if (tutoShown === tutoStep && !el.hidden) return;
  tutoShown = tutoStep;
  const s = TUTO[tutoStep];
  el.innerHTML = '<span class="tuto-n">Tutoriel ' + (tutoStep + 1) + ' sur ' + TUTO.length + '</span><b>' + s.t + '</b><span>' + s.txt + '</span><div class="tuto-act"><button class="btn" type="button" id="tutoOff">Fermer le tutoriel</button><button class="btn" type="button" id="tutoNext">' + (tutoStep === TUTO.length - 1 ? 'Compris' : 'Passer') + '</button></div>';
  el.hidden = false;
  $('tutoNext').addEventListener('click', () => { next(); SH.sfx('click'); });
  $('tutoOff').addEventListener('click', () => { tutoStep = TUTO.length; store.set(TUTO_KEY, String(tutoStep)); renderTuto(); });
}
function next(){ tutoStep++; store.set(TUTO_KEY, String(tutoStep)); renderTuto(); }
let tutoAcc = 0;
HOOKS.step.push((dt: number) => {
  tutoAcc += Math.max(dt, .016); if (tutoAcc < .5) return; tutoAcc = 0;
  if (GAME.mode === 'play' && tutoStep < TUTO.length && TUTO[tutoStep].done()){ next(); SH.sfx('click'); return; }
  renderTuto();
});
SH.tutoReset = () => { tutoStep = 0; store.set(TUTO_KEY, '0'); };

/* ---- la planete vue de l'espace, a l'essai (etape 17.1) : l'option recharge la page ---- */
{ const on = (() => { try { return localStorage.getItem('ckt-globe') === '1'; } catch (_) { return false; } })();
  for (const b of $('optGlobe').children) if (b instanceof HTMLElement){ b.setAttribute('aria-checked', String((b.dataset.v === '1') === on)); b.addEventListener('click', () => { const v = b.dataset.v === '1'; if (v === on) return; try { localStorage.setItem('ckt-globe', v ? '1' : '0'); } catch (_) {} SH.saveNow && SH.saveNow(); location.reload(); }); } }

/* ---- au telephone : dock repliable, appui long ---- */
$('dockFold').addEventListener('click', () => { const d = $('dock'), open = !d.classList.contains('open'); d.classList.toggle('open', open); $('dockFold').setAttribute('aria-expanded', String(open)); SH.sfx('click'); });
// un appui long sans bouger : comme un clic droit (envoyer les unites, arreter un trace)
let lp: { id: number; x: number; y: number; t: ReturnType<typeof setTimeout> } | null = null;
scene.addEventListener('pointerdown', (e) => {
  if (e.pointerType !== 'touch' || GAME.mode !== 'play') return;
  if (lp) clearTimeout(lp.t);
  const id = e.pointerId, x = e.clientX, y = e.clientY, w = worldUnder(e);
  lp = { id, x, y, t: setTimeout(() => {
    lp = null;
    const used = state.tool === 'walk' && typeof SH.unitOrder === 'function' && SH.unitOrder(w[0], w[1]);
    if (!used && state.tool !== 'walk') setTool('walk');
    if (navigator.vibrate) navigator.vibrate(20);
    // le doigt qui se leve ensuite ne doit pas compter comme un clic
    scene.dispatchEvent(new PointerEvent('pointercancel', { pointerId: id, pointerType: 'touch', bubbles: true }));
  }, 550) };
});
scene.addEventListener('pointermove', (e) => { if (lp && e.pointerId === lp.id && Math.hypot(e.clientX - lp.x, e.clientY - lp.y) > 8){ clearTimeout(lp.t); lp = null; } });
const endLp = (e: PointerEvent) => { if (lp && e.pointerId === lp.id){ clearTimeout(lp.t); lp = null; } };
scene.addEventListener('pointerup', endLp);
scene.addEventListener('pointercancel', endLp);
