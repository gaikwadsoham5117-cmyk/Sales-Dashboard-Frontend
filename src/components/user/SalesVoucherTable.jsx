import React, { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  FileSpreadsheet,
  Package,
  Layers,
  Hash
} from "lucide-react";

import {
  formatCurrency,
  formatReadableDate
} from "../../utils/formatters";

import { exportVouchersToExcel } from "../../utils/excelExport";

export default function SalesVoucherTable({ vouchers = [] }) {
  const [expandedRows, setExpandedRows] = useState({});

  const safeVouchers = Array.isArray(vouchers) ? vouchers : [];

  const toggleRow = (index) => {
    setExpandedRows((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  const getItems = (v) => (Array.isArray(v?.items) ? v.items : []);
  const getLedgerEntries = (v) => (Array.isArray(v?.ledgerEntries) ? v.ledgerEntries : []);
  const getBillAllocations = (l) => (Array.isArray(l?.billAllocations) ? l.billAllocations : []);

  const getGSTDetails = (v) => ({
    applicable: Boolean(v?.gstDetails?.applicable),
    cgst: Number(v?.gstDetails?.cgst ?? 0),
    sgst: Number(v?.gstDetails?.sgst ?? 0),
    igst: Number(v?.gstDetails?.igst ?? 0),
    cess: Number(v?.gstDetails?.cess ?? 0),
    stateCess: Number(v?.gstDetails?.stateCess ?? 0)
  });

  const getTotalGST = (v) => {
    const g = getGSTDetails(v);
    return g.cgst + g.sgst + g.igst + g.cess + g.stateCess;
  };

  const getTotalQuantity = (v) =>
    getItems(v).reduce((t, item) => t + Number(item?.quantity ?? 0), 0);

  const handleExport = () => exportVouchersToExcel(safeVouchers);

  return (
    <div className="w-full">
      {/* Export Button */}
      <div className="flex justify-end mb-4">
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-600/20 hover:from-emerald-500 hover:to-teal-500 transition-all cursor-pointer"
        >
          <FileSpreadsheet size={15} />
          Export to Excel
        </button>
      </div>

      {/* Main Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-700/60">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-950/70 border-b border-slate-700/60 text-slate-400 text-xs font-semibold uppercase tracking-wider">
              <th className="px-4 py-3 w-10 text-center">#</th>
              <th className="px-4 py-3 text-left">Date</th>
              <th className="px-4 py-3 text-left">Voucher Type</th>
              <th className="px-4 py-3 text-left">Voucher No.</th>
              <th className="px-4 py-3 text-left">Party</th>
              <th className="px-4 py-3 text-right">Amount</th>
              <th className="px-4 py-3 w-10 text-center">Detail</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-800/60 text-slate-300">
            {safeVouchers.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-slate-500 font-medium text-xs">
                  No sales vouchers found matching your filter criteria.
                </td>
              </tr>
            ) : (
              safeVouchers.map((voucher, index) => {
                const isExpanded    = Boolean(expandedRows[index]);
                const items         = getItems(voucher);
                const ledgerEntries = getLedgerEntries(voucher);
                const gst           = getGSTDetails(voucher);
                const totalGST      = getTotalGST(voucher);
                const totalQty      = getTotalQuantity(voucher);

                return (
                  <React.Fragment
                    key={voucher?.guid || voucher?.masterId || `${voucher?.date}-${voucher?.voucherNumber}-${index}`}
                  >
                    {/* MAIN ROW */}
                    <tr
                      onClick={() => toggleRow(index)}
                      className={`cursor-pointer select-none transition-colors hover:bg-slate-800/40 ${isExpanded ? "bg-slate-800/30" : ""}`}
                    >
                      <td className="px-4 py-3.5 text-center text-slate-500 font-mono text-xs">{index + 1}</td>
                      <td className="px-4 py-3.5 font-medium text-slate-200 text-xs">{formatReadableDate(voucher?.date)}</td>
                      <td className="px-4 py-3.5 text-xs">
                        <span className="px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-medium">
                          {voucher?.voucherTypeName || "-"}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 font-bold text-indigo-400 font-mono text-xs">#{voucher?.voucherNumber || "-"}</td>
                      <td className="px-4 py-3.5 text-xs">
                        <span className="inline-flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0" />
                          <span className="font-semibold text-white">{voucher?.partyLedgerName || "N/A"}</span>
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right font-extrabold text-emerald-400 text-sm">
                        {formatCurrency(Number(voucher?.totalAmount ?? 0))}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <button className="p-1 rounded bg-slate-800 text-slate-400 hover:text-indigo-300 hover:bg-slate-700 transition-colors">
                          {isExpanded ? <ChevronDown size={16} className="text-indigo-400" /> : <ChevronRight size={16} />}
                        </button>
                      </td>
                    </tr>

                    {/* EXPANDED DROPDOWN */}
                    {isExpanded && (
                      <tr>
                        <td colSpan={7} className="bg-slate-950/60 border-b border-slate-800">
                          <div className="px-6 py-5 space-y-5">

                            {/* Voucher Meta Cards */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                              {[
                               // { label: "Voucher Type", value: voucher?.voucherTypeName || "-" },
                                //{ label: "Voucher No.",  value: `#${voucher?.voucherNumber || "-"}` },
                                //{ label: "Master ID",    value: String(voucher?.masterId ?? "-").trim() },
                                //{ label: "GUID",         value: voucher?.guid || "-", truncate: true }
                              ].map(({ label, value, truncate }) => (
                                <div key={label} className="rounded-lg bg-slate-800/60 border border-slate-700/50 px-3 py-2.5">
                                  <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-0.5">{label}</p>
                                  <p className={`text-xs font-semibold text-slate-100 ${truncate ? "truncate" : ""}`} title={truncate ? value : undefined}>
                                    {value}
                                  </p>
                                </div>
                              ))}
                            </div>

                            {/* SECTION 1 — Items */}
                            <div>
                              <div className="flex items-center gap-2 mb-3">
                                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20">
                                  <Package size={13} className="text-amber-400" />
                                  <span className="text-xs font-bold text-amber-300 uppercase tracking-wide">Items</span>
                                  <span className="ml-1 px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold">{items.length}</span>
                                </div>
                              </div>

                              {items.length === 0 ? (
                                <div className="rounded-lg border border-dashed border-slate-700 p-4 text-slate-500 text-xs text-center">
                                  No inventory items in this voucher
                                </div>
                              ) : (
                                <div className="overflow-x-auto rounded-lg border border-slate-700/60">
                                  <table className="w-full text-xs">
                                    <thead>
                                      <tr className="bg-slate-900/80 border-b border-slate-700/60 text-slate-400 uppercase tracking-wider text-[10px]">
                                        <th className="px-3 py-2 text-left font-semibold">#</th>
                                        <th className="px-3 py-2 text-left font-semibold">Stock Item</th>
                                        <th className="px-3 py-2 text-right font-semibold">Qty</th>
                                        <th className="px-3 py-2 text-left font-semibold">Unit</th>
                                        <th className="px-3 py-2 text-right font-semibold">Rate</th>
                                        <th className="px-3 py-2 text-left font-semibold">Rate Unit</th>
                                        <th className="px-3 py-2 text-right font-semibold">Amount</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800/60">
                                      {items.map((item, iIdx) => (
                                        <tr key={iIdx} className="hover:bg-slate-800/30 transition-colors">
                                          <td className="px-3 py-2.5 text-slate-500 font-mono">{iIdx + 1}</td>
                                          <td className="px-3 py-2.5 font-semibold text-slate-100">{item?.stockItemName || "-"}</td>
                                          <td className="px-3 py-2.5 text-right text-slate-200 font-mono">{Number(item?.quantity ?? 0)}</td>
                                          <td className="px-3 py-2.5 text-slate-300">{item?.quantityUnit || "-"}</td>
                                          <td className="px-3 py-2.5 text-right text-slate-200 font-mono">{formatCurrency(Number(item?.rate ?? 0))}</td>
                                          <td className="px-3 py-2.5 text-slate-300">{item?.rateUnit || "-"}</td>
                                          <td className="px-3 py-2.5 text-right font-bold text-emerald-400 font-mono">{formatCurrency(Number(item?.amount ?? 0))}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                    <tfoot>
                                      <tr className="bg-slate-900/60 border-t border-slate-700/60">
                                        <td colSpan={2} className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase">Total</td>
                                        <td className="px-3 py-2 text-right font-bold text-slate-200 font-mono">{totalQty}</td>
                                        <td colSpan={3} />
                                        <td className="px-3 py-2 text-right font-bold text-emerald-300 font-mono">
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
                                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
                                  <Layers size={13} className="text-cyan-400" />
                                  <span className="text-xs font-bold text-cyan-300 uppercase tracking-wide">Ledger Entries</span>
                                  <span className="ml-1 px-1.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 text-[10px] font-bold">{ledgerEntries.length}</span>
                                </div>
                              </div>

                              {ledgerEntries.length === 0 ? (
                                <div className="rounded-lg border border-dashed border-slate-700 p-4 text-slate-500 text-xs text-center">
                                  No ledger entries available
                                </div>
                              ) : (
                                <div className="overflow-x-auto rounded-lg border border-slate-700/60">
                                  <table className="w-full text-xs">
                                    <thead>
                                      <tr className="bg-slate-900/80 border-b border-slate-700/60 text-slate-400 uppercase tracking-wider text-[10px]">
                                        <th className="px-3 py-2 text-left font-semibold">Ledger Name</th>
                                        <th className="px-3 py-2 text-right font-semibold">Amount</th>
                                        <th className="px-3 py-2 text-center font-semibold">Party Ledger</th>
                                        <th className="px-3 py-2 text-center font-semibold">GST Ledger</th>
                                        <th className="px-3 py-2 text-center font-semibold">Bill Allocs</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800/60">
                                      {ledgerEntries.map((ledger, lIdx) => {
                                        const bills   = getBillAllocations(ledger);
                                        const isGST   = ledger?.gstLedger;
                                        const isParty = ledger?.partyLedger;
                                        return (
                                          <tr key={lIdx} className="hover:bg-slate-800/30 transition-colors">
                                            <td className="px-3 py-2.5 font-semibold text-slate-100">
                                              <span className="flex items-center gap-1.5">
                                                {isGST && (
                                                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-violet-500/20 text-violet-300 border border-violet-500/20">GST</span>
                                                )}
                                                {ledger?.ledgerName || "-"}
                                              </span>
                                            </td>
                                            <td className={`px-3 py-2.5 text-right font-bold font-mono ${Number(ledger?.amount ?? 0) < 0 ? "text-rose-400" : "text-emerald-400"}`}>
                                              {formatCurrency(Number(ledger?.amount ?? 0))}
                                            </td>
                                            <td className="px-3 py-2.5 text-center">
                                              {isParty
                                                ? <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 text-[10px] font-semibold">Yes</span>
                                                : <span className="text-slate-500 text-[10px]">No</span>}
                                            </td>
                                            <td className="px-3 py-2.5 text-center">
                                              {isGST
                                                ? <span className="px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-300 border border-violet-500/20 text-[10px] font-semibold">Yes</span>
                                                : <span className="text-slate-500 text-[10px]">No</span>}
                                            </td>
                                            <td className="px-3 py-2.5 text-center">
                                              {bills.length > 0
                                                ? <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/20 text-[10px] font-semibold">{bills.length}</span>
                                                : <span className="text-slate-600 text-[10px]">-</span>}
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
                                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-violet-500/10 border border-violet-500/20">
                                  <Hash size={13} className="text-violet-400" />
                                  <span className="text-xs font-bold text-violet-300 uppercase tracking-wide">GST Details</span>
                                  {gst.applicable
                                    ? <span className="ml-1 px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">Applicable</span>
                                    : <span className="ml-1 px-1.5 py-0.5 rounded-full bg-slate-700 text-slate-400 text-[10px] font-bold">Not Applicable</span>}
                                </div>
                              </div>

                              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                                {[
                                  { label: "CGST",       value: gst.cgst,      color: "text-blue-300"   },
                                  { label: "SGST",       value: gst.sgst,      color: "text-cyan-300"   },
                                  { label: "IGST",       value: gst.igst,      color: "text-purple-300" },
                                  { label: "Cess",       value: gst.cess,      color: "text-orange-300" },
                                  { label: "State Cess", value: gst.stateCess, color: "text-pink-300"   },
                                  { label: "Total GST",  value: totalGST,      color: "text-violet-300", highlight: true }
                                ].map(({ label, value, color, highlight }) => (
                                  <div
                                    key={label}
                                    className={`rounded-lg px-3 py-2.5 border ${highlight ? "bg-violet-500/10 border-violet-500/30" : "bg-slate-800/60 border-slate-700/50"}`}
                                  >
                                    <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-0.5">{label}</p>
                                    <p className={`text-xs font-bold font-mono ${value > 0 ? color : "text-slate-500"}`}>
                                      {formatCurrency(value)}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* SECTION 4 — Summary Footer */}
                            <div className="grid grid-cols-3 gap-3 pt-1 border-t border-slate-800">
                              <div className="rounded-lg bg-slate-800/40 border border-slate-700/50 p-3 text-center">
                                <p className="text-[10px] text-slate-400 uppercase tracking-wider">Items</p>
                                <p className="text-lg font-bold text-amber-300 mt-0.5">{items.length}</p>
                              </div>
                              <div className="rounded-lg bg-slate-800/40 border border-slate-700/50 p-3 text-center">
                                <p className="text-[10px] text-slate-400 uppercase tracking-wider">Total Qty</p>
                                <p className="text-lg font-bold text-cyan-300 mt-0.5">{totalQty}</p>
                              </div>
                              <div className="rounded-lg bg-slate-800/40 border border-slate-700/50 p-3 text-center">
                                <p className="text-[10px] text-slate-400 uppercase tracking-wider">Ledger Entries</p>
                                <p className="text-lg font-bold text-indigo-300 mt-0.5">{ledgerEntries.length}</p>
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
    </div>
  );
}
