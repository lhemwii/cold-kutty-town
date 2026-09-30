# Architecture du moteur

Cold Kutty Town tourne entièrement dans le navigateur, sans image. Tout est dessiné par du code, pixel par pixel ; PixiJS affiche le résultat par la carte graphique.

## Le build

Le jeu est construit par **Vite** (`vite.config.js`). La page est `src/index.html`, le point d’entrée `src/main.ts` : il charge l’adaptateur de plateforme, puis les modules de `src/game/` dans l’ordre de leur numéro.

Les modules sont de **vrais modules ES**, avec trois règles :

- **Tout ce qui est déclaré au niveau d’un module est exporté.**
- **Un module n’importe que des modules plus petits en numéro.** L’ordre d’exécution au chargement reste donc celui des numéros, comme avant : un module peut utiliser au chargement tout ce que les modules précédents ont défini.
- **La vue** (projection `PC`, `PS`, `TX`, `TY`, échelle `SC`, taille `W`, `H`, `N`, tampons `fb`, `mb`, `lb`, `px32`) reste faite de variables de `01-core.ts`, importées partout : elles sont lues à chaque pixel, et une variable de module est bien plus rapide qu’une propriété d’objet. Un autre module la change par `setView({ … })`, et la garde par `getView()` pour la remettre ensuite (dessin des vignettes, dessin d’un objet de loin).
- **L’objet partagé `SH` (`00-shared.ts`)** porte le reste. D’abord les variables que plusieurs modules modifient : le zoom (`SH.Z`, `SH.K`, `SH.KMIN`…), le dessin en cours (`SH.CUR`, `SH.CUR_SIDE`, `SH.LV`) et les listes du monde (`SH.BLD`, `SH.ROADS`, `SH.BOATS`…). Ensuite ce qu’un module appelle dans un module plus grand en numéro : celui-ci s’y enregistre à la fin de son chargement (`Object.assign(SH, { saveSoon, … })`), et l’appelant écrit `SH.saveSoon()`. Ces appels ne se font jamais au chargement.

La conversion depuis l’ancienne portée unique a été faite par un script (analyse des portées avec eslint-scope), sans toucher à la logique.

**TypeScript.** Tout le jeu est en TypeScript, vérifié par `tsc` en mode strict (`npm run typecheck`, lancé aussi par `npm run build`) ; Vite ne fait que retirer les types. Aucun `any` : seule la signature d’index de `SH` en garde un, pour les champs pas encore déclarés dans `Shared`. Les types communs sont dans `00-shared.ts` (`Side`, `Building`, `Light`, `Part`, `ShadowHull`), ceux du dessin dans `01-core.ts` (`PixFn`, `Shade`, `SideFn`, `Sprite`, `View`, `GameState`). Un élément de la page se prend par `$(id)`, ou `$of(id, HTMLInputElement)` quand il faut son type exact. Un import pointe vers le vrai fichier (`'./02-ground.ts'`).

`npm run dev` sert le jeu avec rechargement à chaud (et `/api/claude` en local), `npm run build` écrit un site statique dans `dist/` (une page, un CSS et un script avec une empreinte dans le nom, pour un cache long), `npm run preview` le sert tel qu’il sera en ligne.

## Les modules

| Fichier | Rôle |
|---|---|
| `01-core.ts` | Bases : matières, crochets (HOOKS), état de partie (`GAME`), caméra, projection isométrique, primitives de dessin, police 3x5, plaques et panneaux collés au monde (`wallBitmap`, `plateW`), drapeaux à tête de chat. |
| `02-ground.ts` | Le monde tiré au sort : tailles de carte (`MAP_SIZES`, `setMapSize`) et formes (`MAP_CONFS` : une île, deux, quatre, archipel, atoll), îles et îlots, plages, chaînes de montagnes, forêts, grille du sol (2 cellules par unité, 1 au-delà de « grande »), défrichage. La grille, le territoire (`TER`), la carte `MAPV` et la navigation (`NAV`) sont redimensionnés à chaque nouvelle partie ; les distances à la côte restent en demi-unités quelle que soit la finesse. |
| `03-buildings-base.ts` | Aides de décor : lumières, fumée, arbres, maisons à pignon, voitures (aussi en biais), coques de bateaux, fanions. |
| `04-types.ts`, `05-types-extra.ts`, `06-types-more.ts` | Catalogue des bâtiments. Chaque type sait se dessiner. `06` contient aussi QG, port (3 niveaux), pêcherie, bergerie, phare, avant-poste, Checkpoint. |
| `07-world.ts` | Forêts et montagnes rangées par cases, Rideau de Laine en pans libres, miradors, phare, lampadaires, voilier, vestiges catzi (`VEST`, `VEST_DEF`). |
| `08-territory.ts` | Territoires : grille de cases de 4 unités, influence des bâtiments, expansion en direct, pression aux frontières, verrous. |
| `09-roads.ts` | Routes droites et courbes : peinture au sol, graphe, raccords, accès au QG, voitures. |
| `10-town.ts` | Bâtiments posés (`BLD`), règles de pose, chats nommés qui arrivent avec leur bâtiment, reconstruction de la scène. Bâtiments tournés d’un quart de tour (`buildParts`, `turnDraw`). |
| `11-render.ts` | Palette jour et nuit, météo, zoom, vue de loin en direct, rendu du sol avec territoires, objets, ombres. |
| `12-portrait.ts` | Portrait détaillé du chat dans la fenêtre de discussion. |
| `13-ui.ts` | Outils : observer, construire, routes, Rideau, démolir, annuler ; souris, tactile, clavier ; pause et vitesse. |
| `14-hud.ts` | Barre du haut, détail des ressources, menu de construction par catégories, panneau du bâtiment sélectionné. |
| `15-economy.ts` | Croquettes, laine, ronrons : table `ECO`, bilans, chantiers, améliorations, événements, course à l’espace. |
| `16-boats.ts` | Navigation en mer (A*), barges, chalutiers, cargos, équipages. |
| `17-calendar.ts` | Calendrier et saisons, journal du matin, mémoire des chats, bulles, pensées. |
| `18-life.ts` | Feux d’artifice, passants, matchs, reflets de nuit. |
| `19-extras.ts` | Son, mini-carte, fiche au survol, mode photo. |
| `20-rival.ts` | IA adverse (ébauche, à finir en dernier). |
| `21-main.ts` | Radio, conversation, sauvegarde, déroulé de la partie (accueil, plage, victoire), boucle de jeu. |
| `22-home.ts` | Accueil du jeu : menu, parties sauvegardées par emplacements (`ckt-saves`, `ckt-partie-*`, vignettes), profil, options, île qui tourne en fond. |
| `23-planet.ts` | Éteint pour l’instant (`GLOBE_ON = false`), gardé pour le mode espace. Le globe, sans transition : de loin, `planetWarp` pose l’image plate du jeu sur une sphère dont le rayon descend en continu jusqu’à celui de la planète (`CURV`, `GR`, `geoSet`, `geoCast`, `geoProj` dans 01-core, `curvOf` dans 11-render). Hors de l’image plate : la carte de l’île, puis une texture tirée au sort (océans, continents, banquise, nuages). Jour et nuit, halo, étoiles fixes dans l’espace. Sert aussi de fond à l’accueil. |

## Hors des modules numérotés

Ces fichiers ne dépendent d’aucun module du jeu : n’importe quel module peut les importer.

| Fichier | Rôle |
|---|---|
| `src/gpu/present.ts` | Affichage par PixiJS : mise en couleur de l’image par la palette, dans un shader (voir plus bas). |
| `src/platform/standalone.ts` | Hors de claude.ai : Claude par `/api/claude`, téléchargements par le navigateur. |
| `src/platform/store.ts` | Stockage du jeu, une valeur texte par clé : le navigateur sur le web, des fichiers dans la version de bureau. |
| `src/platform/achievements.ts` | Succès : gardés sur la machine, envoyés à Steam dans la version de bureau. |
| `desktop/main.mjs`, `desktop/preload.cjs` | Version de bureau (Electron) : fenêtre, protocole `app://`, sauvegardes sur disque, Steam (steamworks.js), et le pont `window.ckDesktop` exposé à la page. |

## Le rendu


- **Projection isométrique.** Le monde a deux axes au sol, `a` (ouest vers est) et `b` (nord vers sud), plus la hauteur `z`. `prj(a, b, z)` donne le pixel à l’écran, `unprj(x, y)` fait l’inverse au sol. La caméra tourne librement (`cam.phi`).
- **Trois buffers par pixel.** `fb` (allumé ou éteint), `mb` (la matière : herbe, route, toit, fenêtre...) et `lb` (le niveau d’éclairage, de 0 plein soleil à 4 ombre portée). À la fin de l’image, la palette transforme chaque triplet en couleur. Cette version utilise la palette couleur (`COLOR = true` dans `01-core.ts`).
- **Affichage par PixiJS (`src/gpu/present.ts`).** Les quatre tampons (`mb`, `fb`, `lb`, `ob`) partent en une seule texture RGBA, la palette (`PALX`) en une autre, renvoyée seulement quand elle change (`SH.palKey`). Un shader WebGL2 fait la mise en couleur, pixel par pixel, comme le faisait la boucle de la fin de `render`. Le canvas garde la taille du jeu (`W` × `H`) et le navigateur l’agrandit au pixel près (`image-rendering: pixelated`) : l’image est la même qu’avant. Le tampon WebGL est gardé (`preserveDrawingBuffer`), si bien que le journal et le mode photo peuvent toujours recopier le canvas. Sans WebGL2, ou avec `?gl=0` dans l’adresse, `render` met en couleur sur le processeur (`toRGBA`) et affiche par un canvas 2D (`presentImage`). Le globe, qui retouche l’image déjà en couleur, passe par `presentImage` (`drawRGBA` côté PixiJS).

- **Palette.** Chaque matière a deux teintes (sombre, claire), déclinées en cinq niveaux de lumière et mélangées selon l’heure, la météo, la neige et la saison. Les matières lumineuses (fenêtres, néons, lampadaires, feux d’artifice) gardent leur éclat la nuit.
- **Sol.** La grille du sol (`gType`, `gTone`, 2 cellules par unité) est parcourue une fois par image : herbe, plages, écume animée, routes, rails, quais.
- **Objets.** Bâtiments, murs, lampadaires sont des « pièces » statiques reconstruites quand la ville change (`rebuildTown`). Les arbres sont rangés par cases et seuls ceux à l’écran sont dessinés. Voitures, chats, bateaux sont dynamiques. Tout est trié par profondeur (`dep(a, b)`) puis dessiné de l’arrière vers l’avant.
- **Territoires.** Pendant le rendu du sol, chaque pixel lit le camp de sa case. Un quatrième tampon (`ob`) choisit une palette teintée (bleue, rouge, ou frontière franche) ; seules les matières du sol sont teintées.
- **Zoom.** `Z` est le zoom affiché, continu. `K` est l’échelle entière de rendu, choisie pour ne jamais dépasser environ 430 000 pixels par image. Juste sous `KMIN` (jusqu’à `FAR_T * KMIN`, 70 %), la vue rapprochée continue avec une échelle de rendu fractionnaire : le tampon grandit un peu, le dessin reste le même. En dessous, on passe sur la **vue de loin** (`OV_ON`) : le tampon garde la taille de `KMIN` et le monde y est dessiné en petit, à l’échelle `SC = Z / K` (1 de près). `prj`, `unprj` et le rendu du sol, des lumières et du territoire tiennent compte de `SC` : tout est recalculé à chaque image, donc la rotation est continue et tout bouge en direct. Les objets ne sont pas redessinés en petit par leur propre code : chacun est dessiné à l’échelle 1 dans un petit tampon à part (`sprRender`, même code que de près), puis recopié en petit (`sprBlit`). Les arbres, identiques sous tous les angles, sont recopiés directement (`blitSc`). Les bâtiments et les montagnes gardent leur petit dessin en mémoire (`FAR.cache`) et le refont par roulement, avec un budget de 5 ms par image, quand la vue a tourné d’au moins 1° (et toutes les 1,2 s pour ce qui s’anime). Ce qui bouge (bateaux, voitures, chats, chantiers) est refait à chaque image ; les bateaux ne descendent pas sous la moitié de leur taille pour rester lisibles de loin (ils reprennent leur vraie taille en approchant du globe). La carte plate (`MAPV`, une case pour 2 unités) sert à la mini-carte et au globe hors de l’image.
- **Globe (éteint, `GLOBE_ON`).** Quand il est allumé : sous 70 %, `CURV` monte en continu de 0 à 1 (à 10 % de `KMIN`) et le sol est posé sur une sphère de rayon `GR = RP / CURV`. Le jeu se dessine toujours à plat ; `planetWarp` lance un rayon par coin de bloc de 4 × 4 pixels (`geoSample`), interpole à l’intérieur, et prend pour chaque pixel l’image plate, la carte de l’île ou la texture de la planète, puis la lumière du soleil, les nuages et le halo. `screenToWorld` et `worldToScreen` visent la sphère. La caméra peut s’éloigner de l’île d’autant plus que `CURV` est grand (`camBox`), jusqu’à faire le tour de la planète ; `camPull` l’y ramène en glissant quand on rezoome.
- **Pause.** Le temps des animations (`VT`) s’arrête en pause : tout se fige, sauf la caméra et l’interface.

## Les crochets

Les modules récents s’accrochent au moteur sans le modifier, via `HOOKS` (déclaré dans `01-core.ts`) :

| Crochet | Appelé | Exemple |
|---|---|---|
| `HOOKS.step` | à chaque image, avant le rendu | calendrier, son, feux d’artifice |
| `HOOKS.dyn` | quand on rassemble les objets dynamiques | ferry, passants, matchs |
| `HOOKS.top` | après tous les objets, par-dessus | feux d’artifice, pensées des chats |
| `HOOKS.post` | juste avant d’afficher l’image | reflets de nuit |
| `HOOKS.after` | après l’affichage | bulles, mini-carte, présence |
| `HOOKS.town` | quand la ville est reconstruite | pièces du port |

## L’état et la sauvegarde

- `BLD` : les bâtiments (type, camp, emprise, niveau, chantier). `ROADS` : les routes en polylignes. `WALLS` : les pans de Rideau. `TER.own` : le camp de chaque case.
- `snapshot()` écrit l’île (graine), les bâtiments, routes, murs, arbres coupés, le territoire compressé et les ressources dans le `localStorage` du navigateur.

## La plateforme

Le jeu parle à une interface `window.claude.use(nom)` :

- Pour l’instant le jeu ne s’en sert que pour les téléchargements (mode photo). Les chats et le journal utilisent des textes tout faits ; `api/claude.js` reste en place pour plus tard.

## Outils de test

`window.__okt` expose l’état interne (caméra, bâtiments, routes, territoire, ressources...) et quelques commandes (`chooseLanding`, `autoBoth` pour faire jouer deux IA) pour les tests automatiques et le débogage dans la console.
