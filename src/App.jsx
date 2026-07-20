import React, { useEffect, useState } from 'react';
import Header from './components/Header';
import ServiceCard from './components/ServiceCard';
import IncidentsList from './components/IncidentsList';

const STATUS_URL = './data/status.json';
const INCIDENTS_URL = './data/incidents.json';
const LATENCY_URL = './data/latency.json';

function useFetch(url) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(url);
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
  const [dark, setDark] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
  }, [dark]);

  const { data: statusData, loading: statusLoading } = useFetch(STATUS_URL);
  const { data: incidentsData } = useFetch(INCIDENTS_URL);
  const { data: latencyData } = useFetch(LATENCY_URL);

  const services = statusData ? Object.entries(statusData).map(([url, info]) => ({ url, ...info })) : [];
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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center text-white font-bold text-lg shadow-md">
              F
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">FCCTP Status</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Estado de los servicios institucionales
                {lastUpdatedStr && ` • Última actualización: ${lastUpdatedStr}`}
              </p>
            </div>
          </div>
          <button
            onClick={() => setDark(!dark)}
            className="p-2.5 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all text-gray-600 dark:text-gray-300"
            title="Cambiar tema"
          >
            {dark ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
            )}
          </button>
        </div>

        {statusLoading ? (
          <div className="animate-pulse space-y-4">
            <div className="h-20 bg-gray-200 dark:bg-gray-800 rounded-2xl" />
            <div className="grid gap-4">
              {[1,2,3,4].map(i => <div key={i} className="h-28 bg-gray-200 dark:bg-gray-800 rounded-2xl" />)}
            </div>
          </div>
        ) : (
          <>
            <Header status={bannerStatus} upServices={upServices} totalServices={totalServices} />

            <div className="grid gap-3">
              {services.map(service => (
                <ServiceCard
                  key={service.url}
                  service={service}
                  latencyData={latencyData}
                />
              ))}
            </div>

            <IncidentsList incidents={incidentsData?.incidents || []} />
          </>
        )}

        <footer className="mt-12 pt-6 border-t border-gray-200 dark:border-gray-800 text-center text-sm text-gray-400 dark:text-gray-600">
          <p>FCCTP Status &mdash; Monitoreo automatizado</p>
        </footer>
      </div>
    </div>
  );
}
