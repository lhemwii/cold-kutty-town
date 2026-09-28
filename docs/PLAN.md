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
- [~] IA adverse : ébauche qui débarque et construit, mais se bloque (voir étape 9).

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

## Étape 1. Fiabiliser ce qui existe

- [ ] Jouer une vraie partie à la souris et noter chaque bug d’interface.
- [ ] Vérifier la sauvegarde et le rechargement sur une partie avancée.
- [ ] Annuler : couvrir aussi les améliorations et la démolition.
- [ ] Menu : bouton « Nouvelle partie » qui demande confirmation.
- [ ] Mini-carte : ne pas l’afficher avant le choix du camp.
- [ ] Les chats nommés : vérifier qu’ils apparaissent tous et ne se marchent pas dessus.
- [ ] Nettoyer les restes de l’ancien code (réglages de lumière, motifs, inspecteur de pixels).

## Étape 2. Construire et tracer

- [ ] Aperçu du prix et de l’effet au survol, en direct, dans le fantôme du bâtiment.
- [ ] Orientation des bâtiments (touche pour tourner d’un quart de tour), et alignement automatique face à la route la plus proche.
- [ ] Routes : tracé à main levée en plus de droite et courbe, accroche sur le milieu d’une route, pont court au-dessus d’une rivière ou d’une anse.
- [ ] Routes à deux niveaux : chemin de terre (pas cher) puis route goudronnée (amélioration).
- [ ] Défrichage visible : souches et chantier quand on coupe une forêt.
- [ ] Zones (facultatif, à la Cities: Skylines) : peindre une zone d’habitation le long d’une route et laisser les maisons pousser.

## Étape 3. Économie et améliorations

- [ ] Équilibrage sur une partie de 40 à 60 minutes (coûts, production, vitesse de conquête, prix des avant-postes).
- [ ] Rendre les croquettes utiles plus tard dans la partie (pour l’instant elles s’accumulent).
- [ ] Des visuels par niveau pour plus de bâtiments (pêcherie, bergerie, usine, épicerie qui devient supermarché).
- [ ] Afficher dans le panneau ce que l’amélioration va rapporter.
- [ ] Bilan de fin de mois : ce qui a rapporté, ce qui a coûté.

## Étape 4. La mer

- [ ] Choisir sa destination de barge sur la carte stratégique, avec le trajet affiché.
- [ ] Un chalutier sélectionnable, avec sa prise du jour.
- [ ] Le phare qui éclaire vraiment la route des bateaux la nuit (bonus de pêche).
- [ ] Des vagues et de l’écume autour des pontons et des coques.

## Étape 5. Territoire et frontière

- [ ] Rendre la pression aux frontières lisible (flèches ou hachures là où ça bouge).
- [ ] Rideau de Laine : tracé en plusieurs clics qui suit la frontière, portes, Checkpoint qui s’insère dans le mur.
- [ ] Ce que rapporte la frontière figée (moins de tension, plus de laine ?) et ce qu’elle coûte (moins de ronrons ?).
- [ ] Course à l’espace : l’afficher clairement dans l’interface.

## Étape 6. Interface et style

- [ ] Tutoriel au premier lancement (poser une route, une maison, une pêcherie, un avant-poste).
- [ ] Icônes pixel pour chaque catégorie du menu de construction.
- [ ] Raccourcis clavier affichés dans les infobulles, et un écran d’aide.
- [ ] Vraie version téléphone (dock repliable, gestes).
- [ ] Logo en SVG avec la tête de chat.

## Étape 7. Vie et contenu

- [ ] Plus de répliques pour les chats, liées à la situation (pénurie, frontière qui recule, victoire).
- [ ] Radio et journal qui parlent des vraies actions de la partie (barge, mur, avant-poste).
- [ ] Événements plus nombreux, certains liés à la frontière et à la mer.
- [ ] Bâtiments de retour, à construire : gare et train, métro, aéroport.
- [ ] Claude en option pour les chats et le journal (plus tard).

## Étape 8. Technique

- [ ] Tests automatiques : règles (économie, territoire, routes) avec Vitest, démarrage et partie rapide avec Playwright.
- [ ] Intégration continue : build et tests à chaque push.
- [ ] Passer aux modules ES, puis TypeScript module par module.
- [ ] Séparer l’état, les règles et le dessin (un seul objet d’état).
- [ ] Mesurer la performance sur mobile ; rendu des forêts en tuiles si besoin.

## Étape 9. L’IA adverse (en dernier)

L’ébauche actuelle débarque loin du joueur, construit par ordre de besoins, trace des routes, pose des avant-postes, arme des barges et un Rideau. Ce qui ne va pas encore, vu en faisant jouer deux IA l’une contre l’autre :

- [ ] Elle trace ses routes au hasard ; elles se croisent et bouchent les parcelles. Piste : un plan de rues en grille autour de son QG.
- [ ] Elle manque de laine (une seule bergerie) et accumule des ronrons sans les dépenser.
- [ ] Elle ne s’améliore presque pas et ne construit pas de prestige.
- [ ] Niveaux de difficulté (facile, normal, difficile).
- [ ] Un outil de test qui fait jouer deux IA en accéléré et sort un bilan minute par minute (existe en brouillon, à ranger dans `scripts/`).

## Étape 10. Plus tard

- [ ] Multijoueur hors de claude.ai (service temps réel).
- [ ] Rendu HD (atlas de bâtiments ou WebGL).
- [ ] Version Steam : empaquetage, succès, sauvegardes en fichiers.
