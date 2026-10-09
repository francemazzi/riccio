// Richiede build con CRAS_CSV=tests/fixtures/cras-esempio.csv e `vite preview` su :4173
import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
const base = 'http://localhost:4173/riccio/riccio.html';
const results = [];
const check = async (name, fn) => { try { await fn(); results.push(['ok', name]); } catch (e) { results.push(['FAIL', name + ': ' + e.message]); } };
const pick = async (page, text) => { await page.locator('.opt', { hasText: text }).first().click(); };

for (const [label, vp] of [['mobile', { width: 360, height: 740 }], ['desktop', { width: 1280, height: 800 }]]) {
  const ctx = await b.newContext({ viewport: vp, geolocation: { latitude: 44.65, longitude: 10.92 }, permissions: ['geolocation', 'clipboard-read', 'clipboard-write'] });
  const page = await ctx.newPage();
  const errs = []; page.on('pageerror', (e) => errs.push(e.message));
  await page.goto(base, { waitUntil: 'networkidle' });

  await check(`${label}: avviso revisione visibile`, async () => assert.match(await page.textContent('#review'), /revisione veterinaria/));
  await check(`${label}: nessun overflow`, async () => assert.equal(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), 0));
  await check(`${label}: URL senza stato durante il percorso`, async () => {
    await pick(page, 'Di notte');
    assert.equal(new URL(page.url()).search, '');
  });
  await check(`${label}: indietro e progresso`, async () => {
    assert.match(await page.textContent('#q'), /sfiori/);
    const v = Number(await page.getAttribute('[role=progressbar]', 'aria-valuenow'));
    assert.ok(v > 0);
    await page.click('#back');
    assert.match(await page.textContent('#q'), /Che momento/);
    assert.equal(Number(await page.getAttribute('[role=progressbar]', 'aria-valuenow')), 0);
  });
  await check(`${label}: giorno + barcolla → urgenza`, async () => {
    await pick(page, 'Di giorno'); await pick(page, 'Barcolla');
    assert.match(await page.textContent('.result h2'), /Urgenza/);
    assert.ok(page.url().endsWith('?esito=urgenza'));
  });
  await check(`${label}: centro più vicino da esito (Modena primo)`, async () => {
    await page.click('#find');
    await page.waitForSelector('#nlist li');
    assert.equal(await page.locator('#nlist li').count(), 3);
    assert.match(await page.locator('#nlist h3').first().textContent(), /Modena/);
    assert.ok((await page.locator('#nlist a[href^="tel:"]').count()) >= 1);
  });
  await check(`${label}: condividi copia il link`, async () => {
    await page.click('#share');
    await page.waitForFunction(() => document.getElementById('sharestatus').textContent.length > 0);
    assert.match(await page.textContent('#sharestatus'), /copiato/i);
    assert.match(await page.evaluate(() => navigator.clipboard.readText()), /\?esito=urgenza$/);
  });
  await check(`${label}: notte sana → lascialo (5 domande)`, async () => {
    await page.click('#restart');
    assert.equal(new URL(page.url()).search, '');
    for (const t of ['Di notte', 'Si chiude a palla', 'Niente di tutto questo', 'Normale', 'Da marzo']) await pick(page, t);
    assert.match(await page.textContent('.result h2'), /lascialo stare/i);
    assert.equal(await page.locator('#find').count(), 0);
  });
  await check(`${label}: piccolo → scalda e chiama`, async () => {
    await page.click('#restart');
    for (const t of ['Di notte', 'Si chiude a palla', 'Niente di tutto questo', 'Piccolo']) await pick(page, t);
    assert.match(await page.textContent('.result h2'), /Scaldalo/);
  });
  await check(`${label}: esito condiviso da URL`, async () => {
    await page.goto(base + '?esito=scalda-e-chiama', { waitUntil: 'networkidle' });
    assert.match(await page.textContent('.result'), /esito condiviso/i);
  });
  await check(`${label}: tastiera sulle opzioni`, async () => {
    await page.goto(base, { waitUntil: 'networkidle' });
    await page.focus('.opt'); await page.keyboard.press('Enter');
    assert.match(await page.textContent('#q'), /sfiori/);
  });
  await check(`${label}: due pulsanti portano a due pagine distinte`, async () => {
    await page.goto(base, { waitUntil: 'networkidle' });
    // pagina del triage: solo il wizard, niente guida
    assert.equal(await page.locator('#segni-body').count(), 0); assert.ok((await page.locator('.opt').count()) >= 2);
    const nav = page.locator('#triage-nav a'); assert.equal(await nav.count(), 2);
    assert.equal(await page.getAttribute('#triage-nav a.is-current', 'aria-current'), 'page');
    for (const i of [0, 1]) assert.ok((await nav.nth(i).boundingBox()).height >= 56, 'pulsante alto almeno 56px');
    assert.equal(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight * 3), true, 'la pagina non è lunghissima');
    // → guida
    await page.click('#triage-nav a:not(.is-current)'); await page.waitForURL(/segni\.html$/);
    assert.match(await page.title(), /Guida ai segni/); assert.equal(await page.locator('.opt').count(), 0); assert.ok((await page.locator('#segni-body tr').count()) >= 10);
    assert.match(await page.textContent('#triage-nav a.is-current'), /Guida ai segni/); assert.match(await page.textContent('#review'), /revisione veterinaria/);
    assert.match(await page.getAttribute('.nav a[aria-current="page"]', 'href'), /riccio\.html$/); // l'header resta su "Triage"
    // → torna al triage
    await page.click('#triage-nav a:not(.is-current)'); await page.waitForURL(/riccio\.html$/);
    assert.ok((await page.locator('.opt').count()) >= 2); assert.equal(await page.locator('#segni-body').count(), 0);
    // il tasto Indietro del browser
    await page.goBack(); await page.waitForURL(/segni\.html$/); assert.ok((await page.locator('#segni-body tr').count()) >= 10);
  });
  await check(`${label}: il vecchio link riccio.html#segni porta alla guida`, async () => {
    await page.goto(base + '#segni', { waitUntil: 'networkidle' }); await page.waitForURL(/segni\.html/);
    assert.ok((await page.locator('#segni-body tr').count()) >= 10);
  });
  await check(`${label}: dall'esito c'è il link alla guida`, async () => {
    await page.goto(base + '?esito=urgenza', { waitUntil: 'networkidle' });
    await page.click('.result a[href$="segni.html"]'); await page.waitForURL(/segni\.html$/);
  });
  await check(`${label}: guida segni filtrabile`, async () => {
    await page.goto(base.replace('riccio.html', 'segni.html'), { waitUntil: 'networkidle' });
    const total = await page.locator('#segni-body tr').count(); assert.ok(total >= 10);
    await page.fill('#segni-q', 'zecche');
    assert.ok((await page.locator('#segni-body tr').count()) < total);
    await page.fill('#segni-q', '');
    await page.click('.chip[data-liv="urgenza"]');
    const levels = await page.locator('#segni-body .badge').allTextContents();
    assert.ok(levels.length > 0 && levels.every((t) => /Urgenza/.test(t)));
    await page.selectOption('#segni-cat', 'Respiro');
    assert.equal(await page.locator('#segni-body tr').count(), 1);
    await page.fill('#segni-q', 'qwerty');
    assert.match(await page.textContent('#segni-body'), /Nessun segno/);
  });
  await check(`${label}: nessun errore JS`, async () => assert.deepEqual(errs, []));
  await page.goto(base + '?esito=urgenza', { waitUntil: 'networkidle' });
  await page.screenshot({ path: `shots/riccio-esito-${label}.png`, fullPage: true });
  await page.goto(base, { waitUntil: 'networkidle' });
  await page.screenshot({ path: `shots/riccio-${label}.png`, fullPage: true });
  await ctx.close();
}
await b.close();
for (const [s, n] of results) console.log(s, n);
process.exit(results.some(([s]) => s === 'FAIL') ? 1 : 0);
