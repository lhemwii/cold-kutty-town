/* ================= interface : barre du haut, menu de construction, batiment selectionne ================= */
// drapeau en SVG, a partir du meme dessin que les drapeaux du jeu
const FLAG_HEX = { b: '#2a45a6', w: '#fbf7ef', r: '#c8283a', y: '#ffd23f', R: '#d42a2a' };
function flagSVG(side){
  const art = FLAG_ART[side]; let s = '<svg viewBox="0 0 13 8" shape-rendering="crispEdges" aria-hidden="true">';
  for (let y = 0; y < 8; y++) for (let x = 0; x < 13; x++) s += '<rect x="' + x + '" y="' + y + '" width="1.05" height="1.05" fill="' + FLAG_HEX[art[y][x]] + '"/>';
  return s + '</svg>';
}
for (const el of document.querySelectorAll('[data-flag]')) el.innerHTML = flagSVG(el.dataset.flag);
const fmt = (v) => { const r = Math.floor(v); return r >= 10000 ? (r / 1000).toFixed(1).replace('.', ',') + ' k' : String(r); };
const fmtRate = (v) => { const r = Math.round(v * 10) / 10; return (r >= 0 ? '+' : '') + String(Math.round(r)).replace('-', '−') + '/min'; };

/* ---- barre du haut ---- */
let hudKey = '';
function renderHUD(){
  if (GAME.mode === 'menu') return;
  const R = RES[GAME.side];
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
  const key = Math.floor(R.laine) + ':' + Math.floor(R.ron) + ':' + Math.floor(R.croq / 5) + ':' + BLD.length;
  if (key !== hudKey){ hudKey = key; refreshPalette(); }
  if (state.sel) renderSel();
}
// detail d'une ressource : qui produit, qui coute
let resPopK = null;
const RES_NAME = { c: 'Croquettes', l: 'Laine', r: 'Ronrons' };
const RES_HELP = { c: 'Les habitants en mangent. En pénurie, ils ne ronronnent plus.', l: 'Sert à construire, à améliorer et à tracer des routes.', r: 'Font avancer ta frontière, paient les avant-postes et les barges.' };
function showResPop(k){
  resPopK = k;
  const R = RES[GAME.side], el = $('resPop'), list = (R.split[k] || []).slice().sort((x, y) => y[1] - x[1]);
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
let buildCat = 'logement';
const THUMBS = {};
// vignette d'un batiment pour un camp, avec le meme moteur que la scene
function thumb(type, side, w, h, lvl){
  const key = type + ':' + side + ':' + w + ':' + (lvl || 1);
  if (THUMBS[key]) return THUMBS[key];
  const saved = { PC, PS, TX, TY, W, H, fb, mb, lb };
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const [fa, fb2] = footOf(type);
  const lot = { a0: -fa / 2, a1: fa / 2, b0: -fb2 / 2, b1: fb2 / 2, ca: 0, cb: 0, side, lvl: lvl || 1, dir: 0 };
  W = w; H = h; fb = new Uint8Array(W * H); mb = new Uint8Array(W * H); lb = new Uint8Array(W * H); PC = 1; PS = 0;
  CUR_SIDE = side;
  try {
    const r = TYPES[type].build(lot, 5), probe = { x0: 1e9, y0: 1e9, x1: -1e9, y1: -1e9 };
    TX = w >> 1; TY = Math.round(h * .62);
    const parts = r.parts.slice().sort((u, v) => (dep(u.a, u.b) + u.zb) - (dep(v.a, v.b) + v.zb));
    const drawAll = () => { for (const d of r.decals || []){ CUR = side === 'ccp' ? M.CCP : M.USC; d(0); } for (const p of parts){ CUR = p.m != null ? p.m : (side === 'ccp' ? M.CCP : M.USC); p.draw(0); } };
    drawAll();
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (fb[y * W + x] || mb[y * W + x]){ probe.x0 = Math.min(probe.x0, x); probe.x1 = Math.max(probe.x1, x); probe.y0 = Math.min(probe.y0, y); probe.y1 = Math.max(probe.y1, y); }
    if (probe.x1 >= 0){ TX += Math.round(w / 2 - (probe.x0 + probe.x1) / 2); TY += Math.round(h / 2 - (probe.y0 + probe.y1) / 2); fb.fill(0); mb.fill(0); lb.fill(0); drawAll(); }
    const cx = cv.getContext('2d'), im = cx.createImageData(w, h), d32 = new Uint32Array(im.data.buffer);
    for (let i = 0; i < w * h; i++) d32[i] = (fb[i] || mb[i]) ? PALL[((mb[i] << 1) | fb[i]) * 5 + lb[i]] : 0;
    cx.putImageData(im, 0, 0);
  } catch (_) {}
  ({ PC, PS, TX, TY, W, H, fb, mb, lb } = saved);
  return THUMBS[key] = cv;
}
function buildMenu(){
  const cats = $('buildCats'); cats.textContent = '';
  for (const [k, label] of CATS_MENU){
    const b = document.createElement('button'); b.className = 'btn cat'; b.type = 'button'; b.setAttribute('role', 'tab'); b.dataset.cat = k; b.textContent = label;
    b.setAttribute('aria-selected', String(k === buildCat));
    b.addEventListener('click', () => { buildCat = k; for (const o of cats.children) o.setAttribute('aria-selected', String(o.dataset.cat === k)); fillPalette(); sfx('click'); });
    cats.appendChild(b);
  }
  fillPalette();
}
function fillPalette(){
  const pal = $('palette'); pal.textContent = '';
  for (const type of Object.keys(ECO)){
    const e = ECO[type]; if (e.cat !== buildCat) continue;
    const b = document.createElement('button'); b.className = 'btn bbtn'; b.type = 'button'; b.setAttribute('role', 'radio'); b.dataset.t = type;
    b.setAttribute('aria-checked', String(type === state.buildType));
    const cv = thumb(type, GAME.side, 72, 56); const img = document.createElement('canvas'); img.width = 72; img.height = 56; img.getContext('2d').drawImage(cv, 0, 0);
    const nm = document.createElement('span'); nm.className = 'bb-name'; nm.textContent = typeName(type, GAME.side);
    const ct = document.createElement('span'); ct.className = 'bb-cost'; ct.textContent = costLabel(priceOf(type, GAME.side));
    const eff = document.createElement('span'); eff.className = 'bb-eff'; eff.textContent = effLine(e);
    b.append(img, nm, ct, eff);
    b.title = typeName(type, GAME.side) + '. ' + (e.desc || '');
    b.addEventListener('click', () => { state.buildType = type; for (const o of pal.children) o.setAttribute('aria-checked', String(o.dataset.t === type)); ghost = null; if (state.tool !== 'build') setTool('build'); $('modeHint').textContent = typeName(type, GAME.side) + ' · ' + (e.desc || ''); sfx('click'); });
    pal.appendChild(b);
  }
  refreshPalette();
}
// ce qu'un batiment rapporte, en une ligne courte
function effLine(e){
  const bits = [];
  if (e.pop) bits.push('+' + e.pop + ' hab.');
  if (e.c > 0) bits.push('+' + e.c + ' croq.'); if (e.l > 0) bits.push('+' + e.l + ' laine'); if (e.r > 0) bits.push('+' + e.r + ' ron.');
  if (e.fun) bits.push(e.fun + ' loisirs');
  if (e.cat === 'frontiere' || e.cat === 'mer') bits.push('rayon ' + e.rad);
  return bits.slice(0, 2).join(' · ');
}
function refreshPalette(){
  const R = RES[GAME.side];
  for (const b of $('palette').children){ const p = priceOf(b.dataset.t, GAME.side); b.classList.toggle('poor', !canAfford(GAME.side, p)); const c = b.querySelector('.bb-cost'); if (c) c.textContent = costLabel(p); }
}

/* ---- batiment selectionne ---- */
function selectBuilding(l){
  state.sel = l || null;
  $('sel').hidden = !l;
  document.body.classList.toggle('sel-open', !!l);
  if (!l) return;
  const pic = $('selPic'), g = pic.getContext('2d'); g.clearRect(0, 0, 96, 72); g.drawImage(thumb(l.type, l.side, 96, 72, l.lvl), 0, 0);
  sfx('click');
  renderSel();
}
$('selClose').addEventListener('click', () => selectBuilding(null));
function renderSel(){
  const l = state.sel; if (!l) return;
  if (!BLD.includes(l)){ selectBuilding(null); return; }
  const e = ECO[l.type], mine = l.side === GAME.side, lv = l.lvl || 1, mult = LVL_MULT[lv - 1];
  const key = [l.id, l.done, l.upT, l.lvl, l.active, Math.floor(RES[GAME.side].laine / 5), Math.floor(RES[GAME.side].ron / 5), !l.done ? Math.floor((GAME.t - l.buildT) / l.bdur * 20) : 0, l.upT ? Math.floor((GAME.t - l.upT) / l.udur * 20) : 0, BOATS.length].join(':');
  if ($('sel').dataset.key === key) return;
  $('sel').dataset.key = key;
  $('selSide').innerHTML = flagSVG(l.side) + '<span>' + CAMP_FULL[l.side] + '</span>';
  $('selName').textContent = typeName(l.type, l.side);
  $('selLvl').textContent = (e && e.up) || LVL_POP[l.type] ? lvlName(l) + ' · niveau ' + lv + ' sur 3' : '';
  const st = $('selState');
  if (!l.done) st.innerHTML = '<span class="pill work">En chantier · ' + Math.floor(clamp((GAME.t - l.buildT) / l.bdur, 0, 1) * 100) + ' %</span>';
  else if (l.upT) st.innerHTML = '<span class="pill work">Amélioration · ' + Math.floor(clamp((GAME.t - l.upT) / l.udur, 0, 1) * 100) + ' %</span>';
  else if (!l.active) st.innerHTML = '<span class="pill bad">À l’arrêt : pas de route jusqu’au QG</span>';
  else st.innerHTML = '<span class="pill ok">En service</span>';
  const rows = [];
  const R = RES[l.side], eff = e && e.jobs ? R.eff : 1;
  if (e){
    const pop = popOf(l); if (pop) rows.push(['Habitants', String(pop)]);
    if (e.jobs) rows.push(['Emplois', Math.round(e.jobs * mult ** .5) + (eff < 1 ? ' (il manque des habitants : ' + Math.round(eff * 100) + ' %)' : '')]);
    for (const [k, nm] of [['c', 'Croquettes'], ['l', 'Laine'], ['r', 'Ronrons']]){
      const v = e[k]; if (!v) continue;
      rows.push([nm, v > 0 ? fmtRate(v * mult * eff * (k === 'r' ? taste(l.type, l.side) : 1)) : fmtRate(v * (1 + (mult - 1) * .5)) + ' (fonctionnement)']);
    }
    if (e.fun) rows.push(['Loisirs', String(Math.round(e.fun * mult * taste(l.type, l.side)))]);
    rows.push(['Influence', 'rayon ' + Math.round(influenceOf(l))]);
  }
  const stats = $('selStats'); stats.textContent = '';
  for (const [a, b] of rows){ const d = document.createElement('div'); const x = document.createElement('span'); x.textContent = a; const y = document.createElement('b'); y.textContent = b; if (b.startsWith('−')) y.className = 'neg'; d.append(x, y); stats.append(d); }
  if (e && e.desc){ const p = document.createElement('p'); p.textContent = e.desc; stats.append(p); }
  const act = $('selActions'); act.textContent = '';
  if (!mine) return;
  const btn = (label, sub, fn, dis) => { const b = document.createElement('button'); b.className = 'btn'; b.type = 'button'; b.innerHTML = '<span>' + label + '</span>' + (sub ? '<i>' + sub + '</i>' : ''); b.disabled = !!dis; b.addEventListener('click', fn); act.append(b); return b; };
  const uc = upCost(l);
  if (uc && l.done) btn('Améliorer', uc.l + ' laine · ' + uc.r + ' ron.', () => { const why = upgradeBuilding(l); if (why) toast(why); else { toast('Amélioration lancée.'); sfx('click'); } renderHUD(); $('sel').dataset.key = ''; renderSel(); }, !!l.upT || !canPay(l.side, uc.l, uc.r));
  if (l.type === 'port' && l.done){
    const bc = BARGE_COST;
    btn('Barge de débarquement', costLabel(bc), () => { if (!canAfford(GAME.side, bc)){ toast('Il faut ' + costLabel(bc) + '.'); return; } state.bargeFrom = l; setTool('barge'); toast('Clique sur la côte où la barge doit accoster.'); }, !canAfford(GAME.side, bc));
  }
  if (l.type === 'port' || l.type === 'pecherie'){ const n = BOATS.filter(b => b.home === l.id).length; const d = document.createElement('p'); d.className = 'sel-note'; d.textContent = n ? n + ' bateau' + (n > 1 ? 'x' : '') + ' en mer ou à quai.' : (l.type === 'port' ? 'Au niveau 2, le port arme des chalutiers, au niveau 3 un cargo.' : 'Un chalutier par niveau.'); act.append(d); }
  if (l.type !== 'qg') btn('Démolir', 'rend ' + Math.round(costOf(l.type) / 2) + ' laine', () => { const refund = demolishBuilding(l); toast(typeName(l.type, l.side) + ' démoli' + (TYPES[l.type].fem ? 'e' : '') + ', ' + refund + ' laine récupérée.'); sfx('demolish', l.ca, l.cb); selectBuilding(null); saveSoon(); renderHUD(); }).classList.add('danger');
}
const BARGE_COST = { l: 40, c: 60, r: 30 };
function bargeTarget(a, b){
  const from = state.bargeFrom; if (!from || !BLD.includes(from)){ setTool('walk'); return; }
  const s = nearestShore(a, b, 60);
  if (!s){ toast('Vise une côte : la barge accoste sur une plage.'); return; }
  const who = sideAt(s[0], s[1]);
  if (who && who !== GAME.side){ toast('Cette côte appartient à l’autre camp.'); return; }
  if (!canAfford(GAME.side, BARGE_COST)){ toast('Il faut ' + costLabel(BARGE_COST) + '.'); return; }
  const b0 = sendBarge(GAME.side, pierEnd(from), s, 'drapeau');
  if (!b0){ toast('Aucune route maritime jusque-là.'); return; }
  pay(GAME.side, BARGE_COST.l, BARGE_COST.r, BARGE_COST.c);
  toast('La barge appareille.'); sfx('click');
  setTool('walk'); renderHUD();
}
