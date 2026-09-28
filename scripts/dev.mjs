// Serveur de développement : reconstruit à chaque modification de src/ et recharge la page toute seule.
// Il sert aussi /api/claude avec la même fonction que Vercel, en lisant la clé dans .env.local.
import http from 'node:http';
import { readFileSync, existsSync, statSync, watch } from 'node:fs';
import { join, extname, normalize } from 'node:path';
import { build, ROOT } from './build.mjs';

// .env.local : ANTHROPIC_API_KEY=... (jamais commité)
const envFile = join(ROOT, '.env.local');
if (existsSync(envFile)) for (const line of readFileSync(envFile, 'utf8').split(/\r?\n/)){
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}

const PORT = +process.env.PORT || 5173;
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.json': 'application/json', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json' };
const clients = new Set();

function rebuild(){
  try { const r = build({ dev: true }); console.log(`[${new Date().toLocaleTimeString()}] reconstruit (${r.modules} modules, ${r.kb} Ko)`); for (const c of clients) c.write('data: reload\n\n'); }
  catch (e){ console.error('\nErreur de build :\n' + (e.stack || e.message)); }
}
rebuild();
let timer = null;
watch(join(ROOT, 'src'), { recursive: true }, () => { clearTimeout(timer); timer = setTimeout(rebuild, 120); });

async function api(req, res){
  const { default: handler } = await import('../api/claude.js?t=' + Date.now());
  const r = { statusCode: 200, headers: {}, setHeader(k, v){ this.headers[k] = v; }, status(c){ this.statusCode = c; return this; },
    json(o){ res.writeHead(this.statusCode, Object.assign({ 'Content-Type': 'application/json' }, this.headers)); res.end(JSON.stringify(o)); return this; } };
  await handler(req, r);
}

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname === '/__reload'){
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
    res.write('\n'); clients.add(res); req.on('close', () => clients.delete(res)); return;
  }
  if (url.pathname === '/api/claude') return api(req, res).catch(e => { res.writeHead(500); res.end(String(e)); });
  let file = normalize(join(ROOT, 'dist', decodeURIComponent(url.pathname)));
  if (!file.startsWith(join(ROOT, 'dist'))){ res.writeHead(403); return res.end(); }
  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
  if (!existsSync(file)){ res.writeHead(404); return res.end('introuvable'); }
  res.writeHead(200, { 'Content-Type': TYPES[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
  res.end(readFileSync(file));
}).listen(PORT, () => {
  console.log(`\n  Jeu en local : http://localhost:${PORT}\n  Claude : ${process.env.ANTHROPIC_API_KEY ? 'branché (clé trouvée dans .env.local)' : 'phrases toutes faites (ajoute ANTHROPIC_API_KEY dans .env.local)'}\n`);
});
