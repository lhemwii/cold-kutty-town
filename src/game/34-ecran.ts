import { SH, type Building } from './00-shared.ts';
import { GAME, HOOKS, state } from './01-core.ts';
import { scene } from './11-render.ts';
import { $, setTool, worldUnder } from './13-ui.ts';
import { store } from './22-home.ts';
import { SCI } from './29-recherche.ts';
/* ================= etape 13 : l'ecran, deuxieme version ================= */
// Plus d'outil Observer : sans outil, on choisit (Echap y revient). Le luxe et les Catcoins dans le bloc des ressources.
// Un ecran d'aide (H). Un tutoriel au premier lancement. Au telephone : un dock repliable et l'appui long pour le clic droit.

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
  { t: 'Les routes', txt: 'Pas obligatoires, mais les voitures et les ouvriers vont plus vite : Construire, onglet Routes et voies. Un chemin de terre suffit, même en montagne.', done: () => (SH.ROADS as { side: string }[]).filter(r => r.side === GAME.side).length >= 1 },
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
