# Développer au quotidien

## Démarrer

```bash
npm run dev        # http://localhost:5173, reconstruit et recharge à chaque sauvegarde
npm run build      # vérifie la syntaxe et écrit dist/
npm run preview    # sert dist/ tel qu’il sera en ligne
```

Aucune dépendance : pas de `npm install` obligatoire, il suffit de Node.js 20+.

## Branches et déploiement

- `main` = production. Chaque push part en ligne tout seul sur Vercel.
- Pour tester une idée : une branche (`git switch -c drapeau-usc`), des commits, un push. Vercel donne une adresse de préversion pour cette branche. On fusionne dans `main` quand c’est bon.

## Claude

Pour l’instant, les chats et le journal utilisent des textes tout faits. `api/claude.js` reste en place pour les rebrancher plus tard (voir [PLAN.md](PLAN.md)).

## Ajouter un bâtiment

1. Dans `src/game/04-types.js` (ou `05`, `06`), ajoute une entrée à `TYPES` avec `name`, `nameCCP` si le nom change côté CCR, `fem`, et une fonction `build(lot, seed)` qui renvoie ses `parts`, `decals` et `lights`. `lot` porte l’emprise (`a0..a1`, `b0..b1`, `ca`, `cb`), le camp, le niveau et, pour la côte, la direction de la mer (`dir`).
2. Donne-lui sa ligne dans `ECO` (`15-economy.js`) : catégorie du menu, coût, production et fonctionnement par minute, habitants, emplois, loisirs, rayon d’influence, `up` s’il s’améliore, `coast` s’il se pose face à l’eau, `noRoad` s’il n’a pas besoin de route. Il apparaît alors tout seul dans le menu.
3. Si son emprise n’est pas 36 x 31, ajoute-la dans `FOOT` (`10-town.js`).

## Ajouter un effet ou un système

Plutôt que de modifier la boucle, accroche-toi à `HOOKS` (voir [ARCHITECTURE.md](ARCHITECTURE.md)) :

```js
HOOKS.step.push((dt, t) => { /* logique à chaque image */ });
HOOKS.top.push((t) => { CUR = M.LAMP; fput(10, 10, 1); });
```

## Tester

- Dans la console du navigateur, `__okt` donne accès à tout : `__okt.CLOCK.h = 22` pour passer la nuit, `__okt.CAL.m = 11; __okt.applySeason()` pour décembre, `__okt.forceEvent()` pour un événement, `__okt.GAME.speed = 8` pour accélérer, `__okt.autoBoth()` pour laisser l’IA jouer les deux camps.
- Avant de pousser : `npm run build` doit passer, et un tour rapide dans le jeu (débarquer, construire, tracer une route, dézoomer, annuler).

## Conventions

- Tout le texte du jeu est en français. Jamais de tiret long ni de tiret moyen : virgule, point ou deux-points.
- Aucun pays réel, aucune personne réelle, aucune année.
- Commentaires en français, courts, qui expliquent le pourquoi.
