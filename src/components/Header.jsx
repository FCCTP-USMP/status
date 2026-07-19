import React from 'react';

export default function Header({ status, upServices, totalServices }) {
  const config = {
    operational: {
      bg: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900',
      icon: (
        <svg className="w-6 h-6 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      title: 'Todos los sistemas operativos',
      subtitle: `${upServices} de ${totalServices} servicios funcionando correctamente`,
    },
    degraded: {
      bg: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900',
      icon: (
        <svg className="w-6 h-6 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      ),
      title: 'Algunos servicios presentan problemas',
      subtitle: `${upServices} de ${totalServices} servicios funcionando`,
    },
    down: {
      bg: 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900',
      icon: (
        <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      title: 'Servicios no disponibles',
      subtitle: 'Todos los servicios presentan problemas de conectividad',
    },
  };

  const c = config[status] || config.operational;

  return (
    <div className={`mb-6 p-5 rounded-2xl border ${c.bg} transition-colors`}>
      <div className="flex items-center gap-3">
        {c.icon}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{c.title}</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">{c.subtitle}</p>
        </div>
      </div>
    </div>
  );
}
