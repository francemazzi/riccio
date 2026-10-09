import '../styles/base.css';
import '../styles/cras.css';
import '../styles/drawer.css';
import '../styles/triage.css';
import { mountLayout } from '../lib/layout';
import { icons } from '../lib/icons';
import { locate, haversine } from '../lib/geo';
import { card, esc } from '../lib/cras-view';
import { collegaDrawer } from '../lib/drawer';
import { norm } from '../lib/filter';
import { LIVELLI, TriageSession, type Livello, type Segno, type Triage } from '../lib/triage';
import triageData from '../../data/triage.json';
import crasData from '../generated/cras.json';
import type { Cras } from '../lib/cras';

mountLayout('riccio');

const T = triageData as unknown as Triage;
const crasAll = crasData as Cras[];
const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

const LIV: Record<Livello, { label: string; icon: keyof typeof icons; badge: string }> = {
  urgenza: { label: 'Urgenza', icon: 'warn', badge: 'bad' },
  'scalda-e-chiama': { label: 'Scalda e chiama', icon: 'heat', badge: 'warn' },
  lascialo: { label: 'Lascialo stare', icon: 'check', badge: 'ok' },
};

/* ---------- avviso revisione ---------- */
if (!T.revisionato) {
  $('review').innerHTML = `<span>${icons.info()}</span><p style="margin:0"><strong>In attesa di revisione veterinaria.</strong> ${esc(T.avviso)}</p>`;
  $('review').hidden = false;
}

/* ---------- wizard ---------- */
const session = new TriageSession(T);
const root = $('wizard');

function renderQuestion(focus = true): void {
  const n = session.nodo!;
  const pct = Math.round(session.progresso * 100);
  root.innerHTML = `
    <p class="step-label" id="step-label">Domanda ${session.passo}</p>
    <div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}" aria-labelledby="step-label"><div style="width:${pct}%"></div></div>
    <h2 id="q" tabindex="-1">${esc(n.domanda)}</h2>
    ${n.aiuto ? `<p class="hint">${esc(n.aiuto)}</p>` : ''}
    <ul class="options">${n.opzioni.map((o, i) => `<li><button type="button" class="opt" data-i="${i}">${o.icona && o.icona in icons ? icons[o.icona as keyof typeof icons]() : ''}<span>${esc(o.testo)}</span></button></li>`).join('')}</ul>
    ${session.puoTornare ? `<button type="button" class="btn secondary" id="back">← Indietro</button>` : ''}`;
  if (focus) $('q').focus();
}

function nearestHtml(): string {
  return `<div class="nearest" id="nearest"><button type="button" class="btn" id="find">${icons.pin()} Trova il CRAS più vicino</button>
    <p class="status" id="nstatus" role="status"></p><ul class="cards" id="nlist"></ul></div>`;
}

function renderResult(l: Livello, shared = false, focus = true): void {
  const e = T.esiti[l]!;
  const m = LIV[l];
  root.innerHTML = `
    <div class="progress" aria-hidden="true"><div style="width:100%"></div></div>
    <section class="result ${l}" aria-labelledby="r-title">
      <h2 id="r-title" tabindex="-1">${icons[m.icon]()} ${esc(e.titolo)}</h2>
      <p><span class="badge ${m.badge}">${esc(m.label)}</span> ${esc(e.sintesi)}</p>
      ${shared ? `<p class="hint">Questo è un esito condiviso. Per il tuo riccio rifai il triage.</p>` : ''}
      <h3>Cosa fare adesso</h3><ol>${e.istruzioni.map((s) => `<li>${esc(s)}</li>`).join('')}</ol>
      <h3>Cosa NON fare</h3><ul class="evita">${e.evita.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>
      ${l !== 'lascialo' ? nearestHtml() : ''}
      <div class="cta-row">
        <a class="btn secondary" href="tel:1515">${icons.phone()} Numero verde 1515</a>
        <button type="button" class="btn secondary" id="share">Copia link dell'esito</button>
        <button type="button" class="btn secondary" id="restart">Rifai il triage</button>
        ${session.puoTornare ? '<button type="button" class="btn secondary" id="back">← Indietro</button>' : ''}
      </div>
      <p class="status" id="sharestatus" role="status"></p>
    </section>`;
  if (focus) $('r-title').focus();
  history.replaceState(null, '', `${location.pathname}?esito=${l}`);
}

let ultimaPos: { lat: number; lon: number } | undefined;
async function findNearest(): Promise<void> {
  const st = $('nstatus'), list = $('nlist');
  if (!crasAll.length) {
    st.innerHTML = `Il dataset dei centri è in fase di raccolta: chiama il <a href="tel:1515">1515</a> o consulta l'<a href="/riccio/cras.html">elenco</a>.`;
    return;
  }
  st.textContent = 'Cerco la tua posizione…';
  try {
    const pos = await locate();
    const top = [...crasAll].filter((c) => c.accetta_ricci !== 'no').sort((a, b) => haversine(pos, a) - haversine(pos, b)).slice(0, 3);
    st.textContent = top.length ? 'I tre centri più vicini:' : 'Nessun centro trovato: chiama il 1515.';
    list.innerHTML = top.map((c) => card(c, haversine(pos, c))).join('');
    ultimaPos = pos;
  } catch (err) {
    st.innerHTML = `${esc((err as Error).message)}. <a href="/riccio/cras.html">Cerca per città o provincia</a>.`;
  }
}

collegaDrawer(document.body, (id) => crasAll.find((c) => c.id === id), () => (ultimaPos ? { punto: ultimaPos, etichetta: 'da te' } : undefined));

root.addEventListener('click', (ev) => {
  const t = ev.target as HTMLElement;
  const opt = t.closest<HTMLElement>('.opt');
  if (opt) { session.scegli(Number(opt.dataset.i)); return draw(); }
  if (t.closest('#back')) { session.indietro(); history.replaceState(null, '', location.pathname); return draw(); }
  if (t.closest('#restart')) { session.riparti(); history.replaceState(null, '', location.pathname); return draw(); }
  if (t.closest('#find')) return void findNearest();
  if (t.closest('#share')) {
    const url = location.href;
    const done = (m: string) => { $('sharestatus').textContent = m; };
    (navigator.clipboard?.writeText(url) ?? Promise.reject()).then(() => done('Link copiato.'), () => done(`Copia questo link: ${url}`));
  }
});

function draw(): void {
  if (session.esito) renderResult(session.esito);
  else renderQuestion();
}

const shared = new URLSearchParams(location.search).get('esito') as Livello | null;
if (shared && LIVELLI.includes(shared)) renderResult(shared, true, false);
else renderQuestion(false);

/* ---------- guida ai segni (tabella filtrabile) ---------- */
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
