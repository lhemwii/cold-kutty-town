// Duel d'IA : les deux camps joues par l'IA, en accelere, avec un bilan toutes les cinq minutes de jeu.
// « npm run build », puis « node scripts/ai-duel.mjs [minutes] [taille] [niveau] » (par defaut 30, moyenne, normal).
import { preview } from 'vite';
import { chromium } from 'playwright';
const minutes = +(process.argv[2] || 30), size = process.argv[3] || 'moyenne', level = process.argv[4] || 'normal';
const server = await preview({ preview: { port: 4176, strictPort: true }, logLevel: 'error' });
const browser = await chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {});
const page = await (await browser.newContext({ viewport: { width: 800, height: 500 } })).newPage();
page.on('pageerror', e => console.log('erreur de la page :', e.message));
await page.goto('http://localhost:4176/'); await page.waitForFunction(() => window.__okt, null, { timeout: 60000 });
await page.click('.hm[data-page="new"]'); await page.click(`#newSize [data-v="${size}"]`); await page.click('#newConf [data-v="une"]'); await page.click(`#newLevel [data-v="${level}"]`); await page.click('#introGo');
await page.evaluate(() => { const o = window.__okt; for (let k = 0; k < 400 && o.GAME.mode !== 'play'; k++){ const it = o.ISL()[0], an = k * .37; o.chooseLanding(it.ca + Math.cos(an) * it.ra, it.cb + Math.sin(an) * it.rb); } o.autoBoth(); o.GAME.speed = 8; });
const rows = [];
for (let m = 5; m <= minutes; m += 5){
  await page.waitForFunction((m) => window.__okt.GAME.t >= m * 60 || window.__okt.GAME.winner, m, { timeout: 900000 });
  const r = await page.evaluate(() => { const o = window.__okt, S = o.SH, one = s => { const R = o.RES[s]; return { hab: R.pop, croq: Math.round(R.rc), laine: Math.round(R.rl), ron: Math.round(R.rr), coins: Math.round(R.x.coins), rech: S.SCI[s].done.size, unites: S.UNITS.filter(u => u.side === s).length, bat: o.BLD().filter(l => l.side === s).length, score: S.score(s) }; };
    return { min: Math.round(o.GAME.t / 60), gagnant: o.GAME.winner || '', usc: one('usc'), ccp: one('ccp') }; });
  for (const s of ['usc', 'ccp']) rows.push({ min: r.min, camp: s, ...r[s], gagnant: r.gagnant });
  if (r.gagnant) break;
}
console.table(rows);
await browser.close(); await new Promise(r => server.httpServer.close(r));
