import '../styles/base.css';
import '../styles/cras.css';
import '../styles/drawer.css';
import { mountLayout } from '../lib/layout';
import { mascot } from '../lib/icons';
import data from '../generated/cras.json';
import type { Cras } from '../lib/cras';
import { FILTRI_VUOTI, filtra, ordina, valoriUnici, type Filtri, type SortKey } from '../lib/filter';
import { locate, type Point } from '../lib/geo';
import { cerca, type Esito, type Gazetteer, type Origine } from '../lib/search';
import { card, esc, row } from '../lib/cras-view';
import { collegaDrawer } from '../lib/drawer';

mountLayout('cras');

const tutti = data as Cras[];
const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

const SORTS: SortKey[] = ['nome', 'comune', 'provincia', 'regione'];

let q = '';
let filtri: Filtri = { ...FILTRI_VUOTI };
let sort: SortKey | null = null; // null = ordine automatico (rilevanza / vicinanza)
let desc = false;
let pos: Point | undefined;
let gaz: Gazetteer | undefined;
let origineScelta: Origine | undefined; // scelta manuale tra comuni omonimi
let ultimo: Esito | undefined;

function readUrl(): void {
  const p = new URLSearchParams(location.search);
  q = p.get('q') ?? '';
  filtri = {
    regione: p.get('regione') ?? '',
    provincia: p.get('provincia') ?? '',
    soloRicci: p.get('ricci') === '1',
    soloVerificati: p.get('verificati') === '1',
    soloH24: p.get('h24') === '1',
    soloFontePrimaria: p.get('ufficiali') === '1',
  };
  const s = p.get('sort') as SortKey;
  sort = SORTS.includes(s) ? s : null;
  desc = p.get('dir') === 'desc';
}

function writeUrl(): void {
  const p = new URLSearchParams();
  if (q) p.set('q', q);
  if (filtri.regione) p.set('regione', filtri.regione);
  if (filtri.provincia) p.set('provincia', filtri.provincia);
  if (filtri.soloRicci) p.set('ricci', '1');
  if (filtri.soloVerificati) p.set('verificati', '1');
  if (filtri.soloH24) p.set('h24', '1');
  if (filtri.soloFontePrimaria) p.set('ufficiali', '1');
  if (sort) p.set('sort', sort);
  if (desc) p.set('dir', 'desc');
  const qs = p.toString();
  history.replaceState(history.state, '', location.pathname + (qs ? `?${qs}` : ''));
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

function vuoto(filtriAttivi: boolean): string {
  if (!tutti.length) {
    return `<div class="card empty" role="status">${mascot('')}<p class="big">Il dataset dei centri è in fase di raccolta.</p>
      <p>Nel frattempo chiama il numero verde <a href="tel:1515">1515</a>.</p></div>`;
  }
  return `<div class="card empty" role="status">${mascot('')}<p class="big">Nessun centro con questi filtri.</p>
    <p>${filtriAttivi ? 'Togli qualche filtro in «Altri filtri», oppure ' : ''}chiama il <a href="tel:1515">1515</a>.</p>
    ${filtriAttivi ? '<button type="button" class="btn" id="reset-empty">Azzera i filtri</button>' : ''}</div>`;
}

function fillSelect(sel: HTMLSelectElement, values: string[], current: string, all: string): void {
  sel.innerHTML = `<option value="">${all}</option>` + values.map((v) => `<option${v === current ? ' selected' : ''}>${esc(v)}</option>`).join('');
  sel.value = values.includes(current) ? current : '';
}

const filtriAttivi = () => Object.values(filtri).some(Boolean);

function nota(e: Esito): string {
  const parti: string[] = [];
  if (e.origine) {
    const o = e.origine;
    parti.push(`<p class="place-note">Centri più vicini a <strong>${esc(o.nome)} (${esc(o.sigla)})</strong> <button type="button" class="link-btn" id="clear-place">Cancella</button></p>`);
    if (e.alternative.length) {
      parti.push(`<p class="place-alt">Cercavi un altro posto? ${e.alternative.map((a, i) => `<button type="button" class="chip" data-alt="${i}">${esc(a.nome)} (${esc(a.sigla)})</button>`).join(' ')}</p>`);
    }
  }
  if (e.messaggio) parti.push(`<p class="notice">${esc(e.messaggio)}</p>`);
  return parti.join('');
}

function render(): void {
  fillSelect($('f-regione'), valoriUnici(tutti, 'regione'), filtri.regione, 'Tutte le regioni');
  const provs = valoriUnici(tutti, 'provincia', filtri.regione);
  if (!provs.includes(filtri.provincia)) filtri.provincia = '';
  fillSelect($('f-provincia'), provs, filtri.provincia, 'Tutte le province');

  const base = filtra(tutti, filtri);
  let esito = cerca(q, base, { gaz, pos });
  if (origineScelta && esito.modo === 'luogo') esito = cerca(q, base, { gaz: { c: [[origineScelta.nome, origineScelta.sigla, origineScelta.lat, origineScelta.lon]], p: gaz?.p ?? {} }, pos });
  ultimo = esito;

  let lista = esito.risultati;
  if (sort) {
    const km = new Map(lista.map((r) => [r.cras.id, r.km]));
    lista = ordina(lista.map((r) => r.cras), sort, desc, pos).map((c) => ({ cras: c, punteggio: 0, km: km.get(c.id) }));
  }
  const conKm = esito.modo === 'luogo' || !!pos;
  $('count').textContent = `${lista.length} ${lista.length === 1 ? 'centro' : 'centri'}${lista.length !== tutti.length ? ` su ${tutti.length}` : ''}`;
  $('place-note').innerHTML = nota(esito);
  $('empty').innerHTML = lista.length ? '' : vuoto(filtriAttivi());
  $('list-cards').innerHTML = lista.map((r) => card(r.cras, conKm ? r.km : undefined)).join('');
  $('table-wrap').hidden = lista.length === 0;
  $('thead').innerHTML = head();
  $('tbody').innerHTML = lista.map((r) => row(r.cras, conKm ? r.km : undefined)).join('');
  $('more').toggleAttribute('open', $('more').hasAttribute('open') || filtriAttivi());
  writeUrl();
}

let timer = 0;
function caricaGazetteer(): void {
  if (gaz) return;
  void import('../data/comuni.json').then((m) => { gaz = m.default as unknown as Gazetteer; render(); });
}

function bind(): void {
  const input = $<HTMLInputElement>('f-q');
  input.value = q;
  $<HTMLInputElement>('f-ricci').checked = filtri.soloRicci;
  $<HTMLInputElement>('f-h24').checked = filtri.soloH24;
  $<HTMLInputElement>('f-ufficiali').checked = filtri.soloFontePrimaria;
  $<HTMLInputElement>('f-verificati').checked = filtri.soloVerificati;

  input.addEventListener('focus', caricaGazetteer);
  input.addEventListener('input', () => {
    q = input.value; origineScelta = undefined;
    caricaGazetteer();
    window.clearTimeout(timer);
    timer = window.setTimeout(render, 90);
  });
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); window.clearTimeout(timer); render(); input.blur(); } });

  const chk = (id: string, k: 'soloRicci' | 'soloH24' | 'soloFontePrimaria' | 'soloVerificati') =>
    $<HTMLInputElement>(id).addEventListener('change', (e) => { filtri[k] = (e.target as HTMLInputElement).checked; render(); });
  chk('f-ricci', 'soloRicci'); chk('f-h24', 'soloH24'); chk('f-ufficiali', 'soloFontePrimaria'); chk('f-verificati', 'soloVerificati');
  $<HTMLSelectElement>('f-regione').addEventListener('change', (e) => { filtri.regione = (e.target as HTMLSelectElement).value; filtri.provincia = ''; render(); });
  $<HTMLSelectElement>('f-provincia').addEventListener('change', (e) => { filtri.provincia = (e.target as HTMLSelectElement).value; render(); });

  const azzera = () => {
    filtri = { ...FILTRI_VUOTI }; q = ''; sort = null; desc = false; origineScelta = undefined;
    input.value = '';
    for (const id of ['f-ricci', 'f-h24', 'f-ufficiali', 'f-verificati']) $<HTMLInputElement>(id).checked = false;
    render();
  };
  $('reset').addEventListener('click', azzera);
  $('empty').addEventListener('click', (e) => { if ((e.target as HTMLElement).closest('#reset-empty')) azzera(); });

  $('place-note').addEventListener('click', (e) => {
    const t = e.target as HTMLElement;
    if (t.closest('#clear-place')) { q = ''; input.value = ''; origineScelta = undefined; render(); input.focus(); return; }
    const alt = t.closest<HTMLElement>('[data-alt]');
    if (alt && ultimo) { origineScelta = ultimo.alternative[Number(alt.dataset.alt)]; render(); }
  });

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
      sort = null;
      st.textContent = q ? '' : 'Ordinati dal più vicino a te.';
      render();
    } catch (err) {
      st.textContent = `${(err as Error).message}. Scrivi il nome del tuo comune nella casella di ricerca.`;
      input.focus();
    }
  });

  collegaDrawer(document.body, (id) => tutti.find((c) => c.id === id), () => {
    const o = ultimo?.origine;
    if (o) return { punto: { lat: o.lat, lon: o.lon }, etichetta: `da ${o.nome}` };
    return pos ? { punto: pos, etichetta: 'da te' } : undefined;
  });
}

readUrl();
bind();
render();
if (q) caricaGazetteer();
else {
  const idle = (window as unknown as { requestIdleCallback?: (f: () => void) => void }).requestIdleCallback;
  if (idle) idle(caricaGazetteer); else window.setTimeout(caricaGazetteer, 1200);
}
