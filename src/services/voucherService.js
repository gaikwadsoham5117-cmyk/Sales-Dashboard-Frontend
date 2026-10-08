/**
 * @fileoverview
 * Central Sales Voucher Service with 3-tier caching:
 *
 *   Tier 1: In-Memory Cache (fastest, active browser session)
 *   Tier 2: IndexedDB Cache (persistent, survives page refresh)
 *   Tier 3: Spring Boot / Tally Backend (only for missing data/chunks)
 *
 * Cache queries are strictly isolated by:
 *   organizationId + companyKey + financialYear + chunk date range
 */

import {
  MONTH_OPTIONS,
  getMonthDateRange,
  getMonthSplitDateRanges,
  getSalesVouchersDateRangeApi,
} from '../api/tallyApi.js';

import {
  saveVouchers,
  getVouchersByDateRange,
  countVouchers,
  getSyncMetadata,
  markPeriodInProgress,
  markPeriodComplete,
  markPeriodFailed,
  upsertCompany,
  getFinancialYear,
  normaliseCompanyKey,
  getCachedCoverage,
  getVoucherUniqueKey,
  auditIndexedDBCoverage,
} from './indexeddb/index.js';

// ─────────────────────────────────────────────────────────────────────────────
// Normalization Pipeline (Used for BOTH Backend and IndexedDB data)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Normalizes a single sales voucher to ensure expected types and structure.
 *
 * @param {Object} v - Raw voucher object
 * @returns {Object} Normalized voucher
 */
export function normalizeVoucher(v) {
  if (!v || typeof v !== 'object') return v;

  const rawGuid = v.guid || v.masterId || v.voucherNumber || v._id || '';
  const vType = v.voucherTypeName || v.voucherType || 'Sales';

  return {
    ...v,
    guid: String(rawGuid).trim(),
    masterId: v.masterId ? String(v.masterId).trim() : '',
    voucherNumber: v.voucherNumber ? String(v.voucherNumber).trim() : '',
    voucherTypeName: String(vType).trim(),
    date: v.date ? String(v.date).trim() : '',
    partyLedgerName: v.partyLedgerName ? String(v.partyLedgerName).trim() : '',
    partyParentName: v.partyParentName ? String(v.partyParentName).trim() : '',
    reference: v.reference ? String(v.reference).trim() : '',
    totalAmount: Number(v.totalAmount) || 0,
    items: Array.isArray(v.items)
      ? v.items.map((item) => ({
          ...item,
          stockItemName: item.stockItemName ? String(item.stockItemName).trim() : '',
          itemParentName: item.itemParentName ? String(item.itemParentName).trim() : '',
          quantity: Number(item.quantity) || 0,
          rate: Number(item.rate) || 0,
          amount: Number(item.amount) || 0,
        }))
      : [],
    ledgerEntries: Array.isArray(v.ledgerEntries) ? v.ledgerEntries : [],
    gstDetails: v.gstDetails && typeof v.gstDetails === 'object' ? v.gstDetails : {},
  };
}

/**
 * Normalizes an array of vouchers.
 *
 * @param {Array<Object>} vouchers
 * @returns {Array<Object>}
 */
export function normalizeVouchers(vouchers) {
  if (!Array.isArray(vouchers)) return [];
  return vouchers.map(normalizeVoucher);
}

// ─────────────────────────────────────────────────────────────────────────────
// Tier 1: In-Memory Cache
// ─────────────────────────────────────────────────────────────────────────────

/** @type {Map<string, Array<object>>} */
const memoryCache = new Map();

/**
 * Clear the in-memory voucher cache.
 */
export function clearMemoryCache() {
  memoryCache.clear();
}

/**
 * Generate all required 15-day chunks for a given year and month filter.
 *
 * For month === 'all': generates 24 chunks (months 1..12, 01-15 & 16-lastDay).
 * For a specific month: generates 2 chunks (01-15 & 16-lastDay).
 *
 * @param {number} year
 * @param {string} month - 'all' or '1'..'12'
 * @returns {Array<{ from: string, to: string, label: string, monthIndex: number, monthName: string, fy: string }>}
 */
export function getRequiredChunks(year, month) {
  const yrNum = Number(year);
  if (month === 'all' || !month) {
    const chunks = [];
    for (let m = 1; m <= 12; m++) {
      const monthObj = MONTH_OPTIONS.find((opt) => opt.value === String(m));
      const monthName = monthObj ? monthObj.label : `Month ${m}`;
      const ranges = getMonthSplitDateRanges(yrNum, m);
      for (const r of ranges) {
        chunks.push({
          from: r.from,
          to: r.to,
          label: r.label,
          monthIndex: m,
          monthName: `${monthName} (${r.label})`,
          fy: getFinancialYear(r.from),
        });
      }
    }
    return chunks;
  } else {
    const m = Number(month);
    const monthObj = MONTH_OPTIONS.find((opt) => opt.value === String(month));
    const monthName = monthObj ? monthObj.label : `Month ${month}`;
    const ranges = getMonthSplitDateRanges(yrNum, m);
    return ranges.map((r) => ({
      from: r.from,
      to: r.to,
      label: r.label,
      monthIndex: m,
      monthName: `${monthName} (${r.label})`,
      fy: getFinancialYear(r.from),
    }));
  }
}

/**
 * Deduplicate vouchers by unique key while preserving array order.
 *
 * @param {Array<object>} vouchers
 * @returns {Array<object>}
 */
function deduplicateVouchers(vouchers) {
  const seen = new Set();
  const deduped = [];
  for (const v of vouchers) {
    const key = v._id || getVoucherUniqueKey(v);
    if (key && !seen.has(key)) {
      seen.add(key);
      deduped.push(v);
    } else if (!key) {
      deduped.push(v);
    }
  }
  return deduped;
}

// ─────────────────────────────────────────────────────────────────────────────
// Central Data Loading Function
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Loads sales vouchers with cache-first architecture:
 *
 * 1. Check Memory Cache (exact company + FY + date range)
 * 2. Check IndexedDB Cache coverage (chunk by chunk via syncMetadata)
 * 3. Fetch ONLY missing chunks from Backend API
 *
 * @param {Object} options
 * @param {string} options.organizationId
 * @param {string} options.companyName
 * @param {number|string} options.year
 * @param {string} [options.month='all']
 * @param {Function} [options.onProgress]
 * @returns {Promise<Array<object>>}
 */
export async function loadSalesVouchers({
  organizationId,
  companyName,
  year,
  month = 'all',
  onProgress,
}) {
  const targetComp = (companyName || '').trim();
  if (!targetComp) {
    throw new Error('No company specified.');
  }

  const yrNum = parseInt(year, 10);
  if (!yrNum || isNaN(yrNum) || yrNum < 1900 || yrNum > 2100) {
    throw new Error('Please enter a valid 4-digit year (e.g. 2025).');
  }

  const mnStr = String(month || 'all');
  const orgId = organizationId || 'DEFAULT_ORG';
  const compKey = normaliseCompanyKey(targetComp);
  const cacheKey = `${orgId}|${compKey}|${yrNum}|${mnStr}`;

  let fromDate = '';
  let toDate = '';
  let monthDisplay = '';

  if (mnStr === 'all') {
    monthDisplay = 'ALL';
    fromDate = `${yrNum}-01-01`;
    toDate = `${yrNum}-12-31`;
  } else {
    const mNum = Number(mnStr);
    const monthObj = MONTH_OPTIONS.find((opt) => opt.value === mnStr);
    monthDisplay = monthObj ? monthObj.label : `Month ${mnStr}`;
    const range = getMonthDateRange(yrNum, mNum);
    fromDate = range.from;
    toDate = range.to;
  }

  // Exact CACHE REQUEST log as specified
  console.log(
    `CACHE REQUEST\ncompany=${targetComp}\nyear=${yrNum}\nmonth=${monthDisplay}\nfrom=${fromDate}\nto=${toDate}`
  );

  // ── Tier 1: Check In-Memory Cache ──────────────────────────────────────────
  if (memoryCache.has(cacheKey)) {
    const cachedData = memoryCache.get(cacheKey);
    console.log(
      `CACHE CHECK\ncompany=${targetComp}\nyear=${yrNum}\nmonth=${monthDisplay}\nfrom=${fromDate}\nto=${toDate}`
    );
    console.log(`CACHE RESULT = HIT\nsource=INDEXEDDB\ncount=${cachedData.length}`);
    return cachedData;
  }

  // ── Tier 2: Check IndexedDB Cache per chunk ───────────────────────────────
  const requiredChunks = getRequiredChunks(yrNum, mnStr);

  console.log(
    `CACHE CHECK\ncompany=${targetComp}\nyear=${yrNum}\nmonth=${monthDisplay}\nfrom=${fromDate}\nto=${toDate}`
  );

  // Inspect syncMetadata for each required chunk
  for (const chunk of requiredChunks) {
    const meta = await getSyncMetadata(orgId, targetComp, chunk.fy, chunk.from, chunk.to);
    chunk.isCached = Boolean(meta && meta.status === 'COMPLETE');
    chunk.meta = meta;
  }

  const cachedChunks = requiredChunks.filter((c) => c.isCached);
  const missingChunks = requiredChunks.filter((c) => !c.isCached);

  const coverageStatus =
    missingChunks.length === 0
      ? 'COMPLETE'
      : cachedChunks.length === 0
      ? 'MISSING'
      : 'PARTIAL';

  const totalKnownCached = cachedChunks.reduce((acc, c) => acc + (c.meta?.voucherCount || 0), 0);

  console.log(
    `CACHE COVERAGE\ncompany=${targetComp}\nyear=${yrNum}\nrange=${fromDate}..${toDate}\nstatus=${coverageStatus}\ncachedCount=${totalKnownCached}`
  );

  // ───────────────────────────────────────────────────────────────────────────
  // CASE A: 100% CACHE HIT — All required chunks exist in IndexedDB
  // ───────────────────────────────────────────────────────────────────────────
  if (missingChunks.length === 0) {
    if (typeof onProgress === 'function') {
      onProgress({
        isCached: true,
        monthName: 'Loading cached data...',
        currentStep: 1,
        totalSteps: 1,
      });
    }

    const chunkPromises = requiredChunks.map((c) =>
      getVouchersByDateRange(orgId, targetComp, null, c.from, c.to)
    );
    const chunkResults = await Promise.all(chunkPromises);
    let combinedVouchers = deduplicateVouchers(chunkResults.flat());

    // Fallback: If chunk-by-chunk query returned empty, query the complete date range directly
    if (combinedVouchers.length === 0 && requiredChunks.length > 0) {
      combinedVouchers = await getVouchersByDateRange(orgId, targetComp, null, fromDate, toDate);
    }

    const finalVouchers = normalizeVouchers(combinedVouchers);

    console.log(`CACHE RESULT = HIT\nsource=INDEXEDDB\ncount=${finalVouchers.length}`);
    console.log(`INDEXEDDB READ\ncount=${finalVouchers.length}`);

    // Store in memory cache for subsequent calls
    memoryCache.set(cacheKey, finalVouchers);
    return finalVouchers;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // CASE B: 100% CACHE MISS — No chunks cached yet
  // ───────────────────────────────────────────────────────────────────────────
  if (cachedChunks.length === 0) {
    console.log(`CACHE RESULT = MISS\nDATA SOURCE = BACKEND`);

    const combinedVouchers = [];
    let loggedSample = false;

    for (let i = 0; i < requiredChunks.length; i++) {
      const chunk = requiredChunks[i];

      if (typeof onProgress === 'function') {
        onProgress({
          isCached: false,
          currentStep: i + 1,
          totalSteps: requiredChunks.length,
          currentMonth: chunk.monthIndex,
          totalMonths: mnStr === 'all' ? 12 : 1,
          monthName: chunk.monthName,
        });
      }

      await markPeriodInProgress(orgId, targetComp, chunk.fy, chunk.from, chunk.to);

      let rawResponse = [];
      try {
        rawResponse = await getSalesVouchersDateRangeApi(targetComp, chunk.from, chunk.to);
      } catch (err) {
        await markPeriodFailed(orgId, targetComp, chunk.fy, chunk.from, chunk.to);
        throw err;
      }

      const chunkData = Array.isArray(rawResponse)
        ? rawResponse
        : Array.isArray(rawResponse?.data)
        ? rawResponse.data
        : Array.isArray(rawResponse?.vouchers)
        ? rawResponse.vouchers
        : [];

      console.log(
        `TALLY RESPONSE RECEIVED\nresponseType=${typeof rawResponse}\nvoucherCount=${chunkData.length}`
      );
      console.log(`TALLY RESPONSE VOUCHERS = ${chunkData.length}`);

      if (!loggedSample && chunkData.length > 0) {
        console.log('TALLY FIRST VOUCHER:\n', chunkData[0]);
        loggedSample = true;
      }

      console.log(`INDEXEDDB SAVE START = ${chunkData.length}`);

      let saveResult = { saved: 0, skipped: 0 };
      try {
        saveResult = await saveVouchers(chunkData, orgId, targetComp);
        await markPeriodComplete(
          orgId,
          targetComp,
          chunk.fy,
          chunk.from,
          chunk.to,
          saveResult.saved
        );
      } catch (saveErr) {
        if (saveErr && saveErr.name === 'QuotaExceededError') {
          console.error('[INDEXEDDB] ❌ QuotaExceededError — browser storage full.');
        } else {
          console.error(`[INDEXEDDB] ❌ saveVouchers failed for ${chunk.monthName}:`, saveErr);
        }
        await markPeriodFailed(orgId, targetComp, chunk.fy, chunk.from, chunk.to);
      }

      console.log(`INDEXEDDB SAVE SUCCESS = ${saveResult.saved}`);

      const idbTotal = await countVouchers(orgId, targetComp, chunk.fy);
      console.log(`INDEXEDDB VOUCHER COUNT AFTER SAVE = ${idbTotal}`);

      console.log(
        `SYNC CHUNK\nfrom=${chunk.from}\nto=${chunk.to}\n\nTALLY RESPONSE COUNT = ${chunkData.length}\nTRANSFORMED VOUCHERS = ${chunkData.length}\nINDEXEDDB WRITE COUNT = ${saveResult.saved}\nINDEXEDDB COUNT AFTER WRITE = ${idbTotal}\nSYNC METADATA = COMPLETE`
      );

      combinedVouchers.push(...chunkData);
    }

    const finalVouchers = normalizeVouchers(deduplicateVouchers(combinedVouchers));

    console.log(`INDEXEDDB CACHE STORED\nvoucherCount=${finalVouchers.length}`);

    upsertCompany(orgId, targetComp).catch(() => {});
    memoryCache.set(cacheKey, finalVouchers);
    return finalVouchers;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // CASE C: CACHE PARTIAL — Some chunks cached, some missing
  // ───────────────────────────────────────────────────────────────────────────
  const missingRangesSummary = missingChunks.map((c) => `${c.from}..${c.to}`).join(', ');
  console.log(
    `CACHE RESULT = PARTIAL\nmissingRanges=${missingRangesSummary}\nDATA SOURCE = BACKEND`
  );

  const combinedVouchers = [];
  let missingIndex = 0;

  for (let i = 0; i < requiredChunks.length; i++) {
    const chunk = requiredChunks[i];

    if (chunk.isCached) {
      // Load this chunk directly from IndexedDB
      const cachedChunkVouchers = await getVouchersByDateRange(
        orgId,
        targetComp,
        null,
        chunk.from,
        chunk.to
      );
      console.log(`INDEXEDDB READ\ncount=${cachedChunkVouchers.length}`);
      combinedVouchers.push(...cachedChunkVouchers);
    } else {
      missingIndex++;
      if (typeof onProgress === 'function') {
        onProgress({
          isCached: false,
          currentStep: missingIndex,
          totalSteps: missingChunks.length,
          currentMonth: chunk.monthIndex,
          totalMonths: mnStr === 'all' ? 12 : 1,
          monthName: chunk.monthName,
        });
      }

      await markPeriodInProgress(orgId, targetComp, chunk.fy, chunk.from, chunk.to);

      let rawResponse = [];
      try {
        rawResponse = await getSalesVouchersDateRangeApi(targetComp, chunk.from, chunk.to);
      } catch (err) {
        await markPeriodFailed(orgId, targetComp, chunk.fy, chunk.from, chunk.to);
        throw err;
      }

      const chunkData = Array.isArray(rawResponse)
        ? rawResponse
        : Array.isArray(rawResponse?.data)
        ? rawResponse.data
        : Array.isArray(rawResponse?.vouchers)
        ? rawResponse.vouchers
        : [];

      console.log(
        `TALLY RESPONSE RECEIVED (PARTIAL)\nresponseType=${typeof rawResponse}\nvoucherCount=${chunkData.length}`
      );
      console.log(`TALLY RESPONSE VOUCHERS = ${chunkData.length}`);
      console.log(`INDEXEDDB SAVE START = ${chunkData.length}`);

      let saveResult = { saved: 0, skipped: 0 };
      try {
        saveResult = await saveVouchers(chunkData, orgId, targetComp);
        await markPeriodComplete(
          orgId,
          targetComp,
          chunk.fy,
          chunk.from,
          chunk.to,
          saveResult.saved
        );
      } catch (saveErr) {
        if (saveErr && saveErr.name === 'QuotaExceededError') {
          console.error('[INDEXEDDB] ❌ QuotaExceededError — browser storage full.');
        } else {
          console.error(`[INDEXEDDB] ❌ saveVouchers failed for ${chunk.monthName}:`, saveErr);
        }
        await markPeriodFailed(orgId, targetComp, chunk.fy, chunk.from, chunk.to);
      }

      console.log(`INDEXEDDB SAVE SUCCESS = ${saveResult.saved}`);

      const idbTotal = await countVouchers(orgId, targetComp, chunk.fy);
      console.log(`INDEXEDDB VOUCHER COUNT AFTER SAVE = ${idbTotal}`);

      console.log(
        `SYNC CHUNK\nfrom=${chunk.from}\nto=${chunk.to}\n\nTALLY RESPONSE COUNT = ${chunkData.length}\nTRANSFORMED VOUCHERS = ${chunkData.length}\nINDEXEDDB WRITE COUNT = ${saveResult.saved}\nINDEXEDDB COUNT AFTER WRITE = ${idbTotal}\nSYNC METADATA = COMPLETE`
      );

      combinedVouchers.push(...chunkData);
    }
  }

  const finalVouchers = normalizeVouchers(deduplicateVouchers(combinedVouchers));

  console.log(`INDEXEDDB CACHE STORED\nvoucherCount=${finalVouchers.length}`);

  upsertCompany(orgId, targetComp).catch(() => {});
  memoryCache.set(cacheKey, finalVouchers);
  return finalVouchers;
}

// Attach debug helper to window for developer inspection in DevTools
if (typeof window !== 'undefined') {
  window.getCachedCoverage = (comp, yr, from, to) =>
    getCachedCoverage(undefined, comp, yr, from, to);
  window.auditIndexedDBCoverage = (orgId, comp, fy) =>
    auditIndexedDBCoverage(orgId, comp, fy);
}

