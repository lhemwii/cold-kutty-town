// Les regles pures du jeu (src/rules), essayees dans Node : npm test
import { describe, expect, it } from 'vitest';
import { METIERS, shareJobs, type Metier } from '../src/rules/jobs.ts';
import { rleDecode, rleEncode } from '../src/rules/rle.ts';
import { segDist, segInter } from '../src/rules/geom.ts';
import { gridPath, nearestOpen } from '../src/rules/astar.ts';
import { tradeCoins } from '../src/rules/trade.ts';
import { scoreOf } from '../src/rules/score.ts';

const rec = (v: number): Record<Metier, number> => Object.fromEntries(METIERS.map(m => [m, v])) as Record<Metier, number>;

describe('métiers', () => {
  it('assez d’habitants : tous les métiers sont servis', () => {
    const e = shareJobs(100, rec(10), rec(2));
    for (const m of METIERS) expect(e[m]).toBeCloseTo(1);
  });
  it('trop peu d’habitants : le métier prioritaire est mieux servi', () => {
    const prio = rec(1); prio.nourriture = 3;
    const e = shareJobs(12, rec(10), prio);
    expect(e.nourriture).toBeGreaterThan(e.laine);
  });
  it('priorité zéro : personne n’y va', () => {
    const prio = rec(2); prio.armee = 0;
    expect(shareJobs(100, rec(10), prio).armee).toBe(0);
  });
  it('un métier sans demande compte comme servi', () => {
    const d = rec(0); d.laine = 5;
    expect(shareJobs(1, d, rec(2)).recherche).toBe(1);
  });
});

describe('sauvegarde par plages', () => {
  it('aller-retour sans perte', () => {
    const a = new Uint8Array([0, 0, 0, 1, 1, 2, 2, 2, 2, 0]);
    const s = rleEncode(a), b = new Uint8Array(a.length);
    rleDecode(s, b);
    expect([...b]).toEqual([...a]);
    expect(s).toBe('0,3,1,2,2,4,0,1');
  });
});

describe('géométrie', () => {
  it('distance à un segment', () => {
    const [d, s] = segDist(0, 0, 10, 0, 5, 3);
    expect(d).toBeCloseTo(3); expect(s).toBeCloseTo(.5);
  });
  it('au-delà du bout : le bout', () => {
    expect(segDist(0, 0, 10, 0, 14, 3)[0]).toBeCloseTo(5);
  });
  it('deux segments qui se croisent', () => {
    expect(segInter([0, 0], [10, 0], [5, -5], [5, 5])).toBeCloseTo(.5);
    expect(segInter([0, 0], [10, 0], [0, 1], [10, 1])).toBeNull();
  });
});

describe('chemins (A*)', () => {
  // 5 x 5, un mur au milieu avec un passage en bas
  const W = 5, H = 5, G = new Uint8Array(W * H).fill(1);
  for (let y = 0; y < 4; y++) G[y * W + 2] = 0;
  it('contourne le mur', () => {
    const p = gridPath(G, W, H, 0, 4);
    expect(p).not.toBeNull();
    expect(p?.at(-1)).toBe(4);
    expect(p?.some(i => i === 4 * W + 2)).toBe(true);
  });
  it('pas de chemin si tout est fermé', () => {
    const G2 = G.slice(); G2[4 * W + 2] = 0;
    expect(gridPath(G2, W, H, 0, 4)).toBeNull();
  });
  it('case praticable la plus proche', () => {
    expect(nearestOpen(G, W, H, 2, 0, 3)).not.toBe(2);
    expect(G[nearestOpen(G, W, H, 2, 0, 3)]).toBe(1);
  });
});

describe('commerce et score', () => {
  it('acheter coûte plus cher que vendre, partout', () => {
    for (const w of ['checkpoint', 'large'] as const) expect(tradeCoins(10, true, w, false)).toBeGreaterThan(tradeCoins(10, false, w, false));
  });
  it('le pont des échanges améliore les prix', () => {
    expect(tradeCoins(10, true, 'checkpoint', true)).toBeLessThan(tradeCoins(10, true, 'checkpoint', false));
    expect(tradeCoins(10, false, 'checkpoint', true)).toBeGreaterThan(tradeCoins(10, false, 'checkpoint', false));
  });
  it('le score croît avec le territoire et les jalons', () => {
    const base = { ter: .1, pop: 50, techs: 3, space: 0, coins: 100, prod: 20, cities: 1, strength: 10 };
    expect(scoreOf({ ...base, ter: .3 })).toBeGreaterThan(scoreOf(base));
    expect(scoreOf({ ...base, space: 2 })).toBeGreaterThan(scoreOf(base));
  });
});
