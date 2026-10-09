import React, { useMemo } from 'react';
import StatCard from '../common/StatCard';
import { formatCurrency } from '../../utils/formatters';
import { getVoucherTurnoverAmount } from '../../services/indexeddb/helpers';
import { IndianRupee, FileCheck, Users, PackageCheck } from 'lucide-react';

export default function KPIOverview({ vouchers = [] }) {
  const { totalTurnover, totalVouchers, uniqueLedgers, totalStockItems } = useMemo(() => {
    let turnover = 0;
    const ledgerSet = new Set();
    const stockItemsSet = new Set();

    const len = vouchers.length;
    for (let i = 0; i < len; i++) {
      const v = vouchers[i];
      turnover += getVoucherTurnoverAmount(v);
      if (v?.partyLedgerName) ledgerSet.add(v.partyLedgerName);
      if (Array.isArray(v?.items)) {
        for (let j = 0; j < v.items.length; j++) {
          const itemName = v.items[j]?.stockItemName;
          if (itemName) stockItemsSet.add(itemName);
        }
      }
    }

    return {
      totalTurnover: turnover,
      totalVouchers: len,
      uniqueLedgers: ledgerSet.size,
      totalStockItems: stockItemsSet.size,
    };
  }, [vouchers]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        title="Total Sales (Turnover)"
        value={formatCurrency(totalTurnover)}
        trend="▲ 12.5%"
        trendLabel="vs last month"
        icon={IndianRupee}
        colorTheme="green"
      />
      <StatCard
        title="Sales Vouchers"
        value={totalVouchers.toString()}
        subtext="Current period"
        icon={FileCheck}
        colorTheme="blue"
      />
      <StatCard
        title="Active Client Ledgers"
        value={uniqueLedgers.toString()}
        subtext="Current Fiscal Year"
        icon={Users}
        colorTheme="blue"
      />
      <StatCard
        title="Stock Line Items"
        value={totalStockItems.toString()}
        subtext="Active inventory"
        icon={PackageCheck}
        colorTheme="blue"
      />
    </div>
  );
}
