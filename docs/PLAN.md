# Plan d’implémentation

Le PRD dit **quoi** ([PRD.md](PRD.md)). Ce plan dit **dans quel ordre**. On coche au fur et à mesure.
Règle : **l’IA adverse vient en dernier**. Tout le reste d’abord. Tant qu’elle n’est pas finie, elle reste une ébauche qui joue en face.

Légende : `[x]` fait, `[~]` fait mais à reprendre, `[ ]` à faire.

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
- [x] Précisions du deuxième message : Catcoins et tricot confirmés ; seize orientations ; seules les croquettes, la laine et les ronrons paient les bâtiments et décident des victoires, le reste va dans un onglet Ressources ; charbon et centrale à charbon à la place du minerai et des éoliennes ; parties Blitz et Sans fin, victoires à cocher ; victoires scientifique, sociale, économique et de circonstance ; Rideau de Laine comme lieu de traités ; un camp amélioré devient un chef-lieu ; bâtiments qui s’équilibrent ajoutés à la liste.
- [x] Troisième message : la liste des bâtiments devient un tableau à double entrée (règles communes, version USC, version CCR) ; rivières ; unités transportées par bateau ; pêche ; Blitz à durée choisie et Sans fin ; cinq jalons pour la victoire scientifique ; habitants qui s’enfuient à travers le Rideau et points de passage ; ressources proposées.
- [x] Retenus : herbe à chat, pétrole, influence. Ni acier ni bois ; mines dans les montagnes et exploitations forestières qui rapportent de la laine.

# Feuille de route de la nouvelle version

Chaque étape laisse le jeu jouable. L’ordre proposé : d’abord ce qui existe et les bâtiments, puis l’économie et le territoire, puis la carte (brouillard, unités, transports, monde), puis les grands systèmes (recherche, armée, espace, renseignement, commerce), la victoire, l’écran, et l’IA adverse en dernier.

## Étape 1. Fiabiliser ce qui existe (fait)

- [x] Une partie jouée à la souris par un test automatique (route, maison, amélioration, démolition, annuler, sauvegarde). Bug trouvé et corrigé : le bouton Annuler ne répondait qu’à Ctrl+Z.
- [x] Sauvegarde et rechargement d’une partie avancée (trente bâtiments de tous niveaux et directions) : tout revient à l’identique.
- [x] Annuler couvre aussi les améliorations (en cours : tout est rendu ; finie : le niveau redescend) et la démolition (le bâtiment revient, la laine rendue repart).
- [x] Menu : nouvelle partie depuis l’accueil, la partie en cours est sauvegardée avant (étape 0.12).
- [x] Mini-carte : cachée à l’accueil et pendant le choix de la plage.
- [x] Les chats nommés apparaissent avec leur bâtiment, chacun à sa place devant chez lui.
- [x] Nettoyage : les restes de l’ancien code étaient partis avec le passage à TypeScript ; imports et variables inutilisés retirés, et le vérificateur de types les refuse désormais (`noUnusedLocals`).

## Étape 2. Les mêmes bâtiments pour les deux camps (fait)

- [x] Un seul type par bâtiment, avec un habillage USC et un habillage CCR. Fait : les deux gratte-ciel n’en font plus qu’un (art déco à l’USC, monumental à la CCR ; les anciennes sauvegardes sont converties) ; la ferme (grange rouge à l’USC, étable blanchie à étoile rouge à la CCR) ; la chapelle de bois blanc à clocher à l’USC, le musée à bulbes à la CCR. Reste les autres bâtiments d’un seul style (voir [BATIMENTS.md](BATIMENTS.md)).
- [x] L’immeuble redessiné pour chaque camp, sans plus aucun signe de la CCR côté USC. USC : briques à escaliers de secours et corniche, puis plus haut avec un réservoir d’eau en bois sur le toit, puis gratte-ciel de pierre en retrait au-dessus des briques. CCR : barre de béton de cinq étages, puis de neuf avec un panneau rouge à étoile sur le toit, puis tour du Peuple à grande étoile rouge.
- [x] La maison redessinée pour chaque camp. USC : maison de bois à planches et porche, puis pavillon à garage, puis villa à étage et piscine. CCR : isba en rondins aux volets bleus, puis datcha verte à véranda vitrée, puis datcha de ministre à étage, palissade et voiture noire.
- [x] Le style qui manquait côté CCR : le diner devient la Cantine du Peuple (béton, enseigne CANTINE), le cinéma le Cinéma du Peuple (KINO), le bowling le Club ouvrier (étoile, CLUB), la station-service la Station du Peuple (étoile au lieu de GAZ) ; l’usine devient la Filature (TEXTILES) ou le Combinat textile. Matière propre à chaque camp, aussi dans les vignettes. Parc, fontaine, kiosque et bergerie restent communs.
- [x] Seize orientations : T tourne le bâtiment de 22,5 degrés (Maj+T dans l’autre sens), le clic droit glissé aussi ; son emprise au sol suit. Les bâtiments de la côte gardent leurs quatre directions, face à la mer. Les sauvegardes d’avant sont converties.
- [x] Routes : libres comme avant, et Maj enfoncée les fait suivre l’une des seize directions. Un bâtiment qu’on n’a pas tourné à la main regarde la route la plus proche.
- [x] Pendant une amélioration, un vrai chantier autour du bâtiment : échafaudages, grue qui tourne, poussière, barre d’avancement. Le dessin change de niveau pour la maison, l’immeuble et le port ; les autres gardent leurs galons (à dessiner niveau par niveau plus tard).
- [x] Au survol, l’aide montre le prix et l’effet du bâtiment ; dans le panneau, ce que l’amélioration va rapporter (habitants, production, territoire).
- [x] Défrichage visible : des souches restent deux minutes là où la forêt a été coupée (bâtiment, route, Rideau).

## Étape 3. Les ressources de la nouvelle version (fait, à équilibrer)

- [x] Nourriture : les croquettes, et le pâté en luxe, fait par la conserverie avec des croquettes. Les habitants en mangent : ils ronronnent plus.
- [x] Laine, et le tricot en luxe, fait par l’atelier de tricot avec de la laine. Le niveau 3 de tout bâtiment demande 10 tricot (et 10 pâté pour les logements).
- [x] Les bâtiments se paient uniquement en croquettes, laine et ronrons (le niveau 3 ajoute tricot et pâté).
- [x] Catcoins : impôts des habitants et banque ; ils serviront aux échanges et aux importations (étape 11).
- [x] Habitants et métiers : six métiers (nourriture, laine, industrie, services, recherche, armée), chacun avec ses emplois et une priorité de 0 à 3 réglable dans l’onglet Ressources ; les habitants vont d’abord aux métiers prioritaires.
- [x] Eau et électricité en réseaux : capacité contre besoin. Sans électricité, un bâtiment qui en demande tourne à moitié ; sans eau, les habitants ronronnent moins. Le QG fournit un peu des deux, le château d’eau et la station de pompage l’eau, la centrale à charbon l’électricité (si elle a du charbon).
- [x] Gisements de charbon et d’uranium au pied des montagnes, de pétrole en plaine ; mine de charbon, mine d’uranium (avec la recherche de l’atome) et derrick se posent dessus, même sur la roche.
- [x] Herbe à chat (serre), pétrole (derrick), influence (calculée : loisirs et prestige).
- [x] Exploitation forestière : posée en forêt, elle abat les arbres autour d’elle et en tire de la laine ; la forêt recule.
- [x] Entrepôt : plus de place pour les croquettes et la laine (1 500 sans entrepôt, le surplus se perd).
- [x] L’onglet Ressources (bouton à pelote dans le bloc des ressources) : stocks et débits, électricité, eau, influence, stock, métiers.
- [x] Les croquettes servent du début à la fin : repas, pâté, et plus tard l’entretien des unités.
- [x] Bilan de fin de mois : croquettes, laine, ronrons, Catcoins et habitants gagnés ou perdus, affiché en bas de l’écran.
- [ ] Équilibrer tous ces chiffres en jouant (voir l’étape 12).

## Étape 4. Territoire et villes (fait)

- [x] Plus de victoire au premier camp à 60 % de l’île : la barre du haut montre le territoire des deux camps, qui ne compte plus que dans le score (les victoires viennent à l’étape 12).
- [x] Chaque bâtiment agrandit le territoire autour de lui ; chaque niveau d’amélioration ajoute 25 % à son rayon.
- [x] Construire hors de son territoire : par les bâtisseurs, à l’étape 5.
- [x] La première ville, portuaire, fondée au débarquement : le QG, avec son nom (Port-Kutty à l’USC, Kuttygrad à la CCR).
- [x] Le camp (l’ancien avant-poste) s’améliore : camp, baraquements, puis chef-lieu ; il devient alors une ville à part entière, avec son hôtel de ville à la manière de son camp, son nom (douze noms par camp) écrit au-dessus, un peu d’eau et d’électricité. Toute ville est un nœud du réseau : un bâtiment relié par la route à n’importe quel hôtel de ville est en service. Les noms sont sauvegardés.
- [x] La pression aux frontières : des chevrons de la couleur du camp qui gagne apparaissent là où il prend des cases à l’autre, cinq secondes.
- [x] Rideau de Laine : il se trace en plusieurs clics à la suite (chaque clic repart du bout) ; il coûte un peu d’entretien en laine ; le Checkpoint sert de porte. Ce qu’il apporte de plus vient avec les fuites d’habitants (étape 11).

## Étape 5. Brouillard et premières unités (fait)

- [x] Brouillard : jamais vu (sol presque noir, en trame), déjà vu (assombri), vu ; sur la scène, la vue de loin, la mini-carte, et à l’identique par la carte graphique et par le processeur. Les bâtiments ennemis restent affichés une fois vus ; ses unités, ses chats et ses voitures seulement en vue. Le brouillard est sauvegardé.
- [x] Unités : clic pour en choisir une (Maj pour ajouter), cadre au Ctrl glissé, G pour toutes, Échap ; clic droit pour les envoyer, en formation ; chemin A* à terre qui contourne la mer, la roche et les montagnes (la mer pour les navires, à l’étape 9) ; panneau des unités choisies (vie, Halte, Dissoudre).
- [x] Explorateurs (rapides, voient loin : un gisement doit avoir été vu pour y poser une mine) et bâtisseurs (Poser un camp : ils y vont et le montent, même hors du territoire).
- [x] Formation par le QG, les villes et la caserne (nouvelle catégorie Armée), une à la fois, avec une file ; entretien en croquettes (rations) dans le bilan.
- [ ] À revoir ensemble : le « déjà vu » montre l’état actuel des bâtiments ennemis plutôt qu’une image figée ; les forêts et montagnes restent dessinées sous le brouillard (on connaît la géographie, pas l’ennemi).

## Étape 6. Transports et connexions (fait)

- [x] Routes : Ctrl glissé avec l’outil Route trace à main levée (le tracé est lissé) ; une route s’accroche au bout ou au milieu d’une autre ; ponts au-dessus de l’eau (90 pas au plus, quatre fois plus chers), tunnels sous la roche (cinq fois plus chers, avec la recherche des tunnels quand elle existera). Une route neuve est un chemin de terre (moitié prix, voitures plus lentes) ; un clic dessus ouvre sa fiche : Goudronner ou Démolir.
- [x] Chemin de fer : outil Voie (V), gare posée le long de la voie (Gare de briques à l’USC, Gare du Peuple à la CCR) ; entre deux gares d’un même réseau, un train (locomotive et deux wagons de laine ou de croquettes) fait la navette, avec un arrêt à chaque gare. Ponts et tunnels comme pour les routes.
- [x] Une ville sans lien (route ou train) avec la capitale perd la moitié de sa production en route ; son panneau le dit, et la vue Lignes écrit « isolée » à côté de son nom.
- [x] Métro : la station (bouche à rambarde verte à l’USC, pavillon au grand M rouge à la CCR) se relie aux deux stations les plus proches ; reliée, elle distrait le quartier, d’autant plus qu’elle a de lignes.
- [x] Tunnels et ponts laissent passer les unités à pied.
- [x] Vue Lignes (L, ou le bouton du rail de droite), à la façon de Mini Metro : routes en gris (pointillé pour la terre), réseaux de trains d’une couleur chacun, lignes de métro en tirets, gares et stations en ronds blancs, trains en jaune, noms des villes.
- [ ] À revoir ensemble : les voies seulement droites (pas encore de courbe), un seul train par paire de gares, pas d’aiguillage visible ; l’équilibre du coût des ponts, tunnels et du goudron.

## Étape 7. Le monde (fait)

- [x] Rivières : elles naissent sur les pentes des montagnes et descendent en méandres jusqu’à la mer, de plus en plus larges ; berges étroites sans plage. Eau douce : la station de pompage s’y pose, le Ponton de pêche (nouveau) y pêche, le Barrage (nouveau) en tire de l’électricité sans charbon ; routes et voies les franchissent par des ponts ; les bateaux remontent les plus larges. Les unités à pied ne les traversent que par un pont.
- [x] Biomes : pins au nord et sur les pentes des montagnes (toujours verts, nouvelle matière), feuillus ailleurs (qui changent avec les saisons), palmiers sur les plages du sud, marais aux étangs bordés de roseaux dans les basses terres.
- [x] En hiver, la neige tombée reste au sol jusqu’au printemps ; elle ralentit les unités à pied et les chantiers.
- [x] La mer : le trajet de la barge s’affiche avant de choisir la côte ; un clic sur un bateau ouvre sa fiche (chalutier, barge, cargo : à qui, ce qu’il fait, son port) ; le faisceau du phare balaie la mer la nuit ; de l’écume autour des pontons et des bateaux à l’arrêt.
- [x] Les parties sauvegardées avant cette étape se rechargent sans rivières (leurs bâtiments y sont posés).
- [x] Correction : les arbres de matière propre (pins, palmiers) n’avaient pas leur couleur par la carte graphique.
- [ ] À revoir ensemble : le nombre et la largeur des rivières, l’emplacement des marais, la couleur des pins, des lacs en montagne, des gués.

## Étape 8. La recherche (fait)

- [x] Université (campus de briques à clocher à l’USC, grande tour à flèche et étoile à la CCR), puis Laboratoire (coupole d’observatoire à l’USC, Institut du Plan à antenne à la CCR) : des points de recherche, selon les habitants au métier Recherche et l’électricité. Le QG en donne un point par minute.
- [x] Arbre de 29 recherches en sept branches (industrie et énergie, société, transports, armée, espace, atome, renseignement), avec ses prérequis ; écran E (ou le bouton à fiole du bloc des ressources, avec la barre d’avancement) : on choisit la recherche en cours, les points s’y versent ; sans choix, ils attendent en réserve.
- [x] Ce que chaque recherche débloque : bâtiments (gare, métro, barrage, laboratoire, mine d’uranium, nouvelle Centrale nucléaire), améliorations (niveau 3 des maisons et immeubles par l’Urbanisme), actions (goudronner, voies ferrées, tunnels), effets (Mécanisation +15 %, Pétrochimie, Automatisation, Médecine, Télévision). Les branches armée, espace et renseignement débloquent ce qu’apportent les étapes 9 et 10. Dans le menu de construction, un bâtiment verrouillé dit quelle recherche il attend.
- [x] L’autre camp cherche aussi (la moins chère des recherches ouvertes) ; la radio annonce les percées.
- [x] Sauvegardé ; une partie d’avant cette étape reçoit les recherches de ce qu’elle avait déjà (gares, métro, goudron, tunnels, barrage, urbanisme).
- [ ] À revoir ensemble : le prix de chaque recherche et la vitesse des points, la place de l’écran, des recherches propres à chaque camp.

## Étape 9. L’armée (fait)

- [x] Usine de chars (jeeps, chars), chantier naval sur la côte (destroyers, navires de transport), aérodrome (chasseurs, bombardiers), chacun derrière sa recherche (Blindés, Marine, Aviation, Bombardiers). Les véhicules consomment du pétrole, toutes les unités des croquettes.
- [x] Combat : points de vie, portée, cadence ; une unité au repos tire sur l’ennemi qui passe ; clic droit sur un ennemi ou un bâtiment ennemi découvert pour l’attaquer. Le bombardier ne vise que les bâtiments, puis rentre à l’aérodrome ; seuls DCA, chasseurs et navires touchent les avions. Tirs et explosions visibles, barres de vie.
- [x] Les bâtiments ont une solidité ; à zéro, les soldats les prennent (ils changent de camp), les véhicules et les bombardiers les détruisent. Un bâtiment abîmé fume et se répare hors des combats.
- [x] En territoire ennemi : piller les bâtiments proches (croquettes et laine, la jeep plus vite), et prendre le terrain qu’aucune unité ne défend.
- [x] Défenses : bunker (unités à terre), canon côtier (navires), DCA (avions), radar (voit loin à travers le brouillard).
- [x] Navire de transport : clic droit d’unités sur lui pour les embarquer (six au plus, en caisses sur le pont), puis clic droit sur une côte : il y va et les débarque. Le chantier naval sert de port militaire ; le port peut aussi en armer un.
- [x] La bombe atomique : le centre atomique en fabrique une avec 20 d’uranium, le silo la lance (clic sur la cible, impact dix secondes plus tard) ; elle rase tout dans un grand rayon, des deux camps (les hôtels de ville résistent à peine).
- [ ] À revoir ensemble : la barge de débarquement reste en début de partie (avant la Marine) ; l’équilibre des unités ; des avions qui patrouillent ; des formations ; un vrai écran de bataille.

## Étape 10. L’espace et le renseignement (fait)

- [x] Programme spatial : la base spatiale (reliée par la route) lance les cinq jalons de la science, chacun après sa recherche et contre laine, croquettes, ronrons et pétrole : le premier satellite, un réseau de satellites, le premier chat dans l’espace, une station en orbite, le premier chat sur la Lune. Compte à rebours, feu d’artifice, radio, ronrons (plus pour le premier camp). L’autre camp lance dès qu’il peut.
- [x] Le satellite balaie l’île de son regard ; le réseau garde en vue les villes ennemies.
- [x] La course à l’espace se lit dans le bloc du territoire : cinq cases par camp.
- [x] Agence de renseignement et espions : invisibles tant qu’ils restent loin de l’ennemi ; près d’un bâtiment ennemi, observer les environs, voler une recherche (université, laboratoire), saboter (à l’arrêt une minute, solidité au tiers). Un sur trois se fait prendre, un sur deux face au contre-espionnage.
- [x] Station d’écoute : voit les unités ennemies dans un grand rayon. Contre-espionnage : on voit les espions ennemis de plus loin, ils se font prendre plus souvent.
- [x] Les espions de l’autre camp agissent de temps en temps (vol de recherche, sabotage), quand il a une agence.
- [ ] À revoir ensemble : voir la fusée et les satellites dans le ciel à chaque jalon, des missions d’espion plus variées (retourner un habitant, faux renseignements), l’IA qui forme de vrais espions.

## Étape 11. Le commerce et la diplomatie (fait)

- [x] Le Rideau de Laine est l’endroit où l’on parle à l’ennemi : il faut un checkpoint ou la nouvelle Ambassade à son bord pour proposer un traité. Écran P (Pourparlers, aussi dans le dock).
- [x] L’humeur de l’autre camp (glaciale, froide, tiède, cordiale, chaleureuse) baisse quand on l’attaque, remonte avec le temps et le commerce.
- [x] Traités : accord commercial (des Catcoins pour les deux camps, marché du checkpoint ouvert), trêve de cinq minutes (plus de combat ; une attaque la rompt), ouverture des frontières, paix. L’autre camp réfléchit trente secondes à une minute, puis accepte, ou refuse en disant pourquoi (« Le Plan prévoit l’autosuffisance… »). Il propose aussi de lui-même (accord, trêve quand il perd, paix quand tout va bien).
- [x] Marché du checkpoint : vendre et acheter croquettes, laine, ronrons, pâté, tricot, charbon, pétrole en Catcoins (meilleurs prix avec le pont des échanges).
- [x] Au large, par le port : les nations amies (les Îles de la Truite pour l’USC, la République des Harengs pour la CCR) achètent les surplus et vendent ce qui manque, plus cher ; on peut y accueillir des habitants. Un cargo arrive au port.
- [x] Les habitants passent vers le camp où l’on vit le mieux (bien-être : ronrons, loisirs, eau, pâté, herbe à chat, famine). Le Rideau les retient ; points de passage au bord du Rideau : mirador (moins de départs), haut-parleurs (plus d’arrivées), tunnel d’évasion (le mur d’en face ne retient plus), pont des échanges.
- [x] Capitulation : l’exiger (acceptée seulement par un camp à bout de forces : sans hôtel de ville, très affaibli), ou capituler soi-même (deux clics).
- [x] Les boutons Ressources, Recherche et Pourparlers passent dans le dock, avec leur nom.
- [ ] À revoir ensemble : les prix du marché, le rythme des fuites, une vraie scène au checkpoint (files de chats, échanges visibles), des nations amies plus vivantes.

## Étape 12. Gagner, et les types de partie (fait, à équilibrer)

- [x] Cinq victoires, chacune cochée ou non dans « Nouvelle partie » : militaire (plus un hôtel de ville à l’autre camp, ou sa capitulation), scientifique (le premier aux cinq jalons), sociale (au moins 150 habitants, deux fois plus que l’autre camp, sans famine, trois minutes), économique (2 500 Catcoins et une production une fois et demie celle de l’autre camp, trois minutes), de circonstance (70 % de l’île deux minutes, ou dix minutes de paix signée : le meilleur score l’emporte).
- [x] Types de partie : Sans fin (jusqu’à une victoire) et Blitz de 20, 40 ou 60 minutes (le temps restant s’affiche sous l’horloge ; à la fin, le meilleur score gagne). Le score additionne territoire, habitants, recherches, jalons, Catcoins, production, villes et force.
- [x] La course aux victoires : un clic sur le bloc du territoire (ou O) montre, pour chaque victoire, où en est chaque camp et le temps qu’il lui reste à tenir.
- [x] Succès redéfinis (`src/platform/achievements.ts`) : une deuxième ville, un premier train, dix recherches, un chat sur la Lune, la paix, une recherche volée, vingt transfuges, chacune des victoires, gagner un Blitz.
- [~] Équilibrage : une partie jouée par l’IA des deux côtés sert de mesure (voir l’étape 16) ; les seuils restent à régler en jouant.

## Étape 13. L’écran, deuxième version (fait)

- [x] HUD revu : plus d’outil Observer (sans outil, on choisit ; Échap y revient) ; Ressources, Recherche (avec sa barre d’avancement) et Pourparlers dans le dock ; le luxe (pâté, tricot) et les Catcoins dans le bloc des ressources ; la course à l’espace dans le bloc du territoire, qui ouvre la course aux victoires ; les unités choisies dans leur panneau.
- [x] Tutoriel au premier lancement : sept étapes qui avancent seules quand on fait ce qu’elles disent (QG, maison, route, nourriture, laine, recherche, victoires) ; on peut passer ou fermer, et le relancer depuis l’aide.
- [x] Icônes pixel pour chaque catégorie du menu de construction (étape 0.20).
- [x] Raccourcis clavier : écrits sur les outils, et un écran d’aide (H, ou le bouton « ? » du rail de droite) qui les donne tous.
- [x] Téléphone : le dock se replie (bouton Outils) et passe sur deux rangées ouvert ; l’appui long fait le clic droit (envoyer les unités, arrêter un tracé) ; panneaux à la hauteur de l’écran.
- [x] Logo en SVG : une tête de chat mi-bleue mi-rouge, sur l’écran d’accueil.
- [ ] À revoir ensemble : la place du tutoriel au téléphone (il cache une partie de l’île), la règle du jeu dans l’accueil, une vraie maquette du HUD pour la suite.

## Étape 14. Vie et contenu (fait)

- [x] Les chats parlent de l’actualité de la partie (une réplique sur deux, et toujours si on leur demande des nouvelles) : famine, frontière qui recule, combats, trêve, paix, accord commercial, jalons spatiaux, dernière recherche, transfuges, victoire en vue d’un côté ou de l’autre ; ils ne se répètent pas.
- [x] La radio annonce les vrais événements : villes fondées, recherches, prises de bâtiments, accrochages, espions, traités, transfuges, bombe ; le journal du matin en fait ses unes (nouvelles unes : bombe, traité, prise, bataille, recherche, espionnage, transfuges).
- [x] Dix nouveaux événements à choix, liés à la frontière (valises au checkpoint, brouillard sur le Rideau, ballon-sonde, troc au pont), à la mer (banc de sardines, cargo en détresse, tempête) et au commerce (foire, plan d’exportation, marché noir).
- [ ] Un modèle de langue en option pour les chats et le journal (plus tard : les répliques passent déjà par un seul endroit, `fallbackReply` de 21-main).

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
