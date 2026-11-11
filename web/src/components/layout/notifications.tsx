"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Bell, CheckCircle2, AlertTriangle, ArrowUpRight } from "lucide-react";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type { LowStockItem } from "@/types/api";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ProductThumb } from "@/components/shared/product-thumb";
import { StockStatusBadge } from "@/components/shared/status-badge";
import { formatNumber } from "@/lib/utils";

export function Notifications() {
  const { data: alerts = [] } = useQuery({
    queryKey: queryKeys.stock.alerts,
    queryFn: () => api.get<LowStockItem[]>("/api/v1/stock/alerts"),
    staleTime: 60_000,
  });

  const critical = alerts.filter((item) => item.status === "out_of_stock");
  const count = alerts.length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative size-10 rounded-full bg-white/75 text-muted-foreground shadow-[0_8px_24px_rgba(20,60,50,0.04)] hover:bg-white hover:text-ink"
          aria-label={`Notifications${count ? `, ${count} stock alerts` : ""}`}
        >
          <Bell className="size-[18px]" />
          {count > 0 ? (
            <span className="absolute right-1.5 top-1.5 flex min-w-4 items-center justify-center rounded-full bg-warning px-1 text-[9px] font-extrabold text-white">
              {count > 9 ? "9+" : count}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-[340px] rounded-[22px] border-border/80 p-0 shadow-card"
      >
        <div className="flex items-center justify-between border-b border-border/70 px-4 py-3">
          <div>
            <p className="font-heading text-sm font-bold text-ink">Stock alerts</p>
            <p className="text-[11px] text-muted-foreground">
              {count ? `${count} product${count === 1 ? "" : "s"} need attention` : "Everything is stocked"}
            </p>
          </div>
          <span className="rounded-full bg-mint px-2 py-1 text-[10px] font-bold text-brand-strong">
            {critical.length} critical
          </span>
        </div>

        <div className="max-h-[320px] overflow-y-auto p-2 scrollbar-thin">
          {alerts.length === 0 ? (
            <div className="flex flex-col items-center px-4 py-8 text-center">
              <CheckCircle2 className="mb-2 size-8 text-success" />
              <p className="text-sm font-semibold text-ink">All stocked up</p>
              <p className="mt-1 text-xs text-muted-foreground">
                No low-stock items right now.
              </p>
            </div>
          ) : (
            alerts.slice(0, 6).map((item) => (
              <div
                key={item.product_id}
                className="flex items-center gap-3 rounded-xl px-2 py-2.5 hover:bg-muted/60"
              >
                <ProductThumb name={item.name} category={item.category} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-ink">{item.name}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {item.stock_qty} left · threshold {formatNumber(item.threshold)}
                    {item.slot_code ? ` · ${item.slot_code}` : ""}
                  </p>
                </div>
                <StockStatusBadge status={item.status} />
              </div>
            ))
          )}
        </div>

        <div className="border-t border-border/70 p-2">
          <Button asChild variant="ghost" className="h-9 w-full justify-between rounded-xl text-xs">
            <Link href="/stock">
              View stock alerts
              <ArrowUpRight className="size-4" />
            </Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
