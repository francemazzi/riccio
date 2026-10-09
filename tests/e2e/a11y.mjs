// Audit axe-core (WCAG 2.x A/AA) su tutte le pagine, tema chiaro e scuro, mobile e desktop, anche con risultati visibili.
import { chromium } from 'playwright-core';
import { readFileSync } from 'node:fs';
const axe = readFileSync('node_modules/axe-core/axe.min.js', 'utf8');
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
const base = 'http://localhost:4173/riccio/';
const urls = ['', 'cras.html', 'cras.html?q=modena', 'riccio.html', 'segni.html', 'riccio.html?esito=urgenza', 'riccio.html?esito=scalda-e-chiama', 'riccio.html?esito=lascialo'];
let bad = 0;
for (const scheme of ['light', 'dark']) for (const vp of [{ width: 360, height: 740 }, { width: 1280, height: 800 }]) {
  const ctx = await b.newContext({ colorScheme: scheme, viewport: vp });
  for (const u of urls) {
    const p = await ctx.newPage();
    await p.goto(base + u, { waitUntil: 'networkidle' });
    await p.addScriptTag({ content: axe });
    const r = await p.evaluate(() => axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'] } }));
    for (const v of r.violations) {
      bad++;
      console.log(`✖ [${scheme} ${vp.width}] /${u} ${v.id} (${v.impact}): ${v.help}`);
      v.nodes.slice(0, 3).forEach((n) => console.log('    ', n.target.join(' '), '—', (n.any[0]?.message ?? n.failureSummary ?? '').split('\n')[0]));
    }
    await p.close();
  }
  await ctx.close();
}
await b.close();
console.log(bad ? `${bad} violazioni` : '✔ nessuna violazione axe');
process.exit(bad ? 1 : 0);
