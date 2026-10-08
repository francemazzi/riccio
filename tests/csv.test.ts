import { describe, expect, it } from 'vitest';
import { parseCsv, toCsv } from '../src/lib/csv';
import { HEADER, parseCras, statoVerifica } from '../src/lib/cras';

const h = HEADER.join(',');
const ok = 'a-b,Nome,Emilia-Romagna,MO,Modena,Via 1,44.6,10.9,+39059123456,,,si,?,,https://x.it,';

describe('csv', () => {
  it('gestisce apici e virgole', () => {
    expect(parseCsv('a,"b,c","d""e"\n1,2,3\n')).toEqual([['a', 'b,c', 'd"e'], ['1', '2', '3']]);
  });
  it('round trip', () => {
    const rows = [['a', 'x,y'], ['"q"', 'z']];
    expect(parseCsv(toCsv(rows))).toEqual(rows);
  });
  it('apici non chiusi → errore', () => {
    expect(() => parseCsv('a,"b\n')).toThrow();
  });
});

describe('validazione CRAS', () => {
  it('accetta un record valido', () => {
    const r = parseCras(`${h}\n${ok}\n`);
    expect(r.errors).toEqual([]);
    expect(r.records[0]?.telefoni).toEqual(['+39059123456']);
  });
  it('header errato', () => {
    expect(parseCras('id,nome\n').errors[0]).toMatch(/Header/);
  });
  it('id duplicato', () => {
    expect(parseCras(`${h}\n${ok}\n${ok}\n`).errors.join()).toMatch(/duplicato/);
  });
  it('coordinate fuori Italia', () => {
    expect(parseCras(`${h}\n${ok.replace('44.6,10.9', '10,10')}\n`).errors.join()).toMatch(/fuori dall'Italia/);
  });
  it('telefono, enum e data', () => {
    const bad = ok.replace('+39059123456', '059123').replace(',si,?,', ',boh,?,').replace(/,$/, ',2026-13-45');
    const e = parseCras(`${h}\n${bad}\n`).errors.join('\n');
    expect(e).toMatch(/telefono/);
    expect(e).toMatch(/accetta_ricci/);
    expect(e).toMatch(/verificato_il/);
  });
});

describe('stato verifica', () => {
  const oggi = new Date('2026-10-08T00:00:00Z');
  it('vuoto = da verificare', () => expect(statoVerifica('', oggi)).toBe('da-verificare'));
  it('recente = verificato', () => expect(statoVerifica('2026-03-01', oggi)).toBe('verificato'));
  it('oltre 12 mesi = da verificare', () => expect(statoVerifica('2025-10-07', oggi)).toBe('da-verificare'));
});
