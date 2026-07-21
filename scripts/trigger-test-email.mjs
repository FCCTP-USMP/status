import fs from 'fs';
import path from 'path';

const args = process.argv.slice(2);
const isRemote = args.includes('--remote');
const toArg = args.find(arg => arg.startsWith('--to='));
const targetEmail = toArg ? toArg.split('=')[1] : null;

let baseUrl = 'http://localhost:8787';
let token = '';

if (isRemote) {
  baseUrl = 'https://fcctp-status.fcctp.workers.dev';
  token = process.env.MONITOR_SECRET;
  if (!token) {
    console.error('Error: Debes definir la variable de entorno MONITOR_SECRET para pruebas remotas.');
    console.error('Ejemplo: MONITOR_SECRET="tu-token-remoto" npm run test:email:remote -- --to=correo@gmail.com');
    process.exit(1);
  }
} else {
  try {
    const devVarsPath = path.resolve('.dev.vars');
    if (fs.existsSync(devVarsPath)) {
      const content = fs.readFileSync(devVarsPath, 'utf8');
      const match = content.match(/MONITOR_SECRET="?([^"\n\r]+)"?/);
      if (match) token = match[1];
    }
  } catch (err) {
    console.warn('Advertencia al leer .dev.vars:', err.message);
  }

  if (!token) {
    console.error('Error: No se encontró MONITOR_SECRET en el archivo .dev.vars.');
    process.exit(1);
  }
}

console.log(`Enviando petición de prueba a ${baseUrl}/api/trigger-test-email...`);

try {
  const response = await fetch(`${baseUrl}/api/trigger-test-email`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Test-Token': token,
    },
    body: JSON.stringify(targetEmail ? { to: targetEmail } : {}),
  });

  const result = await response.json().catch(() => ({}));
  if (response.ok && result.success) {
    console.log(`✅ Correo enviado con éxito a: ${result.sent_to}`);
  } else {
    console.error(`❌ Error en el envío:`, result.error || response.statusText);
    process.exit(1);
  }
} catch (err) {
  console.error(`❌ Error al conectar con el servidor:`, err.message);
  process.exit(1);
}
