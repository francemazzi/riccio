# Fonti del dataset `cras.csv`

Dati letti il **2026-10-08**. Nessuna verifica telefonica è stata fatta: `verificato_il` è vuoto e il sito mostra "Da verificare".

## Come si costruisce un record
1. Elenco generale di **elencocras.it** (fonte di terzi: "dati recuperati dal web, non garantiti"): 90 schede di dettaglio.
2. Letti **documenti ufficiali** e pagine dei singoli centri (vedi sotto) per confermare telefoni, orari, zone servite.
3. Regola dei numeri: un telefono entra in `telefono` solo se è **riletto nella pagina indicata in `fonte`**. Gli altri numeri citati da fonti diverse stanno in `note` come "non confermati".
4. `fonte_tipo = primaria` se il numero è su un documento ufficiale o sul sito del centro; `secondaria` se viene solo da elenchi (LIPU, elencocras).
5. Coordinate: Nominatim/OpenStreetMap sull'indirizzo (`precisione_coord = indirizzo`) o sul comune (`comune`: da trattare come approssimate).
6. Esclusi (vedi `candidati/esclusi.csv` col motivo): centri chiusi, solo rapaci/uccelli/tartarughe/cetacei, servizi di sola informazione o trasporto, record senza numero ritrovato nella fonte.

## Documenti e pagine ufficiali letti
- Emilia-Romagna, elenco CRAS (aggiornato 12/05/2026): https://agricoltura.regione.emilia-romagna.it/fauna-e-caccia/fauna/centri-recupero-animali-selvatici (8 centri, con territori, H24, modalità)
- Lombardia, pagina Regione + ZIP allegato con "Elenco CRAS in Lombardia.pdf" (22/02/2022; nessun telefono) e DGR 3692/2020, 3932/2020, 253/2023, 2011/2024: https://www.regione.lombardia.it/agricoltura/fauna-selvatica-e-caccia/autorizzazione-istituzione-centri-recupero-animali-selvatici-(cras)
- Piemonte, DGR 13-2180 del 30/10/2020 (BU45 05/11/2020) e pagina Regione "CRAS": rete regionale (nessun telefono nella DGR)
- Valle d'Aosta, pagina Regione: https://www.regione.vda.it/risorsenaturali/Fauna_selvatica/cras_i.aspx
- Friuli-Venezia Giulia, pagina Regione (29/04/2025) con i riferimenti per territorio
- Trentino, pagina della Provincia sul CRAS di Trento (gestito dalla Provincia dal 2023)
- Puglia, Osservatorio Faunistico Regionale: https://foreste.regione.puglia.it/osservatorio-faunistico-regionale
- Umbria, comunicato Assemblea legislativa 25/06/2026 (CRAS affidato a WildUmbria); Marche, nota Provincia di Pesaro e Urbino (DGR 1750/2018)
- Siti dei centri: WWF Vanzago e Valpredina, LIPU (La Fagiana, Tigliole, Roma, CRUMA, Mugello, Ficuzza), Parcobaleno, Rifugio Miletta, La Ninna, Parco Gallipoli Cognato, WildUmbria, Carabinieri (rgpbio.it), Parchi Lazio, ecc.
- Elenchi LIPU "Animali feriti" per regione: https://animaliferiti.lipu.it/ (associazione, non atto regionale)

## Non raggiunto / non verificato
- Nessun elenco ufficiale trovato per: Veneto, Liguria, Toscana, Lazio, Abruzzo, Molise, Campania, Basilicata, Calabria, Sicilia, Sardegna (dati da LIPU, elencocras o sito del centro).
- Host non raggiungibili dall'ambiente di raccolta: regione.campania.it (403), enpa.it (403), crabolzano.org, forestas.it, e vari siti di singoli centri; pagine Facebook non leggibili.
- Il sito di Naturabilia (Ameglia) risultava con contenuti spam: non viene linkato.

## Discrepanze note tra fonti
Registrate nel campo `note` di ogni record (es. Vanzago: numero vecchio 02 93549076 vs 366 9765549 sul sito; Tigliole d'Asti, Bitetto, Calimera, Roseto Valfortore, Prato).
