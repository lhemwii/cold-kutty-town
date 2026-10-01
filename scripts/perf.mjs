// Mesure de performance : temps moyen d'une image (rendu complet) selon la taille de carte, le zoom et le chemin de dessin
// (processeur ou carte graphique). « npm run build » d'abord, puis « node scripts/perf.mjs ». Sans vraie carte graphique,
// le chemin GPU passe par SwiftShader : ses chiffres ne valent que pour comparer entre deux versions.
import { preview } from 'vite';
import { chromium } from 'playwright';
const server = await preview({ preview: { port: 4175, strictPort: true }, logLevel: 'error' });
const browser = await chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {});
const rows = [];
for (const gl of ['0', 'gpu']) for (const size of ['moyenne', 'grande']){
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
  await page.goto('http://localhost:4175/?gl=' + gl); await page.waitForFunction(() => window.__okt, null, { timeout: 60000 });
  await page.click('.hm[data-page="new"]'); await page.click(`#newSize [data-v="${size}"]`); await page.click('#newConf [data-v="une"]'); await page.click('#introGo');
  // une plage sur la premiere ile, en faisant le tour de son rivage
  await page.evaluate(() => { const o = window.__okt; for (let k = 0; k < 400 && o.GAME.mode !== 'play'; k++){ const it = o.ISL()[0], an = k * .37; o.chooseLanding(it.ca + Math.cos(an) * it.ra, it.cb + Math.sin(an) * it.rb); } o.GAME.speed = 4; });
  console.error('…', gl, size);
  await page.waitForFunction(() => window.__okt.BLD().some(l => l.type === 'qg' && l.done), null, { timeout: 90000 });
  for (const [name, z] of [['près', 1], ['loin', .3]]){
    const ms = await page.evaluate(async (z) => { const o = window.__okt; o.setZoom(o.KDEF * z, null, null, true); await new Promise(r => setTimeout(r, 800)); const n = 30, t0 = performance.now(); for (let k = 0; k < n; k++) o.render(o.SH.NOW_T + k * .05); return (performance.now() - t0) / n; }, z);
    rows.push({ dessin: gl === '0' ? 'processeur' : 'carte graphique', carte: size, vue: name, ms: Math.round(ms * 10) / 10 });
  }
  await page.close();
}
console.table(rows);
await browser.close(); await new Promise(r => server.httpServer.close(r));
