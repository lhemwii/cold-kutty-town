# Plan d’implémentation

Le PRD dit **quoi** ([PRD.md](PRD.md)). Ce plan dit **dans quel ordre**. On coche au fur et à mesure.
Règle : **l’IA adverse vient en dernier**. Tout le reste d’abord. Tant qu’elle n’est pas finie, elle reste une ébauche qui joue en face.

Légende : `[x]` fait · `[~]` fait mais à reprendre · `[ ]` à faire

Les demandes qui arrivent en cours de route et ne rentrent dans aucune étape deviennent des **étapes intermédiaires** : 0.1, 0.2, etc., placées juste après l’étape en cours.

## Étape 0. Le socle de la refonte (fait)

- [x] Île tirée au sort à chaque partie : baies, îlots, plages, rochers, forêts. Aucune route, aucun bâtiment, pas de phare.
- [x] Suppression de l’ancienne ville, des aéroports, du rail, du métro, du défilé, du ferry, du multijoueur.
- [x] Bâtiments posés librement (liste `BLD`) au lieu des terrains fixes.
- [x] Territoires par cases de 4 unités : teinte et frontière au pixel près dans la vue détaillée, expansion en direct, pression aux frontières, verrous sous les bâtiments et le long du Rideau.
- [x] Fin du lag au dézoom (60 images par seconde à tous les zooms dans nos tests).
- [x] Trois ressources : croquettes, laine, ronrons. Production, fonctionnement, emplois, accès à la route.
- [x] Chantiers avec échafaudage et barre d’avancement ; améliorations en 3 niveaux (port : ponton, quai, grand port).
- [x] Routes droites et courbes (Bézier), raccord automatique, graphe, voitures qui suivent les courbes.
- [x] Mer : navigation calculée, barges du débarquement, barges de colonisation, chalutiers, cargo.
- [x] Nouveaux bâtiments : QG, port, pêcherie, bergerie, phare, avant-poste, Checkpoint Minou.
- [x] Rideau de Laine à tricoter soi-même, avec miradors.
- [x] Noms USC et CCR partout, aucune année, drapeaux à tête de chat.
- [x] Nouvel écran : barre du haut, dock par catégories, panneau du bâtiment, accueil avec choix du camp, choix de la plage, écran de victoire.
- [x] Chats qui arrivent avec leur bâtiment, répliques toutes faites. Journal du matin en textes tout faits.
- [x] Sauvegarde dans le navigateur (île, bâtiments, routes, murs, territoire).
- [~] IA adverse : ébauche qui débarque et construit, mais se bloque (voir étape 16).

## Étape 0.1. Premiers retours de jeu (fait)

- [x] Pause totale : quand le jeu est en pause, plus rien ne bouge (bateaux, chats, voitures, vagues, fumées, drapeaux, météo).
- [x] Vue détaillée à tous les zooms : même dézoomé sur toute l’île, on voit les vrais bâtiments, arbres et bateaux en pixel art, sans ralentir.
- [x] Îlots coupés au bord de la carte : les garder entiers dans la zone de jeu.
- [x] Montagnes sur l’île en plus des forêts.
- [x] HUD : symbole des ronrons en patte de chat, meilleur symbole des habitants.
- [x] Drapeau de l’USC retravaillé pour que la tête de chat se lise bien.

## Étape 0.2. Rotation vue de loin (remplacée par l’étape 0.3)

- [x] Premier essai : l’île gardée en images tous les 45°, fondues pendant la rotation, avec calage à 45° en lâchant. Pas assez vivant : retiré au profit d’une vue de loin redessinée en direct.

## Étape 0.3. Vue de loin en temps réel (fait)

- [x] Fin de la « photo » de l’île au dézoom : tout est redessiné à chaque image, comme de près (sol, vagues, territoire, arbres, montagnes, bâtiments, bateaux, chats). Mesuré : 60 images par seconde à tous les zooms.
- [x] Rotation vraiment continue à tous les zooms, sans fondu ni calage à 45°.
- [x] Les vrais bateaux à toutes les distances (plus de triangles), un peu grossis de très loin pour rester lisibles.
- [x] Animations de loin sans bug : drapeaux, chantiers, fumées, écume bougent en direct.
- [x] Toujours 60 images par seconde : même nombre de pixels à calculer qu’au zoom le plus éloigné de la vue rapprochée, objets dessinés en petit.

## Étape 0.4. Retours de jeu : drapeau, panneaux, météo, vestiges (fait)

- [x] Drapeau de la CCR : une vraie tête de chat qui se lit, en jeu comme dans l’interface.
- [x] Panneaux et enseignes (diner, motel, panneau publicitaire, etc.) collés au bâtiment : ils tournent avec le monde au lieu de rester face à l’écran.
- [x] De loin, plus de gros pixels de pluie ou de neige devant la vue : la météo s’estompe quand on dézoome.
- [x] Vestiges catzi : ruines d’un ancien régime déchu éparpillées sur l’île (bunkers, canons rouillés, statue renversée de Catdolf). Une fois dans son territoire, on les fouille pour récupérer des ressources. Sauvegardés avec la partie.

## Étape 0.5. Drapeaux redessinés (fait)

- [x] USC : les bandes rouges et blanches, et des têtes de chat blanches à la place des étoiles dans le coin bleu.
- [x] CCR : tête de chat jaune au centre, tenue par la faucille, le marteau à côté.
- [x] Drapeaux du jeu agrandis (19 x 11) pour que les dessins se lisent, et ceux de l’interface en 26 x 13.

## Étape 0.6. Montagnes sans quadrillage (fait)

- [x] Plus de trame en petits carrés sur les montagnes : faces pleines, seul l’éclairage change d’une face à l’autre. Plus de gros carrés au zoom ni d’effet bizarre en tournant.
- [x] Sol rocheux : taches claires accrochées au sol au lieu d’une trame calée sur l’écran.

## Étape 0.7. Drapeaux, deuxième passe (fait)

- [x] USC : une seule tête de chat, plus petite, au centre du coin bleu, et les 13 bandes.
- [x] CCR : tête de chat et marteau et faucille bien dessinés (d’après le vrai symbole), côte à côte au centre.
- [x] Drapeaux de l’interface en 48 x 26 pour plus de finesse.
- [x] Bug vu en passant : on pouvait bâtir (même le QG) sous les pentes d’une montagne. C’est maintenant refusé.

## Étape 0.8. Drapeaux, retouches (fait)

- [x] USC : la tête de chat du coin bleu est la même que celle de la CCR, en blanc.
- [x] CCR : manche du marteau rallongé, emblème recentré.

## Étape 0.9. Vue à 75 % et enseignes des deux côtés (fait)

- [x] Juste sous le zoom rapproché (jusqu’à 70 % de KMIN, donc le palier « 74 % »), on garde le vrai dessin de près, en plus petit, au lieu de la vue de loin. Plus loin, la vue de loin prend le relais.
- [x] Enseignes de façade (mairie, épicerie, usine, bowling, radio, grand magasin) : quand on passe derrière le bâtiment, elles se mettent sur la façade arrière au lieu de disparaître. Enseigne du cirque visible des deux côtés.

## Étape 0.10. Tourner les bâtiments (fait)

- [x] En construction, clic droit glissé (ou la touche T) fait tourner le bâtiment d’un quart de tour, au lieu de tourner la vue. Le fantôme montre le sens avant de poser.
- [x] Tous les bâtiments se tournent : ils sont dessinés face à +b puis tournés autour de leur centre (projection, soleil, ombres et lumières suivent). Le port et la pêcherie gardent leur sens face à la mer.
- [x] Question réglée : la vue de près en plus petit ne peut pas descendre sous 74 %. À 52 %, on tombe à 30 images par seconde ; en dessous, un pixel du jeu devient plus petit qu’un pixel de l’écran. Pour aller plus loin, il faudra le rendu par la carte graphique (étape 0.19).

## Étape 0.11. Arbres de loin comme de près (fait)

- [x] De loin (52 %, 36 %, 24 %, 16 %), chaque arbre est redessiné directement à sa taille au lieu d’être réduit : il garde son tronc et son feuillage rond, et son ombre au sol, comme à 74 %.

## Étape 0.12. Vrai menu d’accueil (fait)

- [x] Écran d’accueil de jeu : une île vue de loin qui tourne en fond et change toutes les 40 s, les drapeaux des deux camps qui flottent.
- [x] Nouvelle partie : camp, nom de la partie, numéro d’île (au hasard ou choisi, pour rejouer la même île). La difficulté viendra avec l’IA (étape 16).
- [x] Charger une partie : plusieurs emplacements de sauvegarde gardés dans le navigateur, avec date, camp et aperçu.
- [x] Profil du joueur : nom, camp préféré, statistiques (parties jouées, gagnées).
- [x] Options : volume, musique, vitesse au départ, pluie et neige à l’écran, tout effacer. La langue viendra plus tard.
- [x] Quitter la partie (depuis le bouton Menu en jeu) : sauvegarde et retour à l’accueil. L’ancienne sauvegarde unique est reprise comme première partie.
- [x] Bug vu en passant : une partie sauvegardée pendant le débarquement revenait sans QG. Les plages choisies sont gardées et le QG se pose au chargement.

## Étape 0.13. La planète (mise de côté pour le mode espace, voir l’étape 17.1)

- [x] Tout au bout du dézoom, trois paliers de planète (10 %, 6 %, 3,5 % de KMIN) : l’île sur son globe, l’espace et les étoiles derrière. Le globe garde la vraie carte de l’île (territoires, bâtiments), avec autour des océans, d’autres continents, la banquise et des nuages qui dérivent.
- [x] Jour et nuit sur le globe selon l’heure de la partie, saisons selon le mois.
- [x] L’accueil montre la planète qui tourne dans l’espace (fin du changement d’île toutes les 40 s, qui figeait l’écran une seconde). En lançant une partie, on descend de l’espace jusqu’à l’île.
- [x] Faire tout le tour du globe en glissant (étape 0.14).
- La suite (choisir sa planète, lumières des villes, satellites, lune) passe dans le mode espace, étape 17.1.

## Étape 0.14. Un vrai globe, sans transition (fait, puis éteint à l’étape 0.15)

- [x] Plus de disque plaqué au bout du dézoom : le monde se courbe en continu. Juste sous la vue rapprochée, le sol est posé sur une sphère immense ; son rayon descend en dézoomant jusqu’à celui de la planète. On passe de l’île au globe sans changement d’image.
- [x] Le jeu se dessine toujours à plat, en direct (bâtiments, bateaux, territoires) ; une dernière passe pose cette image sur la sphère. Hors de l’image plate, la carte de l’île, puis les océans et continents de la planète.
- [x] Espace, étoiles fixes dans le ciel (elles défilent quand on tourne), halo de l’atmosphère, jour et nuit, nuages qui apparaissent en montant. La nuit de la palette laisse la place à l’ombre de la planète.
- [x] Tout au bout, la planète se centre à l’écran. En glissant, on fait le tour du globe ; en revenant, la caméra est ramenée doucement vers l’île.
- [x] L’accueil fait tourner le globe en déplaçant la caméra ; en lançant une partie, la planète tourne par le plus court chemin jusqu’à l’île pendant la descente.
- [x] De très haut, les arbres gardent leur vraie taille (un point, puis rien) au lieu d’un minimum de 3 × 5 pixels : on revoit l’herbe, les côtes et les montagnes en relief, la forêt ne recouvre plus tout.

## Étape 0.15. Retour à la vue plate, avec plus de recul (fait)

- [x] Le globe est gardé dans le code mais éteint (`GLOBE_ON = false` dans 01-core.ts) : le jeu reste une île vue de dessus, sans planète. Il reviendra avec le mode espace (étape 17.1).
- [x] Deux paliers de recul en plus sous l’île entière (10 % et 6 % de KMIN) : l’île au milieu de la mer.
- [x] L’accueil montre de nouveau l’île qui tourne doucement sur elle-même, de loin.
- [x] On garde des étapes 0.13 et 0.14 les arbres à leur vraie taille de très loin : l’herbe et les montagnes restent visibles.

## Étape 0.16. Les vagues de loin (fait)

- [x] Les vagues restent visibles à tous les zooms, avec autant de vagues à l’écran que de près : la mer vit et on sent qu’on se déplace. En dézoomant, on garde une partie des mêmes vagues (une case sur 2, 4, 8…).

## Étape 0.17. Tailles de carte et configurations d’îles (fait)

Au lancement d’une partie, on choisit la taille de la carte et la forme du monde.

- [x] Six tailles : petite, moyenne (la carte actuelle), grande, très grande, très très grande, immense (environ 3,4 fois plus large que la moyenne). Au-delà de « grande », le sol passe à une case par unité au lieu de deux, pour tenir en mémoire.
- [x] Cinq configurations : une île, deux îles face à face (un camp sur chacune), quatre îles, archipel, atoll autour d’un lagon. On passe d’une île à l’autre en barge.
- [x] Le choix se fait dans « Nouvelle partie », il est gardé dans la sauvegarde et affiché dans la liste des parties.
- [x] Le recul maximal, la vue du débarquement et le fond de l’accueil s’adaptent à la taille de la carte.
- [x] Débarquement de l’adversaire : loin du joueur, sur une autre île quand il y en a plusieurs.
- [x] Performances : de très loin, on ne parcourt plus chaque arbre (la forêt se voit par le sol), arbres et montagnes ne sont cherchés que sur la carte, le territoire ne cherche que dans la zone de chaque camp ; création de la carte immense en 2 s environ.
- [ ] À régler en jouant : l’objectif de 60 % du territoire est très long à atteindre sur les grandes cartes.

## Étape 0.18. Accueil : drapeaux au vent, texte noir, nouvelle police (fait)

- [x] Les deux drapeaux de l’accueil flottent vraiment au vent : dessinés pixel par pixel, chaque colonne ondule, plus fort loin du mât, avec des plis clairs et sombres.
- [x] Plus de texte gris dans l’interface : tout le texte est noir.
- [x] Police de texte : Bricolage Grotesque (au lieu d’Archivo). Les titres gardent la police pixel.
- [x] Accueil épuré : plus de ligne « Île de Kutty · La guerre froide », plus de « Bienvenue sur l’île, camarade chat » (le mot d’accueil n’apparaît que quand on a un nom de profil).

## Étape 0.20. Texte noir ou blanc, illustrations à la place des points, HUD (fait)

- [x] Plus de texte gris nulle part : il est noir ou blanc. Un bouton indisponible garde son texte noir (bordure en pointillés, fond hachuré) ; un texte qui clignote passe du rouge à l’invisible, sans gris.
- [x] Plus de point du milieu (« · ») : on illustre. Coûts et habitants en icônes de ressources, la date avec l’icône de la saison, la radio avec le drapeau du camp, le niveau d’un bâtiment en pastilles, un chantier en barre d’avancement ; dans un message en texte seul, « et ».
- [x] Propositions pour un HUD plus ergonomique : trois dispositions (A, la barre d’outils au centre ; B, la colonne de commande ; C, tout au contexte). Choix : A, à améliorer ensuite.
- [x] HUD en disposition A (à revoir à l’étape 13, une fois les nouveautés posées) :
  - en haut, trois blocs : ressources à gauche (la radio dessous), course au territoire au centre avec les deux drapeaux et l’objectif de 60 %, date, heure, vitesse, Journal et Menu à droite ;
  - une colonne fine à droite pour la vue (zoom, rotation, boussole, météo, son, photo), en icônes avec une bulle d’aide ;
  - en bas au centre, les outils en gros boutons avec leur touche, et Annuler à côté ; Construire ouvre un tiroir au-dessus, catégories en onglets illustrés ;
  - la mini-carte en bas à gauche, la fiche d’un bâtiment ou la conversation à droite, un seul panneau à la fois ;
  - le logo seulement à l’accueil, aucun texte sous 11 pixels, une ressource qui baisse ou manque signalée sur son icône, un bouton indisponible qui dit pourquoi au survol.

## Étape 0.19. TypeScript, PixiJS, Vite et Electron (en cours)


Le jeu passe à une base prête pour la haute définition et pour Steam, sans rien réécrire de la logique : TypeScript (du JavaScript typé), PixiJS pour dessiner avec la carte graphique, Vite pour le build, Electron et steamworks.js pour la version Steam. La version web reste sur Vercel pour faire tester. Dans cet ordre :

- [x] 1. Vite et modules ES à la place de la concaténation. Chaque module importe ce qu’il utilise des modules plus petits en numéro ; ce qui est appelé vers l’avant, et les variables que plusieurs modules modifient, passent par un objet partagé (`SH`, dans `00-shared.ts`). Conversion faite par un script, puis vérifiée partie en main.
- [x] 2. TypeScript module par module, en commençant par le monde et l’économie. `tsc` en mode strict vérifie les modules convertis ; `npm run build` refuse de construire si un type ne va pas.
  - [x] Outillage : TypeScript 7, `tsconfig.json`, `npm run typecheck`, vérification dans `npm run build`.
  - [x] `00-shared` : types communs (`Side`, `Building`) et objet partagé `SH`.
  - [x] Le monde : `02-ground` (tailles de carte, formes, îles, trame du sol).
  - [x] Le territoire : `08-territory` (grille, conquête, verrous).
  - [x] L’économie : `15-economy` (fiches des bâtiments, ressources, chantiers, événements, course à l’espace).
  - [x] La suite du monde : `07-world` (forêts, montagnes, vestiges, murs), `09-roads` (routes, graphe, voitures), `10-town` (chats, pose des bâtiments, décor statique), `16-boats` (barges, chalutiers, navigation). Au passage : les graffitis des murs s’affichent enfin (le mur gardait un numéro, le dessin attendait un texte).
  - [x] Le cœur et le rendu : `01-core` (état, caméra, vue, primitives de dessin : `PixFn`, `Shade`, `SideFn`, `Sprite`, `View`), `03` à `06` (fiches des bâtiments, `BuildingType`), `11-render` (palette, zoom, carte à plat, lumières, vue de loin). Converti avant PixiJS pour que le passage au nouveau rendu soit vérifié par les types.
  - [x] L’interface et le reste : `12` à `14`, `17` à `23`, le point d’entrée (`main.ts`) et l’adaptateur de plateforme. Plus aucun `any` dans le jeu ; `$of(id, HTMLInputElement)` rend un élément de la page avec son vrai type.
- [x] 3. PixiJS à la place du rendu actuel : le sol et les objets en textures, le style pixel gardé avec un filtre. Par paliers, le jeu reste jouable à chacun :
  - [x] 3.1. PixiJS affiche l’image
 (`src/gpu/present.ts`). Les tampons du moteur (forme, matière, éclairage, camp) partent en une texture ; un shader fait la mise en couleur par la palette sur la carte graphique. L’image garde la taille du jeu et le navigateur l’agrandit au pixel près : le style ne change pas. Sans WebGL2, le jeu garde son canvas 2D.
  - [x] 3.2. Le sol sur la carte graphique : la grille du sol (type, teinte, distance à la côte, territoire) part une fois en textures, mise à jour par morceaux ; un shader calcule au pixel le sol, la mer, l’écume, la teinte des camps et les frontières. Le processeur ne dessine plus que ce qui est posé dessus. Les reflets de nuit et le faisceau du phare y sont aussi. Vérifié image par image : le même dessin que le processeur, au pixel près (petite, moyenne et grande carte, de près, de loin, de jour, de nuit). `SH.CPU_GROUND = true` rend le sol par le processeur pour comparer.
  - [x] 3.3. Les objets en textures : chaque bâtiment, montagne et arbre est dessiné une fois par angle de vue dans une texture (comme la vue de loin le fait déjà), puis posé par PixiJS en sprites triés par profondeur. Ce qui bouge (chats, voitures, bateaux, drapeaux) reste dessiné à chaque image.
    - Un atlas de 2048 × 2048 garde les dessins ; chaque objet posé par la carte graphique garde son rang, et ce que dessine le processeur écrit le sien (`db`) : le shader garde ce qui est devant. De près, un bâtiment ou une montagne est dessiné une fois pour l’angle exact de la caméra, puis posé tel quel ; pendant qu’on tourne la vue, ou s’il s’anime (drapeau, fumée), le processeur le dessine comme avant.
    - Le tri des objets passe par des clés numériques : beaucoup plus rapide avec des milliers d’arbres.
    - Même image que le processeur : identique de près, de jour comme de nuit ; 4 pixels sur 256 000 de loin (arrondis de la réduction).
    - Si WebGL est émulé par le processeur (pas de vraie carte graphique), le sol et les objets restent calculés en JavaScript, plus rapide dans ce cas ; `?gl=gpu` force la carte graphique. Temps de `render` mesuré ici (carte graphique émulée) : de près 6,4 → 2,0 ms, à mi-distance 17,8 → 4,3 ms, tout au loin 19,8 → 14,1 ms (grande carte). À mesurer sur une vraie carte graphique.
  - [x] 3.4. Lumières de nuit, ombres portées et météo en shaders. Les ombres sont des polygones remplis par la carte graphique, les lumières un rectangle chacune où le shader refait le calcul du processeur (disque ou cône, atténuation, trame, la première l’emporte), les gouttes et les flocons de petits dessins de l’atlas posés au-dessus de tout. L’ordre du processeur est gardé : ombres portées, lumières, puis ombres des arbres. Même image que le processeur (au plus 1 pixel sur 110 000 à 256 000, au bord d’une ombre), de jour, de nuit, au crépuscule sous la pluie et sous la neige. `SH.CPU_FX` les fait faire par le processeur pour comparer.
- [ ] 4. Electron et steamworks.js dès qu’il y a une démo jouable :
  - [x] 4.1. Une fenêtre Electron qui charge le jeu construit (`dist/`), lancée par `npm run app` ; paquets Windows, macOS et Linux par electron-builder.
  - [x] 4.2. Adaptateur de plateforme pour la version de bureau (`src/platform/store.ts`) : sauvegardes dans le dossier de l’utilisateur plutôt que dans le navigateur (un fichier par clé, écrit d’un coup), retrouvées au lancement suivant.
  - [ ] 4.3. steamworks.js : succès et sauvegardes Steam (Steam Cloud), essayés avec l’identifiant d’essai de Steam en attendant celui du jeu.
    - [x] Branchement : Steam démarre quand le jeu est lancé par Steam (ou `STEAM_APP_ID`), les succès passent par `src/platform/achievements.ts`, gardés aussi sur la machine et rendus à Steam au lancement suivant. Cinq succès provisoires (première pierre, grand port, Rideau de Laine, décollage, victoire), à redéfinir avec le jeu.
    - [ ] Essai avec un vrai client Steam, puis déclaration des succès et du Steam Cloud automatique (dossier `saves/`) dans Steamworks, avec l’identifiant du jeu.
  - [ ] 4.4. Plus tard, Gemma sur la machine du joueur avec node-llama-cpp.


## Étape 0.21. La nouvelle vision du jeu (fait)

- [x] Vision rangée dans le [PRD](PRD.md) : croisement de city builder, de Mini Metro, de jeu de civilisation et de stratégie en temps réel ; peu de ressources (nourriture et pâté, laine et tricot, ronrons, habitants, Catcoins, eau et électricité, gisements) ; bâtiments communs aux deux camps habillés par camp ; huit orientations ; villes et connexions ; brouillard et unités ; recherche, espace, espionnage, commerce ; plusieurs façons de gagner ; types de partie.
- [x] Liste proposée des bâtiments et des unités : [BATIMENTS.md](BATIMENTS.md), à valider.
- [x] Nouvelle feuille de route ci-dessous (étapes 1 à 17), qui reprend les points encore ouverts de l’ancienne.

# Feuille de route de la nouvelle version

Chaque étape laisse le jeu jouable. L’ordre proposé : d’abord ce qui existe et les bâtiments, puis l’économie et le territoire, puis la carte (brouillard, unités, transports, monde), puis les grands systèmes (recherche, armée, espace, renseignement, commerce), la victoire, l’écran, et l’IA adverse en dernier.

## Étape 1. Fiabiliser ce qui existe

- [ ] Jouer une vraie partie à la souris et noter chaque bug d’interface.
- [ ] Vérifier la sauvegarde et le rechargement sur une partie avancée.
- [ ] Annuler : couvrir aussi les améliorations et la démolition.
- [x] Menu : nouvelle partie depuis l’accueil, la partie en cours est sauvegardée avant (étape 0.12).
- [ ] Mini-carte : ne pas l’afficher avant le choix du camp.
- [ ] Les chats nommés : vérifier qu’ils apparaissent tous et ne se marchent pas dessus.
- [ ] Nettoyer les restes de l’ancien code (réglages de lumière, motifs, inspecteur de pixels).

## Étape 2. Les mêmes bâtiments pour les deux camps

- [ ] Un seul type par bâtiment, avec un habillage USC et un habillage CCR : fusionner ce qui existe en double (ferme et kolkhoze, les deux gratte-ciel, chapelle et musée à bulbes...).
- [ ] Corriger l’immeuble : côté USC, il porte aujourd’hui les signes de la CCR.
- [ ] Dessiner le style qui manque à chaque bâtiment (le diner devient la Cantine du Peuple côté CCR, le bowling un club ouvrier, etc.), d’après [BATIMENTS.md](BATIMENTS.md).
- [ ] Huit orientations : tourner un bâtiment par pas de 45 degrés ; routes dans les huit directions. L’alignement automatique face à la route la plus proche.
- [ ] Améliorer change le bâtiment à l’écran pour tous les bâtiments améliorables, avec un chantier visible (échafaudages, grue).
- [ ] Aperçu du prix et de l’effet au survol, dans le fantôme du bâtiment ; ce que l’amélioration va rapporter, dans le panneau.
- [ ] Défrichage visible : souches et chantier quand on coupe une forêt.

## Étape 3. Les ressources de la nouvelle version

- [ ] Nourriture : les croquettes, et le pâté en luxe, fait par une conserverie ; affichés ensemble en haut.
- [ ] Laine, et le tricot en luxe, fait par un atelier.
- [ ] Catcoins : impôts des habitants, banque, certains prix en Catcoins (le port).
- [ ] Habitants et métiers : répartition réglable par grand métier (nourriture, laine, industrie, services, recherche, armée).
- [ ] Eau et électricité en réseaux : production contre besoins ; un bâtiment non raccordé tourne mal.
- [ ] Gisements de minerai et d’uranium sur la carte, et les mines.
- [ ] Rendre chaque ressource utile du début à la fin (aujourd’hui les croquettes s’accumulent).
- [ ] Bilan de fin de mois : ce qui a rapporté, ce qui a coûté.

## Étape 4. Territoire et villes

- [ ] Retirer la victoire au premier camp à 60 % de l’île, et l’objectif de la barre du haut.
- [ ] Chaque bâtiment agrandit un peu le territoire autour de lui, chaque amélioration un peu plus, dans une limite.
- [ ] Construire hors de son territoire : plus cher, plus lent, et cela l’étend.
- [ ] La première ville, portuaire, fondée au débarquement (hôtel de ville et port) ; fonder d’autres villes ; chaque ville a son nom.
- [ ] Rendre la pression aux frontières lisible (flèches ou hachures là où ça bouge).
- [ ] Rideau de Laine : tracé en plusieurs clics qui suit la frontière, portes, checkpoint qui s’insère dans le mur ; ce qu’il rapporte et ce qu’il coûte.

## Étape 5. Brouillard et premières unités

- [ ] Brouillard : jamais vu, déjà vu (figé tel qu’on l’a vu), vu ; sur la scène, la vue de loin et la mini-carte.
- [ ] Unités : sélection (clic, cadre), ordre de déplacement, chemin à terre qui contourne les montagnes et l’eau.
- [ ] Explorateurs (révèlent le brouillard, trouvent les gisements) et bâtisseurs (construisent loin, fondent une ville).
- [ ] La caserne qui les produit.

## Étape 6. Transports et connexions

- [ ] Routes : tracé à main levée, accroche sur le milieu d’une route, ponts ; chemin de terre puis route goudronnée.
- [ ] Chemin de fer : voies, gares, trains qu’on voit circuler ; il transporte les ressources entre villes.
- [ ] Une ville sans lien ne profite pas de la production des autres.
- [ ] Métro entre quartiers.
- [ ] Tunnels sous les montagnes.
- [ ] Lignes lisibles à la façon de Mini Metro (une couleur par ligne).

## Étape 7. Le monde

- [ ] Biomes : feuillus, pins, plages, marais, prairies, montagnes ; des arbres différents par biome.
- [ ] En hiver, la neige couvre vraiment le sol et ralentit unités et chantiers.
- [ ] La mer : choisir sa destination sur la carte avec le trajet affiché, un chalutier sélectionnable, le phare qui éclaire la route des bateaux la nuit, des vagues autour des pontons et des coques.

## Étape 8. La recherche

- [ ] Université, puis laboratoires.
- [ ] Arbre de recherche en branches (industrie et énergie, société, transports, armée, espace, atome, renseignement), avec un écran pour le parcourir.
- [ ] Ce que chaque recherche débloque : bâtiments, améliorations, unités.

## Étape 9. L’armée

- [ ] Usine de chars, chantier naval, aérodrome ; soldats, véhicules, navires, avions.
- [ ] Combat : points de vie, portée, prise d’un bâtiment ; défenses (canon côtier, DCA, bunker, radar).
- [ ] Le navire de transport remplace la barge pour emmener des unités sur une autre côte.
- [ ] La bombe atomique : uranium, centre atomique, silo, au bout de la branche de l’atome.

## Étape 10. L’espace et le renseignement

- [ ] Programme spatial : lancements, satellites qui révèlent une zone ennemie ; la course à l’espace lisible à l’écran.
- [ ] Agence de renseignement et espions : observer, voler une recherche, saboter ; contre-espionnage ; station d’écoute.

## Étape 11. Le commerce et la diplomatie

- [ ] Échanges entre l’USC et la CCR en Catcoins, au checkpoint.
- [ ] Port à acheter puis agrandir ; nations alliées au large ; importer des biens et des habitants, exporter les surplus.
- [ ] Relations entre les camps : tension, accords commerciaux, trêve, capitulation.

## Étape 12. Gagner, et les types de partie

- [ ] Victoires : annihilation, capitulation, et à la fin du temps un score sur plusieurs dimensions (territoire, science et technologie, société, économie). Victoires de dimension à trancher (scientifique, sociale, économique).
- [ ] Types de partie dans « Nouvelle partie » : Blitz, Normale, Longue (durée, taille de carte, vitesse de la recherche et des chantiers).
- [ ] Succès redéfinis avec le jeu (`src/platform/achievements.ts`).
- [ ] Équilibrage d’une partie Blitz et d’une partie Normale.

## Étape 13. L’écran, deuxième version

- [ ] Revoir le HUD une fois les étapes 2 à 12 posées : moins de boutons, plus d’informations. Retirer l’outil Observer (sans outil choisi, on sélectionne). Faire une place aux ressources de luxe, aux réseaux, à la recherche, aux unités sélectionnées.
- [ ] Tutoriel au premier lancement.
- [x] Icônes pixel pour chaque catégorie du menu de construction (étape 0.20).
- [~] Raccourcis clavier : écrits sur les outils (étape 0.20) ; reste un écran d’aide.
- [ ] Vraie version téléphone (dock repliable, gestes).
- [ ] Logo en SVG avec la tête de chat.

## Étape 14. Vie et contenu

- [ ] Plus de répliques pour les chats, liées à la situation (pénurie, frontière qui recule, guerre, victoire).
- [ ] Radio et journal qui parlent des vraies actions de la partie (ville fondée, recherche, espion pris, bataille).
- [ ] Événements plus nombreux, liés à la frontière, à la mer, au commerce.
- [ ] Un modèle de langue en option pour les chats et le journal (plus tard).

## Étape 15. Technique

- [ ] Tests automatiques : règles (économie, territoire, routes) avec Vitest, démarrage et partie rapide avec Playwright.
- [ ] Intégration continue : build et tests à chaque push.
- [x] Modules ES, puis TypeScript module par module (étape 0.19).
- [ ] Séparer l’état, les règles et le dessin (un seul objet d’état) : nécessaire pour les unités et pour le jeu en ligne.
- [ ] Mesurer la performance sur mobile et sur une vraie carte graphique.

## Étape 16. L’IA adverse (en dernier)

Elle doit savoir faire tout ce que fait le joueur : construire, répartir ses habitants, explorer, rechercher, commercer, espionner, faire la guerre et négocier. Ce qui ne va pas déjà dans l’ébauche actuelle, vu en faisant jouer deux IA l’une contre l’autre :

- [ ] Elle trace ses routes au hasard ; elles se croisent et bouchent les parcelles. Piste : un plan de rues en grille autour de son hôtel de ville.
- [ ] Elle manque de laine (une seule bergerie) et accumule des ronrons sans les dépenser.
- [ ] Elle ne s’améliore presque pas et ne construit pas de prestige.
- [ ] Niveaux de difficulté (facile, normal, difficile).
- [ ] Un outil de test qui fait jouer deux IA en accéléré et sort un bilan minute par minute (existe en brouillon, à ranger dans `scripts/`).

## Étape 17. Plus tard

- [ ] Parties en ligne (contre un joueur ou contre l’IA), avec un service temps réel.

## Étape 17.1. Mode espace (extension, plus tard)

Le globe existe déjà dans le code (23-planet.ts), éteint. L’idée : prendre de la hauteur jusqu’à l’espace, puis jouer à l’échelle de la carte du monde.

- [ ] Rallumer le globe (`GLOBE_ON`) : dézoom continu de l’île jusqu’à la planète, tour du globe en glissant.
- [ ] Lumières des villes sur la face de nuit (bâtiments et lampadaires de l’île, villes des autres continents).
- [ ] Satellites et fusées visibles en orbite.
- [ ] Jouer la carte du monde : plusieurs îles, les autres continents.
- [ ] Choisir sa planète dans le menu (taille, climat, nombre d’îles).
- [ ] L’espace autour (lune, autres planètes) et passer de l’une à l’autre.
