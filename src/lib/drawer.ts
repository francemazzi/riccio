import type { Cras } from './cras';
import { icons } from './icons';
import { formatKm, haversine, type Point } from './geo';
import { esc, fmtTel } from './cras-view';

/** Pannello con la posizione del centro: dal basso su mobile, da destra su desktop. */
let aperto: { el: HTMLElement; trigger: HTMLElement | null; usaHistory: boolean } | null = null;

/** la pagina sotto non deve essere raggiungibile da tastiera né da screen reader mentre il pannello è aperto */
function sfondoInerte(attivo: boolean, escludi?: HTMLElement): void {
  for (const f of Array.from(document.body.children)) {
    if (f === escludi || f.tagName === 'SCRIPT') continue;
    if (attivo) f.setAttribute('inert', ''); else f.removeAttribute('inert');
  }
}

const FOCUSABLE = 'a[href], button:not([disabled]), iframe, [tabindex]:not([tabindex="-1"])';

export function mapEmbedUrl(c: { lat: number; lon: number; precisione_coord: string }): string {
  const d = c.precisione_coord === 'indirizzo' ? 0.006 : 0.05; // se la posizione è solo il comune, mostro un'area più ampia
  const bbox = [c.lon - d, c.lat - d * 0.75, c.lon + d, c.lat + d * 0.75].map((n) => n.toFixed(5)).join(',');
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${c.lat},${c.lon}`;
}

export const osmUrl = (c: { lat: number; lon: number }) => `https://www.openstreetmap.org/?mlat=${c.lat}&mlon=${c.lon}#map=15/${c.lat}/${c.lon}`;
export const directionsUrl = (c: { lat: number; lon: number }) => `https://www.google.com/maps/dir/?api=1&destination=${c.lat},${c.lon}`;

function contenuto(c: Cras, da?: { punto: Point; etichetta: string }): string {
  const km = da ? `<p class="meta dist-line">${icons.pin()} a <strong>${formatKm(haversine(da.punto, c))}</strong> ${esc(da.etichetta)}</p>` : '';
  const approx = c.precisione_coord === 'comune'
    ? `<p class="meta">La posizione è approssimata al centro del comune: chiama per l'indirizzo preciso.</p>` : '';
  const tel = c.telefoni.map((t) => `<a class="btn" href="tel:${esc(t)}">${icons.phone()} ${esc(fmtTel(t))}</a>`).join('');
  return `
    <div class="drawer-handle" aria-hidden="true"></div>
    <header class="drawer-head">
      <div><h2 id="drawer-title">${esc(c.nome)}</h2>
      <p class="meta">${esc(c.indirizzo ? c.indirizzo + ', ' : '')}${esc(c.comune)} (${esc(c.provincia)})</p></div>
      <button type="button" class="drawer-close" aria-label="Chiudi la mappa">${icons.close()}</button>
    </header>
    <div class="drawer-body">
      <div class="map-box" id="map-box">
        <iframe title="Mappa: ${esc(c.nome)}" tabindex="-1" src="${mapEmbedUrl(c)}" loading="lazy" referrerpolicy="no-referrer" allowfullscreen></iframe>
        <p class="map-offline" hidden>La mappa non è disponibile senza connessione. Coordinate: ${c.lat.toFixed(4)}, ${c.lon.toFixed(4)}.</p>
      </div>
      ${km}${approx}
      <div class="tel">${tel}</div>
      <div class="actions">
        <a href="${directionsUrl(c)}" target="_blank" rel="noopener">${icons.pin()} Indicazioni stradali</a>
        <a href="${osmUrl(c)}" target="_blank" rel="noopener">Apri su OpenStreetMap</a>
      </div>
      <p class="meta credits">Mappa © OpenStreetMap contributors</p>
    </div>`;
}

export function chiudiDrawer(daPopstate = false): void {
  if (!aperto) return;
  const { el, trigger, usaHistory } = aperto;
  aperto = null;
  el.classList.remove('is-open');
  document.documentElement.classList.remove('drawer-lock');
  sfondoInerte(false);
  const fine = () => { el.remove(); trigger?.focus({ preventScroll: true }); };
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) fine(); else setTimeout(fine, 220);
  if (usaHistory && !daPopstate) history.back();
}

export function apriDrawer(c: Cras, trigger: HTMLElement | null, da?: { punto: Point; etichetta: string }): void {
  if (aperto) chiudiDrawer();
  const el = document.createElement('div');
  el.className = 'drawer-root';
  el.innerHTML = `<div class="drawer-backdrop" data-close></div>
    <div class="drawer" role="dialog" aria-modal="true" aria-labelledby="drawer-title" tabindex="-1">${contenuto(c, da)}</div>`;
  document.body.appendChild(el);
  sfondoInerte(true, el);
  document.documentElement.classList.add('drawer-lock');
  const pannello = el.querySelector<HTMLElement>('.drawer')!;
  if (!navigator.onLine) {
    el.querySelector('iframe')?.setAttribute('hidden', '');
    el.querySelector<HTMLElement>('.map-offline')!.hidden = false;
  }
  // il tasto "Indietro" del telefono chiude il pannello invece di uscire dalla pagina
  history.pushState({ drawer: c.id }, '');
  aperto = { el, trigger, usaHistory: true };
  requestAnimationFrame(() => { el.classList.add('is-open'); pannello.focus({ preventScroll: true }); });

  el.addEventListener('click', (e) => {
    const t = e.target as HTMLElement;
    if (t.closest('[data-close]') || t.closest('.drawer-close')) chiudiDrawer();
  });
  el.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { e.stopPropagation(); chiudiDrawer(); return; }
    if (e.key !== 'Tab') return;
    const f = [...pannello.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((x) => !x.hasAttribute('hidden'));
    if (!f.length) return;
    const primo = f[0]!, ultimo = f[f.length - 1]!;
    if (e.shiftKey && (document.activeElement === primo || document.activeElement === pannello)) { e.preventDefault(); ultimo.focus(); }
    else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primo.focus(); }
  });
}

window.addEventListener('popstate', () => { if (aperto) chiudiDrawer(true); });

/** Collega i pulsanti "Vedi sulla mappa" dentro `radice` al pannello. */
export function collegaDrawer(radice: HTMLElement, trova: (id: string) => Cras | undefined, da: () => { punto: Point; etichetta: string } | undefined): void {
  radice.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLElement>('.open-map');
    if (!b) return;
    const c = trova(b.dataset.id ?? '');
    if (c) apriDrawer(c, b, da());
  });
}
