import { readFileSync } from 'node:fs';
import { parseCras, statoVerifica } from '../src/lib/cras';

const { records } = parseCras(readFileSync('data/cras.csv', 'utf8'));
const stale = records.filter((r) => statoVerifica(r.verificato_il) === 'da-verificare');
console.log(`${stale.length}/${records.length} record da verificare`);
for (const r of stale) console.log(`- ${r.id} (${r.comune} ${r.provincia}) verificato_il=${r.verificato_il || 'mai'}`);
