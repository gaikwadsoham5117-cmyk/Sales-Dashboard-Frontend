/**
 * @fileoverview
 * Shared helper utilities for the IndexedDB service layer.
 *
 * - Financial year calculation (from a Tally "YYYYMMDD" date string)
 * - Company key normalisation
 *
 * No React, no API calls, no IndexedDB operations here — pure functions only.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Financial Year
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Determine the Indian financial year from a Tally date string ("YYYYMMDD").
 *
 * Indian FY runs April 1 → March 31.
 *
 * Examples:
 *   "20260401"  →  "2026-27"   (Apr 2026 = start of FY 2026-27)
 *   "20270331"  →  "2026-27"   (Mar 2027 = end of FY 2026-27)
 *   "20260331"  →  "2025-26"   (Mar 2026 = end of FY 2025-26)
 *
 * Falls back to the calendar year as a string if the date is unparseable.
 *
 * @param {string} [tallyDate]  - "YYYYMMDD" as returned by the backend
 * @returns {string}  e.g. "2026-27"
 */
export function getFinancialYear(tallyDate) {
  if (!tallyDate) {
    // Fallback: use current FY
    return _fyFromCalendarYear(new Date().getFullYear(), new Date().getMonth() + 1);
  }

  const clean = toComparableDateStr(tallyDate) || String(tallyDate).replace(/[-/]/g, '').trim();
  if (clean.length >= 6) {
    const year  = parseInt(clean.substring(0, 4), 10);
    const month = parseInt(clean.substring(4, 6), 10);

    if (!isNaN(year) && !isNaN(month) && year >= 1900 && year <= 2100 && month >= 1 && month <= 12) {
      return _fyFromCalendarYear(year, month);
    }
  }

  return _fyFromCalendarYear(new Date().getFullYear(), new Date().getMonth() + 1);
}

/**
 * Determine the Indian FY label from a calendar year and month.
 *
 * @param {number} year   - e.g. 2026
 * @param {number} month  - 1..12
 * @returns {string}      - e.g. "2026-27"
 */
function _fyFromCalendarYear(year, month) {
  // April (month 4) or later → FY starts in `year`
  // January–March (month 1–3) → FY started in `year - 1`
  const fyStart = month >= 4 ? year : year - 1;
  const fyEnd   = fyStart + 1;
  return `${fyStart}-${String(fyEnd).slice(-2)}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Company key normalisation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Produce a stable, case-insensitive lookup key from a Tally company name.
 *
 * Rules:
 *  - Trim leading/trailing whitespace
 *  - Collapse internal whitespace to single space
 *  - Convert to UPPER CASE (Tally company names are case-insensitive)
 *
 * This means "Shri Ramkrishna Kirana" and "SHRI RAMKRISHNA KIRANA" map to
 * the same key, preventing accidental duplication.
 *
 * @param {string} [companyName]
 * @returns {string}
 */
export function normaliseCompanyKey(companyName) {
  if (!companyName || typeof companyName !== 'string') return '__UNKNOWN__';
  return companyName.trim().replace(/\s+/g, ' ').toUpperCase();
}

// ─────────────────────────────────────────────────────────────────────────────
// Date helpers (ISO ↔ Tally format)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Convert a Tally date string "YYYYMMDD" to ISO "YYYY-MM-DD".
 *
 * @param {string} tallyDate
 * @returns {string}
 */
export function tallyDateToISO(tallyDate) {
  if (!tallyDate || tallyDate.length < 8) return '';
  return `${tallyDate.substring(0, 4)}-${tallyDate.substring(4, 6)}-${tallyDate.substring(6, 8)}`;
}

/**
 * Convert an ISO "YYYY-MM-DD" string to Tally format "YYYYMMDD".
 *
 * @param {string} isoDate
 * @returns {string}
 */
export function isoToTallyDate(isoDate) {
  if (!isoDate || isoDate.length < 10) return '';
  return isoDate.replace(/-/g, '');
}

/**
 * Check whether a string looks like a valid ISO date "YYYY-MM-DD".
 *
 * @param {string} [dateStr]
 * @returns {boolean}
 */
/**
 * Convert any date input (YYYYMMDD, YYYY-MM-DD, ISO timestamp, etc.) to a
 * clean 8-digit "YYYYMMDD" string for reliable lexical comparison.
 *
 * @param {string | number | Date} [dateInput]
 * @returns {string}  e.g. "20220401"
 */
export function toComparableDateStr(dateInput) {
  if (!dateInput) return '';
  const str = String(dateInput).trim();

  // Match ISO / hyphen / slash format e.g. "2022-04-01" or "2022/04/01" or "2022-04-01T..."
  const matchIso = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (matchIso) {
    const y = matchIso[1];
    const m = matchIso[2].padStart(2, '0');
    const d = matchIso[3].padStart(2, '0');
    return `${y}${m}${d}`;
  }

  // Match pure 8 digits e.g. "20220401"
  const matchDigits = str.match(/^(\d{4})(\d{2})(\d{2})/);
  if (matchDigits) {
    return `${matchDigits[1]}${matchDigits[2]}${matchDigits[3]}`;
  }

  // Match DD-MM-YYYY or DD/MM/YYYY
  const matchDmy = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (matchDmy) {
    const d = matchDmy[1].padStart(2, '0');
    const m = matchDmy[2].padStart(2, '0');
    const y = matchDmy[3];
    return `${y}${m}${d}`;
  }

  // Fallback: parse via Date object
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, '0');
    const d = String(parsed.getDate()).padStart(2, '0');
    return `${y}${m}${d}`;
  }

  return '';
}

/**
 * Check whether a string looks like a valid ISO date "YYYY-MM-DD".
 *
 * @param {string} [dateStr]
 * @returns {boolean}
 */
export function isValidISODate(dateStr) {
  if (!dateStr || dateStr.length !== 10) return false;
  const d = new Date(dateStr);
  return !isNaN(d.getTime());
}

// ─────────────────────────────────────────────────────────────────────────────
// Ledger Entry Normalization Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Normalize a ledger entry amount to a positive number using Math.abs.
 * Safely handles null, undefined, and non-numeric values without converting them to 0.
 *
 * @param {*} amount
 * @returns {*}
 */
export function normalizeLedgerAmount(amount) {
  if (amount == null) return amount;
  const num = Number(amount);
  if (Number.isNaN(num)) return amount;
  return Math.abs(num);
}

/**
 * Normalizes a single ledger entry object so its amount is positive.
 * Preserves all other ledger fields intact.
 *
 * @param {Object} entry
 * @returns {Object}
 */
export function normalizeLedgerEntry(entry) {
  if (!entry || typeof entry !== 'object') return entry;
  return {
    ...entry,
    amount: normalizeLedgerAmount(entry.amount),
  };
}

/**
 * Normalizes an array of ledger entries.
 *
 * @param {Array<Object>} [ledgerEntries]
 * @returns {Array<Object>}
 */
export function normalizeLedgerEntries(ledgerEntries) {
  if (!Array.isArray(ledgerEntries)) return [];
  return ledgerEntries.map(normalizeLedgerEntry);
}

/**
 * Check if a voucher contains any ledger entries with negative amounts.
 *
 * @param {Object} voucher
 * @returns {boolean}
 */
export function hasNegativeLedgerAmount(voucher) {
  if (!voucher || !Array.isArray(voucher.ledgerEntries)) return false;
  return voucher.ledgerEntries.some(
    (e) => e && e.amount != null && !Number.isNaN(Number(e.amount)) && Number(e.amount) < 0
  );
}

/**
 * Extract the effective sales turnover amount for a voucher from its ledger entries
 * (specifically the party / customer ledger entry that represents the full bill amount),
 * falling back to totalAmount / amount if ledger entries are not available.
 *
 * @param {Object} v - Sales Voucher object
 * @returns {number}
 */
export function getVoucherTurnoverAmount(v) {
  if (!v || typeof v !== 'object') return 0;

  if (Array.isArray(v.ledgerEntries) && v.ledgerEntries.length > 0) {
    const partyName = String(v.partyLedgerName || '').trim().toLowerCase();

    // 1. Explicit partyLedger flag
    let target = v.ledgerEntries.find((l) => l?.partyLedger === true);

    // 2. Matches voucher's partyLedgerName
    if (!target && partyName) {
      target = v.ledgerEntries.find(
        (l) => String(l?.ledgerName || '').trim().toLowerCase() === partyName
      );
    }

    // 3. Has bill allocations (Party ledgers in Tally contain billAllocations)
    if (!target) {
      target = v.ledgerEntries.find(
        (l) => Array.isArray(l?.billAllocations) && l.billAllocations.length > 0
      );
    }

    // 4. First non-GST, non-roundoff ledger entry with positive amount, or first entry
    if (!target) {
      target =
        v.ledgerEntries.find((l) => !l?.gstLedger && Number(l?.amount) > 0) ||
        v.ledgerEntries[0];
    }

    if (target && target.amount != null) {
      const amt = Math.abs(Number(target.amount));
      if (!Number.isNaN(amt) && amt > 0) {
        return amt;
      }
    }
  }

  return Number(v.totalAmount !== undefined ? v.totalAmount : (v.amount !== undefined ? v.amount : 0)) || 0;
}


