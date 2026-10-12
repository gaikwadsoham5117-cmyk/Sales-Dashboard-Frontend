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

/**
 * Splits an arbitrary date range (YYYY-MM-DD to YYYY-MM-DD) into balanced, contiguous intervals.
 * Handles leap years, year transitions, and shorter custom periods correctly.
 * Start and end dates are inclusive. Requests do not overlap and do not leave missing dates.
 *
 * @param {string} fromDateStr - Start date in YYYY-MM-DD format (inclusive)
 * @param {string} toDateStr   - End date in YYYY-MM-DD format (inclusive)
 * @param {number} [targetParts=4] - Desired number of intervals (default: 4)
 * @returns {Array<{ from: string, to: string, label: string }>}
 */
export function splitDateRange(fromDateStr, toDateStr, targetParts = 4) {
  if (!fromDateStr || !toDateStr || fromDateStr > toDateStr) return [];

  const [sy, sm, sd] = fromDateStr.split('-').map(Number);
  const [ey, em, ed] = toDateStr.split('-').map(Number);

  const startUTC = Date.UTC(sy, sm - 1, sd);
  const endUTC = Date.UTC(ey, em - 1, ed);
  const msPerDay = 24 * 60 * 60 * 1000;

  const totalDays = Math.round((endUTC - startUTC) / msPerDay) + 1;
  if (totalDays <= 0) return [];

  const parts = Math.min(Math.max(1, targetParts), totalDays);
  const baseSize = Math.floor(totalDays / parts);
  const remainder = totalDays % parts;

  const intervals = [];
  let currentStartUTC = startUTC;

  const toISODate = (utcMs) => {
    const d = new Date(utcMs);
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  for (let i = 0; i < parts; i++) {
    const len = baseSize + (i < remainder ? 1 : 0);
    const currentEndUTC = currentStartUTC + (len - 1) * msPerDay;

    const fromISO = toISODate(currentStartUTC);
    const toISO = toISODate(currentEndUTC);

    const dStart = new Date(currentStartUTC);
    const dEnd = new Date(currentEndUTC);
    const startDayStr = String(dStart.getUTCDate()).padStart(2, '0');
    const endDayStr = String(dEnd.getUTCDate()).padStart(2, '0');

    intervals.push({
      from: fromISO,
      to: toISO,
      label: `${startDayStr} - ${endDayStr}`,
    });

    currentStartUTC = currentEndUTC + msPerDay;
  }

  return intervals;
}

// Helper to get 4 balanced date ranges (YYYY-MM-DD) for a given month in a year
// Partition the days into four balanced, contiguous intervals (7 or 8 days each).
// E.g. 30-day month: 01-08, 09-16, 17-23, 24-30 (8, 8, 7, 7 days)
//      31-day month: 01-08, 09-16, 17-24, 25-31 (8, 8, 8, 7 days)
//      28-day Feb:   01-07, 08-14, 15-21, 22-28 (7, 7, 7, 7 days)
//      29-day Feb:   01-08, 09-15, 16-22, 23-29 (8, 7, 7, 7 days)
export function getMonthSplitDateRanges(year, monthIndex) {
  const y = Number(year);
  const m = Number(monthIndex);
  const mStr = String(m).padStart(2, '0');
  const lastDay = new Date(y, m, 0).getDate();
  const from = `${y}-${mStr}-01`;
  const to = `${y}-${mStr}-${String(lastDay).padStart(2, '0')}`;

  return splitDateRange(from, to, 4);
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

/**
 * Deduplicate raw vouchers by stable identifier (preferring GUID) while preserving array order.
 *
 * @param {Array<object>} vouchers
 * @returns {Array<object>}
 */
function deduplicateRawVouchers(vouchers) {
  const seen = new Set();
  const deduped = [];
  for (const v of vouchers) {
    if (!v) continue;
    const rawGuid = v.guid ? String(v.guid).trim() : '';
    const key =
      rawGuid ||
      (v._id ? String(v._id).trim() : '') ||
      (v.masterId ? `MID_${String(v.masterId).trim()}` : '') ||
      (v.alterId ? `AID_${String(v.alterId).trim()}` : '') ||
      (v.id ? `ID_${String(v.id).trim()}` : '');

    if (key && !seen.has(key)) {
      seen.add(key);
      deduped.push(v);
    } else if (!key) {
      deduped.push(v);
    }
  }
  return deduped;
}

// Orchestrator function:
// Splits each requested month into 4 balanced chunks (01-08, 09-16, 17-23/24, 24/25-lastDay)
// to avoid overwhelming the server or hitting payload limits / timeouts.
// When month === 'all', calls date-range API for each 7-8 day range across all 12 months sequentially (48 requests total).
// When a specific month is selected (e.g. '5' for May), calls date-range API for all 4 ranges for that month (4 requests total).
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
    const totalSteps = 48;
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
    return deduplicateRawVouchers(combinedVouchers);
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
    return deduplicateRawVouchers(combinedVouchers);
  }
}

export async function getSalesVouchersApi(companyName = '') {
  const year = new Date().getFullYear();
  return fetchSalesVouchersForPeriodApi(companyName, year, 'all');
}