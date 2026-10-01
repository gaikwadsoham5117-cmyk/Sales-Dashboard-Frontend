import React from 'react';
import { Search, Filter, X } from 'lucide-react';

export default function VoucherFilters({
  filters,
  setFilters,
  partyOptions = [],
  partyParentOptions = [],
  itemOptions = [],
  itemParentOptions = [],
  resetFilters,
}) {
  const inputClass =
    'w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-blue-500 dark:focus:border-blue-500 transition-colors';

  const labelClass =
    'text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1 block';

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
          className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 transition-colors cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
          Reset Filters
        </button>
      </div>

      {/* Responsive Grid: 3 columns on lg/xl screens so all controls fit with ample space */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {/* 1. Search */}
        <div>
          <label className={labelClass}>Search Vouchers</label>
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-gray-400 dark:text-gray-500 pointer-events-none" />
            <input
              type="text"
              placeholder="Search voucher, ref, party, item..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className={`${inputClass} pl-8`}
            />
          </div>
        </div>

        {/* 2. Party Parent / Group Filter */}
        <div>
          <label className={labelClass}>Party Group</label>
          <select
            value={filters.partyParentName || ''}
            onChange={(e) => setFilters({ ...filters, partyParentName: e.target.value })}
            className={inputClass}
          >
            <option value="">All Party Groups</option>
            {partyParentOptions.map((parent) => (
              <option key={parent} value={parent}>
                {parent}
              </option>
            ))}
          </select>
        </div>

        {/* 3. Party Ledger Filter */}
        <div>
          <label className={labelClass}>Party Ledger</label>
          <select
            value={filters.partyLedger}
            onChange={(e) => setFilters({ ...filters, partyLedger: e.target.value })}
            className={inputClass}
          >
            <option value="">All Party Ledgers</option>
            {partyOptions.map((party) => (
              <option key={party} value={party}>
                {party}
              </option>
            ))}
          </select>
        </div>

        {/* 4. Stock Item Parent / Group Filter */}
        <div>
          <label className={labelClass}>Item Group</label>
          <select
            value={filters.itemParentName || ''}
            onChange={(e) => setFilters({ ...filters, itemParentName: e.target.value })}
            className={inputClass}
          >
            <option value="">All Item Groups</option>
            {itemParentOptions.map((itemParent) => (
              <option key={itemParent} value={itemParent}>
                {itemParent}
              </option>
            ))}
          </select>
        </div>

        {/* 5. Stock Item Filter */}
        <div>
          <label className={labelClass}>Stock Item</label>
          <select
            value={filters.stockItem}
            onChange={(e) => setFilters({ ...filters, stockItem: e.target.value })}
            className={inputClass}
          >
            <option value="">All Stock Items</option>
            {itemOptions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>

        {/* 6. Date Range */}
        <div>
          <label className={labelClass}>Date Range (From - To)</label>
          <div className="flex items-center gap-1.5 min-w-0 w-full">
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              className={`${inputClass} min-w-0 flex-1 text-[11px] px-2 py-2`}
            />
            <span className="text-gray-400 dark:text-gray-500 text-xs flex-shrink-0">—</span>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              className={`${inputClass} min-w-0 flex-1 text-[11px] px-2 py-2`}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
