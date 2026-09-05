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
  const [companyInput, setCompanyInput] = useState('');
  const [activeCompany, setActiveCompany] = useState('');
  const [companyList, setCompanyList] = useState([]);
  const [companiesLoading, setCompaniesLoading] = useState(false);
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [is403, setIs403] = useState(false);

  // Filter state
  const [filters, setFilters] = useState({
    partyLedger: '',
    stockItem: '',
    startDate: '',
    endDate: '',
    search: ''
  });

  const fetchVouchersForCompany = async (targetCompany) => {
    setLoading(true);
    setError('');
    setIs403(false);
    try {
      let compName = targetCompany !== undefined ? targetCompany : companyInput;
      compName = (compName || '').trim();

      // If no company name specified, fetch active company from Tally
      if (!compName) {
        compName = await getActiveCompanyApi();
        if (compName) {
          setCompanyInput(compName);
        }
      }

      const data = await getSalesVouchersApi(compName);
      setVouchers(data || []);
      setActiveCompany(compName || 'Tally Active Company');
    } catch (err) {
      console.error(`Fetch error for company:`, err);
      const msg = err.message || `Unable to fetch sales records for active Tally company.`;
      setError(msg);
      if (msg.includes('403') || msg.includes('Forbidden')) {
        setIs403(true);
      }
      setVouchers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVouchersForCompany();
  }, []);

  // Load company dropdown list from GET /api/company/all
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

  // Extract unique Party Ledgers & Stock Items for filter dropdowns
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

  // Apply filtering rules to vouchers list
  const filteredVouchers = vouchers.filter((v) => {
    // 1. Party Ledger filter
    if (filters.partyLedger && v.partyLedgerName !== filters.partyLedger) {
      return false;
    }

    // 2. Stock Item filter
    if (filters.stockItem) {
      const hasItem = (v.items || []).some((i) => i.stockItemName === filters.stockItem);
      if (!hasItem) return false;
    }

    // 3. Search query filter
    if (filters.search) {
      const query = filters.search.toLowerCase();
      const matchVoucherNo = v.voucherNumber?.toLowerCase().includes(query);
      const matchParty = v.partyLedgerName?.toLowerCase().includes(query);
      const matchItem = (v.items || []).some((i) => i.stockItemName?.toLowerCase().includes(query));
      if (!matchVoucherNo && !matchParty && !matchItem) return false;
    }

    // 4. Date Range filter
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

  const resetFilters = () => {
    setFilters({
      partyLedger: '',
      stockItem: '',
      startDate: '',
      endDate: '',
      search: ''
    });
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Dashboard Top Bar & Dynamic Company Selector */}
      <div className="bg-slate-900/80 backdrop-blur-md p-5 rounded-2xl border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl lg:text-2xl font-extrabold text-white tracking-tight">
                Sales Performance Dashboard
              </h2>
              {activeCompany && (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-blue-500/20 to-cyan-500/20 text-cyan-300 border border-cyan-500/30 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-cyan-400" />
                  Active Company: {activeCompany}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Realtime Tally sales vouchers, revenue distribution, line items & financial analytics
            </p>
          </div>

          {/* Custom Company Name Change Form */}
          <form onSubmit={handleCompanySubmit} className="flex items-center gap-2">
            <div className="relative">
              <Building2 className="w-4 h-4 absolute left-3 top-2.5 text-slate-400 z-10 pointer-events-none" />
              <select
                value={companyInput}
                onChange={(e) => setCompanyInput(e.target.value)}
                disabled={companiesLoading}
                className="w-56 sm:w-64 bg-slate-950/90 border border-slate-700/80 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500 transition-colors font-medium appearance-none cursor-pointer disabled:opacity-50"
              >
                <option value="" disabled>
                  {companiesLoading ? 'Loading companies...' : 'Select Tally Company...'}
                </option>
                {companyList.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Apply Company</span>
            </button>
          </form>
        </div>
      </div>

      {error && (
        <div className="p-5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs space-y-3 shadow-lg">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
              <span className="font-semibold">{error}</span>
            </div>
            <button
              onClick={() => fetchVouchersForCompany(companyInput)}
              className="px-3 py-1 rounded-lg bg-rose-500/20 text-rose-200 hover:bg-rose-500/30 font-semibold border border-rose-500/40 transition-colors"
            >
              Retry Sync
            </button>
          </div>

          {is403 && (
            <div className="pt-3 border-t border-rose-500/20 flex flex-wrap items-center justify-between gap-3 text-slate-300">
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Your backend requires JWT authorization. Please log in with valid account credentials.</span>
              </div>
              <button
                onClick={logout}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md shadow-purple-600/20 transition-all cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Re-login to Obtain Token</span>
              </button>
            </div>
          )}
        </div>
      )}

      {loading ? (
        <div className="py-16 text-center space-y-3">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs text-slate-400 font-medium">
            Fetching Tally Sales Vouchers for active company...
          </p>
        </div>
      ) : (
        <>
          {/* 1. KPI Metric Summary Cards */}
          <KPIOverview vouchers={filteredVouchers} />

          {/* 2. Interactive Charts Section */}
          <ChartsSection vouchers={filteredVouchers} />

          {/* 3. Multi-Filter Toolbar */}
          <VoucherFilters
            filters={filters}
            setFilters={setFilters}
            partyOptions={partyOptions}
            itemOptions={itemOptions}
            resetFilters={resetFilters}
          />

          <SalesVoucherTable vouchers={filteredVouchers} />
        </>
      )}
    </div>
  );
}