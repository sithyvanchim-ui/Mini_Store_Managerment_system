"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateTime, formatKHR, formatNumber } from "@/lib/utils";
import type { Purchase } from "@/types/api";

interface PurchaseDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  purchase: Purchase | null;
}

export function PurchaseDetailDialog({
  open,
  onOpenChange,
  purchase,
}: PurchaseDetailDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-[24px] sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl font-bold text-ink">
            Purchase{" "}
            <span className="font-mono text-base text-brand-strong">
              {purchase?.reference ?? ""}
            </span>
          </DialogTitle>
          <DialogDescription>
            {purchase
              ? `${purchase.supplier?.name ?? "Unknown supplier"} · ${formatDateTime(
                  purchase.purchased_at,
                )} · recorded by ${purchase.created_by_name}`
              : "Purchase details"}
          </DialogDescription>
        </DialogHeader>

        {purchase ? (
          <div className="space-y-4">
            <div className="grid gap-2 rounded-2xl border border-border bg-mint/40 px-4 py-3 sm:grid-cols-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Items
                </p>
                <p className="mt-0.5 text-sm font-bold tabular-nums text-ink">
                  {formatNumber(purchase.items?.length ?? 0)}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Total quantity
                </p>
                <p className="mt-0.5 text-sm font-bold tabular-nums text-ink">
                  {formatNumber(purchase.total_quantity)}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Total cost
                </p>
                <p className="mt-0.5 text-sm font-bold tabular-nums text-brand-strong">
                  {formatKHR(purchase.total_cost)}
                </p>
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-border">
              <Table className="min-w-[560px]">
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="pl-3">Product</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Unit cost</TableHead>
                    <TableHead className="pr-3 text-right">Line total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(purchase.items ?? []).map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="pl-3">
                        <p className="font-semibold text-ink">
                          {item.product_name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {item.product_code}
                        </p>
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-ink">
                        {formatNumber(item.quantity)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {formatKHR(item.unit_cost)}
                      </TableCell>
                      <TableCell className="pr-3 text-right font-semibold tabular-nums text-ink">
                        {formatKHR(item.line_total)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow className="hover:bg-transparent">
                    <TableCell className="pl-3 font-bold text-ink" colSpan={3}>
                      Total
                    </TableCell>
                    <TableCell className="pr-3 text-right font-bold tabular-nums text-brand-strong">
                      {formatKHR(purchase.total_cost)}
                    </TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </div>

            {purchase.notes ? (
              <div className="rounded-2xl border border-border bg-muted/20 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Notes
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-ink">
                  {purchase.notes}
                </p>
              </div>
            ) : null}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
