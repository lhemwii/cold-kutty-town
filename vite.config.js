// Build et serveur de développement du jeu (Vite).
// La page est src/index.html ; le jeu part de src/main.js ; public/ est copié tel quel ; le site est écrit dans dist/.
// En local, /api/claude est servi par la même fonction que sur Vercel, avec la clé lue dans .env.local.
import { defineConfig, loadEnv } from 'vite';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('.', import.meta.url));

function apiClaude(){
  const handle = async (req, res) => {
    const { default: handler } = await import(new URL('./api/claude.js', import.meta.url).href + '?t=' + Date.now());
    const r = { statusCode: 200, headers: {}, setHeader(k, v){ this.headers[k] = v; }, status(c){ this.statusCode = c; return this; },
      json(o){ res.writeHead(this.statusCode, Object.assign({ 'Content-Type': 'application/json' }, this.headers)); res.end(JSON.stringify(o)); return this; } };
    await handler(req, r);
  };
  const mount = (server) => { server.middlewares.use('/api/claude', (req, res) => { handle(req, res).catch(e => { res.statusCode = 500; res.end(String(e)); }); }); };
  return { name: 'api-claude', configureServer: mount, configurePreviewServer: mount };
}

export default defineConfig(({ mode }) => {
  // .env.local : ANTHROPIC_API_KEY=... (jamais commité)
  Object.assign(process.env, loadEnv(mode, ROOT, ''), process.env);
  return {
    root: 'src',
    publicDir: '../public',
    // (le jeu et PixiJS tiennent en un seul script d'environ 500 Ko, 170 Ko compresses : pas d'avertissement pour cela)
    build: { outDir: '../dist', emptyOutDir: true, target: 'es2022', assetsDir: 'assets', chunkSizeWarningLimit: 900 },

    server: { port: 5173 },
    preview: { port: 4173 },
    plugins: [apiClaude()]
  };
});
