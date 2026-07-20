import axios from "axios";
import fs from "fs";
import nodemailer from "nodemailer";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, "..", "data");
const STATUS_FILE = path.join(DATA_DIR, "status.json");
const LATENCY_FILE = path.join(DATA_DIR, "latency.json");
const INCIDENTS_FILE = path.join(DATA_DIR, "incidents.json");

const LIMA_TZ = "America/Lima";

const SERVICES = [
  { url: "https://dokploy.fcctp.edu.pe", name: "Dokploy" },
  { url: "https://dokploy2.fcctp.edu.pe", name: "Dokploy2" },
  { url: "https://fcctpauth.usmp.edu.pe", name: "FCCTP Auth" },
  { url: "https://app.fcctp.edu.pe/", name: "App FCCTP" },
  { url: "https://n8n.fcctp.edu.pe/", name: "n8n FCCTP" },
  { url: "https://odoo.fcctp.edu.pe/", name: "Odoo FCCTP" },
  { url: "https://chatwoot.fcctp.edu.pe/", name: "Chatwoot FCCTP" },
  {
    url: "https://apps.fcctp.edu.pe/bienestar-universitario",
    name: "Bienestar Universitario",
  },
  { url: "https://mesadepartes.fcctp.edu.pe/", name: "Mesa de Partes" },
];

function log(...args) {
  const now = new Date().toLocaleString("es-PE", { timeZone: LIMA_TZ });
  console.log(`[${now}]`, ...args);
}

function readJSON(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch {
    return null;
  }
}

function writeJSON(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
}

function getLimaDate(date) {
  const now = date || new Date();
  const opts = {
    timeZone: LIMA_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  };
  const parts = new Intl.DateTimeFormat("es-PE", opts).formatToParts(now);
  const get = (type) =>
    parseInt(parts.find((p) => p.type === type)?.value || "0", 10);
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour"),
    minute: get("minute"),
    second: get("second"),
    iso: now.toISOString(),
  };
}

function getLimaDateKey(date) {
  const d = getLimaDate(date);
  return `${d.year}-${String(d.month).padStart(2, "0")}-${String(d.day).padStart(2, "0")}`;
}

async function checkService(service) {
  const start = Date.now();
  try {
    const response = await axios.get(service.url, {
      timeout: 10000,
      validateStatus: () => true,
      maxRedirects: 5,
    });
    const latency = Date.now() - start;
    const isUp = response.status >= 200 && response.status < 500;
    return { isUp, latency, statusCode: response.status, error: null };
  } catch (err) {
    const latency = Date.now() - start;
    return {
      isUp: false,
      latency,
      statusCode: null,
      error: err.code || err.message,
    };
  }
}

function createTransporter() {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || "587", 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) {
    log("SMTP not configured, skipping email");
    return null;
  }
  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    debug: true,
    logger: true,
  });
}

async function sendEmail(transporter, subject, html) {
  const to = process.env.NOTIFICATION_EMAILS;
  if (!transporter || !to) {
    log("Email not sent: missing transporter or recipients");
    return;
  }
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  try {
    await transporter.sendMail({
      from: `FCCTP Status <${from}>`,
      to,
      subject,
      html,
    });
    log(`Email sent: ${subject}`);
  } catch (err) {
    log(`Failed to send email: ${err.message}`);
  }
}

function buildSummaryEmail(changes, downServices, isReminder) {
  const hasDown = downServices.length > 0;
  const color = hasDown ? "#dc2626" : "#16a34a";
  const emoji = hasDown ? "🔴" : "✅";
  const title = isReminder
    ? `Recordatorio: ${downServices.length} servicio(s) aún caído(s)`
    : hasDown
      ? "Alerta: Servicios Caídos (Resumen)"
      : "Recuperación: Todos los servicios operativos";

  let html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
      <div style="background: ${color}; color: white; padding: 24px;">
        <h1 style="margin: 0; font-size: 20px;">${emoji} ${title}</h1>
        <p style="margin: 8px 0 0; opacity: 0.9;">${new Date().toLocaleString("es-PE", { timeZone: LIMA_TZ })}</p>
      </div>
      <div style="background: #ffffff; padding: 24px;">
  `;

  if (changes.length > 0 && !isReminder) {
    html += `
      <h3 style="margin-top: 0; color: #111827; border-bottom: 2px solid #f3f4f6; padding-bottom: 8px;">Cambios Recientes</h3>
      <ul style="padding-left: 20px; color: #374151; line-height: 1.6; margin-bottom: 24px;">
    `;
    for (const c of changes) {
      const statusLabel =
        c.status === "down"
          ? '<span style="color: #dc2626; font-weight: bold;">CAÍDO</span>'
          : '<span style="color: #16a34a; font-weight: bold;">RECUPERADO</span>';
      const detail =
        c.status === "down"
          ? `(Error: ${c.error || "Sin respuesta"})`
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
            <th style="padding: 8px 12px;">Servicio</th>
            <th style="padding: 8px 12px;">URL</th>
            <th style="padding: 8px 12px;">Error</th>
          </tr>
        </thead>
        <tbody style="font-size: 14px; color: #374151;">
    `;
    for (const s of downServices) {
      html += `
        <tr style="border-bottom: 1px solid #f3f4f6;">
          <td style="padding: 8px 12px; font-weight: bold;">${s.name}</td>
          <td style="padding: 8px 12px;"><a href="${s.url}" style="color: #2563eb; text-decoration: none;">${s.url}</a></td>
          <td style="padding: 8px 12px; color: #ef4444; font-family: monospace; font-size: 12px;">${s.error_message || "Sin respuesta"}</td>
        </tr>
      `;
    }
    html += `
        </tbody>
      </table>
    `;
  }

  html += `
      </div>
      <div style="background: #f9fafb; padding: 12px 24px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #9ca3af; text-align: center;">
        Generado automáticamente por FCCTP Status Monitor
      </div>
    </div>
  `;
  return html;
}

async function main() {
  log("Starting monitoring check...");

  const lima = getLimaDate();
  const currentHour = lima.hour;
  const currentMinute = lima.minute;

  let statusData = readJSON(STATUS_FILE) || {};
  let latencyData = readJSON(LATENCY_FILE) || { checks: [] };
  let incidentsData = readJSON(INCIDENTS_FILE) || { incidents: [] };

  const transporter = createTransporter();
  const changes = [];

  for (const service of SERVICES) {
    const prev = statusData[service.url] || {
      status: "up",
      last_state_change: lima.iso,
      last_notification_sent: null,
    };
    const result = await checkService(service);
    const currentStatus = result.isUp ? "up" : "down";

    const dailyKey = getLimaDateKey();
    if (!prev.dailyUptime) prev.dailyUptime = {};
    if (!prev.dailyUptime[dailyKey]) {
      prev.dailyUptime[dailyKey] = { checks: 0, failures: 0 };
    }
    prev.dailyUptime[dailyKey].checks++;
    if (!result.isUp) prev.dailyUptime[dailyKey].failures++;

    const now = lima.iso;

    if (currentStatus !== prev.status) {
      log(`${service.name}: ${prev.status} -> ${currentStatus}`);

      if (currentStatus === "down") {
        const incident = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          service: service.name,
          url: service.url,
          type: "down",
          started_at: now,
          resolved_at: null,
          duration_minutes: null,
          error: result.error,
        };
        incidentsData.incidents.unshift(incident);
        changes.push({
          service: { name: service.name, url: service.url },
          status: "down",
          error: result.error,
          duration: null,
        });
        prev.last_notification_sent = now;
      } else {
        const openIncident = incidentsData.incidents.find(
          (i) => i.url === service.url && !i.resolved_at,
        );
        let durationMin = null;
        if (openIncident) {
          const startTime = new Date(openIncident.started_at).getTime();
          durationMin = Math.round((Date.now() - startTime) / 60000);
          openIncident.resolved_at = now;
          openIncident.duration_minutes = durationMin;
        }
        changes.push({
          service: { name: service.name, url: service.url },
          status: "up",
          error: null,
          duration: durationMin,
        });
        prev.last_notification_sent = now;
      }
    }

    prev.status = currentStatus;
    prev.last_check = now;
    prev.latency = result.latency;
    prev.statusCode = result.statusCode;
    prev.error_message = result.error;

    statusData[service.url] = prev;
  }

  const downServices = SERVICES.map((s) => ({
    ...s,
    ...statusData[s.url],
  })).filter((s) => s.status === "down");

  if (changes.length > 0 && transporter) {
    const hasDown = downServices.length > 0;
    const subject = hasDown
      ? `🔴 Alerta: Servicios Caídos (Resumen)`
      : `✅ Recuperado: Todos los servicios operativos`;
    const emailHtml = buildSummaryEmail(changes, downServices, false);
    await sendEmail(transporter, subject, emailHtml);
  }

  if (currentHour === 7 && downServices.length > 0) {
    const alreadySentToday = downServices.some((s) => {
      const lastNotif = s.last_notification_sent
        ? new Date(s.last_notification_sent)
        : null;
      return lastNotif ? getLimaDateKey(lastNotif) === getLimaDateKey() : false;
    });

    if (!alreadySentToday) {
      const subject = `⚠️ Recordatorio: ${downServices.length} servicio(s) aún caído(s)`;
      const emailHtml = buildSummaryEmail([], downServices, true);
      await sendEmail(transporter, subject, emailHtml);
      for (const s of downServices) {
        statusData[s.url].last_notification_sent = lima.iso;
      }
    }
  }

  const checkEntry = {
    timestamp: lima.iso,
    services: SERVICES.map((s) => ({
      url: s.url,
      name: s.name,
      status: statusData[s.url].status,
      latency: statusData[s.url].latency,
    })),
  };

  latencyData.checks.push(checkEntry);
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  latencyData.checks = latencyData.checks.filter(
    (c) => new Date(c.timestamp).getTime() > sevenDaysAgo,
  );

  incidentsData.incidents = incidentsData.incidents.slice(0, 100);

  writeJSON(STATUS_FILE, statusData);
  writeJSON(LATENCY_FILE, latencyData);
  writeJSON(INCIDENTS_FILE, incidentsData);

  log("Monitoring check completed.");
}

main().catch((err) => {
  log("Fatal error:", err.message);
  process.exit(1);
});
