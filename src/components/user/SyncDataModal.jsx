import React, { useState, useMemo } from 'react';
import {
  X,
  RefreshCw,
  Calendar,
  Building2,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  PlusCircle,
  Edit3,
  Trash2,
  Check,
} from 'lucide-react';
import { MONTH_OPTIONS, getMonthDateRange } from '../../api/tallyApi.js';
import { syncPeriodVouchers } from '../../services/syncService.js';
import { formatReadableDate, formatDateTime } from '../../utils/formatters.js';
import { getFinancialYear } from '../../services/indexeddb/helpers.js';

export default function SyncDataModal({
  isOpen,
  onClose,
  companyName,
  selectedYear,
  selectedMonth,
  organizationId,
  onSyncSuccess,
}) {
  const currentCalYear = new Date().getFullYear();
  const currentCalMonth = new Date().getMonth() + 1;

  // Selected period mode: 'current' | 'previous' | 'select_month' | 'custom'
  const [periodMode, setPeriodMode] = useState('select_month');

  // For 'select_month' mode
  const [selectMonthVal, setSelectMonthVal] = useState(
    selectedMonth !== 'all' ? String(selectedMonth) : String(currentCalMonth)
  );
  const [selectYearVal, setSelectYearVal] = useState(String(selectedYear || currentCalYear));

  // For 'custom' mode
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  // Execution states
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState('');
  const [syncResult, setSyncResult] = useState(null);

  // Derived Financial Year for context
  const derivedFY = useMemo(() => {
    if (selectedYear) {
      return `${selectedYear}-${String(Number(selectedYear) + 1).slice(-2)}`;
    }
    return getFinancialYear();
  }, [selectedYear]);

  // Calculate [fromDate, toDate] based on current selection
  const calculatedRange = useMemo(() => {
    if (periodMode === 'current') {
      return getMonthDateRange(currentCalYear, currentCalMonth);
    }
    if (periodMode === 'previous') {
      let prevM = currentCalMonth - 1;
      let prevY = currentCalYear;
      if (prevM < 1) {
        prevM = 12;
        prevY -= 1;
      }
      return getMonthDateRange(prevY, prevM);
    }
    if (periodMode === 'select_month') {
      const y = parseInt(selectYearVal, 10) || currentCalYear;
      const m = parseInt(selectMonthVal, 10) || 1;
      return getMonthDateRange(y, m);
    }
    if (periodMode === 'custom') {
      return { from: customFrom, to: customTo };
    }
    return { from: '', to: '' };
  }, [periodMode, currentCalYear, currentCalMonth, selectYearVal, selectMonthVal, customFrom, customTo]);

  // Range validation
  const validationError = useMemo(() => {
    if (periodMode === 'custom') {
      if (!customFrom || !customTo) {
        return 'Please specify both From and To dates.';
      }
      if (customFrom > customTo) {
        return 'From date cannot be after To date.';
      }
    }
    if (!calculatedRange.from || !calculatedRange.to) {
      return 'Invalid date range.';
    }
    if (calculatedRange.from > calculatedRange.to) {
      return 'From date cannot be after To date.';
    }
    return '';
  }, [periodMode, customFrom, customTo, calculatedRange]);

  const handleStartSync = async () => {
    if (validationError || isSyncing) return;

    setIsSyncing(true);
    setSyncError('');
    setSyncResult(null);

    try {
      const fy = getFinancialYear(calculatedRange.from);

      const result = await syncPeriodVouchers({
        organizationId,
        companyName,
        financialYear: fy,
        fromDate: calculatedRange.from,
        toDate: calculatedRange.to,
      });

      setSyncResult(result);
    } catch (err) {
      console.error('[MODAL] Sync failed:', err);
      setSyncError(err.message || 'Unable to connect to Tally. Existing cached data was not changed.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDone = () => {
    if (syncResult && typeof onSyncSuccess === 'function') {
      onSyncSuccess(syncResult);
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl transition-all">
        {/* Header */}
        <div className="p-5 bg-gray-50 dark:bg-gray-900/60 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <RefreshCw className={`w-5 h-5 ${isSyncing ? 'animate-spin' : ''}`} />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
                Sync Data with Tally
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Fetch latest sales vouchers and reconcile with local cache
              </p>
            </div>
          </div>
          {!isSyncing && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Active Context Box (Read-Only) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800/30 text-xs">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
              <div>
                <p className="text-[10px] uppercase font-bold text-gray-400 dark:text-gray-500">Company</p>
                <p className="font-semibold text-gray-800 dark:text-gray-200 truncate" title={companyName}>
                  {companyName || 'No company selected'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
              <div>
                <p className="text-[10px] uppercase font-bold text-gray-400 dark:text-gray-500">Financial Year</p>
                <p className="font-semibold text-gray-800 dark:text-gray-200">
                  {derivedFY}
                </p>
              </div>
            </div>
          </div>

          {/* Sync In-Progress State */}
          {isSyncing ? (
            <div className="py-8 text-center space-y-4">
              <div className="w-12 h-12 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <div className="space-y-1.5">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  Syncing data from Tally...
                </h4>
                <p className="text-xs text-blue-600 dark:text-blue-400 font-medium font-mono">
                  Period: {formatReadableDate(calculatedRange.from)} → {formatReadableDate(calculatedRange.to)}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Fetching latest authoritative records and updating IndexedDB...
                </p>
              </div>
            </div>
          ) : syncResult ? (
            /* Sync Success Result View */
            <div className="space-y-4">
              <div className="flex items-center gap-2.5 p-3.5 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/40 text-green-800 dark:text-green-300">
                <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 shrink-0" />
                <div>
                  <h4 className="text-sm font-bold">Sync Completed Successfully</h4>
                  <p className="text-xs font-mono text-green-700 dark:text-green-400">
                    Period: {formatReadableDate(syncResult.fromDate)} → {formatReadableDate(syncResult.toDate)}
                  </p>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
                <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-center gap-1 text-[11px] font-semibold text-green-600 dark:text-green-400 mb-0.5">
                    <PlusCircle size={12} />
                    <span>Added</span>
                  </div>
                  <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{syncResult.added}</p>
                </div>

                <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-center gap-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400 mb-0.5">
                    <Edit3 size={12} />
                    <span>Updated</span>
                  </div>
                  <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{syncResult.updated}</p>
                </div>

                <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-center gap-1 text-[11px] font-semibold text-red-600 dark:text-red-400 mb-0.5">
                    <Trash2 size={12} />
                    <span>Deleted</span>
                  </div>
                  <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{syncResult.deleted}</p>
                </div>

                <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-center gap-1 text-[11px] font-semibold text-gray-500 dark:text-gray-400 mb-0.5">
                    <Check size={12} />
                    <span>Unchanged</span>
                  </div>
                  <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{syncResult.unchanged}</p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-700 flex items-center justify-between text-xs">
                <span className="text-gray-500 dark:text-gray-400">Total vouchers in period:</span>
                <span className="font-bold text-gray-900 dark:text-gray-100">{syncResult.total.toLocaleString()}</span>
              </div>

              <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-700 flex items-center justify-between text-xs">
                <span className="text-gray-500 dark:text-gray-400">Last synced timestamp:</span>
                <span className="font-mono text-gray-700 dark:text-gray-300 font-medium">
                  {formatDateTime(syncResult.lastSyncedAt)}
                </span>
              </div>
            </div>
          ) : (
            /* Period Selector Form */
            <div className="space-y-4">
              <div>
                <label className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 block">
                  Select Sync Period:
                </label>

                <div className="space-y-2">
                  {/* Option A: Current Month */}
                  <label className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/30 cursor-pointer transition-colors">
                    <input
                      type="radio"
                      name="syncPeriodMode"
                      value="current"
                      checked={periodMode === 'current'}
                      onChange={() => setPeriodMode('current')}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <div className="text-xs">
                      <p className="font-semibold text-gray-800 dark:text-gray-200">Current Month</p>
                      <p className="text-gray-400 dark:text-gray-500">
                        {MONTH_OPTIONS.find((m) => m.value === String(currentCalMonth))?.label} {currentCalYear}
                      </p>
                    </div>
                  </label>

                  {/* Option B: Previous Month */}
                  <label className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/30 cursor-pointer transition-colors">
                    <input
                      type="radio"
                      name="syncPeriodMode"
                      value="previous"
                      checked={periodMode === 'previous'}
                      onChange={() => setPeriodMode('previous')}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <div className="text-xs">
                      <p className="font-semibold text-gray-800 dark:text-gray-200">Previous Month</p>
                      <p className="text-gray-400 dark:text-gray-500">
                        {MONTH_OPTIONS.find((m) => m.value === String(currentCalMonth === 1 ? 12 : currentCalMonth - 1))?.label}{' '}
                        {currentCalMonth === 1 ? currentCalYear - 1 : currentCalYear}
                      </p>
                    </div>
                  </label>

                  {/* Option C: Select Month */}
                  <label className="flex items-start gap-3 p-3 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/30 cursor-pointer transition-colors">
                    <input
                      type="radio"
                      name="syncPeriodMode"
                      value="select_month"
                      checked={periodMode === 'select_month'}
                      onChange={() => setPeriodMode('select_month')}
                      className="mt-1 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="text-xs flex-1 space-y-2">
                      <p className="font-semibold text-gray-800 dark:text-gray-200">Select Month</p>
                      {periodMode === 'select_month' && (
                        <div className="grid grid-cols-2 gap-2 pt-1">
                          <select
                            value={selectMonthVal}
                            onChange={(e) => setSelectMonthVal(e.target.value)}
                            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-2.5 py-1.5 text-xs text-gray-800 dark:text-gray-200 focus:outline-none focus:border-blue-500"
                          >
                            {MONTH_OPTIONS.filter((m) => m.value !== 'all').map((m) => (
                              <option key={m.value} value={m.value}>
                                {m.label}
                              </option>
                            ))}
                          </select>

                          <input
                            type="number"
                            min="1900"
                            max="2100"
                            placeholder="Year"
                            value={selectYearVal}
                            onChange={(e) => setSelectYearVal(e.target.value)}
                            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-2.5 py-1.5 text-xs text-gray-800 dark:text-gray-200 focus:outline-none focus:border-blue-500"
                          />
                        </div>
                      )}
                    </div>
                  </label>

                  {/* Option D: Custom Date Range */}
                  <label className="flex items-start gap-3 p-3 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/30 cursor-pointer transition-colors">
                    <input
                      type="radio"
                      name="syncPeriodMode"
                      value="custom"
                      checked={periodMode === 'custom'}
                      onChange={() => setPeriodMode('custom')}
                      className="mt-1 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="text-xs flex-1 space-y-2">
                      <p className="font-semibold text-gray-800 dark:text-gray-200">Custom Date Range</p>
                      {periodMode === 'custom' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                          <div>
                            <span className="text-[10px] text-gray-400 uppercase font-semibold block mb-0.5">From Date</span>
                            <input
                              type="date"
                              value={customFrom}
                              onChange={(e) => setCustomFrom(e.target.value)}
                              className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-2.5 py-1.5 text-xs text-gray-800 dark:text-gray-200 focus:outline-none focus:border-blue-500"
                            />
                          </div>
                          <div>
                            <span className="text-[10px] text-gray-400 uppercase font-semibold block mb-0.5">To Date</span>
                            <input
                              type="date"
                              value={customTo}
                              onChange={(e) => setCustomTo(e.target.value)}
                              className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-2.5 py-1.5 text-xs text-gray-800 dark:text-gray-200 focus:outline-none focus:border-blue-500"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </label>
                </div>
              </div>

              {/* Calculated Range Display */}
              {calculatedRange.from && calculatedRange.to && (
                <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-700 flex items-center justify-between text-xs">
                  <span className="text-gray-500 dark:text-gray-400">Calculated Period:</span>
                  <span className="font-semibold font-mono text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                    {formatReadableDate(calculatedRange.from)}
                    <ArrowRight size={12} />
                    {formatReadableDate(calculatedRange.to)}
                  </span>
                </div>
              )}

              {/* Validation or Sync Error */}
              {(validationError || syncError) && (
                <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-red-500" />
                  <span>{syncError || validationError}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50 dark:bg-gray-900/60 border-t border-gray-200 dark:border-gray-700 flex items-center justify-end gap-2.5">
          {syncResult ? (
            <button
              onClick={handleDone}
              className="px-5 py-2 rounded-xl text-xs font-semibold bg-green-600 hover:bg-green-700 text-white shadow-sm transition-colors cursor-pointer"
            >
              Done
            </button>
          ) : (
            <>
              <button
                onClick={onClose}
                disabled={isSyncing}
                className="px-4 py-2 rounded-xl text-xs font-semibold border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleStartSync}
                disabled={Boolean(validationError) || isSyncing || !companyName}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'Syncing...' : 'Sync Data'}</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
