# Riccio · Roadmap di sviluppo

App statica per cittadini che trovano un riccio in difficoltà: **lista CRAS fatta bene + triage in 60 secondi**.
Pubblicata su GitHub Pages. Nessun backend, nessun database: i dati vivono in un CSV nel repo.

## Principi

- Mobile first: chi apre il sito ha un riccio in una scatola e il telefono in mano.
- Un tap per chiamare: ogni centro ha un link `tel:`.
- Dati aggiornabili da chiunque: il CSV si modifica dall'interfaccia di GitHub, la CI valida, la PR si fonde.
- Triage deterministico: albero decisionale scritto con un veterinario o un centro partner. Niente LLM che improvvisa.
- Zero dipendenze non necessarie: HTML, CSS, TypeScript. Librerie esterne solo se motivate (es. mappa).

## Stack

| Cosa | Scelta |
|---|---|
| Linguaggio | TypeScript (strict), HTML, CSS |
| Build | Vite, template `vanilla-ts` |
| Dati | `data/cras.csv`, `data/triage.json` |
| Validazione dati | script TS in `scripts/`, eseguito in CI su ogni PR |
| Hosting | GitHub Pages via GitHub Actions |
| Mappa (fase 3, opzionale) | Leaflet + tile OpenStreetMap |

## Struttura cartelle

```
riccio/
├── data/
│   ├── cras.csv            # fonte di verità per i centri
│   └── triage.json         # albero decisionale
├── public/                 # asset statici (favicon, manifest)
├── scripts/
│   ├── validate-cras.ts    # controlla il CSV
│   └── build-data.ts       # CSV → JSON in src/generated/
├── src/
│   ├── pages/              # cras.html, riccio.html
│   ├── lib/                # csv, geo, triage engine
│   ├── styles/
│   └── main.ts
├── .github/
│   ├── workflows/          # ci.yml, deploy.yml
│   └── ISSUE_TEMPLATE/     # segnala-cras.yml
├── index.html              # landing
├── CONTRIBUTING.md
└── ROADMAP.md
```

## Schema `data/cras.csv`

Una riga per centro. Separatore virgola, UTF-8, header obbligatorio.

| Colonna | Tipo | Note |
|---|---|---|
| `id` | slug | unico, es. `pettirosso-modena` |
| `nome` | testo | |
| `regione` | testo | |
| `provincia` | sigla | es. `MO` |
| `comune` | testo | |
| `indirizzo` | testo | |
| `lat` | decimale | WGS84 |
| `lon` | decimale | WGS84 |
| `telefono` | testo | formato `+39...`, più numeri separati da `;` |
| `orari` | testo | libero, breve |
| `sito` | url | opzionale |
| `accetta_ricci` | `si` / `no` / `?` | |
| `accetta_stalli` | `si` / `no` / `?` | il centro affida ricci a privati formati |
| `note` | testo | opzionale |
| `fonte` | url | da dove viene il dato |
| `verificato_il` | `YYYY-MM-DD` | ultima verifica telefonica |

Regola: un record con `verificato_il` più vecchio di 12 mesi viene mostrato con badge "da verificare".

---

## Fase 0 · Setup repo

- [x] Scaffold Vite `vanilla-ts` nella root del repo
- [x] `tsconfig` strict, `.editorconfig`, `.gitignore`
- [x] Struttura cartelle come sopra
- [x] `.github/workflows/deploy.yml`: build su push a `main`, deploy su GitHub Pages
- [x] `vite.config.ts` con `base: '/riccio/'`
- [x] `README.md`: cosa è, come avviare in locale, link alla roadmap
- [ ] Attivare GitHub Pages nelle impostazioni del repo (source: GitHub Actions)

**Gate:** `npm run build` passa, la Action deploya una pagina vuota raggiungibile.

## Fase 1 · Landing page pubblica

Prima cosa online. Solo contenuto statico, nessun dato dinamico.

- [x] `index.html`: cos'è il progetto in due righe
- [x] Blocco "Hai trovato un riccio?" con le 3 regole (fuori di giorno = emergenza, scatola e calore, chiama un CRAS)
- [x] Blocco "Cosa NON fare" (latte, olio sulle zecche, lasciarlo fuori)
- [x] CTA "Trova un CRAS" e "Fai il triage" (disattivati finché le pagine non esistono)
- [x] Sezione "Contribuisci": link a CONTRIBUTING e al template issue
- [x] CSS mobile first, variabili per colori, `prefers-color-scheme`, font di sistema
- [x] Meta tag OG e favicon
- [ ] Pubblicare

**Gate:** pagina online, leggibile su uno schermo da 360px, Lighthouse accessibilità e performance sopra 90.

## Fase 2 · Dataset CRAS

- [x] `data/cras.csv` con header e 3 righe di esempio reali
- [x] `scripts/validate-cras.ts`: header esatto, `id` unici, lat/lon in Italia, telefono valido, data valida, enum rispettati
- [x] `scripts/build-data.ts`: CSV → `src/generated/cras.json` in fase di build
- [x] `.github/workflows/ci.yml`: esegue validazione su ogni PR che tocca `data/`
- [x] `CONTRIBUTING.md`: come aggiungere o correggere un centro modificando il CSV da GitHub
- [x] `.github/ISSUE_TEMPLATE/segnala-cras.yml`: form per chi non vuole toccare il CSV
- [ ] Raccolta dati: Emilia-Romagna, Lombardia, Piemonte, Veneto
- [ ] Verifica telefonica di ogni record, `verificato_il` compilato
- [x] `npm run data:stale`: elenca i record scaduti

**Gate:** 50 record verificati, CI che blocca una PR con CSV rotto.

## Fase 3 · Lista CRAS per i cittadini

- [x] `src/pages/cras.html`: lista card, una per centro
- [x] Card: nome, comune e provincia, `tel:` grande, orari, badge accetta ricci / stalli, data verifica, link "apri in mappe" (URL OSM o Google Maps, nessuna libreria)
- [x] Filtro per regione e provincia, ricerca testo
- [x] Geolocalizzazione con `navigator.geolocation`: ordina per distanza (Haversine), fallback alla scelta manuale della provincia
- [x] Badge "da verificare" sui record vecchi
- [x] Bottone "segnala errore" che apre una issue precompilata con l'`id`
- [x] Stato vuoto: "nessun centro in zona, chiama il 1515"
- [x] Attivare la CTA sulla landing
- [ ] (opzionale) mappa Leaflet con marker, caricata solo su richiesta

**Gate:** da una posizione nel Nord Italia il primo risultato è corretto e chiamabile in due tap.

## Fase 4 · Triage

- [x] `data/triage.json`: nodi con `id`, `domanda`, `opzioni[{testo, next}]`, esiti con `livello` (`lascialo` / `scalda-e-chiama` / `urgenza`) e `istruzioni`
- [ ] Contenuto scritto con un veterinario o un centro partner. **Senza questa firma la pagina non si pubblica.**
- [x] `src/lib/triage.ts`: motore step by step, tasto indietro, barra avanzamento, nessuno stato in URL durante il percorso
- [x] `src/pages/riccio.html`: 5 domande massimo (giorno o notte, si chiude, peso, mosche o zecche, stagione)
- [x] Schermata esito: livello, istruzioni scatola, CRAS più vicino dalla fase 3
- [x] Esito condivisibile: URL con `?esito=urgenza`, meta OG dedicati
- [x] Validazione dello schema `triage.json` in CI (nessun nodo orfano, ogni percorso termina in un esito)
- [x] Attivare la CTA sulla landing

**Gate:** il partner conferma che chi arriva dal triage è preparato meglio.

## Fase 5 · Qualità e manutenzione

- [ ] PWA: `manifest.json`, service worker, lista e triage funzionano offline
- [ ] Action mensile che apre una issue con i record scaduti
- [ ] Accessibilità: navigazione da tastiera, contrasti, `aria` sui bottoni
- [ ] Test del motore triage e della validazione CSV (Vitest)
- [ ] Analytics solo se privacy friendly e senza cookie, altrimenti nessuna
- [ ] Governance: dominio e dati intestati a un'associazione, repo con almeno un secondo manutentore

---

## Fuori scope per ora

Bot WhatsApp, strumenti gestionali per i centri, dataset nazionale sulla mortalità, bilancia-nido hardware.
Tornano in roadmap solo se un centro partner li chiede.
