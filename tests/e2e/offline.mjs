// Richiede build con fixture e `vite preview` su :4173
import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
const ctx = await b.newContext({ serviceWorkers: 'allow' });
const page = await ctx.newPage();
const base = 'http://localhost:4173/riccio/';
await page.goto(base, { waitUntil: 'networkidle' });
await page.evaluate(() => navigator.serviceWorker.ready);
// attende che il precache sia completo
await page.waitForFunction(async () => (await caches.keys()).length > 0 && (await (await caches.open((await caches.keys())[0])).keys()).length >= 8);
await page.reload({ waitUntil: 'networkidle' }); // ora la pagina è controllata dal SW
await ctx.setOffline(true);
let fails = 0;
const t = async (n, f) => { try { await f(); console.log('ok', n); } catch (e) { fails++; console.log('FAIL', n, e.message); } };
await t('landing offline', async () => { await page.goto(base); assert.match(await page.textContent('h1'), /riccio/i); });
await t('lista CRAS offline con filtro', async () => {
  await page.goto(base + 'cras.html?q=modena'); await page.waitForSelector('#tbody tr', { state: 'attached' });
  assert.match(await page.textContent('#count'), /1 centro su 10/);
});
await t('triage offline', async () => {
  await page.goto(base + 'riccio.html'); await page.waitForSelector('.opt');
  await page.locator('.opt', { hasText: 'Di giorno' }).click(); await page.locator('.opt', { hasText: 'Barcolla' }).click();
  assert.match(await page.textContent('.result h2'), /Urgenza/);
});
await t('esito condiviso offline', async () => { await page.goto(base + 'riccio.html?esito=lascialo'); assert.match(await page.textContent('.result h2'), /lascialo/i); });
await b.close();
process.exit(fails ? 1 : 0);
