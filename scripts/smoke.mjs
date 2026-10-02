// Essai de fumée : le site construit (dist/) démarre, une partie s'ouvre, le QG se bâtit, les écrans principaux s'ouvrent,
// et aucune erreur ne remonte de la page. « npm run build » d'abord, puis « npm run smoke ».
import { preview } from 'vite';
import { chromium } from 'playwright';

const server = await preview({ preview: { port: 4174, strictPort: true }, logLevel: 'error' });
const url = 'http://localhost:4174/';
const browser = await chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {});
const page = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message));
const step = async (name, fn) => { const t0 = Date.now(); await fn(); console.log('ok', name, Date.now() - t0, 'ms'); };
let code = 0;
try {
  await step('accueil', async () => { await page.goto(url); await page.waitForFunction(() => window.__okt, null, { timeout: 60000 }); });
  await step('nouvelle partie', async () => {
    await page.click('.hm[data-page="new"]'); await page.click('#newSize [data-v="petite"]'); await page.click('#newConf [data-v="une"]'); await page.click('#introGo');
    await page.evaluate(() => { const o = window.__okt; for (let k = 0; k < 24 && o.GAME.mode !== 'play'; k++){ const an = Math.PI + k * .26; o.chooseLanding(Math.cos(an) * 420, Math.sin(an) * 280); } o.GAME.speed = 4; });
    await page.waitForFunction(() => window.__okt.BLD().some(l => l.type === 'qg' && l.side === window.__okt.GAME.side && l.done), null, { timeout: 90000 });
  });
  await step('menu de construction', async () => { await page.keyboard.press('b'); await page.waitForSelector('#buildMenu:not([hidden])'); await page.keyboard.press('Escape'); });
  for (const [k, id] of [['u', 'sci'], ['p', 'dip'], ['o', 'vic'], ['h', 'help']]) await step('écran ' + id, async () => { await page.keyboard.press(k); await page.waitForSelector('#' + id + ':not([hidden])'); await page.keyboard.press('Escape'); });
  await step('sauvegarde', async () => { const n = await page.evaluate(() => { const o = window.__okt, s = o.snapshot(); o.loadGame(s); return o.BLD().length; }); if (!n) throw new Error('rien après rechargement'); });
  if (errors.length) throw new Error('erreurs de la page : ' + errors.join(' | '));
  console.log('fumée : tout va bien');
} catch (e) {
  console.error('fumée : échec :', e.message); code = 1;
} finally {
  await browser.close(); await new Promise(r => server.httpServer.close(r));
}
process.exit(code);
