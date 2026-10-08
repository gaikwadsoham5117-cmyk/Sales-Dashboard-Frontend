/**
 * @fileoverview
 * Sync metadata store — tracks which date ranges have been cached locally.
 *
 * This is the core of the cache-hit / cache-miss decision logic.
 * It answers: "Do I already have all the data for this requested period?"
 * and returns missing sub-ranges when the answer is "no" or "partial".
 *
 * @import { SyncMetadata, DateRange, SyncStatus } from './types.js'
 */

import {
  getDatabase,
  STORE_SYNC_METADATA,
  promisifyRequest,
  promisifyTransaction,
} from './database.js';

import { normaliseCompanyKey, toComparableDateStr } from './helpers.js';
import { getVouchersByDateRange, getVouchersByCompanyAndFinancialYear } from './voucherStore.js';

// ─────────────────────────────────────────────────────────────────────────────
// Status constants (exported for callers)
// ─────────────────────────────────────────────────────────────────────────────

export const SYNC_STATUS = /** @type {const} */ ({
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETE:    'COMPLETE',
  FAILED:      'FAILED',
});

// ─────────────────────────────────────────────────────────────────────────────
// Key builder
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build a unique key for a sync-metadata record.
 * periodStart / periodEnd are "YYYY-MM-DD" strings.
 *
 * @param {string} organizationId
 * @param {string} companyKey
 * @param {string} financialYear
 * @param {string} periodStart
 * @param {string} periodEnd
 * @returns {string}
 */
function buildMetaId(organizationId, companyKey, financialYear, periodStart, periodEnd) {
  return `${organizationId}|${companyKey}|${financialYear}|${periodStart}|${periodEnd}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Write operations
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Upsert a sync-metadata record.
 *
 * @param {Omit<SyncMetadata, '_id'>} meta
 * @returns {Promise<boolean>}
 */
export async function saveSyncMetadata(meta) {
  try {
    const db = await getDatabase();
    if (!db) return false;

    const companyKey = normaliseCompanyKey(meta.companyKey ?? meta.companyName ?? '');
    const record = {
      ...meta,
      companyKey,
      _id: buildMetaId(
        meta.organizationId,
        companyKey,
        meta.financialYear,
        meta.periodStart,
        meta.periodEnd
      ),
    };

    const tx    = db.transaction(STORE_SYNC_METADATA, 'readwrite');
    const store = tx.objectStore(STORE_SYNC_METADATA);
    await promisifyRequest(store.put(record));
    await promisifyTransaction(tx);

    console.log(
      `[INDEXEDDB] SYNC METADATA UPDATED — ${meta.periodStart} → ${meta.periodEnd}` +
      ` (${meta.status}, ${meta.voucherCount} vouchers)`
    );
    return true;
  } catch (err) {
    console.error('[INDEXEDDB] saveSyncMetadata failed:', err);
    return false;
  }
}

/**
 * Mark a period as IN_PROGRESS (call before starting a fetch).
 *
 * @param {string} organizationId
 * @param {string} companyName
 * @param {string} financialYear
 * @param {string} periodStart  "YYYY-MM-DD"
 * @param {string} periodEnd    "YYYY-MM-DD"
 * @returns {Promise<boolean>}
 */
export async function markPeriodInProgress(
  organizationId, companyName, financialYear, periodStart, periodEnd
) {
  return saveSyncMetadata({
    organizationId,
    companyKey:     normaliseCompanyKey(companyName),
    financialYear,
    periodStart,
    periodEnd,
    status:         SYNC_STATUS.IN_PROGRESS,
    voucherCount:   0,
    lastSyncedAt:   Date.now(),
    lastAccessedAt: Date.now(),
  });
}

/**
 * Mark a period as COMPLETE (call after all vouchers for the range are saved).
 *
 * @param {string} organizationId
 * @param {string} companyName
 * @param {string} financialYear
 * @param {string} periodStart
 * @param {string} periodEnd
 * @param {number} voucherCount
 * @returns {Promise<boolean>}
 */
export async function markPeriodComplete(
  organizationId, companyName, financialYear, periodStart, periodEnd, voucherCount
) {
  return saveSyncMetadata({
    organizationId,
    companyKey:     normaliseCompanyKey(companyName),
    financialYear,
    periodStart,
    periodEnd,
    status:         SYNC_STATUS.COMPLETE,
    voucherCount,
    lastSyncedAt:   Date.now(),
    lastAccessedAt: Date.now(),
  });
}

/**
 * Mark a period as FAILED.
 *
 * @param {string} organizationId
 * @param {string} companyName
 * @param {string} financialYear
 * @param {string} periodStart
 * @param {string} periodEnd
 * @returns {Promise<boolean>}
 */
export async function markPeriodFailed(
  organizationId, companyName, financialYear, periodStart, periodEnd
) {
  return saveSyncMetadata({
    organizationId,
    companyKey:     normaliseCompanyKey(companyName),
    financialYear,
    periodStart,
    periodEnd,
    status:         SYNC_STATUS.FAILED,
    voucherCount:   0,
    lastSyncedAt:   Date.now(),
    lastAccessedAt: Date.now(),
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Read operations
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetch all sync-metadata records for a company + FY.
 *
 * @param {string} organizationId
 * @param {string} companyName
 * @param {string} financialYear
 * @returns {Promise<SyncMetadata[]>}
 */
export async function getSyncMetadataForCompany(organizationId, companyName, financialYear) {
  try {
    const db = await getDatabase();
    if (!db) return [];

    const companyKey = normaliseCompanyKey(companyName);
    const tx         = db.transaction(STORE_SYNC_METADATA, 'readonly');
    const store      = tx.objectStore(STORE_SYNC_METADATA);
    const index      = store.index('byCompanyFY');

    const keyRange = financialYear && financialYear !== 'all'
      ? IDBKeyRange.only([organizationId, companyKey, financialYear])
      : IDBKeyRange.bound(
          [organizationId, companyKey, ''],
          [organizationId, companyKey, '\uffff']
        );

    return await promisifyRequest(index.getAll(keyRange));
  } catch (err) {
    console.error('[INDEXEDDB] getSyncMetadataForCompany failed:', err);
    return [];
  }
}

/**
 * Convenience alias — fetch a single metadata record by its exact period.
 *
 * @param {string} organizationId
 * @param {string} companyName
 * @param {string} financialYear
 * @param {string} periodStart
 * @param {string} periodEnd
 * @returns {Promise<SyncMetadata | null>}
 */
export async function getSyncMetadata(
  organizationId, companyName, financialYear, periodStart, periodEnd
) {
  try {
    const db = await getDatabase();
    if (!db) return null;

    const companyKey = normaliseCompanyKey(companyName);
    const id         = buildMetaId(organizationId, companyKey, financialYear, periodStart, periodEnd);
    const tx         = db.transaction(STORE_SYNC_METADATA, 'readonly');
    const store      = tx.objectStore(STORE_SYNC_METADATA);

    return (await promisifyRequest(store.get(id))) ?? null;
  } catch (err) {
    console.error('[INDEXEDDB] getSyncMetadata failed:', err);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Cache-check logic & Debug Coverage Helper
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Determine whether the requested date range is **fully** covered by cached
 * COMPLETE periods.
 *
 * Algorithm:
 *  1. Fetch all COMPLETE metadata records for the company + FY.
 *  2. Merge them into a sorted list of covered intervals.
 *  3. Walk through the requested [fromDate, toDate] day by day (timezone safe).
 *
 * @param {string} organizationId
 * @param {string} companyName
 * @param {string} financialYear
 * @param {string} fromDate  "YYYY-MM-DD"
 * @param {string} toDate    "YYYY-MM-DD"
 * @returns {Promise<boolean>}
 */
export async function isDateRangeCached(
  organizationId, companyName, financialYear, fromDate, toDate
) {
  try {
    if (!fromDate || !toDate || fromDate > toDate) return false;

    const allMeta  = await getSyncMetadataForCompany(organizationId, companyName, financialYear);
    const complete = allMeta.filter((m) => m.status === SYNC_STATUS.COMPLETE);

    if (complete.length === 0) {
      return false;
    }

    const covered = _buildCoveredSet(complete);
    const [fy, fm, fd] = fromDate.split('-').map(Number);
    const [ty, tm, td] = toDate.split('-').map(Number);
    if (isNaN(fy) || isNaN(fm) || isNaN(fd) || isNaN(ty) || isNaN(tm) || isNaN(td)) {
      return false;
    }

    const from = new Date(fy, fm - 1, fd);
    const to   = new Date(ty, tm - 1, td);

    for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const da = String(d.getDate()).padStart(2, '0');
      const key = `${y}-${m}-${da}`;
      if (!covered.has(key)) {
        return false;
      }
    }

    return true;
  } catch (err) {
    console.error('[INDEXEDDB] isDateRangeCached failed:', err);
    return false;
  }
}

/**
 * Return the sub-ranges of [fromDate, toDate] that are NOT yet cached.
 *
 * Example:
 *   Cached:    2022-04-01 → 2022-04-15
 *   Requested: 2022-04-01 → 2022-04-30
 *   Result:    [{ from: "2022-04-16", to: "2022-04-30" }]
 *
 * @param {string} organizationId
 * @param {string} companyName
 * @param {string} financialYear
 * @param {string} fromDate  "YYYY-MM-DD"
 * @param {string} toDate    "YYYY-MM-DD"
 * @returns {Promise<DateRange[]>}
 */
export async function getMissingDateRanges(
  organizationId, companyName, financialYear, fromDate, toDate
) {
  try {
    if (!fromDate || !toDate || fromDate > toDate) return [];

    const allMeta  = await getSyncMetadataForCompany(organizationId, companyName, financialYear);
    const complete = allMeta.filter((m) => m.status === SYNC_STATUS.COMPLETE);
    const covered  = _buildCoveredSet(complete);

    const missing = [];
    let rangeStart = null;

    const [fy, fm, fd] = fromDate.split('-').map(Number);
    const [ty, tm, td] = toDate.split('-').map(Number);
    if (isNaN(fy) || isNaN(fm) || isNaN(fd) || isNaN(ty) || isNaN(tm) || isNaN(td)) {
      return [{ from: fromDate, to: toDate }];
    }

    const from = new Date(fy, fm - 1, fd);
    const to   = new Date(ty, tm - 1, td);

    for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const da = String(d.getDate()).padStart(2, '0');
      const key = `${y}-${m}-${da}`;

      if (!covered.has(key)) {
        if (!rangeStart) rangeStart = key;
      } else {
        if (rangeStart) {
          // End of a missing run — close it with the previous day
          const prev = new Date(d);
          prev.setDate(prev.getDate() - 1);
          const py = prev.getFullYear();
          const pm = String(prev.getMonth() + 1).padStart(2, '0');
          const pda = String(prev.getDate()).padStart(2, '0');
          missing.push({ from: rangeStart, to: `${py}-${pm}-${pda}` });
          rangeStart = null;
        }
      }
    }

    // Close any open missing run at the end
    if (rangeStart) {
      missing.push({ from: rangeStart, to: toDate });
    }

    return missing;
  } catch (err) {
    console.error('[INDEXEDDB] getMissingDateRanges failed:', err);
    return [{ from: fromDate, to: toDate }]; // safe fallback: treat all as missing
  }
}

/**
 * Debug and verification helper: inspect IndexedDB cache coverage for a specific company + FY + date range.
 * Reports completeness, status, missing ranges, and cached voucher count.
 *
 * @param {string} [organizationId]
 * @param {string} companyNameOrKey
 * @param {string} [financialYear]
 * @param {string} [fromDate]  - "YYYY-MM-DD"
 * @param {string} [toDate]    - "YYYY-MM-DD"
 * @returns {Promise<{ isComplete: boolean, status: string, cachedCount: number, missingRanges: Array<{from: string, to: string}>, completeMetadata: SyncMetadata[] }>}
 */
export async function getCachedCoverage(
  organizationId,
  companyNameOrKey,
  financialYear,
  fromDate,
  toDate
) {
  const orgId = organizationId || 'DEFAULT_ORG';
  const compName = (companyNameOrKey || '').trim();

  let status = 'MISSING';
  let cachedCount = 0;
  let missingRanges = [];
  let completeMeta = [];

  try {
    const allMeta = await getSyncMetadataForCompany(orgId, compName, financialYear);
    completeMeta = allMeta.filter((m) => m.status === SYNC_STATUS.COMPLETE);

    if (fromDate && toDate) {
      const isCached = await isDateRangeCached(orgId, compName, financialYear, fromDate, toDate);
      missingRanges = await getMissingDateRanges(orgId, compName, financialYear, fromDate, toDate);

      if (isCached) {
        status = 'COMPLETE';
      } else if (completeMeta.length > 0 && missingRanges.length > 0) {
        status = 'PARTIAL';
      } else {
        status = 'MISSING';
      }

      // Query actual vouchers in IndexedDB for this exact range
      const vouchers = await getVouchersByDateRange(orgId, compName, financialYear, fromDate, toDate);
      cachedCount = vouchers.length;
    } else {
      cachedCount = completeMeta.reduce((sum, m) => sum + (m.voucherCount || 0), 0);
      status = completeMeta.length > 0 ? 'COMPLETE' : 'MISSING';
    }

    console.log(
      `CACHE COVERAGE\ncompany=${compName}\nyear=${financialYear || 'all'}\nrange=${fromDate || 'start'}..${toDate || 'end'}\nstatus=${status}\ncachedCount=${cachedCount}`
    );

    return {
      isComplete: status === 'COMPLETE',
      status,
      cachedCount,
      missingRanges,
      completeMetadata: completeMeta,
    };
  } catch (err) {
    console.error('[INDEXEDDB] getCachedCoverage failed:', err);
    return {
      isComplete: false,
      status: 'MISSING',
      cachedCount: 0,
      missingRanges: fromDate && toDate ? [{ from: fromDate, to: toDate }] : [],
      completeMetadata: [],
    };
  }
}

/**
 * Perform a complete forensic audit of all vouchers and sync metadata stored in IndexedDB
 * for a specific company and financial year.
 *
 * @param {string} [organizationId='DEFAULT_ORG']
 * @param {string} [companyName='KABNURKAR SALES']
 * @param {string} [financialYear='2022-23']
 * @returns {Promise<object>}
 */
export async function auditIndexedDBCoverage(
  organizationId = 'DEFAULT_ORG',
  companyName = 'KABNURKAR SALES',
  financialYear = '2022-23'
) {
  const orgId = organizationId || 'DEFAULT_ORG';
  const compName = (companyName || '').trim();

  // 1. Total vouchers in IndexedDB for company + FY
  const allVouchers = await getVouchersByCompanyAndFinancialYear(orgId, compName, financialYear);
  const totalCount = allVouchers.length;

  // 2. Count by month
  const monthlyCounts = {
    April: 0,
    May: 0,
    June: 0,
    July: 0,
    August: 0,
    September: 0,
    October: 0,
    November: 0,
    December: 0,
    January: 0,
    February: 0,
    March: 0,
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  let april1to5Count = 0;
  const april1to5Types = {};
  let guidPresent = 0;
  let guidMissing = 0;

  for (const v of allVouchers) {
    if (v.guid && String(v.guid).trim().length > 10) {
      guidPresent++;
    } else {
      guidMissing++;
    }

    const comparable = toComparableDateStr(v.date);
    if (comparable && comparable.length >= 8) {
      const mNum = parseInt(comparable.substring(4, 6), 10);
      const mName = monthNames[mNum - 1];
      if (mName && monthlyCounts[mName] !== undefined) {
        monthlyCounts[mName]++;
      }

      // Check April 1-5 (20220401 to 20220405)
      if (comparable >= '20220401' && comparable <= '20220405') {
        april1to5Count++;
        const type = v.voucherTypeName || 'Sales';
        april1to5Types[type] = (april1to5Types[type] || 0) + 1;
      }
    }
  }

  // 3. syncMetadata inspection
  const allMeta = await getSyncMetadataForCompany(orgId, compName, financialYear);
  const sumMetaVouchers = allMeta.reduce((sum, m) => sum + (m.voucherCount || 0), 0);

  console.log(`==================================================`);
  console.log(`FORENSIC INDEXEDDB AUDIT REPORT`);
  console.log(`==================================================`);
  console.log(`Company: ${compName}`);
  console.log(`Financial Year: ${financialYear}`);
  console.log(`TOTAL VOUCHERS IN INDEXEDDB = ${totalCount}`);
  console.log(`\nINDEXEDDB MONTHLY COUNTS:`);
  Object.entries(monthlyCounts).forEach(([m, count]) => {
    console.log(`${m}=${count}`);
  });
  console.log(`Total = ${Object.values(monthlyCounts).reduce((a, b) => a + b, 0)}`);

  console.log(`\nAPRIL INDEXEDDB COUNT = ${monthlyCounts.April}`);
  console.log(`APRIL 1-5 INDEXEDDB COUNT = ${april1to5Count}`);
  console.log(`APRIL 1-5 VOUCHER TYPES:`);
  Object.entries(april1to5Types).forEach(([t, count]) => {
    console.log(`${t} = ${count}`);
  });

  console.log(`\nMAY INDEXEDDB COUNT = ${monthlyCounts.May}`);
  console.log(`SYNC METADATA COUNT = ${allMeta.length}`);
  console.log(`SUM(syncMetadata.voucherCount) = ${sumMetaVouchers}`);
  console.log(`GUID PRESENT = ${guidPresent}`);
  console.log(`GUID MISSING = ${guidMissing}`);
  console.log(`==================================================`);

  return {
    totalCount,
    monthlyCounts,
    april1to5Count,
    april1to5Types,
    syncMetadataCount: allMeta.length,
    sumMetaVouchers,
    guidPresent,
    guidMissing,
    syncMetadata: allMeta,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Delete operations
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Delete all sync-metadata records for a company (all FYs).
 *
 * @param {string} organizationId
 * @param {string} companyName
 * @returns {Promise<number>}
 */
export async function deleteSyncMetadataByCompany(organizationId, companyName) {
  return _deleteSyncMetadataByCursor(organizationId, companyName, null);
}

/**
 * Delete all sync-metadata records for a company + specific FY.
 *
 * @param {string} organizationId
 * @param {string} companyName
 * @param {string} financialYear
 * @returns {Promise<number>}
 */
export async function deleteSyncMetadataByFY(organizationId, companyName, financialYear) {
  return _deleteSyncMetadataByCursor(organizationId, companyName, financialYear);
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build a Set of "YYYY-MM-DD" strings covering all COMPLETE metadata periods.
 * Uses timezone-safe date construction.
 *
 * @param {SyncMetadata[]} completeMeta
 * @returns {Set<string>}
 */
function _buildCoveredSet(completeMeta) {
  const covered = new Set();
  for (const m of completeMeta) {
    if (!m.periodStart || !m.periodEnd) continue;
    const [sy, sm, sd] = m.periodStart.split('-').map(Number);
    const [ey, em, ed] = m.periodEnd.split('-').map(Number);
    if (isNaN(sy) || isNaN(sm) || isNaN(sd) || isNaN(ey) || isNaN(em) || isNaN(ed)) continue;

    const start = new Date(sy, sm - 1, sd);
    const end   = new Date(ey, em - 1, ed);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const y = d.getFullYear();
      const mo = String(d.getMonth() + 1).padStart(2, '0');
      const da = String(d.getDate()).padStart(2, '0');
      covered.add(`${y}-${mo}-${da}`);
    }
  }
  return covered;
}

/**
 * Format a Date as "YYYY-MM-DD".
 *
 * @param {Date} d
 * @returns {string}
 */
function _dateKey(d) {
  const y  = d.getFullYear();
  const m  = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

/**
 * Cursor-based bulk delete for sync metadata.
 *
 * @param {string} organizationId
 * @param {string} companyName
 * @param {string | null} financialYear
 * @returns {Promise<number>}
 */
async function _deleteSyncMetadataByCursor(organizationId, companyName, financialYear) {
  try {
    const db = await getDatabase();
    if (!db) return 0;

    const companyKey = normaliseCompanyKey(companyName);
    const tx         = db.transaction(STORE_SYNC_METADATA, 'readwrite');
    const store      = tx.objectStore(STORE_SYNC_METADATA);
    const index      = store.index('byCompanyFY');

    const keyRange = financialYear
      ? IDBKeyRange.only([organizationId, companyKey, financialYear])
      : IDBKeyRange.bound(
          [organizationId, companyKey, ''],
          [organizationId, companyKey, '\uffff']
        );

    let deleted = 0;

    return new Promise((resolve) => {
      const cursorReq = index.openCursor(keyRange);
      cursorReq.onsuccess = (e) => {
        const cursor = e.target.result;
        if (cursor) {
          store.delete(cursor.primaryKey);
          deleted++;
          cursor.continue();
        } else {
          resolve(deleted);
        }
      };
      cursorReq.onerror = () => resolve(deleted);
    });
  } catch (err) {
    console.error('[INDEXEDDB] _deleteSyncMetadataByCursor failed:', err);
    return 0;
  }
}
