// Uso: node tests/e2e/shots.mjs <pagina...>  (richiede `vite preview` su :4173)
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';
const pages = process.argv.slice(2).length ? process.argv.slice(2) : ['index.html'];
mkdirSync('shots', { recursive: true });
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' , args:['--no-sandbox']}).catch(() => chromium.launch());
let fail = 0;
for (const [name, w, h] of [['mobile', 360, 740], ['desktop', 1280, 800]]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h } });
  for (const p of pages) {
    const page = await ctx.newPage();
    const errs = [];
    page.on('pageerror', (e) => errs.push(e.message));
    page.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
    await page.goto(`http://localhost:4173/riccio/${p}`, { waitUntil: 'networkidle' });
    const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    await page.screenshot({ path: `shots/${p.replace(/\W/g, '_')}-${name}.png`, fullPage: true });
    console.log(p, name, 'overflow:', over, 'errors:', errs.length);
    if (over > 0 || errs.length) fail++;
    await page.close();
  }
}
await browser.close();
process.exit(fail ? 1 : 0);
