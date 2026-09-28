# Cold Kutty Town : consignes pour Claude

- Tout le texte du jeu et de la doc est en français. Jamais de tiret long ni de tiret moyen, nulle part.
- Aucun pays réel, aucune personne réelle, aucune année dans le jeu (ni 1961 ni autre). Les camps s’appellent United Sands of Cats (USC) et Cats Communist Republic (CCR), et seulement ainsi.
- Les modules de `src/game/` partagent une seule portée et se chargent dans l’ordre de leur numéro. Préférer les crochets `HOOKS` à une modification de la boucle.
- Avant de pousser : `npm run build` doit passer.
- Produit : docs/PRD.md. Plan et liste des choses à faire : docs/PLAN.md (l’IA adverse vient en dernier). Architecture : docs/ARCHITECTURE.md.
