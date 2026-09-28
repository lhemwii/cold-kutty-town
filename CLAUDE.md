# Cold Kutty Town : consignes pour Claude

- Tout le texte du jeu et de la doc est en français. Jamais de tiret long ni de tiret moyen, nulle part.
- Aucun pays réel ni personne réelle dans le jeu. Les camps sont l’USC (Rêve des Nations Libres) et la CCR (Grand Plan du Peuple).
- Les modules de `src/game/` partagent une seule portée et se chargent dans l’ordre de leur numéro. Préférer les crochets `HOOKS` à une modification de la boucle.
- Avant de pousser : `npm run build` doit passer.
- Architecture : docs/ARCHITECTURE.md. Feuille de route : docs/ROADMAP.md.
