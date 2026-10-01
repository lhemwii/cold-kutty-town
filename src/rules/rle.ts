/* codage par plages : « valeur, nombre, valeur, nombre... » (territoire et brouillard dans les sauvegardes) */
export function rleEncode(a: ArrayLike<number>): string { const out: number[] = []; let v = a[0], n = 0; for (let i = 0; i < a.length; i++){ if (a[i] === v) n++; else { out.push(v, n); v = a[i]; n = 1; } } out.push(v, n); return out.join(','); }
export function rleDecode(s: string, into: Uint8Array): void { const p = s.split(',').map(Number); let i = 0; for (let k = 0; k + 1 < p.length; k += 2){ into.fill(p[k], i, i + p[k + 1]); i += p[k + 1]; } }
