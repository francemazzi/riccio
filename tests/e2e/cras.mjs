// Richiede build con CRAS_CSV=tests/fixtures/cras-esempio.csv e `vite preview` su :4173
import { chromium } from 'playwright-core';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const axe = readFileSync('node_modules/axe-core/axe.min.js', 'utf8');
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
const base = 'http://localhost:4173/riccio/cras.html';
const results = [];
const check = async (name, fn) => { try { await fn(); results.push(['ok', name]); } catch (e) { results.push(['FAIL', name + ': ' + e.message.split('\n')[0]]); } };
const overflow = (page) => page.evaluate(() => document.documentElement.scrollWidth - innerWidth);

// 1) nessun overflow a tutte le larghezze, negli stati principali
for (const w of [320, 360, 375, 414, 600, 768, 1024, 1280]) {
  const ctx = await b.newContext({ viewport: { width: w, height: 800 }, geolocation: { latitude: 44.65, longitude: 10.92 }, permissions: ['geolocation'] });
  const page = await ctx.newPage();
  await page.goto(base, { waitUntil: 'networkidle' });
  await check(`${w}px: nessun overflow (iniziale)`, async () => assert.equal(await overflow(page), 0));
  await check(`${w}px: nessun overflow (ricerca, geo, filtri aperti, drawer)`, async () => {
    await page.fill('#f-q', 'modenna'); await page.waitForSelector('.place-note');
    assert.equal(await overflow(page), 0);
    await page.click('#geo'); await page.waitForSelector('.dist', { state: 'attached' });
    await page.click('#more summary'); assert.equal(await overflow(page), 0);
    await page.locator('.open-map:visible').first().click(); await page.waitForSelector('.drawer.is-open, .drawer-root.is-open');
    assert.equal(await overflow(page), 0);
  });
  await ctx.close();
}

for (const [label, vp] of [['mobile', { width: 375, height: 740 }], ['desktop', { width: 1280, height: 800 }]]) {
  const ctx = await b.newContext({ viewport: vp, geolocation: { latitude: 44.65, longitude: 10.92 }, permissions: ['geolocation'] });
  const page = await ctx.newPage();
  const errs = []; page.on('pageerror', (e) => errs.push(e.message));
  const rows = label === 'mobile' ? '#list-cards > li' : '#tbody > tr';
  const primo = () => page.locator(label === 'mobile' ? '#list-cards li h3' : '#tbody tr th').first().textContent();
  await page.goto(base, { waitUntil: 'networkidle' });

  await check(`${label}: una casella grande e visibile, filtri avanzati chiusi`, async () => {
    const box = await page.locator('#f-q').boundingBox(); assert.ok(box.height >= 52); assert.ok(box.width >= vp.width * 0.6);
    assert.equal(await page.locator('#more').getAttribute('open'), null);
  });
  await check(`${label}: tutti i centri all'inizio`, async () => { assert.equal(await page.locator(rows).count(), 10); assert.match(await page.textContent('#count'), /10 centri/); });
  await check(`${label}: "modena" → posizione Modena, centri per vicinanza con km`, async () => {
    await page.fill('#f-q', 'modena'); await page.waitForSelector('.place-note');
    assert.match(await page.textContent('.place-note'), /Modena \(MO\)/);
    assert.match(await primo(), /Modena/);
    assert.equal(await page.locator(rows).count(), 10);
    assert.ok((await page.locator('.dist').count()) >= 10);
  });
  for (const q of ['modenna', 'MODENA!', 'modna', 'bolgna']) await check(`${label}: errore di battitura "${q}" trova il posto`, async () => {
    await page.fill('#f-q', q); await page.waitForSelector('.place-note');
    assert.ok((await page.locator(rows).count()) >= 10);
    assert.match(await page.textContent('#place-note'), /Modena|Bologna/);
  });
  await check(`${label}: nome vicino ma non esatto chiede conferma`, async () => {
    await page.fill('#f-q', 'modenna'); await page.waitForSelector('.notice');
    assert.match(await page.textContent('.notice'), /intendevi/);
  });
  await check(`${label}: numero di telefono (con spazi e +39)`, async () => {
    await page.fill('#f-q', '+39 000000001');
    await page.waitForFunction(() => /^1 centro/.test(document.getElementById('count').textContent));
    assert.equal(await page.locator(rows).count(), 1); assert.match(await primo(), /Modena/);
    await page.fill('#f-q', '000 000 002'); await page.waitForFunction(() => /^1 centro/.test(document.getElementById('count').textContent) && /Bologna/.test(document.querySelector('#tbody th, #list-cards h3')?.textContent ?? '')); assert.match(await primo(), /Bologna/);
  });
  await check(`${label}: testo senza senso → mai vuoto, con suggerimento`, async () => {
    await page.fill('#f-q', 'xqzvwk');
    await page.waitForFunction(() => /Non trovo/.test(document.querySelector('.notice')?.textContent ?? ''));
    assert.equal(await page.locator(rows).count(), 10);
    assert.match(await page.textContent('.notice'), /Vicino a me|comune/);
    assert.equal(await page.locator('#empty .empty').count(), 0);
  });
  await check(`${label}: "24 ore" mette prima gli H24`, async () => {
    await page.fill('#f-q', '24 ore'); await page.waitForTimeout(250);
    assert.match(await primo(), /Bologna/);
  });
  await check(`${label}: cancella il luogo`, async () => {
    await page.fill('#f-q', 'torino'); await page.waitForSelector('#clear-place'); await page.click('#clear-place');
    assert.equal(await page.inputValue('#f-q'), ''); assert.equal(await page.locator('.place-note').count(), 0);
  });
  await check(`${label}: filtri avanzati (regione/provincia) dentro "Altri filtri"`, async () => {
    await page.click('#more summary'); await page.selectOption('#f-regione', 'Lombardia');
    assert.equal(await page.locator(rows).count(), 2);
    assert.deepEqual(await page.locator('#f-provincia option').allTextContents(), ['Tutte le province', 'BG', 'MI']);
    await page.selectOption('#f-provincia', 'BG'); assert.equal(await page.locator(rows).count(), 1);
    await page.click('#reset'); assert.equal(await page.locator(rows).count(), 10);
  });
  await check(`${label}: filtri senza risultati → stato vuoto con pulsante`, async () => {
    await page.click('#more summary').catch(() => {});
    if (!(await page.locator('#f-h24').isVisible())) await page.click('#more summary');
    await page.check('#f-h24'); await page.check('#f-verificati');
    assert.equal(await page.locator(rows).count(), 0); assert.match(await page.textContent('#empty'), /1515/);
    await page.click('#reset-empty'); assert.equal(await page.locator(rows).count(), 10);
  });
  await check(`${label}: URL condivisibile (?q=)`, async () => {
    await page.goto(base + '?q=roma', { waitUntil: 'networkidle' }); await page.waitForSelector('.place-note');
    assert.equal(await page.inputValue('#f-q'), 'roma'); assert.match(await primo(), /Roma/);
  });
  await check(`${label}: geolocalizzazione ordina per distanza`, async () => {
    await page.goto(base, { waitUntil: 'networkidle' }); await page.click('#geo'); await page.waitForSelector('.dist', { state: 'attached' });
    assert.match(await primo(), /Modena/);
  });

  // --- pannello mappa
  await page.goto(base, { waitUntil: 'networkidle' });
  const apri = async () => {
    if (await page.locator('.drawer-root').count()) { await page.keyboard.press('Escape'); await page.waitForSelector('.drawer-root', { state: 'detached' }); }
    await page.locator('.open-map:visible').first().click(); await page.waitForSelector('.drawer-root.is-open'); await page.waitForTimeout(350); // fine animazione
  };
  await check(`${label}: "Vedi sulla mappa" apre il pannello nella stessa pagina`, async () => {
    const url = page.url(); await apri();
    assert.equal(page.url().split('#')[0], url.split('#')[0]);
    const d = page.locator('.drawer'); assert.equal(await d.getAttribute('role'), 'dialog'); assert.equal(await d.getAttribute('aria-modal'), 'true');
    assert.match(await page.getAttribute('.drawer iframe', 'src'), /openstreetmap\.org\/export\/embed\.html\?bbox=.*&marker=/);
    assert.ok(await page.locator('.drawer-close').isVisible());
    assert.ok((await page.locator('.drawer a[href^="tel:"]').count()) >= 1);
  });
  await check(`${label}: posizione del pannello (${label === 'mobile' ? 'dal basso' : 'da destra'})`, async () => {
    const r = await page.locator('.drawer').boundingBox();
    if (label === 'mobile') { assert.ok(Math.abs(r.y + r.height - vp.height) < 2, 'ancorato in basso'); assert.ok(r.width >= vp.width - 1); assert.ok(r.height <= vp.height * 0.9); }
    else { assert.ok(Math.abs(r.x + r.width - vp.width) < 2, 'ancorato a destra'); assert.ok(r.width <= 490); assert.ok(r.height >= vp.height - 2); }
  });
  await check(`${label}: la pagina sotto non scorre`, async () => assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement).overflow), 'hidden'));
  await check(`${label}: chiude con la X e rimette il focus sul pulsante`, async () => {
    await page.click('.drawer-close'); await page.waitForSelector('.drawer-root', { state: 'detached' });
    assert.equal(await page.evaluate(() => document.activeElement?.classList.contains('open-map')), true);
    assert.notEqual(await page.evaluate(() => getComputedStyle(document.documentElement).overflow), 'hidden');
  });
  await check(`${label}: chiude con Esc`, async () => { await apri(); await page.keyboard.press('Escape'); await page.waitForSelector('.drawer-root', { state: 'detached' }); });
  await check(`${label}: chiude cliccando lo sfondo`, async () => {
    await apri();
    if (label === 'mobile') await page.mouse.click(vp.width / 2, 20); else await page.mouse.click(20, 200);
    await page.waitForSelector('.drawer-root', { state: 'detached' });
  });
  await check(`${label}: il tasto Indietro chiude il pannello senza uscire dalla pagina`, async () => {
    await apri(); await page.goBack(); await page.waitForSelector('.drawer-root', { state: 'detached' });
    assert.match(page.url(), /cras\.html/);
  });
  await check(`${label}: il focus resta dentro il pannello (Tab)`, async () => {
    await apri();
    for (let i = 0; i < 12; i++) { await page.keyboard.press('Tab'); assert.equal(await page.evaluate(() => !!document.activeElement?.closest('.drawer')), true, `Tab ${i}`); }
    await page.keyboard.press('Escape'); await page.waitForSelector('.drawer-root', { state: 'detached' });
  });
  await check(`${label}: accessibilità con il pannello aperto (axe)`, async () => {
    await apri(); await page.addScriptTag({ content: axe });
    const r = await page.evaluate(() => axe.run(document.querySelector('.drawer'), { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'best-practice'] } }));
    assert.deepEqual(r.violations.map((v) => `${v.id}: ${v.nodes[0].target.join(' ')}`), []);
    await page.keyboard.press('Escape');
  });
  await check(`${label}: offline il pannello mostra l'alternativa alla mappa`, async () => {
    await ctx.setOffline(true); await page.evaluate(() => window.dispatchEvent(new Event('offline')));
    await apri(); assert.equal(await page.locator('.map-offline').isVisible(), true);
    await page.keyboard.press('Escape'); await ctx.setOffline(false);
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
  await page.goto(base, { waitUntil: 'networkidle' }); await page.fill('#f-q', 'modenna'); await page.waitForSelector('.place-note');
  await page.screenshot({ path: `shots/cras-${label}.png`, fullPage: false });
  await apri(); await page.waitForTimeout(400); await page.screenshot({ path: `shots/drawer-${label}.png`, fullPage: false });
  await ctx.close();
}
await b.close();
for (const [s, n] of results) console.log(s, n);
console.log(`${results.filter(([s]) => s === 'ok').length}/${results.length} ok`);
process.exit(results.some(([s]) => s === 'FAIL') ? 1 : 0);
