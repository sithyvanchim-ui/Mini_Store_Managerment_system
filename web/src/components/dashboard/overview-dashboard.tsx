"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, RefreshCw } from "lucide-react";
import { DashboardKpis } from "@/components/dashboard/kpi-grid";
import { RecentActivityCard } from "@/components/dashboard/recent-activity-card";
import { RegisterCard } from "@/components/dashboard/register-card";
import { RestockPromo } from "@/components/dashboard/restock-promo";
import { SalesOverviewCard } from "@/components/dashboard/sales-overview-card";
import { StockHealthCard } from "@/components/dashboard/stock-health-card";
import { TopProductsCard } from "@/components/dashboard/top-products-card";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { useDashboardSummary } from "@/hooks/use-dashboard";
import { queryKeys } from "@/lib/query-keys";
import { cn, formatDate } from "@/lib/utils";

export function OverviewDashboard() {
  const queryClient = useQueryClient();
  const summary = useDashboardSummary();
  const [todayLabel, setTodayLabel] = useState("today");

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setTodayLabel(formatDate(new Date(), "EEEE, MMMM d"));
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  function refreshAll() {
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
    queryClient.invalidateQueries({ queryKey: queryKeys.stock.alerts });
    queryClient.invalidateQueries({ queryKey: queryKeys.dailyClose.today });
  }

  return (
    <div>
      <PageHeader
        eyebrow="Dorm fridge · Block C"
        title="Overview"
        description={`Live stock, sales, and ABA totals at a glance — ${todayLabel}.`}
        actions={
          <>
            <Button
              variant="outline"
              className="h-10 rounded-full border-border bg-card px-4 text-xs font-bold shadow-sm"
              onClick={refreshAll}
              disabled={summary.isFetching}
              aria-label="Refresh dashboard data"
            >
              <RefreshCw
                className={cn("size-4", summary.isFetching && "animate-spin")}
              />
              Refresh
            </Button>
            <Button
              asChild
              className="h-10 rounded-full px-4 text-xs font-bold shadow-[0_12px_26px_rgba(15,181,160,0.26)]"
            >
              <Link href="/sales">
                <Plus className="size-4" />
                New sale
              </Link>
            </Button>
          </>
        }
      />

      <div className="mt-6 space-y-4">
        <DashboardKpis />

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <SalesOverviewCard className="lg:col-span-8" />
          <RecentActivityCard className="lg:col-span-4" />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-12">
          <StockHealthCard className="lg:col-span-4" />
          <TopProductsCard className="lg:col-span-4" />
          <RegisterCard className="md:col-span-2 lg:col-span-4" />
        </div>

        <RestockPromo />
      </div>
    </div>
  );
}
