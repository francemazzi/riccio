import { defineConfig, type Plugin } from 'vitest/config';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { footerHtml, headerHtml, pageId } from './src/lib/chrome';

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
          .replace('<footer id="site-footer"></footer>', `<footer id="site-footer" class="site-footer">${footerHtml()}</footer>`);
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
      const files = [...Object.keys(bundle), ...STATIC].sort();
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
  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then((hit) => hit || fetch(req).catch(() =>
      req.mode === 'navigate' ? caches.match('${base}', { ignoreSearch: true }) : Response.error())),
  );
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
      },
    },
  },
  test: { include: ['tests/**/*.test.ts'] },
});
