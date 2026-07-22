import React, { useEffect, useState } from 'react';
import Header from './components/Header';
import ServiceCard from './components/ServiceCard';
import IncidentsList from './components/IncidentsList';

const API_URL = import.meta.env.DEV
  ? 'http://localhost:8787/api/status'
  : 'https://fcctp-status.fcctp.workers.dev/api/status';

function useFetch(url) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(`${url}?t=${Date.now()}`);
        const json = await res.json();
        if (!cancelled) setData(json);
      } catch {
        // silent
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [url]);

  return { data, loading };
}

export default function App() {
  const [activeTab, setActiveTab] = useState('overview');
  const [dark, setDark] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
  }, [dark]);

  const { data, loading } = useFetch(API_URL);

  const statusData = data?.status;
  const incidentsData = data?.incidents;
  const latencyData = data?.latency;

  const services = statusData
    ? Object.entries(statusData)
        .map(([url, info]) => ({ url, ...info }))
        .sort((a, b) => a.name.localeCompare(b.name))
    : [];
  const totalServices = services.length;
  const upServices = services.filter(s => s.status === 'up').length;
  const allUp = totalServices > 0 && upServices === totalServices;
  const someDown = totalServices > 0 && upServices < totalServices && upServices > 0;
  const allDown = totalServices > 0 && upServices === 0;

  const lastCheck = services[0]?.last_check;
  const lastUpdatedStr = lastCheck
    ? new Date(lastCheck).toLocaleString('es-PE', {
        timeZone: 'America/Lima',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    : '';

  let bannerStatus = 'operational';
  if (allDown) bannerStatus = 'down';
  else if (someDown) bannerStatus = 'degraded';

  const openIncidents = incidentsData?.incidents?.filter(i => !i.resolved_at) || [];
  const resolvedIncidents = incidentsData?.incidents?.filter(i => i.resolved_at) || [];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors">
      <div className="max-w-5xl mx-auto px-4 py-8">

        <div className="flex items-center justify-between mb-8 pb-4 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <img
              src="https://fcctp.usmp.edu.pe/site/wp-content/uploads/2022/07/favicon_USMP.png"
              alt="USMP Logo"
              className="w-8 h-8 object-contain"
            />
            <span className="font-semibold text-sm tracking-wider text-gray-900 dark:text-white uppercase">USMP FCCTP</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-gray-600 dark:text-gray-400">
            <a href="https://fcctp.usmp.edu.pe/" target="_blank" rel="noreferrer" className="hover:text-gray-900 dark:hover:text-white">Portal</a>
            <span className="hidden sm:flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              Hora Local (Lima)
            </span>
            <button
              onClick={() => setDark(!dark)}
              className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              {dark ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
              )}
            </button>
          </div>
        </div>

        <div className="flex justify-center mb-8">
          <div className="inline-flex bg-gray-100 dark:bg-gray-900 p-1 rounded-xl shadow-inner border border-gray-200/50 dark:border-gray-800/50">
            <button
              onClick={() => setActiveTab('overview')}
              className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'overview'
                  ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
              }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
              Overview
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'history'
                  ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
              }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              History
            </button>
          </div>
        </div>

        <div className="text-center mb-10">
          <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">FCCTP System Status</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 flex justify-center items-center gap-1.5">
            <span>Frecuencia: cada 5 min (timeout de 10s con 3 intentos a intervalos de 5s)</span>
          </p>
          {lastUpdatedStr && (
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              Ultima actualizacion: {lastUpdatedStr}
            </p>
          )}
        </div>

        {loading ? (
          <div className="animate-pulse space-y-4">
            <div className="h-20 bg-gray-200 dark:bg-gray-800 rounded-2xl" />
            <div className="grid gap-4">
              {[1, 2, 3].map(i => <div key={i} className="h-28 bg-gray-200 dark:bg-gray-800 rounded-2xl" />)}
            </div>
          </div>
        ) : (
          <>
            {activeTab === 'overview' ? (
              <div className="space-y-8">
                <Header status={bannerStatus} upServices={upServices} totalServices={totalServices} />

                {openIncidents.length > 0 && (
                  <div>
                    <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">Active Incidents</h3>
                    <div className="space-y-3">
                      {openIncidents.map(inc => (
                        <div key={inc.id} className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-2xl p-5 flex items-center justify-between gap-4">
                          <div>
                            <h4 className="font-semibold text-amber-900 dark:text-amber-300 text-base">{inc.service} caido u offline</h4>
                            <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">Iniciado: {new Date(inc.started_at).toLocaleString('es-PE')}</p>
                          </div>
                          <span className="bg-amber-200 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 text-xs font-semibold px-3 py-1 rounded-full uppercase">
                            Investigating
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">Services &amp; Systems</h3>
                  <div className="grid gap-3">
                    {services.map(service => (
                      <ServiceCard
                        key={service.url}
                        service={service}
                        latencyData={latencyData}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Recent Incidents</h3>
                    <button onClick={() => setActiveTab('history')} className="text-xs text-blue-500 hover:underline">View All &gt;</button>
                  </div>
                  {resolvedIncidents.length === 0 ? (
                    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 text-center text-sm text-gray-400 dark:text-gray-600">
                      No hay incidentes recientes.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {resolvedIncidents.slice(0, 3).map(inc => (
                        <div key={inc.id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 flex justify-between items-center">
                          <div>
                            <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{inc.service}</p>
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Resuelto - Duracion: {inc.duration_minutes} min</p>
                          </div>
                          <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Resuelto</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Historical Incidents</h3>
                </div>
                <IncidentsList incidents={incidentsData?.incidents || []} />
              </div>
            )}
          </>
        )}

        <footer className="mt-16 pt-6 border-t border-gray-200 dark:border-gray-800 text-center text-xs text-gray-400 dark:text-gray-600">
          <p>&copy; {new Date().getFullYear()} USMP FCCTP Status &mdash; Monitoreo Automatizado</p>
        </footer>
      </div>
    </div>
  );
}
