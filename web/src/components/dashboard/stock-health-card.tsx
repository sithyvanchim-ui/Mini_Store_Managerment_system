"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  PackageSearch,
} from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { SectionCard } from "@/components/shared/section-card";
import { StockStatusBadge } from "@/components/shared/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useDashboardSummary, useStockAlerts } from "@/hooks/use-dashboard";
import { cn, formatNumber } from "@/lib/utils";

interface StockHealthCardProps {
  className?: string;
}

export function StockHealthCard({ className }: StockHealthCardProps) {
  const summary = useDashboardSummary();
  const alerts = useStockAlerts();

  if (summary.isPending) {
    return (
      <SectionCard className={className} title="Stock health">
        <div className="space-y-5" aria-hidden>
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="space-y-2">
              <div className="flex justify-between">
                <Skeleton className="h-3 w-20 rounded-full" />
                <Skeleton className="h-3 w-10 rounded-full" />
              </div>
              <Skeleton className="h-2 w-full rounded-full" />
            </div>
          ))}
          <Skeleton className="h-24 w-full rounded-2xl" />
        </div>
      </SectionCard>
    );
  }

  if (summary.isError || !summary.data) {
    return (
      <SectionCard className={className} title="Stock health">
        <ErrorState
          title="Stock health unavailable"
          message="The stock counts could not be loaded."
          onRetry={() => summary.refetch()}
          className="py-10"
        />
      </SectionCard>
    );
  }

  const data = summary.data;
  const active = Math.max(data.active_products, 0);
  const low = Math.max(data.low_stock_count, 0);
  const out = Math.max(data.out_of_stock_count, 0);
  const inStock = Math.max(active - low - out, 0);
  const share = (count: number) =>
    active > 0 ? Math.round((count / active) * 100) : 0;

  const bars = [
    {
      label: "In stock",
      count: inStock,
      percent: share(inStock),
      bar: "bg-success",
      text: "text-[#0d7a5b]",
    },
    {
      label: "Low stock",
      count: low,
      percent: share(low),
      bar: "bg-warning",
      text: "text-[#9a6a12]",
    },
    {
      label: "Out of stock",
      count: out,
      percent: share(out),
      bar: "bg-destructive",
      text: "text-destructive",
    },
  ];

  const alertItems = (alerts.data ?? []).slice(0, 4);

  return (
    <SectionCard
      className={className}
      title="Stock health"
      description={`${formatNumber(active)} active SKUs across the fridge and shelves`}
    >
      <div className="space-y-4">
        {bars.map((bar) => (
          <div key={bar.label}>
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold text-ink">
                {bar.label}
              </span>
              <span className="text-[11px] font-semibold text-muted-foreground">
                <span className={cn("font-bold", bar.text)}>
                  {formatNumber(bar.count)}
                </span>{" "}
                · {bar.percent}%
              </span>
            </div>
            <div
              role="progressbar"
              aria-label={`${bar.label} products`}
              aria-valuenow={bar.percent}
              aria-valuemin={0}
              aria-valuemax={100}
              className="h-2 w-full overflow-hidden rounded-full bg-muted"
            >
              <div
                className={cn("h-full rounded-full transition-all", bar.bar)}
                style={{ width: `${Math.max(bar.percent, bar.count > 0 ? 4 : 0)}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-5 border-t border-border/70 pt-4">
        <div className="mb-2.5 flex items-center justify-between gap-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
            Needs attention
          </p>
          <Link
            href="/stock"
            className="inline-flex items-center gap-0.5 text-[10px] font-bold text-brand-strong hover:underline"
          >
            View stock
            <ArrowUpRight className="size-3" />
          </Link>
        </div>

        {alerts.isPending ? (
          <div className="space-y-2" aria-hidden>
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-11 w-full rounded-xl" />
            ))}
          </div>
        ) : alerts.isError ? (
          <div className="rounded-xl border border-destructive/15 bg-destructive/[0.04] px-3 py-2.5 text-[11px] text-destructive">
            Alerts could not be loaded.{" "}
            <button
              type="button"
              onClick={() => alerts.refetch()}
              className="font-bold underline underline-offset-2"
            >
              Retry
            </button>
          </div>
        ) : alertItems.length === 0 ? (
          <EmptyState
            icon={<CheckCircle2 />}
            title="All shelves are healthy"
            description="No low or out-of-stock items right now."
            className="border-0 bg-mint/40 py-6"
          />
        ) : (
          <ul className="space-y-1.5">
            {alertItems.map((alert) => (
              <li key={alert.product_id}>
                <Link
                  href="/stock"
                  className="group flex items-center gap-2.5 rounded-xl border border-border/60 px-2.5 py-2 transition-colors hover:border-brand/25 hover:bg-mint/40"
                >
                  <span
                    className={cn(
                      "flex size-7 shrink-0 items-center justify-center rounded-lg",
                      alert.status === "out_of_stock"
                        ? "bg-destructive/10 text-destructive"
                        : "bg-[#FEF5E5] text-[#B37A16]",
                    )}
                    aria-hidden
                  >
                    {alert.status === "out_of_stock" ? (
                      <PackageSearch className="size-3.5" />
                    ) : (
                      <AlertTriangle className="size-3.5" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[11px] font-bold text-ink">
                      {alert.name}
                    </span>
                    <span className="block truncate text-[9px] text-muted-foreground">
                      {alert.code}
                      {alert.slot_code ? ` · ${alert.slot_code}` : ""} ·{" "}
                      {formatNumber(alert.stock_qty)}/
                      {formatNumber(alert.threshold)}
                    </span>
                  </span>
                  <StockStatusBadge
                    status={alert.status}
                    className="ml-auto h-5 shrink-0 px-2 text-[9px]"
                  />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </SectionCard>
  );
}
