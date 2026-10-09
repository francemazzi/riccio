import { logo } from './icons';

const NAV = [
  { file: 'index.html', path: '', label: 'Home', id: 'home' },
  { file: 'cras.html', path: 'cras.html', label: 'Trova un CRAS', id: 'cras' },
  { file: 'riccio.html', path: 'riccio.html', label: 'Triage', id: 'riccio' },
];

export function pageId(htmlPath: string): string {
  return NAV.find((n) => htmlPath.endsWith(n.file))?.id ?? 'home';
}

export function headerHtml(base: string, page: string): string {
  return `<div class="wrap"><a class="brand" href="${base}">${logo()}<span>Riccio</span></a>
      <nav class="nav" aria-label="Principale">${NAV.map(
        (n) => `<a href="${base}${n.path}"${n.id === page ? ' aria-current="page"' : ''}>${n.label}</a>`,
      ).join('')}</nav></div>`;
}

export function footerHtml(): string {
  return `<div class="wrap"><p>Progetto open source (MIT). I dati sono raccolti da fonti pubbliche e potrebbero essere cambiati: <strong>chiama sempre prima di partire</strong>.
      In caso di dubbio: numero verde ambientale <a href="tel:1515">1515</a>.</p>
      <p><a href="https://github.com/francemazzi/riccio">Codice e dati su GitHub</a> · <a href="https://github.com/francemazzi/riccio/blob/main/CONTRIBUTING.md">Contribuisci</a></p>
      <p class="credits">Mappe e coordinate: © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>, <a href="https://www.geonames.org/">GeoNames</a> (CC BY 4.0).</p></div>`;
}
