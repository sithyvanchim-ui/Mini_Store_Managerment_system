"use client";

import { useMemo, useState } from "react";
import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartSpline, RefreshCw } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { SectionCard } from "@/components/shared/section-card";
import { Skeleton } from "@/components/ui/skeleton";
import { useSalesTrend } from "@/hooks/use-dashboard";
import { cn, formatDate, formatKHR, formatNumber } from "@/lib/utils";

type Range = 7 | 30;

interface SalesOverviewCardProps {
  className?: string;
}

export function SalesOverviewCard({ className }: SalesOverviewCardProps) {
  const [days, setDays] = useState<Range>(7);
  const trend = useSalesTrend(days);
  const points = trend.data ?? [];

  const totals = useMemo(() => {
    if (points.length === 0) {
      return { best: null, average: 0, total: 0, totalUnits: 0 };
    }

    let best = points[0];
    let total = 0;
    let totalUnits = 0;

    for (const point of points) {
      total += point.revenue;
      totalUnits += point.units;
      if (point.revenue > best.revenue) best = point;
    }

    return {
      best,
      average: Math.round(total / points.length),
      total,
      totalUnits,
    };
  }, [points]);

  return (
    <SectionCard
      className={className}
      title="Sales overview"
      description={`Revenue and profit for the last ${days} days`}
      action={
        <div
          role="group"
          aria-label="Sales trend range"
          className="flex rounded-full bg-muted p-1"
        >
          {([7, 30] as const).map((range) => (
            <button
              key={range}
              type="button"
              onClick={() => setDays(range)}
              aria-pressed={days === range}
              className={cn(
                "h-7 rounded-full px-3 text-[11px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                days === range
                  ? "bg-card text-ink shadow-sm"
                  : "text-muted-foreground hover:text-ink",
              )}
            >
              {range} days
            </button>
          ))}
        </div>
      }
    >
      {trend.isPending ? (
        <div className="space-y-4" aria-hidden>
          <Skeleton className="h-4 w-40 rounded-full" />
          <Skeleton className="h-[280px] w-full rounded-2xl" />
          <div className="grid grid-cols-3 gap-3">
            <Skeleton className="h-12 rounded-xl" />
            <Skeleton className="h-12 rounded-xl" />
            <Skeleton className="h-12 rounded-xl" />
          </div>
        </div>
      ) : trend.isError ? (
        <ErrorState
          title="Trend unavailable"
          message="The sales trend could not be loaded."
          onRetry={() => trend.refetch()}
          className="py-10"
        />
      ) : points.length === 0 ? (
        <EmptyState
          icon={<ChartSpline />}
          title="No sales in this window"
          description="Ring up the first sale and the revenue trend will appear here."
          className="border-0 bg-muted/20 py-10"
        />
      ) : (
        <>
          <div className="mb-3 flex flex-wrap items-center gap-4">
            <span className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
              <span className="size-2 rounded-full bg-lavender" />
              Revenue
            </span>
            <span className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
              <span className="size-2 rounded-full bg-brand" />
              Gross profit
            </span>
            <span className="ml-auto text-[11px] font-semibold text-muted-foreground">
              {formatNumber(totals.totalUnits)} units sold
            </span>
          </div>

          <div className="h-[286px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={points}
                margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
              >
                <defs>
                  <linearGradient id="profitMint" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0FB5A0" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#0FB5A0" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="4 4"
                  stroke="#E6EFEC"
                  vertical={false}
                />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: "#7A8B87" }}
                  tickMargin={10}
                  tickFormatter={(value) =>
                    formatDate(String(value), days === 7 ? "EEE" : "MMM d")
                  }
                />
                <YAxis
                  width={62}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 10, fill: "#7A8B87" }}
                  tickFormatter={(value) =>
                    formatKHR(Number(value), { compact: true })
                  }
                />
                <Tooltip
                  cursor={{ fill: "rgba(15, 181, 160, 0.06)" }}
                  contentStyle={{
                    borderRadius: 16,
                    border: "1px solid #E6EFEC",
                    boxShadow: "0 18px 44px rgba(20, 60, 50, 0.12)",
                    fontSize: 12,
                    padding: "10px 12px",
                  }}
                  labelStyle={{
                    fontWeight: 700,
                    color: "#13211F",
                    marginBottom: 4,
                  }}
                  labelFormatter={(label) =>
                    formatDate(String(label), "EEE, MMM d, yyyy")
                  }
                  formatter={(value, name) => [
                    formatKHR(Number(value)),
                    String(name) === "revenue" ? "Revenue" : "Gross profit",
                  ]}
                />
                <Bar
                  dataKey="revenue"
                  name="Revenue"
                  fill="#AAB2F8"
                  radius={[8, 8, 2, 2]}
                  maxBarSize={34}
                />
                <Area
                  type="monotone"
                  dataKey="profit"
                  name="Gross profit"
                  stroke="#0FB5A0"
                  strokeWidth={3}
                  fill="url(#profitMint)"
                  dot={false}
                  activeDot={{
                    r: 4,
                    fill: "#0FB5A0",
                    stroke: "#FFFFFF",
                    strokeWidth: 2,
                  }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-3 border-t border-border/70 pt-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                Best day
              </p>
              <p className="mt-1 font-heading text-sm font-extrabold tracking-tight text-ink">
                {totals.best ? formatDate(totals.best.date, "EEE, MMM d") : "—"}
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {totals.best
                  ? formatKHR(totals.best.revenue, { compact: true })
                  : "—"}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                Avg / day
              </p>
              <p className="mt-1 font-heading text-sm font-extrabold tracking-tight text-ink">
                {formatKHR(totals.average, { compact: true })}
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Per trading day
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                Total
              </p>
              <p className="mt-1 font-heading text-sm font-extrabold tracking-tight text-ink">
                {formatKHR(totals.total, { compact: true })}
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Last {days} days
              </p>
            </div>
          </div>
        </>
      )}

      {trend.isFetching && !trend.isPending ? (
        <span className="mt-2 inline-flex items-center gap-1.5 text-[10px] font-semibold text-muted-foreground">
          <RefreshCw className="size-3 animate-spin" />
          Refreshing trend
        </span>
      ) : null}
    </SectionCard>
  );
}
