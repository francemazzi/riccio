import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { TriageSession, validateTriage, type Triage } from '../src/lib/triage';

const load = (): Triage => JSON.parse(readFileSync('data/triage.json', 'utf8'));
const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x));

describe('validateTriage', () => {
  it('l\'albero reale è valido', () => expect(validateTriage(load())).toEqual([]));
  it('rileva next inesistente', () => {
    const t = clone(load()); t.nodi.orario!.opzioni[0]!.next = 'boh';
    expect(validateTriage(t).join()).toMatch(/inesistente/);
  });
  it('rileva nodi orfani', () => {
    const t = clone(load()); t.nodi.orfano = { domanda: '?', opzioni: [{ testo: 'a', esito: 'urgenza' }, { testo: 'b', esito: 'lascialo' }] };
    expect(validateTriage(t).join()).toMatch(/orfano/);
  });
  it('rileva cicli', () => {
    const t = clone(load()); t.nodi.stagione_n!.opzioni[0] = { testo: 'ciclo', next: 'orario' };
    expect(validateTriage(t).join()).toMatch(/ciclo/);
  });
  it('rileva opzione senza destinazione e percorsi troppo lunghi', () => {
    const t = clone(load()); delete t.nodi.orario!.opzioni[0]!.next;
    expect(validateTriage(t).join()).toMatch(/esattamente uno/);
    const l = clone(load());
    l.nodi.stagione_n!.opzioni[0] = { testo: 'x', next: 'extra' };
    l.nodi.extra = { domanda: 'sesta?', opzioni: [{ testo: 'a', esito: 'lascialo' }, { testo: 'b', esito: 'urgenza' }] };
    expect(validateTriage(l).join()).toMatch(/più lungo/);
  });
});

describe('TriageSession', () => {
  const t = load();
  it('percorso notturno sano termina in "lascialo"', () => {
    const s = new TriageSession(t);
    [0, 0, 3, 1, 0].forEach((i) => s.scegli(i)); // notte, palla, nessun segno, normale, mar-nov
    expect(s.esito).toBe('lascialo');
    expect(s.progresso).toBe(1);
  });
  it('di giorno e barcolla → urgenza in 2 passi', () => {
    const s = new TriageSession(t);
    s.scegli(1); s.scegli(0);
    expect(s.esito).toBe('urgenza');
  });
  it('indietro ripristina nodo, esito e progresso', () => {
    const s = new TriageSession(t);
    expect(s.puoTornare).toBe(false);
    s.scegli(1); s.scegli(0);
    expect(s.indietro()).toBe(true);
    expect(s.esito).toBeNull();
    expect(s.nodo?.domanda).toMatch(/Com'è il riccio/);
    s.indietro();
    expect(s.indietro()).toBe(false);
    expect(s.progresso).toBe(0);
  });
  it('il progresso cresce in modo monotono lungo il percorso più lungo', () => {
    const s = new TriageSession(t);
    const p = [s.progresso];
    [0, 0, 3, 1].forEach((i) => { s.scegli(i); p.push(s.progresso); });
    expect(p).toEqual([...p].sort((a, b) => a - b));
    expect(p[p.length - 1]).toBeLessThan(1);
  });
  it('ogni percorso possibile termina entro 5 domande', () => {
    const walk = (id: string, d: number): void => {
      expect(d).toBeLessThanOrEqual(5);
      for (const o of t.nodi[id]!.opzioni) if (o.next) walk(o.next, d + 1);
    };
    walk(t.inizio, 1);
  });
});
