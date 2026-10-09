import '../styles/base.css';
import '../styles/cras.css';
import '../styles/triage.css';
import { mountLayout } from '../lib/layout';
import { icons } from '../lib/icons';
import { esc } from '../lib/cras-view';
import { norm } from '../lib/filter';
import { LIVELLI, type Livello, type Segno, type Triage } from '../lib/triage';
import { LIV, mostraAvviso } from '../lib/triage-ui';
import triageData from '../../data/triage.json';

mountLayout('riccio');

const T = triageData as unknown as Triage;
const $ = <E extends HTMLElement>(id: string) => document.getElementById(id) as E;

mostraAvviso(T, $('review'));

let liv: Livello | '' = '';
let cat = '';
let q = '';

function renderSegni(): void {
  const rows = T.segni.filter((s: Segno) =>
    (!liv || s.livello === liv) && (!cat || s.categoria === cat) &&
    norm([s.segno, s.come_riconoscerlo, s.cosa_fare, s.categoria].join(' ')).includes(norm(q)));
  $('segni-count').textContent = `${rows.length} ${rows.length === 1 ? 'segno' : 'segni'} su ${T.segni.length}`;
  $('segni-body').innerHTML = rows.length
    ? rows.map((s) => {
        const m = LIV[s.livello];
        const ic = s.icona in icons ? icons[s.icona as keyof typeof icons]() : '';
        return `<tr><th scope="row"><span class="nome">${ic}<span>${esc(s.segno)}<span class="cat">${esc(s.categoria)}</span></span></span></th>
          <td data-label="Come si riconosce">${esc(s.come_riconoscerlo)}</td>
          <td data-label="Livello"><span class="badge ${m.badge}">${icons[m.icon]()} ${esc(m.label)}</span></td>
          <td data-label="Cosa fare">${esc(s.cosa_fare)}</td></tr>`;
      }).join('')
    : `<tr><td colspan="4">Nessun segno corrisponde. <button type="button" class="chip" id="segni-reset">Azzera</button></td></tr>`;
  document.querySelectorAll<HTMLElement>('.chip[data-liv]').forEach((b) => b.setAttribute('aria-pressed', String((b.dataset.liv ?? '') === liv)));
}

const cats = [...new Set(T.segni.map((s) => s.categoria))].sort((a, b) => a.localeCompare(b, 'it'));
$<HTMLSelectElement>('segni-cat').innerHTML = '<option value="">Tutte le categorie</option>' + cats.map((c) => `<option>${esc(c)}</option>`).join('');
$('segni-chips').innerHTML = [['', 'Tutti'], ...LIVELLI.slice().reverse().map((l) => [l, LIV[l].label])]
  .map(([v, l]) => `<button type="button" class="chip" data-liv="${v}" aria-pressed="false">${l}</button>`).join('');
$('segni-chips').addEventListener('click', (e) => {
  const b = (e.target as HTMLElement).closest<HTMLElement>('.chip[data-liv]');
  if (b) { liv = (b.dataset.liv ?? '') as Livello | ''; renderSegni(); }
});
$<HTMLInputElement>('segni-q').addEventListener('input', (e) => { q = (e.target as HTMLInputElement).value; renderSegni(); });
$<HTMLSelectElement>('segni-cat').addEventListener('change', (e) => { cat = (e.target as HTMLSelectElement).value; renderSegni(); });
$('segni-body').addEventListener('click', (e) => {
  if ((e.target as HTMLElement).closest('#segni-reset')) {
    liv = ''; cat = ''; q = ''; $<HTMLInputElement>('segni-q').value = ''; $<HTMLSelectElement>('segni-cat').value = ''; renderSegni();
  }
});
renderSegni();
