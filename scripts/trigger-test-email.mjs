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
    try {
      const envPath = path.resolve('.env');
      if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, 'utf8');
        const match = content.match(/MONITOR_SECRET="?([^"\n\r]+)"?/);
        if (match) token = match[1];
      }
    } catch (e) {}
  }
  if (!token) {
    try {
      const devVarsPath = path.resolve('.dev.vars');
      if (fs.existsSync(devVarsPath)) {
        const content = fs.readFileSync(devVarsPath, 'utf8');
        const match = content.match(/MONITOR_SECRET="?([^"\n\r]+)"?/);
        if (match) token = match[1];
      }
    } catch (e) {}
  }
  if (!token) {
    console.error('Error: Debes definir la variable de entorno MONITOR_SECRET en .env, .dev.vars o entorno para pruebas remotas.');
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

console.log(`Enviando petición a ${baseUrl}/api/send-summary...`);

try {
  const response = await fetch(`${baseUrl}/api/send-summary`, {
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
