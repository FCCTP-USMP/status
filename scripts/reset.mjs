import { execSync } from 'child_process';
import { SERVICES } from '../src/services.js';

const dbName = 'fcctp-status-db';

function runReset(isRemote) {
  const target = isRemote ? '--remote' : '--local';
  console.log(`Reseteando base de datos ${isRemote ? 'REMOTA' : 'LOCAL'}...`);

  try {
    console.log('- Eliminando tablas existentes...');
    execSync(`npx wrangler d1 execute ${dbName} ${target} --command="DROP TABLE IF EXISTS latency_checks; DROP TABLE IF EXISTS daily_uptime; DROP TABLE IF EXISTS incidents; DROP TABLE IF EXISTS services;"`, { stdio: 'inherit' });

    console.log('- Recreando esquema...');
    execSync(`npx wrangler d1 execute ${dbName} ${target} --file=./schema.sql`, { stdio: 'inherit' });

    console.log('- Insertando servicios iniciales...');
    const sqlStatements = SERVICES.map(s => {
      const nameEscaped = s.name.replace(/'/g, "''");
      const descEscaped = (s.description || '').replace(/'/g, "''");
      return `INSERT OR REPLACE INTO services (url, name, description, status) VALUES ('${s.url}', '${nameEscaped}', '${descEscaped}', 'up');`;
    }).join(' ');

    execSync(`npx wrangler d1 execute ${dbName} ${target} --command="${sqlStatements}"`, { stdio: 'inherit' });

    console.log(`\nBase de datos ${isRemote ? 'REMOTA' : 'LOCAL'} reseteada con exito.\n`);
  } catch (error) {
    console.error(`Error reseteando base de datos ${isRemote ? 'REMOTA' : 'LOCAL'}:`, error.message);
  }
}

const isRemote = process.argv.includes('--remote');
runReset(isRemote);
