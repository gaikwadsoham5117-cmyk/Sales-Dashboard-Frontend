import React, { useState, useEffect } from 'react';
import {
  fetchSalesVouchersForPeriodApi,
  getActiveCompanyApi,
  getAllCompaniesApi,
  MONTH_OPTIONS,
  YEAR_OPTIONS,
} from '../api/tallyApi';
import { useAuth } from '../context/AuthContext';
import KPIOverview from '../components/user/KPIOverview';
import ChartsSection from '../components/user/ChartsSection';
import VoucherFilters from '../components/user/VoucherFilters';
import SalesVoucherTable from '../components/user/SalesVoucherTable';
import { parseTallyDate } from '../utils/formatters';
import { RefreshCw, Building2, Calendar, Filter, ShieldAlert, LogOut, KeyRound, Play } from 'lucide-react';

export default function UserDashboard() {
  const { logout } = useAuth();

  const currentYear = new Date().getFullYear().toString();
  const currentMonth = (new Date().getMonth() + 1).toString();
  const [selectedCompany, setSelectedCompany] = useState('');
  const [selectedYear, setSelectedYear]       = useState(currentYear);
  const [selectedMonth, setSelectedMonth]     = useState(currentMonth);

  const [companyList, setCompanyList]         = useState([]);
  const [companiesLoading, setCompaniesLoading] = useState(false);
  const [vouchers, setVouchers]               = useState([]);
  const [loading, setLoading]                 = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(null);
  const [hasApplied, setHasApplied]           = useState(false);
  const [error, setError]                     = useState('');
  const [is403, setIs403]                     = useState(false);

  const [filters, setFilters] = useState({
    partyLedger: '',
    partyParentName: '',
    stockItem: '',
    itemParentName: '',
    startDate: '',
    endDate: '',
    search: '',
  });

  const fetchVouchers = async (comp = selectedCompany, yr = selectedYear, mn = selectedMonth) => {
    setLoading(true);
    setLoadingProgress(null);
    setError('');
    setIs403(false);
    try {
      let targetComp = (comp || '').trim();
      if (!targetComp) {
        targetComp = await getActiveCompanyApi();
        if (targetComp) setSelectedCompany(targetComp);
      }

      if (!targetComp) {
        throw new Error('No active company found in Tally. Please select a company.');
      }

      const yrNum = parseInt(yr, 10);
      if (!yrNum || isNaN(yrNum) || yrNum < 1900 || yrNum > 2100) {
        throw new Error('Please enter a valid 4-digit year (e.g. 2025).');
      }

      const data = await fetchSalesVouchersForPeriodApi(targetComp, yrNum, mn, (progress) => {
        setLoadingProgress(progress);
      });
      setVouchers(data || []);
    } catch (err) {
      const msg = err.message || 'Unable to fetch sales records for Tally company.';
      setError(msg);
      if (msg.includes('403') || msg.includes('Forbidden')) setIs403(true);
      setVouchers([]);
    } finally {
      setLoading(false);
      setLoadingProgress(null);
    }
  };

  // Initial load: Fetch company list & active company ONLY (Do NOT fetch vouchers automatically)
  useEffect(() => {
    const initCompanies = async () => {
      setCompaniesLoading(true);
      const list = await getAllCompaniesApi();
      setCompanyList(list);

      let activeComp = await getActiveCompanyApi();
      if (!activeComp && list.length > 0) {
        activeComp = list[0];
      }
      if (activeComp) {
        setSelectedCompany(activeComp);
      }
      setCompaniesLoading(false);
    };

    initCompanies();
  }, []);

  // Form submit handler: hits API only when user clicks Apply button
  const handleApplySubmit = (e) => {
    if (e) e.preventDefault();
    setHasApplied(true);
    fetchVouchers(selectedCompany, selectedYear, selectedMonth);
  };

  const partyOptions = Array.from(
    new Set(vouchers.map((v) => v.partyLedgerName).filter(Boolean))
  ).sort();

  const partyParentOptions = Array.from(
    new Set(vouchers.map((v) => v.partyParentName).filter(Boolean))
  ).sort();

  const itemOptionsSet = new Set();
  const itemParentOptionsSet = new Set();
  vouchers.forEach((v) => {
    (v.items || []).forEach((item) => {
      if (item.stockItemName) itemOptionsSet.add(item.stockItemName);
      if (item.itemParentName) itemParentOptionsSet.add(item.itemParentName);
    });
  });
  const itemOptions = Array.from(itemOptionsSet).sort();
  const itemParentOptions = Array.from(itemParentOptionsSet).sort();

  const filteredVouchers = vouchers.filter((v) => {
    if (filters.partyLedger && v.partyLedgerName !== filters.partyLedger) return false;
    if (filters.partyParentName && v.partyParentName !== filters.partyParentName) return false;

    if (filters.stockItem) {
      const hasItem = (v.items || []).some((i) => i.stockItemName === filters.stockItem);
      if (!hasItem) return false;
    }
    if (filters.itemParentName) {
      const hasItemGroup = (v.items || []).some((i) => i.itemParentName === filters.itemParentName);
      if (!hasItemGroup) return false;
    }

    if (filters.search) {
      const query = filters.search.toLowerCase();
      const matchVoucherNo   = v.voucherNumber?.toLowerCase().includes(query);
      const matchReference   = v.reference?.toLowerCase().includes(query);
      const matchParty       = v.partyLedgerName?.toLowerCase().includes(query);
      const matchPartyParent = v.partyParentName?.toLowerCase().includes(query);
      const matchItem        = (v.items || []).some(
        (i) =>
          i.stockItemName?.toLowerCase().includes(query) ||
          i.itemParentName?.toLowerCase().includes(query)
      );
      if (!matchVoucherNo && !matchReference && !matchParty && !matchPartyParent && !matchItem) return false;
    }
    const vDate = parseTallyDate(v.date);
    if (vDate) {
      if (filters.startDate) {
        const start = new Date(filters.startDate);
        start.setHours(0, 0, 0, 0);
        if (vDate < start) return false;
      }
      if (filters.endDate) {
        const end = new Date(filters.endDate);
        end.setHours(23, 59, 59, 999);
        if (vDate > end) return false;
      }
    }
    return true;
  });

  const resetFilters = () =>
    setFilters({
      partyLedger: '',
      partyParentName: '',
      stockItem: '',
      itemParentName: '',
      startDate: '',
      endDate: '',
      search: '',
    });

  const currentMonthLabel =
    MONTH_OPTIONS.find((m) => m.value === selectedMonth)?.label || 'All Months';

  return (
    <div className="space-y-5 pb-12">
      {/* Primary Selection & Header Card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Header Title */}
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
                Sales Performance Dashboard
              </h2>
              {selectedCompany && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-xs font-semibold border border-blue-100 dark:border-blue-800/40">
                  <Building2 className="w-3.5 h-3.5" />
                  {selectedCompany}
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              Realtime Tally sales vouchers, revenue distribution, line items & financial analytics
            </p>
          </div>

          {/* 3 Primary Filters Form: Company, Year, Month -> Hit API on Apply */}
          <form onSubmit={handleApplySubmit} className="flex flex-wrap items-center gap-3">
            {/* 1. Company Filter */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Company
              </label>
              <div className="relative">
                <Building2 className="w-3.5 h-3.5 absolute left-3 top-2.5 text-gray-400 z-10 pointer-events-none" />
                <select
                  value={selectedCompany}
                  onChange={(e) => setSelectedCompany(e.target.value)}
                  disabled={companiesLoading || loading}
                  className="w-48 sm:w-56 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg pl-8 pr-3 py-2 text-xs font-medium text-gray-800 dark:text-gray-200 focus:outline-none focus:border-blue-500 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <option value="" disabled>
                    {companiesLoading ? 'Loading companies...' : 'Select Tally Company'}
                  </option>
                  {companyList.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* 2. Year Filter (Editable field allowing custom year input & quick suggestions) */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Year
              </label>
              <div className="relative">
                <Calendar className="w-3.5 h-3.5 absolute left-3 top-2.5 text-gray-400 z-10 pointer-events-none" />
                <input
                  type="number"
                  min="1900"
                  max="2100"
                  placeholder="e.g. 2025"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  disabled={loading}
                  list="year-suggestions-list"
                  className="w-28 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg pl-8 pr-3 py-2 text-xs font-medium text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:border-blue-500 transition-colors disabled:opacity-50"
                />
                <datalist id="year-suggestions-list">
                  {YEAR_OPTIONS.map((yr) => (
                    <option key={yr} value={yr} />
                  ))}
                </datalist>
              </div>
            </div>

            {/* 3. Month Filter */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Month
              </label>
              <div className="relative">
                <Filter className="w-3.5 h-3.5 absolute left-3 top-2.5 text-gray-400 z-10 pointer-events-none" />
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  disabled={loading}
                  className="w-36 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg pl-8 pr-3 py-2 text-xs font-medium text-gray-800 dark:text-gray-200 focus:outline-none focus:border-blue-500 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {MONTH_OPTIONS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Apply Button - triggers API request */}
            <div className="flex flex-col gap-1 justify-end">
              <label className="text-[10px] font-semibold text-transparent uppercase tracking-wider select-none">
                Action
              </label>
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-colors disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span>Apply</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 text-red-700 dark:text-red-300 text-xs space-y-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-red-500 shrink-0" />
              <span className="font-semibold">{error}</span>
            </div>
            <button
              onClick={handleApplySubmit}
              className="px-3 py-1.5 rounded-lg bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/60 font-semibold border border-red-200 dark:border-red-700 transition-colors text-xs cursor-pointer"
            >
              Retry Sync
            </button>
          </div>

          {is403 && (
            <div className="pt-3 border-t border-red-200 dark:border-red-800/40 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                <KeyRound className="w-4 h-4 text-amber-500 shrink-0" />
                <span>Your backend requires JWT authorization. Please log in with valid credentials.</span>
              </div>
              <button
                onClick={logout}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Re-login</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Loading state */}
      {loading ? (
        <div className="py-20 text-center space-y-4">
          <div className="w-9 h-9 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <div className="space-y-1">
            <p className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-200">
              {loadingProgress
                ? `Loading ${loadingProgress.monthName} (${loadingProgress.currentStep || loadingProgress.currentMonth} of ${loadingProgress.totalSteps || loadingProgress.totalMonths})...`
                : selectedMonth === 'all'
                ? `Fetching Tally Sales Vouchers for ${selectedYear}...`
                : `Fetching Tally Sales Vouchers for ${currentMonthLabel} ${selectedYear}...`}
            </p>
            {loadingProgress && (
              <div className="max-w-xs mx-auto pt-2 space-y-1.5">
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                    style={{
                      width: `${(((loadingProgress.currentStep || loadingProgress.currentMonth)) / (loadingProgress.totalSteps || loadingProgress.totalMonths)) * 100}%`,
                    }}
                  />
                </div>
                <span className="text-[10px] text-gray-400 dark:text-gray-500 font-mono block">
                  {Math.round(
                    (((loadingProgress.currentStep || loadingProgress.currentMonth)) / (loadingProgress.totalSteps || loadingProgress.totalMonths)) * 100
                  )}% completed
                </span>
              </div>
            )}
          </div>
        </div>
      ) : !hasApplied ? (
        /* Prompt before initial Apply click */
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center space-y-3 shadow-sm">
          <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto">
            <Play className="w-5 h-5 fill-current ml-0.5" />
          </div>
          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
            Select Company, Year & Month
          </h3>
          <p className="text-xs text-gray-400 dark:text-gray-500 max-w-md mx-auto">
            Choose your desired Tally Company, enter or select a Year, and choose Month filters above, then click{' '}
            <span className="font-semibold text-blue-600 dark:text-blue-400">Apply</span> to fetch sales vouchers.
          </p>
        </div>
      ) : (
        /* Dashboard content after Apply is clicked */
        <>
          <VoucherFilters
            filters={filters}
            setFilters={setFilters}
            partyOptions={partyOptions}
            partyParentOptions={partyParentOptions}
            itemOptions={itemOptions}
            itemParentOptions={itemParentOptions}
            resetFilters={resetFilters}
          />
          <KPIOverview vouchers={filteredVouchers} />
          <ChartsSection vouchers={filteredVouchers} />
          <SalesVoucherTable vouchers={filteredVouchers} />
        </>
      )}
    </div>
  );
}