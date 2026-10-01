import axiosClient from './axiosClient.js';

export const MONTH_OPTIONS = [
  { value: 'all', label: 'All Months' },
  { value: '1', label: 'January' },
  { value: '2', label: 'February' },
  { value: '3', label: 'March' },
  { value: '4', label: 'April' },
  { value: '5', label: 'May' },
  { value: '6', label: 'June' },
  { value: '7', label: 'July' },
  { value: '8', label: 'August' },
  { value: '9', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
];

const currentYearNum = new Date().getFullYear();
export const YEAR_OPTIONS = Array.from({ length: 15 }, (_, i) => String(currentYearNum - 10 + i));

// Helper to get from and to dates (YYYY-MM-DD) for a given month in a year
export function getMonthDateRange(year, monthIndex) {
  const y = Number(year);
  const m = Number(monthIndex);
  const from = `${y}-${String(m).padStart(2, '0')}-01`;
  const lastDay = new Date(y, m, 0).getDate();
  const to = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  return { from, to };
}

// Fetch the list of companies loaded in Tally: GET /api/company/all
export async function getAllCompaniesApi() {
  try {
    const response = await axiosClient.get('/api/company/all');
    const list = response.data?.data || [];
    return list.map((c) => (typeof c === 'string' ? c : c.name)).filter(Boolean);
  } catch {
    return [];
  }
}

export async function getActiveCompanyApi() {
  try {
    const response = await axiosClient.get('/api/tally/active-company');
    const comp = response.data?.companyName || response.data?.name || response.data;
    if (comp && typeof comp === 'string') return comp.trim();
  } catch {
    try {
      const response = await axiosClient.get('/api/tally/company');
      const comp = response.data?.companyName || response.data?.name || response.data;
      if (comp && typeof comp === 'string') return comp.trim();
    } catch {
      // Unable to fetch active company
    }
  }
  return '';
}

// GET /api/tally/{companyName}/sales-vouchers/date-range?from={fromDate}&to={toDate}
export async function getSalesVouchersDateRangeApi(companyName = '', fromDate, toDate) {
  let cleanCompany = (companyName || '').trim();

  if (!cleanCompany) {
    cleanCompany = await getActiveCompanyApi();
  }

  if (!cleanCompany) {
    throw new Error('No active company found in Tally. Please ensure a company is open in TallyPrime.');
  }

  const encodedCompany = encodeURIComponent(cleanCompany);
  const targetUrl = `/api/tally/${encodedCompany}/sales-vouchers/date-range?from=${fromDate}&to=${toDate}`;

  try {
    const response = await axiosClient.get(targetUrl);
    return response.data || [];
  } catch (err) {
    const msg =
      err.response?.data?.message ||
      err.response?.data ||
      err.message ||
      'Unable to connect to Tally. Please make sure the Tally Agent and TallyPrime are running.';
    throw new Error(typeof msg === 'string' ? msg : 'Unable to connect to Tally. Please make sure the Tally Agent and TallyPrime are running.');
  }
}

// Orchestrator function:
// When month === 'all', calls date-range API 12 times in parallel (Jan..Dec) and flattens combined data.
// When a specific month is selected (e.g. '4'), calls date-range API once for that month.
export async function fetchSalesVouchersForPeriodApi(companyName, year, month = 'all') {
  if (month === 'all' || !month) {
    const monthRequests = [];
    for (let m = 1; m <= 12; m++) {
      const range = getMonthDateRange(year, m);
      monthRequests.push(getSalesVouchersDateRangeApi(companyName, range.from, range.to));
    }
    const responses = await Promise.all(monthRequests);
    const combinedVouchers = responses.flat();
    return combinedVouchers;
  } else {
    const range = getMonthDateRange(year, month);
    return await getSalesVouchersDateRangeApi(companyName, range.from, range.to);
  }
}

export async function getSalesVouchersApi(companyName = '') {
  const year = new Date().getFullYear();
  return fetchSalesVouchersForPeriodApi(companyName, year, 'all');
}