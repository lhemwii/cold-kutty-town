// Stockage du jeu (parties, vignettes, profil, options, memoire des chats) : une valeur texte par cle.
// Sur le web, dans le navigateur (localStorage). Dans la version de bureau, un fichier par cle dans le dossier
// de l'utilisateur (desktop/main.mjs), que Steam peut synchroniser. Appels synchrones dans les deux cas.

export interface KeyStore {
  get(k: string): string | null;
  /** faux si l'ecriture a echoue (stockage plein, disque en lecture seule) */
  set(k: string, v: string): boolean;
  del(k: string): void;
  keys(): string[];
}
/** ce que la version de bureau expose a la page (desktop/preload.cjs) */
interface DesktopBridge {
  platform: string;
  store: { get(k: string): string | null; set(k: string, v: string): boolean; del(k: string): boolean; keys(): string[] };
}

const w: Window & { ckDesktop?: DesktopBridge } = window;
const desk = w.ckDesktop ? w.ckDesktop.store : null;

/** vrai dans la version de bureau (Electron) */
export const isDesktop = !!desk;

const local: KeyStore = {
  get(k){ try { return localStorage.getItem(k); } catch (_) { return null; } },
  set(k, v){ try { localStorage.setItem(k, v); return true; } catch (_) { return false; } },
  del(k){ try { localStorage.removeItem(k); } catch (_) {} },
  keys(){ try { const out: string[] = []; for (let i = 0; i < localStorage.length; i++){ const k = localStorage.key(i); if (k != null) out.push(k); } return out; } catch (_) { return []; } },
};

export const store: KeyStore = desk ? {
  get(k){ try { return desk.get(k); } catch (_) { return null; } },
  set(k, v){ try { return desk.set(k, v); } catch (_) { return false; } },
  del(k){ try { desk.del(k); } catch (_) {} },
  keys(){ try { return desk.keys(); } catch (_) { return []; } },
} : local;
