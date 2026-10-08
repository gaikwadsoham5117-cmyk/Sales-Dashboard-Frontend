/**
 * @fileoverview
 * Voucher store — CRUD operations for the `vouchers` object store.
 *
 * Every function is company- and financial-year-scoped.
 * Date filtering is always applied AFTER the company scope, never alone.
 *
 * @import { IndexedDBVoucher, SalesVoucherDTO, DateRange } from './types.js'
 */

import {
  getDatabase,
  STORE_VOUCHERS,
  promisifyRequest,
  promisifyTransaction,
} from './database.js';

import { getFinancialYear, normaliseCompanyKey, toComparableDateStr } from './helpers.js';

// ─────────────────────────────────────────────────────────────────────────────
// Key builder
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build the stable primary key for a voucher.
 *
 * @param {string} organizationId
 * @param {string} companyKey      - Already normalised
 * @param {string} financialYear   - e.g. "2026-27"
 * @param {string} guid            - Tally GUID
 * @returns {string}
 */
function buildVoucherId(organizationId, companyKey, financialYear, guid) {
  return `${organizationId}|${companyKey}|${financialYear}|${guid}`;
}

export function getVoucherUniqueKey(voucher) {
  if (!voucher || typeof voucher !== 'object') return '';
  if (voucher.guid && String(voucher.guid).trim()) {
    return String(voucher.guid).trim();
  }
  if (voucher.masterId && String(voucher.masterId).trim()) {
    return `MID_${String(voucher.masterId).trim()}`;
  }
  const vType = voucher.voucherTypeName || voucher.voucherType || 'Sales';
  const vNum = voucher.voucherNumber || voucher.reference || 'NO_NUM';
  const vDate = toComparableDateStr(voucher.date) || voucher.date || '';
  const vParty = voucher.partyLedgerName || voucher.partyName || '';
  const vAmt = voucher.totalAmount ?? voucher.amount ?? '';
  return `${vType}_${vNum}_${vDate}_${vParty}_${vAmt}`;
}

/**
 * Wrap a raw SalesVoucherDTO into an IndexedDBVoucher ready for storage.
 *
 * @param {SalesVoucherDTO} voucher
 * @param {string} organizationId
 * @param {string} companyName     - Original display name
 * @returns {IndexedDBVoucher | null}  null if the voucher lacks any identifiable data
 */
function wrapVoucher(voucher, organizationId, companyName) {
  if (!voucher || typeof voucher !== 'object') return null;

  const guid = getVoucherUniqueKey(voucher);
  if (!guid) {
    console.warn('[INDEXEDDB] Skipping voucher without any valid identifier:', voucher);
    return null;
  }

  const fy         = getFinancialYear(voucher.date);
  const companyKey = normaliseCompanyKey(companyName);
  const dateStr    = voucher.date ? String(voucher.date).trim() : '';

  return {
    ...voucher,
    guid:           voucher.guid ? String(voucher.guid).trim() : guid,
    voucherTypeName: voucher.voucherTypeName ? String(voucher.voucherTypeName).trim() : 'Sales',
    _id:            buildVoucherId(organizationId, companyKey, fy, guid),
    organizationId,
    companyKey,
    financialYear:  fy,
    date:           dateStr,
    cachedAt:       Date.now(),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Write operations
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Upsert a single voucher.
 * If a record with the same `_id` already exists it is overwritten (put semantics).
 *
 * @param {SalesVoucherDTO} voucher
 * @param {string} organizationId
 * @param {string} companyName
 * @returns {Promise<boolean>}  true on success, false on failure
 */
export async function saveVoucher(voucher, organizationId, companyName) {
  try {
    if (!voucher || typeof voucher !== 'object') {
      console.warn('[INDEXEDDB] saveVoucher: invalid voucher object');
      return false;
    }

    const db = await getDatabase();
    if (!db) return false;

    const record = wrapVoucher(voucher, organizationId, companyName);
    if (!record) return false;

    const tx    = db.transaction(STORE_VOUCHERS, 'readwrite');
    const store = tx.objectStore(STORE_VOUCHERS);

    await promisifyRequest(store.put(record));
    await promisifyTransaction(tx);

    return true;
  } catch (err) {
    _handleError('[INDEXEDDB] saveVoucher failed:', err);
    return false;
  }
}

/**
 * Upsert many vouchers in a single transaction for performance.
 * Skips individual vouchers that are missing GUIDs but continues the rest.
 *
 * @param {SalesVoucherDTO[]} vouchers
 * @param {string} organizationId
 * @param {string} companyName
 * @returns {Promise<{ saved: number, skipped: number }>}
 */
export async function saveVouchers(vouchers, organizationId, companyName) {
  const result = { saved: 0, skipped: 0 };
  const rawList = Array.isArray(vouchers)
    ? vouchers
    : Array.isArray(vouchers?.data)
    ? vouchers.data
    : Array.isArray(vouchers?.vouchers)
    ? vouchers.vouchers
    : [];

  const fy = rawList.length > 0 ? getFinancialYear(rawList[0]?.date) : '';
  console.log(`INDEXEDDB SAVE START\ncompany=${companyName}\nfinancialYear=${fy}\nvoucherCount=${rawList.length}`);

  if (rawList.length === 0) {
    console.warn('[INDEXEDDB] saveVouchers: Empty voucher array received');
    return result;
  }

  const generatedIds = new Set();
  let guidPresentCount = 0;
  let guidMissingCount = 0;

  const db = await getDatabase();
  if (!db) {
    console.error('[INDEXEDDB] saveVouchers: Database not available');
    return result;
  }

  return new Promise((resolve, reject) => {
    try {
      const tx    = db.transaction(STORE_VOUCHERS, 'readwrite');
      const store = tx.objectStore(STORE_VOUCHERS);

      tx.oncomplete = () => {
        console.log(`TALLY VOUCHERS RECEIVED = ${rawList.length}`);
        console.log(`UNIQUE GENERATED IDS = ${generatedIds.size}`);
        console.log(`GUID PRESENT = ${guidPresentCount}`);
        console.log(`GUID MISSING = ${guidMissingCount}`);
        console.log(`INDEXEDDB SAVE SUCCESS\nsavedVoucherCount=${result.saved}`);
        resolve(result);
      };

      tx.onerror = (e) => {
        const error = tx.error || e.target?.error;
        console.error('[INDEXEDDB] ❌ Transaction error in saveVouchers:', error);
        _handleError('[INDEXEDDB] saveVouchers tx failed:', error);
        reject(error);
      };

      tx.onabort = (e) => {
        const error = tx.error || e.target?.error;
        console.error('[INDEXEDDB] ❌ Transaction aborted in saveVouchers:', error);
        reject(error || new Error('Transaction aborted'));
      };

      for (const rawVoucher of rawList) {
        // Sanitize object into pure cloneable JSON to prevent StructuredCloneError
        let cleanVoucher = rawVoucher;
        try {
          cleanVoucher = JSON.parse(JSON.stringify(rawVoucher));
        } catch {
          cleanVoucher = { ...rawVoucher };
        }

        if (cleanVoucher.guid && String(cleanVoucher.guid).trim().length > 10) {
          guidPresentCount++;
        } else {
          guidMissingCount++;
        }

        const record = wrapVoucher(cleanVoucher, organizationId, companyName);
        if (!record) {
          result.skipped++;
          continue;
        }

        generatedIds.add(record._id);

        const req = store.put(record);
        req.onerror = (e) => {
          console.error('[INDEXEDDB] ❌ store.put error for voucher:', record._id, e.target?.error);
        };
        result.saved++;
      }
    } catch (err) {
      console.error('[INDEXEDDB] ❌ Synchronous error in saveVouchers:', err);
      _handleError('[INDEXEDDB] saveVouchers synchronous error:', err);
      reject(err);
    }
  });
}

/**
 * Update specific fields on an existing voucher.
 * This is a read-modify-write — do not call in hot loops, use saveVouchers instead.
 *
 * @param {string} id         - The `_id` key
 * @param {Partial<SalesVoucherDTO>} updates
 * @returns {Promise<boolean>}
 */
export async function updateVoucher(id, updates) {
  try {
    const db = await getDatabase();
    if (!db) return false;

    const tx      = db.transaction(STORE_VOUCHERS, 'readwrite');
    const store   = tx.objectStore(STORE_VOUCHERS);
    const existing = await promisifyRequest(store.get(id));

    if (!existing) {
      console.warn('[INDEXEDDB] updateVoucher: record not found for id:', id);
      return false;
    }

    const updated = { ...existing, ...updates, _id: id, cachedAt: Date.now() };
    await promisifyRequest(store.put(updated));
    await promisifyTransaction(tx);
    return true;
  } catch (err) {
    _handleError('[INDEXEDDB] updateVoucher failed:', err);
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Read operations
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetch a single voucher by its composite _id.
 *
 * @param {string} organizationId
 * @param {string} companyName
 * @param {string} financialYear
 * @param {string} guid
 * @returns {Promise<IndexedDBVoucher | null>}
 */
export async function getVoucher(organizationId, companyName, financialYear, guid) {
  try {
    const db = await getDatabase();
    if (!db) return null;

    const companyKey = normaliseCompanyKey(companyName);
    const id         = buildVoucherId(organizationId, companyKey, financialYear, guid);
    const tx         = db.transaction(STORE_VOUCHERS, 'readonly');
    const store      = tx.objectStore(STORE_VOUCHERS);

    return (await promisifyRequest(store.get(id))) ?? null;
  } catch (err) {
    _handleError('[INDEXEDDB] getVoucher failed:', err);
    return null;
  }
}

/**
 * Get ALL vouchers for a company (all financial years).
 * Scoped strictly to organizationId + companyKey.
 *
 * @param {string} organizationId
 * @param {string} companyName
 * @returns {Promise<IndexedDBVoucher[]>}
 */
export async function getVouchersByCompany(organizationId, companyName) {
  try {
    const db = await getDatabase();
    if (!db) return [];

    const companyKey = normaliseCompanyKey(companyName);
    const tx         = db.transaction(STORE_VOUCHERS, 'readonly');
    const store      = tx.objectStore(STORE_VOUCHERS);
    const index      = store.index('byCompanyFYDate');

    // Use a key range on just the first two components (organizationId, companyKey)
    // IDB compound indexes require specifying all leading key parts for a range.
    // We iterate the entire companyKey prefix using a cursor.
    const results = [];
    const cursorReq = index.openCursor(
      IDBKeyRange.bound(
        [organizationId, companyKey, '', ''],
        [organizationId, companyKey, '\uffff', '\uffff']
      )
    );

    return new Promise((resolve) => {
      cursorReq.onsuccess = (e) => {
        const cursor = e.target.result;
        if (cursor) {
          results.push(cursor.value);
          cursor.continue();
        } else {
          resolve(results);
        }
      };
      cursorReq.onerror = () => {
        _handleError('[INDEXEDDB] getVouchersByCompany cursor failed:', cursorReq.error);
        resolve([]);
      };
    });
  } catch (err) {
    _handleError('[INDEXEDDB] getVouchersByCompany failed:', err);
    return [];
  }
}

/**
 * Get vouchers for a specific company AND financial year.
 *
 * @param {string} organizationId
 * @param {string} companyName
 * @param {string} financialYear   - e.g. "2026-27"
 * @returns {Promise<IndexedDBVoucher[]>}
 */
export async function getVouchersByCompanyAndFinancialYear(
  organizationId,
  companyName,
  financialYear
) {
  try {
    const db = await getDatabase();
    if (!db) return [];

    const companyKey = normaliseCompanyKey(companyName);
    const tx         = db.transaction(STORE_VOUCHERS, 'readonly');
    const store      = tx.objectStore(STORE_VOUCHERS);
    const index      = store.index('byCompanyFYDate');

    const results  = [];
    const cursorReq = index.openCursor(
      IDBKeyRange.bound(
        [organizationId, companyKey, financialYear, ''],
        [organizationId, companyKey, financialYear, '\uffff']
      )
    );

    return new Promise((resolve) => {
      cursorReq.onsuccess = (e) => {
        const cursor = e.target.result;
        if (cursor) {
          results.push(cursor.value);
          cursor.continue();
        } else {
          resolve(results);
        }
      };
      cursorReq.onerror = () => {
        _handleError('[INDEXEDDB] getVouchersByCompanyAndFinancialYear cursor failed:', cursorReq.error);
        resolve([]);
      };
    });
  } catch (err) {
    _handleError('[INDEXEDDB] getVouchersByCompanyAndFinancialYear failed:', err);
    return [];
  }
}

/**
 * Get vouchers for a company within a date range.
 * The date filter is applied AFTER the company scope.
 *
 * Uses toComparableDateStr for resilient date format matching.
 *
 * @param {string} organizationId
 * @param {string} companyName
 * @param {string} [financialYear]
 * @param {string} [fromDate]  - "YYYY-MM-DD"
 * @param {string} [toDate]    - "YYYY-MM-DD"
 * @returns {Promise<IndexedDBVoucher[]>}
 */
export async function getVouchersByDateRange(
  organizationId,
  companyName,
  financialYear,
  fromDate,
  toDate
) {
  try {
    const db = await getDatabase();
    if (!db) return [];

    // Convert to comparable 8-digit "YYYYMMDD" string
    const fromTally = fromDate ? toComparableDateStr(fromDate) : '';
    const toTally   = toDate ? toComparableDateStr(toDate) : '';

    const companyKey = normaliseCompanyKey(companyName);
    const tx         = db.transaction(STORE_VOUCHERS, 'readonly');
    const store      = tx.objectStore(STORE_VOUCHERS);
    const index      = store.index('byCompanyFYDate');

    const isSpecificFY = Boolean(financialYear && financialYear !== 'all');

    const results = [];
    const cursorReq = index.openCursor(
      IDBKeyRange.bound(
        [organizationId, companyKey, '', ''],
        [organizationId, companyKey, '\uffff', '\uffff']
      )
    );

    return new Promise((resolve) => {
      cursorReq.onsuccess = (e) => {
        const cursor = e.target.result;
        if (cursor) {
          const v = cursor.value;
          const vDateClean = toComparableDateStr(v.date);

          const matchesFY = !isSpecificFY || v.financialYear === financialYear;
          const matchesFrom = !fromTally || (vDateClean ? vDateClean >= fromTally : true);
          const matchesTo = !toTally || (vDateClean ? vDateClean <= toTally : true);

          if (matchesFY && matchesFrom && matchesTo) {
            results.push(v);
          }
          cursor.continue();
        } else {
          resolve(results);
        }
      };
      cursorReq.onerror = () => {
        _handleError('[INDEXEDDB] getVouchersByDateRange cursor failed:', cursorReq.error);
        resolve([]);
      };
    });
  } catch (err) {
    _handleError('[INDEXEDDB] getVouchersByDateRange failed:', err);
    return [];
  }
}

/**
 * Count vouchers for a company + FY (lightweight, no data transfer).
 *
 * @param {string} organizationId
 * @param {string} companyName
 * @param {string} [financialYear]
 * @returns {Promise<number>}
 */
export async function countVouchers(organizationId, companyName, financialYear) {
  try {
    const db = await getDatabase();
    if (!db) return 0;

    const tx    = db.transaction(STORE_VOUCHERS, 'readonly');
    const store = tx.objectStore(STORE_VOUCHERS);

    if (!organizationId && !companyName) {
      return await promisifyRequest(store.count());
    }

    const companyKey = normaliseCompanyKey(companyName || '');
    const index      = store.index('byCompanyFYDate');

    const keyRange = financialYear && financialYear !== 'all'
      ? IDBKeyRange.bound(
          [organizationId, companyKey, financialYear, ''],
          [organizationId, companyKey, financialYear, '\uffff']
        )
      : IDBKeyRange.bound(
          [organizationId, companyKey, '', ''],
          [organizationId, companyKey, '\uffff', '\uffff']
        );

    return await promisifyRequest(index.count(keyRange));
  } catch (err) {
    _handleError('[INDEXEDDB] countVouchers failed:', err);
    return 0;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Delete operations
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Delete a single voucher by its composite key parts.
 *
 * @param {string} organizationId
 * @param {string} companyName
 * @param {string} financialYear
 * @param {string} guid
 * @returns {Promise<boolean>}
 */
export async function deleteVoucher(organizationId, companyName, financialYear, guid) {
  try {
    const db = await getDatabase();
    if (!db) return false;

    const companyKey = normaliseCompanyKey(companyName);
    const id         = buildVoucherId(organizationId, companyKey, financialYear, guid);
    const tx         = db.transaction(STORE_VOUCHERS, 'readwrite');
    const store      = tx.objectStore(STORE_VOUCHERS);

    await promisifyRequest(store.delete(id));
    await promisifyTransaction(tx);
    return true;
  } catch (err) {
    _handleError('[INDEXEDDB] deleteVoucher failed:', err);
    return false;
  }
}

/**
 * Delete all vouchers for a specific company (all FYs).
 *
 * @param {string} organizationId
 * @param {string} companyName
 * @returns {Promise<number>}  Number of deleted records
 */
export async function deleteVouchersByCompany(organizationId, companyName) {
  return _deleteVouchersByCursor(organizationId, companyName, null);
}

/**
 * Delete all vouchers for a specific company + financial year.
 *
 * @param {string} organizationId
 * @param {string} companyName
 * @param {string} financialYear
 * @returns {Promise<number>}
 */
export async function deleteVouchersByCompanyAndFY(organizationId, companyName, financialYear) {
  return _deleteVouchersByCursor(organizationId, companyName, financialYear);
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Cursor-based bulk delete. When `financialYear` is null, deletes all FYs.
 *
 * @param {string} organizationId
 * @param {string} companyName
 * @param {string | null} financialYear
 * @returns {Promise<number>}
 */
async function _deleteVouchersByCursor(organizationId, companyName, financialYear) {
  try {
    const db = await getDatabase();
    if (!db) return 0;

    const companyKey = normaliseCompanyKey(companyName);
    const tx         = db.transaction(STORE_VOUCHERS, 'readwrite');
    const store      = tx.objectStore(STORE_VOUCHERS);
    const index      = store.index('byCompanyFYDate');

    const lower = financialYear
      ? [organizationId, companyKey, financialYear, '']
      : [organizationId, companyKey, '', ''];
    const upper = financialYear
      ? [organizationId, companyKey, financialYear, '\uffff']
      : [organizationId, companyKey, '\uffff', '\uffff'];

    let deleted = 0;

    return new Promise((resolve) => {
      const cursorReq = index.openCursor(IDBKeyRange.bound(lower, upper));
      cursorReq.onsuccess = (e) => {
        const cursor = e.target.result;
        if (cursor) {
          store.delete(cursor.primaryKey);
          deleted++;
          cursor.continue();
        } else {
          console.log(
            `[INDEXEDDB] Deleted ${deleted} vouchers` +
            ` (company: ${companyName}, FY: ${financialYear ?? 'all'})`
          );
          resolve(deleted);
        }
      };
      cursorReq.onerror = () => {
        _handleError('[INDEXEDDB] _deleteVouchersByCursor cursor failed:', cursorReq.error);
        resolve(deleted);
      };
    });
  } catch (err) {
    _handleError('[INDEXEDDB] _deleteVouchersByCursor failed:', err);
    return 0;
  }
}

/**
 * Centralised error handler — logs but does not rethrow.
 * IndexedDB errors must never crash the dashboard.
 *
 * @param {string}     message
 * @param {unknown}    err
 */
function _handleError(message, err) {
  if (err && err.name === 'QuotaExceededError') {
    console.error('[INDEXEDDB] Storage quota exceeded. Consider clearing old cache data.');
  } else {
    console.error(message, err);
  }
}
