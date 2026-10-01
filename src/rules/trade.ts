/* prix en Catcoins de 10 unites d'une marchandise : au checkpoint (avec l'autre camp) ou au large (nations amies) */
export function tradeCoins(base: number, buy: boolean, where: 'checkpoint' | 'large', bridge: boolean): number {
  const b = bridge ? .85 : 1;
  return Math.round(where === 'checkpoint' ? base * (buy ? 1.3 * b : 1 / b) : base * (buy ? 1.6 : .7));
}
