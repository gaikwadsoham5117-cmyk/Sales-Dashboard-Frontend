/**
 * @fileoverview
 * JSDoc type definitions for the TallySalesAnalyticsDB IndexedDB layer.
 *
 * The project is plain JavaScript (no TypeScript compiler). All types here
 * are expressed as JSDoc @typedef so editors can still provide IntelliSense.
 *
 * Do NOT duplicate the SalesVoucherDTO fields – they are defined below once
 * and reused by IndexedDBVoucher via the @extends pattern.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Tally DTO types (mirrors what the Spring Boot backend returns)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A single line-item (stock item) inside a sales voucher.
 * @typedef {Object} SalesItemDTO
 * @property {string}  [stockItemName]   - Name of the stock item / product
 * @property {string}  [itemParentName]  - Parent group of the stock item
 * @property {number}  [quantity]        - Quantity sold
 * @property {string}  [unit]            - Unit of measure (e.g. "Nos", "Kg")
 * @property {number}  [rate]            - Unit rate
 * @property {number}  [amount]          - Line amount (qty × rate)
 * @property {number}  [discountAmount]  - Discount applied to this line
 * @property {number}  [taxAmount]       - Tax amount for this line
 */

/**
 * A ledger entry inside a sales voucher (e.g. Party, Tax, Discount).
 * @typedef {Object} LedgerEntryDTO
 * @property {string}  [ledgerName]      - Name of the ledger
 * @property {number}  [amount]          - Credit or debit amount
 * @property {boolean} [isDeemedPositive]
 */

/**
 * A GST detail record attached to a voucher.
 * @typedef {Object} GstDetailDTO
 * @property {string}  [hsnCode]
 * @property {number}  [taxableValue]
 * @property {number}  [cgstAmount]
 * @property {number}  [sgstAmount]
 * @property {number}  [igstAmount]
 * @property {number}  [cessAmount]
 * @property {number}  [gstRate]
 */

/**
 * The core Tally Sales Voucher DTO as returned by the Spring Boot backend.
 * All fields are optional so the type is safe even when the backend omits some.
 * @typedef {Object} SalesVoucherDTO
 * @property {string}           [guid]              - Tally GUID (globally unique)
 * @property {string}           [masterId]          - Tally master / internal ID
 * @property {string}           [date]              - "YYYYMMDD" string
 * @property {string}           [voucherTypeName]   - e.g. "Sales"
 * @property {string}           [voucherNumber]     - e.g. "SL/001"
 * @property {string}           [partyLedgerName]   - Customer ledger name
 * @property {string}           [partyParentName]   - Customer group
 * @property {string}           [reference]         - Purchase order / reference no
 * @property {number}           [totalAmount]       - Grand total of the voucher
 * @property {SalesItemDTO[]}   [items]             - Line items
 * @property {LedgerEntryDTO[]} [ledgerEntries]     - All ledger entries
 * @property {GstDetailDTO[]}   [gstDetails]        - GST breakdown
 */

// ─────────────────────────────────────────────────────────────────────────────
// IndexedDB layer types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A voucher record as stored in IndexedDB.
 * Extends SalesVoucherDTO with the keys needed for multi-company isolation.
 *
 * @typedef {SalesVoucherDTO & {
 *   _id:            string,
 *   organizationId: string,
 *   companyKey:     string,
 *   financialYear:  string,
 *   cachedAt:       number,
 * }} IndexedDBVoucher
 *
 * The composite primary key `_id` is built as:
 *   `${organizationId}|${companyKey}|${financialYear}|${guid}`
 *
 * This guarantees:
 *  – No cross-company pollution (different companyKey → different _id)
 *  – No cross-FY pollution (different financialYear → different _id)
 *  – Upsert safety (same GUID in same company+FY → same _id → overwrite)
 */

/**
 * A date range (ISO strings "YYYY-MM-DD").
 * @typedef {Object} DateRange
 * @property {string} from - Start date inclusive e.g. "2026-08-01"
 * @property {string} to   - End date inclusive e.g. "2026-08-31"
 */

/**
 * Possible sync statuses for a cached period.
 * @typedef {'IN_PROGRESS' | 'COMPLETE' | 'FAILED'} SyncStatus
 */

/**
 * Metadata for a single synced period (date range) of a company / FY.
 *
 * @typedef {Object} SyncMetadata
 * @property {string}     _id            - `${organizationId}|${companyKey}|${financialYear}|${periodStart}|${periodEnd}`
 * @property {string}     organizationId
 * @property {string}     companyKey     - Normalised company name used as the key
 * @property {string}     financialYear  - e.g. "2026-27"
 * @property {string}     periodStart    - "YYYY-MM-DD"
 * @property {string}     periodEnd      - "YYYY-MM-DD"
 * @property {SyncStatus} status
 * @property {number}     voucherCount   - Number of vouchers in this period
 * @property {number}     lastSyncedAt   - Unix timestamp (ms)
 * @property {number}     lastAccessedAt - Unix timestamp (ms)
 */

/**
 * High-level metadata record for a company stored in the `companies` table.
 *
 * @typedef {Object} CompanyCacheMetadata
 * @property {string} _id            - `${organizationId}|${companyKey}`
 * @property {string} organizationId
 * @property {string} companyKey     - Normalised company name
 * @property {string} companyName    - Display name (original casing)
 * @property {number} firstCachedAt  - Unix timestamp (ms)
 * @property {number} lastAccessedAt - Unix timestamp (ms)
 */

export {}; // make this a module so JSDoc works across imports
