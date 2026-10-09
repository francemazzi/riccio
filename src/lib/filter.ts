import type { Cras } from './cras';
import { statoVerifica } from './cras';
import { haversine, type Point } from './geo';
import { fold } from './fuzzy';

export type SortKey = 'nome' | 'comune' | 'provincia' | 'regione' | 'distanza';

/** Filtri "avanzati" (precisi): la ricerca libera è in search.ts */
export interface Filtri {
  regione: string;
  provincia: string;
  soloRicci: boolean;
  soloVerificati: boolean;
  soloH24: boolean;
  soloFontePrimaria: boolean;
}

export const FILTRI_VUOTI: Filtri = { regione: '', provincia: '', soloRicci: false, soloVerificati: false, soloH24: false, soloFontePrimaria: false };

export const norm = fold;

export function filtra(lista: Cras[], f: Filtri, oggi?: Date): Cras[] {
  return lista.filter((c) => {
    if (f.regione && c.regione !== f.regione) return false;
    if (f.provincia && c.provincia !== f.provincia) return false;
    if (f.soloRicci && c.accetta_ricci === 'no') return false;
    if (f.soloH24 && c.h24 !== 'si') return false;
    if (f.soloFontePrimaria && c.fonte_tipo !== 'primaria') return false;
    if (f.soloVerificati && statoVerifica(c.verificato_il, oggi) !== 'verificato') return false;
    return true;
  });
}

export function ordina(lista: Cras[], key: SortKey, desc = false, pos?: Point): Cras[] {
  const dir = desc ? -1 : 1;
  const cmp = (a: Cras, b: Cras): number => {
    if (key === 'distanza') {
      if (!pos) return 0;
      return haversine(pos, a) - haversine(pos, b);
    }
    return a[key].localeCompare(b[key], 'it');
  };
  return [...lista].sort((a, b) => dir * cmp(a, b) || a.nome.localeCompare(b.nome, 'it'));
}

export function valoriUnici(lista: Cras[], k: 'regione' | 'provincia', regione = ''): string[] {
  const set = new Set(lista.filter((c) => !regione || c.regione === regione).map((c) => c[k]));
  return [...set].sort((a, b) => a.localeCompare(b, 'it'));
}
