import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { parseCras } from '../src/lib/cras';

const { errors, records } = parseCras(readFileSync(process.env.CRAS_CSV ?? 'data/cras.csv', 'utf8'));
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
mkdirSync('src/generated', { recursive: true });
writeFileSync('src/generated/cras.json', JSON.stringify(records));
console.log(`cras.json: ${records.length} record`);
