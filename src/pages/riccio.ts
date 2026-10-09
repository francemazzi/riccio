import '../styles/base.css';
import '../styles/cras.css';
import '../styles/drawer.css';
import '../styles/triage.css';
import { mountLayout } from '../lib/layout';
import { icons } from '../lib/icons';
import { locate, haversine } from '../lib/geo';
import { card, esc } from '../lib/cras-view';
import { collegaDrawer } from '../lib/drawer';
import { LIVELLI, TriageSession, type Livello, type Triage } from '../lib/triage';
import { LIV, mostraAvviso } from '../lib/triage-ui';
import triageData from '../../data/triage.json';
import crasData from '../generated/cras.json';
import type { Cras } from '../lib/cras';

mountLayout('riccio');

const T = triageData as unknown as Triage;
const crasAll = crasData as Cras[];
const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

// i vecchi link a riccio.html#segni portano alla pagina della guida
if (location.hash === '#segni') location.replace('segni.html');

/* ---------- avviso revisione ---------- */
mostraAvviso(T, $('review'));

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
        <a class="btn secondary" href="/riccio/segni.html">Guida ai segni</a>
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
