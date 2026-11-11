"use client";

import { useQuery } from "@tanstack/react-query";
import { Printer, ShoppingBag } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type { Sale, Settings } from "@/types/api";
import { Receipt, ReceiptPrintStyles } from "@/components/sales/receipt";

interface ReceiptDialogProps {
  sale: Sale | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loading?: boolean;
  onNewSale?: () => void;
}

export function ReceiptDialog({
  sale,
  open,
  onOpenChange,
  loading = false,
  onNewSale,
}: ReceiptDialogProps) {
  const settingsQuery = useQuery({
    queryKey: queryKeys.settings.all,
    queryFn: () => api.get<Settings>("/api/v1/settings"),
    staleTime: 5 * 60_000,
    retry: false,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] gap-0 overflow-y-auto rounded-[24px] p-0 sm:max-w-md print:static print:max-h-none print:w-full print:max-w-none print:translate-x-0 print:translate-y-0 print:bg-white print:p-0 print:ring-0">
        <ReceiptPrintStyles />
        <div className="no-print flex items-start justify-between gap-4 border-b border-border/70 px-5 py-4 pr-12">
          <DialogHeader className="gap-1 text-left">
            <DialogTitle className="font-heading text-lg font-bold">
              Receipt
            </DialogTitle>
            <DialogDescription className="text-xs">
              {sale
                ? `${sale.reference} · ${sale.status === "voided" ? "Voided" : "Completed"}`
                : "Loading sale details…"}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="px-5 py-4">
          {loading || !sale ? (
            <div className="space-y-3">
              <Skeleton className="mx-auto h-5 w-32 rounded-full" />
              <Skeleton className="h-3 w-full rounded-full" />
              <Skeleton className="h-3 w-4/5 rounded-full" />
              <Skeleton className="h-24 w-full rounded-2xl" />
              <Skeleton className="h-3 w-full rounded-full" />
              <Skeleton className="h-3 w-2/3 rounded-full" />
            </div>
          ) : (
            <Receipt
              sale={sale}
              storeName={settingsQuery.data?.store_name}
              dormName={settingsQuery.data?.dorm_name}
              footer={settingsQuery.data?.receipt_footer}
            />
          )}
        </div>

        <div className="no-print flex flex-col-reverse gap-2 border-t border-border/70 px-5 py-4 sm:flex-row sm:justify-end">
          <Button
            variant="outline"
            className="rounded-full"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
          <Button
            variant="outline"
            className="rounded-full"
            onClick={() => window.print()}
            disabled={!sale}
          >
            <Printer className="size-4" />
            Print
          </Button>
          {onNewSale ? (
            <Button
              className="rounded-full"
              onClick={() => {
                onOpenChange(false);
                onNewSale();
              }}
            >
              <ShoppingBag className="size-4" />
              New sale
            </Button>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
