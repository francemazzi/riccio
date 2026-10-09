// Verifica l'app con il dataset REALE (build senza CRAS_CSV) e `vite preview` su :4173
import { chromium } from 'playwright-core';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const data = JSON.parse(readFileSync('src/generated/cras.json', 'utf8'));
const axe = readFileSync('node_modules/axe-core/axe.min.js', 'utf8');
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
const base = 'http://localhost:4173/riccio/cras.html';
let fails = 0, tot = 0;
const t = async (n, f) => { tot++; try { await f(); console.log('ok', n); } catch (e) { fails++; console.log('FAIL', n, e.message.split('\n')[0]); } };
const overflow = (p) => p.evaluate(() => document.documentElement.scrollWidth - innerWidth);

for (const w of [320, 360, 375, 414, 768, 1280]) {
  const ctx = await b.newContext({ viewport: { width: w, height: 800 }, geolocation: { latitude: 44.65, longitude: 10.92 }, permissions: ['geolocation'] });
  const page = await ctx.newPage(); await page.goto(base, { waitUntil: 'networkidle' });
  await t(`${w}px: nessun overflow con ${data.length} centri (iniziale, ricerca, geo, drawer)`, async () => {
    assert.equal(await overflow(page), 0);
    await page.fill('#f-q', 'guastalla'); await page.waitForSelector('.place-note'); assert.equal(await overflow(page), 0);
    await page.click('#geo'); await page.waitForSelector('.dist', { state: 'attached' }); assert.equal(await overflow(page), 0);
    await page.locator('.open-map:visible').first().click(); await page.waitForSelector('.drawer-root.is-open'); assert.equal(await overflow(page), 0);
  });
  await ctx.close();
}

for (const [label, vp] of [['mobile', { width: 375, height: 740 }], ['desktop', { width: 1280, height: 800 }]]) {
  const ctx = await b.newContext({ viewport: vp, geolocation: { latitude: 44.65, longitude: 10.92 }, permissions: ['geolocation'] });
  const page = await ctx.newPage(); const errs = []; page.on('pageerror', (e) => errs.push(e.message));
  const rows = label === 'mobile' ? '#list-cards > li' : '#tbody > tr';
  const km = () => page.locator('.dist').allTextContents();
  const attendi = (q) => page.waitForFunction((x) => document.getElementById('f-q').value === x && !!document.getElementById('count').textContent, q);
  await page.goto(base, { waitUntil: 'networkidle' });

  await t(`${label}: tutti i ${data.length} centri`, async () => assert.equal(await page.locator(rows).count(), data.length));
  for (const q of ['guastalla', 'Guastalla', 'guastala', 'gastalla']) await t(`${label}: "${q}" → centri vicini a Guastalla`, async () => {
    await page.fill('#f-q', q); await page.waitForSelector('.place-note'); await page.waitForTimeout(200);
    assert.match(await page.textContent('.place-note'), /Guastalla \(RE\)/);
    assert.equal(await page.locator(rows).count(), data.length);
    const k = (await km()).map((s) => parseFloat(s.replace(',', '.')));
    assert.ok(k.length >= data.length); assert.ok(k[0] < 80, `primo a ${k[0]} km`);
  });
  await t(`${label}: "pomponescoe" (errore) → Pomponesco, centri vicini, chiede conferma`, async () => {
    await page.fill('#f-q', 'pomponescoe'); await page.waitForSelector('.notice'); await page.waitForTimeout(200);
    assert.match(await page.textContent('.place-note'), /Pomponesco \(MN\)/);
    assert.match(await page.textContent('.notice'), /intendevi/);
    assert.equal(await page.locator(rows).count(), data.length);
  });
  await t(`${label}: nome di un comune con più omonimi propone alternative`, async () => {
    await page.fill('#f-q', 'san giorgio'); await page.waitForSelector('.place-alt');
    assert.ok((await page.locator('[data-alt]').count()) >= 1);
    const prima = await page.textContent('.place-note'); await page.locator('[data-alt]').first().click();
    assert.notEqual(await page.textContent('.place-note'), prima);
  });
  await t(`${label}: numero di telefono → il centro`, async () => {
    const c = data.find((x) => /pettirosso/i.test(x.nome)); const num = c.telefoni[0].replace('+39', '');
    for (const q of [num, `+39 ${num}`, `${num.slice(0, 3)} ${num.slice(3, 6)} ${num.slice(6)}`]) {
      await page.fill('#f-q', q); await page.waitForFunction(() => /^\d+ centr/.test(document.getElementById('count').textContent) && document.querySelectorAll('.place-note').length === 0);
      await page.waitForTimeout(200);
      assert.ok((await page.locator(rows).count()) >= 1 && (await page.locator(rows).count()) < 5);
      assert.ok((await page.locator(`${rows} a[href="tel:${c.telefoni[0]}"]`).count()) >= 1);
    }
  });
  await t(`${label}: nome del centro anche storpiato`, async () => {
    for (const q of ['pettirosso', 'petirosso']) { await page.fill('#f-q', q); await page.waitForTimeout(250); assert.match(await page.locator(label === 'mobile' ? '#list-cards li h3' : '#tbody tr th').first().textContent(), /Pettirosso/i); }
  });
  await t(`${label}: testo senza senso → mai zero risultati`, async () => {
    await page.fill('#f-q', 'xqzvwk'); await page.waitForFunction(() => /Non trovo/.test(document.querySelector('.notice')?.textContent ?? ''));
    assert.equal(await page.locator(rows).count(), data.length); assert.equal(await page.locator('#empty .empty').count(), 0);
  });
  await t(`${label}: "24 ore" e "riccio" mettono avanti ciò che serve`, async () => {
    await page.fill('#f-q', '24 ore'); await page.waitForTimeout(250);
    assert.equal(await page.locator(rows).count(), data.length);
    const h24 = data.filter((c) => c.h24 === 'si').map((c) => c.nome);
    const primi = (await page.locator(label === 'mobile' ? '#list-cards li h3' : '#tbody tr th').allTextContents()).slice(0, h24.length).map((s) => s.trim().split('\n')[0]);
    assert.ok(primi.every((n) => h24.some((h) => n.startsWith(h.slice(0, 20)))), 'prima gli H24');
  });
  await t(`${label}: filtri avanzati in "Altri filtri" (H24 = ${data.filter((c) => c.h24 === 'si').length})`, async () => {
    await page.fill('#f-q', ''); if (!(await page.locator('#more[open]').count())) await page.click('#more summary'); await page.check('#f-h24');
    assert.equal(await page.locator(rows).count(), data.filter((c) => c.h24 === 'si').length);
    await page.click('#reset');
    await page.check('#f-ufficiali'); assert.equal(await page.locator(rows).count(), data.filter((c) => c.fonte_tipo === 'primaria').length);
    await page.click('#reset');
  });
  await t(`${label}: "Vicino a me" da Modena → primo in Emilia-Romagna`, async () => {
    await page.click('#geo'); await page.waitForSelector('.dist', { state: 'attached' });
    assert.match(await page.locator(label === 'mobile' ? '#list-cards li .where' : '#tbody tr td:nth-child(4)').first().textContent(), /Emilia/);
  });
  await t(`${label}: "Vedi sulla mappa" apre il pannello, si chiude con X / Esc`, async () => {
    await page.locator('.open-map:visible').first().click(); await page.waitForSelector('.drawer-root.is-open'); await page.waitForTimeout(350);
    assert.match(await page.getAttribute('.drawer iframe', 'src'), /openstreetmap\.org\/export\/embed\.html/);
    const r = await page.locator('.drawer').boundingBox();
    if (label === 'mobile') assert.ok(Math.abs(r.y + r.height - vp.height) < 2); else assert.ok(Math.abs(r.x + r.width - vp.width) < 2);
    await page.click('.drawer-close'); await page.waitForSelector('.drawer-root', { state: 'detached' });
    await page.locator('.open-map:visible').first().click(); await page.waitForSelector('.drawer-root.is-open'); await page.keyboard.press('Escape'); await page.waitForSelector('.drawer-root', { state: 'detached' });
  });
  await t(`${label}: axe senza violazioni (pagina e pannello)`, async () => {
    await page.goto(base, { waitUntil: 'networkidle' }); await page.addScriptTag({ content: axe });
    const run = (ctx) => page.evaluate((c) => axe.run(c ? document.querySelector(c) : document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'best-practice'] } }), ctx);
    assert.deepEqual((await run()).violations.map((v) => `${v.id}: ${v.nodes[0].target.join(' ')}`), []);
    await page.locator('.open-map:visible').first().click(); await page.waitForSelector('.drawer-root.is-open'); await page.waitForTimeout(350);
    assert.deepEqual((await run('.drawer')).violations.map((v) => `${v.id}: ${v.nodes[0].target.join(' ')}`), []);
    await page.keyboard.press('Escape');
  });
  await t(`${label}: nessun errore JS`, async () => assert.deepEqual(errs, []));
  await ctx.close();
}
// triage con dati reali
const ctx = await b.newContext({ viewport: { width: 360, height: 740 }, geolocation: { latitude: 45.46, longitude: 9.19 }, permissions: ['geolocation'] });
const p = await ctx.newPage(); await p.goto('http://localhost:4173/riccio/riccio.html?esito=urgenza', { waitUntil: 'networkidle' });
await t('triage: tre centri più vicini a Milano, con "Vedi sulla mappa"', async () => {
  await p.click('#find'); await p.waitForSelector('#nlist li');
  assert.equal(await p.locator('#nlist li').count(), 3); assert.ok((await p.locator('#nlist a[href^="tel:"]').count()) >= 3);
  assert.doesNotMatch(await p.textContent('#nlist'), /Non accetta ricci/);
  await p.locator('#nlist .open-map').first().click(); await p.waitForSelector('.drawer-root.is-open');
  assert.match(await p.textContent('.drawer'), /da te/); await p.keyboard.press('Escape'); await p.waitForSelector('.drawer-root', { state: 'detached' });
});
await b.close();
console.log(`${tot - fails}/${tot} ok`);
process.exit(fails ? 1 : 0);
