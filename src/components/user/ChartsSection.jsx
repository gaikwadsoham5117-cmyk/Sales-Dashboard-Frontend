import React from 'react';
import {
  ResponsiveContainer, PieChart, Pie, Cell,
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  AreaChart, Area, Legend,
} from 'recharts';
import { formatCurrency, formatReadableDate } from '../../utils/formatters';

// Professional 6-color palette — restrained, no neon
const CHART_COLORS = ['#2563EB', '#64748B', '#16A34A', '#D97706', '#DC2626', '#0284C7'];

// Chart container shared classes
const cardClass =
  'bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm flex flex-col';

const chartTitle = 'text-sm font-semibold text-gray-800 dark:text-gray-100';
const chartSubtitle = 'text-xs text-gray-400 dark:text-gray-500 mt-0.5';

const axisStyle = { fill: '#9CA3AF', fontSize: 11 };

export default function ChartsSection({ vouchers = [] }) {
  // 1. Party Ledger data
  const partyMap = {};
  vouchers.forEach((v) => {
    const party = v.partyLedgerName || 'Unknown';
    partyMap[party] = (partyMap[party] || 0) + (Number(v.totalAmount) || 0);
  });
  const partyChartData = Object.keys(partyMap)
    .map((name) => ({ name, amount: partyMap[name] }))
    .sort((a, b) => b.amount - a.amount);

  // 2. Item Breakdown data
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

  // 3. Date Timeline data
  const dateMap = {};
  vouchers.forEach((v) => {
    const dateFormatted = formatReadableDate(v.date);
    dateMap[dateFormatted] = (dateMap[dateFormatted] || 0) + (Number(v.totalAmount) || 0);
  });
  const trendChartData = Object.keys(dateMap).map((date) => ({ date, sales: dateMap[date] }));

  // Shared tooltip
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

      {/* 1. Party Ledger Donut */}
      <div className={cardClass}>
        <div>
          <h3 className={chartTitle}>Sales by Party Ledger</h3>
          <p className={chartSubtitle}>Revenue split across clients</p>
        </div>
        <div className="h-60 mt-4 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={partyChartData}
                cx="50%" cy="45%"
                innerRadius={52} outerRadius={82}
                paddingAngle={3}
                dataKey="amount"
                strokeWidth={0}
              >
                {partyChartData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend
                verticalAlign="bottom"
                height={32}
                formatter={(value) => (
                  <span className="text-[11px] text-gray-500 dark:text-gray-400">{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 2. Top Stock Items Bar */}
      <div className={cardClass}>
        <div>
          <h3 className={chartTitle}>Top Stock Items Revenue</h3>
          <p className={chartSubtitle}>Highest grossing inventory items</p>
        </div>
        <div className="h-60 mt-4 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={itemChartData} margin={{ top: 4, right: 8, left: -24, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" className="dark:stroke-gray-700" vertical={false} />
              <XAxis
                dataKey="name"
                tick={axisStyle}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={axisStyle}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `₹${v >= 100000 ? (v / 100000).toFixed(1) + 'L' : (v / 1000).toFixed(0) + 'k'}`}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(37,99,235,0.04)' }} />
              <Bar dataKey="amount" fill="#2563EB" radius={[4, 4, 0, 0]} maxBarSize={36} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 3. Sales Timeline Area */}
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
                tickFormatter={(v) => `₹${v >= 100000 ? (v / 100000).toFixed(1) + 'L' : (v / 1000).toFixed(0) + 'k'}`}
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
