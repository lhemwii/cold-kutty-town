# Règles pures

Ces fichiers ne touchent ni à la page, ni au dessin, ni à l’état du jeu : ils prennent des nombres et rendent des nombres.
Les modules de `src/game/` les importent, et Vitest les essaie dans Node (`npm test`, dossier `tests/`).
C’est le premier pas de la séparation entre l’état, les règles et le dessin (docs/PLAN.md, étape 15).
