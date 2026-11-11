"use client";

import { useState } from "react";
import {
  AlertTriangle,
  Boxes,
  CalendarDays,
  Package,
  ShoppingBag,
  TrendingUp,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { StatCard } from "@/components/shared/stat-card";
import { ErrorState } from "@/components/shared/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StockAlerts } from "@/components/stock/stock-alerts";
import { StockProductTable } from "@/components/stock/stock-product-table";
import { StockMovements } from "@/components/stock/stock-movements";
import { StockMonthly } from "@/components/stock/stock-monthly";
import {
  StockCategoryDonut,
  StockTopProducts,
} from "@/components/stock/stock-charts";
import { useStockSummary } from "@/hooks/use-stock";
import { ApiError } from "@/lib/api";
import { cn, formatNumber, monthKey } from "@/lib/utils";

const MONTH_LOOKBACK = 6;

function monthOptions(count = MONTH_LOOKBACK): Array<{ value: string; label: string }> {
  const options: Array<{ value: string; label: string }> = [];
  const now = new Date();
  for (let offset = 0; offset < count; offset += 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    const value = date.toISOString().slice(0, 7);
    const label = date.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
    options.push({ value, label });
  }
  return options;
}

export default function StockPage() {
  const [month, setMonth] = useState(() => monthKey());

  const summaryQuery = useStockSummary(month);
  const summary = summaryQuery.data;
  const options = monthOptions();

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Fridge health"
        title="Stock"
        description="Where every unit stands this month — quantities, movement history, and what is running low."
        actions={
          <div className="flex items-center gap-2">
            <CalendarDays className="size-4 text-muted-foreground" />
            <Select value={month} onValueChange={setMonth}>
              <SelectTrigger
                className="h-10 w-[190px] rounded-xl"
                aria-label="Select month"
              >
                <SelectValue placeholder="Select month" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {options.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        }
      />

      {summaryQuery.isPending ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton
              key={index}
              className={cn("h-[180px] rounded-[22px]", index % 2 === 0 && "opacity-75")}
            />
          ))}
        </div>
      ) : summaryQuery.isError ? (
        <SectionCard>
          <ErrorState
            title="Stock position could not be loaded"
            message={
              summaryQuery.error instanceof ApiError
                ? summaryQuery.error.detail
                : "The monthly stock summary is unavailable right now."
            }
            onRetry={() => void summaryQuery.refetch()}
          />
        </SectionCard>
      ) : summary ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Stock on hand"
              value={formatNumber(summary.total_units)}
              icon={<Boxes />}
              tone="brand"
              hint={`${formatNumber(summary.product_count)} products tracked`}
            />
            <StatCard
              label="Products tracked"
              value={formatNumber(summary.product_count)}
              icon={<Package />}
              tone="blue"
              hint="Across the fridge and shelves"
            />
            <StatCard
              label="Sold this month"
              value={formatNumber(summary.units_sold)}
              icon={<ShoppingBag />}
              tone="lavender"
              hint="Units taken out of stock this month"
            />
            <StatCard
              label="Needs attention"
              value={`${formatNumber(summary.low_stock_count)} low · ${formatNumber(summary.out_of_stock_count)} out`}
              icon={<AlertTriangle />}
              tone={
                summary.out_of_stock_count > 0
                  ? "danger"
                  : summary.low_stock_count > 0
                    ? "warning"
                    : "brand"
              }
              hint={
                summary.low_stock_count + summary.out_of_stock_count === 0
                  ? "Everything is above its threshold"
                  : "Check the alerts below"
              }
            />
          </div>

          <div className="grid gap-4 xl:grid-cols-5">
            <SectionCard
              title="Category mix"
              description="Revenue share by product group this month."
              className="xl:col-span-3"
            >
              <StockCategoryDonut data={summary.category_mix} />
            </SectionCard>
            <SectionCard
              title="Top sellers"
              description="The five fastest movers this month."
              className="xl:col-span-2"
              action={<TrendingUp className="size-4 text-brand" />}
            >
              <StockTopProducts data={summary.top_products} />
            </SectionCard>
          </div>

          <SectionCard
            title="Stock alerts"
            description={
              summary.alerts.length > 0
                ? "Products at or below their low-stock threshold."
                : undefined
            }
            bodyClassName={summary.alerts.length > 0 ? "p-5" : "p-5"}
          >
            <StockAlerts alerts={summary.alerts} />
          </SectionCard>

          <SectionCard
            title="Product performance"
            description="Click a column header to sort the month's results."
            bodyClassName="p-0 sm:p-0"
          >
            <div className="overflow-x-auto">
              <StockProductTable items={summary.items} />
            </div>
          </SectionCard>

          <StockMovements products={summary.items} />
          <StockMonthly />
        </>
      ) : null}
    </div>
  );
}
