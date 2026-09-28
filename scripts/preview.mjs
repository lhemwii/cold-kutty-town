// Sert dist/ tel qu'il sera en ligne (après npm run build).
import http from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, extname, normalize } from 'node:path';
import { ROOT } from './build.mjs';
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.json': 'application/json' };
const PORT = +process.env.PORT || 4173, DIST = join(ROOT, 'dist');
if (!existsSync(DIST)){ console.error('Lance d’abord : npm run build'); process.exit(1); }
http.createServer((req, res) => {
  let file = normalize(join(DIST, decodeURIComponent(new URL(req.url, 'http://x').pathname)));
  if (!file.startsWith(DIST)){ res.writeHead(403); return res.end(); }
  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
  if (!existsSync(file)){ res.writeHead(404); return res.end('introuvable'); }
  res.writeHead(200, { 'Content-Type': TYPES[extname(file)] || 'application/octet-stream' });
  res.end(readFileSync(file));
}).listen(PORT, () => console.log(`Aperçu de dist/ : http://localhost:${PORT}`));
