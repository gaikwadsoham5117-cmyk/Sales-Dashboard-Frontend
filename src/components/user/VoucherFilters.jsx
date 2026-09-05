import React from 'react';
import { Search, Filter, Calendar, X } from 'lucide-react';

export default function VoucherFilters({
  filters,
  setFilters,
  partyOptions = [],
  itemOptions = [],
  resetFilters
}) {
  return (
    <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl p-4 border border-slate-800 mb-6 shadow-md">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-indigo-400" />
          <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
            Filter & Search Vouchers
          </h4>
        </div>
        <button
          onClick={resetFilters}
          className="flex items-center gap-1 text-xs text-slate-400 hover:text-rose-400 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
          Reset Filters
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Search input */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
          <input
            type="text"
            placeholder="Search Voucher # or Party..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500/80"
          />
        </div>

        {/* Party Ledger Filter */}
        <div>
          <select
            value={filters.partyLedger}
            onChange={(e) => setFilters({ ...filters, partyLedger: e.target.value })}
            className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500/80"
          >
            <option value="">All Party Ledgers</option>
            {partyOptions.map((party) => (
              <option key={party} value={party}>
                {party}
              </option>
            ))}
          </select>
        </div>

        {/* Stock Item Filter */}
        <div>
          <select
            value={filters.stockItem}
            onChange={(e) => setFilters({ ...filters, stockItem: e.target.value })}
            className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500/80"
          >
            <option value="">All Stock Items</option>
            {itemOptions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>

        {/* Date Range Picker */}
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={filters.startDate}
            onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
            className="w-1/2 bg-slate-950/80 border border-slate-800 rounded-xl px-2 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500/80"
          />
          <span className="text-slate-500 text-xs">-</span>
          <input
            type="date"
            value={filters.endDate}
            onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
            className="w-1/2 bg-slate-950/80 border border-slate-800 rounded-xl px-2 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500/80"
          />
        </div>
      </div>
    </div>
  );
}
