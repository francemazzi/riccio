import { icons } from './icons';
import { statoVerifica, type Cras } from './cras';
import { formatKm, haversine, mapsUrl, type Point } from './geo';

export const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

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
function badgeH24(c: Cras): string {
  return c.h24 === 'si' ? `<span class="badge ok">${icons.moon()} Emergenze H24</span>` : '';
}
function badgeStato(c: Cras): string {
  return c.stato_centro === 'sospeso' ? `<span class="badge bad">${icons.warn()} Servizio sospeso</span>` : '';
}
function badgeFonte(c: Cras): string {
  return c.fonte_tipo === 'primaria'
    ? `<span class="badge neutral" title="Numero letto sul sito del centro o su un documento ufficiale">Fonte ufficiale</span>`
    : `<span class="badge neutral" title="Dato da elenco di terzi: non confermato su fonte ufficiale">Fonte secondaria</span>`;
}
export const badges = (c: Cras) =>
  `<div class="badges">${badgeStato(c)}${badgeRicci(c)}${badgeH24(c)}${badgeStalli(c)}${badgeVerifica(c)}${badgeFonte(c)}</div>`;
const dettagli = (c: Cras) =>
  `${c.animali_accettati ? `<p class="meta"><strong>Animali accettati:</strong> ${esc(c.animali_accettati)}</p>` : ''}` +
  `${c.territorio ? `<p class="meta"><strong>Zona servita:</strong> ${esc(c.territorio)}</p>` : ''}` +
  `${c.modalita ? `<p class="meta"><strong>Come portarlo:</strong> ${esc(c.modalita)}</p>` : ''}` +
  `${c.ente ? `<p class="meta">Gestito da ${esc(c.ente)}</p>` : ''}`;
const telefoni = (c: Cras) =>
  `<div class="tel">${c.telefoni.map((t) => `<a class="btn" href="tel:${esc(t)}">${icons.phone()} ${esc(fmtTel(t))}</a>`).join('')}</div>`;
const distanza = (c: Cras, pos?: Point) => (pos ? `<span class="dist">${formatKm(haversine(pos, c))}</span>` : '');
const segnala = (c: Cras) => {
  const u = new URLSearchParams({ template: 'segnala-cras.yml', title: `[CRAS] Correzione: ${c.nome}`, cras_id: c.id });
  return `https://github.com/francemazzi/riccio/issues/new?${u}`;
};
const azioni = (c: Cras) =>
  `<div class="actions"><a href="${mapsUrl(c)}" target="_blank" rel="noopener">${icons.pin()} Apri in mappe</a>` +
  (c.sito ? `<a href="${esc(c.sito)}" target="_blank" rel="noopener">Sito</a>` : '') +
  `<a href="${esc(c.fonte)}" target="_blank" rel="noopener">Fonte</a>` +
  `<a href="${segnala(c)}" target="_blank" rel="noopener">${icons.flag()} Segnala errore</a></div>`;

export function card(c: Cras, pos?: Point): string {
  return `<li class="card cras-card"><h3>${esc(c.nome)}</h3>
    <p class="where">${icons.pin()} ${esc(c.comune)} (${esc(c.provincia)}) · ${esc(c.regione)} ${distanza(c, pos)}</p>
    ${telefoni(c)}
    ${c.orari ? `<p class="meta">Orari: ${esc(c.orari)}</p>` : ''}
    ${c.indirizzo ? `<p class="meta">${esc(c.indirizzo)}</p>` : ''}
    ${badges(c)}${dettagli(c)}${c.note ? `<p class="meta">${esc(c.note)}</p>` : ''}${azioni(c)}</li>`;
}

export function row(c: Cras, pos?: Point): string {
  return `<tr><th scope="row">${esc(c.nome)}${c.indirizzo ? `<div class="meta">${esc(c.indirizzo)}</div>` : ''}</th>
    <td>${esc(c.comune)} ${distanza(c, pos)}</td><td>${esc(c.provincia)}</td><td>${esc(c.regione)}</td>
    <td>${telefoni(c)}${c.orari ? `<div class="meta">${esc(c.orari)}</div>` : ''}</td>
    <td>${badges(c)}${dettagli(c)}</td><td>${azioni(c)}</td></tr>`;
}

