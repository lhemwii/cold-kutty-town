import { SH, type Building, type BuiltParts, type Side } from './00-shared.ts';
import { GAME, H, HOOKS, M, W, boxS, bz, dep, drawStar, fput, gableRoof2, gableWalls, hash2, line3, prj, wallFace, win, winColor } from './01-core.ts';
import { GA0, GB0, GH, GSC, GW, T_ROCK, T_SEA, baseAt } from './02-ground.ts';
import { Lc, facadePlate, frontVisible, houseGeo, part, sideLight, smokeAt, wallBase } from './03-buildings-base.ts';
import { TYPES, pyramid } from './04-types.ts';
import { drawCyl } from './06-types-more.ts';
import { PEAKS, TREES, addStump, treesIn, type Drawable } from './07-world.ts';
import { FOOT } from './10-town.ts';
import { $, ICONS, ico } from './13-ui.ts';
import { CATS_MENU, ECO, FOREST_R, METIERS, METIER_NAME, PRIO, RES, XRES, XRES_NAME, bdef, treesAround, type DepositKind, type Metier, type XRes } from './15-economy.ts';
/* ================= etape 3 : les nouvelles ressources ================= */
// Les batiments se paient toujours en croquettes, laine et ronrons. Ce module ajoute ce qui les fait monter :
// le luxe (pate, tricot, herbe a chat), les Catcoins, le charbon, l'uranium et le petrole tires du sol,
// l'electricite et l'eau en reseaux, et l'onglet Ressources qui montre tout cela.

/* ---- icones ---- */
Object.assign(ICONS, {
  // pate : une boite de conserve a etiquette
  pate: [['..kkkkkkkk..', '.kssssssssk.', '.kkkkkkkkkk.', '.krrrrrrrrk.', '.kryyyyyyrk.', '.kryooooyrk.', '.kryooooyrk.', '.kryyyyyyrk.', '.krrrrrrrrk.', '.kkkkkkkkkk.', '.kssssssssk.', '..kkkkkkkk..'],
    { k: '#3a220f', s: '#c9ced6', r: '#c8283a', y: '#ffe9b0', o: '#c9782f' }],
  // tricot : une pelote et deux aiguilles croisees
  tricot: [['n.........n.', '.n.......n..', '..n.....n...', '...kkkkk....', '..kwwpwwk...', '.kwpwwwpwk..', '.kwwwpwwwk..', '.kwpwwwpwk..', '..kwwpwwk...', '...kkkkk....', '.n.......n..', 'n.........n.'],
    { k: '#5b3f82', w: '#e8e1f0', p: '#8f6fb5', n: '#b08254' }],
  // herbe a chat : trois feuilles dentelees
  herbe: [['.....g......', '....gGg.....', '...gGGGg....', '...gGgGg....', '.g..gGg..g..', 'gGg..g..gGg.', 'GGGg.g.gGGG.', 'gGGGgggGGGg.', '.gGGGgGGGg..', '...gggggg...', '.....g......', '.....g......'],
    { g: '#2f6b2a', G: '#7cc46a' }],
  // Catcoins : une piece doree a tete de chat
  coins: [['...kkkkkk...', '..kyyyyyyk..', '.kyYk..kYyk.', 'kyYYkkkkYYyk', 'kyYkYkkYkYyk', 'kyYkkkkkkYyk', 'kyYYkppkYYyk', 'kyYYYkkYYYyk', '.kyYYYYYYyk.', '..kyyyyyyk..', '...kkkkkk...', '............'],
    { k: '#8a6a10', y: '#d9a21e', Y: '#ffd23f', p: '#f28cab' }],
  // charbon : des morceaux noirs
  charbon: [['............', '....kkk.....', '...kggkk....', '..kgkkkk.kk.', '..kkkkkkkggk', '.kkgkk.kkkkk', 'kkkkkkk.kgkk', 'kgkkkkkkkkk.', '.kkkkgkkk...', '..kkkkk.....', '............', '............'],
    { k: '#24262b', g: '#6c7078' }],
  // uranium : une roche qui luit
  uranium: [['............', '.....kk.....', '....kGGk....', '...kGgGGk...', '..kGGGGgGk..', '.kGgGGGGGGk.', '.kGGGGgGGGk.', '..kGGGGGGk..', '...kkkkkk...', '..g......g..', '.g........g.', '............'],
    { k: '#2d5a1f', G: '#9be36a', g: '#c9ff8a' }],
  // petrole : une goutte noire luisante
  petrole: [['.....k......', '....kk......', '....kkk.....', '...kkkkk....', '...kkwkkk...', '..kkwkkkkk..', '..kwkkkkkk..', '.kkkkkkkkkk.', '.kkkkkkkkkk.', '..kkkkkkkk..', '...kkkkkk...', '............'],
    { k: '#1b1c20', w: '#9aa0aa' }],
  // electricite : un eclair
  elec: [['......kkk...', '.....kyyk...', '....kyyk....', '...kyyk.....', '..kyyyykkk..', '.kkkkyyyyk..', '....kyyyk...', '...kyyk.....', '..kyyk......', '..kyk.......', '..kk........', '............'],
    { k: '#8a6a10', y: '#ffd23f' }],
  // eau : une goutte bleue
  eau: [['.....b......', '....bb......', '....bBb.....', '...bBBBb....', '...bBwBBb...', '..bBwBBBBb..', '..bwBBBBBb..', '.bBBBBBBBBb.', '.bBBBBBBBBb.', '..bBBBBBBb..', '...bbbbbb...', '............'],
    { b: '#1d4f86', B: '#46b6d4', w: '#dff3ff' }],
  // influence : un haut-parleur et ses ondes
  influence: [['............', '......k...k.', '.....kk..k..', 'kkk.kwk.k..k', 'kwwkwwk..k.k', 'kwwkwwk..k.k', 'kwwkwwk..k.k', 'kkk.kwk.k..k', '.....kk..k..', '......k...k.', '............', '............'],
    { k: '#2a2622', w: '#ffd23f' }],
  // industrie et services pour les onglets ; science et armee pour plus tard
  science: [['....kkkk....', '....kwwk....', '....kwwk....', '....kwwk....', '...kwwwwk...', '..kwwbbwwk..', '.kwbbbbbbwk.', 'kwbbBbbbbbwk', 'kbbbbbBbbbbk', 'kbbBbbbbbbbk', '.kkkkkkkkkk.', '............'],
    { k: '#24262b', w: '#e8eaee', b: '#46b6d4', B: '#dff3ff' }],
  armee: [['............', '.....kk.....', '....kggk....', '..kkggggkk..', '.kggggggggk.', 'kgggkggkgggk', 'kggggggggggk', 'kkkkkkkkkkkk', 'kwkwkwkwkwkk', '.kkkkkkkkkk.', '............', '............'],
    { k: '#24262b', g: '#4d5a32', w: '#7e8c55' }],
});

/* ---- gisements : charbon et uranium au pied des montagnes, petrole dans les plaines ---- */
export interface Deposit { id: number; kind: DepositKind; a: number; b: number }
export const DEPOSITS: Deposit[] = [];
SH.DEPOSITS = DEPOSITS;
HOOKS.world.push((seed: number) => {
  DEPOSITS.length = 0;
  const area = (GW / GSC) * (GH / GSC) / (1600 * 1080), want: Record<DepositKind, number> = { charbon: Math.round(6 * area) + 2, uranium: Math.round(2 * area) + 1, petrole: Math.round(4 * area) + 1 };
  let id = 0;
  const far = (a: number, b: number) => DEPOSITS.every(d => Math.hypot(d.a - a, d.b - b) > 60);
  // au pied d'une montagne : sur la roche du bord, la ou une mine peut s'adosser
  const peaks = PEAKS.list.slice();
  for (const kind of ['charbon', 'uranium'] as const){
    let n = 0;
    for (let k = 0; k < 400 && n < want[kind] && peaks.length; k++){
      const pk = peaks[Math.floor(hash2(seed + k * 7, kind === 'charbon' ? 11 : 23) * peaks.length)], an = hash2(seed + k, 31) * Math.PI * 2, r = pk.R * (1.05 + hash2(k, seed) * .25);
      const a = pk.a + Math.cos(an) * r, b = pk.b + Math.sin(an) * r, t = baseAt(a, b);
      if (t === T_SEA || !far(a, b)) continue;
      DEPOSITS.push({ id: id++, kind, a, b }); n++;
    }
  }
  // petrole : en plaine, loin de la roche
  let n = 0;
  for (let k = 0; k < 600 && n < want.petrole; k++){
    const a = GA0 + 40 + hash2(seed + k * 3, 41) * (GW / GSC - 80), b = GB0 + 40 + hash2(seed + k * 5, 43) * (GH / GSC - 80), t = baseAt(a, b);
    if (t === T_SEA || t === T_ROCK || !far(a, b)) continue;
    let ok = true; for (const [da, db] of [[20, 0], [-20, 0], [0, 20], [0, -20]]) if (baseAt(a + da, b + db) === T_SEA) ok = false;
    if (!ok) continue;
    DEPOSITS.push({ id: id++, kind: 'petrole', a, b }); n++;
  }
});
export const depositNear = (kind: DepositKind, a: number, b: number, r: number): Deposit | null => { let best: Deposit | null = null, bd = r; for (const d of DEPOSITS){ if (d.kind !== kind) continue; const dd = Math.hypot(d.a - a, d.b - b); if (dd < bd){ bd = dd; best = d; } } return best; };
// le gisement a l'ecran : des morceaux noirs (charbon), une roche qui luit (uranium), une flaque noire (petrole)
export function drawDeposit(d: Deposit, t: number){
  const p = prj(d.a, d.b, 0), x = Math.round(p[0]), y = Math.round(p[1]);
  if (d.kind === 'petrole'){ SH.CUR = M.ROAD; for (let dy = -2; dy <= 2; dy++) for (let dx = -5; dx <= 5; dx++) if ((dx * dx) / 25 + (dy * dy) / 5 <= 1) fput(x + dx, y + dy, (dx === -2 && dy === -1) ? 1 : 0); return; }
  const glow = d.kind === 'uranium';
  for (let k = 0; k < 7; k++){
    const dx = Math.round((hash2(d.id, k) - .5) * 12), dy = Math.round((hash2(k, d.id) - .5) * 5);
    SH.CUR = glow ? M.FW_GREEN : M.ROAD;
    fput(x + dx, y + dy, 0); fput(x + dx + 1, y + dy, 0); fput(x + dx, y + dy - 1, glow && Math.sin(t * 3 + k) > .3 ? 1 : 0);
  }
}
HOOKS.dyn.push((t: number, out: Drawable[]) => {
  if (GAME.mode === 'menu') return;
  for (const d of DEPOSITS){
    if (SH.fogSeen && !SH.fogSeen(GAME.side, d.a, d.b)) continue;
    const q = prj(d.a, d.b, 0); if (q[0] < -20 || q[0] > W + 20 || q[1] < -20 || q[1] > H + 20) continue;
    out.push({ d: dep(d.a, d.b) - 2, a: d.a, b: d.b, f: (tt: number) => drawDeposit(d, tt) });
  }
});

/* ---- regles de pose : gisement, eau, foret ---- */
HOOKS.place.push((type: string, side: Side, ca: number, cb: number): string => {
  const e = ECO[type]; if (!e) return '';
  if (e.deposit){
    const d = depositNear(e.deposit, ca, cb, 18);
    if (!d) return 'Pose-la sur un gisement de ' + XRES_NAME[e.deposit].toLowerCase() + ' (les explorateurs les découvrent).';
    if (SH.BLD.some((l: Building) => ECO[l.type] && ECO[l.type].deposit === e.deposit && Math.hypot(l.ca - d.a, l.cb - d.b) < 18)) return 'Ce gisement est déjà exploité.';
    if (SH.fogSeen && !SH.fogSeen(side, d.a, d.b)) return 'Ce gisement n’a pas encore été découvert.';
  }
  if (e.nearWater){ let ok = false; for (let k = 0; k < 16 && !ok; k++){ const an = k * Math.PI / 8; for (const r of [16, 24, 32]) if (baseAt(ca + Math.cos(an) * r, cb + Math.sin(an) * r) === T_SEA || (SH.riverAt && SH.riverAt(ca + Math.cos(an) * r, cb + Math.sin(an) * r))) ok = true; } if (!ok) return 'Elle se pose près de l’eau (mer ou rivière).'; }
  if (e.forest){ const l = { ca, cb } as Building; if (treesAround(l, FOREST_R) < 12) return 'Il faut une forêt autour.'; }
  if (e.tech && SH.hasTech && !SH.hasTech(side, e.tech)) return 'Il faut d’abord la recherche « ' + (SH.techName ? SH.techName(e.tech) : e.tech) + ' ».';
  return '';
});

/* ---- l'exploitation forestiere abat un arbre de temps en temps ---- */
let forestAcc = 0;
HOOKS.step.push((dt: number) => {
  if (GAME.mode !== 'play') return;
  forestAcc += dt; if (forestAcc < 12) return; forestAcc = 0;
  for (const l of SH.BLD as Building[]){
    if (l.type !== 'foret' || !l.done || !l.active) continue;
    let pick: { a: number; b: number; alive: boolean } | null = null;
    treesIn(l.ca - FOREST_R, l.ca + FOREST_R, l.cb - FOREST_R, l.cb + FOREST_R, (t) => { if (!pick && t.alive && Math.hypot(t.a - l.ca, t.b - l.cb) < FOREST_R && Math.hypot(t.a - l.ca, t.b - l.cb) > 12) pick = t; });
    if (pick){ const p: { a: number; b: number; alive: boolean } = pick; p.alive = false; addStump(p.a, p.b); TREES.ver++; }
  }
});

/* ---- les nouveaux batiments : fiches et dessins ---- */
const ccpOf = (lot: Building) => lot.side === 'ccp';
function factoryBox(a0: number, a1: number, b0: number, b1: number, hh: number, seed: number){
  boxS(a0, a1, b0, b1, 0, hh, (u: number, h: number, x: number, y: number, k: number) => {
    const len = (k & 1) ? b1 - b0 : a1 - a0;
    if (k === 0 && Math.abs(u - len / 2) < 2 && h < 4.5) return (Math.abs(u - len / 2) > 1.5 || h > 4) ? 1 : 0;
    if (h > 2.5 && h < 5.5){ const ph = u % 4; if (ph > 1 && ph < 3.2) return hash2(Math.floor(u / 4) + k * 9, seed) < .5 ? winColor('in', true, x, y) : 1; }
    if (h > hh - 1) return 1;
    return wallBase(k, x, y);
  }, (x: number, y: number) => bz(x, y) < 2 ? 1 : 0);
}
Object.assign(TYPES, {
  conserverie: { name: 'Conserverie', nameCCP: 'Combinat du pâté', fem: true, build(lot: Building, seed: number): BuiltParts {
    const ccp = ccpOf(lot), a0 = lot.ca - 12, a1 = lot.ca + 12, b0 = lot.cb - 8, b1 = lot.cb + 6, hh = 9;
    const body = () => { SH.CUR = ccp ? M.CONCRETE : M.BRICK; factoryBox(a0, a1, b0, b1, hh, seed); SH.CUR = M.CHROME; drawCyl(lot.ca + 5, lot.cb - 1, hh, 3, 5, true); SH.CUR = ccp ? M.FLAG_RED : M.FLAG_BLUE; drawCyl(lot.ca + 5, lot.cb - 1, hh + 1.5, 3.05, 2, false); };
    const stack = (t: number) => { SH.CUR = M.METAL; drawCyl(a0 + 3, b0 + 3, hh, 1.5, 12, true); const p = prj(a0 + 3, b0 + 3, hh + 12); smokeAt(p[0], p[1] - 1, t, seed); };
    return { parts: [part(lot.ca, lot.cb, 0, body), part(a0 + 3, b0 + 3, .4, stack), part(lot.ca, lot.cb, .7, () => facadePlate(ccp ? 'PATE' : 'PATE', lot.ca - 3, b1, b0, hh + .5))],
      lights: [sideLight(a0, a1, b0, b1, 0, 8, 1)] };
  } },
  atelier: { name: 'Atelier de tricot', nameCCP: 'Atelier du Plan', fem: false, build(lot: Building, seed: number): BuiltParts {
    const ccp = ccpOf(lot), g = houseGeo(lot.ca, lot.cb - 2, 18, 12, 8, 5, seed, 'a', 0);
    const body = () => { if (ccp) SH.CUR = M.CCP3; gableWalls(g.a0, g.a1, g.b0, g.b1, g.hh, g.rh, 'a', (u: number, h: number, x: number, y: number, k: number) => {
      const len = (k & 1) ? g.b1 - g.b0 : g.a1 - g.a0;
      if (k === 0 && h < 5.5 && u > 2 && u < len - 2){ if (Math.abs(u - len / 2) < 1.6) return h > 5 ? 1 : 0; return (h > 1.2 && h < 4.8) ? winColor('in', true, x, y) : 1; }
      return wallBase(k, x, y); });
      SH.CUR = ccp ? M.ROOF_USC : M.ROOF_CCP; gableRoof2(g.a0, g.a1, g.b0, g.b1, g.hh, g.rh, 'a', 1, 7, 1); };
    // l'enseigne : une grosse pelote et deux aiguilles, sur un mat
    const sign = () => {
      const pa = g.a1 + 3, pb = g.b1 + 2; SH.CUR = M.METAL; line3(pa, pb, 0, pa, pb, 13, 0);
      const p = prj(pa, pb, 16), x = Math.round(p[0]), y = Math.round(p[1]);
      SH.CUR = M.WOOL; for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++){ const r = Math.hypot(dx, dy); if (r <= 4.3) fput(x + dx, y + dy, r > 3.3 || ((dx + dy) & 3) === 0 ? 1 : 0); }
      SH.CUR = M.PIER; for (let k = -6; k <= 6; k++){ fput(x + k, y - 6 + Math.abs(k) * 0, 0); }
      for (let k = 0; k < 9; k++){ fput(x - 5 + k, y - 7 + k, 0); fput(x + 5 - k, y - 7 + k, 0); }
    };
    return { parts: [part(g.ca, g.cb, 0, body), part(g.a1 + 3, g.b1 + 2, .3, sign), part(g.ca, g.cb, .6, () => facadePlate(ccp ? 'TRICOT' : 'TRICOT', g.ca, g.b1, g.b0, g.hh + .2))], lights: [Lc(g.ca, g.b1 + 6, 11, 1.2)] };
  } },
  serre: { name: 'Serre à herbe à chat', nameCCP: 'Serre du kolkhoze', fem: true, build(lot: Building, seed: number): BuiltParts {
    const a0 = lot.ca - 11, a1 = lot.ca + 11, b0 = lot.cb - 6, b1 = lot.cb + 6, hh = 5, rh = 4;
    const body = () => {
      SH.CUR = M.WIN;
      gableWalls(a0, a1, b0, b1, hh, rh, 'a', (u: number, h: number) => (u % 2.5) < .45 || h < .8 ? 1 : 0);
      gableRoof2(a0, a1, b0, b1, hh, rh, 'a', 3, 9, 0);
      SH.CUR = M.TREE; for (let k = 0; k < 6; k++){ const p = prj(a0 + 3 + k * 3.4, b1 + 2, 0); fput(Math.round(p[0]), Math.round(p[1]), 1); fput(Math.round(p[0]), Math.round(p[1]) - 1, 0); }
    };
    return { parts: [part(lot.ca, lot.cb, 0, body)], lights: [] };
  } },
  banque: { name: 'Banque', nameCCP: 'Caisse d’épargne du Peuple', fem: true, build(lot: Building, seed: number): BuiltParts {
    const ccp = ccpOf(lot), a0 = lot.ca - 10, a1 = lot.ca + 10, b0 = lot.cb - 8, b1 = lot.cb + 6, hh = 11, rh = 4;
    const body = () => {
      SH.CUR = ccp ? M.CONCRETE : M.SANDSTONE;
      boxS(a0 - 1, a1 + 1, b0 - 1, b1 + 2, 0, 1.2, 1, 0);
      gableWalls(a0, a1, b0, b1, hh, rh, 'b', (u: number, h: number, x: number, y: number, k: number) => {
        const len = (k & 1) ? b1 - b0 : a1 - a0;
        if (h >= hh) return (h < hh + .7) ? 1 : 0;
        if (k === 0){ if (Math.abs(u - len / 2) < 1.6 && h < 6) return h > 5.5 ? 1 : 0; return (u % 3.3) < 1.3 ? 1 : (bz(x, y) < 8 ? 1 : 0); }
        const kk = win(u % 4, h, 1.2, 3, 1.6, 4); if (kk) return winColor(kk, true, x, y);
        return wallBase(k, x, y);
      });
      SH.CUR = M.ROOF_USC; gableRoof2(a0, a1, b0, b1, hh, rh, 'b', 1, 7, 1);
      if (ccp && frontVisible(0)){ const p = prj(lot.ca, b1, hh + 1.6); SH.CUR = M.SIGN_CCP; drawStar(fput, Math.round(p[0]) - 3, Math.round(p[1]) - 3, 0, true); }
    };
    return { parts: [part(lot.ca, lot.cb, 0, body), part(lot.ca, lot.cb, .6, () => facadePlate(ccp ? 'CAISSE' : 'BANQUE', lot.ca, b1, b0, 8.5))], lights: [Lc(lot.ca, b1 + 6, 12, 1.2)] };
  } },
  entrepot: { name: 'Entrepôt', nameCCP: 'Dépôt du Plan', fem: false, build(lot: Building, seed: number): BuiltParts {
    const ccp = ccpOf(lot), a0 = lot.ca - 15, a1 = lot.ca + 15, b0 = lot.cb - 9, b1 = lot.cb + 7, hh = 8, rh = 3;
    const body = () => {
      SH.CUR = ccp ? M.CONCRETE : M.USC5;
      gableWalls(a0, a1, b0, b1, hh, rh, 'a', (u: number, h: number, x: number, y: number, k: number) => {
        if (k === 0){ const ph = u % 7.5; if (ph > 1.5 && ph < 6 && h < 6) return (Math.floor(h * 1.5) & 1) ? 1 : 0; }
        return (u % 2) < .3 ? 1 : wallBase(k, x, y);
      });
      SH.CUR = M.ROOF_USC; gableRoof2(a0, a1, b0, b1, hh, rh, 'a', 1, 5, 1);
    };
    return { parts: [part(lot.ca, lot.cb, 0, body)], lights: [sideLight(a0, a1, b0, b1, 0, 8, 1)] };
  } },
  pompage: { name: 'Station de pompage', nameCCP: 'Station de pompage du Peuple', fem: true, build(lot: Building, seed: number): BuiltParts {
    const g = houseGeo(lot.ca - 3, lot.cb, 12, 10, 7, 4, seed, 'a', 0);
    const body = () => { SH.CUR = M.BRICK; gableWalls(g.a0, g.a1, g.b0, g.b1, g.hh, g.rh, 'a', (u: number, h: number, x: number, y: number, k: number) => { const kk = win(u, h, 2, 2.5, 2.5, 3); return kk ? winColor(kk, true, x, y) : wallBase(k, x, y); }); SH.CUR = M.ROOF_USC; gableRoof2(g.a0, g.a1, g.b0, g.b1, g.hh, g.rh, 'a', 1, 7, 1); };
    const tank = () => { SH.CUR = M.CHROME; drawCyl(lot.ca + 9, lot.cb, 0, 4, 9, true); SH.CUR = M.METAL; line3(g.a1, g.cb, 2, lot.ca + 5, lot.cb, 2, 0); line3(g.a1, g.cb, 3, lot.ca + 5, lot.cb, 3, 0); };
    return { parts: [part(g.ca, g.cb, 0, body), part(lot.ca + 9, lot.cb, .2, tank)], lights: [] };
  } },
  foret: { name: 'Exploitation forestière', nameCCP: 'Brigade forestière du Peuple', fem: true, build(lot: Building, seed: number): BuiltParts {
    const ccp = ccpOf(lot), g = houseGeo(lot.ca - 4, lot.cb - 3, 12, 9, 6, 5, seed, 'a', 0);
    const cabin = () => { SH.CUR = M.PIER; gableWalls(g.a0, g.a1, g.b0, g.b1, g.hh, g.rh, 'a', (u: number, h: number, x: number, y: number, k: number) => (h % 1.5) < .5 ? 1 : (k === 0 && Math.abs(u - 6) < 1.4 && h < 4.5 ? 0 : wallBase(k, x, y))); SH.CUR = ccp ? M.ROOF_USC : M.ROOF_CCP; gableRoof2(g.a0, g.a1, g.b0, g.b1, g.hh, g.rh, 'a', 1, 7, 1); };
    // les grumes empilees devant la cabane
    const logs = () => { SH.CUR = M.PIER; for (let r = 0; r < 3; r++) for (let k = 0; k < 4 - r; k++){ const a = lot.ca + 5 + k * 2.2 + r * 1.1, b = lot.cb + 7, z = r * 1.8; boxS(a - 1, a + 1, b - 4, b + 4, z, z + 1.8, (u: number) => (u < .5 ? 1 : 0), 1); } };
    return { parts: [part(g.ca, g.cb, 0, cabin), part(lot.ca + 8, lot.cb + 7, .2, logs)], lights: [] };
  } },
  mine: { name: 'Mine de charbon', nameCCP: 'Puits du Plan', fem: true, build(lot: Building, seed: number): BuiltParts {
    const ccp = ccpOf(lot), ha = lot.ca + 4, hb = lot.cb - 2;
    const shed = () => { SH.CUR = ccp ? M.CONCRETE : M.PIER; boxS(lot.ca - 12, lot.ca - 2, lot.cb - 6, lot.cb + 4, 0, 6, (u: number, h: number, x: number, y: number, k: number) => wallBase(k, x, y), 1); };
    // le chevalement : deux jambes, la poutre, la roue en haut
    const frame = (t: number) => {
      SH.CUR = ccp ? M.FLAG_RED : M.PIER;
      line3(ha - 4, hb, 0, ha, hb, 20, 1); line3(ha + 4, hb, 0, ha, hb, 20, 1); line3(ha - 4, hb + 6, 0, ha, hb, 20, 0); line3(ha - 2.5, hb, 8, ha + 2.5, hb, 8, 1); line3(ha - 1.4, hb, 14, ha + 1.4, hb, 14, 1);
      const p = prj(ha, hb, 21), x = Math.round(p[0]), y = Math.round(p[1]), an = t * 2;
      SH.CUR = M.METAL; for (let k = 0; k < 16; k++){ const aa = k * Math.PI / 8; fput(x + Math.round(Math.cos(aa) * 3), y + Math.round(Math.sin(aa) * 3), 1); }
      fput(x + Math.round(Math.cos(an) * 2), y + Math.round(Math.sin(an) * 2), 0); fput(x, y, 0);
    };
    const heap = () => { SH.CUR = M.ROAD; pyramid(lot.ca - 4, lot.cb + 9, 4, 0, 4, 0); };
    return { parts: [part(lot.ca - 7, lot.cb - 1, 0, shed), part(ha, hb, .3, frame), part(lot.ca - 4, lot.cb + 9, .1, heap)], lights: [Lc(lot.ca, lot.cb + 6, 10, 1.1)] };
  } },
  mineu: { name: 'Mine d’uranium', nameCCP: 'Combinat atomique', fem: true, build(lot: Building, seed: number): BuiltParts {
    const ccp = ccpOf(lot);
    const shed = () => { SH.CUR = ccp ? M.CONCRETE : M.METAL; boxS(lot.ca - 10, lot.ca + 4, lot.cb - 7, lot.cb + 3, 0, 7, (u: number, h: number, x: number, y: number, k: number) => (h > 5.5 ? 1 : wallBase(k, x, y)), 1); };
    const barrels = () => { for (let k = 0; k < 4; k++){ SH.CUR = M.ICON_Y; drawCyl(lot.ca + 7 + (k & 1) * 3, lot.cb + 4 + (k >> 1) * 3, 0, 1.2, 2.6, true); } };
    const fence = () => { SH.CUR = M.METAL; const f = (u: number, h: number) => (h > 2.2 || (u % 1.5) < .3) ? 1 : -1; for (const [pa, pb, qa, qb] of [[lot.ca - 15, lot.cb + 11, lot.ca + 15, lot.cb + 11], [lot.ca + 15, lot.cb + 11, lot.ca + 15, lot.cb - 11]]) if (!wallFace(pa, pb, qa, qb, 0, 2.6, f, -1)) wallFace(qa, qb, pa, pb, 0, 2.6, f, -1); };
    return { parts: [part(lot.ca - 3, lot.cb - 2, 0, shed), part(lot.ca + 8, lot.cb + 5, .2, barrels), part(lot.ca, lot.cb + 11, .1, fence)], lights: [Lc(lot.ca, lot.cb, 10, 1.1)] };
  } },
  derrick: { name: 'Derrick', nameCCP: 'Derrick du Plan', fem: false, build(lot: Building, seed: number): BuiltParts {
    const ccp = ccpOf(lot), ca = lot.ca, cb = lot.cb;
    const tower = () => {
      SH.CUR = ccp ? M.FLAG_RED : M.PIER;
      const hw = 4, top = 26;
      for (const [da, db] of [[-hw, -hw], [hw, -hw], [hw, hw], [-hw, hw]]) line3(ca + da, cb + db, 0, ca + da * .15, cb + db * .15, top, 1);
      for (let z = 4; z < top - 2; z += 5){ const s = 1 - .85 * z / top, s2 = 1 - .85 * (z + 5) / top; line3(ca - hw * s, cb + hw * s, z, ca + hw * s2, cb + hw * s2, z + 5, 0); line3(ca + hw * s, cb + hw * s, z, ca + hw * s, cb - hw * s, z, 0); line3(ca - hw * s, cb + hw * s, z, ca + hw * s, cb + hw * s, z, 0); }
    };
    // le chevalet de pompage qui hoche la tete
    const jack = (t: number) => { const ja = ca + 9, jb = cb + 6, an = Math.sin(t * 1.6) * .35; SH.CUR = M.METAL; line3(ja, jb, 0, ja, jb, 4, 1); line3(ja - 4 * Math.cos(an), jb, 4 - 4 * Math.sin(an), ja + 4 * Math.cos(an), jb, 4 + 4 * Math.sin(an), 1); line3(ja + 4 * Math.cos(an), jb, 4 + 4 * Math.sin(an), ja + 4 * Math.cos(an), jb, 1, 0); };
    return { parts: [part(ca, cb, 0, tower), part(ca + 9, cb + 6, .2, jack)], lights: [] };
  } },
  centrale: { name: 'Centrale à charbon', nameCCP: 'Centrale du Plan', fem: true, build(lot: Building, seed: number): BuiltParts {
    const ccp = ccpOf(lot), a0 = lot.ca - 13, a1 = lot.ca + 7, b0 = lot.cb - 9, b1 = lot.cb + 7, hh = 12;
    const body = () => { SH.CUR = ccp ? M.CONCRETE : M.BRICK; factoryBox(a0, a1, b0, b1, hh, seed); };
    const stacks = (t: number) => {
      for (let k = 0; k < 2; k++){
        const sa = a1 + 4, sb = b0 + 4 + k * 8;
        for (let z = 0; z < 30; z += 5){ SH.CUR = ccp && (z / 5) % 2 ? M.FLAG_RED : (ccp ? M.NEUTRAL : M.BRICK); drawCyl(sa, sb, z, 2.2 - z * .02, 5, z + 5 >= 30); }
        const p = prj(sa, sb, 30); smokeAt(p[0], p[1] - 1, t * 1.2, seed + k * 7); smokeAt(p[0] + 2, p[1] - 3, t, seed + k * 3);
      }
    };
    const heap = () => { SH.CUR = M.ROAD; pyramid(lot.ca - 4, lot.cb + 12, 4, 0, 3.5, 0); };
    return { parts: [part(lot.ca - 3, lot.cb - 1, 0, body), part(a1 + 4, lot.cb, .4, stacks), part(lot.ca - 4, lot.cb + 12, .1, heap)], lights: [sideLight(a0, a1, b0, b1, 0, 9, 1.1)] };
  } },
});
Object.assign(FOOT, { atelier: [28, 24], serre: [28, 18], banque: [28, 24], pompage: [32, 18], foret: [30, 30], mine: [32, 30], mineu: [34, 30], derrick: [28, 26], centrale: [40, 34], conserverie: [30, 24] });

Object.assign(ECO, {
  conserverie: bdef('nourriture', 50, { c: -6, x: { pate: 2 }, jobs: 6, elec: -2, conv: true, up: true, desc: 'Met les croquettes en boîte : du pâté, le luxe des habitants.' }),
  atelier: bdef('laine', 50, { l: -6, x: { tricot: 2 }, jobs: 5, elec: -2, conv: true, up: true, desc: 'Tricote la laine : du tricot pour les grands bâtiments et le niveau 3.' }),
  foret: bdef('laine', 25, { forest: true, jobs: 4, up: true, desc: 'Abat la forêt alentour et en tire de la laine. La forêt recule.' }),
  serre: bdef('loisirs', 45, { x: { herbe: 2 }, jobs: 3, elec: -1, eau: -10, up: true, desc: 'De l’herbe à chat : les habitants ronronnent bien plus.' }),
  banque: bdef('services', 60, { x: { coins: 6 }, jobs: 4, up: true, desc: 'Des Catcoins pour commercer et faire venir des habitants.' }),
  entrepot: bdef('services', 30, { jobs: 2, stock: 1000, up: true, desc: 'Plus de place pour les croquettes et la laine : sans lui, le surplus se perd.' }),
  pompage: bdef('services', 50, { eau: 120, elec: -2, jobs: 3, nearWater: true, up: true, desc: 'Pompe l’eau de la mer ou d’une rivière : de l’eau pour beaucoup d’habitants.' }),
  mine: bdef('industrie', 40, { x: { charbon: 4 }, jobs: 6, deposit: 'charbon', up: true, desc: 'Sur un gisement de charbon, au pied d’une montagne.' }),
  mineu: bdef('industrie', 80, { x: { uranium: 1 }, jobs: 6, deposit: 'uranium', tech: 'atome', desc: 'Sur un gisement d’uranium. Il faut la recherche de l’atome.' }),
  derrick: bdef('industrie', 50, { x: { petrole: 3 }, jobs: 3, deposit: 'petrole', up: true, desc: 'Sur un gisement de pétrole : le carburant des unités.' }),
  centrale: bdef('industrie', 80, { x: { charbon: -2 }, elec: 30, r: -3, jobs: 8, conv: true, up: true, desc: 'Brûle du charbon : de l’électricité pour une quinzaine de bâtiments. La fumée fâche les voisins.' }),
});
// les reseaux des batiments qui existaient deja
Object.assign(ECO.qg, { elec: 8, eau: 40 });
Object.assign(ECO.chateau, { cat: 'services', eau: 40, desc: 'De l’eau pour une quarantaine d’habitants.' });
for (const [k, v] of [['supermarche', -2], ['usine', -3], ['cinema', -1], ['grandmagasin', -2], ['gratteciel', -3], ['radio', -2], ['stade', -2], ['fusee', -4], ['bowling', -1], ['drivein', -1], ['immeuble', -1]] as const) if (ECO[k]) ECO[k].elec = v;
CATS_MENU.splice(3, 0, ['industrie', 'Industrie'], ['services', 'Services']);

/* ---- sauvegarde : les stocks de l'onglet Ressources ---- */
HOOKS.save.push((ext) => { ext.prio = METIERS.map(m => PRIO[GAME.side][m]); });
HOOKS.load.push((ext) => { const pr = ext.prio; if (Array.isArray(pr)) METIERS.forEach((m, i) => { PRIO[GAME.side][m] = Math.max(0, Math.min(3, +pr[i] || 0)); }); });
HOOKS.reset.push(() => { for (const s of ['usc', 'ccp'] as const) for (const m of METIERS) PRIO[s][m] = 2; });
HOOKS.save.push((ext) => { ext.res2 = (['usc', 'ccp'] as const).map(s => XRES.map(k => Math.round(RES[s].x[k] * 10) / 10)); });
HOOKS.load.push((ext) => { const r = ext.res2; if (Array.isArray(r)) (['usc', 'ccp'] as const).forEach((s, i) => { const row = r[i]; if (Array.isArray(row)) XRES.forEach((k, j) => { RES[s].x[k] = +row[j] || 0; }); }); });

/* ---- l'onglet Ressources ---- */
const XRES_HELP: Record<XRes, string> = {
  pate: 'Le luxe des croquettes : les habitants qui en ont ronronnent plus. Niveau 3 des logements.',
  tricot: 'Le luxe de la laine : grands bâtiments et niveau 3 de tous les bâtiments.',
  herbe: 'Le luxe des ronrons : des habitants bien plus heureux.',
  coins: 'La monnaie : commerce avec l’autre camp et les nations alliées, immigration.',
  charbon: 'Fait tourner les centrales à charbon.',
  uranium: 'La centrale nucléaire et la bombe.',
  petrole: 'Le carburant des chars, des navires et des avions.',
};
const fmt1 = (v: number) => (Math.round(v * 10) / 10).toString().replace('.', ',');
const rate = (v: number) => (v > 0 ? '+' : v < 0 ? '−' : '') + fmt1(Math.abs(v)) + '/min';
// le panneau est construit une fois a l'ouverture ; ensuite on ne met a jour que les chiffres (un bouton n'est jamais remplace sous la souris)
export function buildResPanel(){
  const el = $('xres');
  let h = '<div class="xr-head"><b>Ressources</b><button class="btn k" type="button" id="xresClose" aria-label="Fermer">×</button></div><div class="xr-grid">';
  for (const k of XRES) h += '<div class="xr-row" title="' + XRES_HELP[k] + '">' + ico(k, XRES_NAME[k]) + '<span>' + XRES_NAME[k] + '</span><b data-v="' + k + '"></b><i data-r="' + k + '"></i></div>';
  h += '</div><div class="xr-net">';
  for (const [k, nm] of [['elec', 'Électricité'], ['eau', 'Eau']]) h += '<div class="xr-row" data-net="' + k + '">' + ico(k, nm) + '<span>' + nm + '</span><span class="xr-bar"><i></i></span><b></b></div>';
  h += '<div class="xr-row" title="Ce que l’autre camp pense de nous : radio, loisirs, prestige.">' + ico('influence', 'influence') + '<span>Influence</span><b data-v="influence"></b><i></i></div>';
  h += '<div class="xr-row" title="Place pour les croquettes et la laine (entrepôts).">' + ico('croq', 'stock') + '<span>Stock</span><b data-v="cap"></b><i></i></div></div>';
  h += '<div class="xr-net"><div class="xr-sub">Métiers <span data-v="pop"></span></div>';
  for (const m of METIERS) h += '<div class="xr-job" data-job="' + m + '"><span>' + METIER_NAME[m] + '</span><span class="xr-bar"><i></i></span><button class="btn k xr-p" type="button" data-m="' + m + '" data-d="-1" aria-label="Moins de priorité pour ' + METIER_NAME[m] + '">−</button><span class="pips"><i></i><i></i><i></i></span><button class="btn k xr-p" type="button" data-m="' + m + '" data-d="1" aria-label="Plus de priorité pour ' + METIER_NAME[m] + '">+</button></div>';
  el.innerHTML = h + '</div>';
  $('xresClose').addEventListener('click', () => { el.hidden = true; $('btnRes').setAttribute('aria-pressed', 'false'); });
  for (const b of el.querySelectorAll('.xr-p')) if (b instanceof HTMLElement) b.addEventListener('click', () => { const m = b.dataset.m as Metier, P = PRIO[GAME.side]; P[m] = Math.max(0, Math.min(3, P[m] + (+(b.dataset.d || 0)))); SH.refreshAccess(); renderResPanel(); SH.saveSoon(); });
}
export function renderResPanel(){
  const el = $('xres'); if (el.hidden) return;
  if (!el.firstChild) buildResPanel();
  const R = RES[GAME.side], set = (sel: string, txt: string) => { const n = el.querySelector(sel); if (n) n.textContent = txt; };
  for (const k of XRES){ set('[data-v="' + k + '"]', String(Math.floor(R.x[k]))); const r = el.querySelector('[data-r="' + k + '"]'); if (r){ r.textContent = rate(R.rx[k]); r.className = R.rx[k] < 0 ? 'neg' : ''; } }
  for (const [k, P, U, cov] of [['elec', R.elecP, R.elecU, R.elecCov], ['eau', R.eauP, R.eauU, R.eauCov]] as const){
    const row = el.querySelector('[data-net="' + k + '"]'); if (!(row instanceof HTMLElement)) continue;
    row.title = 'Capacité ' + Math.round(P) + ', besoin ' + Math.round(U); const bi = row.querySelector('.xr-bar i'); if (bi instanceof HTMLElement) bi.style.width = Math.round(cov * 100) + '%';
    const bv = row.querySelector('b'); if (bv) bv.textContent = Math.round(cov * 100) + ' %';
  }
  set('[data-v="influence"]', String(R.influence)); set('[data-v="cap"]', String(Math.round(R.cap))); set('[data-v="pop"]', R.pop + ' habitants');
  for (const m of METIERS){
    const row = el.querySelector('[data-job="' + m + '"]'); if (!(row instanceof HTMLElement)) continue;
    const bar = row.querySelector('.xr-bar'); if (bar instanceof HTMLElement){ bar.title = Math.round(R.demand[m]) + ' emplois, ' + Math.round(R.effM[m] * 100) + ' % pourvus'; const bi = bar.querySelector('i'); if (bi instanceof HTMLElement) bi.style.width = Math.round(R.effM[m] * 100) + '%'; }
    row.querySelectorAll('.pips i').forEach((p, i) => p.classList.toggle('on', i < PRIO[GAME.side][m]));
  }
}
$('btnRes').addEventListener('click', () => { const el = $('xres'); el.hidden = !el.hidden; $('btnRes').setAttribute('aria-pressed', String(!el.hidden)); renderResPanel(); SH.sfx('click'); });
let resAcc = 0;
HOOKS.step.push((dt: number) => { resAcc += dt; if (resAcc > .5){ resAcc = 0; renderResPanel(); } });
// le bouton porte l'icone d'une pelote tricotee
{ const ri = $('btnRes').querySelector('.res-ico'); if (ri) ri.innerHTML = ico('tricot'); }

/* ---- bilan de fin de mois : ce qui a ete gagne et depense pendant le mois ---- */
let monthSeen = -1, monthStart: number[] = [];
const stockOf = (s: Side) => { const R = RES[s]; return [R.croq, R.laine, R.ron, R.x.coins, R.pop]; };
HOOKS.step.push(() => {
  if (GAME.mode !== 'play') return;
  const m = SH.CAL ? SH.CAL.m : 0;
  if (monthSeen < 0){ monthSeen = m; monthStart = stockOf(GAME.side); return; }
  if (m === monthSeen) return;
  const now = stockOf(GAME.side), d = now.map((v, i) => Math.round(v - (monthStart[i] || 0)));
  monthSeen = m; monthStart = now;
  const sg = (v: number) => (v >= 0 ? '+' : '−') + Math.abs(v);
  const el = $('bilan');
  el.innerHTML = '<b>Bilan du mois</b><span class="cost">' + ['croq', 'laine', 'ron', 'coins', 'pop'].map((k, i) => '<span class="ci">' + ico(k) + '<b>' + sg(d[i]) + '</b></span>').join('') + '</span>';
  el.hidden = false; clearTimeout(bilanT); bilanT = setTimeout(() => { el.hidden = true; }, 9000);
});
let bilanT = 0;
HOOKS.reset.push(() => { monthSeen = -1; });
