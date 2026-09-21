import React from 'react';

const themeMap = {
  blue: {
    iconBg: 'bg-blue-50 dark:bg-blue-900/20',
    iconColor: 'text-blue-600 dark:text-blue-400',
    trendBg: 'bg-blue-50 dark:bg-blue-900/20',
    trendText: 'text-blue-700 dark:text-blue-300',
  },
  green: {
    iconBg: 'bg-green-50 dark:bg-green-900/20',
    iconColor: 'text-green-600 dark:text-green-400',
    trendBg: 'bg-green-50 dark:bg-green-900/20',
    trendText: 'text-green-700 dark:text-green-300',
  },
  amber: {
    iconBg: 'bg-amber-50 dark:bg-amber-900/20',
    iconColor: 'text-amber-600 dark:text-amber-400',
    trendBg: 'bg-amber-50 dark:bg-amber-900/20',
    trendText: 'text-amber-700 dark:text-amber-300',
  },
  red: {
    iconBg: 'bg-red-50 dark:bg-red-900/20',
    iconColor: 'text-red-600 dark:text-red-400',
    trendBg: 'bg-red-50 dark:bg-red-900/20',
    trendText: 'text-red-700 dark:text-red-300',
  },
  neutral: {
    iconBg: 'bg-gray-100 dark:bg-gray-700',
    iconColor: 'text-gray-600 dark:text-gray-300',
    trendBg: 'bg-gray-100 dark:bg-gray-700',
    trendText: 'text-gray-600 dark:text-gray-300',
  },
  // Legacy aliases
  purple:  'blue',
  emerald: 'green',
};

function resolveTheme(colorTheme) {
  const resolved = themeMap[colorTheme];
  if (typeof resolved === 'string') return themeMap[resolved];
  return resolved || themeMap.blue;
}

export default function StatCard({ title, value, trend, trendLabel, subtext, icon: Icon, colorTheme = 'blue' }) {
  const t = resolveTheme(colorTheme);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm hover:shadow-md transition-shadow duration-200">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2.5">
            {title}
          </p>
          <p className="text-2xl lg:text-[28px] font-bold text-gray-900 dark:text-gray-100 tracking-tight leading-none">
            {value}
          </p>
        </div>
        {Icon && (
          <div className={`p-2.5 rounded-lg flex-shrink-0 ${t.iconBg}`}>
            <Icon className={`w-5 h-5 ${t.iconColor}`} />
          </div>
        )}
      </div>

      <div className="mt-3.5 flex items-center gap-2 text-xs">
        {trend && (
          <span className={`inline-flex items-center font-semibold px-2 py-0.5 rounded-md ${t.trendBg} ${t.trendText}`}>
            {trend}
          </span>
        )}
        {trendLabel && (
          <span className="text-gray-400 dark:text-gray-500">{trendLabel}</span>
        )}
        {!trend && subtext && (
          <span className="text-gray-400 dark:text-gray-500">{subtext}</span>
        )}
      </div>
    </div>
  );
}
