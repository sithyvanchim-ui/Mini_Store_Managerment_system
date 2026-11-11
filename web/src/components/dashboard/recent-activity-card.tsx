"use client";

import type { LucideIcon } from "lucide-react";
import {
  Activity,
  Ban,
  PackagePlus,
  ShoppingCart,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { SectionCard } from "@/components/shared/section-card";
import { Skeleton } from "@/components/ui/skeleton";
import { useRecentActivity } from "@/hooks/use-dashboard";
import { cn, relativeTime } from "@/lib/utils";

const activityStyles: Record<
  string,
  { icon: LucideIcon; className: string; label: string }
> = {
  sale: {
    icon: ShoppingCart,
    className: "bg-mint text-brand-strong",
    label: "Sale",
  },
  restock: {
    icon: PackagePlus,
    className: "bg-[#EEF0FE] text-[#5B66D9]",
    label: "Restock",
  },
  void: {
    icon: Ban,
    className: "bg-destructive/10 text-destructive",
    label: "Void",
  },
  adjustment: {
    icon: SlidersHorizontal,
    className: "bg-[#FEF5E5] text-[#B37A16]",
    label: "Adjustment",
  },
  waste: {
    icon: Trash2,
    className: "bg-destructive/10 text-destructive",
    label: "Waste",
  },
};

interface RecentActivityCardProps {
  className?: string;
}

export function RecentActivityCard({ className }: RecentActivityCardProps) {
  const activity = useRecentActivity(8);
  const items = activity.data ?? [];

  return (
    <SectionCard
      className={className}
      title="Recent activity"
      description="Stock and sales events as they happen"
    >
      {activity.isPending ? (
        <div className="space-y-4" aria-hidden>
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="flex items-start gap-3">
              <Skeleton className="size-9 shrink-0 rounded-xl" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3 w-full rounded-full" />
                <Skeleton className="h-2.5 w-24 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      ) : activity.isError ? (
        <ErrorState
          title="Activity unavailable"
          message="The recent activity feed could not be loaded."
          onRetry={() => activity.refetch()}
          className="py-10"
        />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<Activity />}
          title="Nothing yet today"
          description="Sales, restocks, and adjustments will appear here as the store moves."
          className="border-0 bg-muted/20 py-10"
        />
      ) : (
        <ol className="-mx-1 max-h-[392px] overflow-y-auto scrollbar-thin px-1">
          {items.map((item) => {
            const style = activityStyles[item.type] ?? {
              icon: Activity,
              className: "bg-muted text-muted-foreground",
              label: "Update",
            };
            const Icon = style.icon;

            return (
              <li
                key={item.id}
                className="flex items-start gap-3 border-b border-border/60 py-3 last:border-0 first:pt-0"
              >
                <span
                  className={cn(
                    "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl [&_svg]:size-4",
                    style.className,
                  )}
                  aria-hidden
                >
                  <Icon />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-semibold leading-5 text-ink">
                    {item.message}
                  </p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground">
                    <span className="font-semibold text-brand-strong">
                      {style.label}
                    </span>
                    <span aria-hidden>·</span>
                    <span>{item.actor}</span>
                    <span aria-hidden>·</span>
                    <time dateTime={item.created_at}>
                      {relativeTime(item.created_at)}
                    </time>
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </SectionCard>
  );
}
