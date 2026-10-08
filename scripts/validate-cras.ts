import { readFileSync } from 'node:fs';
import { parseCras } from '../src/lib/cras';

const file = process.argv[2] ?? 'data/cras.csv';
const { errors, records } = parseCras(readFileSync(file, 'utf8'));
if (errors.length) {
  console.error(`✖ ${file}: ${errors.length} errori`);
  errors.forEach((e) => console.error('  - ' + e));
  process.exit(1);
}
console.log(`✔ ${file}: ${records.length} record validi`);
