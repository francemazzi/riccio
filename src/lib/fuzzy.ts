/** Confronto di parole tollerante agli errori di battitura, pensato per l'italiano. */

/** minuscolo, senza accenti né punteggiatura, spazi singoli */
export function fold(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** "scheletro" fonetico: assorbe doppie, k/c/q, ph/f, h muta, y/i */
export function skeleton(word: string): string {
  return word
    .replace(/ph/g, 'f')
    .replace(/ch/g, 'c')
    .replace(/gh/g, 'g')
    .replace(/qu/g, 'cu')
    .replace(/[kq]/g, 'c')
    .replace(/y/g, 'i')
    .replace(/h/g, '')
    .replace(/(.)\1+/g, '$1');
}

/** Damerau-Levenshtein (trasposizioni adiacenti = 1), con soglia: restituisce max+1 se supera `max`. */
export function distance(a: string, b: string, max: number): number {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const m = a.length, n = b.length;
  let prev2: number[] = [];
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    let rowMin = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(prev[j]! + 1, cur[j - 1]! + 1, prev[j - 1]! + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, prev2[j - 2]! + 1);
      cur[j] = v;
      if (v < rowMin) rowMin = v;
    }
    if (rowMin > max) return max + 1;
    prev2 = prev;
    prev = cur;
  }
  return prev[n]!;
}

/** errori ammessi in base alla lunghezza della parola cercata */
export function tolleranza(len: number): number {
  return len <= 3 ? 0 : len <= 7 ? 1 : 2;
}

/**
 * Punteggio 0..1 di `token` rispetto a `word` (entrambi già "fold"):
 * 1 uguale, .92 prefisso, .85 quasi uguale (errori di battitura), .65 contenuto.
 */
export function wordScore(token: string, word: string): number {
  if (!token || !word) return 0;
  if (token === word) return 1;
  if (token.length >= 3 && word.startsWith(token)) return 0.92;
  const sk = skeleton(token), sw = skeleton(word);
  if (sk === sw) return 0.88;
  const tol = tolleranza(sk.length);
  if (tol > 0) {
    const d = distance(sk, sw, tol);
    if (d <= tol) return 0.85 - 0.05 * (d - 1);
    // parola digitata a metà con un errore: confronto con il prefisso di pari lunghezza
    if (sk.length >= 5 && sw.length > sk.length) {
      const dp = distance(sk, sw.slice(0, sk.length), 1);
      if (dp <= 1) return 0.75;
    }
  }
  if (token.length >= 4 && word.includes(token)) return 0.65;
  return 0;
}
