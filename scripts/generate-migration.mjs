import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { SERVICES } from '../src/services.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outPath = path.resolve(__dirname, '..', 'migrate.sql');

const sqlLines = SERVICES.map(s => {
  const nameEscaped = s.name.replace(/'/g, "''");
  const descEscaped = (s.description || '').replace(/'/g, "''");
  return `INSERT OR REPLACE INTO services (url, name, description, status) VALUES ('${s.url}', '${nameEscaped}', '${descEscaped}', 'up');`;
});

fs.writeFileSync(outPath, sqlLines.join('\n') + '\n', 'utf-8');
console.log(`migrate.sql generado dinamicamente con ${SERVICES.length} servicios.`);
