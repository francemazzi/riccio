# Gazzettiere dei comuni (`src/data/comuni.json`)

Serve alla ricerca: chi scrive "guastalla" (anche con errori) vede i centri più vicini a quel comune. Il file è generato una tantum, non a ogni build.

Fonti:
- elenco dei 7.904 comuni (nome, sigla, provincia): ISTAT, via https://github.com/opendatasicilia/comuni-italiani (`comuni.csv`)
- coordinate: **GeoNames** (https://download.geonames.org/export/dump/IT.zip, licenza CC BY 4.0), abbinate per nome e sigla di provincia → 7.665 comuni
- 235 comuni accorpati di recente: **OpenStreetMap / Nominatim** (© OpenStreetMap contributors, ODbL), 1 richiesta al secondo
- restano senza coordinate: San Giorio di Susa, Valchiusa, Gattico-Veruno, Carezzano

Rigenerare (cartella di lavoro con `comuni.csv` e `geonames/IT.txt`):
```bash
export GAZ_DIR=/percorso/di/lavoro   # contiene gaz/comuni.csv e gaz/geonames/IT.txt
python3 scripts/gazetteer/1_abbina_geonames.py
python3 scripts/gazetteer/2_completa_nominatim.py
python3 scripts/gazetteer/3_impacchetta.py     # scrive src/data/comuni.json
```
Formato: `{"c": [[nome, sigla, lat, lon], …], "p": {"MO": "Modena", …}}`.
