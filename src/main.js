// Point d'entrée du jeu : l'adaptateur de plateforme d'abord, puis les modules dans l'ordre de leur numéro.
// Chaque module n'importe que des modules plus petits en numéro : l'ordre d'exécution reste celui des numéros.
import './platform/standalone.js';
import './game/00-shared.js';
import './game/01-core.js';
import './game/02-ground.js';
import './game/03-buildings-base.js';
import './game/04-types.js';
import './game/05-types-extra.js';
import './game/06-types-more.js';
import './game/07-world.js';
import './game/08-territory.js';
import './game/09-roads.js';
import './game/10-town.js';
import './game/11-render.js';
import './game/12-portrait.js';
import './game/13-ui.js';
import './game/14-hud.js';
import './game/15-economy.js';
import './game/16-boats.js';
import './game/17-calendar.js';
import './game/18-life.js';
import './game/19-extras.js';
import './game/20-rival.js';
import './game/21-main.js';
import './game/22-home.js';
import './game/23-planet.js';
