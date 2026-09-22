import React, { useState, useEffect } from 'react';
import { getSalesVouchersApi, getActiveCompanyApi, getAllCompaniesApi } from '../api/tallyApi';
import { useAuth } from '../context/AuthContext';
import KPIOverview from '../components/user/KPIOverview';
import ChartsSection from '../components/user/ChartsSection';
import VoucherFilters from '../components/user/VoucherFilters';
import SalesVoucherTable from '../components/user/SalesVoucherTable';
import { parseTallyDate } from '../utils/formatters';
import { RefreshCw, Building2, ShieldAlert, LogOut, KeyRound } from 'lucide-react';

export default function UserDashboard() {
  const { logout } = useAuth();
  const [companyInput, setCompanyInput]   = useState('');
  const [activeCompany, setActiveCompany] = useState('');
  const [companyList, setCompanyList]     = useState([]);
  const [companiesLoading, setCompaniesLoading] = useState(false);
  const [vouchers, setVouchers]           = useState([]);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState('');
  const [is403, setIs403]                 = useState(false);

  const [filters, setFilters] = useState({
    partyLedger: '', stockItem: '', startDate: '', endDate: '', search: '',
  });

  const fetchVouchersForCompany = async (targetCompany) => {
    setLoading(true);
    setError('');
    setIs403(false);
    try {
      let compName = targetCompany !== undefined ? targetCompany : companyInput;
      compName = (compName || '').trim();
      if (!compName) {
        compName = await getActiveCompanyApi();
        if (compName) setCompanyInput(compName);
      }
      const data = await getSalesVouchersApi(compName);
      setVouchers(data || []);
      setActiveCompany(compName || 'Tally Active Company');
    } catch (err) {
      const msg = err.message || 'Unable to fetch sales records for active Tally company.';
      setError(msg);
      if (msg.includes('403') || msg.includes('Forbidden')) setIs403(true);
      setVouchers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchVouchersForCompany(); }, []);

  useEffect(() => {
    const loadCompanies = async () => {
      setCompaniesLoading(true);
      const list = await getAllCompaniesApi();
      setCompanyList(list);
      setCompaniesLoading(false);
    };
    loadCompanies();
  }, []);

  const handleCompanySubmit = (e) => {
    e.preventDefault();
    fetchVouchersForCompany(companyInput);
  };

  const partyOptions = Array.from(
    new Set(vouchers.map((v) => v.partyLedgerName).filter(Boolean))
  ).sort();

  const itemOptionsSet = new Set();
  vouchers.forEach((v) => {
    (v.items || []).forEach((item) => {
      if (item.stockItemName) itemOptionsSet.add(item.stockItemName);
    });
  });
  const itemOptions = Array.from(itemOptionsSet).sort();

  const filteredVouchers = vouchers.filter((v) => {
    if (filters.partyLedger && v.partyLedgerName !== filters.partyLedger) return false;
    if (filters.stockItem) {
      const hasItem = (v.items || []).some((i) => i.stockItemName === filters.stockItem);
      if (!hasItem) return false;
    }
    if (filters.search) {
      const query = filters.search.toLowerCase();
      const matchVoucherNo = v.voucherNumber?.toLowerCase().includes(query);
      const matchParty     = v.partyLedgerName?.toLowerCase().includes(query);
      const matchItem      = (v.items || []).some((i) => i.stockItemName?.toLowerCase().includes(query));
      if (!matchVoucherNo && !matchParty && !matchItem) return false;
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
    setFilters({ partyLedger: '', stockItem: '', startDate: '', endDate: '', search: '' });

  return (
    <div className="space-y-5 pb-12">

      {/* Dashboard header card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">

          {/* Title */}
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
                Sales Performance Dashboard
              </h2>
              {activeCompany && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-xs font-semibold border border-blue-100 dark:border-blue-800/40">
                  <Building2 className="w-3 h-3" />
                  {activeCompany}
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              Realtime Tally sales vouchers, revenue distribution, line items & financial analytics
            </p>
          </div>

          {/* Company selector */}
          <form onSubmit={handleCompanySubmit} className="flex items-center gap-2 flex-shrink-0">
            <div className="relative">
              <Building2 className="w-3.5 h-3.5 absolute left-3 top-2.5 text-gray-400 z-10 pointer-events-none" />
              <select
                value={companyInput}
                onChange={(e) => setCompanyInput(e.target.value)}
                disabled={companiesLoading}
                className="w-56 sm:w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg pl-8 pr-3 py-2 text-xs text-gray-800 dark:text-gray-200 focus:outline-none focus:border-blue-500 dark:focus:border-blue-500 transition-colors appearance-none cursor-pointer disabled:opacity-50"
              >
                <option value="" disabled>
                  {companiesLoading ? 'Loading companies...' : 'Select Tally Company...'}
                </option>
                {companyList.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Apply</span>
            </button>
          </form>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 text-red-700 dark:text-red-300 text-xs space-y-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-red-500 shrink-0" />
              <span className="font-semibold">{error}</span>
            </div>
            <button
              onClick={() => fetchVouchersForCompany(companyInput)}
              className="px-3 py-1.5 rounded-lg bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/60 font-semibold border border-red-200 dark:border-red-700 transition-colors text-xs"
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
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-colors"
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
        <div className="py-20 text-center space-y-3">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-gray-400 dark:text-gray-500 font-medium">
            Fetching Tally Sales Vouchers...
          </p>
        </div>
      ) : (
        <>
          <VoucherFilters
            filters={filters}
            setFilters={setFilters}
            partyOptions={partyOptions}
            itemOptions={itemOptions}
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