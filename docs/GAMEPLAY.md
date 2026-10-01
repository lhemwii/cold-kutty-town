# Règles du jeu

Le détail et les intentions sont dans le [PRD](PRD.md). En bref :

## Le monde

Une île vierge tirée au sort à chaque partie : forêts, plages, rochers, îlots. Deux camps de chats : les **United Sands of Cats** (USC) et la **Cats Communist Republic** (CCR). Aucun pays réel, aucune année.

## L’accueil

Au lancement, un vrai menu de jeu devant l’île qui tourne doucement, vue de loin : Continuer (la dernière partie), Nouvelle partie (camp, nom, taille de la carte de petite à immense, forme du monde : une île, deux îles face à face, quatre îles, archipel ou atoll, et numéro d’île à partager), Charger une partie (toutes tes parties, avec vignette, camp, mois, territoire), Profil (ton nom, ton camp préféré, tes victoires et ton temps de jeu), Options (volume, musique, vitesse de départ, pluie et neige), Règles. En jeu, le bouton Menu met en pause et propose de revenir à la partie ou de la quitter. Tout se garde dans le navigateur ; les parties se sauvegardent toutes seules.

## La planète

Pas encore en jeu : la planète est gardée pour un futur mode espace (voir docs/PLAN.md, étape 10.1). Pour l’instant, le dézoom va jusqu’à l’île entière au milieu de la mer.

## Le déroulé

1. Choisis ton camp, puis clique sur la côte où débarquer.
2. Les barges accostent, l’équipage bâtit ton QG et un premier bout de route. L’autre camp débarque de l’autre côté.
3. Construis dans ton territoire. Relie tes bâtiments au QG par la route, sinon ils restent à l’arrêt.
4. Chaque bâtiment rayonne : ton territoire grandit tout seul autour, case par case. Les avant-postes le poussent plus loin, les barges (depuis un port) l’emmènent sur d’autres côtes.
5. Quand les frontières se touchent, la plus forte grignote l’autre. Le Rideau de Laine fige la frontière.
6. L’île est cachée par le brouillard : tes bâtiments et tes unités voient autour d’eux. Les explorateurs découvrent le terrain et les gisements, les bâtisseurs posent un camp loin, même hors de ton territoire.
7. Le territoire ne fait plus gagner seul : il compte dans le score. Les victoires (militaire, scientifique, sociale, économique, de circonstance) viennent avec l’étape 12 du plan.

## Les ressources

- **Croquettes** : les habitants en mangent ; les avant-postes et les barges en coûtent. En pénurie, plus de ronrons.
- **Laine** : pour construire, améliorer, tracer routes et Rideau.
- **Ronrons** : produits par les habitants nourris et distraits. Ils accélèrent la conquête et paient avant-postes, barges et améliorations.

Chaque bâtiment produit et coûte en fonctionnement. Les producteurs ont besoin d’habitants pour les emplois.

## Les vestiges catzi

Avant les deux camps, l’île était tenue par le régime catzi de Catdolf, tombé depuis longtemps. Il en reste une dizaine de ruines dans la nature : bunkers, canons rouillés, dépôts abandonnés et la statue renversée de Catdolf. Elles apparaissent sur la mini-carte (petits carrés sombres). On ne peut pas construire dessus. Quand ton territoire en atteint une, clique dessus puis **Fouiller** : les ruines disparaissent et rapportent d’un coup des croquettes, de la laine ou des ronrons. La statue de Catdolf, fondue, rapporte le plus.

## Améliorer

Trois niveaux pour la plupart des bâtiments : le port passe de ponton à quai puis à grand port (chalutiers, puis cargo), la maison devient pavillon puis villa.

## Commandes

Glisser pour se déplacer, molette pour zoomer, clic droit glissé pour tourner. En construction, clic droit glissé ou T pour tourner le bâtiment de 22,5 degrés (Maj+T dans l’autre sens). B construire, R route, C courbe, M Rideau, X démolir, Échap arrêter, Espace pause, 1 2 3 vitesse, Ctrl+Z annuler.

Recherche : E ouvre l’arbre des recherches ; choisis-en une, l’université et les laboratoires y versent leurs points.

Transports : V voie ferrée, puis une gare à chaque bout ; L la vue des lignes. Avec l’outil Route, Ctrl glissé trace à main levée. Un clic sur une route ouvre sa fiche (goudronner, démolir).

Unités : clic pour en choisir une (Maj pour en ajouter), Ctrl glissé pour un cadre, G pour toutes celles à l’écran, clic droit pour les envoyer (sur un ennemi : l’attaquer), Échap pour les lâcher. Un QG, une ville ou une caserne choisis forment des unités.
