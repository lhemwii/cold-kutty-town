// Etat partage entre modules : les variables que plusieurs modules modifient (zoom, dessin en cours, listes du monde),
// et ce qu'un module appelle dans un module plus grand en numero (enregistre par ce dernier a son chargement).
// Les types communs a tout le jeu sont declares ici, pour que chaque module puisse les importer.

/** Un camp : United Sands of Cats ou Cats Communist Republic. */
export type Side = 'usc' | 'ccp';

/** Un batiment pose sur la carte (emprise au sol a0..a1, b0..b1 en unites du monde). */
export interface Building {
  id: number;
  type: string;
  side: Side;
  ca: number; cb: number;
  a0: number; a1: number; b0: number; b1: number;
  /** niveau d'amelioration, de 1 a 3 */
  lvl: number;
  /** orientation (0 a 3) ; pour la cote, direction de la mer */
  dir: number;
  done: boolean;
  /** debut du chantier et sa duree (temps de jeu, secondes) */
  buildT: number; bdur: number;
  /** debut et duree d'une amelioration en cours (0 : aucune) */
  upT: number; udur?: number;
  doneT?: number;
  demoT?: number;
  /** en fonctionnement (assez de croquettes, de laine et de route) */
  active: boolean;
}

/**
 * Ce que porte SH. Les champs deja convertis en TypeScript sont types ; les autres restent libres
 * le temps de la conversion (voir docs/PLAN.md, etape 0.19).
 */
export interface Shared {
  BLD: Building[];
  NIGHT: number;
  TOWN_VER: number;
  [name: string]: any;
}
export const SH = {} as Shared;
