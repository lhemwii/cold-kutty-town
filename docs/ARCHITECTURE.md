# Architecture du moteur

Cold Kutty Town tourne entièrement dans le navigateur, sans framework ni image. Tout est dessiné par du code, pixel par pixel.

## Le build

Les modules de `src/game/` partagent **une seule portée** : `scripts/build.mjs` les colle dans l’ordre de leur numéro, à l’intérieur d’une fonction, et vérifie la syntaxe. Une variable déclarée dans `01-core.js` est donc visible dans `21-main.js`. C’est simple et rapide, mais l’ordre compte : un module ne peut exécuter du code au chargement qu’avec ce que les modules précédents ont déjà défini (les fonctions, elles, sont connues partout). La feuille de route prévoit de passer à de vrais modules ES avec des `import`.

Le résultat est un site statique dans `dist/` : `index.html`, un CSS et deux scripts avec une empreinte dans le nom, pour que les navigateurs les gardent en cache longtemps.

## Les modules

| Fichier | Rôle |
|---|---|
| `01-core.js` | Bases : matières, crochets (HOOKS), état, caméra, projection isométrique, primitives de dessin (pixels, lignes, faces, boîtes, sprites), police 3x5, drapeaux. |
| `02-ground.js` | L’île : forme, grille du sol (2 cellules par unité), aéroports, ports et quais, voie ferrée, routes (segments droits), trottoirs, terrains à bâtir. |
| `03-buildings-base.js` | Aides de décor : lumières, fumée, sprites en texte, arbres, lampadaires, maisons à pignon, voitures. |
| `04-types.js` | Catalogue des bâtiments (première partie) : chaque type sait se dessiner et déclare ses pièces, décalques et lumières. |
| `05-types-extra.js` | Catalogue (suite) : diner, cinéma, drive-in, base de lancement, cirque, tribune... |
| `06-types-more.js` | Catalogue (fin) : gratte-ciel, kolkhoze, églises à bulbes, stade, gare, mairie, Palais du Peuple, palette de construction. |
| `07-world.js` | Le Rideau de Laine, miradors, checkpoint, barrières, cabines, panneaux, phare, bateaux amarrés, voilier, arbres et accessoires. |
| `08-airport.js` | Les avions : tours de piste réels, décollage, atterrissage, ombres ; défilé militaire. |
| `09-transit.js` | Trains, gares, passages à niveau, métro aérien, limousine du checkpoint. |
| `10-cars-cats.js` | Voitures sur un graphe de routes, les chats habitants (noms, métiers, caractères), ville de départ, reconstruction des objets et des ombres. |
| `11-render.js` | Palette jour et nuit, horloge, météo, écran et zoom continu, vue d’ensemble mise en cache, rendu du sol, tri des objets, lumières. |
| `12-portrait.js` | Portrait détaillé du chat dans la fenêtre de discussion. |
| `13-ui.js` | Interface : inspecteur, lumière, modes, palette, construire, démolir, routes, souris, tactile, clavier. |
| `14-camps.js` | Les deux camps : jauges du Rêve et du Plan, demandes des habitants, tension. |
| `15-economy.js` | Économie (croquettes, laine, moral), voisinage, bâtiments qui évoluent, chantiers, annuler, événements, course à l’espace. |
| `16-modes.js` | Modes de jeu : Ville de 1961 et Débarquement (frontières, déblocages, mur qui se tricote). |
| `17-ai.js` | Calendrier et saisons, carnet du jour, journal du matin écrit par Claude, mémoire des chats, bulles, pensées. |
| `18-life.js` | Feux d’artifice et sapins, port (grues, cargos, entrepôts), ferry, barges, passants, matchs, reflets de nuit. |
| `19-extras.js` | Son généré par le navigateur, mini-carte, fiche au survol, mode photo. |
| `20-multiplayer.js` | Partie à deux (base partagée et salles de claude.ai). |
| `21-main.js` | Radio, conversation avec les chats, sauvegarde, boucle de jeu, écran d’accueil, démarrage. |

## Le rendu

- **Projection isométrique.** Le monde a deux axes au sol, `a` (ouest vers est) et `b` (nord vers sud), plus la hauteur `z`. `prj(a, b, z)` donne le pixel à l’écran, `unprj(x, y)` fait l’inverse au sol. La caméra tourne librement (`cam.phi`).
- **Trois buffers par pixel.** `fb` (allumé ou éteint), `mb` (la matière : herbe, route, toit, fenêtre...) et `lb` (le niveau d’éclairage, de 0 plein soleil à 4 ombre portée). À la fin de l’image, la palette transforme chaque triplet en couleur. Cette version utilise la palette couleur (`COLOR = true` dans `01-core.js`).
- **Palette.** Chaque matière a deux teintes (sombre, claire), déclinées en cinq niveaux de lumière et mélangées selon l’heure, la météo, la neige et la saison. Les matières lumineuses (fenêtres, néons, lampadaires, feux d’artifice) gardent leur éclat la nuit.
- **Sol.** La grille du sol (`gType`, `gTone`, 2 cellules par unité) est parcourue une fois par image : herbe, plages, écume animée, routes, rails, quais.
- **Objets.** Bâtiments, arbres, lampadaires sont des « pièces » statiques reconstruites quand la ville change (`rebuildTown`). Voitures, chats, avions, trains, bateaux sont dynamiques. Tout est trié par profondeur (`dep(a, b)`) puis dessiné de l’arrière vers l’avant.
- **Zoom.** `Z` est le zoom affiché, continu. `K` est l’échelle entière de rendu. Le canvas est ensuite agrandi en CSS. Sous `KMIN`, toute l’île est rendue une fois dans un cache puis affichée réduite (vue d’ensemble), avec une transformation affine pendant les rotations.

## Les crochets

Les modules récents s’accrochent au moteur sans le modifier, via `HOOKS` (déclaré dans `01-core.js`) :

| Crochet | Appelé | Exemple |
|---|---|---|
| `HOOKS.step` | à chaque image, avant le rendu | calendrier, son, feux d’artifice |
| `HOOKS.dyn` | quand on rassemble les objets dynamiques | ferry, passants, matchs |
| `HOOKS.top` | après tous les objets, par-dessus | feux d’artifice, pensées des chats |
| `HOOKS.post` | juste avant d’afficher l’image | reflets de nuit |
| `HOOKS.after` | après l’affichage | bulles, mini-carte, présence |
| `HOOKS.town` | quand la ville est reconstruite | pièces du port |

## L’état et la sauvegarde

- Les terrains (`LOTS`) portent leur type, leur niveau, leur camp et leur chantier en cours.
- `snapshotTown()` écrit l’écart avec la ville de départ, les ressources, les jauges, le calendrier et les routes. La sauvegarde va dans le `localStorage` du navigateur et, dans claude.ai, dans la base privée de l’utilisateur.

## La plateforme

Le jeu parle à une interface `window.claude.use(nom)` :

- **Dans claude.ai** (artefact), la plateforme fournit Claude, la base partagée, les salles en direct et les téléchargements.
- **Ailleurs** (Vercel, local), `src/platform/standalone.js` fournit la même interface : Claude passe par `/api/claude` (fonction Vercel, clé côté serveur), les téléchargements par le navigateur. La base partagée n’existe pas encore hors de claude.ai, donc la partie à deux y est désactivée.

## Outils de test

`window.__okt` expose l’état interne (caméra, terrains, chats, ressources, calendrier...) pour les tests automatiques et le débogage dans la console.
