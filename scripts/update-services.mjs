import { execSync } from 'child_process';
import { SERVICES } from '../src/services.js';

const dbName = 'fcctp-status-db';
const isRemote = process.argv.includes('--remote');
const target = isRemote ? '--remote' : '--local';

console.log(`Actualizando nombres y descripciones en BD ${isRemote ? 'REMOTA' : 'LOCAL'}...`);

const sqlStatements = SERVICES.map(s => {
  const nameEscaped = s.name.replace(/'/g, "''");
  const descEscaped = (s.description || '').replace(/'/g, "''");
  return `INSERT OR REPLACE INTO services (url, name, description, status) VALUES ('${s.url}', '${nameEscaped}', '${descEscaped}', 'up');`;
}).join(' ');

try {
  execSync(
    `npx wrangler d1 execute ${dbName} ${target} --command="${sqlStatements}"`,
    { stdio: 'inherit' }
  );
  console.log('Servicios actualizados (historial preservado).');
} catch (error) {
  console.error('Error:', error.message);
}
