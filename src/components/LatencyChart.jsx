import React from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export default function LatencyChart({ data }) {
  if (!data || data.length < 2) {
    return (
      <div className="text-center py-6 text-gray-400 dark:text-gray-600 text-sm">
        No hay suficientes datos de latencia para mostrar un gráfico.
      </div>
    );
  }

  const chartData = data
    .filter(d => d.latency != null)
    .map(d => ({
      time: new Date(d.timestamp || d.time || Date.now()).toLocaleTimeString('es-PE', { timeZone: 'America/Lima', hour: '2-digit', minute: '2-digit' }),
      latency: d.latency,
    }));

  if (chartData.length < 2) {
    return (
      <div className="text-center py-6 text-gray-400 dark:text-gray-600 text-sm">
        No hay suficientes datos de latencia para mostrar un gráfico.
      </div>
    );
  }

  return (
    <div className="w-full h-48">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="time"
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            tickLine={false}
            axisLine={false}
            unit="ms"
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
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
