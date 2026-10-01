// Etat partage entre modules : les variables que plusieurs modules modifient (zoom, dessin en cours, listes du monde),
// et ce qu'un module appelle dans un module plus grand en numero (enregistre par ce dernier a son chargement).
// Les types communs a tout le jeu sont declares ici, pour que chaque module puisse les importer.
// (un import de type seul, meme d'un module plus grand en numero, ne change rien a l'ordre de chargement)
import type { Road } from './09-roads.ts';
import type { Wall, WallTower } from './07-world.ts';
import type { Cat } from './10-town.ts';
import type { Boat } from './16-boats.ts';

/** Un camp : United Sands of Cats ou Cats Communist Republic. */
export type Side = 'usc' | 'ccp';

/** Un batiment pose sur la carte (emprise au sol a0..a1, b0..b1 en unites du monde). */
export interface Building {
  /** solidite (etape 9) : absente, le batiment est intact */
  hp?: number;
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
  /** nom de la ville, pour un QG ou un chef-lieu */
  name?: string;
  demoT?: number;
  /** en fonctionnement (assez de croquettes, de laine et de route) */
  active: boolean;
}

/** Une lumiere au sol la nuit : un disque (lampadaire, projecteur) ou un cone (phares d'une voiture). */
export type Light =
  | { kind: 'circle'; a: number; b: number; r: number; k: number; att: number; m?: number }
  | { kind: 'cone'; a: number; b: number; da: number; db: number; tan: number; w0: number; len: number; k: number; att: number; m?: number };

/** Une piece de decor statique (un morceau de batiment, un pan de mur, un lampadaire), triee par profondeur autour de (a, b). */
export interface Part {
  a: number; b: number;
  /** decalage de tri en profondeur */
  zb: number;
  draw: (t: number) => void;
  /** points (a, b, z a la suite) ajoutes a l'ombre portee */
  shadow?: number[];
  m?: number; side?: Side; lot?: Building;
}
/** Ce que renvoie le dessin d'un type de batiment : ses pieces, ses decors au sol, ses lumieres, son ombre, son phare. */
export interface BuiltParts {
  parts: Part[];
  decals?: ((t: number) => void)[];
  lights?: Light[];
  shadowPts?: number[];
  beacon?: number[];
  /** batiment tourne : ramene un point du repere du batiment sur la carte */
  turned?: (a: number, b: number) => [number, number];
}

/** ombre portee d'un objet : son contour au sol, et un cercle qui l'englobe [a, b, rayon] pour l'ecarter vite hors de l'ecran */
export type ShadowHull = [number, number][] & { box?: [number, number, number] };

/**
 * Ce que porte SH. Les champs deja convertis en TypeScript sont types ; les autres restent libres
 * le temps de la conversion (voir docs/PLAN.md, etape 0.19).
 */
export interface Shared {
  BLD: Building[];
  ROADS: Road[];
  WALLS: Wall[];
  WALL_TOWERS: WallTower[];
  CATS: Cat[];
  BOATS: Boat[];
  SHADOWS: ShadowHull[];
  /** pendant la capture des ombres, les points (a, b, z) des faces dessinees ; null sinon */
  CAPTURE: number[] | null;
  NIGHT: number;
  /** rang de dessin de ce qu'on dessine en ce moment (01-core, db) */
  RANK: number;

  /** vrai quand le sol de l'image en cours est calcule par la carte graphique (11-render, etape 0.19, 3.2) */
  GPU_GROUND: boolean;
  /** pour comparer : force le calcul du sol par le processeur */
  CPU_GROUND?: boolean;
  /** pour comparer : les objets sont tous dessines par le processeur */
  CPU_OBJECTS?: boolean;
  /** pour comparer : ombres, lumieres de nuit et meteo par le processeur */
  CPU_FX?: boolean;
  /** vrai quand ombres, lumieres et meteo de l'image en cours sont faites par la carte graphique */
  GPU_FX?: boolean;


  /** reflets de nuit a faire par la carte graphique pour l'image en cours (18-life), null sinon */
  REFL: { road: boolean; maxW: number; maxR: number; tick: number; wet: number } | null;


  TOWN_VER: number;
  [name: string]: any;
}
export const SH = {} as Shared;
