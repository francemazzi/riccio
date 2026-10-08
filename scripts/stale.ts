import { readFileSync } from 'node:fs';
import { parseCras, statoVerifica } from '../src/lib/cras';

const md = process.argv.includes('--md');
const { records } = parseCras(readFileSync('data/cras.csv', 'utf8'));
const stale = records.filter((r) => statoVerifica(r.verificato_il) === 'da-verificare');

if (md) {
  if (!stale.length) process.exit(0); // nessun output = niente issue
  console.log(`${stale.length} centri su ${records.length} non verificati da oltre 12 mesi (o mai verificati).\n`);
  console.log('Telefona, poi aggiorna `verificato_il` in `data/cras.csv` (vedi CONTRIBUTING.md).\n');
  for (const r of stale) {
    console.log(`- [ ] **${r.nome}** (${r.comune} ${r.provincia}) · ${r.telefoni.join(' / ')} · ultima verifica: ${r.verificato_il || 'mai'} · \`${r.id}\``);
  }
} else {
  console.log(`${stale.length}/${records.length} record da verificare`);
  for (const r of stale) console.log(`- ${r.id} (${r.comune} ${r.provincia}) verificato_il=${r.verificato_il || 'mai'}`);
}
