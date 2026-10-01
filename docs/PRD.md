# Cold Kutty Town : document produit (PRD)

Ce document dit **ce que le jeu doit devenir**. Ce qui existe déjà et l’ordre des travaux sont dans [PLAN.md](PLAN.md). La liste des bâtiments et des unités proposés est dans [BATIMENTS.md](BATIMENTS.md).

## 1. En une phrase

Un jeu de chats pendant la guerre froide où l’on débarque sur une île, fonde une ville portuaire, la fait prospérer, relie ses villes par la route et le rail, explore, recherche, commerce, espionne et s’arme, jusqu’à l’emporter sur l’autre camp.

## 2. L’intention

- **Un vrai jeu jouable**, pas une vitrine : un début, des choix, une fin.
- **Le croisement de quatre familles de jeux** :
  - le city builder (Cities: Skylines) : routes, bâtiments, services, eau et électricité ;
  - la lisibilité de Mini Metro : des lignes de transport simples, des réseaux qu’on voit ;
  - le jeu de civilisation (Civilization) : villes, exploration, brouillard, recherche, diplomatie, plusieurs façons de gagner ;
  - le jeu de stratégie en temps réel (Total Annihilation) : unités qu’on sélectionne et déplace, à terre, en mer et dans les airs.
- **Peu de ressources** : c’est presque un mini-jeu. Chaque ressource a un rôle clair ; on n’en ajoute une que si elle change les décisions.
- **Le ton** : une comédie de guerre froide tout public, en pixel art isométrique, avec des chats qui parlent, une radio et un journal.
- **Fluide** : aucun ralentissement, même dézoomé sur toute l’île.

## 3. Les règles d’écriture du monde

- Le nom reste **Cold Kutty Town** (il garde le chat dans le logo).
- Deux camps, et seulement ces noms : **United Sands of Cats (USC)** et **Cats Communist Republic (CCR)**. Au large, d’autres nations alliées de chaque camp, sans nom de pays réel.
- Aucun pays réel, aucune personne réelle, **aucune année** : c’est « pendant la guerre froide », sans date. Les mois et les saisons restent.
- Tout le texte est en français, sans tiret long ni tiret moyen.
- Drapeaux à tête de chat : USC en bleu, blanc, rouge avec une tête de chat blanche ; CCR en rouge avec une tête de chat jaune.

## 4. Le déroulé d’une partie

1. **Accueil** : on choisit son camp, le type de partie et les victoires actives.
2. **Débarquement** : l’île est vierge. On choisit sa côte ; les barges accostent et fondent automatiquement la **première ville, une ville portuaire**, avec son hôtel de ville et son port.
3. **Prospérer** : on bâtit, on répartit les habitants entre les métiers, on fait monter les trois indicateurs (croquettes, laine, ronrons) grâce au charbon, à l’eau, à l’électricité et au commerce.
4. **Explorer** : l’île est sous un brouillard. Des explorateurs révèlent le terrain, les gisements et ce que fait l’autre camp.
5. **S’étendre** : chaque bâtiment, et plus encore chaque amélioration, agrandit le territoire. Des unités vont poser des camps loin, même hors du territoire ; un camp amélioré devient un chef-lieu, c’est-à-dire une nouvelle ville. Les villes se relient par routes, chemins de fer, métro et tunnels.
6. **Rechercher, commercer, espionner, s’armer** : l’université ouvre l’arbre de recherche ; le port et le checkpoint ouvrent le commerce ; les espions et les satellites observent l’ennemi ; casernes, usines, chantiers navals et aérodromes produisent les unités.
7. **Gagner** : par l’une des voies du chapitre 15.

## 5. Les types de partie

- **Blitz** : une partie au temps. **On choisit la durée** en créant la partie (de 10 minutes à plusieurs heures). À la fin du temps, le meilleur score gagne, sauf si un camp a gagné avant par une victoire active.
- **Sans fin** : la partie ne s’arrête pas à une heure donnée ; elle continue tant qu’aucun camp n’a gagné par l’une des victoires actives. Elle peut durer autant qu’on veut, sauvegardée.
- **Victoires au choix** : en créant la partie, on coche les victoires actives (toutes, ou seulement certaines : militaire, scientifique, sociale, économique...).
- Contre l’IA, sur sa machine. **En ligne** contre un autre joueur ou contre l’IA : plus tard.
- Le type de partie fixe aussi la taille de la carte et la vitesse de la recherche et des chantiers.

## 6. Les ressources

**Trois indicateurs comptent, et seulement eux** : les **croquettes**, la **laine** et les **ronrons**. Tous les bâtiments se paient uniquement avec ces trois-là. Avec la guerre, ce sont eux qui décident des victoires et des défaites. Tout le reste ne sert qu’à les faire monter ou descendre.

| Indicateur | À quoi il sert | D’où il vient |
|---|---|---|
| **Croquettes** (nourriture), et le **pâté** en luxe | Nourrir les habitants, les pionniers et les unités. Le pâté rend les habitants plus heureux et permet les grands logements. | Pêcheries, fermes, épiceries ; le pâté sort d’une conserverie qui transforme les croquettes. |
| **Laine**, et le **tricot** en luxe (icône : une pelote et deux aiguilles) | Construire, améliorer, tracer routes, rails et Rideau. Le tricot sert aux grands bâtiments et aux améliorations hautes. | Bergeries, filatures ; le tricot sort d’un atelier qui transforme la laine. |
| **Ronrons** | Le moral. Font travailler mieux, font avancer la frontière, évitent la capitulation. | Habitants nourris, logés, distraits ; loisirs, prestige, pâté. |

**L’onglet Ressources** rassemble ce qui conditionne les trois indicateurs, sans servir à payer les bâtiments :

| Ressource | Rôle | D’où elle vient |
|---|---|---|
| **Habitants** | Occupent les métiers. Sans eux, rien ne tourne. | Naissances dans les logements, immigration par le port. |
| **Catcoins** | La monnaie des échanges : acheter et vendre avec l’autre camp et avec les nations alliées au large, importer des habitants et des biens. | Impôts des habitants, commerce, exportations. |
| **Électricité** et **eau** | Des réseaux, pas des stocks : un bâtiment non raccordé produit moins ou s’arrête. | Centrales à charbon, centrale nucléaire, barrages ; châteaux d’eau, pompages. |
| **Charbon** et **uranium** | Gisements de la carte. Le charbon fait tourner les centrales et l’industrie ; l’uranium la centrale nucléaire et la bombe. | Mines posées sur les gisements découverts par l’exploration. |

Le haut de l’écran montre les trois indicateurs ; l’onglet Ressources, le reste. Sa place dans le HUD reste à dessiner (étape 13 du plan).

**Pas d’éoliennes** : elles n’existent pas vraiment à l’époque. L’électricité vient du charbon, de l’eau (barrages) et de l’atome.

**Ressources retenues en plus**, toujours dans l’onglet Ressources :

| Ressource | Rôle | D’où elle vient |
|---|---|---|
| **Herbe à chat**, le luxe des ronrons | Comme le pâté pour les croquettes et le tricot pour la laine : elle fait grimper les ronrons et compte pour la victoire sociale. Les trois indicateurs ont chacun leur luxe. | Serres. |
| **Pétrole** | Fait rouler, naviguer et voler les unités ; sans pétrole, l’armée reste à quai. Donne une raison de se battre pour un coin de carte. | Derricks sur des gisements, plateformes en mer. |
| **Influence** | Ce que pense l’autre camp de nous : la radio, les loisirs et la propagande la font monter ; elle attire les habitants de l’autre côté du Rideau. | Radio, loisirs, prestige, propagande. |

**Pas d’acier ni de bois** : le charbon suffit. Mais le terrain se travaille : des **mines dans les montagnes** (charbon, uranium) et des **exploitations forestières** qui abattent les forêts et rapportent de la laine (le bois devient fibre).

## 7. Les habitants et les métiers

- Les habitants sont **répartis entre les métiers** : nourriture, laine, industrie, services, recherche, armée. Le joueur règle la répartition (des curseurs par grand métier), les bâtiments prennent leurs travailleurs dans le métier qui les concerne.
- Il en manque : on en fait venir par le port (immigration, payée en Catcoins), ou on construit des logements qui attirent des familles.
- Des chats nommés arrivent avec certains bâtiments ; on clique sur un chat pour discuter.

## 8. Les bâtiments

- **Les mêmes bâtiments pour les deux camps**, chacun **habillé au style de son camp** : l’immeuble USC en briques à escalier de secours, l’immeuble CCR en barre de béton à étoile rouge. Plus de bâtiment d’un camp qui porte les signes de l’autre.
- **Seize orientations** : on tourne un bâtiment par pas de 22,5 degrés (les seize directions de la rose des vents) ; au minimum huit (45 degrés) si seize ne rend pas bien en pixel art. Les routes suivent.
- **Améliorer change le bâtiment à l’écran**, avec un vrai chantier (échafaudages, grue) pendant les travaux. Certaines améliorations demandent une recherche ou une ressource de luxe.
- **Le territoire grandit avec les bâtiments** : chaque bâtiment en ajoute un peu autour de lui, chaque amélioration un peu plus, dans une limite. On peut **construire hors de son territoire** grâce aux unités (explorateurs, bâtisseurs), ce qui l’étend.
- La liste proposée, catégorie par catégorie, est dans [BATIMENTS.md](BATIMENTS.md).

## 9. Les villes et les connexions

- La première ville est portuaire, fondée au débarquement.
- **Fonder une ville** : des unités partent poser un **camp** loin, même hors du territoire. Le camp s’améliore en **chef-lieu**, avec son hôtel de ville (mairie côté USC, Palais du Peuple côté CCR) : c’est une nouvelle ville, qui grandit comme la première.
- Les villes et les bâtiments se relient par des **routes**, des **chemins de fer** et des **métros**, avec des **tunnels** sous les montagnes et des ponts. Les connexions **transportent les ressources** entre villes : une ville sans lien ne profite pas de la production des autres.
- Des lignes lisibles à la façon de Mini Metro : couleurs, gares, trains qu’on voit circuler.

## 10. Le monde

- **Brouillard** : on ne voit que ce que voient ses bâtiments et ses unités. Ce qui a été vu reste affiché tel qu’on l’a vu en dernier.
- **Biomes** : forêts de feuillus, forêts de pins, plages, marais, prairies, montagnes ; des arbres différents par biome.
- **Saisons** : en hiver, la neige couvre vraiment le sol, ralentit les unités et les chantiers ; l’été est plus rapide.
- **Rivières** : elles descendent des montagnes jusqu’à la mer. On y pêche, on y pompe l’eau, on y bâtit un barrage, on les franchit par des ponts, et les bateaux peuvent les remonter.
- **Gisements** de charbon et d’uranium (et de pétrole, s’il est retenu) à découvrir.
- **La mer** : les bateaux naviguent vraiment (chemin calculé, sillage, accostage).

## 11. Les unités

- Des unités **mobiles, qu’on sélectionne et qu’on déplace**, produites par des bâtiments :
  - **civiles** : explorateurs, bâtisseurs (construire loin, fonder une ville) ;
  - **terrestres** : soldats, chars et autres véhicules militaires ;
  - **navales** : patrouilleurs, destroyers, sous-marins, navires de transport ;
  - **aériennes** : avions de reconnaissance, chasseurs, bombardiers qui détruisent des bâtiments ;
  - **spatiales** : satellites (voir le chapitre 13) ;
  - **renseignement** : espions (voir le chapitre 14).
- Les unités peuvent **entrer en territoire ennemi** : y voler des ressources, y prendre du terrain, y détruire.
- **Par bateau** : les unités terrestres montent dans un navire de transport pour traverser la mer ou remonter une rivière, et débarquent sur une autre côte. Les navires se construisent au port militaire.
- **La pêche** : les chalutiers des pêcheries et des ports vont pêcher du poisson, qui augmente les croquettes.
- La liste proposée est dans [BATIMENTS.md](BATIMENTS.md).

## 12. La recherche

- Une **université** (puis des laboratoires) produit de la recherche.
- Un **arbre de recherche** en quelques branches : industrie et énergie, société, transports, armée, espace, atome, renseignement. La recherche débloque des bâtiments, des améliorations et des unités.
- La bombe atomique est au bout de la branche de l’atome : elle demande de l’uranium, un centre atomique et beaucoup de recherche.

## 13. L’espace

- Le programme spatial : base spatiale, lancements, puis **satellites** qui révèlent une partie du territoire ennemi sous le brouillard.
- La course à l’espace compte aussi pour la victoire scientifique.

## 14. L’espionnage

- Des bâtiments de renseignement forment des **espions** : voir ce que construit l’autre camp, voler une recherche, saboter un chantier, faire baisser ses ronrons.
- Le contre-espionnage protège ses propres villes.

## 15. Le commerce et la diplomatie

- **Le Rideau de Laine est une construction** : on le bâtit le long de la frontière, avec des portes et un checkpoint. Il fige la frontière, mais c’est aussi **le lieu où l’on parle à l’ennemi** : échanges, traités, négociations.
- **Échanges entre l’USC et la CCR**, en Catcoins, au checkpoint : acheter ce qui manque, vendre ce qu’on a en trop.
- **Traités** : accords commerciaux, trêve, échanges d’habitants ou de territoire. Un traité proposé n’est pas accepté tout de suite : il y a **un temps d’acceptation**, pendant lequel l’autre camp réfléchit (et l’IA dit pourquoi elle refuse, quand elle refuse).
- **Nations alliées au large** : par le port, on importe des biens et des habitants, on exporte ses surplus.
- **Les habitants peuvent s’enfuir** de l’autre côté du Rideau s’ils y trouvent mieux (plus de ronrons, du pâté, du tricot, des emplois). Les miradors et la police freinent les départs ; les haut-parleurs et la radio de l’autre camp les encouragent ; un tunnel d’évasion les fait passer en cachette.
- **Points de passage** sur le Rideau : checkpoint, ambassade, mirador, haut-parleurs, pont des échanges, tunnel d’évasion (voir [BATIMENTS.md](BATIMENTS.md)).
- **La capitulation** : un camp à bout peut se rendre.

## 16. Gagner

L’ancienne règle (le premier à 60 % de l’île) disparaît : le territoire ne compte plus que dans le score. Les victoires reposent sur la guerre et sur les trois indicateurs (croquettes, laine, ronrons). Chacune peut être activée ou non en créant la partie.

- **Militaire, par annihilation** : l’autre camp n’existe plus (plus de ville, plus d’unité).
- **Militaire, par capitulation** : l’autre camp se rend.
- **Scientifique** : être le premier à franchir **les cinq jalons de la science**, qui vont au-delà de la course à l’espace. Proposition :
  1. le premier satellite en orbite ;
  2. un réseau de satellites qui voit tout le territoire ennemi ;
  3. le premier chat dans l’espace ;
  4. une station en orbite ;
  5. le premier chat sur la Lune.

  Chaque jalon demande de la recherche, une base spatiale améliorée et de grandes quantités des trois indicateurs ; chacun rapporte déjà un avantage (voir sous le brouillard, ronrons, prestige).
- **Sociale** : des ronrons au sommet, tenus un certain temps, avec une grande population.
- **Économique** : une production de croquettes et de laine, et un commerce, au-dessus de l’autre camp pendant un certain temps.
- **Victoires de circonstance** : des objectifs propres à une carte ou à une situation (un îlot à tenir, un blocus à briser, une trêve à obtenir...), à imaginer avec les cartes.
- **Blitz** : à la fin du temps, le meilleur score (les trois indicateurs, le territoire, la recherche) gagne.

## 17. L’écran

- Aujourd’hui : la disposition A (trois blocs en haut, colonne de vue à droite, outils au centre en bas, tiroir de construction, mini-carte en bas à gauche, un panneau à droite à la fois).
- **À revoir une fois les nouveautés posées** : moins de boutons, plus d’informations. L’outil Observer disparaît : sans outil choisi, on sélectionne. L’onglet Ressources (habitants, Catcoins, électricité, eau, charbon, uranium), le luxe (pâté, tricot), la recherche et les unités sélectionnées trouvent leur place.

## 18. Les chats

- Les chats qui ont un nom arrivent avec leur bâtiment (la serveuse avec le diner, le garagiste avec la station-service...).
- On clique sur un chat pour discuter. **Pour l’instant, les réponses sont des textes tout faits.** Un modèle de langue sur la machine du joueur pourra venir plus tard.

## 19. L’autre camp

Joué par une IA. Elle doit savoir faire tout ce que fait le joueur : construire, répartir ses habitants, explorer, rechercher, commercer, espionner, faire la guerre et négocier. **C’est la dernière chose à finaliser** : tout le reste d’abord.

## 20. Plus tard

- Les parties en ligne.
- Le mode espace : le globe, les autres îles et continents.

## 21. Critères de réussite

- 60 images par seconde à tous les zooms sur un portable courant, sans à-coup au dézoom.
- Une partie Blitz et une partie Sans fin complètes, sans blocage, gagnables par plusieurs voies.
- Un nouveau joueur comprend quoi faire dans les 2 premières minutes.
- `npm run build` passe, aucune erreur dans la console.
