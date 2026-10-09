import type { Cras } from './cras';
import { fold, wordScore } from './fuzzy';
import { haversine, type Point } from './geo';

/** Comune del gazzettiere: [nome, sigla provincia, lat, lon] */
export type Comune = [string, string, number, number];
export interface Gazetteer { c: Comune[]; p: Record<string, string> }

export interface Origine { nome: string; sigla: string; lat: number; lon: number }

export interface Risultato { cras: Cras; punteggio: number; km?: number }

export type Modo = 'tutti' | 'testo' | 'luogo' | 'telefono' | 'ripiego';

export interface Esito {
  risultati: Risultato[];
  modo: Modo;
  origine?: Origine;
  alternative: Origine[];
  /** frase da mostrare all'utente quando il risultato non è un riscontro esatto */
  messaggio?: string;
}

/** parole che non servono a cercare (o che compaiono in quasi tutti i nomi) */
const STOP = new Set([
  'a', 'ad', 'al', 'alla', 'di', 'da', 'del', 'della', 'dei', 'delle', 'in', 'il', 'la', 'le', 'lo', 'i', 'gli', 'un', 'una', 'uno',
  'per', 'con', 'su', 'e', 'ed', 'o', 'che', 'ho', 'ha', 'sono', 'cerco', 'cercare', 'trovato', 'trovare', 'vicino', 'vicini', 'zona',
  'me', 'mi', 'dove', 'qui', 'centro', 'centri', 'cras', 'recupero', 'animali', 'animale', 'fauna', 'selvatica', 'selvatici',
  'aiuto', 'aiutare', 'portare', 'numero', 'telefono', 'tel', 'chiamare', 'ore', 'ora', 'giorno', 'giorni', 'h',
]);
const RICCI = new Set(['ricci', 'riccio', 'riccia', 'riccetto', 'riccetti', 'porcospino', 'porcospini', 'hedgehog']);
const H24 = new Set(['h24', '24h', '24', '247', 'notte', 'notturno', 'urgenza', 'urgente', 'emergenza', 'emergenze', 'subito', 'sempre']);

interface Campo { chiave: keyof Cras; peso: number }
const CAMPI: Campo[] = [
  { chiave: 'nome', peso: 3 }, { chiave: 'comune', peso: 3 }, { chiave: 'provincia', peso: 2.5 }, { chiave: 'regione', peso: 2 },
  { chiave: 'territorio', peso: 1.6 }, { chiave: 'indirizzo', peso: 1.2 }, { chiave: 'ente', peso: 1 }, { chiave: 'animali_accettati', peso: 1 },
  { chiave: 'note', peso: 0.3 },
];

const MAX_PAROLE_CAMPO = 80;

interface Indicizzato { c: Cras; parole: { chiave: keyof Cras; peso: number; w: string[] }[]; cifre: string }

function indicizza(lista: Cras[], province: Record<string, string>): Indicizzato[] {
  return lista.map((c) => ({
    c,
    parole: CAMPI.map(({ chiave, peso }) => {
      let testo = String(c[chiave] ?? '');
      if (chiave === 'provincia') testo += ' ' + (province[c.provincia] ?? '');
      const w = [...new Set(fold(testo).split(' ').filter(Boolean))].slice(0, MAX_PAROLE_CAMPO);
      return { chiave, peso, w };
    }),
    cifre: c.telefoni.map((t) => t.replace(/\D/g, '')).join(' '),
  }));
}

let cacheLista: Cras[] | null = null;
let cacheIdx: Indicizzato[] = [];
function indice(lista: Cras[], province: Record<string, string>): Indicizzato[] {
  if (cacheLista !== lista) { cacheIdx = indicizza(lista, province); cacheLista = lista; }
  return cacheIdx;
}

/** punteggio di una parola cercata su un centro (il campo migliore, pesato) */
const CAMPI_NOME = new Set<keyof Cras>(['nome', 'comune', 'provincia', 'regione']);
function punteggioToken(token: string, ix: Indicizzato): { pesato: number; grezzo: number; nome: number } {
  let pesato = 0, grezzo = 0, nome = 0;
  for (const campo of ix.parole) {
    let m = 0;
    for (const w of campo.w) {
      const s = wordScore(token, w);
      if (s > m) { m = s; if (m === 1) break; }
    }
    pesato = Math.max(pesato, m * (campo.peso / 3));
    grezzo = Math.max(grezzo, m);
    if (CAMPI_NOME.has(campo.chiave)) nome = Math.max(nome, m);
  }
  return { pesato, grezzo, nome };
}

const PREP = new Set(['del', 'della', 'dello', 'dei', 'delle', 'degli', 'dell', 'nel', 'nella', 'nello', 'nell', 'sul', 'sulla', 'sull', 'dal', 'dalla', 'dall', 'alla', 'allo', 'all']);
/** nome senza preposizioni ("San Giovanni in Persiceto" → "san giovanni persiceto") */
const senzaPrep = (nome: string): string => {
  const w = fold(nome).split(' ');
  const k = w.filter((x) => x.length > 2 && !PREP.has(x));
  return (k.length ? k : w).join(' ');
};

interface GazIx { nome: string; sigla: string; lat: number; lon: number; pieno: string; parole: string[] }
let cacheGaz: Gazetteer | null = null;
let cacheGazIx: GazIx[] = [];
function gazIndice(g: Gazetteer): GazIx[] {
  if (cacheGaz !== g) {
    cacheGazIx = g.c.map(([nome, sigla, lat, lon]) => {
      const pieno = senzaPrep(nome);
      return { nome, sigla, lat, lon, pieno, parole: pieno.split(' ') };
    });
    cacheGaz = g;
  }
  return cacheGazIx;
}

/** miglior comune per le parole cercate (anche più parole: "san giovanni in persiceto") */
function trovaLuogo(tokens: string[], g: Gazetteer, pos?: Point): { best?: Origine; punteggio: number; alternative: Origine[]; usati: Set<string> } {
  const gix = gazIndice(g);
  let top: { s: number; list: GazIx[]; usati: string[] } = { s: 0, list: [], usati: [] };
  const consider = (frase: string, usati: string[]) => {
    for (const e of gix) {
      let s = wordScore(frase, e.pieno);
      // una sola parola distintiva di un nome composto ("persiceto")
      // (sotto 0,9: se esiste un centro con quel nome, vince la ricerca per testo)
      if (usati.length === 1 && e.parole.length > 1) {
        for (const w of e.parole) if (w.length >= 5) s = Math.max(s, wordScore(frase, w) * 0.88);
      }
      if (s > top.s + 1e-9) top = { s, list: [e], usati };
      else if (Math.abs(s - top.s) < 1e-9 && s > 0) top.list.push(e);
    }
  };
  const utili = tokens.filter((t) => t.length >= 3 && !/^\d+$/.test(t));
  for (let n = Math.min(4, utili.length); n >= 1; n--) {
    for (let i = 0; i + n <= utili.length; i++) {
      const parti = utili.slice(i, i + n);
      if (n === 1 && (STOP.has(parti[0]!) || RICCI.has(parti[0]!) || H24.has(parti[0]!))) continue;
      consider(parti.join(' '), parti);
    }
  }
  if (!top.list.length) return { punteggio: 0, alternative: [], usati: new Set() };
  // nome ambiguo e non esatto ("monte" → Montevago, Montecchio…): non è una scelta sicura
  if (top.s < 1 && top.list.length > 1) {
    // ...a meno che uno solo sia lungo quasi quanto ciò che ho digitato ("torin" → Torino, non Torino di Sangro)
    const lung = top.usati.join(' ').length;
    const vicini = top.list.filter((e) => e.pieno.length <= lung + 2);
    if (vicini.length === 1) top.list = vicini; else top.s = Math.min(top.s, 0.86);
  }
  const ord = pos ? [...top.list].sort((a, b) => haversine(pos, a) - haversine(pos, b)) : top.list;
  const toO = (e: GazIx): Origine => ({ nome: e.nome, sigla: e.sigla, lat: e.lat, lon: e.lon });
  const best = toO(ord[0]!);
  const alternative = ord.slice(1, 5).map(toO);
  return { best, punteggio: top.s, alternative, usati: new Set(top.usati) };
}

function ordinaPer(risultati: Risultato[], da?: Point): void {
  risultati.sort((a, b) => b.punteggio - a.punteggio || (da ? (a.km ?? 0) - (b.km ?? 0) : 0) || a.cras.nome.localeCompare(b.cras.nome, 'it'));
}

function conDistanze(lista: Cras[], da: Point | undefined, punteggio: (c: Cras) => number): Risultato[] {
  return lista.map((c) => ({ cras: c, punteggio: punteggio(c), km: da ? haversine(da, c) : undefined }));
}

export interface Opzioni { gaz?: Gazetteer; pos?: Point }

/**
 * Ricerca unica, pensata per chi scrive in fretta: tollera errori e accenti, capisce numeri di telefono,
 * parole come "24 ore" o "ricci", e se scrivi un comune ordina i centri per vicinanza.
 * Non restituisce mai una lista vuota (se `lista` non lo è): in assenza di riscontri propone i centri più vicini.
 */
export function cerca(query: string, lista: Cras[], opz: Opzioni = {}): Esito {
  const gaz = opz.gaz ?? { c: [], p: {} };
  const pos = opz.pos;
  const grezzo = query.trim();
  const tokens = fold(grezzo).split(' ').filter(Boolean);

  if (!tokens.length) {
    const r = conDistanze(lista, pos, () => 0);
    if (pos) r.sort((a, b) => (a.km ?? 0) - (b.km ?? 0)); else r.sort((a, b) => a.cras.nome.localeCompare(b.cras.nome, 'it'));
    return { risultati: r, modo: 'tutti', alternative: [] };
  }

  const ix = indice(lista, gaz.p);

  // 1) numeri di telefono: solo cifre (anche con spazi, +39, trattini)
  const soloCifre = grezzo.replace(/^\+?\s*(0039|39)\s*(?=\d)/, '').replace(/[\s.\-/()]/g, '');
  if (/^\d{3,}$/.test(soloCifre) && tokens.every((t) => /^\d+$/.test(t))) {
    const r = ix.filter((x) => x.cifre.includes(soloCifre)).map((x) => ({ cras: x.c, punteggio: 1, km: pos ? haversine(pos, x.c) : undefined }));
    if (r.length) { ordinaPer(r, pos); return { risultati: r, modo: 'telefono', alternative: [] }; }
  }

  // 2) parole "intenzione": ricci, 24 ore…
  const vuoleRicci = tokens.some((t) => RICCI.has(t));
  const vuoleH24 = tokens.some((t) => H24.has(t)) && !(tokens.length === 1 && /^\d+$/.test(tokens[0]!) && tokens[0] !== '24');
  const contenuto = tokens.filter((t) => !STOP.has(t) && !RICCI.has(t) && !H24.has(t) && !/^\d{1,2}$/.test(t));
  const bonus = (c: Cras): number => {
    let b = 0;
    if (vuoleRicci) b += c.accetta_ricci === 'si' ? 0.25 : c.accetta_ricci === 'no' ? -0.5 : 0;
    if (vuoleH24) b += c.h24 === 'si' ? 0.35 : 0;
    return b;
  };

  // solo intenzioni ("riccio", "24 ore"): niente da cercare per nome, ordino per preferenza
  if (!contenuto.length && (vuoleRicci || vuoleH24)) {
    const r = conDistanze(lista, pos, (c) => bonus(c)).filter((x) => !(vuoleRicci && x.cras.accetta_ricci === 'no'));
    ordinaPer(r, pos);
    return { risultati: r, modo: 'testo', alternative: [] };
  }

  // 3) luogo e testo
  const luogo = gaz.c.length ? trovaLuogo(contenuto, gaz, pos) : { punteggio: 0, alternative: [] as Origine[], usati: new Set<string>() };
  const residui = contenuto.filter((t) => !luogo.usati.has(t));

  // somiglianza grezza migliore: su qualsiasi campo (mTutti) e solo su nome/comune/provincia/regione (mNome)
  let mTutti = 0, mNome = 0;
  const testo = (): Risultato[] => {
    if (!contenuto.length) return [];
    const r: Risultato[] = [];
    for (const x of ix) {
      let somma = 0, sommaGrezza = 0, sommaNome = 0, trovati = 0;
      for (const t of contenuto) { const s = punteggioToken(t, x); if (s.pesato >= 0.45) { somma += s.pesato; sommaGrezza += s.grezzo; sommaNome += s.nome; trovati++; } }
      if (!trovati || trovati < Math.ceil(contenuto.length * 0.6)) continue;
      mTutti = Math.max(mTutti, sommaGrezza / contenuto.length);
      mNome = Math.max(mNome, sommaNome / contenuto.length);
      r.push({ cras: x.c, punteggio: somma / contenuto.length + bonus(x.c), km: pos ? haversine(pos, x.c) : undefined });
    }
    return r;
  };
  const rTesto = testo();
  
  const modoLuogo = (): Esito => {
    const o = luogo.best!;
    const da: Point = { lat: o.lat, lon: o.lon };
    const r = lista.map((c): Risultato => {
      // a parità di distanza contano i residui testuali ("guastalla h24") e le preferenze
      let s = bonus(c);
      // i centri che dichiarano di servire quel comune vengono prima, anche se un po' più lontani
      const idx = ix.find((x) => x.c === c)!;
      const zona = idx.parole.find((p) => p.chiave === 'territorio')?.w ?? [];
      for (const t of luogo.usati) if (zona.some((w) => wordScore(t, w) >= 0.92)) s += 0.6;
      for (const t of residui) { const ps = punteggioToken(t, ix.find((x) => x.c === c)!).pesato; if (ps >= 0.45) s += ps * 0.3; }
      return { cras: c, punteggio: s, km: haversine(da, c) };
    });
    // vicinanza prima di tutto; ogni punto di preferenza (es. "h24") vale circa 100 km
    const peso = (x: Risultato) => (x.km ?? 0) - x.punteggio * 100;
    r.sort((a, b) => peso(a) - peso(b));
    const esatto = luogo.punteggio >= 0.9;
    return {
      risultati: r, modo: 'luogo', origine: o, alternative: luogo.alternative,
      messaggio: esatto ? undefined : `Cerco vicino a ${o.nome} (${o.sigla}): è il posto che intendevi?`,
    };
  };

  if (luogo.best && luogo.punteggio >= 0.9) return modoLuogo();
  // un comune scritto con un errore vale quanto il testo: meglio i centri vicini che uno solo
  if (luogo.best && luogo.punteggio >= 0.85 && luogo.punteggio >= mNome - 0.02) return modoLuogo();
  if (mTutti >= 0.6) {
    ordinaPer(rTesto, pos);
    return { risultati: rTesto, modo: 'testo', alternative: [] };
  }
  if (luogo.best && luogo.punteggio >= 0.6) return modoLuogo();
  if (rTesto.length) {
    ordinaPer(rTesto, pos);
    return { risultati: rTesto, modo: 'testo', alternative: [], messaggio: 'Risultati simili a quello che hai scritto.' };
  }

  // 4) ripiego: mai una pagina vuota
  const tutti = conDistanze(lista, pos, (c) => bonus(c));
  if (pos) tutti.sort((a, b) => (a.km ?? 0) - (b.km ?? 0));
  else tutti.sort((a, b) => b.punteggio - a.punteggio || a.cras.nome.localeCompare(b.cras.nome, 'it'));
  return {
    risultati: tutti, modo: 'ripiego', alternative: [],
    messaggio: pos
      ? `Non trovo «${grezzo}»: ecco i centri più vicini a te.`
      : `Non trovo «${grezzo}». Scrivi il nome del tuo comune oppure tocca «Vicino a me»: intanto ecco tutti i centri.`,
  };
}
