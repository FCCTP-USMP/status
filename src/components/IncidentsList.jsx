import React from 'react';

export default function IncidentsList({ incidents }) {
  if (!incidents || incidents.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-8 text-center text-gray-500 dark:text-gray-400">
        No hay incidentes registrados en el historial.
      </div>
    );
  }

  function formatDate(iso) {
    return new Date(iso).toLocaleString('es-PE', {
      timeZone: 'America/Lima',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  return (
    <div className="space-y-4">
      {incidents.map((inc) => {
        const isResolved = !!inc.resolved_at;
        return (
          <div
            key={inc.id}
            className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 hover:shadow-sm transition-all"
          >
            <div className="flex items-center justify-between gap-4 mb-2">
              <span className="font-semibold text-gray-900 dark:text-white text-base">{inc.service}</span>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full uppercase ${
                isResolved
                  ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-400'
                  : 'bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-400'
              }`}>
                {isResolved ? 'Resolved' : 'Active'}
              </span>
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
              <p><strong className="text-gray-700 dark:text-gray-300">URL:</strong> <a href={inc.url} className="text-blue-500 hover:underline">{inc.url}</a></p>
              <p><strong className="text-gray-700 dark:text-gray-300">Inicio:</strong> {formatDate(inc.started_at)}</p>
              {isResolved ? (
                <>
                  <p><strong className="text-gray-700 dark:text-gray-300">Resolucion:</strong> {formatDate(inc.resolved_at)}</p>
                  <p><strong className="text-gray-700 dark:text-gray-300">Duracion:</strong> {inc.duration_minutes} minutos</p>
                </>
              ) : (
                <p className="text-amber-600 dark:text-amber-400 font-medium">El incidente sigue abierto e investigandose.</p>
              )}
              {inc.error && <p><strong className="text-gray-700 dark:text-gray-300">Error detectado:</strong> <code className="text-red-500 font-mono bg-red-50 dark:bg-red-950/20 px-1 py-0.5 rounded">{inc.error}</code></p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
