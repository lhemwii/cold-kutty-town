/* geometrie au sol */
const clamp = (v: number, a: number, b: number) => v < a ? a : v > b ? b : v;
/** point d'un segment le plus proche : [distance, position entre 0 et 1] */
export function segDist(pa: number, pb: number, qa: number, qb: number, a: number, b: number): [number, number] {
  const da = qa - pa, db = qb - pb, L2 = da * da + db * db || 1;
  const s = clamp(((a - pa) * da + (b - pb) * db) / L2, 0, 1);
  return [Math.hypot(pa + da * s - a, pb + db * s - b), s];
}
/** croisement de deux segments : la position sur le premier (0 a 1), ou null */
export function segInter(p: number[], q: number[], r: number[], s: number[]): number | null {
  const d = (q[0] - p[0]) * (s[1] - r[1]) - (q[1] - p[1]) * (s[0] - r[0]); if (Math.abs(d) < 1e-9) return null;
  const t = ((r[0] - p[0]) * (s[1] - r[1]) - (r[1] - p[1]) * (s[0] - r[0])) / d, u = ((r[0] - p[0]) * (q[1] - p[1]) - (r[1] - p[1]) * (q[0] - p[0])) / d;
  return (t >= -1e-6 && t <= 1 + 1e-6 && u >= -1e-6 && u <= 1 + 1e-6) ? t : null;
}
