import React, { useState } from 'react';
import UptimeBar from './UptimeBar';
import LatencyChart from './LatencyChart';

export default function ServiceCard({ service, latencyData }) {
  const [expanded, setExpanded] = useState(false);

  const isUp = service.status === 'up';
  const lastCheck = service.last_check
    ? new Date(service.last_check).toLocaleString('es-PE', { timeZone: 'America/Lima', hour: '2-digit', minute: '2-digit' })
    : '—';

  const serviceLatency = latencyData?.checks
    ?.map(c => {
      const found = c.services.find(s => s.url === service.url);
      return found ? { ...found, timestamp: c.timestamp } : null;
    })
    .filter(Boolean) || [];

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm hover:shadow-md transition-all overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left p-4 focus:outline-none"
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`flex-shrink-0 w-3 h-3 rounded-full ${isUp ? 'bg-emerald-500' : 'bg-red-500'} ${isUp ? '' : 'status-pulse'}`} />
            <div className="min-w-0">
              <h3 className="font-semibold text-gray-900 dark:text-white truncate">{service.name}</h3>
              <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{service.url}</p>
              {service.description && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">{service.description}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4 flex-shrink-0">
            <UptimeBar dailyUptime={service.dailyUptime} />
            <div className="text-right hidden sm:block">
              <div className={`text-sm font-mono font-medium ${isUp ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                {isUp ? (service.latency ? `${service.latency}ms` : '—') : 'Offline'}
              </div>
              <div className="text-xs text-gray-400 dark:text-gray-500">{lastCheck}</div>
            </div>
            <svg
              className={`w-5 h-5 text-gray-400 dark:text-gray-500 transition-transform ${expanded ? 'rotate-180' : ''}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-gray-100 dark:border-gray-800">
          <div className="pt-4">
            <div className="flex gap-4 mb-4 text-sm">
              <div>
                <span className="text-gray-500 dark:text-gray-400">Estado:</span>{' '}
                <span className={`font-medium ${isUp ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                  {isUp ? 'Operativo' : 'Caído'}
                </span>
              </div>
              {service.error_message && (
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Error:</span>{' '}
                  <span className="font-mono text-xs text-red-600 dark:text-red-400">{service.error_message}</span>
                </div>
              )}
            </div>
            <LatencyChart data={serviceLatency} />
          </div>
        </div>
      )}
    </div>
  );
}
