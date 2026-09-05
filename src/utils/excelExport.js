import * as XLSX from 'xlsx';
import { formatReadableDate } from './formatters';

export function exportVouchersToExcel(vouchers, fileName = 'Tally_Sales_Vouchers.xlsx') {
  // 1. Prepare Summary Sheet Data
  const summaryRows = vouchers.map((v, index) => {
    const totalQty = (v.items || []).reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
    return {
      'S.No': index + 1,
      'Date': formatReadableDate(v.date),
      'Voucher No': v.voucherNumber,
      'Party Ledger Name': v.partyLedgerName,
      'Voucher Type': v.voucherTypeName || 'Sales',
      'Master ID': v.masterId ? v.masterId.trim() : '',
      'Total Items': (v.items || []).length,
      'Total Quantity': totalQty,
      'Total Amount (₹)': v.totalAmount || 0,
      'GUID': v.guid || ''
    };
  });

  // 2. Prepare Detailed Line Items Sheet Data
  const itemRows = [];
  vouchers.forEach((v) => {
    if (v.items && v.items.length > 0) {
      v.items.forEach((item, itemIdx) => {
        itemRows.push({
          'Voucher No': v.voucherNumber,
          'Voucher Date': formatReadableDate(v.date),
          'Party Ledger Name': v.partyLedgerName,
          'Item No': itemIdx + 1,
          'Stock Item Name': item.stockItemName,
          'Quantity': item.quantity,
          'Unit': item.quantityUnit,
          'Rate (₹)': item.rate,
          'Rate Unit': item.rateUnit,
          'Amount (₹)': item.amount
        });
      });
    } else {
      itemRows.push({
        'Voucher No': v.voucherNumber,
        'Voucher Date': formatReadableDate(v.date),
        'Party Ledger Name': v.partyLedgerName,
        'Item No': '-',
        'Stock Item Name': 'No Items',
        'Quantity': 0,
        'Unit': '-',
        'Rate (₹)': 0,
        'Rate Unit': '-',
        'Amount (₹)': 0
      });
    }
  });

  // Create Workbook & Worksheets
  const wb = XLSX.utils.book_new();
  
  const summaryWs = XLSX.utils.json_to_sheet(summaryRows);
  const itemsWs = XLSX.utils.json_to_sheet(itemRows);

  // Set column widths for readability
  summaryWs['!cols'] = [
    { wch: 6 },   // S.No
    { wch: 14 },  // Date
    { wch: 14 },  // Voucher No
    { wch: 24 },  // Party Ledger Name
    { wch: 14 },  // Voucher Type
    { wch: 12 },  // Master ID
    { wch: 12 },  // Total Items
    { wch: 14 },  // Total Quantity
    { wch: 18 },  // Total Amount
    { wch: 40 }   // GUID
  ];

  itemsWs['!cols'] = [
    { wch: 14 },  // Voucher No
    { wch: 14 },  // Voucher Date
    { wch: 24 },  // Party Ledger Name
    { wch: 10 },  // Item No
    { wch: 24 },  // Stock Item Name
    { wch: 12 },  // Quantity
    { wch: 10 },  // Unit
    { wch: 14 },  // Rate
    { wch: 12 },  // Rate Unit
    { wch: 16 }   // Amount
  ];

  XLSX.utils.book_append_sheet(wb, summaryWs, 'Sales Vouchers Summary');
  XLSX.utils.book_append_sheet(wb, itemsWs, 'Detailed Line Items');

  // Trigger browser download
  XLSX.writeFile(wb, fileName);
}
