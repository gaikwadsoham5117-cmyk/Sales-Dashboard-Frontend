import React from 'react';

export default function StatCard({ title, value, trend, trendLabel, subtext, icon: Icon, colorTheme = 'blue' }) {
  const themeMap = {
    blue: {
      border: 'border-blue-500/20 hover:border-blue-500/40',
      gradient: 'from-blue-600/10 via-indigo-600/5 to-transparent',
      iconBg: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      valueColor: 'text-white'
    },
    emerald: {
      border: 'border-emerald-500/20 hover:border-emerald-500/40',
      gradient: 'from-emerald-600/10 via-teal-600/5 to-transparent',
      iconBg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      valueColor: 'text-emerald-300'
    },
    purple: {
      border: 'border-purple-500/20 hover:border-purple-500/40',
      gradient: 'from-purple-600/10 via-violet-600/5 to-transparent',
      iconBg: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
      valueColor: 'text-purple-300'
    },
    amber: {
      border: 'border-amber-500/20 hover:border-amber-500/40',
      gradient: 'from-amber-600/10 via-orange-600/5 to-transparent',
      iconBg: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      valueColor: 'text-amber-300'
    }
  };

  const theme = themeMap[colorTheme] || themeMap.blue;

  return (
    <div className={`relative overflow-hidden bg-slate-900/80 backdrop-blur-md rounded-2xl p-5 border ${theme.border} bg-gradient-to-br ${theme.gradient} transition-all duration-300 shadow-lg`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
            {title}
          </p>
          <h3 className={`text-2xl lg:text-3xl font-extrabold tracking-tight ${theme.valueColor} mt-1`}>
            {value}
          </h3>
        </div>
        {Icon && (
          <div className={`p-2.5 rounded-xl border ${theme.iconBg} shadow-inner`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center gap-2 flex-wrap text-xs">
        {trend && (
          <span className="inline-flex items-center gap-1 font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
            {trend}
          </span>
        )}
        {trendLabel && (
          <span className="text-slate-400 font-medium">{trendLabel}</span>
        )}
        {!trend && subtext && (
          <span className="text-slate-400 font-medium">{subtext}</span>
        )}
      </div>
    </div>
  );
}
