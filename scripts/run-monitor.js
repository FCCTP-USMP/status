import { SERVICES } from '../src/services.js';

const targetUrl = process.env.WORKER_URL || 'https://fcctp-status.fcctp.workers.dev';
const token = process.env.MONITOR_SECRET;

if (!token) {
  console.error('Error: MONITOR_SECRET es requerido para autenticarse con el Worker.');
  process.exit(1);
}

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function checkService(service) {
  const maxAttempts = 3;
  let lastResult = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const start = Date.now();
    try {
      const response = await fetch(service.url, {
        method: 'GET',
        headers: { 'User-Agent': 'FCCTP Status Bot' },
      });
      const latency = Date.now() - start;
      const statusCode = response.status;
      const isUp = (statusCode >= 200 && statusCode < 400) || statusCode === 401;
      lastResult = { url: service.url, name: service.name, isUp, latency, statusCode, error: null };

      if (isUp) {
        return lastResult;
      }
      console.log(`[Intento ${attempt}/${maxAttempts}] ${service.name} respondió con código ${statusCode}`);
    } catch (err) {
      const latency = Date.now() - start;
      lastResult = {
        url: service.url,
        name: service.name,
        isUp: false,
        latency,
        statusCode: null,
        error: err.name === 'TimeoutError' ? 'ETIMEDOUT' : err.message || err.code,
      };
      console.log(`[Intento ${attempt}/${maxAttempts}] Fallo de red/timeout en ${service.name}: ${lastResult.error}`);
    }

    if (attempt < maxAttempts) {
      console.log(`Esperando 5 segundos para reintentar ${service.name}...`);
      await delay(5000);
    }
  }

  return lastResult;
}

async function run() {
  console.log('Iniciando monitoreo de servicios...');
  const timestamp = new Date().toISOString();

  const results = await Promise.all(SERVICES.map(checkService));

  console.log('Enviando resultados al Cloudflare Worker...');
  try {
    const response = await fetch(`${targetUrl}/api/update-status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Auth-Token': token,
      },
      body: JSON.stringify({ timestamp, results }),
    });

    const body = await response.text();
    if (response.ok) {
      console.log('Estado actualizado con éxito:', body);
    } else {
      console.error('Error al actualizar estado:', response.status, body);
      process.exit(1);
    }
  } catch (error) {
    console.error('Error de red al enviar el reporte:', error.message);
    process.exit(1);
  }
}

run();
