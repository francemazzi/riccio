// Nessun overflow orizzontale a più larghezze su tutte le pagine (richiede `vite preview` su :4173)
import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
const base = 'http://localhost:4173/riccio/';
const pagine = ['', 'cras.html', 'riccio.html', 'riccio.html?esito=urgenza', 'riccio.html?esito=scalda-e-chiama', 'segni.html'];
let fails = 0, tot = 0;
for (const w of [320, 360, 375, 414, 600, 768, 1024, 1280]) {
  const p = await (await b.newContext({ viewport: { width: w, height: 800 } })).newPage();
  for (const u of pagine) {
    tot++;
    try {
      await p.goto(base + u, { waitUntil: 'networkidle' });
      if (u === 'segni.html') { await p.click('.chip[data-liv="urgenza"]'); await p.fill('#segni-q', 'zecche'); }
      assert.equal(await p.evaluate(() => document.documentElement.scrollWidth - innerWidth), 0);
    } catch (e) { fails++; console.log('FAIL', `${w}px /${u}`, e.message.split('\n')[0]); }
  }
}
await b.close(); console.log(`${tot - fails}/${tot} ok (overflow, ${pagine.length} pagine x 8 larghezze)`); process.exit(fails ? 1 : 0);
