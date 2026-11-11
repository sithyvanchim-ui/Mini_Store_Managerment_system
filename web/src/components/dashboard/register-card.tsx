"use client";

import Link from "next/link";
import {
  ChartSpline,
  ClipboardCheck,
  PackagePlus,
  Smartphone,
} from "lucide-react";
import { ErrorState } from "@/components/shared/error-state";
import { SectionCard } from "@/components/shared/section-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useDashboardSummary, useTodayClose } from "@/hooks/use-dashboard";
import { formatKHR, formatNumber } from "@/lib/utils";

interface RegisterCardProps {
  className?: string;
}

const quickActions = [
  {
    label: "Close the day",
    href: "/daily-check",
    icon: ClipboardCheck,
    className: "bg-mint text-brand-strong",
  },
  {
    label: "Restock",
    href: "/purchases",
    icon: PackagePlus,
    className: "bg-[#EEF0FE] text-[#5B66D9]",
  },
  {
    label: "Analytics",
    href: "/analytics",
    icon: ChartSpline,
    className: "bg-[#EAF5FD] text-[#2E86BD]",
  },
];

export function RegisterCard({ className }: RegisterCardProps) {
  const summary = useDashboardSummary();
  const todayClose = useTodayClose();

  if (summary.isPending) {
    return (
      <SectionCard className={className} title="Today's register">
        <div className="space-y-3" aria-hidden>
          <div className="grid grid-cols-2 gap-2.5">
            <Skeleton className="h-20 rounded-2xl" />
            <Skeleton className="h-20 rounded-2xl" />
          </div>
          <Skeleton className="h-12 w-full rounded-xl" />
          <div className="grid grid-cols-3 gap-2">
            <Skeleton className="h-14 rounded-xl" />
            <Skeleton className="h-14 rounded-xl" />
            <Skeleton className="h-14 rounded-xl" />
          </div>
        </div>
      </SectionCard>
    );
  }

  if (summary.isError || !summary.data) {
    return (
      <SectionCard className={className} title="Today's register">
        <ErrorState
          title="Register unavailable"
          message="Today's ABA sales could not be loaded."
          onRetry={() => summary.refetch()}
          className="py-10"
        />
      </SectionCard>
    );
  }

  const data = summary.data;
  const dayClosed = Boolean(
    todayClose.data?.existing_close ?? data.daily_close_done,
  );

  return (
    <SectionCard
      className={className}
      title="Today's register"
      description="ABA sales collected so far"
      action={
        <StatusBadge
          label={dayClosed ? "Day closed" : "Open"}
          tone={dayClosed ? "success" : "brand"}
        />
      }
    >
      <div className="rounded-2xl border border-border/70 bg-mint/40 p-3">
        <span className="flex size-8 items-center justify-center rounded-xl bg-mint text-brand-strong">
          <Smartphone className="size-4" />
        </span>
        <p className="mt-2.5 text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
          ABA sales
        </p>
        <p className="mt-0.5 font-heading text-lg font-extrabold tracking-tight text-ink">
          {formatKHR(data.aba_total)}
        </p>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl border border-border/70 bg-background/60 px-3.5 py-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
            Total sales
          </p>
          <p className="mt-0.5 font-heading text-xl font-extrabold tracking-tight text-ink">
            {formatKHR(data.today.revenue)}
          </p>
        </div>
        <p className="text-right text-[10px] font-semibold text-muted-foreground">
          {formatNumber(data.today.sales_count)} transactions
          <br />
          {formatNumber(data.today.units_sold)} units
        </p>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.href}
              href={action.href}
              className="flex flex-col items-center gap-1.5 rounded-xl border border-border/70 px-1 py-2.5 text-center transition-colors hover:border-brand/30 hover:bg-mint/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              <span
                className={`flex size-7 items-center justify-center rounded-lg ${action.className}`}
              >
                <Icon className="size-3.5" />
              </span>
              <span className="text-[9px] font-bold leading-tight text-ink">
                {action.label}
              </span>
            </Link>
          );
        })}
      </div>
    </SectionCard>
  );
}
