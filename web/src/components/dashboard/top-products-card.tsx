"use client";

import Link from "next/link";
import { ArrowUpRight, BarChart3, Trophy } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { SectionCard } from "@/components/shared/section-card";
import { Skeleton } from "@/components/ui/skeleton";
import { useTopProducts } from "@/hooks/use-dashboard";
import { formatKHR, formatNumber } from "@/lib/utils";

interface TopProductsCardProps {
  className?: string;
}

export function TopProductsCard({ className }: TopProductsCardProps) {
  const top = useTopProducts(30, 5);
  const products = top.data ?? [];
  const maxRevenue = Math.max(...products.map((product) => product.revenue), 1);

  return (
    <SectionCard
      className={className}
      title="Top products"
      description="By revenue over the last 30 days"
      action={
        <Link
          href="/analytics"
          className="inline-flex items-center gap-0.5 text-[10px] font-bold text-brand-strong hover:underline"
        >
          Analytics
          <ArrowUpRight className="size-3" />
        </Link>
      }
    >
      {top.isPending ? (
        <div className="space-y-4" aria-hidden>
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="space-y-2">
              <div className="flex justify-between gap-2">
                <Skeleton className="h-3 w-32 rounded-full" />
                <Skeleton className="h-3 w-12 rounded-full" />
              </div>
              <Skeleton className="h-2 w-full rounded-full" />
              <Skeleton className="h-2.5 w-20 rounded-full" />
            </div>
          ))}
        </div>
      ) : top.isError ? (
        <ErrorState
          title="Top products unavailable"
          message="Product rankings could not be loaded."
          onRetry={() => top.refetch()}
          className="py-10"
        />
      ) : products.length === 0 ? (
        <EmptyState
          icon={<BarChart3 />}
          title="No product sales yet"
          description="Once items are sold, the best sellers will rank here."
          className="border-0 bg-muted/20 py-10"
        />
      ) : (
        <ol className="space-y-4">
          {products.map((product, index) => (
            <li key={product.product_id}>
              <div className="flex items-center gap-2">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-md bg-mint font-heading text-[9px] font-extrabold text-brand-strong">
                  {index + 1}
                </span>
                <p className="min-w-0 flex-1 truncate text-[12px] font-bold text-ink">
                  {product.name}
                </p>
                <span className="shrink-0 text-[11px] font-bold text-ink">
                  {formatKHR(product.revenue, { compact: true })}
                </span>
              </div>
              <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-brand to-lavender"
                  style={{
                    width: `${Math.max(
                      (product.revenue / maxRevenue) * 100,
                      5,
                    )}%`,
                  }}
                />
              </div>
              <p className="mt-1 flex items-center gap-1.5 text-[10px] text-muted-foreground">
                {index === 0 ? (
                  <Trophy className="size-3 text-warning" aria-hidden />
                ) : null}
                <span>{product.code}</span>
                <span aria-hidden>·</span>
                <span>{formatNumber(product.units_sold)} units</span>
                <span aria-hidden>·</span>
                <span>{formatKHR(product.profit, { compact: true })} profit</span>
              </p>
            </li>
          ))}
        </ol>
      )}
    </SectionCard>
  );
}
