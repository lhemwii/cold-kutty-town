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

## Claude en local et en ligne

1. Copie `.env.example` en `.env.local` (ce fichier n’est jamais commité).
2. Mets ta clé : `ANTHROPIC_API_KEY=...`
3. En ligne : Vercel, projet Cold Kutty Town, Settings, Environment Variables, ajoute la même variable, puis redéploie.

La fonction `api/claude.js` limite chaque adresse à 20 demandes par minute et coupe les réponses longues. Garde un œil sur la consommation dans la console Anthropic si le lien circule.

## Ajouter un bâtiment

1. Dans `src/game/04-types.js` (ou `05`, `06`), ajoute une entrée à `TYPES` avec `name`, `nameCCP` si le nom change à l’est, `fem`, et une fonction `build(lot, seed)` qui renvoie ses `parts` (pièces dessinées), ses `decals` (dessins au sol) et ses `lights`.
2. Ajoute-le à la palette (liste en bas de `06-types-more.js`).
3. Donne-lui sa valeur pour chaque camp dans `CAMP_VAL` (`14-camps.js`) et son économie dans `ECO` (`15-economy.js`) : croquettes et laine par minute, loisirs, habitants, coût en laine.

## Ajouter un effet ou un système

Plutôt que de modifier la boucle, accroche-toi à `HOOKS` (voir [ARCHITECTURE.md](ARCHITECTURE.md)) :

```js
HOOKS.step.push((dt, t) => { /* logique à chaque image */ });
HOOKS.top.push((t) => { CUR = M.LAMP; fput(10, 10, 1); });
```

## Tester

- Dans la console du navigateur, `__okt` donne accès à tout : `__okt.CLOCK.h = 22` pour passer la nuit, `__okt.CAL.m = 11; __okt.applySeason()` pour décembre, `__okt.forceEvent()` pour un événement.
- Avant de pousser : `npm run build` doit passer, et un tour rapide dans le jeu (jour, nuit, zoom, construire, annuler).

## Conventions

- Tout le texte du jeu est en français. Jamais de tiret long ni de tiret moyen : virgule, point ou deux-points.
- Aucun pays réel, aucune personne réelle.
- Commentaires en français, courts, qui expliquent le pourquoi.
