/**
 * @fileoverview
 * Company store — keeps a lightweight registry of companies that have been
 * cached locally. Used for listing cached companies in future settings UIs.
 *
 * @import { CompanyCacheMetadata } from './types.js'
 */

import {
  getDatabase,
  STORE_COMPANIES,
  promisifyRequest,
  promisifyTransaction,
} from './database.js';

import { normaliseCompanyKey } from './helpers.js';

// ─────────────────────────────────────────────────────────────────────────────
// Key builder
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @param {string} organizationId
 * @param {string} companyKey
 * @returns {string}
 */
function buildCompanyId(organizationId, companyKey) {
  return `${organizationId}|${companyKey}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Write
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Register (or refresh) a company record in the `companies` store.
 * Safe to call every time a new batch of vouchers is cached.
 *
 * @param {string} organizationId
 * @param {string} companyName   - Original display name from Tally
 * @returns {Promise<boolean>}
 */
export async function upsertCompany(organizationId, companyName) {
  try {
    const db = await getDatabase();
    if (!db) return false;

    const companyKey = normaliseCompanyKey(companyName);
    const id         = buildCompanyId(organizationId, companyKey);

    const tx         = db.transaction(STORE_COMPANIES, 'readwrite');
    const store      = tx.objectStore(STORE_COMPANIES);

    // Read existing record so we preserve firstCachedAt
    const existing = await promisifyRequest(store.get(id));
    const now      = Date.now();

    /** @type {CompanyCacheMetadata} */
    const record = {
      _id:            id,
      organizationId,
      companyKey,
      companyName,
      firstCachedAt:  existing?.firstCachedAt ?? now,
      lastAccessedAt: now,
    };

    await promisifyRequest(store.put(record));
    await promisifyTransaction(tx);
    return true;
  } catch (err) {
    console.error('[INDEXEDDB] upsertCompany failed:', err);
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Read
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Return all company records for an organisation.
 *
 * @param {string} organizationId
 * @returns {Promise<CompanyCacheMetadata[]>}
 */
export async function getCachedCompanies(organizationId) {
  try {
    const db = await getDatabase();
    if (!db) return [];

    const tx    = db.transaction(STORE_COMPANIES, 'readonly');
    const store = tx.objectStore(STORE_COMPANIES);

    // Full scan (company counts are always tiny — typically < 20)
    const all = await promisifyRequest(store.getAll());
    return all.filter((c) => c.organizationId === organizationId);
  } catch (err) {
    console.error('[INDEXEDDB] getCachedCompanies failed:', err);
    return [];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Delete
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Remove the company registry entry for a company.
 * Call after deleting all vouchers and metadata for that company.
 *
 * @param {string} organizationId
 * @param {string} companyName
 * @returns {Promise<boolean>}
 */
export async function deleteCompanyRecord(organizationId, companyName) {
  try {
    const db = await getDatabase();
    if (!db) return false;

    const companyKey = normaliseCompanyKey(companyName);
    const id         = buildCompanyId(organizationId, companyKey);

    const tx    = db.transaction(STORE_COMPANIES, 'readwrite');
    const store = tx.objectStore(STORE_COMPANIES);

    await promisifyRequest(store.delete(id));
    await promisifyTransaction(tx);
    return true;
  } catch (err) {
    console.error('[INDEXEDDB] deleteCompanyRecord failed:', err);
    return false;
  }
}

/**
 * Delete ALL company registry entries for an organisation.
 * Use only when wiping all local data.
 *
 * @param {string} organizationId
 * @returns {Promise<number>}  Number of deleted records
 */
export async function deleteAllCompanyRecords(organizationId) {
  try {
    const db    = await getDatabase();
    if (!db) return 0;

    const companies = await getCachedCompanies(organizationId);
    if (companies.length === 0) return 0;

    const tx    = db.transaction(STORE_COMPANIES, 'readwrite');
    const store = tx.objectStore(STORE_COMPANIES);

    for (const c of companies) {
      store.delete(c._id);
    }
    await promisifyTransaction(tx);
    return companies.length;
  } catch (err) {
    console.error('[INDEXEDDB] deleteAllCompanyRecords failed:', err);
    return 0;
  }
}
