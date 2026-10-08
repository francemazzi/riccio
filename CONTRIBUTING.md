# Contribuire

I dati dei centri sono in [`data/cras.csv`](data/cras.csv): una riga per centro.

## Aggiungere o correggere un centro (da GitHub)
1. Apri `data/cras.csv` e clicca la matita ("Edit this file").
2. Modifica o aggiungi una riga rispettando le colonne (vedi sotto).
3. "Propose changes": si apre una pull request; la CI controlla il formato.

Non vuoi toccare il CSV? Usa il [modulo "Segnala un CRAS"](../../issues/new?template=segnala-cras.yml).

## Colonne
`id,nome,regione,provincia,comune,indirizzo,lat,lon,telefono,orari,sito,accetta_ricci,accetta_stalli,note,fonte,verificato_il`

- `id`: slug minuscolo unico (`pettirosso-modena`).
- `provincia`: sigla (`MO`). `lat`/`lon`: WGS84, dentro l'Italia.
- `telefono`: `+39...`, più numeri separati da `;`.
- `accetta_ricci` / `accetta_stalli`: `si`, `no` o `?`.
- `fonte`: URL da cui viene il dato (obbligatorio).
- `verificato_il`: `YYYY-MM-DD` **solo** se hai telefonato o confermato di persona. Lascialo vuoto altrimenti: il centro viene mostrato come "da verificare". Oltre 12 mesi diventa di nuovo "da verificare".

## In locale
```bash
npm ci
npm run validate     # controlla il CSV
npm run data:stale   # elenca i record da verificare
npm test
```
