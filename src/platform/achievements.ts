// Succes du joueur. Ils sont notes sur la machine du joueur (platform/store.ts) et, dans la version de bureau lancee par Steam,
// envoyes a Steam (desktop/main.mjs, steamworks.js). Les identifiants sont les noms d'API a declarer dans Steamworks.
// Redefinie a l'etape 12 (docs/PLAN.md) avec les nouvelles facons de gagner.
import { store } from './store.ts';

export type AchievementId = 'PREMIERE_PIERRE' | 'PORT_NIVEAU_3' | 'RIDEAU' | 'DECOLLAGE' | 'VICTOIRE' | 'VILLE' | 'TRAIN' | 'SAVANT' | 'LUNE' | 'DIPLOMATE' | 'ESPION' | 'TRANSFUGES' | 'V_MILITAIRE' | 'V_SCIENCE' | 'V_SOCIALE' | 'V_ECONOMIE' | 'V_CIRCONSTANCE' | 'BLITZ';
export const ACHIEVEMENTS: Record<AchievementId, { name: string; desc: string }> = {
  PREMIERE_PIERRE: { name: 'Première pierre', desc: 'Terminer un premier bâtiment après le quartier général.' },
  PORT_NIVEAU_3: { name: 'Grand port', desc: 'Agrandir un port jusqu’au niveau 3.' },
  RIDEAU: { name: 'Rideau de Laine', desc: 'Poser un premier pan du Rideau de Laine.' },
  DECOLLAGE: { name: 'Décollage', desc: 'Lancer une première fusée.' },
  VICTOIRE: { name: 'L’île est à nous', desc: 'Gagner une partie.' },
  VILLE: { name: 'Une deuxième ville', desc: 'Faire d’un camp un chef-lieu, puis une ville.' },
  TRAIN: { name: 'En voiture', desc: 'Faire rouler un premier train entre deux gares.' },
  SAVANT: { name: 'Têtes chercheuses', desc: 'Terminer dix recherches.' },
  LUNE: { name: 'Un petit pas pour un chat', desc: 'Envoyer le premier chat sur la Lune.' },
  DIPLOMATE: { name: 'Poignée de pattes', desc: 'Signer un traité de paix.' },
  ESPION: { name: 'Bien renseigné', desc: 'Voler une recherche à l’autre camp.' },
  TRANSFUGES: { name: 'Passés à l’Ouest, ou à l’Est', desc: 'Accueillir vingt habitants venus de l’autre camp.' },
  V_MILITAIRE: { name: 'Victoire militaire', desc: 'Gagner par l’anéantissement ou la capitulation de l’autre camp.' },
  V_SCIENCE: { name: 'Victoire scientifique', desc: 'Réussir le premier les cinq jalons de la science.' },
  V_SOCIALE: { name: 'Victoire sociale', desc: 'Gagner par le nombre et le bonheur de ses habitants.' },
  V_ECONOMIE: { name: 'Victoire économique', desc: 'Gagner par la richesse.' },
  V_CIRCONSTANCE: { name: 'Victoire de circonstance', desc: 'Gagner par le territoire ou par la paix.' },
  BLITZ: { name: 'Éclair', desc: 'Gagner une partie Blitz.' },
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
