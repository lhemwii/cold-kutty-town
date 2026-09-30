import { SH } from './00-shared.ts';
import { BAYER, BLACK, COLOR, STAR7, WHITE, clamp, flagSmall, hash2 } from './01-core.js';
import { glyphAt } from './07-world.js';
import { PAL32, hex32 } from './11-render.js';
/* ================= portrait detaille du chat, en 1-bit ================= */
export const PW = 160, PH = 120;
export const pMask = new Uint8Array(PW * PH), pCol = new Uint8Array(PW * PH);
export const pb = (x, y, tone) => BAYER[((y & 3) << 2) | (x & 3)] < tone ? 1 : 0;
export function inTri(px, py, ax, ay, bx, by, cx, cy){
  const d1 = (px - bx) * (ay - by) - (ax - bx) * (py - by), d2 = (px - cx) * (by - cy) - (bx - cx) * (py - cy), d3 = (px - ax) * (cy - ay) - (cx - ax) * (py - ay);
  return !(((d1 < 0) || (d2 < 0) || (d3 < 0)) && ((d1 > 0) || (d2 > 0) || (d3 > 0)));
}
export const FUR = { white: 14, gray: 7, black: 2, tabby: 9, siamois: 13 };
export const EARLESS = ['casque', 'kepi', 'ushanka', 'foulard', 'bonnet', 'marin', 'cowboy', 'chantier'];
SH.portraitTalk = false;
export const M_BG = 0, M_BODY = 1, M_HEAD = 2, M_EAR = 3, M_INEAR = 4, M_HAT = 5;
// couleurs du portrait (version couleur) : une paire sombre / claire par matiere
export const PM = { BG_USC:0, BG_CCP:1, BG_NEU:2, FUR_WHITE:3, FUR_GRAY:4, FUR_BLACK:5, FUR_TABBY:6, FUR_SIAM:7, PINK:8, EYE:9, WHITE:10, DARK:11, GOLD:12, WOOD:13 };
export const PPAL_HEX = [['#1b2f63','#f5ecd6'],['#4a0d13','#d6333a'],['#0c2238','#9fd3e6'],['#3d3542','#f7f2e8'],['#2a2e37','#aab1bd'],['#0c0b10','#5f5b72'],['#5a2c0c','#f39b40'],['#3b2618','#f1e3cb'],
  ['#6e2a3a','#f09aac'],['#0a0a0a','#cfe35a'],['#101010','#ffffff'],['#0a0a0a','#e8e8e8'],['#6b4a12','#f4c542'],['#2b170b','#b07a47']];
export const OUTFIT_HEX = { veste:['#1c2336','#f1ede4'], costume:['#1c2336','#f1ede4'], blouson:['#0b0b0e','#bfc4ce'], robe:['#7a1f3d','#f6b3c4'], pois:['#1f3a8a','#f7f1e6'],
  'uniforme-usc':['#3d3a1e','#c9b98a'], 'uniforme-ccp':['#26301f','#8c9a6a'], salopette:['#1d3057','#e7e1d0'], pull:['#4a2a14','#e0a93f'], tablier:['#3b2230','#f4f0e8'],
  bleu:['#1c3350','#8fb1d8'], combi:['#3a3f4a','#f4f5f8'], caban:['#101c33','#dfe4ef'], mariniere:['#1b2b66','#f5f3ee'], 'gilet-sherif':['#6b1a1a','#e9c9a0'],
  blouse:['#556070','#fbfbfd'], bowling:['#12615e','#f39cc0'], fraise:['#b3202c','#fbf3e6'], survet:['#8e1622','#f4efe6'], trench:['#4a3a22','#d7c49a'] };
export const HAT_HEX = { fedora:['#2e1d12','#9b7652'], espion:['#2e1d12','#9b7652'], coiffe:['#40434d','#ffffff'], toque:['#40434d','#ffffff'], beret:['#08080a','#7d7f8c'], banane:['#08080a','#7d7f8c'],
  'haut-de-forme':['#08080a','#7d7f8c'], casque:['#1f2a18','#8a9a62'], gavroche:['#2a2a2e','#b9b2a4'], marin:['#0e1a33','#f4f4f4'], bonnet:['#5b1016','#e0525a'], casquette:['#5b1016','#e0525a'],
  kepi:['#1e2a1a','#7f8f5a'], foulard:['#7d1b24','#f0d9b5'], ushanka:['#2f1d10','#a9825a'], chantier:['#5a4410','#f5c83a'], cowboy:['#3a2412','#c99a62'], bigoudis:['#6e2a4a','#f4a6c8'],
  noeud:['#6e2a4a','#f4a6c8'], bandeau:['#b3202c','#ffffff'] };
export const OUTFIT_KEYS = Object.keys(OUTFIT_HEX), HAT_KEYS = Object.keys(HAT_HEX);
export const PM_OUT0 = PPAL_HEX.length, PM_HAT0 = PM_OUT0 + OUTFIT_KEYS.length;
export const PPAL32 = new Uint32Array((PM_HAT0 + HAT_KEYS.length) * 2);
[...PPAL_HEX, ...OUTFIT_KEYS.map(k => OUTFIT_HEX[k]), ...HAT_KEYS.map(k => HAT_HEX[k])].forEach((pr, i) => { PPAL32[i * 2] = hex32(pr[0]); PPAL32[i * 2 + 1] = hex32(pr[1]); });
export const pMat = new Uint8Array(PW * PH);
export let PSUB = -1;
export const FUR_PM = { white: PM.FUR_WHITE, gray: PM.FUR_GRAY, black: PM.FUR_BLACK, tabby: PM.FUR_TABBY, siamois: PM.FUR_SIAM };

export function portraitBg(side, x, y, t){
  if (side === 'ccp'){
    if (x < 30 && y < 30){ const sx = Math.floor((x - 6) / 3), sy = Math.floor((y - 6) / 3); if (sx >= 0 && sy >= 0 && sx < 7 && sy < 7 && STAR7[sy][sx] === '1') return 1; }
    const ang = Math.atan2(y - 150, x - 80), ray = Math.floor((ang + t * .04) * 20 / Math.PI) & 1;
    return ray ? pb(x, y, 2 + (y < 40 ? 1 : 0)) : 0;
  }
  if (side === 'usc'){
    if (y > 108) return (((x >> 2) + (y >> 2)) & 1) ? pb(x, y, 8) : 0;
    const gx = ((x + ((y / 16 | 0) & 1) * 8) % 16) - 8, gy = (y % 16) - 8;
    if ((gx === 0 && Math.abs(gy) <= 1) || (gy === 0 && Math.abs(gx) <= 1)) return 1;
    return 0;
  }
  if (y > 80) return (((y - 80) % 7) < 1 && ((x + (y >> 1) + (t * 6 | 0)) % 11) < 5) ? 1 : 0;
  const d = Math.abs((x - 150) * .5 + (y - 10));
  return d < 12 ? pb(x, y, 4 - d * .3) : 0;
}
export function hatAt(look, dx, dy, x, y){
  switch (look){
    case 'fedora': {
      if (((dx) / 36) ** 2 + ((dy + 25) / 5) ** 2 < 1) return dy > -23 ? 1 : pb(x, y, 4);
      if (dy >= -50 && dy < -26 && Math.abs(dx) < 17 + (dy + 50) * .12 && !(dy < -47 && Math.abs(dx) < 5)){
        if (dy >= -33 && dy < -28) return 1;
        return pb(x, y, dx < -8 ? 7 : 3);
      }
      return -1;
    }
    case 'coiffe':
      if (dy >= -38 && dy < -27 && Math.abs(dx) < 10 + (dy + 38) * .55) return (dy < -33 && ((dx + 40) % 4) === 0) ? 0 : (dy >= -29 ? 0 : 1);
      return -1;
    case 'beret':
      if (((dx + 6) / 30) ** 2 + ((dy + 30) / 9) ** 2 < 1) return pb(x, y, dy < -33 && dx < 0 ? 6 : 2);
      if (Math.abs(dx + 6) < 1 && dy >= -42 && dy < -38) return 1;
      return -1;
    case 'casquette':
      if (dy >= -26 && ((dx - 10) / 24) ** 2 + ((dy + 24) / 3.5) ** 2 < 1) return dy > -22 ? 1 : 0;
      if (dy < -26 && (dx / 27) ** 2 + ((dy + 28) / 13) ** 2 < 1) return dy >= -30 ? 0 : ((Math.abs(dx) % 9) < 1 ? 0 : pb(x, y, dx < 0 ? 8 : 5));
      return -1;
    case 'banane':
      if (dy < -20 && ((((dx - 4) / 24) ** 2 + ((dy + 30) / 13) ** 2 < 1) || (((dx - 18) / 10) ** 2 + ((dy + 38) / 7) ** 2 < 1))){
        return (((dx * 2 + dy * 3 + 400) % 13) === 0 && dy < -28) ? 1 : 0;
      }
      return -1;
    case 'noeud': {
      const bx = 20, by = -30;
      if (Math.abs(dx - bx) < 2.5 && Math.abs(dy - by) < 3) return 0;
      if (inTri(dx, dy, 8, -38, 8, -22, 19, -30) || inTri(dx, dy, 32, -38, 32, -22, 21, -30)) return ((x % 5) === 0 && (y % 5) === 0) ? 0 : 1;
      return -1;
    }
    case 'casque':
      if (dy < -14 && (dx / 37) ** 2 + ((dy + 20) / 24) ** 2 < 1){
        if (dy >= -18) return 1;
        if (glyphAt('MP', dx + 8, -dy, 0, 40, 2)) return 1;
        return pb(x, y, (dx < -10 && dy < -30) ? 9 : 5);
      }
      if (Math.abs(Math.abs(dx) - 31) < .8 && dy >= -14 && dy < 16) return 0;
      return -1;
    case 'gavroche':
      if (dy >= -24 && ((dx - 12) / 20) ** 2 + ((dy + 21) / 3) ** 2 < 1) return 0;
      if (dy < -22 && ((dx - 2) / 32) ** 2 + ((dy + 28) / 12) ** 2 < 1){
        if (Math.abs(dx - 2) < 2 && dy < -38) return 1;
        return (((x >> 1) + (y >> 1)) & 1) ? pb(x, y, 12) : pb(x, y, 2);
      }
      return -1;
    case 'marin':
      if (dy >= -20 && (dx / 24) ** 2 + ((dy + 18) / 3.5) ** 2 < 1) return (dy < -18 && dx < -4 && dx > -14) ? 1 : 0;
      if (dy >= -28 && dy < -20 && Math.abs(dx) < 26){ if (Math.abs(dx) < 3 && dy > -27 && dy < -21) return 1; return 0; }
      if ((dx / 30) ** 2 + ((dy + 32) / 9) ** 2 < 1) return pb(x, y, dy > -30 ? 10 : 15);
      return -1;
    case 'bonnet':
      if (dy < -12 && (dx / 34) ** 2 + ((dy + 22) / 22) ** 2 < 1){
        if (dy >= -19) return ((y % 3) === 0) ? 0 : pb(x, y, 12);
        return ((x % 4) < 2) ? pb(x, y, 9) : pb(x, y, 3);
      }
      return -1;
    case 'kepi':
      if (dy >= -24 && (dx / 28) ** 2 + ((dy + 21) / 4) ** 2 < 1) return (dy < -21 && dx < -8 && dx > -20) ? 1 : 0;
      if (dy >= -33 && dy < -24 && Math.abs(dx) < 30){ if (dy === -33 || dy === -25) return 1; if (Math.abs(dx) < 5) return ((x + y) & 1); return 0; }
      if ((dx / 46) ** 2 + ((dy + 38) / 12) ** 2 < 1){
        const sx = Math.floor((dx + 7) / 2), sy = Math.floor((dy + 50) / 2);
        if (sx >= 0 && sy >= 0 && sx < 7 && sy < 7 && STAR7[sy][sx] === '1'){ PSUB = PM.GOLD; return 1; }
        return pb(x, y, dy < -44 ? 7 : 4);
      }
      return -1;
    case 'foulard': {
      if (inTri(dx, dy, -8, 24, 8, 24, 0, 36) || inTri(dx, dy, 2, 28, 16, 44, 10, 46)) return ((x + y) % 5 === 0) ? 0 : 1;
      if ((dx / 41) ** 2 + ((dy + 2) / 37) ** 2 >= 1) return -1;
      if ((dx / 25) ** 2 + ((dy - 7) / 25) ** 2 < 1) return -1;
      if (dy > 26) return -1;
      if (((x % 7) === 3 && (y % 7) === 3) || ((x % 7) === 3 && Math.abs((y % 7) - 3) === 1) || ((y % 7) === 3 && Math.abs((x % 7) - 3) === 1)) return 0;
      return pb(x, y, 13);
    }
    case 'espion': return hatAt('fedora', dx, dy, x, y);
    case 'cowboy': {
      const lift = (dx / 44) ** 2 * 7;
      if (((dx) / 44) ** 2 + ((dy + 25 + lift) / 4.5) ** 2 < 1) return dy + lift > -24 ? 1 : pb(x, y, 5);
      if (dy >= -49 && dy < -27 && Math.abs(dx) < 19 - (dy + 49) * .08 && !(dy < -45 && Math.abs(dx) < 6)){
        if (dy >= -32 && dy < -28) return ((x & 3) === 0) ? 0 : 1;
        if (Math.abs(dx) < 1 && dy < -40) return 0;
        return pb(x, y, dx < -6 ? 10 : 6);
      }
      return -1;
    }
    case 'bigoudis': {
      for (const cx of [-17, -6, 6, 17]){ const cy = -30 + Math.abs(cx) * .12; if (Math.abs(dx - cx) < 5 && Math.abs(dy - cy) < 4) return (Math.abs(dx - cx) > 4 || Math.abs(dy - cy) > 3) ? 0 : ((Math.abs(dy - cy) < 1) ? 0 : 1); }
      if (dy < -20 && (dx / 33) ** 2 + ((dy + 22) / 14) ** 2 < 1 && ((x + y) % 4 === 0)) return 1;
      return -1;
    }
    case 'bandeau':
      if (dy >= -22 && dy < -15 && (dx / 35.5) ** 2 + (dy / 29) ** 2 < 1) return (dy === -19) ? 0 : 1;
      return -1;
    case 'chantier':
      if (dy >= -17 && dy < -13 && Math.abs(dx) < 41) return (dy === -13 || Math.abs(dx) > 40) ? 0 : 1;
      if (dy < -16 && (dx / 34) ** 2 + ((dy + 20) / 21) ** 2 < 1){ if (Math.abs(dx) < 2) return 0; return pb(x, y, dx < -10 && dy < -28 ? 16 : 12); }
      return -1;
    case 'toque':
      if (dy >= -33 && dy < -22 && Math.abs(dx) < 20){ return ((dx + 40) % 5 === 0) ? 0 : pb(x, y, 14); }
      for (const [cx, cy, r] of [[-12, -42, 11], [0, -49, 12], [12, -42, 11]]){ const d = Math.hypot(dx - cx, dy - cy); if (d < r && dy < -30) return d > r - 1 ? 0 : pb(x, y, 16 - Math.max(0, (dx - cx)) * .4); }
      return -1;
    case 'haut-de-forme':
      if ((dx / 28) ** 2 + ((dy + 27) / 4) ** 2 < 1) return dy < -28 ? 1 : 0;
      if (dy >= -60 && dy < -28 && Math.abs(dx) < 16){ if (dy >= -35 && dy < -30) return pb(x, y, 12); return pb(x, y, dx < -10 ? 9 : 4); }
      return -1;
    case 'ushanka': {
      const fur = () => (hash2(x * 3, y * 5) < .6 ? 1 : 0) & pb(x, y, 14);
      if (Math.abs(dx) >= 29 && Math.abs(dx) < 42 && dy >= -26 && dy < 18 - Math.max(0, Math.abs(dx) - 38) * 2) return fur();
      if (dy >= -31 && dy < -19 && Math.abs(dx) < 37){
        const sx = dx + 3, sy = dy + 29;
        if (sx >= 0 && sy >= 0 && sx < 7 && sy < 7 && STAR7[sy][sx] === '1') return 0;
        return fur();
      }
      if (dy < -19 && (dx / 38) ** 2 + ((dy + 32) / 15) ** 2 < 1) return pb(x, y, 5) | ((hash2(x, y * 7) < .15) ? 1 : 0);
      return -1;
    }
  }
  return -1;
}
export function outfitAt(o, cx, y, x, t){
  const cy = y - 86;
  switch (o){
    case 'veste': case 'costume': {
      const v = (y - 88) * .42;
      if (Math.abs(cx) < v && y < 120){
        if (o === 'costume'){ if (y >= 93 && y <= 99 && Math.abs(cx) < 8 && Math.abs(cx) > (Math.abs(y - 96) * .8)) return 0; return 1; }
        if (Math.abs(cx) < 3 - (y < 94 ? 0 : .5) && y >= 91) return 0;
        return 1;
      }
      if (Math.abs(Math.abs(cx) - v) < 1.1) return 1;
      if (cx < -20 && cx > -28 && y > 99 && y < 103 && (cx + y) % 3 === 0) return 1;
      return pb(x, y, cx < 0 ? 4 : 2);
    }
    case 'blouson': {
      const v = (y - 88) * .35;
      if (Math.abs(cx) < v) return 1;
      if (y < 97 && Math.abs(cx) > 14 && Math.abs(cx) < 28 && Math.abs(Math.abs(cx) - 14 - (y - 86)) < 1.2) return 1;
      if (cx < -10 && ((cx - y + 400) % 11) === 0) return 1;
      return pb(x, y, 1);
    }
    case 'robe': case 'pois': {
      for (const s of [-1, 1]){ const d = Math.hypot(cx - s * 7, y - 92); if (d < 6.5) return d > 5.5 ? 0 : 1; }
      if (o === 'robe'){ if (cx === 0 && (y === 102 || y === 108 || y === 114)) return 0; return pb(x, y, 12); }
      const gx = (x % 9) - 4, gy = ((y + ((x / 9 | 0) & 1) * 4) % 9) - 4;
      return gx * gx + gy * gy < 5 ? 0 : 1;
    }
    case 'uniforme-usc': {
      if (Math.abs(cx) < (y - 88) * .3 && y < 104){ if (Math.abs(cx) < 2) return 0; return 1; }
      for (const s of [-1, 1]){ const px = cx - s * 18; if (Math.abs(px) < 7 && y >= 98 && y < 110) return (Math.abs(px) > 6 || y === 98 || y === 109 || y === 101) ? 1 : pb(x, y, 7); }
      if (cx < -34 && cx > -50){ for (let k = 0; k < 3; k++){ if (Math.abs((y - 98 - k * 3) - Math.abs(cx + 42) * .5) < .7) return 1; } }
      if (Math.abs(cx) < 1 && y > 104 && (y % 5) === 0) return 1;
      return pb(x, y, cx < 0 ? 8 : 6);
    }
    case 'uniforme-ccp': {
      if (y < 93 && Math.abs(cx) < 18) return (Math.abs(cx) > 10 && Math.abs(cx) < 15 && y > 88) ? 1 : 0;
      if (Math.abs(cx) > 32 && Math.abs(cx) < 48 && y >= 93 && y < 97) return ((x & 1) && y === 96) ? 0 : 1;
      if (cx <= -8 && cx > -34 && y >= 98 && y < 116){
        const mc = Math.floor((cx + 34) / 6.5), mr = Math.floor((y - 98) / 6), lx = (cx + 34) - mc * 6.5, ly = (y - 98) - mr * 6;
        if (lx < 5){ if (ly < 2){ PSUB = (x & 1) ? PM.GOLD : -1; return ((x + mr) & 1); } if (ly >= 2.5 && ly < 5.5){ PSUB = PM.GOLD; return (lx > .7 && lx < 4.3) ? 1 : 0; } }
      }
      if (cx > 12 && cx < 26 && y >= 98 && y < 112){ const sx = Math.floor((cx - 12) / 2), sy = Math.floor((y - 98) / 2); if (sx < 7 && sy < 7 && STAR7[sy][sx] === '1'){ PSUB = PM.GOLD; return 1; } }
      if (Math.abs(cx) < 1 && (y % 6) === 0) return 1;
      return pb(x, y, cx < 0 ? 5 : 3);
    }
    case 'salopette': {
      if (Math.abs(Math.abs(cx) - 13) < 3 && y < 100) return (y === 98 ? 1 : pb(x, y, 3));
      if (Math.abs(cx) < 17 && y >= 100){ if (Math.abs(cx) < 7 && y > 104 && y < 112) return (Math.abs(cx) > 6 || y === 105 || y === 111) ? 1 : pb(x, y, 3); return pb(x, y, 3); }
      return ((x % 6) === 0 || (y % 6) === 0) ? 0 : pb(x, y, 13);
    }
    case 'pull':
      if (y < 95 && Math.abs(cx) < 22) return ((y % 3) === 0) ? 0 : pb(x, y, 11);
      return ((x % 3) === 0) ? pb(x, y, 5) : pb(x, y, 11);
    case 'tablier':
      if (Math.abs(cx) < 20 && y > 96){ if (y < 99) return ((x + (y & 1)) % 3 === 0) ? 0 : 1; if (Math.abs(cx) > 19) return 0; return pb(x, y, 15); }
      return pb(x, y, 3);
    case 'bleu':
      if (Math.abs(cx) < (y - 88) * .25 && y < 100) return 1;
      if (cx > 10 && cx < 22 && y >= 99 && y < 108){ if (cx > 14 && cx < 16 && y < 101) return 1; return (cx === 11 || cx === 21 || y === 99) ? 1 : pb(x, y, 5); }
      if (Math.abs(cx) < 1 && y > 100 && (y % 6) === 0) return 1;
      return pb(x, y, cx < 0 ? 8 : 6);
    case 'combi':
      if (y < 95 && Math.abs(cx) < 30){ const e = ((cx) / 30) ** 2 + ((y - 90) / 5) ** 2; if (e < 1) return e > .7 ? 0 : pb(x, y, 9); }
      if (glyphAt('CCR', cx + 22, -(y - 100), 0, 0, 2)) return 0;
      if ((x % 16) === 0 && y > 96) return pb(x, y, 8);
      return pb(x, y, 14);
    case 'caban': {
      const v = (y - 86) * .5;
      if (Math.abs(cx) < v && y < 100) return pb(x, y, 12);
      if (Math.abs(Math.abs(cx) - v) < 1 && y < 104) return 1;
      if ((Math.abs(cx) === 8 || Math.abs(cx) === 9) && (y === 104 || y === 105 || y === 112 || y === 113)) return 1;
      return pb(x, y, 2);
    }
    case 'gilet-sherif': {
      const v = (y - 88) * .4;
      if (Math.abs(cx) < v){ if (y < 96 && Math.abs(cx) < 9 - (y - 88)) return ((x + y) % 3 === 0) ? 0 : 1; return (((x >> 1) + (y >> 1)) & 1) ? pb(x, y, 12) : pb(x, y, 5); }
      if (cx > -30 && cx < -16 && y >= 97 && y < 111){ const sx = Math.floor((cx + 30) / 2), sy = Math.floor((y - 97) / 2); if (sx < 7 && sy < 7 && STAR7[sy][sx] === '1'){ PSUB = PM.GOLD; return 1; } }
      if (Math.abs(Math.abs(cx) - v) < 1) return 1;
      return pb(x, y, cx < 0 ? 4 : 2);
    }
    case 'blouse': {
      const v = (y - 88) * .35;
      if (Math.abs(cx) < v && y < 104) return (Math.abs(cx) < 2.5 && y > 92) ? 0 : pb(x, y, 12);
      if (Math.abs(Math.abs(cx) - v) < 1 && y < 108) return 0;
      if (cx > 14 && cx < 24 && y >= 100 && y < 108){ if (y < 102 && (cx === 16 || cx === 18 || cx === 21)){ PSUB = PM.GOLD; return 1; } return (cx === 15 || cx === 23 || y === 100 || y === 107) ? 0 : 1; }
      if (Math.abs(cx) === 1 && y > 106 && (y % 6) === 0) return 0;
      return pb(x, y, cx < 0 ? 16 : 13);
    }
    case 'bowling': {
      if (y < 95 && Math.abs(cx) < 16 && Math.abs(cx) > (y - 86) * .8) return 1;
      if (glyphAt('LULU', cx - 8, -(y - 100), 0, 0, 1)) return 1;
      return cx < 0 ? pb(x, y, 13) : pb(x, y, 3);
    }
    case 'fraise': {
      const ry = 92 + Math.sin(cx * .7) * 2.5;
      if (y < ry + 4 && Math.abs(cx) < 38){ if (Math.abs(y - ry) < 1 || Math.abs(y - (ry + 4)) < .8) return 0; return 1; }
      if (Math.abs(cx) < 2 && (y === 104 || y === 111)) return 1;
      const gx = (x % 12) - 6, gy = ((y + ((x / 12 | 0) & 1) * 6) % 12) - 6;
      return gx * gx + gy * gy < 10 ? 1 : 0;
    }
    case 'survet': {
      if (Math.abs(cx) < 1) return 1;
      if (Math.abs(Math.abs(cx) - 38) < 2 || Math.abs(Math.abs(cx) - 42) < 1) return 1;
      if (y < 93 && Math.abs(cx) < 18) return ((y % 2) === 0) ? 1 : 0;
      if (glyphAt('CCR', cx - 8, -(y - 99), 0, 0, 2)){ PSUB = PM.GOLD; return 1; }
      return pb(x, y, 3);
    }
    case 'trench': {
      const v = (y - 86) * .55;
      if (Math.abs(cx) < v && y < 100) return pb(x, y, 4);
      if (Math.abs(Math.abs(cx) - v) < 1.2 && y < 104) return 1;
      if (y >= 107 && y < 110) return (Math.abs(cx) < 3) ? 1 : 0;
      if ((Math.abs(cx) === 6 || Math.abs(cx) === 7) && (y === 102 || y === 114)) return 0;
      return pb(x, y, cx < 0 ? 11 : 8);
    }
    case 'mariniere':
      if (y < 92) return 1;
      return ((y % 5) < 2) ? 0 : 1;
  }
  return -1;
}
export function drawPortrait(c, t, cv){
  const pctx = cv.getContext('2d');
  const im = pctx.createImageData(PW, PH), d32 = new Uint32Array(im.data.buffer);
  const HX = 80, HY = 60 + Math.round(Math.sin(t * 2.1) * .6);
  const look = c.look, col = c.col, base = FUR[col];
  const earsOn = !EARLESS.includes(look);
  const tw = (t % 5.3) < .18 ? 3 : 0;
  const blink = (t % 4.1) < .13;
  const open = SH.portraitTalk ? (0.5 + 0.5 * Math.sin(t * 17)) : 0;
  const pdx = Math.round(Math.sin(t * .7) * 1.6);
  const dark = col === 'black';
  const bgPM = c.side === 'ccp' ? PM.BG_CCP : c.side === 'usc' ? PM.BG_USC : PM.BG_NEU;
  const furPM = FUR_PM[col] == null ? PM.FUR_WHITE : FUR_PM[col];
  const outPM = PM_OUT0 + Math.max(0, OUTFIT_KEYS.indexOf(c.outfit));
  // 1. masque
  for (let y = 0, i = 0; y < PH; y++) for (let x = 0; x < PW; x++, i++){
    const dx = x - HX, dy = y - HY;
    let m = M_BG;
    if (((x - HX) / 58) ** 2 + ((y - 128) / 42) ** 2 < 1 || (Math.abs(dx) < 17 && dy >= 18)) m = M_BODY;
    let rx = 34; if (dy > 0) rx += 5 * Math.min(1, dy / 12) * (1 - Math.max(0, (dy - 12) / 16));
    const ang = Math.atan2(dy, dx), tuft = (dy > 4 && Math.abs(dx) > 18) ? 2.4 * Math.max(0, Math.sin(ang * 11)) : 0;
    if ((dx / (rx + tuft)) ** 2 + (dy / 28) ** 2 <= 1) m = M_HEAD;
    if (earsOn){
      if (inTri(x, y, HX - 32, HY - 12, HX - 6, HY - 26, HX - 30, HY - 48)) m = inTri(x, y, HX - 27, HY - 16, HX - 11, HY - 25, HX - 27, HY - 40) ? M_INEAR : M_EAR;
      if (inTri(x, y, HX + 32, HY - 12, HX + 6, HY - 26, HX + 30 + tw, HY - 48 + tw)) m = inTri(x, y, HX + 27, HY - 16, HX + 11, HY - 25, HX + 27 + tw, HY - 40 + tw) ? M_INEAR : M_EAR;
    }
    PSUB = -1;
    const hv = hatAt(look, dx, dy, x, y);
    if (hv >= 0){ m = M_HAT; pCol[i] = hv; pMat[i] = PSUB >= 0 ? PSUB : (PM_HAT0 + Math.max(0, HAT_KEYS.indexOf(look))); }
    pMask[i] = m;
  }
  // 2. couleurs
  for (let y = 0, i = 0; y < PH; y++) for (let x = 0; x < PW; x++, i++){
    const m = pMask[i], dx = x - HX, dy = y - HY;
    if (m === M_HAT) continue;
    if (m === M_BG){ pCol[i] = portraitBg(c.side, x, y, t); pMat[i] = (c.side === 'ccp' && x < 30 && y < 30 && pCol[i]) ? PM.GOLD : bgPM; continue; }
    if (m === M_EAR){ pCol[i] = col === 'siamois' ? pb(x, y, 2) : pb(x, y, clamp(base + (dx < 0 ? 2 : -2), 0, 16)); pMat[i] = furPM; continue; }
    if (m === M_INEAR){ pCol[i] = dark ? pb(x, y, 5) : pb(x, y, col === 'white' ? 6 : 12); pMat[i] = PM.PINK; continue; }
    if (m === M_BODY){
      const cx = x - HX;
      const clothed = y >= 93 - (Math.abs(cx) > 18 ? 6 : 0);
      PSUB = -1;
      const ov = clothed ? outfitAt(c.outfit, cx, y, x, t) : -1;
      if (ov >= 0){ pCol[i] = ov; pMat[i] = PSUB >= 0 ? PSUB : outPM; continue; }
      pCol[i] = col === 'white' ? pb(x, y, 14) : pb(x, y, 13);
      pMat[i] = col === 'white' ? furPM : PM.WHITE;
      continue;
    }
    // tete
    const nx = dx / 38, ny = dy / 30, nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
    const lam = clamp(-.45 * nx - .55 * ny + .7 * nz, 0, 1);
    let tone = base + (lam - .6) * 10;
    if (dark && nz < .4 && lam > .25) tone += 5;
    if (col === 'tabby'){
      if (dy < -6 && Math.abs(dx) < 16 && ((dx + 40 + Math.round(dy * .15 * Math.sign(dx))) % 8) < 2.5) tone -= 7;
      if (Math.abs(dx) > 22 && dy > -4 && dy < 16 && ((dy + 40) % 6) < 2) tone -= 7;
    }
    const mz = Math.min(Math.hypot(dx + 6, dy - 15), Math.hypot(dx - 6, dy - 15));
    pMat[i] = furPM;
    if (col === 'siamois'){ if ((dx / 15) ** 2 + ((dy - 9) / 13) ** 2 < 1) tone = 3 + (lam - .5) * 4; }
    else if (mz < 7.5 || ((dx / 8) ** 2 + ((dy - 22) / 4.5) ** 2 < 1)){ tone = dark ? 5 : 15; if (col !== 'white') pMat[i] = PM.WHITE; }
    pCol[i] = pb(x, y, clamp(tone, 0, 16));
  }
  // 3. contour : deux pixels noirs contre la silhouette, puis un halo blanc
  const ring = new Uint8Array(PW * PH);
  for (let y = 0; y < PH; y++) for (let x = 0; x < PW; x++){
    const i = y * PW + x; if (pMask[i] !== M_BG) continue;
    let best = 9;
    for (let oy = -3; oy <= 3; oy++) for (let ox = -3; ox <= 3; ox++){
      const X = x + ox, Y = y + oy; if (X < 0 || Y < 0 || X >= PW || Y >= PH) continue;
      if (pMask[Y * PW + X] !== M_BG){ const d = Math.max(Math.abs(ox), Math.abs(oy)); if (d < best) best = d; }
    }
    ring[i] = best;
  }
  for (let i = 0; i < PW * PH; i++){ if (ring[i] === 1 || ring[i] === 2){ pCol[i] = 0; pMat[i] = PM.DARK; } else if (ring[i] === 3){ pCol[i] = 1; pMat[i] = PM.WHITE; } }
  for (let y = 1; y < PH - 1; y++) for (let x = 1; x < PW - 1; x++){
    const i = y * PW + x, m = pMask[i];
    if ((m === M_HAT && (pMask[i + PW] === M_HEAD || pMask[i + PW] === M_EAR)) || (m === M_HEAD && pMask[i + PW] === M_BODY)){ pCol[i] = dark ? 1 : 0; pMat[i] = PM.DARK; }
  }
  let SM = PM.DARK;
  const set = (x, y, v, m) => { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < PW && y < PH && pMask[y * PW + x] !== M_HAT){ pCol[y * PW + x] = v; pMat[y * PW + x] = m == null ? SM : m; } };
  const setA = (x, y, v, m) => { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < PW && y < PH){ pCol[y * PW + x] = v; pMat[y * PW + x] = m == null ? SM : m; } };
  const ink = dark ? 1 : 0;
  // 4. visage
  for (const s of [-1, 1]){
    const ex0 = HX + s * 16, ey0 = HY;
    for (let y = ey0 - 9; y <= ey0 + 9; y++) for (let x = ex0 - 12; x <= ex0 + 12; x++){
      if (pMask[y * PW + x] !== M_HEAD) continue;
      const ex = x - ex0, ey = y - ey0 + ex * .14 * s;
      const e = (ex / 9) ** 2 + (ey / 6.3) ** 2;
      if (blink){ if (e < 1.2 && Math.abs(ey - 1 - Math.abs(ex) * -.05) < .7) set(x, y, ink, PM.DARK); continue; }
      if (e >= 1 && e < 1.45){ set(x, y, 0, PM.DARK); continue; }
      if (e < 1){
        let v = 1;
        if (ey < -3.5) v = pb(x, y, 9);
        if (Math.abs(ex - pdx) < 2.8 - Math.abs(ey) * .12 && Math.abs(ey) < 5.4) v = 0;
        const hl = (ex - pdx + 2.2) ** 2 + (ey + 2.4) ** 2 < 2.2;
        if (hl) v = 1;
        set(x, y, v, hl ? PM.WHITE : PM.EYE);
      }
    }
  }
  // nez, bouche, moustaches
  SM = PM.PINK;
  for (let y = HY + 9; y <= HY + 13; y++){ const hw = 4 - (y - HY - 9); for (let x = HX - hw; x <= HX + hw; x++) set(x, y, dark ? pb(x, y, 9) : 0); }
  SM = PM.DARK;
  set(HX, HY + 14, ink); set(HX, HY + 15, ink);
  if (open > .15){
    const ry = 1 + open * 3.5;
    for (let y = HY + 15; y <= HY + 16 + ry * 2; y++) for (let x = HX - 5; x <= HX + 5; x++){ const q = ((x - HX) / 4.5) ** 2 + ((y - HY - 16 - ry) / ry) ** 2; if (q < 1) set(x, y, (y > HY + 16 + ry * 1.3) ? pb(x, y, 10) : 0, (y > HY + 16 + ry * 1.3) ? PM.PINK : PM.DARK); }
  } else {
    for (const s of [-1, 1]){ set(HX + s, HY + 16, ink); set(HX + s * 2, HY + 17, ink); set(HX + s * 3, HY + 17, ink); set(HX + s * 4, HY + 16, ink); }
  }
  for (const s of [-1, 1]) for (let k = 0; k < 3; k++){
    const x0 = HX + s * 11, y0 = HY + 13 + k * 2.4, x1 = HX + s * 46, y1 = HY + 7 + k * 7;
    const n = Math.abs(x1 - x0);
    for (let q = 0; q <= n; q++){ const x = Math.round(x0 + (x1 - x0) * q / n), y = Math.round(y0 + (y1 - y0) * q / n + Math.sin(q / n * 3) * .8); if (x < 0 || x >= PW) continue; const i = y * PW + x; if (pMask[i] === M_HAT) continue; pCol[i] = pMask[i] === M_BG ? 1 : (pCol[i] ? 0 : 1); pMat[i] = pCol[i] ? PM.WHITE : PM.DARK; }
  }
  // lunettes
  if (look === 'lunettes' || look === 'noires' || look === 'espion'){
    const sun = look !== 'lunettes';
    const fc = dark ? 1 : 0;
    SM = PM.DARK;
    for (const s of [-1, 1]){
      const ex0 = HX + s * 16;
      for (let y = HY - 10; y <= HY + 10; y++) for (let x = ex0 - 13; x <= ex0 + 13; x++){
        const q = ((x - ex0) / 12) ** 4 + ((y - HY) / 8.5) ** 4;
        if (q < 1 && q >= .62) setA(x, y, sun ? 1 : fc);
        else if (q < .62 && sun) setA(x, y, (Math.abs((x - ex0) + (y - HY) + 3) < 1 && x < ex0) ? 1 : 0);
      }
      for (let x = ex0 + s * 12; Math.abs(x - HX) < 36; x += s) setA(x, HY - 3, sun ? 1 : fc);
    }
    for (let x = HX - 4; x <= HX + 4; x++){ setA(x, HY - 2, sun ? 1 : fc); setA(x, HY - 1, sun ? 1 : fc); }
  }
  // pipe du gardien de phare
  if (c.pipe){
    SM = PM.WOOD;
    for (let q = 0; q <= 18; q++){ const x = HX + 6 + q, y = HY + 17 + q * .25; setA(x, y, 0); setA(x, y + 1, 1); setA(x, y + 2, 0); }
    for (let y = HY + 10; y <= HY + 23; y++) for (let x = HX + 23; x <= HX + 31; x++) setA(x, y, (x === HX + 23 || x === HX + 31 || y === HY + 23) ? 1 : (y === HY + 10 ? 1 : pb(x, y, 3)));
    for (let k = 0; k < 3; k++){
      const p = ((t * .35 + k / 3) % 1), sx = HX + 27 + Math.sin(t * 1.5 + k) * 3 + p * 6, sy = HY + 8 - p * 34, r = 1.5 + p * 3.5;
      for (let y = Math.floor(sy - r); y <= sy + r; y++) for (let x = Math.floor(sx - r); x <= sx + r; x++) if ((x - sx) ** 2 + (y - sy) ** 2 < r * r && pb(x, y, (1 - p) * 10)) setA(x, y, 1);
    }
  }
  // casque de cosmonaute en verre
  if (look === 'cosmo'){
    SM = PM.WHITE;
    const cx0 = HX, cy0 = HY - 6, R = 57;
    for (let y = 0; y < PH; y++) for (let x = 0; x < PW; x++){
      const r = Math.hypot(x - cx0, y - cy0); if (y > HY + 32) continue;
      if (r >= R && r < R + 2.5) setA(x, y, 1);
      else if (r >= R + 2.5 && r < R + 3.5) setA(x, y, 0);
      else if (r > R - 9 && r < R - 6.5){ const a = Math.atan2(y - cy0, x - cx0); if (a > -2.6 && a < -1.9) setA(x, y, 1); if (a > -1.6 && a < -1.45) setA(x, y, 1); }
    }
    for (let k = 0; k < 8; k++) setA(HX + 38 + k * .6, HY - 52 + (-k), 1);
    if (Math.floor(t * 2) % 2) setA(HX + 43, HY - 60, 1);
  }
  if (COLOR) for (let i = 0; i < PW * PH; i++) d32[i] = PPAL32[(pMat[i] << 1) | pCol[i]];
  else for (let i = 0; i < PW * PH; i++) d32[i] = pCol[i] ? WHITE : BLACK;
  pctx.putImageData(im, 0, 0);
}
export function drawFlagIcon(cv, side){
  const g = cv.getContext('2d'), im = g.createImageData(15, 10), d = new Uint32Array(im.data.buffer);
  d.fill(BLACK);
  const px = side === 'neutre' ? null : flagSmall(side, 13, 8);
  if (px) px.forEach(([x, y, m, v]) => { d[(y + 1) * 15 + x + 1] = COLOR ? PAL32[(m << 1) | v] : (v ? WHITE : BLACK); });
  else for (let y = 0; y < 10; y++) for (let x = 0; x < 15; x++) d[y * 15 + x] = (y > 5 && ((x + y) % 3 === 0)) || (x === 7 && y > 1 && y < 7) || (y === 2 && x > 5 && x < 9) ? WHITE : BLACK;
  g.putImageData(im, 0, 0);
}
