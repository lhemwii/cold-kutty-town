/* plus court chemin sur une grille (huit voisins, pas de coin coupe) : G[i] = 1 si la case est praticable */
let HEAP = new Int32Array(0), GS = new Float32Array(0), FROM = new Int32Array(0), STAMP = new Int32Array(0), stampN = 0;
/** la case praticable la plus proche de (x, y), a moins de rMax cases ; -1 sinon */
export function nearestOpen(G: Uint8Array, W: number, H: number, x: number, y: number, rMax: number): number {
  if (x >= 0 && y >= 0 && x < W && y < H && G[y * W + x]) return y * W + x;
  let best = -1, bd = 1e9;
  for (let r = 1; r < rMax && best < 0; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++){ const xx = x + dx, yy = y + dy; if (xx >= 0 && yy >= 0 && xx < W && yy < H && G[yy * W + xx] && dx * dx + dy * dy < bd){ bd = dx * dx + dy * dy; best = yy * W + xx; } }
  return best;
}
/** les cases du chemin, de la premiere apres le depart jusqu'a l'arrivee ; null si on n'y arrive pas */
export function gridPath(G: Uint8Array, W: number, H: number, st: number, goal: number, maxIter = 90000): number[] | null {
  const N = W * H;
  if (STAMP.length !== N){ HEAP = new Int32Array(N + 8); GS = new Float32Array(N); FROM = new Int32Array(N); STAMP = new Int32Array(N); stampN = 0; }
  stampN++;
  const tx = goal % W, ty = (goal / W) | 0, hx = (i: number) => { const x = i % W, y = (i / W) | 0, dx = Math.abs(x - tx), dy = Math.abs(y - ty); return Math.max(dx, dy) + .414 * Math.min(dx, dy); };
  const FS = new Map<number, number>();
  let hn = 0;
  const push = (i: number, f: number) => { FS.set(i, f); let k = hn++; HEAP[k] = i; while (k > 0){ const pk = (k - 1) >> 1; if ((FS.get(HEAP[pk]) || 0) <= f) break; HEAP[k] = HEAP[pk]; HEAP[pk] = i; k = pk; } };
  const pop = (): number => { const top = HEAP[0]; const last = HEAP[--hn]; let k = 0; const f = FS.get(last) || 0; for (;;){ const l = 2 * k + 1, r = l + 1; let m = k, mf = f; if (l < hn && (FS.get(HEAP[l]) || 0) < mf){ m = l; mf = FS.get(HEAP[l]) || 0; } if (r < hn && (FS.get(HEAP[r]) || 0) < mf){ m = r; } if (m === k) break; HEAP[k] = HEAP[m]; k = m; } HEAP[k] = last; return top; };
  STAMP[st] = stampN; GS[st] = 0; FROM[st] = -1; push(st, hx(st));
  let found = st === goal, iter = 0;
  while (!found && hn > 0 && iter++ < maxIter){
    const cur = pop(); if (cur === goal){ found = true; break; }
    const cx = cur % W, cy = (cur / W) | 0, g0 = GS[cur];
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++){
      if (!dx && !dy) continue;
      const x = cx + dx, y = cy + dy; if (x < 0 || y < 0 || x >= W || y >= H) continue;
      const ni = y * W + x; if (!G[ni]) continue;
      if (dx && dy && (!G[cy * W + x] || !G[y * W + cx])) continue;
      const g = g0 + (dx && dy ? 1.414 : 1);
      if (STAMP[ni] === stampN && GS[ni] <= g) continue;
      STAMP[ni] = stampN; GS[ni] = g; FROM[ni] = cur; push(ni, g + hx(ni));
    }
  }
  if (!found) return null;
  const out: number[] = []; let k = goal;
  while (k !== st && k >= 0){ out.push(k); k = FROM[k]; }
  return out.reverse();
}
