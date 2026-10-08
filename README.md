# Riccio 🦔

App statica per cittadini che trovano un riccio in difficoltà: **lista CRAS + triage in 60 secondi**.
Nessun backend: i dati vivono in `data/cras.csv` e `data/triage.json`.

Roadmap: [ROADMAP.md](ROADMAP.md) · Contribuire: [CONTRIBUTING.md](CONTRIBUTING.md)

## Avvio in locale
```bash
npm ci
npm run dev        # http://localhost:5173/riccio/
npm run validate   # valida CSV e triage
npm test           # unit test
npm run build      # build in dist/
```

## Deploy
Push su `main` → GitHub Actions → GitHub Pages (Settings → Pages → Source: GitHub Actions).
