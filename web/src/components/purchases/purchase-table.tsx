"use client";

import { Eye } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { formatDateTime, formatKHR, formatNumber } from "@/lib/utils";
import type { Purchase } from "@/types/api";

interface PurchaseTableProps {
  purchases: Purchase[];
  onView: (purchase: Purchase) => void;
}

export function PurchaseTable({ purchases, onView }: PurchaseTableProps) {
  return (
    <Table className="min-w-[980px]">
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className="pl-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Reference
          </TableHead>
          <TableHead className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Supplier
          </TableHead>
          <TableHead className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Purchased at
          </TableHead>
          <TableHead className="text-right text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Items
          </TableHead>
          <TableHead className="text-right text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Total qty
          </TableHead>
          <TableHead className="text-right text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Total cost
          </TableHead>
          <TableHead className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Created by
          </TableHead>
          <TableHead className="w-20 pr-1 text-right text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            <span className="sr-only">Actions</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {purchases.map((purchase) => (
          <TableRow key={purchase.id}>
            <TableCell className="pl-1">
              <button
                type="button"
                className="font-mono text-xs font-semibold text-brand-strong underline-offset-4 hover:underline"
                onClick={() => onView(purchase)}
              >
                {purchase.reference}
              </button>
            </TableCell>
            <TableCell className="font-semibold text-ink">
              {purchase.supplier?.name ?? "Unknown supplier"}
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {formatDateTime(purchase.purchased_at)}
            </TableCell>
            <TableCell className="text-right tabular-nums text-ink">
              {formatNumber(purchase.items?.length ?? 0)}
            </TableCell>
            <TableCell className="text-right font-semibold tabular-nums text-ink">
              {formatNumber(purchase.total_quantity)}
            </TableCell>
            <TableCell className="text-right font-semibold tabular-nums text-brand-strong">
              {formatKHR(purchase.total_cost)}
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {purchase.created_by_name}
            </TableCell>
            <TableCell className="pr-1 text-right">
              <Button
                variant="outline"
                size="sm"
                className="rounded-full"
                onClick={() => onView(purchase)}
                aria-label={`View purchase ${purchase.reference}`}
              >
                <Eye className="size-3.5" />
                View
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
