import React from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  AreaChart,
  Area
} from 'recharts';
import { formatCurrency, formatReadableDate } from '../../utils/formatters';

const COLORS = ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EC4899', '#06B6D4'];

export default function ChartsSection({ vouchers = [] }) {
  // 1. Prepare Party Ledger Sales Data
  const partyMap = {};
  vouchers.forEach((v) => {
    const party = v.partyLedgerName || 'Unknown';
    partyMap[party] = (partyMap[party] || 0) + (Number(v.totalAmount) || 0);
  });
  const partyChartData = Object.keys(partyMap).map((name) => ({
    name,
    amount: partyMap[name]
  })).sort((a, b) => b.amount - a.amount);

  // 2. Prepare Item Breakdown Data
  const itemMap = {};
  vouchers.forEach((v) => {
    (v.items || []).forEach((item) => {
      const name = item.stockItemName || 'Other';
      itemMap[name] = (itemMap[name] || 0) + (Number(item.amount) || 0);
    });
  });
  const itemChartData = Object.keys(itemMap).map((name) => ({
    name,
    amount: itemMap[name]
  })).sort((a, b) => b.amount - a.amount);

  // 3. Prepare Date Timeline Data
  const dateMap = {};
  vouchers.forEach((v) => {
    const dateFormatted = formatReadableDate(v.date);
    dateMap[dateFormatted] = (dateMap[dateFormatted] || 0) + (Number(v.totalAmount) || 0);
  });
  const trendChartData = Object.keys(dateMap).map((date) => ({
    date,
    sales: dateMap[date]
  }));

  // Custom tooltip formatter
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900/95 border border-slate-700/80 p-3 rounded-xl shadow-xl text-xs">
          <p className="font-semibold text-slate-200 mb-1">{label || payload[0].name}</p>
          <p className="text-emerald-400 font-bold">
            {formatCurrency(payload[0].value)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 my-6">
      {/* 1. Party Ledger Share (Donut Chart) */}
      <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl p-5 border border-slate-800 flex flex-col justify-between shadow-lg">
        <div>
          <h3 className="text-sm font-bold text-slate-200 tracking-wide">
            Sales by Party Ledger
          </h3>
          <p className="text-xs text-slate-400">Revenue split across clients</p>
        </div>
        <div className="h-64 mt-4 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={partyChartData}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={85}
                paddingAngle={4}
                dataKey="amount"
              >
                {partyChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend
                verticalAlign="bottom"
                height={36}
                formatter={(value) => <span className="text-xs text-slate-300">{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 2. Top Stock Items Revenue (Bar Chart) */}
      <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl p-5 border border-slate-800 flex flex-col justify-between shadow-lg">
        <div>
          <h3 className="text-sm font-bold text-slate-200 tracking-wide">
            Top Stock Items Revenue
          </h3>
          <p className="text-xs text-slate-400">Highest grossing inventory items</p>
        </div>
        <div className="h-64 mt-4 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={itemChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <XAxis dataKey="name" stroke="#64748B" fontSize={11} tickLine={false} />
              <YAxis stroke="#64748B" fontSize={11} tickLine={false} tickFormatter={(v) => `₹${v / 1000}k`} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="amount" radius={[6, 6, 0, 0]}>
                {itemChartData.map((entry, index) => (
                  <Cell key={`cell-bar-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 3. Sales Trend Over Dates (Area Chart) */}
      <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl p-5 border border-slate-800 flex flex-col justify-between shadow-lg">
        <div>
          <h3 className="text-sm font-bold text-slate-200 tracking-wide">
            Sales Turnover Timeline
          </h3>
          <p className="text-xs text-slate-400">Voucher date trend analysis</p>
        </div>
        <div className="h-64 mt-4 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trendChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" stroke="#64748B" fontSize={10} tickLine={false} />
              <YAxis stroke="#64748B" fontSize={11} tickLine={false} tickFormatter={(v) => `₹${v / 1000}k`} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="sales" stroke="#3B82F6" strokeWidth={2} fillOpacity={1} fill="url(#colorSales)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
