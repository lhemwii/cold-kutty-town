/* les habitants se repartissent entre les metiers selon les priorites (0 a 3) et la demande de chaque metier */
export type Metier = 'nourriture' | 'laine' | 'industrie' | 'services' | 'recherche' | 'armee';
export const METIERS: Metier[] = ['nourriture', 'laine', 'industrie', 'services', 'recherche', 'armee'];
const clamp = (v: number, a: number, b: number) => v < a ? a : v > b ? b : v;
/** part de la demande servie, par metier (1 : tout le monde est la ; un metier sans demande compte pour 1) */
export function shareJobs(pop: number, demand: Record<Metier, number>, prio: Record<Metier, number>): Record<Metier, number> {
  const got: Record<Metier, number> = { nourriture: 0, laine: 0, industrie: 0, services: 0, recherche: 0, armee: 0 };
  let left = pop;
  for (let round = 0; round < 4 && left > .01; round++){
    let wsum = 0; for (const m of METIERS) if (got[m] < demand[m] && prio[m] > 0) wsum += prio[m] * demand[m];
    if (!wsum) break;
    let used = 0;
    for (const m of METIERS){ if (got[m] >= demand[m] || prio[m] <= 0) continue; const give = Math.min(demand[m] - got[m], left * prio[m] * demand[m] / wsum); got[m] += give; used += give; }
    left -= used;
  }
  const eff = { ...got }; for (const m of METIERS) eff[m] = demand[m] ? clamp(got[m] / demand[m], 0, 1) : 1;
  return eff;
}
