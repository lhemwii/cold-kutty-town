// Succes du joueur. Ils sont notes sur la machine du joueur (platform/store.ts) et, dans la version de bureau lancee par Steam,
// envoyes a Steam (desktop/main.mjs, steamworks.js). Les identifiants sont les noms d'API a declarer dans Steamworks.
// Liste provisoire, a redefinir avec le reste du jeu (docs/PLAN.md, etape 4.3).
import { store } from './store.ts';

export type AchievementId = 'PREMIERE_PIERRE' | 'PORT_NIVEAU_3' | 'RIDEAU' | 'DECOLLAGE' | 'VICTOIRE';
export const ACHIEVEMENTS: Record<AchievementId, { name: string; desc: string }> = {
  PREMIERE_PIERRE: { name: 'Première pierre', desc: 'Terminer un premier bâtiment après le quartier général.' },
  PORT_NIVEAU_3: { name: 'Grand port', desc: 'Agrandir un port jusqu’au niveau 3.' },
  RIDEAU: { name: 'Rideau de Laine', desc: 'Poser un premier pan du Rideau de Laine.' },
  DECOLLAGE: { name: 'Décollage', desc: 'Lancer une première fusée.' },
  VICTOIRE: { name: 'L’île est à nous', desc: 'Gagner une partie.' },
};
const isId = (s: string): s is AchievementId => s in ACHIEVEMENTS;

/** ce que la version de bureau expose pour Steam (desktop/preload.cjs) ; absent sur le web */
interface SteamBridge { unlock(id: string): boolean }
const w: Window & { ckDesktop?: { steam?: SteamBridge } } = window;
const steam = w.ckDesktop && w.ckDesktop.steam ? w.ckDesktop.steam : null;

const KEY = 'ckt-succes';
const got = new Set<AchievementId>();
try { const v: unknown = JSON.parse(store.get(KEY) || '[]'); if (Array.isArray(v)) for (const x of v) if (typeof x === 'string' && isId(x)) got.add(x); } catch (_) {}
// un succes gagne hors de Steam (sur le web, ou Steam ferme) lui est rendu au lancement suivant
if (steam) for (const id of got) { try { steam.unlock(id); } catch (_) {} }

/** debloque un succes (sans effet s'il l'est deja) ; vrai s'il est nouveau */
export function unlock(id: AchievementId): boolean {
  if (got.has(id)) return false;
  got.add(id);
  store.set(KEY, JSON.stringify([...got]));
  if (steam){ try { steam.unlock(id); } catch (_) {} }
  return true;
}
export const unlocked = (): AchievementId[] => [...got];
