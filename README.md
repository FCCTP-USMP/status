# FCCTP Status

Dashboard de monitoreo del estado de los servicios institucionales de la Facultad de Ciencias de la Comunicación, Turismo y Psicología (FCCTP) de la Universidad de San Martín de Porres.

**Dashboard en vivo:** https://fcctp-status.fcctp.workers.dev/

## Servicios monitoreados

Los 12 servicios están definidos en `src/services.js` (única fuente de verdad).

Actualmente se monitorean:
- Dokploy, FCCTP Auth, App FCCTP, n8n FCCTP, Odoo FCCTP, Chatwoot FCCTP
- Bienestar Universitario, Mesa de Partes, y otros

## Stack

- **Frontend:** React + Vite + Tailwind CSS + Recharts
- **Backend:** Cloudflare Workers
- **Base de datos:** Cloudflare D1 (SQLite)
- **Monitoreo:** Cron Trigger de Workers (cada 5 minutos)
- **Email local:** MailPit (Docker)
- **Email producción:** SMTP vía Gmail (puerto 465 con TLS)

## Scripts

| Comando | Descripción |
|---|---|
| `npm run dev` | Inicia el frontend en modo desarrollo |
| `npm run build` | Compila el frontend para producción |
| `npm run dev:worker` | Inicia el Worker local (sin --remote) |
| `npm run dev:worker:remote` | Inicia el Worker local apuntando a D1 remota |
| `npm run deploy:worker` | Compila frontend y despliega Worker a Cloudflare |
| `npm run reset` | Recrea y siembra la D1 local con datos de prueba |
| `npm run reset:worker` | Recrea y siembra la D1 remota |
| `npm run update:services` | Sincroniza nombres/descripciones en D1 local |
| `npm run update:services-worker` | Sincroniza nombres/descripciones en D1 remota |
| `npm run test:email` | Envía correo de prueba a MailPit local |
| `npm run test:email:remote` | Envía correo de prueba vía Gmail remoto |

## Desarrollo local

```bash
# 1. Iniciar MailPit para capturar correos locales
docker compose up -d

# 2. Inicializar la base de datos local
npm run reset

# 3. Iniciar el Worker (en una terminal)
npm run dev:worker

# 4. Iniciar el frontend (en otra terminal)
npm run dev
```

MailPit web UI: http://localhost:8025

## Variables de entorno

### Local (archivo `.dev.vars`)
```env
SMTP_HOST="127.0.0.1"
SMTP_PORT="1025"
SMTP_SECURE="false"
SMTP_USER=""
SMTP_PASS=""
NOTIFICATION_EMAIL="alertas-local@fcctp.local"
MONITOR_SECRET="token-local-test-seguro"
```

### Producción (secretos de Cloudflare)
```bash
npx wrangler secret put SMTP_USER
npx wrangler secret put SMTP_PASS
npx wrangler secret put NOTIFICATION_EMAIL
npx wrangler secret put MONITOR_SECRET
```

## Arquitectura

El Worker ejecuta un chequeo de todos los servicios cada 5 minutos vía Cron Trigger. Los resultados se almacenan en D1 (tablas `services`, `latency_checks`, `daily_uptime`, `incidents`). Cuando un servicio cambia de estado, se envía un correo resumen con todos los servicios caídos a los destinatarios configurados. El frontend es servido como asset estático desde el mismo Worker.
