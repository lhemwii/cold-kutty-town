<p align="center"><img src="docs/screenshots/hero.jpg" alt="Cold Kutty Town" width="100%"></p>

# Cold Kutty Town

Un city builder cozy de chats, en pleine guerre froide, en 1961. En couleur, du matin à la nuit.

Deux camps sur la même île : l’USC et son Rêve des Nations Libres à l’ouest, la CCR et son Grand Plan du Peuple à l’est. On construit, on nourrit, on garde le moral, on tranche les crises, on lance des fusées. Les chats parlent, se souviennent de toi et lisent le journal du matin. Au bout, le mur.

**Jouer en ligne :** (lien Vercel à venir)

## Lancer le jeu sur ton ordi

Il faut Node.js 20 ou plus récent. Le projet n’a aucune dépendance à installer.

```bash
git clone https://github.com/lhemwii/cold-kutty-town.git
cd cold-kutty-town
npm run dev
```

Ouvre http://localhost:5173. Chaque fois que tu enregistres un fichier dans `src/`, le jeu se reconstruit et la page se recharge toute seule.

Pour que les chats et le journal soient écrits par Claude en local, copie `.env.example` en `.env.local` et mets ta clé API Anthropic dedans. Sans clé, tout marche, avec des phrases toutes faites.

## Construire et déployer

```bash
npm run build      # écrit le site dans dist/
npm run preview    # sert dist/ sur http://localhost:4173
```

Le dépôt est relié à Vercel : chaque push sur `main` part en production, chaque autre branche donne une préversion avec sa propre adresse. Pour Claude en ligne, ajoute `ANTHROPIC_API_KEY` dans les variables d’environnement du projet Vercel.

## Comment c’est fait

Du JavaScript sans framework, rendu pixel par pixel dans un canvas. Le moteur isométrique est écrit à la main : buffers de pixels, palette jour et nuit, tri des objets par profondeur, lumières, ombres. Pas d’image : chaque bâtiment, chat, voiture et avion est dessiné par du code.

```
src/
  index.html            la page (panneaux, fenêtres, dock)
  styles/main.css       le style de l’interface
  game/01-core.js ...   le jeu, en 21 modules chargés dans l’ordre
  platform/standalone.js  branche Claude et les téléchargements hors de claude.ai
api/claude.js           fonction Vercel qui relaie vers l’API Claude
scripts/build.mjs       assemble les modules et écrit dist/
scripts/dev.mjs         serveur local avec rechargement automatique
docs/                   architecture, règles du jeu, développement, feuille de route
```

## Documentation

- [Architecture du moteur](docs/ARCHITECTURE.md)
- [Règles du jeu](docs/GAMEPLAY.md)
- [Développer au quotidien](docs/DEVELOPPEMENT.md)
- [Feuille de route](docs/ROADMAP.md)

## Images

<p><img src="docs/screenshots/shot-1.jpg" width="49%"> <img src="docs/screenshots/shot-2.jpg" width="49%"></p>
<p><img src="docs/screenshots/shot-3.jpg" width="49%"> <img src="docs/screenshots/shot-4.jpg" width="49%"></p>

Un projet de Wilhem Godeau, codé avec Claude.
