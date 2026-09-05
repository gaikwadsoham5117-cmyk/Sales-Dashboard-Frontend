import React from 'react';
import StatCard from '../common/StatCard';
import { formatLakhs, formatCurrency } from '../../utils/formatters';
import { IndianRupee, FileCheck, Users, PackageCheck } from 'lucide-react';

export default function KPIOverview({ vouchers = [] }) {
  // Calculate dynamic metrics from vouchers data
  const totalTurnover = vouchers.reduce((sum, v) => sum + (Number(v.totalAmount) || 0), 0);
  const totalVouchers = vouchers.length;

  // Unique Party Ledgers count
  const uniqueLedgers = new Set(vouchers.map((v) => v.partyLedgerName).filter(Boolean)).size;

  // Unique Stock Line Items count
  const stockItemsSet = new Set();
  vouchers.forEach((v) => {
    (v.items || []).forEach((item) => {
      if (item.stockItemName) {
        stockItemsSet.add(item.stockItemName);
      }
    });
  });
  const totalStockItems = stockItemsSet.size;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Total Sales (Turnover) */}
      <StatCard
        title="Total Sales (Turnover)"
        value={formatLakhs(totalTurnover)}
        trend="▲ 12.5%"
        trendLabel="vs last month"
        icon={IndianRupee}
        colorTheme="emerald"
      />

      {/* 2. Sales Vouchers Count */}
      <StatCard
        title="Sales Vouchers"
        value={totalVouchers.toString()}
        subtext="Generated in current period"
        icon={FileCheck}
        colorTheme="blue"
      />

      {/* 3. Active Client Ledgers */}
      <StatCard
        title="Active Client Ledgers"
        value={uniqueLedgers.toString()}
        subtext="Current Fiscal Year"
        icon={Users}
        colorTheme="purple"
      />

      {/* 4. Stock Line Items */}
      <StatCard
        title="Stock Line Items"
        value={totalStockItems.toString()}
        subtext="Active inventory catalog"
        icon={PackageCheck}
        colorTheme="amber"
      />
    </div>
  );
}
