import type { Cras } from './cras';
import { statoVerifica } from './cras';
import { haversine, type Point } from './geo';

export type Campo = 'tutti' | 'nome' | 'comune' | 'provincia' | 'regione';
export type SortKey = 'nome' | 'comune' | 'provincia' | 'regione' | 'distanza';

export interface Filtri {
  q: string;
  campo: Campo;
  regione: string;
  provincia: string;
  soloRicci: boolean;
  soloVerificati: boolean;
  soloH24: boolean;
  soloFontePrimaria: boolean;
}

export const FILTRI_VUOTI: Filtri = { q: '', campo: 'tutti', regione: '', provincia: '', soloRicci: false, soloVerificati: false, soloH24: false, soloFontePrimaria: false };

export function norm(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

function haystack(c: Cras, campo: Campo): string {
  if (campo === 'tutti') return norm([c.nome, c.comune, c.provincia, c.regione, c.indirizzo, c.note, c.territorio, c.animali_accettati, c.ente].join(' '));
  return norm(c[campo]);
}

export function filtra(lista: Cras[], f: Filtri, oggi?: Date): Cras[] {
  const tokens = norm(f.q).split(/\s+/).filter(Boolean);
  return lista.filter((c) => {
    if (f.regione && c.regione !== f.regione) return false;
    if (f.provincia && c.provincia !== f.provincia) return false;
    if (f.soloRicci && c.accetta_ricci === 'no') return false;
    if (f.soloH24 && c.h24 !== 'si') return false;
    if (f.soloFontePrimaria && c.fonte_tipo !== 'primaria') return false;
    if (f.soloVerificati && statoVerifica(c.verificato_il, oggi) !== 'verificato') return false;
    if (!tokens.length) return true;
    const h = haystack(c, f.campo);
    return tokens.every((t) => h.includes(t));
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
