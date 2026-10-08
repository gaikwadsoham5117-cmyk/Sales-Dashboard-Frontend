/**
 * @fileoverview
 * TallySalesAnalyticsDB — native IndexedDB initialisation.
 *
 * Object stores
 * ─────────────
 *  vouchers      – SalesVoucherDTO records with multi-company isolation keys
 *  syncMetadata  – Period-level sync status (which date ranges are cached)
 *  companies     – High-level per-company cache metadata
 *
 * No passwords, JWT secrets, or agent credentials are stored here.
 */

/** @import { IndexedDBVoucher, SyncMetadata, CompanyCacheMetadata } from './types.js' */

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

export const DB_NAME    = 'TallySalesAnalyticsDB';
export const DB_VERSION = 1;

export const STORE_VOUCHERS       = 'vouchers';
export const STORE_SYNC_METADATA  = 'syncMetadata';
export const STORE_COMPANIES      = 'companies';

// ─────────────────────────────────────────────────────────────────────────────
// Module-level DB handle (singleton)
// ─────────────────────────────────────────────────────────────────────────────

/** @type {IDBDatabase | null} */
let _db = null;

/** @type {boolean} */
let _initFailed = false;

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Open (or re-use) the TallySalesAnalyticsDB.
 *
 * Safe to call multiple times — subsequent calls return the cached handle.
 * If IndexedDB is unavailable or the open fails, the function resolves to
 * `null` so callers can gracefully degrade.
 *
 * @returns {Promise<IDBDatabase | null>}
 */
export async function initializeDatabase() {
  if (_db) return _db;
  if (_initFailed) return null;

  if (!('indexedDB' in window)) {
    console.warn('[INDEXEDDB] IndexedDB is not available in this browser.');
    _initFailed = true;
    return null;
  }

  return new Promise((resolve) => {
    let request;
    try {
      request = indexedDB.open(DB_NAME, DB_VERSION);
    } catch (err) {
      console.error('[INDEXEDDB] Failed to open database:', err);
      _initFailed = true;
      resolve(null);
      return;
    }

    // ── Schema creation / migration ─────────────────────────────────────────
    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // 1. vouchers ──────────────────────────────────────────────────────────
      if (!db.objectStoreNames.contains(STORE_VOUCHERS)) {
        const voucherStore = db.createObjectStore(STORE_VOUCHERS, { keyPath: '_id' });

        // Compound index for queries scoped by org + company + FY
        voucherStore.createIndex('byCompanyFY',
          ['organizationId', 'companyKey', 'financialYear'],
          { unique: false }
        );

        // Index for date-range queries (always combined with the above filter)
        voucherStore.createIndex('byDate', 'date', { unique: false });

        // Full compound index used by date-range queries with all four dims
        voucherStore.createIndex('byCompanyFYDate',
          ['organizationId', 'companyKey', 'financialYear', 'date'],
          { unique: false }
        );

        console.log('[INDEXEDDB] Object store "vouchers" created.');
      }

      // 2. syncMetadata ──────────────────────────────────────────────────────
      if (!db.objectStoreNames.contains(STORE_SYNC_METADATA)) {
        const metaStore = db.createObjectStore(STORE_SYNC_METADATA, { keyPath: '_id' });

        metaStore.createIndex('byCompanyFY',
          ['organizationId', 'companyKey', 'financialYear'],
          { unique: false }
        );

        console.log('[INDEXEDDB] Object store "syncMetadata" created.');
      }

      // 3. companies ─────────────────────────────────────────────────────────
      if (!db.objectStoreNames.contains(STORE_COMPANIES)) {
        db.createObjectStore(STORE_COMPANIES, { keyPath: '_id' });
        console.log('[INDEXEDDB] Object store "companies" created.');
      }
    };

    // ── Success ─────────────────────────────────────────────────────────────
    request.onsuccess = (event) => {
      _db = event.target.result;

      _db.onerror = (e) => {
        console.error('[INDEXEDDB] Database error:', e.target.error);
      };

      console.log(`[INDEXEDDB] INITIALIZED — ${DB_NAME} v${DB_VERSION}`);
      resolve(_db);
    };

    // ── Error ────────────────────────────────────────────────────────────────
    request.onerror = (event) => {
      console.error('[INDEXEDDB] Failed to open database:', event.target.error);
      _initFailed = true;
      resolve(null);
    };

    // ── Blocked (another tab has an older version open) ──────────────────────
    request.onblocked = () => {
      console.warn(
        '[INDEXEDDB] Database open is blocked. ' +
        'Please close other tabs running this application and reload.'
      );
    };
  });
}

/**
 * Return the open database handle, initialising it if needed.
 * Returns `null` if IndexedDB is unavailable or failed to open.
 *
 * @returns {Promise<IDBDatabase | null>}
 */
export async function getDatabase() {
  if (_db) return _db;
  return initializeDatabase();
}

/**
 * Close and reset the database handle.
 * Mainly useful for testing; production code does not need to call this.
 */
export function closeDatabase() {
  if (_db) {
    _db.close();
    _db = null;
    _initFailed = false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Low-level transaction helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Wraps an IDBRequest in a Promise.
 *
 * @template T
 * @param {IDBRequest<T>} request
 * @returns {Promise<T>}
 */
export function promisifyRequest(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror   = () => reject(request.error);
  });
}

/**
 * Wraps an IDBTransaction completion in a Promise.
 *
 * @param {IDBTransaction} transaction
 * @returns {Promise<void>}
 */
export function promisifyTransaction(transaction) {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror    = () => reject(transaction.error);
    transaction.onabort    = () => reject(new Error('IDB transaction aborted'));
  });
}
