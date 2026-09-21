import React from 'react';
import StatCard from '../common/StatCard';
import { formatLakhs } from '../../utils/formatters';
import { IndianRupee, FileCheck, Users, PackageCheck } from 'lucide-react';

export default function KPIOverview({ vouchers = [] }) {
  const totalTurnover = vouchers.reduce((sum, v) => sum + (Number(v.totalAmount) || 0), 0);
  const totalVouchers = vouchers.length;
  const uniqueLedgers = new Set(vouchers.map((v) => v.partyLedgerName).filter(Boolean)).size;

  const stockItemsSet = new Set();
  vouchers.forEach((v) => {
    (v.items || []).forEach((item) => {
      if (item.stockItemName) stockItemsSet.add(item.stockItemName);
    });
  });
  const totalStockItems = stockItemsSet.size;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        title="Total Sales (Turnover)"
        value={formatLakhs(totalTurnover)}
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
