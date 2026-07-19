import React from 'react';

function getLast30Days() {
  const days = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const label = d.toLocaleDateString('es-PE', { weekday: 'short', day: 'numeric' });
    days.push({ key, label });
  }
  return days;
}

export default function UptimeBar({ dailyUptime }) {
  const days = getLast30Days();

  return (
    <div className="flex items-center gap-[2px]">
      {days.map(day => {
        const stats = dailyUptime?.[day.key];
        let color = 'bg-gray-200 dark:bg-gray-700';

        if (stats && stats.checks > 0) {
          const ratio = stats.failures / stats.checks;
          if (ratio === 0) color = 'bg-emerald-500';
          else if (ratio <= 0.5) color = 'bg-amber-400';
          else color = 'bg-red-500';
        }

        return (
          <div
            key={day.key}
            className={`w-[5px] h-4 sm:w-[6px] sm:h-5 rounded-sm ${color}`}
            title={`${day.label}: ${stats ? `${Math.round((1 - (stats.failures / stats.checks)) * 100)}% uptime` : 'Sin datos'}`}
          />
        );
      })}
    </div>
  );
}
