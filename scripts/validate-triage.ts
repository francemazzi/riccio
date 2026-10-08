import { readFileSync } from 'node:fs';
import { validateTriage, type Triage } from '../src/lib/triage';

const file = process.argv[2] ?? 'data/triage.json';
let errors: string[];
try {
  errors = validateTriage(JSON.parse(readFileSync(file, 'utf8')) as Triage);
} catch (e) {
  errors = [`JSON non valido: ${(e as Error).message}`];
}
if (errors.length) {
  console.error(`✖ ${file}: ${errors.length} errori`);
  errors.forEach((e) => console.error('  - ' + e));
  process.exit(1);
}
console.log(`✔ ${file}: albero valido`);
