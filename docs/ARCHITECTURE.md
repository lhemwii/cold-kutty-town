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
| `10-town.ts` | Bâtiments posés (`BLD`), règles de pose, chats nommés qui arrivent avec leur bâtiment, reconstruction de la scène. Bâtiments tournés dans seize directions (`dirAngle`, `turnedFoot`, `buildParts`, `turnDraw`) ; ceux de la côte en quatre, face à la mer. |
| `11-render.ts` | Palette jour et nuit, météo, zoom, vue de loin en direct, rendu du sol avec territoires, objets, ombres. |
| `12-portrait.ts` | Portrait détaillé du chat dans la fenêtre de discussion. |
| `13-ui.ts` | Outils : observer, construire, routes, Rideau, démolir, annuler ; souris, tactile, clavier ; pause et vitesse. |
| `14-hud.ts` | HUD en disposition A : blocs du haut, détail des ressources, tiroir de construction par catégories, panneau du bâtiment sélectionné, mesures du HUD (`--hud-top`, `--hud-bot`) pour placer les panneaux de droite. |
| `15-economy.ts` | Croquettes, laine, ronrons : table `ECO`, bilans, chantiers, améliorations, événements, course à l’espace. |
| `16-boats.ts` | Navigation en mer (A*), barges, chalutiers, cargos, équipages. |
| `17-calendar.ts` | Calendrier et saisons, journal du matin, mémoire des chats, bulles, pensées. |
| `18-life.ts` | Feux d’artifice, passants, matchs, reflets de nuit. |
| `19-extras.ts` | Son, mini-carte, fiche au survol, mode photo. |
| `20-rival.ts` | IA adverse (ébauche, à finir en dernier). |
| `21-main.ts` | Radio, conversation, sauvegarde, déroulé de la partie (accueil, plage, victoire), boucle de jeu. |
| `22-home.ts` | Accueil du jeu : menu, parties sauvegardées par emplacements (`ckt-saves`, `ckt-partie-*`, vignettes), profil, options, île qui tourne en fond. |
| `23-planet.ts` | Éteint pour l’instant (`GLOBE_ON = false`), gardé pour le mode espace. Le globe, sans transition : de loin, `planetWarp` pose l’image plate du jeu sur une sphère dont le rayon descend en continu jusqu’à celui de la planète (`CURV`, `GR`, `geoSet`, `geoCast`, `geoProj` dans 01-core, `curvOf` dans 11-render). Hors de l’image plate : la carte de l’île, puis une texture tirée au sort (océans, continents, banquise, nuages). Jour et nuit, halo, étoiles fixes dans l’espace. Sert aussi de fond à l’accueil. |
| `24-ressources.ts` | Étape 3 : gisements (charbon, uranium, pétrole), nouveaux bâtiments de ressources, onglet Ressources (stocks, réseaux d’eau et d’électricité, métiers et priorités), bilan de fin de mois. |
| `25-villes.ts` | Étape 4 : camp, baraquements, chef-lieu puis ville (`ville`), noms des villes, plaques au-dessus des hôtels de ville, chevrons de la frontière qui bouge, entretien du Rideau. |
| `26-unites.ts` | Étape 5 : brouillard du joueur (`TER.fog`, mis à jour deux fois par seconde), unités (`UNIT_DEF`, `UNITS`), chemins A* sur une grille de 8 (terre ou mer), formation par les bâtiments, sélection (clic, Maj, cadre Ctrl, G), ordres au clic droit, bâtisseurs qui posent un camp hors du territoire, caserne, sauvegarde. Crochets laissés aux étapes suivantes : `SH.combatChase`, `SH.combatStep`, `SH.drawVehicle`, `SH.boardOrder`, `SH.groundSlow`, `SH.tunnelAt`, `SH.FOG_SOURCES`, `SH.hasTech`. |
| `27-transports.ts` | Étape 6 : voies ferrées (`RAILS`, mêmes objets que les routes, graphe par `graphOf` de 09-roads), gares et trains en navette, métro (stations reliées à leurs deux voisines), ponts et tunnels (dessin, passage des unités par `SH.tunnelAt`), liens entre villes (`SH.prodMult` : une ville isolée produit moitié moins), fiche d’une route ou d’une voie (`SH.showCard`), outil Voie (`SH.TOOLS.rail`), vue Lignes (canevas `linesCv` par-dessus la scène). Les outils et raccourcis d’un module se déclarent dans `SH.TOOLS` et `SH.KEYS` (13-ui les appelle). |
| `28-monde.ts` | Étape 7 : rivières et étangs creusés dans le sol par `GROUND_HOOKS` de 02-ground avant le calcul des distances (masque `gRiv` : 1 eau douce, 2 berge), `SH.riverAt`, `SH.riverNav` pour les bateaux ; neige au sol l’hiver (`SH.snowFloor`, lu par la météo de 11-render) et ralentissement (`SH.groundSlow`, chantiers) ; barrage et ponton de pêche ; trajet de la barge, fiche d’un bateau, faisceau du phare (`SH.dynLights`), écume. Les sortes d’arbres (pin, palmier, roseaux) sont dans 07-world (`treeKindAt`) et 03 (`kindSpr`). |
| `29-recherche.ts` | Étape 8 : arbre des recherches (`TECHS`, sept branches, prérequis), état de chaque camp (`SCI` : faites, en cours, avancement, réserve), `SH.hasTech` et `SH.techName` (lus par les bâtiments `ECO[type].tech`, les unités, les tunnels, les voies), `SH.upTech` (améliorations), effets par `SH.prodMult` et `TALLY` ; université, laboratoire, centrale nucléaire ; écran E (`#sci`) et bouton du HUD. |
| `30-armee.ts` | Étape 9 : unités de l’armée ajoutées à `UNIT_DEF` (jeep, char, destroyer, transport, chasseur, bombardier), combat (`SH.combatChase`, `SH.combatStep` appelés par 26-unites : cibles, défenses `DEF`, pillage et prise de terrain), solidité des bâtiments (`Building.hp`, prise par les soldats, destruction), embarquer et débarquer (`SH.boardOrder`, `SH.unitArrived`), dessin des véhicules (`SH.drawVehicle`), bâtiments de l’armée, bombe atomique (`SH.nuke`, `NUKES`). `SH.onCityLost` et `SH.onNuke` préviennent les victoires (étape 12). |
| `31-espace.ts` | Étape 10 : les cinq jalons de la science (`SPACE_STEPS` de 15-economy, lancés quand `SH.spaceReady` le dit : recherche faite et lancement commandé et payé), satellites dans `SH.FOG_SOURCES`, course à l’espace dans le HUD (`#spaceRace`) ; agence, station d’écoute, espions (`SH.hiddenUnit`, missions par `SH.unitActions` et `SH.unitAct` du panneau des unités), sabotage (`SH.prodMult`), espions de l’autre camp. |
| `32-diplomatie.ts` | Étape 11 : humeur et traités (`DIP`, `SH.atPeace` et `SH.breakPeace` lus par le combat, `SH.onHostile`), propositions avec délai et raisons du refus, propositions de l’autre camp, marché du checkpoint et commerce au large (Catcoins), habitants qui passent d’un camp à l’autre (`SH.popAdj`, ajouté au compte des habitants dans 15-economy), points de passage, capitulation (`SH.onCapitulate`). Écran `#dip` (P). |
| `33-victoire.ts` | Étape 12 : options de la partie (`OPT` : durée du Blitz, victoires cochées ; prises dans le formulaire de nouvelle partie, gardées dans la sauvegarde), progression et seuils de chaque victoire, `SH.checkWin` (appelé chaque seconde par 21-main), score, fin du Blitz, `SH.onCapitulate`, succès, écran de la course aux victoires (`#vic`, clic sur le bloc du territoire ou O). |
| `34-ecran.ts` | Étape 13 : luxe et Catcoins dans le HUD, écran d’aide (H), tutoriel du premier lancement (clé `ckt-tuto`), dock repliable et appui long au téléphone. |

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
- **Sol.** La grille du sol (`gType`, `gTone`, 2 cellules par unité) donne pour chaque pixel : herbe, plages, écume animée, routes, rails, quais. Avec PixiJS, le sol est calculé par la carte graphique (`src/gpu/ground-glsl.ts`), avec les mêmes règles et les mêmes bruits : la grille part une fois en texture (2 octets par case), puis seulement le rectangle qui a changé (`GDIRTY` dans `02-ground`, rempli par `resetArea` et la peinture des routes) ; le territoire part à chaque image s’il a changé. Le processeur part alors de tampons vides (matière 255) et ne dessine que ce qui est posé sur le sol. Pour un pixel vide, une ombre met l’éclairage à 4 et une lumière de nuit laisse sa matière dans la forme ; le shader ne l’allume que sur un pixel sombre du sol, comme avant. Les reflets de nuit (`18-life`) passent aussi au shader : le module ne fait qu’en donner les réglages (`SH.REFL`). Sans WebGL2, pour le globe, ou si la grille dépasse la taille des textures de la carte graphique, `renderGround` reprend la main sur le processeur.
- **Objets.** Bâtiments, murs, lampadaires sont des « pièces » statiques reconstruites quand la ville change (`rebuildTown`). Les arbres sont rangés par cases et seuls ceux à l’écran sont dessinés. Voitures, chats, bateaux sont dynamiques. Tout est trié par profondeur (`dep(a, b)`, par clés numériques : `sortByDepth`) puis dessiné de l’arrière vers l’avant.
- **Objets posés par la carte graphique.** Quand le sol est sur la carte graphique, elle pose aussi ce qui est immobile, à partir d’un atlas (`ATLAS`, 2048 × 2048, rangé par étagères, vidé quand il est plein) : les arbres (leur petit dessin, champ `spr` du `Drawable`), et les bâtiments et montagnes (`key`) avec le dessin gardé par la vue de loin (`FAR.cache`, recopié en petit) ou, de près, un dessin à l’échelle 1 fait pour l’angle exact de la caméra (`NEAR`). Ce dessin est le même qu’en direct, décalé d’un nombre entier de pixels (la trame et les arrondis suivent). Un objet qui s’anime (son dessin prend le temps en paramètre), un dessin qui dépasse son tampon (`clip`), ou tout objet pendant qu’on tourne la vue, est dessiné par le processeur. Chaque objet a un rang dans l’ordre de dessin ; les primitives écrivent le rang courant (`SH.RANK`) dans `db`, et la couche des objets (texture hors écran) écrit le sien : le shader de l’image garde, pixel par pixel, le rang le plus haut. Ce qui est dessiné avant la liste (vagues, décors au sol) a le rang 0, ce qui vient après (feux d’artifice, aperçu d’outil) 65100, la météo de la carte graphique 65535.
- **Ombres, lumières et météo sur la carte graphique.** Avec le sol sur la carte graphique, `drawShadows` et `applyLights` ne tournent plus : `shadowTris` envoie les ombres en triangles (une texture d’ombre), `lightQuads` un rectangle par lumière avec ses réglages (une texture de lumière, les lumières posées de la dernière à la première pour que la première l’emporte). Le shader de l’image les applique au sol et à ce qui a le rang 0, dans l’ordre du processeur : ombre portée, lumière sur un pixel sombre, ombre des arbres (encore dessinée par le processeur, `treeShadow`). Les gouttes et les flocons (`RAIN_SPR`, `SNOW_SPR`) sont des dessins de l’atlas posés au rang 65535. Pour savoir si un chat est sous une lumière, `lightAtPixel` refait le calcul pour son pixel.
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
