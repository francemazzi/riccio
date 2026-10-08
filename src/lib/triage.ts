export type Livello = 'lascialo' | 'scalda-e-chiama' | 'urgenza';
export const LIVELLI: Livello[] = ['lascialo', 'scalda-e-chiama', 'urgenza'];

export interface Opzione { testo: string; icona?: string; next?: string; esito?: Livello }
export interface Nodo { domanda: string; aiuto?: string; opzioni: Opzione[] }
export interface Esito { livello: Livello; titolo: string; sintesi: string; istruzioni: string[]; evita: string[] }
export interface Segno {
  segno: string; categoria: string; icona: string; come_riconoscerlo: string; livello: Livello; cosa_fare: string;
}
export interface Triage {
  versione: number; revisionato: boolean; avviso: string; inizio: string;
  nodi: Record<string, Nodo>; esiti: Record<string, Esito>; segni: Segno[];
}

export const MAX_DOMANDE = 5;

/** Controlli strutturali: nessun orfano, nessun ciclo, ogni percorso termina in un esito, max 5 domande. */
export function validateTriage(t: Triage): string[] {
  const errors: string[] = [];
  const nodi = t.nodi ?? {};
  const esiti = t.esiti ?? {};
  if (!nodi[t.inizio]) errors.push(`nodo iniziale "${t.inizio}" inesistente`);
  for (const [k, e] of Object.entries(esiti)) {
    if (!LIVELLI.includes(e.livello)) errors.push(`esito "${k}": livello non valido`);
    if (k !== e.livello) errors.push(`esito "${k}": la chiave deve coincidere col livello ("${e.livello}")`);
    if (!e.titolo || !e.istruzioni?.length) errors.push(`esito "${k}": titolo e istruzioni obbligatori`);
  }
  for (const l of LIVELLI) if (!esiti[l]) errors.push(`manca l'esito "${l}"`);

  for (const [id, n] of Object.entries(nodi)) {
    if (!n.domanda) errors.push(`nodo "${id}": domanda mancante`);
    if (!n.opzioni || n.opzioni.length < 2) errors.push(`nodo "${id}": servono almeno 2 opzioni`);
    for (const [i, o] of (n.opzioni ?? []).entries()) {
      if (!o.testo) errors.push(`nodo "${id}" opzione ${i + 1}: testo mancante`);
      if (!!o.next === !!o.esito) errors.push(`nodo "${id}" opzione ${i + 1}: serve esattamente uno tra next ed esito`);
      if (o.next && !nodi[o.next]) errors.push(`nodo "${id}" opzione ${i + 1}: next "${o.next}" inesistente`);
      if (o.esito && !esiti[o.esito]) errors.push(`nodo "${id}" opzione ${i + 1}: esito "${o.esito}" inesistente`);
    }
  }
  if (errors.length) return errors;

  // cicli e profondità massima (in domande) via DFS
  const stato = new Map<string, 'visita' | 'fatto'>();
  const profondita = new Map<string, number>();
  const visit = (id: string): number => {
    if (stato.get(id) === 'fatto') return profondita.get(id)!;
    if (stato.get(id) === 'visita') { errors.push(`ciclo che passa da "${id}"`); return 0; }
    stato.set(id, 'visita');
    let max = 0;
    for (const o of nodi[id]!.opzioni) max = Math.max(max, o.next ? visit(o.next) : 0);
    stato.set(id, 'fatto');
    profondita.set(id, max + 1);
    return max + 1;
  };
  const tot = visit(t.inizio);
  if (tot > MAX_DOMANDE) errors.push(`percorso più lungo di ${MAX_DOMANDE} domande (${tot})`);
  for (const id of Object.keys(nodi)) if (!stato.has(id)) errors.push(`nodo orfano "${id}" (non raggiungibile)`);
  const raggiunti = new Set(Object.values(nodi).flatMap((n) => n.opzioni.map((o) => o.esito).filter(Boolean)));
  for (const l of LIVELLI) if (!raggiunti.has(l)) errors.push(`esito "${l}" non raggiungibile da nessun percorso`);

  t.segni?.forEach((s, i) => {
    if (!s.segno || !s.cosa_fare || !s.come_riconoscerlo) errors.push(`segno ${i + 1}: campi mancanti`);
    if (!LIVELLI.includes(s.livello)) errors.push(`segno ${i + 1}: livello non valido`);
  });
  return errors;
}

/** Motore step by step con cronologia (tasto indietro) e progresso. */
export class TriageSession {
  private storia: { nodo: string; scelta: number }[] = [];
  private corrente: string;
  esito: Livello | null = null;

  constructor(private t: Triage) { this.corrente = t.inizio; }

  get nodo(): Nodo | null { return this.esito ? null : this.t.nodi[this.corrente]!; }
  get passo(): number { return this.storia.length + 1; }

  /** Domande ancora possibili dal nodo corrente (lunghezza del percorso più lungo). */
  private restanti(id: string): number {
    return 1 + Math.max(0, ...this.t.nodi[id]!.opzioni.map((o) => (o.next ? this.restanti(o.next) : 0)));
  }
  /** Frazione 0..1 di avanzamento. */
  get progresso(): number {
    if (this.esito) return 1;
    const fatte = this.storia.length;
    return fatte / (fatte + this.restanti(this.corrente));
  }

  scegli(i: number): void {
    const n = this.nodo;
    const o = n?.opzioni[i];
    if (!n || !o) throw new Error('Opzione non valida');
    this.storia.push({ nodo: this.corrente, scelta: i });
    if (o.esito) this.esito = o.esito;
    else this.corrente = o.next!;
  }

  indietro(): boolean {
    const ultimo = this.storia.pop();
    if (!ultimo) return false;
    this.corrente = ultimo.nodo;
    this.esito = null;
    return true;
  }

  get puoTornare(): boolean { return this.storia.length > 0; }
  riparti(): void { this.storia = []; this.corrente = this.t.inizio; this.esito = null; }
}
