import React from 'react';

export default function IncidentsList({ incidents }) {
  const resolved = incidents.filter(i => i.resolved_at);
  const open = incidents.filter(i => !i.resolved_at);

  if (!incidents || incidents.length === 0) {
    return (
      <div className="mt-10">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Historial de Incidentes</h3>
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-8 text-center">
          <svg className="w-12 h-12 mx-auto text-emerald-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-gray-500 dark:text-gray-400">No se han registrado incidentes en las últimas 24 horas</p>
        </div>
      </div>
    );
  }

  function formatDate(iso) {
    return new Date(iso).toLocaleString('es-PE', {
      timeZone: 'America/Lima',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  return (
    <div className="mt-10">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Historial de Incidentes
        {incidents.length > 0 && (
          <span className="ml-2 text-sm font-normal text-gray-400 dark:text-gray-500">({incidents.length})</span>
        )}
      </h3>

      <div className="space-y-2">
        {open.map(inc => (
          <div key={inc.id} className="bg-white dark:bg-gray-900 border border-red-200 dark:border-red-900/50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-red-500 status-pulse" />
              <span className="text-sm font-medium text-red-600 dark:text-red-400">Activo</span>
            </div>
            <p className="font-medium text-gray-900 dark:text-white">{inc.service}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Iniciado: {formatDate(inc.started_at)}
              {inc.error && <span className="ml-2 font-mono text-xs text-gray-400">({inc.error})</span>}
            </p>
          </div>
        ))}

        {resolved.slice(0, 20).map(inc => (
          <div key={inc.id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Resuelto</span>
            </div>
            <p className="font-medium text-gray-900 dark:text-white">{inc.service}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Inicio: {formatDate(inc.started_at)} &middot; Duración: {inc.duration_minutes ? `${inc.duration_minutes} min` : '—'}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
