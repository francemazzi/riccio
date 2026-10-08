import '../styles/base.css';
import '../styles/cras.css';
import { mountLayout } from '../lib/layout';
import { icons, mascot } from '../lib/icons';
import data from '../generated/cras.json';
import { statoVerifica, type Cras } from '../lib/cras';
import { FILTRI_VUOTI, filtra, ordina, valoriUnici, type Campo, type Filtri, type SortKey } from '../lib/filter';
import { formatKm, haversine, locate, mapsUrl, type Point } from '../lib/geo';

mountLayout('cras');

const tutti = data as Cras[];
const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

const CAMPI: Campo[] = ['tutti', 'nome', 'comune', 'provincia', 'regione'];
const SORTS: SortKey[] = ['nome', 'comune', 'provincia', 'regione', 'distanza'];

let filtri: Filtri = { ...FILTRI_VUOTI };
let sort: SortKey = 'nome';
let desc = false;
let pos: Point | undefined;

function readUrl(): void {
  const p = new URLSearchParams(location.search);
  const campo = p.get('campo') as Campo;
  filtri = {
    q: p.get('q') ?? '',
    campo: CAMPI.includes(campo) ? campo : 'tutti',
    regione: p.get('regione') ?? '',
    provincia: p.get('provincia') ?? '',
    soloRicci: p.get('ricci') === '1',
    soloVerificati: p.get('verificati') === '1',
  };
  const s = p.get('sort') as SortKey;
  sort = SORTS.includes(s) && s !== 'distanza' ? s : 'nome';
  desc = p.get('dir') === 'desc';
}

function writeUrl(): void {
  const p = new URLSearchParams();
  if (filtri.q) p.set('q', filtri.q);
  if (filtri.campo !== 'tutti') p.set('campo', filtri.campo);
  if (filtri.regione) p.set('regione', filtri.regione);
  if (filtri.provincia) p.set('provincia', filtri.provincia);
  if (filtri.soloRicci) p.set('ricci', '1');
  if (filtri.soloVerificati) p.set('verificati', '1');
  if (sort !== 'nome' && sort !== 'distanza') p.set('sort', sort);
  if (desc) p.set('dir', 'desc');
  const qs = p.toString();
  history.replaceState(null, '', location.pathname + (qs ? `?${qs}` : ''));
}

const fmtTel = (t: string) => t.replace(/^\+39(\d{2,4})(\d+)$/, '+39 $1 $2');

function badgeRicci(c: Cras): string {
  if (c.accetta_ricci === 'si') return `<span class="badge ok">${icons.check()} Accetta ricci</span>`;
  if (c.accetta_ricci === 'no') return `<span class="badge bad">Non accetta ricci</span>`;
  return `<span class="badge neutral">Ricci: da chiedere</span>`;
}
function badgeStalli(c: Cras): string {
  if (c.accetta_stalli === 'si') return `<span class="badge ok">Affida a stalli</span>`;
  if (c.accetta_stalli === 'no') return `<span class="badge neutral">Niente stalli</span>`;
  return '';
}
function badgeVerifica(c: Cras): string {
  if (statoVerifica(c.verificato_il) === 'verificato') {
    return `<span class="badge ok">${icons.check()} Verificato il ${esc(new Date(c.verificato_il).toLocaleDateString('it-IT'))}</span>`;
  }
  return `<span class="badge warn" title="Chiama prima di partire: i dati non sono stati verificati di recente">${icons.warn()} Da verificare</span>`;
}
const badges = (c: Cras) => `<div class="badges">${badgeRicci(c)}${badgeStalli(c)}${badgeVerifica(c)}</div>`;
const telefoni = (c: Cras) =>
  `<div class="tel">${c.telefoni.map((t) => `<a class="btn" href="tel:${esc(t)}">${icons.phone()} ${esc(fmtTel(t))}</a>`).join('')}</div>`;
const distanza = (c: Cras) => (pos ? `<span class="dist">${formatKm(haversine(pos, c))}</span>` : '');
const segnala = (c: Cras) => {
  const u = new URLSearchParams({ template: 'segnala-cras.yml', title: `[CRAS] Correzione: ${c.nome}`, cras_id: c.id });
  return `https://github.com/francemazzi/riccio/issues/new?${u}`;
};
const azioni = (c: Cras) =>
  `<div class="actions"><a href="${mapsUrl(c)}" target="_blank" rel="noopener">${icons.pin()} Apri in mappe</a>` +
  (c.sito ? `<a href="${esc(c.sito)}" target="_blank" rel="noopener">Sito</a>` : '') +
  `<a href="${esc(c.fonte)}" target="_blank" rel="noopener">Fonte</a>` +
  `<a href="${segnala(c)}" target="_blank" rel="noopener">${icons.flag()} Segnala errore</a></div>`;

function card(c: Cras): string {
  return `<li class="card cras-card"><h3>${esc(c.nome)}</h3>
    <p class="where">${icons.pin()} ${esc(c.comune)} (${esc(c.provincia)}) · ${esc(c.regione)} ${distanza(c)}</p>
    ${telefoni(c)}
    ${c.orari ? `<p class="meta">Orari: ${esc(c.orari)}</p>` : ''}
    ${c.indirizzo ? `<p class="meta">${esc(c.indirizzo)}</p>` : ''}
    ${badges(c)}${c.note ? `<p class="meta">${esc(c.note)}</p>` : ''}${azioni(c)}</li>`;
}

function row(c: Cras): string {
  return `<tr><th scope="row">${esc(c.nome)}${c.indirizzo ? `<div class="meta">${esc(c.indirizzo)}</div>` : ''}</th>
    <td>${esc(c.comune)} ${distanza(c)}</td><td>${esc(c.provincia)}</td><td>${esc(c.regione)}</td>
    <td>${telefoni(c)}${c.orari ? `<div class="meta">${esc(c.orari)}</div>` : ''}</td>
    <td>${badges(c)}</td><td>${azioni(c)}</td></tr>`;
}

const COLS: { key: SortKey; label: string }[] = [
  { key: 'nome', label: 'Centro' }, { key: 'comune', label: 'Comune' },
  { key: 'provincia', label: 'Prov.' }, { key: 'regione', label: 'Regione' },
];

function head(): string {
  const th = (c: { key: SortKey; label: string }) => {
    const s = sort === c.key ? (desc ? 'descending' : 'ascending') : 'none';
    return `<th scope="col" aria-sort="${s}"><button type="button" data-sort="${c.key}">${c.label}</button></th>`;
  };
  return `<tr>${COLS.map(th).join('')}<th scope="col">Telefono</th><th scope="col">Stato</th><th scope="col">Azioni</th></tr>`;
}

function empty(): string {
  if (!tutti.length) {
    return `<div class="card empty" role="status">${mascot('')}<p class="big">Il dataset dei centri è in fase di raccolta.</p>
      <p>Nel frattempo chiama il numero verde <a href="tel:1515">1515</a>. Puoi <a href="https://github.com/francemazzi/riccio/issues/new?template=segnala-cras.yml">segnalare un centro</a>.</p></div>`;
  }
  return `<div class="card empty" role="status">${mascot('')}<p class="big">Nessun centro in zona, chiama il <a href="tel:1515">1515</a>.</p>
    <p>Prova a togliere qualche filtro o a cercare una provincia vicina.</p></div>`;
}

function fillSelect(sel: HTMLSelectElement, values: string[], current: string, all: string): void {
  sel.innerHTML = `<option value="">${all}</option>` + values.map((v) => `<option${v === current ? ' selected' : ''}>${esc(v)}</option>`).join('');
  sel.value = values.includes(current) ? current : '';
}

function render(): void {
  fillSelect($('f-regione'), valoriUnici(tutti, 'regione'), filtri.regione, 'Tutte le regioni');
  fillSelect($('f-provincia'), valoriUnici(tutti, 'provincia', filtri.regione), filtri.provincia, 'Tutte le province');
  if (!valoriUnici(tutti, 'provincia', filtri.regione).includes(filtri.provincia)) filtri.provincia = '';
  const eff: SortKey = pos && sort === 'distanza' ? 'distanza' : sort === 'distanza' ? 'nome' : sort;
  const lista = ordina(filtra(tutti, filtri), eff, desc, pos);
  $('count').textContent = `${lista.length} ${lista.length === 1 ? 'centro' : 'centri'} su ${tutti.length}`;
  const vuoto = lista.length === 0;
  $('empty').innerHTML = vuoto ? empty() : '';
  $('list-cards').innerHTML = lista.map(card).join('');
  $('table-wrap').hidden = vuoto;
  $('thead').innerHTML = head();
  $('tbody').innerHTML = lista.map(row).join('');
  writeUrl();
}

function bind(): void {
  const q = $<HTMLInputElement>('f-q');
  q.value = filtri.q;
  $<HTMLSelectElement>('f-campo').value = filtri.campo;
  $<HTMLInputElement>('f-ricci').checked = filtri.soloRicci;
  $<HTMLInputElement>('f-verificati').checked = filtri.soloVerificati;
  q.addEventListener('input', () => { filtri.q = q.value; render(); });
  $<HTMLSelectElement>('f-campo').addEventListener('change', (e) => { filtri.campo = (e.target as HTMLSelectElement).value as Campo; render(); });
  $<HTMLSelectElement>('f-regione').addEventListener('change', (e) => { filtri.regione = (e.target as HTMLSelectElement).value; filtri.provincia = ''; render(); });
  $<HTMLSelectElement>('f-provincia').addEventListener('change', (e) => { filtri.provincia = (e.target as HTMLSelectElement).value; render(); });
  $<HTMLInputElement>('f-ricci').addEventListener('change', (e) => { filtri.soloRicci = (e.target as HTMLInputElement).checked; render(); });
  $<HTMLInputElement>('f-verificati').addEventListener('change', (e) => { filtri.soloVerificati = (e.target as HTMLInputElement).checked; render(); });
  $('reset').addEventListener('click', () => { filtri = { ...FILTRI_VUOTI }; sort = 'nome'; desc = false; q.value = ''; $<HTMLSelectElement>('f-campo').value = 'tutti'; $<HTMLInputElement>('f-ricci').checked = false; $<HTMLInputElement>('f-verificati').checked = false; render(); });
  $('thead').addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLElement>('button[data-sort]');
    if (!b) return;
    const k = b.dataset.sort as SortKey;
    desc = sort === k ? !desc : false;
    sort = k;
    render();
    $('thead').querySelector<HTMLElement>(`button[data-sort="${k}"]`)?.focus();
  });
  $('geo').addEventListener('click', async () => {
    const st = $('status');
    st.textContent = 'Cerco la tua posizione…';
    try {
      pos = await locate();
      sort = 'distanza'; desc = false;
      st.textContent = 'Ordinati dal più vicino a te.';
      render();
    } catch (err) {
      st.textContent = `${(err as Error).message}. Scegli la tua provincia dai filtri.`;
      $('f-provincia').focus();
    }
  });
}

readUrl();
bind();
render();
