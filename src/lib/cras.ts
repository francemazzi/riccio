import { parseCsv } from './csv';

export const HEADER = [
  'id', 'nome', 'regione', 'provincia', 'comune', 'indirizzo', 'lat', 'lon', 'telefono', 'orari',
  'sito', 'accetta_ricci', 'accetta_stalli', 'note', 'fonte', 'verificato_il',
] as const;

export type Tri = 'si' | 'no' | '?';

export interface Cras {
  id: string; nome: string; regione: string; provincia: string; comune: string; indirizzo: string;
  lat: number; lon: number; telefoni: string[]; orari: string; sito: string;
  accetta_ricci: Tri; accetta_stalli: Tri; note: string; fonte: string; verificato_il: string;
}

const ITALY = { latMin: 35.4, latMax: 47.2, lonMin: 6.5, lonMax: 18.6 };
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const PHONE = /^\+39\d{6,11}$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const URL_RE = /^https?:\/\/\S+$/;
const TRI = new Set(['si', 'no', '?']);

function validDate(s: string): boolean {
  if (!DATE.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

/** Valida il testo del CSV; restituisce errori (vuoto = ok) e i record validi. */
export function parseCras(text: string): { errors: string[]; records: Cras[] } {
  const errors: string[] = [];
  const records: Cras[] = [];
  let rows: string[][];
  try { rows = parseCsv(text); } catch (e) { return { errors: [(e as Error).message], records }; }
  const head = rows[0] ?? [];
  if (head.join(',') !== HEADER.join(',')) {
    return { errors: [`Header errato. Atteso: ${HEADER.join(',')}`], records };
  }
  const seen = new Set<string>();
  rows.slice(1).forEach((r, idx) => {
    const line = idx + 2;
    const err = (m: string) => errors.push(`riga ${line}: ${m}`);
    if (r.length !== HEADER.length) return err(`${r.length} colonne invece di ${HEADER.length}`);
    const g = Object.fromEntries(HEADER.map((h, i) => [h, (r[i] ?? '').trim()])) as Record<(typeof HEADER)[number], string>;
    const before = errors.length;
    if (!SLUG.test(g.id)) err(`id non è uno slug valido ("${g.id}")`);
    else if (seen.has(g.id)) err(`id duplicato "${g.id}"`);
    seen.add(g.id);
    for (const k of ['nome', 'regione', 'comune', 'fonte'] as const) if (!g[k]) err(`${k} obbligatorio`);
    if (!/^[A-Z]{2}$/.test(g.provincia)) err(`provincia deve essere una sigla ("${g.provincia}")`);
    const lat = Number(g.lat), lon = Number(g.lon);
    if (g.lat === '' || g.lon === '' || !Number.isFinite(lat) || !Number.isFinite(lon)) err('lat/lon non numerici');
    else if (lat < ITALY.latMin || lat > ITALY.latMax || lon < ITALY.lonMin || lon > ITALY.lonMax) err(`lat/lon fuori dall'Italia (${lat}, ${lon})`);
    const tels = g.telefono.split(';').map((t) => t.trim()).filter(Boolean);
    if (!tels.length) err('telefono obbligatorio');
    for (const t of tels) if (!PHONE.test(t)) err(`telefono non valido "${t}" (formato +39...)`);
    if (g.sito && !URL_RE.test(g.sito)) err(`sito non è un URL ("${g.sito}")`);
    if (g.fonte && !URL_RE.test(g.fonte)) err(`fonte non è un URL ("${g.fonte}")`);
    for (const k of ['accetta_ricci', 'accetta_stalli'] as const) if (!TRI.has(g[k])) err(`${k} deve essere si/no/? ("${g[k]}")`);
    if (g.verificato_il && !validDate(g.verificato_il)) err(`verificato_il non è una data YYYY-MM-DD ("${g.verificato_il}")`);
    if (errors.length === before) {
      records.push({
        id: g.id, nome: g.nome, regione: g.regione, provincia: g.provincia, comune: g.comune, indirizzo: g.indirizzo,
        lat, lon, telefoni: tels, orari: g.orari, sito: g.sito, accetta_ricci: g.accetta_ricci as Tri,
        accetta_stalli: g.accetta_stalli as Tri, note: g.note, fonte: g.fonte, verificato_il: g.verificato_il,
      });
    }
  });
  return { errors, records };
}

export type Stato = 'verificato' | 'da-verificare';
/** "da verificare" se mai verificato o verificato più di 12 mesi fa. */
export function statoVerifica(verificato_il: string, oggi: Date = new Date()): Stato {
  if (!verificato_il) return 'da-verificare';
  const limite = new Date(Date.UTC(oggi.getUTCFullYear() - 1, oggi.getUTCMonth(), oggi.getUTCDate()));
  return new Date(`${verificato_il}T00:00:00Z`) < limite ? 'da-verificare' : 'verificato';
}
