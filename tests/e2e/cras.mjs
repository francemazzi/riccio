// Richiede build con CRAS_CSV=tests/fixtures/cras-esempio.csv e `vite preview` su :4173
import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
const base = 'http://localhost:4173/riccio/cras.html';
const results = [];
const check = async (name, fn) => { try { await fn(); results.push(['ok', name]); } catch (e) { results.push(['FAIL', name + ': ' + e.message]); } };

for (const [label, vp] of [['mobile', { width: 360, height: 740 }], ['desktop', { width: 1280, height: 800 }]]) {
  const ctx = await b.newContext({ viewport: vp, geolocation: { latitude: 44.65, longitude: 10.92 }, permissions: ['geolocation'] });
  const page = await ctx.newPage();
  const errs = []; page.on('pageerror', (e) => errs.push(e.message));
  await page.goto(base, { waitUntil: 'networkidle' });
  const visibleList = label === 'mobile' ? '#list-cards > li' : '#tbody > tr';
  await check(`${label}: mostra tutti i centri`, async () => { assert.equal(await page.locator(visibleList).count(), 10); assert.match(await page.textContent('#count'), /10 centri su 10/); });
  await check(`${label}: nessun overflow`, async () => assert.equal(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), 0));
  await check(`${label}: ricerca Modena`, async () => {
    await page.fill('#f-q', 'Modena');
    assert.equal(await page.locator(visibleList).count(), 1);
    assert.ok(page.url().includes('q=Modena'));
  });
  await check(`${label}: tel: presente e grande`, async () => {
    const a = page.locator(`${visibleList} a[href^="tel:"]`).first();
    assert.equal(await a.getAttribute('href'), 'tel:+39000000001');
    const box = await a.boundingBox(); assert.ok(box.height >= 44);
  });
  await check(`${label}: filtro regione e provincia`, async () => {
    await page.click('#reset');
    await page.selectOption('#f-regione', 'Lombardia');
    assert.equal(await page.locator(visibleList).count(), 2);
    const opts = await page.locator('#f-provincia option').allTextContents();
    assert.deepEqual(opts, ['Tutte le province', 'BG', 'MI']);
    await page.selectOption('#f-provincia', 'BG');
    assert.equal(await page.locator(visibleList).count(), 1);
  });
  await check(`${label}: da verificare / nessun risultato`, async () => {
    await page.click('#reset');
    assert.ok((await page.locator('.badge.warn').count()) > 0);
    await page.fill('#f-q', 'zzzz');
    assert.match(await page.textContent('#empty'), /1515/);
  });
  await check(`${label}: geolocalizzazione ordina per distanza`, async () => {
    await page.click('#reset'); await page.click('#geo');
    await page.waitForFunction(() => document.querySelector('.dist'));
    const first = label === 'mobile' ? await page.locator('#list-cards h3').first().textContent() : await page.locator('#tbody th').first().textContent();
    assert.match(first, /Modena/);
  });
  await check(`${label}: URL condivisibile`, async () => {
    await page.goto(base + '?q=roma&campo=comune', { waitUntil: 'networkidle' });
    assert.equal(await page.locator(visibleList).count(), 1);
  });
  if (label === 'desktop') await check('desktop: ordinamento colonna', async () => {
    await page.goto(base, { waitUntil: 'networkidle' });
    await page.click('th button[data-sort="comune"]');
    assert.equal(await page.getAttribute('th:has(button[data-sort="comune"])', 'aria-sort'), 'ascending');
    assert.match(await page.locator('#tbody tr').first().textContent(), /Bergamo/);
    await page.click('th button[data-sort="comune"]');
    assert.match(await page.locator('#tbody tr').first().textContent(), /Verona/);
  });
  await check(`${label}: nessun errore JS`, async () => assert.deepEqual(errs, []));
  await page.screenshot({ path: `shots/cras-${label}.png`, fullPage: true });
  await ctx.close();
}
await b.close();
for (const [s, n] of results) console.log(s, n);
process.exit(results.some(([s]) => s === 'FAIL') ? 1 : 0);
