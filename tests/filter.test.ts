import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { parseCras } from '../src/lib/cras';
import { FILTRI_VUOTI, filtra, ordina, valoriUnici } from '../src/lib/filter';
import { haversine } from '../src/lib/geo';

const { records } = parseCras(readFileSync('tests/fixtures/cras-esempio.csv', 'utf8'));
const oggi = new Date('2026-10-08T00:00:00Z');

describe('filtra (filtri avanzati)', () => {
  it('senza filtri restituisce tutto', () => expect(filtra(records, FILTRI_VUOTI)).toHaveLength(records.length));
  it('regione e provincia', () => {
    expect(filtra(records, { ...FILTRI_VUOTI, regione: 'Piemonte' })).toHaveLength(2);
    expect(filtra(records, { ...FILTRI_VUOTI, regione: 'Piemonte', provincia: 'CN' })).toHaveLength(1);
  });
  it('solo che accettano ricci esclude i "no"', () => {
    const r = filtra(records, { ...FILTRI_VUOTI, soloRicci: true });
    expect(r.some((c) => c.accetta_ricci === 'no')).toBe(false);
  });
  it('filtra H24 e fonti ufficiali', () => {
    expect(filtra(records, { ...FILTRI_VUOTI, soloH24: true }).map((c) => c.id)).toEqual(['esempio-bologna']);
    expect(filtra(records, { ...FILTRI_VUOTI, soloFontePrimaria: true }).map((c) => c.id)).toEqual(['esempio-modena']);
  });
  it('solo verificati considera la scadenza a 12 mesi', () => {
    const ids = filtra(records, { ...FILTRI_VUOTI, soloVerificati: true }, oggi).map((c) => c.id).sort();
    expect(ids).toEqual(['esempio-bergamo', 'esempio-cuneo', 'esempio-modena', 'esempio-palermo']);
  });
});

describe('ordina e geo', () => {
  it('ordina per comune', () => {
    const n = ordina(records, 'comune').map((c) => c.comune);
    expect(n).toEqual([...n].sort((a, b) => a.localeCompare(b, 'it')));
  });
  it('haversine Milano-Roma ≈ 477 km', () => {
    const d = haversine({ lat: 45.4642, lon: 9.19 }, { lat: 41.9028, lon: 12.4964 });
    expect(d).toBeGreaterThan(470);
    expect(d).toBeLessThan(485);
  });
  it('per distanza da Modena il primo è Modena, poi Bologna', () => {
    const r = ordina(records, 'distanza', false, { lat: 44.65, lon: 10.92 });
    expect(r.slice(0, 2).map((c) => c.id)).toEqual(['esempio-modena', 'esempio-bologna']);
  });
  it('valori unici di provincia filtrati per regione', () => {
    expect(valoriUnici(records, 'provincia', 'Veneto')).toEqual(['PD', 'VR']);
  });
});
