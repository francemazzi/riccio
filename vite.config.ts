import { defineConfig, type Plugin } from 'vitest/config';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { footerHtml, headerHtml, pageId, triageNavHtml, triagePage } from './src/lib/chrome';

const PAGES = ['index.html', 'cras.html', 'riccio.html', 'segni.html'];
const STATIC = ['favicon.svg', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'og.svg'];

/** Inserisce header e footer nell'HTML in fase di build/dev (niente layout shift, funziona senza JS). */
function chrome(base: string): Plugin {
  return {
    name: 'riccio-chrome',
    transformIndexHtml: {
      order: 'pre',
      handler(html, ctx) {
        const page = pageId(ctx.path);
        return html
          .replace('<header id="site-header"></header>', `<header id="site-header" class="site-header">${headerHtml(base, page)}</header>`)
          .replace('<footer id="site-footer"></footer>', `<footer id="site-footer" class="site-footer">${footerHtml()}</footer>`)
          .replace('<nav id="triage-nav"></nav>', `<nav id="triage-nav" class="triage-nav" aria-label="Sezioni del triage">${triageNavHtml(base, triagePage(ctx.path))}</nav>`);
      },
    },
  };
}

/** Genera dist/sw.js con la lista dei file della build da mettere in cache (funziona offline dopo la prima visita). */
function precacheSw(base: string): Plugin {
  return {
    name: 'riccio-sw',
    apply: 'build',
    generateBundle(_, bundle) {
      const files = [...new Set([...Object.keys(bundle), ...PAGES, ...STATIC])].sort(); // le pagine HTML non sono sempre nel bundle a questo punto
      const urls = ['', ...files].map((f) => base + f);
      const version = createHash('sha1').update(files.join('|')).digest('hex').slice(0, 10);
      this.emitFile({
        type: 'asset',
        fileName: 'sw.js',
        source: `const CACHE = 'riccio-${version}';
const URLS = ${JSON.stringify(urls)};
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(URLS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  const u = new URL(req.url);
  const chiave = req.mode === 'navigate' ? u.origin + u.pathname : req; // le pagine con ?q=… condividono una sola copia
  const salva = (res) => { if (res && res.ok) { const copia = res.clone(); caches.open(CACHE).then((c) => c.put(chiave, copia)).catch(() => {}); } return res; };
  if (req.mode === 'navigate') {
    // pagine: prima la rete (così un aggiornamento arriva subito), la cache solo se offline o lenta
    e.respondWith(
      new Promise((resolve, reject) => {
        const t = setTimeout(reject, 4000);
        fetch(req).then((r) => { clearTimeout(t); resolve(salva(r)); }, (err) => { clearTimeout(t); reject(err); });
      }).catch(() => caches.match(req, { ignoreSearch: true }).then((hit) => hit || caches.match('${base}')).then((hit) => hit || Response.error())),
    );
    return;
  }
  // file con l'hash nel nome e asset statici: prima la cache
  e.respondWith(caches.match(req, { ignoreSearch: true }).then((hit) => hit || fetch(req).then(salva).catch(() => Response.error())));
});
`,
      });
    },
  };
}

export default defineConfig({
  base: '/riccio/',
  plugins: [chrome('/riccio/'), precacheSw('/riccio/')],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        cras: resolve(__dirname, 'cras.html'),
        riccio: resolve(__dirname, 'riccio.html'),
        segni: resolve(__dirname, 'segni.html'),
      },
    },
  },
  test: { include: ['tests/**/*.test.ts'] },
});
