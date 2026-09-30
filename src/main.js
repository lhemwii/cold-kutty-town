// Point d'entrée du jeu : l'adaptateur de plateforme d'abord, puis les modules dans l'ordre de leur numéro.
// Chaque module n'importe que des modules plus petits en numéro : l'ordre d'exécution reste celui des numéros.
import './platform/standalone.js';
import './game/00-shared.ts';
import './game/01-core.ts';
import './game/02-ground.ts';
import './game/03-buildings-base.ts';
import './game/04-types.ts';
import './game/05-types-extra.ts';
import './game/06-types-more.ts';
import './game/07-world.ts';
import './game/08-territory.ts';
import './game/09-roads.ts';
import './game/10-town.ts';
import './game/11-render.ts';
import './game/12-portrait.js';
import './game/13-ui.js';
import './game/14-hud.js';
import './game/15-economy.ts';
import './game/16-boats.ts';
import './game/17-calendar.js';
import './game/18-life.js';
import './game/19-extras.js';
import './game/20-rival.js';
import './game/21-main.js';
import './game/22-home.js';
import './game/23-planet.js';
