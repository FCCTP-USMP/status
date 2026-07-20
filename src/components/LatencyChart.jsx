import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, BarChart, Bar, ReferenceLine } from 'recharts';

export default function LatencyChart({ data, dailyUptime }) {
  const [range, setRange] = useState('24h');

  if (!data || data.length === 0) {
    return (
      <div className="text-center py-6 text-gray-400 dark:text-gray-600 text-sm">
        No hay datos históricos disponibles.
      </div>
    );
  }

  // --- 1 HORA ---
  const oneHourAgo = Date.now() - 60 * 60 * 1000;
  const filtered1h = data.filter(d => d.latency != null && new Date(d.timestamp || d.time).getTime() >= oneHourAgo);
  const chartData1h = filtered1h.map(d => ({
    time: new Date(d.timestamp || d.time).toLocaleTimeString('es-PE', { timeZone: 'America/Lima', hour: '2-digit', minute: '2-digit' }),
    latency: d.latency
  }));

  // --- 24 HORAS ---
  const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;
  const filtered24h = data.filter(d => d.latency != null && new Date(d.timestamp || d.time).getTime() >= twentyFourHoursAgo);
  const chartData24h = filtered24h.map(d => ({
    time: new Date(d.timestamp || d.time).toLocaleTimeString('es-PE', { timeZone: 'America/Lima', hour: '2-digit', minute: '2-digit' }),
    latency: d.latency
  }));

  // --- 7 DÍAS ---
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const filtered7d = data.filter(d => d.latency != null && new Date(d.timestamp || d.time).getTime() >= sevenDaysAgo);
  
  // Agrupar por hora para evitar saturación
  const hourlyData = {};
  filtered7d.forEach(d => {
    const dateObj = new Date(d.timestamp || d.time);
    const key = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')} ${String(dateObj.getHours()).padStart(2, '0')}:00`;
    if (!hourlyData[key]) {
      hourlyData[key] = { sum: 0, count: 0 };
    }
    hourlyData[key].sum += d.latency;
    hourlyData[key].count += 1;
  });

  const chartData7d = Object.entries(hourlyData).map(([key, val]) => {
    const dateObj = new Date(key);
    const label = dateObj.toLocaleDateString('es-PE', { day: 'numeric', month: 'short' }) + ' ' + dateObj.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
    return {
      time: label,
      latency: Math.round(val.sum / val.count)
    };
  });

  // --- 30 DÍAS (Uptime) ---
  const chartData30d = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const label = d.toLocaleDateString('es-PE', { day: 'numeric', month: 'short' });
    const stats = dailyUptime?.[key];
    let uptimePercent = 100;
    if (stats && stats.checks > 0) {
      uptimePercent = Math.round((1 - (stats.failures / stats.checks)) * 100);
    } else if (!stats) {
      uptimePercent = 100; // Por defecto asumimos 100% si no hay fallas registradas
    }
    chartData30d.push({
      name: label,
      uptime: uptimePercent
    });
  }

  // Selección de datos según el rango
  let currentChartData = [];
  if (range === '1h') currentChartData = chartData1h;
  else if (range === '24h') currentChartData = chartData24h;
  else if (range === '7d') currentChartData = chartData7d;

  const hasLatencyData = currentChartData.length >= 2;

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-4">
        <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Histórico</span>
        <div className="flex bg-gray-100 dark:bg-gray-800 p-0.5 rounded-lg text-xs">
          {['1h', '24h', '7d', '30d'].map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                range === r
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              {r === '1h' ? '1h' : r === '24h' ? '24h' : r === '7d' ? '7d' : '30d'}
            </button>
          ))}
        </div>
      </div>

      <div className="w-full h-48">
        <ResponsiveContainer width="100%" height="100%">
          {range === '30d' ? (
            <BarChart data={chartData30d} margin={{ top: 5, right: 10, left: 15, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-gray-800" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 10, fill: '#9ca3af' }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#9ca3af' }}
                tickLine={false}
                axisLine={false}
                unit="%"
                domain={['auto', 100]}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1f2937',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#f3f4f6',
                  fontSize: '12px',
                }}
                labelStyle={{ color: '#d1d5db' }}
              />
              <Bar dataKey="uptime" fill="#10b981" radius={[4, 4, 0, 0]} name="Uptime" />
            </BarChart>
          ) : !hasLatencyData ? (
            <div className="flex items-center justify-center h-full text-center text-gray-400 dark:text-gray-600 text-sm">
              No hay suficientes datos de latencia para este rango.
            </div>
          ) : (
            <LineChart data={currentChartData} margin={{ top: 5, right: 10, left: 15, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-gray-800" />
              <XAxis
                dataKey="time"
                tick={{ fontSize: 10, fill: '#9ca3af' }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#9ca3af' }}
                tickLine={false}
                axisLine={false}
                unit="ms"
                reversed={true}
                domain={[0, 10000]}
              />
              <ReferenceLine
                y={10000}
                stroke="#ef4444"
                strokeDasharray="3 3"
                label={{ value: 'Límite (10s)', fill: '#ef4444', position: 'top', fontSize: 10 }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1f2937',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#f3f4f6',
                  fontSize: '12px',
                }}
                labelStyle={{ color: '#d1d5db' }}
              />
              <Line
                type="monotone"
                dataKey="latency"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: '#3b82f6' }}
                name="Latencia"
              />
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
