# Feuille de route

Ce qui est prévu pour faire de Cold Kutty Town un vrai jeu. Les points du chapitre 1 sont aussi ouverts en tickets GitHub.

## 1. Tout de suite

- **Refaire le drapeau de l’USC.** Rayures et canton étoilé : il ressemble trop à un drapeau réel. Il faut un drapeau propre à l’USC, par exemple une patte ou une pelote sur fond bleu et crème, avec la même logique que l’étoile de la CCR. À changer partout : mairie, avions, bateaux, barges, piquets du Débarquement, fenêtre de discussion.
- **Le HUD.** Regrouper les panneaux (ressources, jauges, radio, horloge) dans une barre du haut plus lisible, icônes pixel pour croquettes, laine et moral, panneaux repliables, raccourcis clavier affichés, vraie version téléphone.
- **Le logo.** Garder le mot-symbole Cold Kutty Town et en faire une vraie image (SVG), avec la tête de chat dans le W, déclinée en icône d’appli et en favicon.
- **Lisibilité en jeu.** Afficher sur la carte ce que chaque camp demande, un petit tutoriel au premier lancement, des infobulles sur les boutons du dock.
- **Équilibrage.** Coûts, production, vitesse d’évolution des maisons, fréquence des événements : les régler sur une vraie partie d’une heure.

## 2. Un vrai code de jeu

- **Modules ES et TypeScript.** Aujourd’hui les 21 modules partagent une seule portée et sont collés dans l’ordre. Étape suivante : de vrais `import` et `export`, puis TypeScript module par module, en commençant par `01-core` et l’économie.
- **Séparer l’état, les règles et le dessin.** Un objet d’état unique (ville, ressources, camps, calendrier) que les règles modifient et que le rendu lit. Ça rend la sauvegarde, le multijoueur et les tests beaucoup plus simples.
- **Tests.** Vitest pour les règles (économie, voisinage, jauges, fronts du Débarquement) et Playwright pour vérifier que la page démarre, qu’on construit, qu’on annule, sans erreur.
- **Intégration continue.** Une action GitHub qui lance le build et les tests à chaque push (à ajouter depuis ton ordi, le jeton de cette session n’a pas le droit d’écrire des workflows).

## 3. Rendu HD

Le moteur dessine tout pixel par pixel sur le processeur. C’est ce qui donne le style, mais ça limite la finesse et les performances en plein écran.

- **Option A, garder le moteur et le muscler.** Pré-rendre chaque bâtiment une fois en image (atlas) au lieu de le redessiner à chaque image, rendre le sol par tuiles en cache, et doubler la résolution de base. Gain rapide, style conservé.
- **Option B, passer à PixiJS (WebGL).** Le plan de départ : sprites dessinés en HD, zoom fluide, 60 images par seconde sur mobile, effets de lumière en shader. Plus de travail, mais c’est la base d’un jeu Steam.
- Dans les deux cas : garder la logique de jeu (économie, camps, IA) telle quelle et ne changer que la couche de rendu, d’où l’intérêt de la séparation du point 2.

## 4. Claude et l’IA

- **Déjà branché :** `api/claude.js` relaie vers l’API Claude dès que `ANTHROPIC_API_KEY` est définie sur Vercel. Sans clé, les chats utilisent des phrases toutes faites.
- **Protéger la clé :** ajouter un petit code d’accès ou une connexion avant d’ouvrir le lien au public, et un plafond de dépense dans la console Anthropic.
- **Modèle embarqué :** à terme, un petit modèle local (type Gemma) pour que les chats parlent hors ligne, avec Claude en option pour le journal.

## 5. Multijoueur hors de claude.ai

La partie à deux marche aujourd’hui grâce à la base partagée et aux salles de claude.ai. Hors de claude.ai, il faut un service temps réel : Supabase (base et temps réel), PartyKit ou Liveblocks. Le code de synchronisation (`20-multiplayer.js`) est déjà écrit pour un document partagé par partie : il suffit de remplacer la couche d’accès.

## 6. Vers Steam

- Empaqueter avec Tauri ou Electron, sauvegardes en fichiers, plein écran, manette.
- Steamworks : succès (premier satellite, mur tricoté, ville à 100 %), sauvegardes dans le cloud.
