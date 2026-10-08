/**
 * @fileoverview
 * High-level local data management utilities.
 *
 * These functions combine the voucher store, sync-metadata store, and company
 * store to provide complete cache-clearing operations.
 *
 * Called by future settings/management UIs — NOT by the current dashboard yet.
 */

import { deleteVouchersByCompany, deleteVouchersByCompanyAndFY } from './voucherStore.js';
import { deleteSyncMetadataByCompany, deleteSyncMetadataByFY } from './syncMetadataStore.js';
import { deleteCompanyRecord, deleteAllCompanyRecords, getCachedCompanies } from './companyStore.js';
import {
  getDatabase,
  STORE_VOUCHERS,
  STORE_SYNC_METADATA,
  STORE_COMPANIES,
  promisifyRequest,
  promisifyTransaction,
} from './database.js';
import { normaliseCompanyKey } from './helpers.js';

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Delete all cached vouchers, sync-metadata, and the company registry entry
 * for the given company name.
 *
 * Other companies' data is NOT touched.
 *
 * @param {string} organizationId
 * @param {string} companyName
 * @returns {Promise<void>}
 */
export async function clearCompanyCache(organizationId, companyName) {
  console.log(`[INDEXEDDB] Clearing cache for company: ${companyName}`);
  await deleteVouchersByCompany(organizationId, companyName);
  await deleteSyncMetadataByCompany(organizationId, companyName);
  await deleteCompanyRecord(organizationId, companyName);
  console.log(`[INDEXEDDB] Cache cleared for company: ${companyName}`);
}

/**
 * Delete all cached vouchers and sync-metadata for a specific financial year
 * of a company. Other financial years for that company are preserved.
 *
 * @param {string} organizationId
 * @param {string} companyName
 * @param {string} financialYear  - e.g. "2026-27"
 * @returns {Promise<void>}
 */
export async function clearFinancialYearCache(organizationId, companyName, financialYear) {
  console.log(
    `[INDEXEDDB] Clearing FY cache: ${companyName} / ${financialYear}`
  );
  await deleteVouchersByCompanyAndFY(organizationId, companyName, financialYear);
  await deleteSyncMetadataByFY(organizationId, companyName, financialYear);
  console.log(
    `[INDEXEDDB] FY cache cleared: ${companyName} / ${financialYear}`
  );
}

/**
 * Nuke ALL locally cached Tally data for an organisation.
 *
 * ⚠️  This is a destructive operation — it clears all three object stores.
 * Intended for use in a "Clear All Local Data" settings action.
 *
 * @param {string} organizationId
 * @returns {Promise<void>}
 */
export async function clearAllLocalTallyData(organizationId) {
  console.log('[INDEXEDDB] Clearing ALL local Tally data for org:', organizationId);

  // Discover which companies exist first
  const companies = await getCachedCompanies(organizationId);

  for (const c of companies) {
    await deleteVouchersByCompany(organizationId, c.companyName);
    await deleteSyncMetadataByCompany(organizationId, c.companyName);
  }

  await deleteAllCompanyRecords(organizationId);

  console.log('[INDEXEDDB] ALL local Tally data cleared for org:', organizationId);
}

/**
 * Hard-reset the entire IndexedDB database — clears every object store.
 * Use ONLY in developer tooling or a factory-reset scenario.
 *
 * @returns {Promise<void>}
 */
export async function clearEntireDatabase() {
  console.warn('[INDEXEDDB] ⚠️  Clearing ENTIRE TallySalesAnalyticsDB');

  const db = await getDatabase();
  if (!db) return;

  const stores = [STORE_VOUCHERS, STORE_SYNC_METADATA, STORE_COMPANIES];

  const tx = db.transaction(stores, 'readwrite');
  for (const storeName of stores) {
    await promisifyRequest(tx.objectStore(storeName).clear());
  }
  await promisifyTransaction(tx);

  console.warn('[INDEXEDDB] Entire database cleared.');
}
