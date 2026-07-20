import { SERVICES } from './services.js';
import { sendEmail } from './smtp.js';

const LIMA_TZ = 'America/Lima';

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function getLimaDate(date) {
  const now = date || new Date();
  const opts = { timeZone: LIMA_TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false };
  const parts = new Intl.DateTimeFormat('es-PE', opts).formatToParts(now);
  const get = (type) => parseInt(parts.find((p) => p.type === type)?.value || '0', 10);
  return { year: get('year'), month: get('month'), day: get('day'), hour: get('hour'), minute: get('minute'), second: get('second'), iso: now.toISOString() };
}

function getLimaDateKey(date) {
  const d = getLimaDate(date);
  return `${d.year}-${String(d.month).padStart(2, '0')}-${String(d.day).padStart(2, '0')}`;
}

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

async function checkService(service) {
  const maxAttempts = 3;
  let lastResult = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const start = Date.now();
    try {
      const response = await fetch(service.url, {
        method: 'GET',
        signal: AbortSignal.timeout(10000),
        redirect: 'follow',
      });
      const latency = Date.now() - start;
      const statusCode = response.status;
      const isUp = (statusCode >= 200 && statusCode < 400) || statusCode === 401;
      lastResult = { isUp, latency, statusCode, error: null };

      if (isUp) {
        return lastResult;
      }
      console.log(`[Intento ${attempt}/${maxAttempts}] ${service.name} respondió con código HTTP ${statusCode}`);
    } catch (err) {
      const latency = Date.now() - start;
      lastResult = {
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

async function sendEmailAlert(env, subject, html) {
  if (!env.NOTIFICATION_EMAIL) {
    console.log('Email not configured, skipping');
    return;
  }

  try {
    await sendEmail({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
      from: env.SMTP_USER,
      to: env.NOTIFICATION_EMAIL,
      subject,
      html,
    });
    console.log(`Email sent: ${subject}`);
  } catch (err) {
    console.log(`Failed to send email: ${err.message}`);
  }
}

function buildSummaryEmail(changes, downServices, isReminder) {
  const hasDown = downServices.length > 0;
  const color = hasDown ? '#dc2626' : '#16a34a';
  const emoji = hasDown ? '🔴' : '✅';
  const title = isReminder
    ? `Recordatorio: ${downServices.length} servicio(s) aún caído(s)`
    : hasDown
      ? 'Alerta: Servicios Caídos (Resumen)'
      : 'Recuperación: Todos los servicios operativos';

  const now = new Date().toLocaleString('es-PE', { timeZone: LIMA_TZ });

  let html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; -webkit-text-size-adjust: none;">
  <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px 0;">
    <div style="background: ${color}; color: white; padding: 24px; border-radius: 12px 12px 0 0;">
      <h1 style="margin: 0; font-size: 20px; font-weight: bold;">${emoji} ${title}</h1>
      <p style="margin: 8px 0 0; opacity: 0.9; font-size: 14px;">${now}</p>
    </div>
    <div style="background: #ffffff; padding: 24px;">
  `;

  if (changes.length > 0 && !isReminder) {
    html += `
      <h3 style="margin-top: 0; color: #111827; border-bottom: 2px solid #f3f4f6; padding-bottom: 8px;">Cambios Recientes</h3>
      <ul style="padding-left: 20px; color: #374151; line-height: 1.6; margin-bottom: 24px;">
    `;
    for (const c of changes) {
      const statusLabel = c.status === 'down'
        ? '<span style="color: #dc2626; font-weight: bold;">CAÍDO</span>'
        : '<span style="color: #16a34a; font-weight: bold;">RECUPERADO</span>';
      const detail = c.status === 'down'
        ? `(Error: ${c.error || 'Sin respuesta'})`
        : `(Inactividad: ${c.duration} min)`;
      html += `<li><strong>${c.service.name}</strong>: ${statusLabel} ${detail}</li>`;
    }
    html += `</ul>`;
  }

  if (hasDown) {
    html += `
      <h3 style="margin-top: 0; color: #111827; border-bottom: 2px solid #f3f4f6; padding-bottom: 8px;">Servicios Caídos</h3>
      <table style="width: 100%; border-collapse: collapse; margin-top: 12px;">
        <thead>
          <tr style="background: #f9fafb; text-align: left; font-size: 12px; color: #6b7280; border-bottom: 1px solid #e5e7eb;">
            <th style="padding: 8px 12px;">Servicio</th><th style="padding: 8px 12px;">URL</th><th style="padding: 8px 12px;">Error</th>
          </tr>
        </thead>
        <tbody style="font-size: 14px; color: #374151;">
    `;
    for (const s of downServices) {
      html += `
        <tr style="border-bottom: 1px solid #f3f4f6;">
          <td style="padding: 8px 12px; font-weight: bold;">${s.name}</td>
          <td style="padding: 8px 12px;"><a href="${s.url}" style="color: #2563eb; text-decoration: none;">${s.url}</a></td>
          <td style="padding: 8px 12px; color: #ef4444; font-family: monospace; font-size: 12px;">${s.error_message || 'Sin respuesta'}</td>
        </tr>
      `;
    }
    html += `</tbody></table>`;
  }

  html += `
    </div>
    <div style="background: #f9fafb; padding: 16px 24px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #9ca3af; text-align: center; line-height: 1.5;">
      Este es un mensaje automático del sistema de monitoreo de FCCTP Status.<br>
      Para consultas, contacta al administrador del sistema.
    </div>
  </div>
</body>
</html>`;
  return html;
}

async function handleScheduled(event, env, ctx) {
  console.log('Starting monitoring check...');
  const db = env.fcctp_status_db;
  const lima = getLimaDate();
  const now = lima.iso;
  const currentHour = lima.hour;
  const dailyKey = getLimaDateKey();
  const changes = [];

  const { results: existingRows } = await db.prepare('SELECT * FROM services').all();
  const statusMap = {};
  for (const row of existingRows) {
    statusMap[row.url] = row;
  }

  for (const service of SERVICES) {
    const prev = statusMap[service.url] || { status: 'up', last_state_change: null, last_notification_sent: null };

    const result = await checkService(service);
    const currentStatus = result.isUp ? 'up' : 'down';

    const uptimeRow = await db.prepare(
      'SELECT * FROM daily_uptime WHERE url = ? AND date = ?'
    ).bind(service.url, dailyKey).first();

    if (uptimeRow) {
      await db.prepare(
        'UPDATE daily_uptime SET checks = checks + 1, failures = failures + ? WHERE url = ? AND date = ?'
      ).bind(result.isUp ? 0 : 1, service.url, dailyKey).run();
    } else {
      await db.prepare(
        'INSERT INTO daily_uptime (url, date, checks, failures) VALUES (?, ?, 1, ?)'
      ).bind(service.url, dailyKey, result.isUp ? 0 : 1).run();
    }

    if (currentStatus !== prev.status) {
      console.log(`${service.name}: ${prev.status} -> ${currentStatus}`);

      if (currentStatus === 'down') {
        const incidentId = generateId();
        await db.prepare(
          'INSERT INTO incidents (id, service, url, type, started_at, error) VALUES (?, ?, ?, ?, ?, ?)'
        ).bind(incidentId, service.name, service.url, 'down', now, result.error).run();
        changes.push({ service: { name: service.name, url: service.url }, status: 'down', error: result.error, duration: null });
      } else {
        const openIncident = await db.prepare(
          'SELECT * FROM incidents WHERE url = ? AND resolved_at IS NULL'
        ).bind(service.url).first();

        let durationMin = null;
        if (openIncident) {
          const startTime = new Date(openIncident.started_at).getTime();
          durationMin = Math.round((Date.now() - startTime) / 60000);
          await db.prepare(
            'UPDATE incidents SET resolved_at = ?, duration_minutes = ? WHERE id = ?'
          ).bind(now, durationMin, openIncident.id).run();
        }
        changes.push({ service: { name: service.name, url: service.url }, status: 'up', error: null, duration: durationMin });
      }
    }

    await db.prepare(`
      INSERT INTO services (url, name, description, status, last_state_change, last_notification_sent, latency, status_code, error_message, last_check)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(url) DO UPDATE SET
        name = excluded.name,
        status = excluded.status,
        description = excluded.description,
        last_state_change = COALESCE(excluded.last_state_change, services.last_state_change),
        last_notification_sent = CASE WHEN excluded.last_notification_sent IS NOT NULL THEN excluded.last_notification_sent ELSE services.last_notification_sent END,
        latency = excluded.latency,
        status_code = excluded.status_code,
        error_message = excluded.error_message,
        last_check = excluded.last_check
    `).bind(
      service.url, service.name, service.description || '', currentStatus,
      currentStatus !== prev.status ? now : prev.last_state_change,
      currentStatus !== prev.status ? now : prev.last_notification_sent,
      result.latency, result.statusCode, result.error, now
    ).run();

    await db.prepare(
      'INSERT INTO latency_checks (url, timestamp, latency, status) VALUES (?, ?, ?, ?)'
    ).bind(service.url, now, result.latency, currentStatus).run();
  }

  // Clean up old latency data (keep 7 days)
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  await db.prepare('DELETE FROM latency_checks WHERE timestamp < ?').bind(sevenDaysAgo).run();

  // Clean up old incidents (keep max 100)
  await db.prepare(`
    DELETE FROM incidents WHERE id NOT IN (
      SELECT id FROM incidents ORDER BY started_at DESC LIMIT 100
    )
  `).run();

  const { results: allServices } = await db.prepare('SELECT * FROM services').all();
  const downServices = allServices.filter(s => s.status === 'down');

  if (changes.length > 0) {
    const hasDown = downServices.length > 0;
    const subject = hasDown ? '[Alerta] Servicios Caídos (Resumen)' : '[Recuperado] Todos los servicios operativos';
    const html = buildSummaryEmail(changes, downServices, false);
    await sendEmailAlert(env, subject, html);
  }

  if (currentHour === 7 && downServices.length > 0) {
    const subject = `[Recordatorio] ${downServices.length} servicio(s) aún caído(s)`;
    const html = buildSummaryEmail([], downServices, true);
    await sendEmailAlert(env, subject, html);
  }

  console.log('Monitoring check completed.');
}

async function handleRequest(request, env) {
  const url = new URL(request.url);
  const db = env.fcctp_status_db;

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (url.pathname === '/api/status') {
    const { results: services } = await db.prepare('SELECT * FROM services').all();
    const { results: incidents } = await db.prepare(
      'SELECT * FROM incidents ORDER BY started_at DESC LIMIT 100'
    ).all();
    const { results: latencyRows } = await db.prepare(
      'SELECT * FROM latency_checks ORDER BY timestamp'
    ).all();
    const { results: dailyRows } = await db.prepare(
      'SELECT * FROM daily_uptime ORDER BY date DESC'
    ).all();

    const dailyUptimeMap = {};
    for (const row of dailyRows) {
      if (!dailyUptimeMap[row.url]) dailyUptimeMap[row.url] = {};
      dailyUptimeMap[row.url][row.date] = { checks: row.checks, failures: row.failures };
    }

    const statusJson = {};
    for (const s of services) {
      statusJson[s.url] = {
        status: s.status,
        description: s.description,
        last_state_change: s.last_state_change,
        last_notification_sent: s.last_notification_sent,
        dailyUptime: dailyUptimeMap[s.url] || {},
        last_check: s.last_check,
        latency: s.latency,
        statusCode: s.status_code,
        error_message: s.error_message,
        name: s.name,
      };
    }

    const checksMap = new Map();
    for (const c of latencyRows) {
      if (!checksMap.has(c.timestamp)) {
        checksMap.set(c.timestamp, []);
      }
      checksMap.get(c.timestamp).push({
        url: c.url,
        name: SERVICES.find(s => s.url === c.url)?.name || c.url,
        status: c.status,
        latency: c.latency,
      });
    }

    const latencyJson = {
      checks: Array.from(checksMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([timestamp, services]) => ({ timestamp, services })),
    };

    return new Response(JSON.stringify({
      status: statusJson,
      incidents: { incidents },
      latency: latencyJson,
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        ...corsHeaders,
      },
    });
  }

  if (url.pathname === '/api/trigger-test-email' && request.method === 'POST') {
    const authHeader = request.headers.get('X-Test-Token');
    if (!authHeader || authHeader !== env.TEST_TOKEN) {
      return new Response('No autorizado', { status: 401 });
    }

    let body = {};
    try {
      body = await request.json();
    } catch (e) {}

    const targetEmail = body.to || env.NOTIFICATION_EMAIL;
    if (!targetEmail) {
      return new Response(JSON.stringify({ error: 'Falta email de destino' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const subject = '[Prueba] Alerta: Resumen de Estado';
    const html = buildSummaryEmail(
      [
        { service: { name: 'FCCTP API Servidor', url: 'https://api.fcctp.pe' }, status: 'down', error: '500 Internal Server Error', duration: null },
        { service: { name: 'Dashboard Web', url: 'https://status.fcctp.pe' }, status: 'up', error: null, duration: 15 },
      ],
      [{ name: 'FCCTP API Servidor', url: 'https://api.fcctp.pe', error_message: '500 Internal Server Error' }],
      false,
    );

    try {
      await sendEmail({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: env.SMTP_SECURE,
        user: env.SMTP_USER,
        pass: env.SMTP_PASS,
        from: env.SMTP_USER,
        to: targetEmail,
        subject,
        html,
      });
      return new Response(JSON.stringify({ success: true, sent_to: targetEmail }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    } catch (err) {
      console.error('Error en test-email:', err);
      return new Response(JSON.stringify({ success: false, error: err.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}

export default {
  scheduled(event, env, ctx) {
    ctx.waitUntil(handleScheduled(event, env, ctx));
  },
  fetch(request, env, ctx) {
    return handleRequest(request, env);
  },
};
