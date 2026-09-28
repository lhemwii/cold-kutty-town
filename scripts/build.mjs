// Construit le jeu : assemble les modules de src/game dans l'ordre de leur numéro,
// vérifie la syntaxe, puis écrit le site statique dans dist/.
import { readFileSync, writeFileSync, mkdirSync, readdirSync, rmSync, cpSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import vm from 'node:vm';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = (...p) => join(ROOT, 'src', ...p);
const hash = (s) => createHash('sha256').update(s).digest('hex').slice(0, 10);

export function build({ dev = false } = {}){
  // 1. le jeu : tous les modules partagent une seule portée, dans l'ordre 01, 02, 03...
  const files = readdirSync(src('game')).filter(f => f.endsWith('.js')).sort();
  const body = files.map(f => `/* ===== ${f} ===== */\n` + readFileSync(src('game', f), 'utf8')).join('\n');
  const game = `(() => {\n'use strict';\n${body}\n})();\n`;
  new vm.Script(game, { filename: 'game.js' });   // une erreur de syntaxe fait échouer le build ici

  // 2. le style et l'adaptateur de plateforme (Claude, téléchargements) hors de claude.ai
  const css = readFileSync(src('styles', 'main.css'), 'utf8');
  const platform = readFileSync(src('platform', 'standalone.js'), 'utf8');
  new vm.Script(platform, { filename: 'platform.js' });

  // 3. sortie : fichiers avec empreinte pour un cache long, page HTML qui les charge
  const out = join(ROOT, 'dist');
  rmSync(out, { recursive: true, force: true });
  mkdirSync(join(out, 'assets'), { recursive: true });
  const names = { css: `assets/style.${hash(css)}.css`, platform: `assets/platform.${hash(platform)}.js`, game: `assets/game.${hash(game)}.js` };
  writeFileSync(join(out, names.css), css);
  writeFileSync(join(out, names.platform), platform);
  writeFileSync(join(out, names.game), game);
  let html = readFileSync(src('index.html'), 'utf8')
    .replace('%STYLE%', '/' + names.css).replace('%PLATFORM%', '/' + names.platform).replace('%GAME%', '/' + names.game);
  if (dev) html = html.replace('</body>', '<script>new EventSource("/__reload").onmessage = () => location.reload();</script>\n</body>');
  writeFileSync(join(out, 'index.html'), html);
  if (existsSync(join(ROOT, 'public'))) cpSync(join(ROOT, 'public'), out, { recursive: true });
  return { modules: files.length, kb: Math.round(game.length / 1024) };
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url){
  const r = build();
  console.log(`Build OK : ${r.modules} modules, ${r.kb} Ko de jeu, dans dist/`);
}
