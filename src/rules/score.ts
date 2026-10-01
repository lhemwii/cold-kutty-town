/* le score d'un camp (fin du Blitz, paix durable) */
export interface ScoreParts { ter: number; pop: number; techs: number; space: number; coins: number; prod: number; cities: number; strength: number }
export function scoreOf(p: ScoreParts): number {
  return Math.round(p.ter * 1000 + p.pop * 3 + p.techs * 30 + p.space * 150 + p.coins / 10 + p.prod * 2 + p.cities * 80 + p.strength * .3);
}
