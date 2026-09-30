import { SH } from './00-shared.ts';
import { CAMP_FULL, GAME, H, M, PC, PS, SC, TX, TY, W, clamp, dep, fb, getView, img, lb, mb, setView, state } from './01-core.js';
import { nearestShore } from './02-ground.ts';
import { TYPES } from './04-types.js';
import { typeName } from './05-types-extra.js';
import { VEST_DEF, drawVestige } from './07-world.ts';
import { TER, influenceOf, sideAt, terPct } from './08-territory.ts';
import { footOf } from './10-town.ts';
import { FAR, PALL } from './11-render.js';
import { $, setTool, toast } from './13-ui.js';
/* ================= interface : barre du haut, menu de construction, batiment selectionne ================= */
// icones et drapeaux en pixels : un dessin en caracteres, une couleur par lettre, rendu en SVG net
export function pixelSVG(art, pal, cls){
  const h = art.length, w = Math.max(...art.map(r => r.length));
  let s = '<svg' + (cls ? ' class="' + cls + '"' : '') + ' viewBox="0 0 ' + w + ' ' + h + '" shape-rendering="crispEdges" aria-hidden="true">';
  for (let y = 0; y < h; y++){
    // une ligne = des rectangles qui fusionnent les pixels voisins de meme couleur
    let x = 0;
    while (x < art[y].length){
      const c = art[y][x], col = pal[c]; let n = 1;
      while (x + n < art[y].length && art[y][x + n] === c) n++;
      if (col) s += '<rect x="' + x + '" y="' + y + '" width="' + n + '" height="1.02" fill="' + col + '"/>';
      x += n;
    }
  }
  return s + '</svg>';
}
export const ICONS = {
  // patte de chat : quatre doigts et le coussinet
  paw: [['.....kk..kk.....', '....kPPkkPPk....', '....kPpkkPpk....', '.kk..kk..kk..kk.', 'kPPk........kPPk', 'kPpk..kkkk..kPpk', '.kk..kPPPPk..kk.', '....kPpPPPPk....', '...kPPPPPPPPk...', '...kPPPPPPPPk...', '....kPPkkPPk....', '.....kk..kk.....'],
    { k: '#8a3452', P: '#f28cab', p: '#ffd3df' }],
  // habitants : un grand chat noir et un petit chat gris a cote
  pop: [['.k...k..........', '.kk.kk..........', '.kkkkk.....g...g', '.kykyk.....gg.gg', '.kkkkk.....ggggg', '..kpk......gygyg', '.kkkkk.....ggggg', 'kkkkkkk.....ggg.', 'kkkkkkk....ggggg', 'kkkkkkk...ggggggg', 'kkkkkkkk..ggggggg', '.kkkkk.kk..ggggg.'],
    { k: '#2a2622', y: '#ffe45c', p: '#f28cab', g: '#8e8a93' }]
};
for (const el of document.querySelectorAll('[data-ico]')){ const [art, pal] = ICONS[el.dataset.ico]; el.outerHTML = pixelSVG(art, pal, 'ico'); }
// drapeaux en grand pour l'interface (48 x 26), dessines comme ceux du jeu mais plus fins
// USC : 13 bandes rouges et blanches, la meme tete de chat que la CCR, en blanc, au centre du coin bleu. CCR : tete de chat, marteau et faucille, centres.
export const FLAG_HEX = { b: '#2a45a6', c: '#fbf7ef', w: '#fbf7ef', r: '#c8283a', y: '#ffd23f', R: '#d42a2a' };
export const FLAG_HI = {
  usc: ['bbbbbbbbbbbbbbbbbbbbrrrrrrrrrrrrrrrrrrrrrrrrrrrr', 'bbbbbbbbbbbbbbbbbbbbrrrrrrrrrrrrrrrrrrrrrrrrrrrr',
    'bbbbcbbbbbbbbbcbbbbbwwwwwwwwwwwwwwwwwwwwwwwwwwww', 'bbbbccbbbbbbbccbbbbbwwwwwwwwwwwwwwwwwwwwwwwwwwww',
    'bbbbcccbbbbbcccbbbbbrrrrrrrrrrrrrrrrrrrrrrrrrrrr', 'bbbbcccccccccccbbbbbrrrrrrrrrrrrrrrrrrrrrrrrrrrr',
    'bbbcccccccccccccbbbbwwwwwwwwwwwwwwwwwwwwwwwwwwww', 'bbbccbbcccccbbccbbbbwwwwwwwwwwwwwwwwwwwwwwwwwwww',
    'bbbcccccccccccccbbbbrrrrrrrrrrrrrrrrrrrrrrrrrrrr', 'bbbcccccbbbcccccbbbbrrrrrrrrrrrrrrrrrrrrrrrrrrrr',
    'bbbbcccccbcccccbbbbbwwwwwwwwwwwwwwwwwwwwwwwwwwww', 'bbbbbcccccccccbbbbbbwwwwwwwwwwwwwwwwwwwwwwwwwwww',
    'bbbbbbbbbbbbbbbbbbbbrrrrrrrrrrrrrrrrrrrrrrrrrrrr', 'bbbbbbbbbbbbbbbbbbbbrrrrrrrrrrrrrrrrrrrrrrrrrrrr',
    'wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww', 'wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww',
    'rrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrr', 'rrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrr',
    'wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww', 'wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww',
    'rrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrr', 'rrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrr',
    'wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww', 'wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww',
    'rrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrr', 'rrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrr'],
  ccp: ['RRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRR', 'RRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRR',
    'RRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRR', 'RRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRR',
    'RRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRR', 'RRRRRRRRRRRRRRRRRRRRRRRRRRRRyyyyyyRRRRRRRRRRRRRR',
    'RRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRyyyyRRRRRRRRRRRRR', 'RRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRyyyRRRRRRRRRRRR',
    'RRRRRRRyRRRRRRRRRyRRRRRRRRRRRRRRRRyyyRRRRRRRRRRR', 'RRRRRRRyyRRRRRRRyyRRRRRRRRRRRyyyRRRyyRRRRRRRRRRR',
    'RRRRRRRyyyRRRRRyyyRRRRRRRRRRyyyyRRRyyRRRRRRRRRRR', 'RRRRRRRyyyyyyyyyyyRRRRRRRRRRyyyyRRRyyRRRRRRRRRRR',
    'RRRRRRyyyyyyyyyyyyyRRRRRRRRRyyyyyRyyyRRRRRRRRRRR', 'RRRRRRyyRRyyyyyRRyyRRRRRRRRRRRRRyyyyyRRRRRRRRRRR',
    'RRRRRRyyyyyyyyyyyyyRRRRRRRRRRRRRyyyyRRRRRRRRRRRR', 'RRRRRRyyyyyRRRyyyyyRRRRRRyyyyyyyyyyyyRRRRRRRRRRR',
    'RRRRRRRyyyyyRyyyyyRRRRRRyyyRyyyyyRRyyyyRRRRRRRRR', 'RRRRRRRRyyyyyyyyyRRRRRRRyyRRRRRRRRRRRRyyRRRRRRRR',
    'RRRRRRRRRRRRRRRRRRRRRRRyyyRRRRRRRRRRRRRyyRRRRRRR', 'RRRRRRRRRRRRRRRRRRRRRRyyyRRRRRRRRRRRRRRRyyRRRRRR',
    'RRRRRRRRRRRRRRRRRRRRRRRyyRRRRRRRRRRRRRRRRRRRRRRR', 'RRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRR',
    'RRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRR', 'RRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRR',
    'RRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRR', 'RRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRR']
};
export function flagSVG(side){ return pixelSVG(FLAG_HI[side], FLAG_HEX); }
for (const el of document.querySelectorAll('[data-flag]')) el.innerHTML = flagSVG(el.dataset.flag);
export const fmt = (v) => { const r = Math.floor(v); return r >= 10000 ? (r / 1000).toFixed(1).replace('.', ',') + ' k' : String(r); };
export const fmtRate = (v) => { const r = Math.round(v * 10) / 10; return (r >= 0 ? '+' : '') + String(Math.round(r)).replace('-', '−') + '/min'; };

/* ---- barre du haut ---- */
export let hudKey = '';
export function renderHUD(){
  if (GAME.mode === 'menu') return;
  const R = SH.RES[GAME.side];
  $('vC').textContent = fmt(R.croq); $('vL').textContent = fmt(R.laine); $('vR').textContent = fmt(R.ron); $('vP').textContent = R.pop;
  $('dC').textContent = fmtRate(R.rc); $('dL').textContent = fmtRate(R.rl); $('dR').textContent = fmtRate(R.rr);
  $('dP').textContent = R.jobs ? 'hab. · ' + R.jobs + ' emplois' : 'habitants';
  for (const [k, v, rt] of [['c', R.croq, R.rc], ['l', R.laine, R.rl], ['r', R.ron, R.rr]]){
    const b = document.querySelector('.res[data-k="' + k + '"]');
    b.classList.toggle('warn', (k === 'c' && R.short) || (rt < 0 && v < -rt * 2));
    b.classList.toggle('down', rt < 0);
  }
  const pu = terPct('usc'), pc = terPct('ccp');
  $('tbU').style.width = (pu * 100).toFixed(2) + '%'; $('tbC').style.width = (pc * 100).toFixed(2) + '%';
  $('tbUpct').textContent = 'USC ' + (pu * 100).toFixed(1).replace('.', ',') + ' %';
  $('tbCpct').textContent = 'CCR ' + (pc * 100).toFixed(1).replace('.', ',') + ' %';
  if (resPopK) showResPop(resPopK);
  const key = Math.floor(R.laine) + ':' + Math.floor(R.ron) + ':' + Math.floor(R.croq / 5) + ':' + SH.BLD.length;
  if (key !== hudKey){ hudKey = key; refreshPalette(); }
  if (state.sel) renderSel(); else if (state.selV) renderVest();
}
// detail d'une ressource : qui produit, qui coute
export let resPopK = null;
export const RES_NAME = { c: 'Croquettes', l: 'Laine', r: 'Ronrons' };
export const RES_HELP = { c: 'Les habitants en mangent. En pénurie, ils ne ronronnent plus.', l: 'Sert à construire, à améliorer et à tracer des routes.', r: 'Font avancer ta frontière, paient les avant-postes et les barges.' };
export function showResPop(k){
  resPopK = k;
  const R = SH.RES[GAME.side], el = $('resPop'), list = (R.split[k] || []).slice().sort((x, y) => y[1] - x[1]);
  el.textContent = '';
  const h = document.createElement('div'); h.className = 'rp-head'; h.textContent = RES_NAME[k]; el.append(h);
  const p = document.createElement('p'); p.textContent = RES_HELP[k]; el.append(p);
  for (const [why, v] of list){ const row = document.createElement('div'); row.className = 'rp-row' + (v < 0 ? ' neg' : ''); const a = document.createElement('span'); a.textContent = why; const b = document.createElement('b'); b.textContent = fmtRate(v); row.append(a, b); el.append(row); }
  if (!list.length){ const row = document.createElement('div'); row.className = 'rp-row'; row.textContent = 'Rien pour l’instant.'; el.append(row); }
  if (k === 'r'){ const row = document.createElement('div'); row.className = 'rp-foot'; row.textContent = 'Conquête : ' + TER.rate[GAME.side].toFixed(0) + ' cases par seconde.'; el.append(row); }
  el.hidden = false;
  const btn = document.querySelector('.res[data-k="' + k + '"]').getBoundingClientRect();
  el.style.left = Math.round(Math.min(btn.left, window.innerWidth - el.offsetWidth - 8)) + 'px'; el.style.top = Math.round(btn.bottom + 8) + 'px';
}
for (const b of document.querySelectorAll('.res[data-k]')){
  b.addEventListener('mouseenter', () => showResPop(b.dataset.k));
  b.addEventListener('focus', () => showResPop(b.dataset.k));
  b.addEventListener('mouseleave', () => { resPopK = null; $('resPop').hidden = true; });
  b.addEventListener('blur', () => { resPopK = null; $('resPop').hidden = true; });
  b.addEventListener('click', () => { if (resPopK === b.dataset.k && !$('resPop').hidden){ resPopK = null; $('resPop').hidden = true; } else showResPop(b.dataset.k); });
}

/* ---- menu de construction : categories et vignettes dessinees par le moteur ---- */
export let buildCat = 'logement';
export const THUMBS = {};
// vignette d'un batiment pour un camp, avec le meme moteur que la scene
export function thumb(type, side, w, h, lvl){
  const key = type + ':' + side + ':' + w + ':' + (lvl || 1);
  if (THUMBS[key]) return THUMBS[key];
  const saved = getView();
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const [fa, fb2] = footOf(type);
  const lot = { a0: -fa / 2, a1: fa / 2, b0: -fb2 / 2, b1: fb2 / 2, ca: 0, cb: 0, side, lvl: lvl || 1, dir: 0 };
  setView({ W: w, H: h, fb: new Uint8Array(w * h), mb: new Uint8Array(w * h), lb: new Uint8Array(w * h), PC: 1, PS: 0, SC: 1 });
  SH.CUR_SIDE = side;
  try {
    const r = TYPES[type].build(lot, 5), probe = { x0: 1e9, y0: 1e9, x1: -1e9, y1: -1e9 };
    setView({ TX: w >> 1, TY: Math.round(h * .62) });
    const parts = r.parts.slice().sort((u, v) => (dep(u.a, u.b) + u.zb) - (dep(v.a, v.b) + v.zb));
    const drawAll = () => { for (const d of r.decals || []){ SH.CUR = side === 'ccp' ? M.CCP : M.USC; d(0); } for (const p of parts){ SH.CUR = p.m != null ? p.m : (side === 'ccp' ? M.CCP : M.USC); p.draw(0); } };
    drawAll();
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (fb[y * W + x] || mb[y * W + x]){ probe.x0 = Math.min(probe.x0, x); probe.x1 = Math.max(probe.x1, x); probe.y0 = Math.min(probe.y0, y); probe.y1 = Math.max(probe.y1, y); }
    if (probe.x1 >= 0){ setView({ TX: TX + Math.round(w / 2 - (probe.x0 + probe.x1) / 2), TY: TY + Math.round(h / 2 - (probe.y0 + probe.y1) / 2) }); fb.fill(0); mb.fill(0); lb.fill(0); drawAll(); }
    const cx = cv.getContext('2d'), im = cx.createImageData(w, h), d32 = new Uint32Array(im.data.buffer);
    for (let i = 0; i < w * h; i++) d32[i] = (fb[i] || mb[i]) ? PALL[((mb[i] << 1) | fb[i]) * 5 + lb[i]] : 0;
    cx.putImageData(im, 0, 0);
  } catch (_) {}
  setView(saved);
  return THUMBS[key] = cv;
}
// vignette d'un vestige, faite comme celles des batiments
export function vestThumb(kind, w, h){
  const key = 'vest:' + kind + ':' + w; if (THUMBS[key]) return THUMBS[key];
  const saved = getView();
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  setView({ W: w, H: h, fb: new Uint8Array(w * h), mb: new Uint8Array(w * h), lb: new Uint8Array(w * h), PC: 1, PS: 0, SC: 1 });
  try {
    const v = { kind, a: 0, b: 0, ang: 0 };
    setView({ TX: w >> 1, TY: Math.round(h * .62) }); drawVestige(v);
    let x0 = 1e9, x1 = -1, y0 = 1e9, y1 = -1;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (fb[y * W + x] || mb[y * W + x]){ x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    if (x1 >= 0){ setView({ TX: TX + Math.round(w / 2 - (x0 + x1) / 2), TY: TY + Math.round(h / 2 - (y0 + y1) / 2) }); fb.fill(0); mb.fill(0); lb.fill(0); drawVestige(v); }
    const cx = cv.getContext('2d'), im = cx.createImageData(w, h), d32 = new Uint32Array(im.data.buffer);
    for (let i = 0; i < w * h; i++) d32[i] = (fb[i] || mb[i]) ? PALL[((mb[i] << 1) | fb[i]) * 5 + lb[i]] : 0;
    cx.putImageData(im, 0, 0);
  } catch (_) {}
  setView(saved);
  return THUMBS[key] = cv;
}
export function buildMenu(){
  const cats = $('buildCats'); cats.textContent = '';
  for (const [k, label] of SH.CATS_MENU){
    const b = document.createElement('button'); b.className = 'btn cat'; b.type = 'button'; b.setAttribute('role', 'tab'); b.dataset.cat = k; b.textContent = label;
    b.setAttribute('aria-selected', String(k === buildCat));
    b.addEventListener('click', () => { buildCat = k; for (const o of cats.children) o.setAttribute('aria-selected', String(o.dataset.cat === k)); fillPalette(); SH.sfx('click'); });
    cats.appendChild(b);
  }
  fillPalette();
}
export function fillPalette(){
  const pal = $('palette'); pal.textContent = '';
  for (const type of Object.keys(SH.ECO)){
    const e = SH.ECO[type]; if (e.cat !== buildCat) continue;
    const b = document.createElement('button'); b.className = 'btn bbtn'; b.type = 'button'; b.setAttribute('role', 'radio'); b.dataset.t = type;
    b.setAttribute('aria-checked', String(type === state.buildType));
    const cv = thumb(type, GAME.side, 72, 56); const img = document.createElement('canvas'); img.width = 72; img.height = 56; img.getContext('2d').drawImage(cv, 0, 0);
    const nm = document.createElement('span'); nm.className = 'bb-name'; nm.textContent = typeName(type, GAME.side);
    const ct = document.createElement('span'); ct.className = 'bb-cost'; ct.textContent = SH.costLabel(SH.priceOf(type, GAME.side));
    const eff = document.createElement('span'); eff.className = 'bb-eff'; eff.textContent = effLine(e);
    b.append(img, nm, ct, eff);
    b.title = typeName(type, GAME.side) + '. ' + (e.desc || '');
    b.addEventListener('click', () => { state.buildType = type; for (const o of pal.children) o.setAttribute('aria-checked', String(o.dataset.t === type)); SH.ghost = null; if (state.tool !== 'build') setTool('build'); $('modeHint').textContent = typeName(type, GAME.side) + ' · ' + (e.desc || ''); SH.sfx('click'); });
    pal.appendChild(b);
  }
  refreshPalette();
}
// ce qu'un batiment rapporte, en une ligne courte
export function effLine(e){
  const bits = [];
  if (e.pop) bits.push('+' + e.pop + ' hab.');
  if (e.c > 0) bits.push('+' + e.c + ' croq.'); if (e.l > 0) bits.push('+' + e.l + ' laine'); if (e.r > 0) bits.push('+' + e.r + ' ron.');
  if (e.fun) bits.push(e.fun + ' loisirs');
  if (e.cat === 'frontiere' || e.cat === 'mer') bits.push('rayon ' + e.rad);
  return bits.slice(0, 2).join(' · ');
}
export function refreshPalette(){
  const R = SH.RES[GAME.side];
  for (const b of $('palette').children){ const p = SH.priceOf(b.dataset.t, GAME.side); b.classList.toggle('poor', !SH.canAfford(GAME.side, p)); const c = b.querySelector('.bb-cost'); if (c) c.textContent = SH.costLabel(p); }
}

/* ---- batiment selectionne ---- */
export function selectBuilding(l){
  state.sel = l || null; state.selV = null;
  $('sel').hidden = !l;
  document.body.classList.toggle('sel-open', !!l);
  if (!l) return;
  const pic = $('selPic'), g = pic.getContext('2d'); g.clearRect(0, 0, 96, 72); g.drawImage(thumb(l.type, l.side, 96, 72, l.lvl), 0, 0);
  SH.sfx('click');
  renderSel();
}
$('selClose').addEventListener('click', () => selectBuilding(null));
/* ---- vestiges catzi : le meme panneau, avec un bouton pour fouiller ---- */
export const vestLoot = (L) => [L.c ? L.c + ' croquettes' : '', L.l ? L.l + ' laine' : '', L.r ? L.r + ' ronrons' : ''].filter(Boolean).join(' · ');
export function lootVestige(v, side){
  if (!v || v.looted) return 'Ces ruines ont déjà été fouillées.';
  if (sideAt(v.a, v.b) !== side) return 'Ces ruines sont hors de ton territoire : étends-toi jusqu’à elles.';
  const L = VEST_DEF[v.kind].loot, R = SH.RES[side];
  R.croq += L.c; R.laine += L.l; R.ron += L.r;
  v.looted = true; FAR.cache.delete(v); SH.mapDirtyRect(v.a - 12, v.a + 12, v.b - 12, v.b + 12);
  return '';
}
export function selectVestige(v){
  selectBuilding(null);
  state.selV = v; $('sel').hidden = false; document.body.classList.add('sel-open');
  const g = $('selPic').getContext('2d'); g.clearRect(0, 0, 96, 72); g.drawImage(vestThumb(v.kind, 96, 72), 0, 0);
  SH.sfx('click'); renderVest();
}
export function renderVest(){
  const v = state.selV; if (!v) return;
  if (v.looted){ selectBuilding(null); return; }
  const D = VEST_DEF[v.kind], mine = sideAt(v.a, v.b) === GAME.side;
  $('sel').dataset.key = '';
  $('selSide').innerHTML = '<span>Ancien régime catzi</span>';
  $('selName').textContent = D.name; $('selLvl').textContent = 'Vestige';
  $('selState').innerHTML = mine ? '<span class="pill ok">Dans ton territoire : à fouiller</span>' : '<span class="pill bad">Hors de ton territoire</span>';
  const stats = $('selStats'); stats.textContent = '';
  const d = document.createElement('div'), x = document.createElement('span'), y = document.createElement('b'); x.textContent = 'Butin'; y.textContent = vestLoot(D.loot); d.append(x, y); stats.append(d);
  const p = document.createElement('p'); p.textContent = D.desc; stats.append(p);
  const act = $('selActions'); act.textContent = '';
  const b = document.createElement('button'); b.className = 'btn'; b.type = 'button'; b.innerHTML = '<span>Fouiller</span><i>' + vestLoot(D.loot) + '</i>'; b.disabled = !mine;
  b.addEventListener('click', () => {
    const why = lootVestige(v, GAME.side); if (why){ toast(why); return; }
    toast(D.name + ' fouillé' + (v.kind === 'statue' ? 'e' : '') + ' : ' + vestLoot(D.loot) + '.');
    const L = D.loot; SH.floatText(v.a, v.b, '+' + [L.c ? L.c + ' croq.' : '', L.l ? L.l + ' laine' : '', L.r ? L.r + ' ron.' : ''].filter(Boolean).join(' '));
    SH.sfx('demolish', v.a, v.b); selectBuilding(null); SH.saveSoon(); renderHUD();
  });
  act.append(b);
  if (!mine){ const n = document.createElement('p'); n.className = 'sel-note'; n.textContent = 'Pose un avant-poste ou un bâtiment à côté pour que ton territoire l’atteigne.'; act.append(n); }
}
export function renderSel(){
  const l = state.sel; if (!l) return;
  if (!SH.BLD.includes(l)){ selectBuilding(null); return; }
  const e = SH.ECO[l.type], mine = l.side === GAME.side, lv = l.lvl || 1, mult = SH.LVL_MULT[lv - 1];
  const key = [l.id, l.done, l.upT, l.lvl, l.active, Math.floor(SH.RES[GAME.side].laine / 5), Math.floor(SH.RES[GAME.side].ron / 5), !l.done ? Math.floor((GAME.t - l.buildT) / l.bdur * 20) : 0, l.upT ? Math.floor((GAME.t - l.upT) / l.udur * 20) : 0, SH.BOATS.length].join(':');
  if ($('sel').dataset.key === key) return;
  $('sel').dataset.key = key;
  $('selSide').innerHTML = flagSVG(l.side) + '<span>' + CAMP_FULL[l.side] + '</span>';
  $('selName').textContent = typeName(l.type, l.side);
  $('selLvl').textContent = (e && e.up) || SH.LVL_POP[l.type] ? SH.lvlName(l) + ' · niveau ' + lv + ' sur 3' : '';
  const st = $('selState');
  if (!l.done) st.innerHTML = '<span class="pill work">En chantier · ' + Math.floor(clamp((GAME.t - l.buildT) / l.bdur, 0, 1) * 100) + ' %</span>';
  else if (l.upT) st.innerHTML = '<span class="pill work">Amélioration · ' + Math.floor(clamp((GAME.t - l.upT) / l.udur, 0, 1) * 100) + ' %</span>';
  else if (!l.active) st.innerHTML = '<span class="pill bad">À l’arrêt : pas de route jusqu’au QG</span>';
  else st.innerHTML = '<span class="pill ok">En service</span>';
  const rows = [];
  const R = SH.RES[l.side], eff = e && e.jobs ? R.eff : 1;
  if (e){
    const pop = SH.popOf(l); if (pop) rows.push(['Habitants', String(pop)]);
    if (e.jobs) rows.push(['Emplois', Math.round(e.jobs * mult ** .5) + (eff < 1 ? ' (il manque des habitants : ' + Math.round(eff * 100) + ' %)' : '')]);
    for (const [k, nm] of [['c', 'Croquettes'], ['l', 'Laine'], ['r', 'Ronrons']]){
      const v = e[k]; if (!v) continue;
      rows.push([nm, v > 0 ? fmtRate(v * mult * eff * (k === 'r' ? SH.taste(l.type, l.side) : 1)) : fmtRate(v * (1 + (mult - 1) * .5)) + ' (fonctionnement)']);
    }
    if (e.fun) rows.push(['Loisirs', String(Math.round(e.fun * mult * SH.taste(l.type, l.side)))]);
    rows.push(['Influence', 'rayon ' + Math.round(influenceOf(l))]);
  }
  const stats = $('selStats'); stats.textContent = '';
  for (const [a, b] of rows){ const d = document.createElement('div'); const x = document.createElement('span'); x.textContent = a; const y = document.createElement('b'); y.textContent = b; if (b.startsWith('−')) y.className = 'neg'; d.append(x, y); stats.append(d); }
  if (e && e.desc){ const p = document.createElement('p'); p.textContent = e.desc; stats.append(p); }
  const act = $('selActions'); act.textContent = '';
  if (!mine) return;
  const btn = (label, sub, fn, dis) => { const b = document.createElement('button'); b.className = 'btn'; b.type = 'button'; b.innerHTML = '<span>' + label + '</span>' + (sub ? '<i>' + sub + '</i>' : ''); b.disabled = !!dis; b.addEventListener('click', fn); act.append(b); return b; };
  const uc = SH.upCost(l);
  if (uc && l.done) btn('Améliorer', uc.l + ' laine · ' + uc.r + ' ron.', () => { const why = SH.upgradeBuilding(l); if (why) toast(why); else { toast('Amélioration lancée.'); SH.sfx('click'); } renderHUD(); $('sel').dataset.key = ''; renderSel(); }, !!l.upT || !SH.canPay(l.side, uc.l, uc.r));
  if (l.type === 'port' && l.done){
    const bc = BARGE_COST;
    btn('Barge de débarquement', SH.costLabel(bc), () => { if (!SH.canAfford(GAME.side, bc)){ toast('Il faut ' + SH.costLabel(bc) + '.'); return; } state.bargeFrom = l; setTool('barge'); toast('Clique sur la côte où la barge doit accoster.'); }, !SH.canAfford(GAME.side, bc));
  }
  if (l.type === 'port' || l.type === 'pecherie'){ const n = SH.BOATS.filter(b => b.home === l.id).length; const d = document.createElement('p'); d.className = 'sel-note'; d.textContent = n ? n + ' bateau' + (n > 1 ? 'x' : '') + ' en mer ou à quai.' : (l.type === 'port' ? 'Au niveau 2, le port arme des chalutiers, au niveau 3 un cargo.' : 'Un chalutier par niveau.'); act.append(d); }
  if (l.type !== 'qg') btn('Démolir', 'rend ' + Math.round(SH.costOf(l.type) / 2) + ' laine', () => { const refund = SH.demolishBuilding(l); toast(typeName(l.type, l.side) + ' démoli' + (TYPES[l.type].fem ? 'e' : '') + ', ' + refund + ' laine récupérée.'); SH.sfx('demolish', l.ca, l.cb); selectBuilding(null); SH.saveSoon(); renderHUD(); }).classList.add('danger');
}
export const BARGE_COST = { l: 40, c: 60, r: 30 };
export function bargeTarget(a, b){
  const from = state.bargeFrom; if (!from || !SH.BLD.includes(from)){ setTool('walk'); return; }
  const s = nearestShore(a, b, 60);
  if (!s){ toast('Vise une côte : la barge accoste sur une plage.'); return; }
  const who = sideAt(s[0], s[1]);
  if (who && who !== GAME.side){ toast('Cette côte appartient à l’autre camp.'); return; }
  if (!SH.canAfford(GAME.side, BARGE_COST)){ toast('Il faut ' + SH.costLabel(BARGE_COST) + '.'); return; }
  const b0 = SH.sendBarge(GAME.side, SH.pierEnd(from), s, 'drapeau');
  if (!b0){ toast('Aucune route maritime jusque-là.'); return; }
  SH.pay(GAME.side, BARGE_COST.l, BARGE_COST.r, BARGE_COST.c);
  toast('La barge appareille.'); SH.sfx('click');
  setTool('walk'); renderHUD();
}

// appeles depuis des modules plus petits en numero
Object.assign(SH, { renderHUD, selectBuilding, selectVestige, bargeTarget });
