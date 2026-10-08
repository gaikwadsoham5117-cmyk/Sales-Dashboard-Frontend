import React, { useState, useEffect, useMemo } from 'react';
import {
  ChevronDown, ChevronRight, FileSpreadsheet,
  Package, Layers, Hash,
  ChevronLeft, ChevronsLeft, ChevronsRight,
} from 'lucide-react';
import { formatCurrency, formatReadableDate } from '../../utils/formatters';
import { exportVouchersToExcel } from '../../utils/excelExport';

export default function SalesVoucherTable({ vouchers = [] }) {
  const [expandedRows, setExpandedRows] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  const safeVouchers = Array.isArray(vouchers) ? vouchers : [];

  // Reset page and expanded state when vouchers dataset changes
  useEffect(() => {
    setCurrentPage(1);
    setExpandedRows({});
  }, [vouchers]);

  const totalRecords = safeVouchers.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));

  // Ensure currentPage remains valid if totalPages changes
  const validCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const paginatedVouchers = useMemo(() => {
    const start = (validCurrentPage - 1) * pageSize;
    return safeVouchers.slice(start, start + pageSize);
  }, [safeVouchers, validCurrentPage, pageSize]);

  const toggleRow = (id) =>
    setExpandedRows((prev) => ({ ...prev, [id]: !prev[id] }));

  const getItems = (v) => (Array.isArray(v?.items) ? v.items : []);
  const getLedgerEntries = (v) => (Array.isArray(v?.ledgerEntries) ? v.ledgerEntries : []);
  const getBillAllocations = (l) => (Array.isArray(l?.billAllocations) ? l.billAllocations : []);

  const getGSTDetails = (v) => ({
    applicable: Boolean(v?.gstDetails?.applicable),
    cgst: Number(v?.gstDetails?.cgst ?? 0),
    sgst: Number(v?.gstDetails?.sgst ?? 0),
    igst: Number(v?.gstDetails?.igst ?? 0),
    cess: Number(v?.gstDetails?.cess ?? 0),
    stateCess: Number(v?.gstDetails?.stateCess ?? 0),
  });

  const getTotalGST = (v) => {
    const g = getGSTDetails(v);
    return g.cgst + g.sgst + g.igst + g.cess + g.stateCess;
  };

  const getTotalQuantity = (v) =>
    getItems(v).reduce((t, item) => t + Number(item?.quantity ?? 0), 0);

  const handleExport = () => exportVouchersToExcel(safeVouchers);

  // Shared classes
  const thBase = 'px-4 py-3 text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider';
  const tdBase = 'px-4 py-3 text-xs';

  const startIndex = totalRecords === 0 ? 0 : (validCurrentPage - 1) * pageSize + 1;
  const endIndex = Math.min(validCurrentPage * pageSize, totalRecords);

  // Generate visible page numbers for pagination controls
  const paginationRange = useMemo(() => {
    const delta = 2;
    const range = [];
    for (
      let i = Math.max(2, validCurrentPage - delta);
      i <= Math.min(totalPages - 1, validCurrentPage + delta);
      i++
    ) {
      range.push(i);
    }

    if (validCurrentPage - delta > 2) {
      range.unshift('...');
    }
    if (validCurrentPage + delta < totalPages - 1) {
      range.push('...');
    }

    range.unshift(1);
    if (totalPages > 1) {
      range.push(totalPages);
    }

    return range;
  }, [validCurrentPage, totalPages]);

  return (
    <div className="w-full space-y-3">
      {/* Table Header Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-gray-800 p-3 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
            Showing <strong className="text-gray-900 dark:text-gray-100">{startIndex}</strong> to{' '}
            <strong className="text-gray-900 dark:text-gray-100">{endIndex}</strong> of{' '}
            <strong className="text-blue-600 dark:text-blue-400">{totalRecords.toLocaleString()}</strong> vouchers
          </span>
          <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
            <span>Per page:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md px-2 py-1 text-xs text-gray-700 dark:text-gray-200 focus:outline-none focus:border-blue-500"
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={200}>200</option>
            </select>
          </div>
        </div>

        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-green-600 hover:bg-green-700 text-white transition-colors shadow-sm cursor-pointer"
        >
          <FileSpreadsheet size={14} />
          Export to Excel ({totalRecords.toLocaleString()})
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
        <table className="w-full text-sm bg-white dark:bg-gray-800">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-900/60 border-b border-gray-200 dark:border-gray-700">
              <th className={`${thBase} w-10 text-center`}>#</th>
              <th className={`${thBase} text-left`}>Date</th>
              <th className={`${thBase} text-left`}>Voucher Type</th>
              <th className={`${thBase} text-left`}>Voucher No.</th>
              <th className={`${thBase} text-left`}>Party</th>
              <th className={`${thBase} text-right`}>Amount</th>
              <th className={`${thBase} w-10 text-center`}>Detail</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {paginatedVouchers.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-gray-400 dark:text-gray-500 text-xs font-medium">
                  No sales vouchers found matching your filter criteria.
                </td>
              </tr>
            ) : (
              paginatedVouchers.map((voucher, index) => {
                const globalIndex = (validCurrentPage - 1) * pageSize + index;
                const rowKey = voucher?.guid || voucher?.masterId || `${voucher?.date}-${voucher?.voucherNumber}-${globalIndex}`;
                const isExpanded = Boolean(expandedRows[rowKey]);
                const items = getItems(voucher);
                const ledgerEntries = getLedgerEntries(voucher);
                const gst = getGSTDetails(voucher);
                const totalGST = getTotalGST(voucher);
                const totalQty = getTotalQuantity(voucher);

                return (
                  <React.Fragment key={rowKey}>
                    {/* Main Row */}
                    <tr
                      onClick={() => toggleRow(rowKey)}
                      className={`cursor-pointer select-none transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/40 ${
                        isExpanded ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''
                      }`}
                    >
                      <td className={`${tdBase} text-center text-gray-400 dark:text-gray-500 font-mono`}>{globalIndex + 1}</td>
                      <td className={`${tdBase} font-medium text-gray-700 dark:text-gray-200`}>{formatReadableDate(voucher?.date)}</td>
                      <td className={`${tdBase}`}>
                        <span className="px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 font-medium text-[11px]">
                          {voucher?.voucherTypeName || '—'}
                        </span>
                      </td>
                      <td className={`${tdBase}`}>
                        <div className="flex flex-col font-mono">
                          <span className="font-semibold text-blue-600 dark:text-blue-400">
                            #{voucher?.voucherNumber || '—'}
                          </span>
                          {voucher?.reference ? (
                            <span className="text-[10px] text-gray-400 dark:text-gray-500 font-sans truncate" title={`Ref: ${voucher.reference}`}>
                              Ref: {voucher.reference}
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className={`${tdBase}`}>
                        <div className="flex flex-col">
                          <span className="inline-flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 dark:bg-blue-500 flex-shrink-0" />
                            <span className="font-medium text-gray-800 dark:text-gray-200">
                              {voucher?.partyLedgerName || 'N/A'}
                            </span>
                          </span>
                          {voucher?.partyParentName ? (
                            <span className="text-[10px] text-gray-400 dark:text-gray-500 pl-3 block truncate" title={`Group: ${voucher.partyParentName}`}>
                              Group: {voucher.partyParentName}
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className={`${tdBase} text-right font-bold text-green-700 dark:text-green-400 text-sm`}>
                        {formatCurrency(Number(voucher?.totalAmount ?? 0))}
                      </td>
                      <td className={`${tdBase} text-center`}>
                        <button className="p-1 rounded-md text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
                          {isExpanded
                            ? <ChevronDown size={15} className="text-blue-500" />
                            : <ChevronRight size={15} />}
                        </button>
                      </td>
                    </tr>

                    {/* Expanded panel */}
                    {isExpanded && (
                      <tr>
                        <td colSpan={7} className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                          <div className="px-6 py-5 space-y-5">

                            {/* Voucher Metadata Overview */}
                            {(voucher?.reference || voucher?.partyParentName) && (
                              <div className="flex flex-wrap items-center gap-4 px-3.5 py-2.5 rounded-lg bg-blue-50/60 dark:bg-blue-900/15 border border-blue-100 dark:border-blue-800/30 text-xs">
                                {voucher?.reference && (
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[10px] uppercase font-bold text-blue-600 dark:text-blue-400">Reference:</span>
                                    <span className="font-mono font-semibold text-gray-800 dark:text-gray-200">{voucher.reference}</span>
                                  </div>
                                )}
                                {voucher?.partyParentName && (
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[10px] uppercase font-bold text-blue-600 dark:text-blue-400">Party Group:</span>
                                    <span className="font-semibold text-gray-800 dark:text-gray-200">{voucher.partyParentName}</span>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* SECTION 1 — Items */}
                            <div>
                              <div className="flex items-center gap-2 mb-3">
                                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40">
                                  <Package size={12} className="text-amber-600 dark:text-amber-400" />
                                  <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-300 uppercase tracking-wide">Items</span>
                                  <span className="ml-0.5 px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-800/40 text-amber-700 dark:text-amber-300 text-[10px] font-bold">{items.length}</span>
                                </div>
                              </div>

                              {items.length === 0 ? (
                                <div className="rounded-lg border border-dashed border-gray-300 dark:border-gray-600 p-4 text-gray-400 dark:text-gray-500 text-xs text-center">
                                  No inventory items in this voucher
                                </div>
                              ) : (
                                <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                                  <table className="w-full text-xs bg-white dark:bg-gray-800">
                                    <thead>
                                      <tr className="bg-gray-50 dark:bg-gray-900/60 border-b border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500 uppercase tracking-wider text-[10px]">
                                        <th className="px-3 py-2 text-left font-semibold">#</th>
                                        <th className="px-3 py-2 text-left font-semibold">Stock Item</th>
                                        <th className="px-3 py-2 text-left font-semibold">Item Group</th>
                                        <th className="px-3 py-2 text-right font-semibold">Qty</th>
                                        <th className="px-3 py-2 text-left font-semibold">Unit</th>
                                        <th className="px-3 py-2 text-right font-semibold">Rate</th>
                                        <th className="px-3 py-2 text-left font-semibold">Rate Unit</th>
                                        <th className="px-3 py-2 text-right font-semibold">Amount</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                      {items.map((item, iIdx) => (
                                        <tr key={iIdx} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                          <td className="px-3 py-2.5 text-gray-400 dark:text-gray-500 font-mono">{iIdx + 1}</td>
                                          <td className="px-3 py-2.5 font-semibold text-gray-800 dark:text-gray-100">{item?.stockItemName || '—'}</td>
                                          <td className="px-3 py-2.5 text-gray-500 dark:text-gray-400">{item?.itemParentName || '—'}</td>
                                          <td className="px-3 py-2.5 text-right text-gray-700 dark:text-gray-200 font-mono">{Number(item?.quantity ?? 0)}</td>
                                          <td className="px-3 py-2.5 text-gray-500 dark:text-gray-400">{item?.quantityUnit || '—'}</td>
                                          <td className="px-3 py-2.5 text-right text-gray-700 dark:text-gray-200 font-mono">{formatCurrency(Number(item?.rate ?? 0))}</td>
                                          <td className="px-3 py-2.5 text-gray-500 dark:text-gray-400">{item?.rateUnit || '—'}</td>
                                          <td className="px-3 py-2.5 text-right font-bold text-green-700 dark:text-green-400 font-mono">{formatCurrency(Number(item?.amount ?? 0))}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                    <tfoot>
                                      <tr className="bg-gray-50 dark:bg-gray-900/60 border-t border-gray-200 dark:border-gray-700">
                                        <td colSpan={3} className="px-3 py-2 text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase">Total</td>
                                        <td className="px-3 py-2 text-right font-bold text-gray-700 dark:text-gray-200 font-mono">{totalQty}</td>
                                        <td colSpan={3} />
                                        <td className="px-3 py-2 text-right font-bold text-green-700 dark:text-green-400 font-mono">
                                          {formatCurrency(Number(voucher?.totalAmount ?? 0))}
                                        </td>
                                      </tr>
                                    </tfoot>
                                  </table>
                                </div>
                              )}
                            </div>

                            {/* SECTION 2 — Ledger Entries */}
                            <div>
                              <div className="flex items-center gap-2 mb-3">
                                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/40">
                                  <Layers size={12} className="text-blue-600 dark:text-blue-400" />
                                  <span className="text-[11px] font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wide">Ledger Entries</span>
                                  <span className="ml-0.5 px-1.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-800/40 text-blue-700 dark:text-blue-300 text-[10px] font-bold">{ledgerEntries.length}</span>
                                </div>
                              </div>

                              {ledgerEntries.length === 0 ? (
                                <div className="rounded-lg border border-dashed border-gray-300 dark:border-gray-600 p-4 text-gray-400 dark:text-gray-500 text-xs text-center">
                                  No ledger entries available
                                </div>
                              ) : (
                                <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                                  <table className="w-full text-xs bg-white dark:bg-gray-800">
                                    <thead>
                                      <tr className="bg-gray-50 dark:bg-gray-900/60 border-b border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500 uppercase tracking-wider text-[10px]">
                                        <th className="px-3 py-2 text-left font-semibold">Ledger Name</th>
                                        <th className="px-3 py-2 text-right font-semibold">Amount</th>
                                        <th className="px-3 py-2 text-center font-semibold">Party Ledger</th>
                                        <th className="px-3 py-2 text-center font-semibold">GST Ledger</th>
                                        <th className="px-3 py-2 text-center font-semibold">Bill Allocs</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                      {ledgerEntries.map((ledger, lIdx) => {
                                        const bills = getBillAllocations(ledger);
                                        const isGST = ledger?.gstLedger;
                                        const isParty = ledger?.partyLedger;
                                        const amt = Number(ledger?.amount ?? 0);
                                        return (
                                          <tr key={lIdx} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                            <td className="px-3 py-2.5 font-semibold text-gray-800 dark:text-gray-100">
                                              <span className="flex items-center gap-1.5">
                                                {isGST && (
                                                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-600">
                                                    GST
                                                  </span>
                                                )}
                                                {ledger?.ledgerName || '—'}
                                              </span>
                                            </td>
                                            <td className={`px-3 py-2.5 text-right font-bold font-mono ${amt < 0 ? 'text-red-600 dark:text-red-400' : 'text-green-700 dark:text-green-400'}`}>
                                              {formatCurrency(amt)}
                                            </td>
                                            <td className="px-3 py-2.5 text-center">
                                              {isParty
                                                ? <span className="px-2 py-0.5 rounded-full bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800/40 text-[10px] font-semibold">Yes</span>
                                                : <span className="text-gray-400 dark:text-gray-600 text-[10px]">—</span>}
                                            </td>
                                            <td className="px-3 py-2.5 text-center">
                                              {isGST
                                                ? <span className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600 text-[10px] font-semibold">Yes</span>
                                                : <span className="text-gray-400 dark:text-gray-600 text-[10px]">—</span>}
                                            </td>
                                            <td className="px-3 py-2.5 text-center">
                                              {bills.length > 0
                                                ? <span className="px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border border-blue-100 dark:border-blue-800/40 text-[10px] font-semibold">{bills.length}</span>
                                                : <span className="text-gray-300 dark:text-gray-600 text-[10px]">—</span>}
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>

                            {/* SECTION 3 — GST Details */}
                            <div>
                              <div className="flex items-center gap-2 mb-3">
                                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600">
                                  <Hash size={12} className="text-gray-500 dark:text-gray-400" />
                                  <span className="text-[11px] font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide">GST Details</span>
                                  {gst.applicable
                                    ? <span className="ml-0.5 px-1.5 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-[10px] font-bold">Applicable</span>
                                    : <span className="ml-0.5 px-1.5 py-0.5 rounded-full bg-gray-200 dark:bg-gray-600 text-gray-500 dark:text-gray-400 text-[10px] font-bold">Not Applicable</span>}
                                </div>
                              </div>

                              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                                {[
                                  { label: 'CGST', value: gst.cgst },
                                  { label: 'SGST', value: gst.sgst },
                                  { label: 'IGST', value: gst.igst },
                                  { label: 'Cess', value: gst.cess },
                                  { label: 'State Cess', value: gst.stateCess },
                                  { label: 'Total GST', value: totalGST, highlight: true },
                                ].map(({ label, value, highlight }) => (
                                  <div
                                    key={label}
                                    className={`rounded-lg px-3 py-2.5 border ${
                                      highlight
                                        ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800/40'
                                        : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                                    }`}
                                  >
                                    <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-0.5">{label}</p>
                                    <p className={`text-xs font-bold font-mono ${
                                      highlight
                                        ? 'text-blue-700 dark:text-blue-300'
                                        : value > 0
                                          ? 'text-gray-800 dark:text-gray-200'
                                          : 'text-gray-300 dark:text-gray-600'
                                    }`}>
                                      {formatCurrency(value)}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* SECTION 4 — Summary Footer */}
                            <div className="grid grid-cols-3 gap-3 pt-2 border-t border-gray-200 dark:border-gray-700">
                              <div className="rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-3 text-center">
                                <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider">Items</p>
                                <p className="text-lg font-bold text-amber-600 dark:text-amber-400 mt-0.5">{items.length}</p>
                              </div>
                              <div className="rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-3 text-center">
                                <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider">Total Qty</p>
                                <p className="text-lg font-bold text-gray-700 dark:text-gray-200 mt-0.5">{totalQty}</p>
                              </div>
                              <div className="rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-3 text-center">
                                <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider">Ledger Entries</p>
                                <p className="text-lg font-bold text-blue-600 dark:text-blue-400 mt-0.5">{ledgerEntries.length}</p>
                              </div>
                            </div>

                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-gray-800 p-3 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm text-xs">
          <span className="text-gray-500 dark:text-gray-400">
            Page <strong className="text-gray-800 dark:text-gray-200">{validCurrentPage}</strong> of{' '}
            <strong className="text-gray-800 dark:text-gray-200">{totalPages}</strong> ({totalRecords.toLocaleString()} total vouchers)
          </span>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={validCurrentPage === 1}
              aria-label="First page"
              className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronsLeft size={14} />
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={validCurrentPage === 1}
              aria-label="Previous page"
              className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={14} />
            </button>

            {paginationRange.map((page, idx) => {
              if (page === '...') {
                return (
                  <span key={`ellipsis-${idx}`} className="px-2 py-1 text-gray-400">
                    ...
                  </span>
                );
              }
              const isCurrent = page === validCurrentPage;
              return (
                <button
                  key={`page-${page}`}
                  onClick={() => setCurrentPage(page)}
                  className={`min-w-[28px] h-7 px-2 rounded-lg font-semibold text-xs transition-colors ${
                    isCurrent
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  {page}
                </button>
              );
            })}

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={validCurrentPage === totalPages}
              aria-label="Next page"
              className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight size={14} />
            </button>
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={validCurrentPage === totalPages}
              aria-label="Last page"
              className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronsRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
