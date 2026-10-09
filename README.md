# Riccio 🦔

App statica per cittadini che trovano un riccio in difficoltà: **lista CRAS + triage in 60 secondi**.
Nessun backend, nessun cookie, nessuna analytics: i dati vivono in `data/cras.csv` e `data/triage.json`.

- **Trova un CRAS**: una sola casella di ricerca che capisce comuni (anche con errori di battitura: «guastala», «pomponescoe»), nomi dei centri, numeri di telefono e parole come «24 ore» o «riccio». Se scrivi un comune ordina i centri per vicinanza; non restituisce mai zero risultati. Tabella (desktop) e card (mobile), filtri avanzati richiudibili, «Vicino a me» con geolocalizzazione (la posizione resta nel browser) e pannello mappa (dal basso su mobile, da destra su desktop).
- **Triage**: al massimo 5 domande, esito `urgenza` / `scalda-e-chiama` / `lascialo`, link condivisibile (`?esito=urgenza`), centro più vicino.
- **Come sta il riccio?**: guida ai segni (zecche, mosche, respiro, peso…) filtrabile per sintomo e livello.
- Funziona offline dopo la prima visita (PWA), tema chiaro/scuro, accessibile (axe-core a zero violazioni).

Roadmap: [ROADMAP.md](ROADMAP.md) · Contribuire: [CONTRIBUTING.md](CONTRIBUTING.md)

## Stato dei dati
- `data/cras.csv`: **84 centri** in 18 regioni, letti da documenti ufficiali (Regioni, PDF, siti dei centri) e da elenchi di terzi (LIPU, elencocras.it). Ogni record ha la `fonte`, la data di lettura e il tipo di fonte (primaria/secondaria); il telefono è incluso solo se riletto nella fonte indicata. **Nessuna verifica telefonica**: tutti i centri sono mostrati come "Da verificare". Dettagli e limiti in [`data/FONTI.md`](data/FONTI.md).
- `data/candidati/esclusi.csv`: centri trovati ma non inclusi, con il motivo.
- `data/triage.json` è una **bozza da linee guida pubbliche, in attesa di revisione veterinaria** (`"revisionato": false`): la pagina mostra l'avviso finché non viene firmato. Dopo la revisione, impostare `revisionato: true`.
- `tests/fixtures/cras-esempio.csv`: dati fittizi (`[ESEMPIO]`, telefoni `+3900000…`) usati solo da test ed E2E.

## Avvio in locale
```bash
npm ci
npm run dev        # http://localhost:5173/riccio/
npm run validate   # valida CSV e albero del triage
npm test           # unit test (Vitest)
npm run e2e        # build con dati di esempio + Playwright (mobile/desktop, offline, axe)
npm run data:stale # record da verificare (mai o oltre 12 mesi)
npm run build      # build in dist/ (genera anche src/generated/cras.json e sw.js)
```
Gli E2E usano Chromium già installato (`/opt/pw-browsers/chromium`).

## Struttura
`index.html`, `cras.html`, `riccio.html` (pagine, alla radice per avere URL puliti su Pages) · `src/pages/*.ts` · `src/lib/` (csv, cras, filter, geo, triage, icone) · `scripts/` (validazioni e build dati) · `.github/workflows/` (`ci`, `deploy`, `stale`).

## Deploy
Push su `main` → GitHub Actions → GitHub Pages. **Azione manuale richiesta**: Settings → Pages → Source: *GitHub Actions*.

## Privacy
Nessuna analytics, nessun cookie, nessun tracciamento. La geolocalizzazione è usata solo nel browser per ordinare i centri.

## Governance (da completare)
Aperto: intestare dominio e dati a un'associazione e avere almeno un secondo manutentore. Finché non c'è, il progetto è mantenuto a titolo personale e **non è un servizio di emergenza**.

## Licenza
MIT.
