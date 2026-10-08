/**
 * @fileoverview
 * Public index for the IndexedDB service layer.
 *
 * Import everything from here — do not import individual store files
 * directly in components.
 *
 * Usage example (future integration):
 *
 *   import {
 *     initializeDatabase,
 *     saveVouchers,
 *     isDateRangeCached,
 *     getMissingDateRanges,
 *     SYNC_STATUS,
 *   } from '../services/indexeddb';
 */

// ── Database ─────────────────────────────────────────────────────────────────
export { initializeDatabase, getDatabase, DB_NAME, DB_VERSION } from './database.js';

// ── Voucher store ─────────────────────────────────────────────────────────────
export {
  saveVoucher,
  saveVouchers,
  getVoucher,
  updateVoucher,
  deleteVoucher,
  deleteVouchersByCompany,
  deleteVouchersByCompanyAndFY,
  getVouchersByCompany,
  getVouchersByCompanyAndFinancialYear,
  getVouchersByDateRange,
  countVouchers,
  getVoucherUniqueKey,
} from './voucherStore.js';

// ── Sync-metadata store ───────────────────────────────────────────────────────
export {
  SYNC_STATUS,
  saveSyncMetadata,
  getSyncMetadata,
  getSyncMetadataForCompany,
  markPeriodInProgress,
  markPeriodComplete,
  markPeriodFailed,
  isDateRangeCached,
  getMissingDateRanges,
  getCachedCoverage,
  auditIndexedDBCoverage,
  deleteSyncMetadataByCompany,
  deleteSyncMetadataByFY,
} from './syncMetadataStore.js';

// ── Company store ─────────────────────────────────────────────────────────────
export {
  upsertCompany,
  getCachedCompanies,
  deleteCompanyRecord,
  deleteAllCompanyRecords,
} from './companyStore.js';

// ── Cache management ──────────────────────────────────────────────────────────
export {
  clearCompanyCache,
  clearFinancialYearCache,
  clearAllLocalTallyData,
  clearEntireDatabase,
} from './cacheManagement.js';

// ── Helpers (re-exported for convenience) ────────────────────────────────────
export {
  getFinancialYear,
  normaliseCompanyKey,
  toComparableDateStr,
  tallyDateToISO,
  isoToTallyDate,
  isValidISODate,
} from './helpers.js';

// ── Central Voucher Service ──────────────────────────────────────────────────
export {
  loadSalesVouchers,
  clearMemoryCache,
  getRequiredChunks,
} from '../voucherService.js';

