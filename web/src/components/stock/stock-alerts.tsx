"use client";

import Link from "next/link";
import { ArrowUpRight, ShieldCheck } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { StockStatusBadge } from "@/components/shared/status-badge";
import { formatNumber } from "@/lib/utils";
import type { LowStockItem } from "@/types/api";

interface StockAlertsProps {
  alerts: LowStockItem[];
}

export function StockAlerts({ alerts }: StockAlertsProps) {
  if (alerts.length === 0) {
    return (
      <EmptyState
        icon={<ShieldCheck />}
        title="All products are healthy"
        description="No products are below their low-stock threshold right now."
        className="py-8"
      />
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className="pl-0">Product</TableHead>
          <TableHead>Slot</TableHead>
          <TableHead className="text-right">Stock</TableHead>
          <TableHead className="text-right">Threshold</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="pr-0 text-right">Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {alerts.map((alert) => (
          <TableRow key={alert.product_id}>
            <TableCell className="pl-0">
              <p className="text-xs font-bold text-ink">{alert.name}</p>
              <p className="text-[10px] text-muted-foreground">
                {alert.code}
                {alert.category ? ` · ${alert.category}` : ""}
              </p>
            </TableCell>
            <TableCell className="text-xs text-muted-foreground">
              {alert.slot_code ?? "—"}
            </TableCell>
            <TableCell className="text-right text-xs font-bold tabular-nums text-ink">
              {formatNumber(alert.stock_qty)}
            </TableCell>
            <TableCell className="text-right text-xs tabular-nums text-muted-foreground">
              {formatNumber(alert.threshold)}
            </TableCell>
            <TableCell>
              <StockStatusBadge status={alert.status} />
            </TableCell>
            <TableCell className="pr-0 text-right">
              <Button
                asChild
                variant="outline"
                size="sm"
                className="rounded-full text-[11px]"
              >
                <Link href="/inventory">
                  Adjust
                  <ArrowUpRight className="size-3.5" />
                </Link>
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
