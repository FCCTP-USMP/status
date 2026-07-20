import { execSync } from 'child_process';

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
    execSync(`npx wrangler d1 execute ${dbName} ${target} --file=./migrate.sql`, { stdio: 'inherit' });

    console.log(`\nBase de datos ${isRemote ? 'REMOTA' : 'LOCAL'} reseteada con exito.\n`);
  } catch (error) {
    console.error(`Error reseteando base de datos ${isRemote ? 'REMOTA' : 'LOCAL'}:`, error.message);
  }
}

const isRemote = process.argv.includes('--remote');
runReset(isRemote);
