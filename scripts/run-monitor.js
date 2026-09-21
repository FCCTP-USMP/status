import { SERVICES } from '../src/services.js';

const isDryRun = process.argv.includes('--dry-run') || process.argv.includes('--preview');
const targetUrl = process.env.WORKER_URL || 'https://fcctp-status.fcctp.workers.dev';
const token = process.env.MONITOR_SECRET;

if (!token && !isDryRun) {
  console.error('Error: MONITOR_SECRET es requerido para autenticarse con el Worker.');
  process.exit(1);
}

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Ejecuta tareas con límite de concurrencia para no saturar servidores compartidos
async function mapConcurrent(items, limit, fn) {
  const results = new Array(items.length);
  let currentIndex = 0;

  async function worker() {
    while (currentIndex < items.length) {
      const index = currentIndex++;
      results[index] = await fn(items[index]);
    }
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

async function checkService(service) {
  const maxAttempts = 3;
  const timeoutMs = 10000; // 10 segundos de timeout por intento
  let lastResult = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const start = Date.now();
    try {
      const response = await fetch(service.url, {
        method: 'GET',
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept':
            'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
          'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
        },
        signal: AbortSignal.timeout(timeoutMs),
      });

      const latency = Date.now() - start;
      const statusCode = response.status;
      const isUp = (statusCode >= 200 && statusCode < 400) || statusCode === 401;
      const statusText = response.statusText ? ` ${response.statusText}` : '';
      const error = isUp ? null : `HTTP ${statusCode}${statusText}`;

      lastResult = { url: service.url, name: service.name, isUp, latency, statusCode, error };

      if (isUp) {
        return lastResult;
      }
      console.log(`[Intento ${attempt}/${maxAttempts}] ${service.name} respondió con código ${statusCode} (${error})`);
    } catch (err) {
      const latency = Date.now() - start;
      const isTimeout = err.name === 'TimeoutError' || err.name === 'AbortError';
      const cause = err.cause;
      const errorMsg = isTimeout
        ? `ETIMEDOUT (${timeoutMs / 1000}s)`
        : (cause?.code || cause?.message || err.message || err.code || 'Error de red');

      lastResult = {
        url: service.url,
        name: service.name,
        isUp: false,
        latency,
        statusCode: null,
        error: errorMsg,
      };
      console.log(`[Intento ${attempt}/${maxAttempts}] Fallo de red en ${service.name}: ${lastResult.error}`);
    }

    if (attempt < maxAttempts) {
      console.log(`Esperando 3 segundos para reintentar ${service.name}...`);
      await delay(3000);
    }
  }

  return lastResult;
}

// Carril exclusivo y secuencial para las 3 revistas (comparten servidor 18.235.189.209)
// Garantiza que NUNCA se consulten en paralelo entre sí.
let journalQueue = Promise.resolve();

async function checkServiceWithLane(service) {
  const isJournal = service.url.includes('revista');

  if (isJournal) {
    // Encadenar en su propio carril secuencial
    const currentPromise = journalQueue.then(async () => {
      console.log(`[Carril Revistas] Verificando ${service.name}...`);
      const res = await checkService(service);
      await delay(500); // Pausa de alivio para el servidor Apache/PHP
      return res;
    });
    journalQueue = currentPromise.catch(() => {});
    return currentPromise;
  }

  return checkService(service);
}

async function run() {
  const startDate = new Date();
  const timestamp = startDate.toISOString();
  const formattedLaunch = startDate.toLocaleString('es-PE', {
    timeZone: 'America/Lima',
    hour12: true,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  console.log(`Iniciando monitoreo de servicios... [${formattedLaunch}]`);

  // Limitar concurrencia general a 4 peticiones en paralelo
  const CONCURRENCY_LIMIT = 4;
  const results = await mapConcurrent(SERVICES, CONCURRENCY_LIMIT, checkServiceWithLane);

  if (isDryRun) {
    const elapsedSeconds = ((Date.now() - startDate.getTime()) / 1000).toFixed(2);
    console.log('\n================== PREVIEW / DRY RUN ==================');
    console.log(`🚀 Fecha y hora de lanzamiento: ${formattedLaunch} (Hora Perú)`);
    console.log(`⏱️  Duración total del chequeo:  ${elapsedSeconds}s`);
    console.log(`📊 Total servicios:              ${results.length}`);
    console.log(`🟢 Activos (UP): ${results.filter((r) => r.isUp).length} | 🔴 Caídos (DOWN): ${results.filter((r) => !r.isUp).length}`);
    console.table(
      results.map((r) => ({
        Servicio: r.name,
        Estado: r.isUp ? '✅ UP' : '❌ DOWN',
        Código: r.statusCode ?? 'N/A',
        Latencia: `${r.latency}ms`,
        Error: r.error || '-',
      }))
    );
    console.log('Modo preview: No se enviaron datos al Cloudflare Worker.');
    return;
  }

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
