import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { parseCras } from '../src/lib/cras';
import { cerca, type Gazetteer } from '../src/lib/search';
import { distance, fold, skeleton, wordScore } from '../src/lib/fuzzy';
import comuni from '../src/data/comuni.json';

const lista = parseCras(readFileSync('data/cras.csv', 'utf8')).records;
const gaz = comuni as unknown as Gazetteer;
const nomi = (e: ReturnType<typeof cerca>, n = 3) => e.risultati.slice(0, n).map((r) => r.cras.nome);

describe('fuzzy', () => {
  it('fold toglie accenti e punteggiatura', () => expect(fold("  Città d'Èrba! ")).toBe('citta d erba'));
  it('trasposizioni e doppie', () => {
    expect(distance('guastalla', 'gaustalla', 2)).toBe(1);
    expect(skeleton('guastalla')).toBe(skeleton('guastala'));
  });
  it('wordScore: esatto > prefisso > errore > niente', () => {
    expect(wordScore('modena', 'modena')).toBe(1);
    expect(wordScore('mode', 'modena')).toBeGreaterThan(0.9);
    expect(wordScore('modenna', 'modena')).toBeGreaterThan(0.8);
    expect(wordScore('modena', 'bologna')).toBe(0);
  });
});

describe('ricerca: il dataset reale', () => {
  it('ha centri e comuni', () => {
    expect(lista.length).toBeGreaterThan(50);
    expect(gaz.c.length).toBeGreaterThan(7500);
  });

  it.each(['guastalla', 'Guastalla', 'GUASTALLA!', 'guastala', 'gastalla', 'guastalla  '])('"%s" → posizione Guastalla, centri vicini', (q) => {
    const e = cerca(q, lista, { gaz });
    expect(e.modo).toBe('luogo');
    expect(e.origine?.nome).toBe('Guastalla');
    expect(e.risultati).toHaveLength(lista.length);
    const km = e.risultati.map((r) => r.km!);
    expect(km).toEqual([...km].sort((a, b) => a - b));
    expect(km[0]).toBeLessThan(80);
  });

  it('"pomponescoe" (errore) → Pomponesco, con domanda di conferma', () => {
    const e = cerca('pomponescoe', lista, { gaz });
    expect(e.origine?.nome).toBe('Pomponesco');
    expect(e.risultati.length).toBe(lista.length);
    expect(e.messaggio).toMatch(/Pomponesco/);
  });

  it('un errore su un comune che ha anche un centro non riduce a un solo risultato', () => {
    for (const q of ['modenna', 'modna', 'bolgna', 'torin']) {
      const e = cerca(q, lista, { gaz });
      expect(e.modo).toBe('luogo');
      expect(e.risultati).toHaveLength(lista.length);
    }
  });

  it('il nome di un centro vince sui comuni con nome simile', () => {
    for (const q of ['monte adone', 'il pettirosso', 'vanzago']) {
      const e = cerca(q, lista, { gaz });
      expect(e.risultati.length).toBeGreaterThan(0);
      expect(nomi(e, 1)[0]).toMatch(/Monte Adone|Pettirosso|Vanzago/i);
    }
  });

  it('un nome con più comuni propone le alternative', () => {
    const e = cerca('san giorgio', lista, { gaz });
    expect(e.modo).toBe('luogo');
    expect(e.alternative.length).toBeGreaterThan(0);
  });

  it('nome composto digitato in fretta', () => {
    expect(cerca('san giovanni in persiceto', lista, { gaz }).origine?.nome).toBe('San Giovanni in Persiceto');
    expect(cerca('persiceto', lista, { gaz }).origine?.nome).toMatch(/Persiceto/);
  });

  it('numeri di telefono in vari formati', () => {
    const c = lista.find((x) => /pettirosso/i.test(x.nome))!;
    const num = c.telefoni[0]!.replace('+39', '');
    for (const q of [num, `+39 ${num}`, `${num.slice(0, 3)} ${num.slice(3, 6)} ${num.slice(6)}`, num.slice(0, 6)]) {
      const e = cerca(q, lista, { gaz });
      expect(e.modo).toBe('telefono');
      expect(e.risultati.map((r) => r.cras.id)).toContain(c.id);
    }
  });

  it('nome del centro, anche storpiato', () => {
    for (const q of ['pettirosso', 'petirosso', 'il pettirosso modena']) expect(nomi(cerca(q, lista, { gaz }), 2).join('|')).toMatch(/Pettirosso/);
  });

  it('una provincia o una regione filtra per testo', () => {
    const e = cerca('lombardia', lista, { gaz });
    expect(e.risultati.slice(0, 5).every((r) => r.cras.regione === 'Lombardia')).toBe(true);
  });

  it('"riccio" e "24 ore" da soli ordinano per preferenza, senza svuotare', () => {
    const r = cerca('riccio', lista, { gaz });
    expect(r.risultati.length).toBeGreaterThan(10);
    expect(r.risultati.some((x) => x.cras.accetta_ricci === 'no')).toBe(false);
    const h = cerca('24 ore', lista, { gaz });
    expect(h.risultati[0]!.cras.h24).toBe('si');
    expect(h.risultati).toHaveLength(lista.length);
  });

  it('luogo + preferenza: "guastalla h24" mette prima gli H24 vicini', () => {
    const e = cerca('guastalla h24', lista, { gaz });
    expect(e.origine?.nome).toBe('Guastalla');
    const primoH24 = e.risultati.findIndex((r) => r.cras.h24 === 'si');
    expect(primoH24).toBeLessThan(5);
  });

  it('MAI zero risultati: testo senza senso → ripiego con tutti i centri', () => {
    const e = cerca('xqzvwk', lista, { gaz });
    expect(e.modo).toBe('ripiego');
    expect(e.risultati).toHaveLength(lista.length);
    expect(e.messaggio).toMatch(/Vicino a me|comune/);
  });

  it('ripiego con posizione: i più vicini a te', () => {
    const e = cerca('xqzvwk', lista, { gaz, pos: { lat: 44.65, lon: 10.92 } });
    expect(e.modo).toBe('ripiego');
    expect(e.messaggio).toMatch(/più vicini a te/);
    const km = e.risultati.map((r) => r.km!);
    expect(km).toEqual([...km].sort((a, b) => a - b));
  });

  it('query vuota: tutti, per vicinanza se c\'è la posizione', () => {
    expect(cerca('', lista, { gaz }).risultati).toHaveLength(lista.length);
    const e = cerca('   ', lista, { gaz, pos: { lat: 41.9, lon: 12.5 } });
    const km = e.risultati.map((r) => r.km!);
    expect(km).toEqual([...km].sort((a, b) => a - b));
  });

  it('senza gazzettiere funziona comunque (testo e ripiego)', () => {
    expect(cerca('pettirosso', lista).risultati.length).toBeGreaterThan(0);
    expect(cerca('guastalla', lista).risultati).toHaveLength(lista.length);
  });

  it('lista vuota non esplode', () => {
    expect(cerca('modena', [], { gaz }).risultati).toEqual([]);
  });
});
