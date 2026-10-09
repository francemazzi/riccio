// Verifica l'app con il dataset REALE (build senza CRAS_CSV) e `vite preview` su :4173
import { chromium } from 'playwright-core';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const data = JSON.parse(readFileSync('src/generated/cras.json', 'utf8'));
const axe = readFileSync('node_modules/axe-core/axe.min.js', 'utf8');
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
const base = 'http://localhost:4173/riccio/cras.html';
let fails = 0;
const t = async (n, f) => { try { await f(); console.log('ok', n); } catch (e) { fails++; console.log('FAIL', n, e.message.split('\n')[0]); } };
for (const [label, vp] of [['mobile', { width: 360, height: 740 }], ['desktop', { width: 1280, height: 800 }]]) {
  const ctx = await b.newContext({ viewport: vp, geolocation: { latitude: 44.65, longitude: 10.92 }, permissions: ['geolocation'] });
  const page = await ctx.newPage();
  const rows = label === 'mobile' ? '#list-cards > li' : '#tbody > tr';
  await page.goto(base, { waitUntil: 'networkidle' });
  await t(`${label}: tutti i ${data.length} centri`, async () => { assert.equal(await page.locator(rows).count(), data.length); assert.match(await page.textContent('#count'), new RegExp(`${data.length} centri su ${data.length}`)); });
  await t(`${label}: ricerca "modena" trova Il Pettirosso col suo numero`, async () => {
    await page.fill('#f-q', 'modena');
    const c = data.find((x) => /pettirosso/i.test(x.nome));
    assert.ok(c); assert.ok(await page.locator(`${rows} a[href="tel:${c.telefoni[0]}"]`).count() >= 1);
  });
  await t(`${label}: filtro H24 = ${data.filter((c) => c.h24 === 'si').length}`, async () => {
    await page.click('#reset'); await page.check('#f-h24');
    assert.equal(await page.locator(rows).count(), data.filter((c) => c.h24 === 'si').length);
  });
  await t(`${label}: solo fonti ufficiali = ${data.filter((c) => c.fonte_tipo === 'primaria').length}`, async () => {
    await page.click('#reset'); await page.check('#f-ufficiali');
    assert.equal(await page.locator(rows).count(), data.filter((c) => c.fonte_tipo === 'primaria').length);
  });
  await t(`${label}: da Modena il primo centro è in Emilia-Romagna`, async () => {
    await page.click('#reset'); await page.click('#geo'); await page.waitForSelector('.dist', { state: 'attached' });
    const first = await page.locator(label === 'mobile' ? '#list-cards li .where' : '#tbody tr td:nth-child(4)').first().textContent();
    assert.match(first, /Emilia/);
  });
  await t(`${label}: ricerca per regione e provincia`, async () => {
    await page.click('#reset'); await page.selectOption('#f-regione', 'Lombardia');
    assert.equal(await page.locator(rows).count(), data.filter((c) => c.regione === 'Lombardia').length);
  });
  await t(`${label}: nessun overflow orizzontale`, async () => assert.equal(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), 0));
  await t(`${label}: axe senza violazioni con 84 record`, async () => {
    await page.click('#reset'); await page.addScriptTag({ content: axe });
    const r = await page.evaluate(() => axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'best-practice'] } }));
    assert.deepEqual(r.violations.map((v) => `${v.id}: ${v.nodes[0].target.join(' ')}`), []);
  });
  await page.goto(base, { waitUntil: 'networkidle' });
  await page.screenshot({ path: `shots/real-${label}.png`, fullPage: false });
  await ctx.close();
}
// il triage con dati reali: centro più vicino
const ctx = await b.newContext({ viewport: { width: 360, height: 740 }, geolocation: { latitude: 45.46, longitude: 9.19 }, permissions: ['geolocation'] });
const p = await ctx.newPage(); await p.goto('http://localhost:4173/riccio/riccio.html?esito=urgenza', { waitUntil: 'networkidle' });
await t('triage: tre centri più vicini a Milano, senza chi non accetta ricci', async () => {
  await p.click('#find'); await p.waitForSelector('#nlist li');
  assert.equal(await p.locator('#nlist li').count(), 3);
  assert.ok((await p.locator('#nlist a[href^="tel:"]').count()) >= 3);
  assert.doesNotMatch(await p.textContent('#nlist'), /Non accetta ricci/);
});
await b.close();
process.exit(fails ? 1 : 0);
