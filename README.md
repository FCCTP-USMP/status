# FCCTP Status

Monitoreo automatizado del estado de los servicios institucionales de la Facultad de Ciencias de la Comunicación, Turismo y Psicología (FCCTP) de la Universidad de San Martín de Porres.

## Servicios monitoreados

- Dokploy
- FCCTP Auth
- App FCCTP
- n8n FCCTP
- Odoo FCCTP
- Chatwoot FCCTP
- Bienestar Universitario
- Mesa de Partes

## Stack

- **Frontend**: React + Vite + Tailwind CSS + Recharts
- **Backend**: Script Node.js con axios y nodemailer
- **Monitoreo**: GitHub Actions (cada 10 minutos)
- **Despliegue**: GitHub Pages
- **Email local**: MailHog (desarrollo)

## Scripts

```bash
npm run dev          # Inicia el frontend en modo desarrollo
npm run build        # Compila el frontend para producción
npm run preview      # Previsualiza el build
npm run monitor      # Ejecuta el chequeo de servicios y envía alertas
npm run reset        # Resetea los archivos de datos (status, latency, incidents)
```

## Variables de entorno

Copiar `.env.example` a `.env` y configurar:

```
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_USER=any
SMTP_PASS=any
SMTP_FROM=FCCTP Status <status@fcctp.edu.pe>
NOTIFICATION_EMAILS=admin1@example.com,admin2@example.com
```

## Desarrollo local

```bash
# Iniciar MailHog para correos locales
docker compose up -d

# Iniciar frontend
npm run dev

# Ejecutar monitor manualmente
npm run monitor
```

MailHog web UI: http://localhost:8025

## GitHub Pages

El frontend se despliega automáticamente en GitHub Pages:

👉 **[https://fcctp-usmp.github.io/status/](https://fcctp-usmp.github.io/status/)**

## Arquitectura

El monitor ejecuta un chequeo de todos los servicios cada 10 minutos vía GitHub Actions. Los resultados se almacenan en `data/` (status.json, latency.json, incidents.json) y se despliegan a GitHub Pages. Cuando un servicio cambia de estado, se envía un correo resumen con todos los servicios caídos a los destinatarios configurados.
