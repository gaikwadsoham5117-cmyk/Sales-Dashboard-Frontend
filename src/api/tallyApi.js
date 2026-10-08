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

// Helper to get 15-day split date ranges (YYYY-MM-DD) for a given month in a year
// Split 1: 01 to 15
// Split 2: 16 to last day of month
export function getMonthSplitDateRanges(year, monthIndex) {
  const y = Number(year);
  const m = Number(monthIndex);
  const mStr = String(m).padStart(2, '0');
  const lastDay = new Date(y, m, 0).getDate();

  return [
    {
      from: `${y}-${mStr}-01`,
      to: `${y}-${mStr}-15`,
      label: '01 - 15',
    },
    {
      from: `${y}-${mStr}-16`,
      to: `${y}-${mStr}-${String(lastDay).padStart(2, '0')}`,
      label: `16 - ${lastDay}`,
    },
  ];
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
    const response = await axiosClient.get(targetUrl, {
      timeout: 300000, // 5 minutes timeout (300,000 ms) for Tally sales voucher requests
    });
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
// Splits each requested month into 15-day chunks (01-15 and 16-lastDay) to avoid overwhelming the server or hit payload limits.
// When month === 'all', calls date-range API for each 15-day range across all 12 months sequentially (24 requests total).
// When a specific month is selected (e.g. '5' for May), calls date-range API for both 15-day ranges for that month (2 requests total).
//
// onProgress(progressInfo)         — called before each chunk fetch (existing behaviour, unchanged)
// onChunkReceived(chunkVouchers, rangeFrom, rangeTo, stepInfo)
//   — async callback called AFTER each successful chunk fetch and AWAITED before the loop continues.
//   — Use this to persist each chunk to IndexedDB before moving to the next request.
//   — If omitted, behaviour is identical to the original function.
export async function fetchSalesVouchersForPeriodApi(
  companyName,
  year,
  month = 'all',
  onProgress,
  onChunkReceived,
) {
  if (month === 'all' || !month) {
    const combinedVouchers = [];
    const totalSteps = 24;
    let stepCount = 0;

    for (let m = 1; m <= 12; m++) {
      const monthObj = MONTH_OPTIONS.find((opt) => opt.value === String(m));
      const monthName = monthObj ? monthObj.label : `Month ${m}`;
      const ranges = getMonthSplitDateRanges(year, m);

      for (const range of ranges) {
        stepCount++;
        const stepInfo = {
          currentStep: stepCount,
          totalSteps: totalSteps,
          currentMonth: m,
          totalMonths: 12,
          monthName: `${monthName} (${range.label})`,
        };

        if (typeof onProgress === 'function') {
          onProgress(stepInfo);
        }

        const data = await getSalesVouchersDateRangeApi(companyName, range.from, range.to);
        if (Array.isArray(data)) {
          // Await the per-chunk callback (e.g. IndexedDB save) before continuing
          if (typeof onChunkReceived === 'function') {
            await onChunkReceived(data, range.from, range.to, stepInfo);
          }
          combinedVouchers.push(...data);
        }
      }
    }
    return combinedVouchers;
  } else {
    const monthObj = MONTH_OPTIONS.find((opt) => opt.value === String(month));
    const monthName = monthObj ? monthObj.label : `Month ${month}`;
    const ranges = getMonthSplitDateRanges(year, month);
    const combinedVouchers = [];
    const totalSteps = ranges.length;

    for (let i = 0; i < ranges.length; i++) {
      const range = ranges[i];
      const stepInfo = {
        currentStep: i + 1,
        totalSteps: totalSteps,
        currentMonth: Number(month),
        totalMonths: 1,
        monthName: `${monthName} (${range.label})`,
      };

      if (typeof onProgress === 'function') {
        onProgress(stepInfo);
      }

      const data = await getSalesVouchersDateRangeApi(companyName, range.from, range.to);
      if (Array.isArray(data)) {
        // Await the per-chunk callback (e.g. IndexedDB save) before continuing
        if (typeof onChunkReceived === 'function') {
          await onChunkReceived(data, range.from, range.to, stepInfo);
        }
        combinedVouchers.push(...data);
      }
    }
    return combinedVouchers;
  }
}

export async function getSalesVouchersApi(companyName = '') {
  const year = new Date().getFullYear();
  return fetchSalesVouchersForPeriodApi(companyName, year, 'all');
}