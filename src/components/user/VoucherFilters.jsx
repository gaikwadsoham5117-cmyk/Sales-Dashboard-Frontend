import React from 'react';
import { Search, Filter, X } from 'lucide-react';

export default function VoucherFilters({
  filters,
  setFilters,
  partyOptions = [],
  itemOptions = [],
  resetFilters,
}) {
  const inputClass =
    'w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-blue-500 dark:focus:border-blue-500 transition-colors';

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm mb-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
          <h4 className="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
            Filter & Search Vouchers
          </h4>
        </div>
        <button
          onClick={resetFilters}
          className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
          Reset
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Search */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-gray-400 dark:text-gray-500 pointer-events-none" />
          <input
            type="text"
            placeholder="Search voucher or party..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            className={`${inputClass} pl-8`}
          />
        </div>

        {/* Party Ledger */}
        <select
          value={filters.partyLedger}
          onChange={(e) => setFilters({ ...filters, partyLedger: e.target.value })}
          className={inputClass}
        >
          <option value="">All Party Ledgers</option>
          {partyOptions.map((party) => (
            <option key={party} value={party}>{party}</option>
          ))}
        </select>

        {/* Stock Item */}
        <select
          value={filters.stockItem}
          onChange={(e) => setFilters({ ...filters, stockItem: e.target.value })}
          className={inputClass}
        >
          <option value="">All Stock Items</option>
          {itemOptions.map((item) => (
            <option key={item} value={item}>{item}</option>
          ))}
        </select>

        {/* Date Range */}
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={filters.startDate}
            onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
            className={`${inputClass} w-1/2`}
          />
          <span className="text-gray-300 dark:text-gray-600 text-xs flex-shrink-0">—</span>
          <input
            type="date"
            value={filters.endDate}
            onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
            className={`${inputClass} w-1/2`}
          />
        </div>
      </div>
    </div>
  );
}
