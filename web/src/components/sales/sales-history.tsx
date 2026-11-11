"use client";

import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Ban, ReceiptText, Search } from "lucide-react";
import { toast } from "sonner";
import { useMe } from "@/hooks/use-me";
import { useSalesList, useSaleDetail, useVoidSale } from "@/hooks/use-sales";
import { queryKeys } from "@/lib/query-keys";
import { formatDateTime, formatKHR, formatNumber } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DataPagination } from "@/components/shared/data-pagination";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { SaleStatusBadge } from "@/components/shared/status-badge";
import { TableSkeleton } from "@/components/shared/table-skeleton";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { ReceiptDialog } from "@/components/sales/receipt-dialog";
import type { Sale, SaleListParams, SaleStatus } from "@/types/api";

const PAGE_SIZE = 20;

function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

export function SalesHistory() {
  const queryClient = useQueryClient();
  const meQuery = useMe();
  const isAdmin = meQuery.data?.user.role === "admin";

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [status, setStatus] = useState<string>("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);

  const [receiptSale, setReceiptSale] = useState<Sale | null>(null);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [voidTarget, setVoidTarget] = useState<Sale | null>(null);

  const params: SaleListParams = useMemo(
    () => ({
      q: debouncedSearch.trim() || undefined,
      status: status === "all" ? undefined : (status as SaleStatus),
      from: from || undefined,
      to: to || undefined,
      page,
      page_size: PAGE_SIZE,
    }),
    [debouncedSearch, status, from, to, page],
  );

  const salesQuery = useSalesList(params);
  const detailQuery = useSaleDetail(
    receiptSale?.id ?? null,
    Boolean(receiptSale) && !receiptSale?.items?.length,
  );
  const voidSale = useVoidSale();

  const displayedSale = detailQuery.data ?? receiptSale;
  const rows = salesQuery.data?.items ?? [];

  function resetFilters() {
    setSearch("");
    setStatus("all");
    setFrom("");
    setTo("");
    setPage(1);
  }

  function openReceipt(sale: Sale) {
    setReceiptSale(sale);
    setReceiptOpen(true);
  }

  function invalidateSales() {
    void queryClient.invalidateQueries({ queryKey: queryKeys.sales.all });
    void queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
    void queryClient.invalidateQueries({ queryKey: queryKeys.stock.all });
    void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
    void queryClient.invalidateQueries({ queryKey: queryKeys.dailyClose.all });
  }

  return (
    <>
      <div className="space-y-4">
        <div className="card-surface-flat p-4">
          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-12">
            <div className="relative lg:col-span-6">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="Search reference…"
                aria-label="Search sales by reference"
                className="h-10 rounded-xl pl-9"
              />
            </div>

            <Select
              value={status}
              onValueChange={(value) => {
                setStatus(value);
                setPage(1);
              }}
            >
              <SelectTrigger
                className="h-10 w-full rounded-xl lg:col-span-2"
                aria-label="Filter by status"
              >
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="voided">Voided</SelectItem>
              </SelectContent>
            </Select>

            <Input
              type="date"
              value={from}
              onChange={(event) => {
                setFrom(event.target.value);
                setPage(1);
              }}
              aria-label="From date"
              className="h-10 rounded-xl lg:col-span-2"
            />
            <Input
              type="date"
              value={to}
              onChange={(event) => {
                setTo(event.target.value);
                setPage(1);
              }}
              aria-label="To date"
              className="h-10 rounded-xl lg:col-span-2"
            />
          </div>

          <div className="mt-3 flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              {formatNumber(salesQuery.data?.total ?? 0)} sales match these
              filters
            </p>
            <Button
              variant="ghost"
              size="sm"
              className="rounded-full text-xs text-muted-foreground"
              onClick={resetFilters}
            >
              Reset filters
            </Button>
          </div>
        </div>

        <section className="card-surface overflow-hidden">
          {salesQuery.isLoading ? (
            <div className="p-5">
              <TableSkeleton rows={8} columns={8} />
            </div>
          ) : salesQuery.isError ? (
            <div className="p-5">
              <ErrorState
                title="Sales could not be loaded"
                message="Try again in a moment."
                onRetry={() => {
                  void salesQuery.refetch();
                }}
              />
            </div>
          ) : rows.length === 0 ? (
            <div className="p-5">
              <EmptyState
                icon={<ReceiptText />}
                title="No sales found"
                description="Completed sales will appear here. Adjust the filters or start a new sale from the Point of sale tab."
              />
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="pl-5">Reference</TableHead>
                    <TableHead>Date / time</TableHead>
                    <TableHead className="text-right">Items</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Sold by</TableHead>
                    <TableHead className="pr-5 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((sale) => {
                    const itemCount = (sale.items ?? []).reduce(
                      (sum, item) => sum + item.quantity,
                      0,
                    );
                    return (
                      <TableRow key={sale.id}>
                        <TableCell className="pl-5">
                          <p className="font-semibold text-ink">
                            {sale.reference}
                          </p>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDateTime(sale.created_at)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {itemCount > 0 ? formatNumber(itemCount) : "—"}
                        </TableCell>
                        <TableCell className="text-right font-bold text-ink">
                          {formatKHR(sale.total)}
                        </TableCell>
                        <TableCell>
                          <SaleStatusBadge status={sale.status} />
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {sale.sold_by_name}
                        </TableCell>
                        <TableCell className="pr-5">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label={`View receipt for ${sale.reference}`}
                              onClick={() => openReceipt(sale)}
                            >
                              <ReceiptText className="size-4" />
                            </Button>
                            {isAdmin && sale.status === "completed" ? (
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                aria-label={`Void sale ${sale.reference}`}
                                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                                onClick={() => setVoidTarget(sale)}
                              >
                                <Ban className="size-4" />
                              </Button>
                            ) : null}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              <div className="px-5 pb-5">
                <DataPagination
                  page={salesQuery.data?.page ?? page}
                  pageSize={PAGE_SIZE}
                  total={salesQuery.data?.total ?? 0}
                  onPageChange={setPage}
                />
              </div>
            </>
          )}
        </section>
      </div>

      <ReceiptDialog
        sale={displayedSale}
        open={receiptOpen}
        onOpenChange={(open) => {
          setReceiptOpen(open);
          if (!open) setReceiptSale(null);
        }}
        loading={
          Boolean(receiptSale) &&
          !displayedSale?.items?.length &&
          (detailQuery.isLoading || detailQuery.isFetching)
        }
      />

      <ConfirmDialog
        open={Boolean(voidTarget)}
        onOpenChange={(open) => {
          if (!open) setVoidTarget(null);
        }}
        title="Void this sale?"
        description={
          voidTarget
            ? `${voidTarget.reference} for ${formatKHR(voidTarget.total)} will be marked voided. The sold quantities are returned to stock and a void stock movement is recorded. This cannot be undone.`
            : ""
        }
        confirmLabel="Void sale"
        destructive
        loading={voidSale.isPending}
        onConfirm={() => {
          if (!voidTarget) return;
          voidSale.mutate(voidTarget.id, {
            onSuccess: (sale) => {
              toast.success(`Sale ${sale.reference} voided`);
              setVoidTarget(null);
              if (receiptSale?.id === sale.id) {
                setReceiptOpen(false);
                setReceiptSale(null);
              }
              invalidateSales();
            },
            onError: (error) => {
              toast.error(
                error instanceof Error
                  ? error.message
                  : "The sale could not be voided.",
              );
            },
          });
        }}
      />
    </>
  );
}
