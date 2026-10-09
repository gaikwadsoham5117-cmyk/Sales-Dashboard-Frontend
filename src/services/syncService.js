/**
 * @fileoverview
 * Dedicated Sync & Reconciliation Service for Tally Sales Analytics.
 *
 * Reconciles fresh authoritative data from Tally against the local IndexedDB cache:
 *   - Inserts new vouchers
 *   - Updates modified vouchers
 *   - Deletes obsolete/removed vouchers strictly within the synced date range
 *   - Leaves unchanged vouchers intact
 *   - Updates syncMetadata in the same IndexedDB transaction
 *   - Never corrupts cache on backend or network failures
 */

import { getSalesVouchersDateRangeApi } from '../api/tallyApi.js';
import {
  getDatabase,
  STORE_VOUCHERS,
  STORE_SYNC_METADATA,
  promisifyRequest,
  promisifyTransaction,
} from './indexeddb/database.js';
import {
  getFinancialYear,
  normaliseCompanyKey,
  toComparableDateStr,
  normalizeLedgerAmount,
  normalizeLedgerEntry,
} from './indexeddb/helpers.js';
import {
  getVouchersByDateRange,
  getVoucherUniqueKey,
} from './indexeddb/voucherStore.js';
import {
  getSyncMetadataForCompany,
} from './indexeddb/syncMetadataStore.js';
import { upsertCompany } from './indexeddb/companyStore.js';
import { normalizeVouchers, clearMemoryCache } from './voucherService.js';

/**
 * Build stable primary key for a voucher.
 */
function buildVoucherId(organizationId, companyKey, financialYear, guid) {
  return `${organizationId}|${companyKey}|${financialYear}|${guid}`;
}

/**
 * Build primary key for sync metadata.
 */
function buildMetaId(organizationId, companyKey, financialYear, periodStart, periodEnd) {
  return `${organizationId}|${companyKey}|${financialYear}|${periodStart}|${periodEnd}`;
}

/**
 * Compare an existing IndexedDB voucher with incoming fresh Tally voucher
 * to determine if any relevant business field changed.
 *
 * @param {Object} idbVoucher
 * @param {Object} freshVoucher
 * @returns {boolean} true if changed, false if identical
 */
export function isVoucherDataChanged(idbVoucher, freshVoucher) {
  if (!idbVoucher || !freshVoucher) return true;

  if (String(idbVoucher.date || '').trim() !== String(freshVoucher.date || '').trim()) return true;
  if (String(idbVoucher.voucherTypeName || '').trim() !== String(freshVoucher.voucherTypeName || '').trim()) return true;
  if (String(idbVoucher.voucherNumber || '').trim() !== String(freshVoucher.voucherNumber || '').trim()) return true;
  if (String(idbVoucher.partyLedgerName || '').trim() !== String(freshVoucher.partyLedgerName || '').trim()) return true;
  if (String(idbVoucher.partyParentName || '').trim() !== String(freshVoucher.partyParentName || '').trim()) return true;
  if (String(idbVoucher.reference || '').trim() !== String(freshVoucher.reference || '').trim()) return true;
  if (Number(idbVoucher.totalAmount ?? 0) !== Number(freshVoucher.totalAmount ?? 0)) return true;

  // Compare items
  const idbItems = Array.isArray(idbVoucher.items) ? idbVoucher.items : [];
  const freshItems = Array.isArray(freshVoucher.items) ? freshVoucher.items : [];
  if (idbItems.length !== freshItems.length) return true;
  for (let i = 0; i < idbItems.length; i++) {
    const a = idbItems[i];
    const b = freshItems[i];
    if (
      String(a.stockItemName || '').trim() !== String(b.stockItemName || '').trim() ||
      String(a.itemParentName || '').trim() !== String(b.itemParentName || '').trim() ||
      Number(a.quantity ?? 0) !== Number(b.quantity ?? 0) ||
      Number(a.rate ?? 0) !== Number(b.rate ?? 0) ||
      Number(a.amount ?? 0) !== Number(b.amount ?? 0)
    ) {
      return true;
    }
  }

  // Compare ledger entries
  const idbLedgers = Array.isArray(idbVoucher.ledgerEntries) ? idbVoucher.ledgerEntries : [];
  const freshLedgers = Array.isArray(freshVoucher.ledgerEntries) ? freshVoucher.ledgerEntries : [];
  if (idbLedgers.length !== freshLedgers.length) return true;
  for (let i = 0; i < idbLedgers.length; i++) {
    const a = idbLedgers[i];
    const b = freshLedgers[i];
    const aAmt = normalizeLedgerAmount(a?.amount);
    const bAmt = normalizeLedgerAmount(b?.amount);
    if (
      String(a?.ledgerName || '').trim() !== String(b?.ledgerName || '').trim() ||
      Number(aAmt ?? 0) !== Number(bAmt ?? 0) ||
      Boolean(a?.partyLedger) !== Boolean(b?.partyLedger) ||
      Boolean(a?.gstLedger) !== Boolean(b?.gstLedger)
    ) {
      return true;
    }
  }

  // Compare GST details
  const aGst = idbVoucher.gstDetails || {};
  const bGst = freshVoucher.gstDetails || {};
  if (
    Boolean(aGst.applicable) !== Boolean(bGst.applicable) ||
    Number(aGst.cgst ?? 0) !== Number(bGst.cgst ?? 0) ||
    Number(aGst.sgst ?? 0) !== Number(bGst.sgst ?? 0) ||
    Number(aGst.igst ?? 0) !== Number(bGst.igst ?? 0) ||
    Number(aGst.cess ?? 0) !== Number(bGst.cess ?? 0) ||
    Number(aGst.stateCess ?? 0) !== Number(bGst.stateCess ?? 0)
  ) {
    return true;
  }

  return false;
}

/**
 * Wrap a normalized voucher into an IndexedDB record.
 */
function wrapSyncVoucher(voucher, organizationId, companyName, financialYear) {
  const guid = getVoucherUniqueKey(voucher);
  if (!guid) return null;

  const fy = financialYear || getFinancialYear(voucher.date);
  const companyKey = normaliseCompanyKey(companyName);
  const dateStr = voucher.date ? String(voucher.date).trim() : '';
  const vType = voucher.voucherTypeName || voucher.voucherType || 'Sales';

  return {
    ...voucher,
    guid: voucher.guid ? String(voucher.guid).trim() : guid,
    voucherTypeName: String(vType).trim(),
    ledgerEntries: Array.isArray(voucher.ledgerEntries)
      ? voucher.ledgerEntries.map(normalizeLedgerEntry)
      : [],
    _id: buildVoucherId(organizationId, companyKey, fy, guid),
    organizationId,
    companyKey,
    financialYear: fy,
    date: dateStr,
    cachedAt: Date.now(),
  };
}

/**
 * Reconcile a date range period from Tally with IndexedDB.
 *
 * @param {Object} options
 * @param {string} options.organizationId
 * @param {string} options.companyName
 * @param {string} options.financialYear
 * @param {string} options.fromDate  - 'YYYY-MM-DD'
 * @param {string} options.toDate    - 'YYYY-MM-DD'
 * @returns {Promise<{
 *   success: boolean,
 *   added: number,
 *   updated: number,
 *   deleted: number,
 *   unchanged: number,
 *   total: number,
 *   fromDate: string,
 *   toDate: string,
 *   lastSyncedAt: number,
 * }>}
 */
export async function syncPeriodVouchers({
  organizationId,
  companyName,
  financialYear,
  fromDate,
  toDate,
}) {
  const orgId = organizationId || 'DEFAULT_ORG';
  const targetComp = (companyName || '').trim();
  if (!targetComp) {
    throw new Error('No company specified for sync.');
  }
  if (!fromDate || !toDate) {
    throw new Error('Valid From and To dates are required.');
  }
  if (fromDate > toDate) {
    throw new Error('From date cannot be after To date.');
  }

  const companyKey = normaliseCompanyKey(targetComp);
  const fy = financialYear || getFinancialYear(fromDate);

  console.log(`[SYNC] Starting manual period sync for: ${targetComp} (${fromDate} → ${toDate})`);

  // 1. Fetch fresh authoritative data from Tally backend
  let rawResponse = [];
  try {
    rawResponse = await getSalesVouchersDateRangeApi(targetComp, fromDate, toDate);
  } catch (err) {
    console.error('[SYNC] Tally backend request failed:', err);
    throw new Error('Unable to connect to Tally. Existing cached data was not changed.');
  }

  const freshList = Array.isArray(rawResponse)
    ? rawResponse
    : Array.isArray(rawResponse?.data)
    ? rawResponse.data
    : Array.isArray(rawResponse?.vouchers)
    ? rawResponse.vouchers
    : [];

  // Normalize fresh vouchers preserving ALL fields
  const normalizedFresh = normalizeVouchers(freshList);

  // 2. Read existing IndexedDB records for the exact company + FY + date range
  const existingVouchers = await getVouchersByDateRange(orgId, targetComp, fy, fromDate, toDate);

  // 3. Build lookup maps using stable _id
  const existingMap = new Map();
  for (const v of existingVouchers) {
    if (v && v._id) {
      existingMap.set(v._id, v);
    }
  }

  const freshMap = new Map();
  const toInsert = [];
  const toUpdate = [];
  let unchangedCount = 0;

  for (const rawV of normalizedFresh) {
    const record = wrapSyncVoucher(rawV, orgId, targetComp, fy);
    if (!record) continue;

    freshMap.set(record._id, record);

    if (existingMap.has(record._id)) {
      const existing = existingMap.get(record._id);
      if (isVoucherDataChanged(existing, record)) {
        toUpdate.push(record);
      } else {
        unchangedCount++;
      }
    } else {
      toInsert.push(record);
    }
  }

  // Identify deleted records: existing in this date range in IDB but missing from authoritative Tally response
  const toDelete = [];
  for (const [id, existingRecord] of existingMap.entries()) {
    if (!freshMap.has(id)) {
      toDelete.push(id);
    }
  }

  console.log(
    `[SYNC] Reconciliation plan for ${fromDate} → ${toDate}:\n` +
    `  New/Insert: ${toInsert.length}\n` +
    `  Updated:    ${toUpdate.length}\n` +
    `  Deleted:    ${toDelete.length}\n` +
    `  Unchanged:  ${unchangedCount}\n` +
    `  Total:      ${freshMap.size}`
  );

  // 4. Execute all writes and deletions in a single atomic transaction
  const db = await getDatabase();
  if (!db) {
    throw new Error('IndexedDB is unavailable. Existing data was not changed.');
  }

  const syncTimestamp = Date.now();
  const totalAfterSync = freshMap.size;

  await new Promise((resolve, reject) => {
    try {
      const tx = db.transaction([STORE_VOUCHERS, STORE_SYNC_METADATA], 'readwrite');
      const vStore = tx.objectStore(STORE_VOUCHERS);
      const mStore = tx.objectStore(STORE_SYNC_METADATA);

      tx.oncomplete = () => resolve();
      tx.onerror = (e) => {
        const error = tx.error || e.target?.error;
        console.error('[SYNC] ❌ Transaction error during sync:', error);
        reject(error || new Error('Transaction failed during sync'));
      };
      tx.onabort = (e) => {
        const error = tx.error || e.target?.error;
        console.error('[SYNC] ❌ Transaction aborted during sync:', error);
        reject(error || new Error('Transaction aborted during sync'));
      };

      // Perform inserts
      for (const rec of toInsert) {
        vStore.put(rec);
      }

      // Perform updates
      for (const rec of toUpdate) {
        vStore.put(rec);
      }

      // Perform deletes
      for (const id of toDelete) {
        vStore.delete(id);
      }

      // Save sync metadata for this period
      const metaRecord = {
        _id: buildMetaId(orgId, companyKey, fy, fromDate, toDate),
        organizationId: orgId,
        companyKey,
        financialYear: fy,
        periodStart: fromDate,
        periodEnd: toDate,
        status: 'COMPLETE',
        voucherCount: totalAfterSync,
        lastSyncedAt: syncTimestamp,
        lastAccessedAt: syncTimestamp,
        addedCount: toInsert.length,
        updatedCount: toUpdate.length,
        deletedCount: toDelete.length,
        unchangedCount: unchangedCount,
      };
      mStore.put(metaRecord);
    } catch (err) {
      reject(err);
    }
  });

  // 5. Invalidate memory cache so subsequent queries fetch fresh data
  clearMemoryCache();
  upsertCompany(orgId, targetComp).catch(() => {});

  console.log(`[SYNC] ✅ Sync completed successfully for ${targetComp} (${fromDate} → ${toDate})`);

  return {
    success: true,
    added: toInsert.length,
    updated: toUpdate.length,
    deleted: toDelete.length,
    unchanged: unchangedCount,
    total: totalAfterSync,
    fromDate,
    toDate,
    lastSyncedAt: syncTimestamp,
  };
}

/**
 * Retrieve the latest lastSyncedAt timestamp for a given company and financial year.
 *
 * @param {string} organizationId
 * @param {string} companyName
 * @param {string} [financialYear]
 * @returns {Promise<number | null>}
 */
export async function getLastSyncedTime(organizationId, companyName, financialYear) {
  try {
    const orgId = organizationId || 'DEFAULT_ORG';
    const allMeta = await getSyncMetadataForCompany(orgId, companyName, financialYear);
    const completeList = allMeta.filter((m) => m.status === 'COMPLETE' && m.lastSyncedAt);
    if (completeList.length === 0) return null;

    let latest = 0;
    for (const m of completeList) {
      if (m.lastSyncedAt && m.lastSyncedAt > latest) {
        latest = m.lastSyncedAt;
      }
    }
    return latest || null;
  } catch (err) {
    console.error('[SYNC] Failed to fetch last synced time:', err);
    return null;
  }
}
