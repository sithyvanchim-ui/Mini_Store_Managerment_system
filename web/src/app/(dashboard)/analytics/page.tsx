"use client";

import { useMemo, useState } from "react";
import {
  BarChart3,
  CalendarRange,
  Coins,
  PiggyBank,
  ShoppingBag,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { StatCard } from "@/components/shared/stat-card";
import { ErrorState } from "@/components/shared/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SalesReportChart } from "@/components/analytics/sales-report-chart";
import { StaffPerformanceTable } from "@/components/analytics/staff-performance-table";
import {
  StockCategoryDonut,
  StockTopProducts,
} from "@/components/stock/stock-charts";
import {
  useAnalyticsCategoryMix,
  useAnalyticsTopProducts,
  useSalesReport,
  useStaffPerformance,
} from "@/hooks/use-analytics";
import { ApiError } from "@/lib/api";
import { cn, formatKHR, formatNumber, formatPercent } from "@/lib/utils";

const PRESETS = [7, 30, 90];

function isoDaysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - (days - 1));
  return date.toISOString().slice(0, 10);
}

function isIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export default function AnalyticsPage() {
  const [range, setRange] = useState(() => ({
    from: isoDaysAgo(30),
    to: new Date().toISOString().slice(0, 10),
  }));
  const [activePreset, setActivePreset] = useState<number | null>(30);

  const applyPreset = (days: number) => {
    setActivePreset(days);
    setRange({ from: isoDaysAgo(days), to: new Date().toISOString().slice(0, 10) });
  };

  const applyCustom = (from: string, to: string) => {
    if (!isIsoDate(from) || !isIsoDate(to)) return;
    setActivePreset(null);
    setRange({ from, to });
  };

  const spanDays = useMemo(() => {
    const from = new Date(`${range.from}T00:00:00`).getTime();
    const to = new Date(`${range.to}T00:00:00`).getTime();
    if (Number.isNaN(from) || Number.isNaN(to) || to < from) return 30;
    return Math.min(Math.round((to - from) / 86_400_000) + 1, 90);
  }, [range.from, range.to]);

  const reportQuery = useSalesReport(range.from, range.to);
  const staffQuery = useStaffPerformance(range.from, range.to);
  const topQuery = useAnalyticsTopProducts(spanDays, 5);
  const categoryQuery = useAnalyticsCategoryMix(spanDays);

  const totals = useMemo(() => {
    const points = reportQuery.data ?? [];
    return points.reduce(
      (acc, point) => ({
        revenue: acc.revenue + point.revenue,
        profit: acc.profit + point.profit,
        units: acc.units + point.units,
        sales: acc.sales + point.sales,
      }),
      { revenue: 0, profit: 0, units: 0, sales: 0 },
    );
  }, [reportQuery.data]);

  const loading = reportQuery.isPending || staffQuery.isPending;
  const hasError = reportQuery.isError || staffQuery.isError;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Numbers"
        title="Analytics"
        description="Revenue, profit, and who moved the most stock — all from completed sales."
      />

      <SectionCard
        title="Reporting period"
        description={
          range.from && range.to
            ? `${range.from} → ${range.to}`
            : "Choose a window for every report below."
        }
        bodyClassName="p-4 sm:p-5"
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            {PRESETS.map((days) => (
              <Button
                key={days}
                variant={activePreset === days ? "default" : "outline"}
                size="sm"
                className={cn(
                  "rounded-full px-4 text-xs font-bold",
                  activePreset === days &&
                    "bg-brand text-white hover:bg-brand-strong",
                  activePreset !== days && "text-muted-foreground",
                )}
                onClick={() => applyPreset(days)}
              >
                Last {days} days
              </Button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={range.from}
              max={range.to}
              aria-label="From date"
              className="h-10 w-auto rounded-xl text-xs"
              onChange={(event) =>
                applyCustom(event.target.value, range.to)
              }
            />
            <span className="text-xs text-muted-foreground">→</span>
            <Input
              type="date"
              value={range.to}
              min={range.from}
              max={new Date().toISOString().slice(0, 10)}
              aria-label="To date"
              className="h-10 w-auto rounded-xl text-xs"
              onChange={(event) =>
                applyCustom(range.from, event.target.value)
              }
            />
          </div>
        </div>
      </SectionCard>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton
              key={index}
              className={cn("h-[180px] rounded-[22px]", index % 2 === 0 && "opacity-75")}
            />
          ))}
        </div>
      ) : hasError ? (
        <SectionCard>
          <ErrorState
            title="Reports could not be loaded"
            message={
              reportQuery.error instanceof ApiError
                ? reportQuery.error.detail
                : "One of the report endpoints is unavailable. Check the API and retry."
            }
            onRetry={() => {
              void reportQuery.refetch();
              void staffQuery.refetch();
            }}
          />
        </SectionCard>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Revenue"
              value={formatKHR(totals.revenue, { compact: true })}
              icon={<Coins />}
              tone="brand"
              hint={`${formatNumber(totals.sales)} completed sales`}
            />
            <StatCard
              label="Gross profit"
              value={formatKHR(totals.profit, { compact: true })}
              icon={<PiggyBank />}
              tone="lavender"
              hint={
                totals.revenue > 0
                  ? `Margin ${formatPercent((totals.profit / totals.revenue) * 100)}`
                  : undefined
              }
            />
            <StatCard
              label="Units sold"
              value={formatNumber(totals.units)}
              icon={<ShoppingBag />}
              tone="blue"
              hint="Items leaving the fridge and shelf"
            />
            <StatCard
              label="Best day revenue"
              value={formatKHR(
                Math.max(0, ...(reportQuery.data ?? []).map((point) => point.revenue)),
                { compact: true },
              )}
              icon={<BarChart3 />}
              tone="warning"
              hint={`${formatNumber((reportQuery.data ?? []).length)} days in range`}
            />
          </div>

          <SectionCard
            title="Revenue & profit"
            description="Daily bars show revenue; the line tracks gross profit."
            action={<CalendarRange className="size-4 text-brand" />}
          >
            <SalesReportChart data={reportQuery.data ?? []} />
          </SectionCard>

          <SectionCard
            title="Staff performance"
            description="Revenue per counter during the range."
            bodyClassName="p-4 sm:p-5"
          >
            <StaffPerformanceTable data={staffQuery.data ?? []} />
          </SectionCard>

          <div className="grid gap-4 xl:grid-cols-5">
            <SectionCard
              title="Category mix"
              description="Revenue share by product group."
              className="xl:col-span-3"
            >
              <StockCategoryDonut data={categoryQuery.data ?? []} />
            </SectionCard>
            <SectionCard
              title="Top products"
              description="Highest movers across the window."
              className="xl:col-span-2"
            >
              <StockTopProducts data={topQuery.data ?? []} />
            </SectionCard>
          </div>
        </>
      )}
    </div>
  );
}
