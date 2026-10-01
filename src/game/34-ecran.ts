import { SH, type Building } from './00-shared.ts';
import { GAME, HOOKS, state } from './01-core.ts';
import { scene } from './11-render.ts';
import { $, ico, setTool, worldUnder } from './13-ui.ts';
import { RES } from './15-economy.ts';
import { store } from './22-home.ts';
import { SCI } from './29-recherche.ts';
/* ================= etape 13 : l'ecran, deuxieme version ================= */
// Plus d'outil Observer : sans outil, on choisit (Echap y revient). Le luxe et les Catcoins dans le bloc des ressources.
// Un ecran d'aide (H). Un tutoriel au premier lancement. Au telephone : un dock repliable et l'appui long pour le clic droit.

/* ---- le luxe et les Catcoins, sous les ressources ---- */
let luxKey = '';
HOOKS.step.push(() => {
  if (GAME.mode !== 'play') return;
  const R = RES[GAME.side], k = Math.floor(R.x.pate) + ':' + Math.floor(R.x.tricot) + ':' + Math.floor(R.x.coins);
  if (k === luxKey) return; luxKey = k;
  $('hudLux').innerHTML = ico('pate', 'pâté') + '<b>' + Math.floor(R.x.pate) + '</b>' + ico('tricot', 'tricot') + '<b>' + Math.floor(R.x.tricot) + '</b>' + ico('coins', 'Catcoins') + '<b>' + Math.floor(R.x.coins) + '</b>';
});

/* ---- l'aide : toutes les commandes ---- */
const HELP: [string, [string, string][]][] = [
  ['La vue', [['Glisser', 'se déplacer'], ['Molette, + et -', 'zoomer'], ['Clic droit glissé', 'tourner la vue'], ['Page préc., Page suiv.', 'tourner d’un huitième'], ['N', 'le nord en haut'], ['Flèches, ZQSD', 'se déplacer au clavier'], ['L', 'la vue des lignes (trains, métro)']]],
  ['Bâtir', [['B', 'construire (menu par catégories)'], ['T, Maj+T', 'tourner le bâtiment'], ['R', 'route droite (Maj : seize directions)'], ['Ctrl glissé', 'route à main levée'], ['C', 'route courbe'], ['V', 'voie ferrée'], ['M', 'Rideau de Laine'], ['X', 'démolir'], ['Ctrl+Z', 'annuler'], ['Échap', 'arrêter, revenir au choix']]],
  ['Unités', [['Clic', 'en choisir une (Maj : en ajouter)'], ['Ctrl glissé', 'un cadre'], ['G', 'toutes celles à l’écran'], ['Clic droit', 'y aller, ou attaquer un ennemi'], ['Clic droit sur un navire', 'embarquer'], ['Appui long (téléphone)', 'comme le clic droit']]],
  ['Écrans', [['E', 'la recherche'], ['P', 'les pourparlers (traités, commerce)'], ['O ou clic sur le territoire', 'la course aux victoires'], ['Bouton Ressources', 'luxe, électricité, eau, métiers'], ['H', 'cette aide']]],
  ['La partie', [['Espace', 'pause'], ['1, 2, 3', 'vitesse'], ['Clic sur un chat', 'lui parler'], ['Clic sur une route', 'la goudronner']]],
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
SH.KEYS = SH.KEYS || {};
SH.KEYS.h = () => toggleHelp();
const prevEsc = SH.cardEscape;
SH.cardEscape = (): boolean => { if (!$('help').hidden){ toggleHelp(false); return true; } return typeof prevEsc === 'function' ? prevEsc() : false; };

/* ---- le tutoriel du premier lancement ---- */
const TUTO_KEY = 'ckt-tuto';
interface Step { t: string; txt: string; done: () => boolean }
const mine = (f: (l: Building) => boolean) => (SH.BLD as Building[]).some(l => l.side === GAME.side && f(l));
const TUTO: Step[] = [
  { t: 'Bienvenue sur Kutty', txt: 'Glisse pour te déplacer, molette pour zoomer. Tes barges accostent : ton QG se construit.', done: () => mine(l => l.type === 'qg' && l.done) },
  { t: 'Des habitants', txt: 'B pour construire, onglet Logement, puis une maison. Pose-la près de la route du QG.', done: () => mine(l => l.type === 'maison') },
  { t: 'La route', txt: 'Un bâtiment sans route jusqu’au QG reste à l’arrêt. R, puis clique le départ et l’arrivée : un chemin de terre suffit.', done: () => (SH.ROADS as { side: string }[]).filter(r => r.side === GAME.side).length >= 2 },
  { t: 'À manger', txt: 'Les chats mangent des croquettes : une pêcherie sur la côte, ou une ferme (onglet Croquettes).', done: () => mine(l => !!SH.ECO[l.type] && SH.ECO[l.type].cat === 'nourriture') },
  { t: 'La laine', txt: 'La laine paie presque tout : une bergerie (onglet Laine), ou une exploitation forestière en forêt.', done: () => mine(l => !!SH.ECO[l.type] && SH.ECO[l.type].cat === 'laine') },
  { t: 'La recherche', txt: 'Bâtis une université (onglet Recherche), puis choisis une recherche avec E.', done: () => SCI[GAME.side].done.size > 0 || !!SCI[GAME.side].cur },
  { t: 'Gagner', txt: 'Un clic sur le bloc du territoire montre les cinq façons de gagner. P pour parler à l’autre camp, H pour l’aide.', done: () => false },
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
