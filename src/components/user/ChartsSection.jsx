import React from 'react';
import {
  ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  AreaChart, Area,
} from 'recharts';
import { formatCurrency, formatReadableDate } from '../../utils/formatters';

// Chart container shared classes
const cardClass =
  'bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm flex flex-col';

const chartTitle = 'text-sm font-semibold text-gray-800 dark:text-gray-100';
const chartSubtitle = 'text-xs text-gray-400 dark:text-gray-500 mt-0.5';

const axisStyle = { fill: '#9CA3AF', fontSize: 11 };

// Distinct colours for rank badges 1-10
const RANK_COLORS = [
  '#2563EB', '#0284C7', '#7C3AED', '#16A34A', '#D97706',
  '#DC2626', '#0891B2', '#65A30D', '#C026D3', '#64748B',
];

export default function ChartsSection({ vouchers = [] }) {
  // ── 1. Party Ledger aggregation ──────────────────────────────────────────
  const partyMap = {};
  vouchers.forEach((v) => {
    const party = v.partyLedgerName || 'Unknown';
    partyMap[party] = (partyMap[party] || 0) + (Number(v.totalAmount) || 0);
  });
  const partyChartData = Object.keys(partyMap)
    .map((name) => ({ name, amount: partyMap[name] }))
    .sort((a, b) => b.amount - a.amount);

  // ── 2. Stock item aggregation ────────────────────────────────────────────
  const itemMap = {};
  vouchers.forEach((v) => {
    (v.items || []).forEach((item) => {
      const name = item.stockItemName || 'Other';
      itemMap[name] = (itemMap[name] || 0) + (Number(item.amount) || 0);
    });
  });
  const itemChartData = Object.keys(itemMap)
    .map((name) => ({ name, amount: itemMap[name] }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 8);

  // ── 3. Date Timeline aggregation ─────────────────────────────────────────
  const dateMap = {};
  vouchers.forEach((v) => {
    const dateFormatted = formatReadableDate(v.date);
    dateMap[dateFormatted] = (dateMap[dateFormatted] || 0) + (Number(v.totalAmount) || 0);
  });
  const trendChartData = Object.keys(dateMap).map((date) => ({ date, sales: dateMap[date] }));

  // ── Top Customers toggle state ───────────────────────────────────────────
  const [topCount, setTopCount] = React.useState(5);
  const topCustomers = partyChartData.slice(0, topCount);
  const maxAmount = topCustomers[0]?.amount || 1;

  // ── Shared tooltip ───────────────────────────────────────────────────────
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-2.5 rounded-lg shadow-lg text-xs">
          <p className="font-semibold text-gray-700 dark:text-gray-200 mb-1">{label || payload[0].name}</p>
          <p className="font-bold text-blue-600 dark:text-blue-400">{formatCurrency(payload[0].value)}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 my-5">

      {/* ── 1. Top Customers List ──────────────────────────────────────────── */}
      <div className={cardClass}>
        {/* Header row with toggle */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className={chartTitle}>Top Customers</h3>
            <p className={chartSubtitle}>Highest revenue clients</p>
          </div>

          {/* 5 / 10 pill toggle */}
          <div className="flex items-center gap-0.5 bg-gray-100 dark:bg-gray-700 rounded-lg p-0.5 shrink-0">
            {[5, 10].map((n) => (
              <button
                key={n}
                onClick={() => setTopCount(n)}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all duration-150 ${
                  topCount === n
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
              >
                Top {n}
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable ranked list */}
        <div
          className="mt-4 overflow-y-auto flex-1 pr-0.5"
          style={{ maxHeight: '240px' }}
        >
          {topCustomers.length === 0 ? (
            <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-10">
              No data available
            </p>
          ) : (
            <ol className="space-y-3">
              {topCustomers.map((customer, index) => {
                const barPct = Math.round((customer.amount / maxAmount) * 100);
                const color = RANK_COLORS[index] ?? '#64748B';
                return (
                  <li key={customer.name}>
                    {/* Name row */}
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        {/* Rank badge */}
                        <span
                          className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white leading-none"
                          style={{ backgroundColor: color }}
                        >
                          {index + 1}
                        </span>
                        {/* Customer name — truncates if too long */}
                        <span
                          className="text-xs font-medium text-gray-700 dark:text-gray-200 truncate"
                          title={customer.name}
                        >
                          {customer.name}
                        </span>
                      </div>
                      {/* Revenue amount */}
                      <span className="text-xs font-bold text-gray-800 dark:text-gray-100 shrink-0 ml-2">
                        {formatCurrency(customer.amount)}
                      </span>
                    </div>

                    {/* Proportional progress bar */}
                    <div className="h-1.5 w-full bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${barPct}%`, backgroundColor: color }}
                      />
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      </div>

      {/* ── 2. Top Stock Items Bar ─────────────────────────────────────────── */}
      <div className={cardClass}>
        <div>
          <h3 className={chartTitle}>Top Stock Items Revenue</h3>
          <p className={chartSubtitle}>Highest grossing inventory items</p>
        </div>
        <div className="h-60 mt-4 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={itemChartData} margin={{ top: 4, right: 8, left: -24, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" className="dark:stroke-gray-700" vertical={false} />
              <XAxis dataKey="name" tick={axisStyle} tickLine={false} axisLine={false} />
              <YAxis
                tick={axisStyle}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) =>
                  `₹${v >= 100000 ? (v / 100000).toFixed(1) + 'L' : (v / 1000).toFixed(0) + 'k'}`
                }
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(37,99,235,0.04)' }} />
              <Bar dataKey="amount" fill="#2563EB" radius={[4, 4, 0, 0]} maxBarSize={36} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── 3. Sales Turnover Timeline ─────────────────────────────────────── */}
      <div className={cardClass}>
        <div>
          <h3 className={chartTitle}>Sales Turnover Timeline</h3>
          <p className={chartSubtitle}>Voucher date trend analysis</p>
        </div>
        <div className="h-60 mt-4 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trendChartData} margin={{ top: 4, right: 8, left: -24, bottom: 0 }}>
              <defs>
                <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor="#2563EB" stopOpacity={0.10} />
                  <stop offset="100%" stopColor="#2563EB" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" className="dark:stroke-gray-700" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ ...axisStyle, fontSize: 10 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={axisStyle}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) =>
                  `₹${v >= 100000 ? (v / 100000).toFixed(1) + 'L' : (v / 1000).toFixed(0) + 'k'}`
                }
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="sales"
                stroke="#2563EB"
                strokeWidth={2}
                fill="url(#salesGrad)"
                dot={false}
                activeDot={{ r: 4, fill: '#2563EB', stroke: '#fff', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
}
