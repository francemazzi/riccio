import { icons, logo, mascot } from './icons';

const BASE = import.meta.env.BASE_URL;

const NAV = [
  { href: `${BASE}`, label: 'Home', id: 'home' },
  { href: `${BASE}cras.html`, label: 'Trova un CRAS', id: 'cras' },
  { href: `${BASE}riccio.html`, label: 'Triage', id: 'riccio' },
];

export function mountLayout(page: string): void {
  const header = document.getElementById('site-header');
  if (header) {
    header.className = 'site-header';
    header.innerHTML = `<div class="wrap"><a class="brand" href="${BASE}">${logo()}<span>Riccio</span></a>
      <nav class="nav" aria-label="Principale">${NAV.map(
        (n) => `<a href="${n.href}"${n.id === page ? ' aria-current="page"' : ''}>${n.label}</a>`,
      ).join('')}</nav></div>`;
  }
  const footer = document.getElementById('site-footer');
  if (footer) {
    footer.className = 'site-footer';
    footer.innerHTML = `<div class="wrap"><p>Progetto open source (MIT). I dati sono raccolti da fonti pubbliche e potrebbero essere cambiati: <strong>chiama sempre prima di partire</strong>.
      In caso di dubbio: numero verde ambientale <a href="tel:1515">1515</a>.</p>
      <p><a href="https://github.com/francemazzi/riccio">Codice e dati su GitHub</a> · <a href="https://github.com/francemazzi/riccio/blob/main/CONTRIBUTING.md">Contribuisci</a></p></div>`;
  }
  document.querySelectorAll<HTMLElement>('[data-icon]').forEach((el) => {
    const fn = icons[el.dataset.icon as keyof typeof icons];
    if (fn) el.insertAdjacentHTML('afterbegin', fn(el.dataset.label ?? ''));
  });
  document.querySelectorAll<HTMLElement>('[data-mascot]').forEach((el) => {
    el.innerHTML = mascot();
  });
}
