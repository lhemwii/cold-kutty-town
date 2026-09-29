# Architecture du moteur

Cold Kutty Town tourne entièrement dans le navigateur, sans framework ni image. Tout est dessiné par du code, pixel par pixel.

## Le build

Les modules de `src/game/` partagent **une seule portée** : `scripts/build.mjs` les colle dans l’ordre de leur numéro, à l’intérieur d’une fonction, et vérifie la syntaxe. Une variable déclarée dans `01-core.js` est donc visible dans `21-main.js`. C’est simple et rapide, mais l’ordre compte : un module ne peut exécuter du code au chargement qu’avec ce que les modules précédents ont déjà défini (les fonctions, elles, sont connues partout). La feuille de route prévoit de passer à de vrais modules ES avec des `import`.

Le résultat est un site statique dans `dist/` : `index.html`, un CSS et deux scripts avec une empreinte dans le nom, pour que les navigateurs les gardent en cache longtemps.

## Les modules

| Fichier | Rôle |
|---|---|
| `01-core.js` | Bases : matières, crochets (HOOKS), état de partie (`GAME`), caméra, projection isométrique, primitives de dessin, police 3x5, plaques et panneaux collés au monde (`wallBitmap`, `plateW`), drapeaux à tête de chat. |
| `02-ground.js` | L’île tirée au sort : forme, îlots, plages, chaînes de montagnes, forêts, grille du sol (2 cellules par unité), défrichage. |
| `03-buildings-base.js` | Aides de décor : lumières, fumée, arbres, maisons à pignon, voitures (aussi en biais), coques de bateaux, fanions. |
| `04-types.js`, `05-types-extra.js`, `06-types-more.js` | Catalogue des bâtiments. Chaque type sait se dessiner. `06` contient aussi QG, port (3 niveaux), pêcherie, bergerie, phare, avant-poste, Checkpoint. |
| `07-world.js` | Forêts et montagnes rangées par cases, Rideau de Laine en pans libres, miradors, phare, lampadaires, voilier, vestiges catzi (`VEST`, `VEST_DEF`). |
| `08-territory.js` | Territoires : grille de cases de 4 unités, influence des bâtiments, expansion en direct, pression aux frontières, verrous. |
| `09-roads.js` | Routes droites et courbes : peinture au sol, graphe, raccords, accès au QG, voitures. |
| `10-town.js` | Bâtiments posés (`BLD`), règles de pose, chats nommés qui arrivent avec leur bâtiment, reconstruction de la scène. Bâtiments tournés d’un quart de tour (`buildParts`, `turnDraw`). |
| `11-render.js` | Palette jour et nuit, météo, zoom, vue de loin en direct, rendu du sol avec territoires, objets, ombres. |
| `12-portrait.js` | Portrait détaillé du chat dans la fenêtre de discussion. |
| `13-ui.js` | Outils : observer, construire, routes, Rideau, démolir, annuler ; souris, tactile, clavier ; pause et vitesse. |
| `14-hud.js` | Barre du haut, détail des ressources, menu de construction par catégories, panneau du bâtiment sélectionné. |
| `15-economy.js` | Croquettes, laine, ronrons : table `ECO`, bilans, chantiers, améliorations, événements, course à l’espace. |
| `16-boats.js` | Navigation en mer (A*), barges, chalutiers, cargos, équipages. |
| `17-calendar.js` | Calendrier et saisons, journal du matin, mémoire des chats, bulles, pensées. |
| `18-life.js` | Feux d’artifice, passants, matchs, reflets de nuit. |
| `19-extras.js` | Son, mini-carte, fiche au survol, mode photo. |
| `20-rival.js` | IA adverse (ébauche, à finir en dernier). |
| `21-main.js` | Radio, conversation, sauvegarde, déroulé de la partie (accueil, plage, victoire), boucle de jeu. |
| `22-home.js` | Accueil du jeu : menu, parties sauvegardées par emplacements (`ckt-saves`, `ckt-partie-*`, vignettes), profil, options, île qui tourne en fond. |
| `23-planet.js` | La planète tout au bout du dézoom : globe dessiné au pixel (carte de l’île + texture tirée au sort : océans, continents, banquise, nuages), jour et nuit, étoiles. Sert aussi de fond à l’accueil. |

## Le rendu

- **Projection isométrique.** Le monde a deux axes au sol, `a` (ouest vers est) et `b` (nord vers sud), plus la hauteur `z`. `prj(a, b, z)` donne le pixel à l’écran, `unprj(x, y)` fait l’inverse au sol. La caméra tourne librement (`cam.phi`).
- **Trois buffers par pixel.** `fb` (allumé ou éteint), `mb` (la matière : herbe, route, toit, fenêtre...) et `lb` (le niveau d’éclairage, de 0 plein soleil à 4 ombre portée). À la fin de l’image, la palette transforme chaque triplet en couleur. Cette version utilise la palette couleur (`COLOR = true` dans `01-core.js`).
- **Palette.** Chaque matière a deux teintes (sombre, claire), déclinées en cinq niveaux de lumière et mélangées selon l’heure, la météo, la neige et la saison. Les matières lumineuses (fenêtres, néons, lampadaires, feux d’artifice) gardent leur éclat la nuit.
- **Sol.** La grille du sol (`gType`, `gTone`, 2 cellules par unité) est parcourue une fois par image : herbe, plages, écume animée, routes, rails, quais.
- **Objets.** Bâtiments, murs, lampadaires sont des « pièces » statiques reconstruites quand la ville change (`rebuildTown`). Les arbres sont rangés par cases et seuls ceux à l’écran sont dessinés. Voitures, chats, bateaux sont dynamiques. Tout est trié par profondeur (`dep(a, b)`) puis dessiné de l’arrière vers l’avant.
- **Territoires.** Pendant le rendu du sol, chaque pixel lit le camp de sa case. Un quatrième tampon (`ob`) choisit une palette teintée (bleue, rouge, ou frontière franche) ; seules les matières du sol sont teintées.
- **Zoom.** `Z` est le zoom affiché, continu. `K` est l’échelle entière de rendu, choisie pour ne jamais dépasser environ 430 000 pixels par image. Juste sous `KMIN` (jusqu’à `FAR_T * KMIN`, 70 %), la vue rapprochée continue avec une échelle de rendu fractionnaire : le tampon grandit un peu, le dessin reste le même. En dessous, on passe sur la **vue de loin** (`OV_ON`) : le tampon garde la taille de `KMIN` et le monde y est dessiné en petit, à l’échelle `SC = Z / K` (1 de près). `prj`, `unprj` et le rendu du sol, des lumières et du territoire tiennent compte de `SC` : tout est recalculé à chaque image, donc la rotation est continue et tout bouge en direct. Les objets ne sont pas redessinés en petit par leur propre code : chacun est dessiné à l’échelle 1 dans un petit tampon à part (`sprRender`, même code que de près), puis recopié en petit (`sprBlit`). Les arbres, identiques sous tous les angles, sont recopiés directement (`blitSc`). Les bâtiments et les montagnes gardent leur petit dessin en mémoire (`FAR.cache`) et le refont par roulement, avec un budget de 5 ms par image, quand la vue a tourné d’au moins 1° (et toutes les 1,2 s pour ce qui s’anime). Ce qui bouge (bateaux, voitures, chats, chantiers) est refait à chaque image ; les bateaux ne descendent pas sous la moitié de leur taille pour rester lisibles de très loin. La carte plate (`MAPV`, une case pour 2 unités) sert à la mini-carte.
- **Pause.** Le temps des animations (`VT`) s’arrête en pause : tout se fige, sauf la caméra et l’interface.

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

- `BLD` : les bâtiments (type, camp, emprise, niveau, chantier). `ROADS` : les routes en polylignes. `WALLS` : les pans de Rideau. `TER.own` : le camp de chaque case.
- `snapshot()` écrit l’île (graine), les bâtiments, routes, murs, arbres coupés, le territoire compressé et les ressources dans le `localStorage` du navigateur.

## La plateforme

Le jeu parle à une interface `window.claude.use(nom)` :

- Pour l’instant le jeu ne s’en sert que pour les téléchargements (mode photo). Les chats et le journal utilisent des textes tout faits ; `api/claude.js` reste en place pour plus tard.

## Outils de test

`window.__okt` expose l’état interne (caméra, bâtiments, routes, territoire, ressources...) et quelques commandes (`chooseLanding`, `autoBoth` pour faire jouer deux IA) pour les tests automatiques et le débogage dans la console.
