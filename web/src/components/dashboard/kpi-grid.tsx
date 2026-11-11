"use client";

import {
  AlertTriangle,
  Package,
  ShoppingBag,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { StatCard } from "@/components/shared/stat-card";
import { ErrorState } from "@/components/shared/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useDashboardSummary } from "@/hooks/use-dashboard";
import {
  formatChange,
  formatKHR,
  formatNumber,
  formatPercent,
} from "@/lib/utils";

export function DashboardKpis() {
  const summary = useDashboardSummary();

  if (summary.isPending) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="card-surface space-y-4 p-5"
            aria-hidden
          >
            <Skeleton className="size-10 rounded-2xl" />
            <Skeleton className="h-3 w-24 rounded-full" />
            <Skeleton className="h-9 w-32 rounded-xl" />
            <Skeleton className="h-3 w-20 rounded-full" />
          </div>
        ))}
      </div>
    );
  }

  if (summary.isError || !summary.data) {
    return (
      <ErrorState
        title="Summary unavailable"
        message="Today's sales and stock figures could not be loaded."
        onRetry={() => summary.refetch()}
      />
    );
  }

  const data = summary.data;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        label="Today's sales"
        value={formatKHR(data.today.revenue)}
        icon={<Wallet />}
        tone="brand"
        trend={formatChange(data.revenue_change_pct)}
        trendLabel="vs yesterday"
        hint={`${formatNumber(data.today.sales_count)} transactions`}
      />
      <StatCard
        label="Gross profit"
        value={formatKHR(data.today.gross_profit)}
        icon={<TrendingUp />}
        tone="lavender"
        trend={formatChange(data.profit_change_pct)}
        trendLabel="vs yesterday"
        hint={`${formatPercent(data.profit_margin_pct)} margin`}
      />
      <StatCard
        label="Units sold"
        value={formatNumber(data.today.units_sold)}
        icon={<ShoppingBag />}
        tone="blue"
        trend={formatChange(data.units_change_pct)}
        trendLabel="vs yesterday"
        hint={`${formatNumber(data.active_products)} active SKUs`}
      />
      <StatCard
        label="Low-stock items"
        value={formatNumber(data.low_stock_count)}
        icon={<AlertTriangle />}
        tone="warning"
        hint={`${formatNumber(data.out_of_stock_count)} out of stock · ${formatNumber(
          data.active_products,
        )} active`}
        footer={
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#9a6a12]">
            <Package className="size-3.5" />
            Review the alert list before the evening rush
          </span>
        }
      />
    </div>
  );
}
