# Cold Kutty Town : document produit (PRD)

## 1. En une phrase

Un city builder de chats pendant la guerre froide : on débarque sur une île vierge, on bâtit une ville et on fait grandir son territoire, bleu ou rouge, en temps réel, avant l’autre camp.

## 2. L’intention

- **Un vrai jeu jouable**, pas une vitrine : un début, des choix, une fin.
- **Le croisement de trois familles de jeux** : le city builder (Cities: Skylines : routes, bâtiments, services), la gestion (trois ressources, production et coût de fonctionnement) et la conquête de territoire en direct (OpenFront, Age of Empires : on voit sa couleur avancer sur la carte).
- **Le ton** : une comédie de guerre froide tout public, en pixel art isométrique, avec des chats qui parlent, une radio et un journal du matin.
- **Fluide** : aucun ralentissement, même dézoomé sur toute l’île.

## 3. Les règles d’écriture du monde

- Deux camps, et seulement ces noms : **United Sands of Cats (USC)** et **Cats Communist Republic (CCR)**.
- Aucun pays réel, aucune personne réelle, **aucune année** : c’est « pendant la guerre froide », sans date. Les mois et les saisons restent.
- Tout le texte est en français, sans tiret long ni tiret moyen.
- Drapeaux à tête de chat : USC en bleu, blanc, rouge avec une tête de chat blanche ; CCR en rouge avec une tête de chat jaune.

## 4. Le déroulé d’une partie

1. **Accueil** : on choisit son camp.
2. **Débarquement** : l’île est vide (forêts, plages, rochers, îlots, aucune route, aucun bâtiment, pas de phare). On clique sur la côte où débarquer. Les barges arrivent du large, l’équipage débarque et bâtit le QG (mairie à l’USC, Palais du Peuple à la CCR) avec un premier bout de route. L’autre camp débarque de l’autre côté.
3. **Construire** : routes droites ou courbes, bâtiments posés librement dans son territoire, reliés au QG par la route.
4. **S’étendre** : chaque bâtiment rayonne, le territoire gagne case par case ; les avant-postes poussent la frontière, les barges emmènent des pionniers sur d’autres côtes et sur les îlots.
5. **Se figer** : quand les deux frontières se touchent, la plus forte grignote l’autre. Le Rideau de Laine fige une frontière ; le Checkpoint Minou se pose à côté.
6. **Gagner** : le premier camp à tenir 60 % de l’île gagne. On peut continuer à jouer après.

## 5. Les trois ressources

| Ressource | À quoi elle sert | D’où elle vient |
|---|---|---|
| **Croquettes** | Nourrir les habitants ; nourrir les pionniers des avant-postes et des barges | Pêcheries, fermes et kolkhozes, épiceries, supermarchés, diners, port, chalutiers |
| **Laine** | Construire, améliorer, tracer routes et Rideau | Bergeries, usines, QG, cargos du grand port |
| **Ronrons** | Faire avancer la frontière plus vite, payer avant-postes, barges et améliorations | Habitants nourris et distraits (loisirs), bâtiments de loisirs et de prestige |

Chaque bâtiment a une **production** et un **coût de fonctionnement** par minute. Les producteurs ont besoin d’**emplois** occupés par les habitants : sans assez d’habitants, ils tournent au ralenti. Un bâtiment **sans route jusqu’au QG est à l’arrêt**. Le moral n’existe plus : ce sont les ronrons.

## 6. Construire et améliorer

- Catégories : Logement, Croquettes, Laine, Loisirs, Prestige, Mer, Frontière.
- Les bâtiments de la mer (port, pêcherie, phare) se posent face à l’eau et s’orientent seuls.
- **Améliorations** : trois niveaux payants. Exemple phare : le port passe de ponton en bois à quai en béton, puis à grand port avec grues et cargo. La maison devient pavillon puis villa (isba, datcha, datcha de ministre côté CCR).
- Chaque camp a ses goûts : un diner fait plus ronronner l’USC, une usine fâche moins la CCR.

## 7. La mer

- Les bateaux naviguent vraiment : chemin calculé en mer, sillage, accostage.
- Barges du débarquement, barges de colonisation lancées depuis un port, chalutiers qui partent pêcher et reviennent, cargo du grand port.

## 8. L’écran

- **Barre du haut** : camp, trois ressources avec leur débit par minute et le détail au survol, habitants et emplois, barre de territoire des deux camps avec l’objectif, pause et vitesse (×1, ×2, ×4).
- **Dock en bas** : Observer, Construire (menu par catégories avec vignettes, prix et effet), Route, Courbe, Rideau, Démolir, Annuler, Journal.
- **Panneau du bâtiment sélectionné** : état (chantier, en service, à l’arrêt), production, fonctionnement, emplois, rayon d’influence, Améliorer, Démolir, Barge.
- **Vue de loin en direct** au dézoom : toute l’île en pixel art, qui bouge et tourne comme de près (territoires et frontières, bâtiments, vrais bateaux). Mini-carte cliquable.
- Radio qui défile, événements à choix, journal du matin (Gazette de Kutty et Pravdachat).

## 9. Les chats

- Les chats qui ont un nom arrivent avec leur bâtiment (la serveuse avec le diner, le garagiste avec la station-service...).
- On clique sur un chat pour discuter. **Pour l’instant, les réponses sont des textes tout faits** (pas d’appel à Claude). Claude pourra revenir plus tard.

## 10. L’autre camp

Joué par une IA : elle débarque loin du joueur, construit, trace ses routes, pose ses avant-postes, arme des barges et tricote un Rideau quand elle perd du terrain. **C’est la dernière chose à finaliser** : tout le reste d’abord.

## 11. Ce qui n’est pas dans cette version

- Multijoueur (la partie à deux de claude.ai a été retirée).
- L’ancienne « Ville de 1961 » déjà construite (retirée).
- Aéroports, trains, métro aérien, défilé militaire (peut-être plus tard, en bâtiments à construire).

## 12. Critères de réussite

- 60 images par seconde à tous les zooms sur un portable courant, sans à-coup au dézoom.
- Une partie complète de 40 à 60 minutes, de la plage à la victoire, sans blocage.
- Un nouveau joueur comprend quoi faire dans les 2 premières minutes.
- `npm run build` passe, aucune erreur dans la console.
