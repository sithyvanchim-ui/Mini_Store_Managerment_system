"use client";

import { useMemo, useState } from "react";
import {
  CalendarRange,
  Handshake,
  Plus,
  Search,
  Truck,
  Wallet,
  X,
} from "lucide-react";
import { ApiError } from "@/lib/api";
import { formatKHR, formatNumber, monthKey } from "@/lib/utils";
import type { Purchase, PurchaseListParams } from "@/types/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { SectionCard } from "@/components/shared/section-card";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { TableSkeleton } from "@/components/shared/table-skeleton";
import { DataPagination } from "@/components/shared/data-pagination";
import { PurchaseTable } from "@/components/purchases/purchase-table";
import { PurchaseFormDialog } from "@/components/purchases/purchase-form-dialog";
import { PurchaseDetailDialog } from "@/components/purchases/purchase-detail-dialog";
import {
  PURCHASES_PAGE_SIZE,
  usePurchases,
} from "@/hooks/use-purchases";
import { useAllProducts } from "@/hooks/use-products";
import { useAllSuppliers } from "@/hooks/use-suppliers";

export default function PurchasesPage() {
  const [page, setPage] = useState(1);
  const [supplierId, setSupplierId] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [detailPurchase, setDetailPurchase] = useState<Purchase | null>(null);

  const listParams = useMemo<PurchaseListParams>(() => {
    const params: PurchaseListParams = {
      page,
      page_size: PURCHASES_PAGE_SIZE,
    };
    if (supplierId !== "all") params.supplier_id = supplierId;
    if (from) params.from = from;
    if (to) params.to = to;
    return params;
  }, [page, supplierId, from, to]);

  const purchasesQuery = usePurchases(listParams);
  const suppliersQuery = useAllSuppliers();
  const productsQuery = useAllProducts();

  const filtersActive =
    supplierId !== "all" || from.length > 0 || to.length > 0;

  const clearFilters = () => {
    setSupplierId("all");
    setFrom("");
    setTo("");
    setPage(1);
  };

  const pageItems = purchasesQuery.data?.items ?? [];
  const stats = useMemo(() => {
    const items = purchasesQuery.data?.items ?? [];
    const thisMonth = monthKey();
    const monthItems = items.filter((purchase) =>
      purchase.purchased_at.startsWith(thisMonth),
    );
    return {
      monthCount: monthItems.length,
      units: items.reduce(
        (total, purchase) => total + purchase.total_quantity,
        0,
      ),
      spend: items.reduce(
        (total, purchase) => total + purchase.total_cost,
        0,
      ),
    };
  }, [purchasesQuery.data]);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Restocking"
        title="Purchases"
        description="Supplier deliveries, restock quantities, and the cost of keeping the store full."
        actions={
          <Button
            className="rounded-full bg-brand px-4 text-white hover:bg-brand-strong"
            onClick={() => setFormOpen(true)}
          >
            <Plus className="size-4" />
            New purchase
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {purchasesQuery.isPending ? (
          Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-[150px] rounded-[26px]" />
          ))
        ) : (
          <>
            <StatCard
              label="Purchases this month"
              value={formatNumber(stats.monthCount)}
              icon={<Truck />}
              hint="Current page only"
            />
            <StatCard
              label="Units received"
              value={formatNumber(stats.units)}
              icon={<CalendarRange />}
              tone="lavender"
              hint="Current page only"
            />
            <StatCard
              label="Total spend"
              value={formatKHR(stats.spend, { compact: true })}
              icon={<Wallet />}
              tone="blue"
              hint="Current page only"
            />
            <StatCard
              label="Suppliers"
              value={formatNumber(suppliersQuery.data?.total ?? 0)}
              icon={<Handshake />}
              tone="brand"
              hint="All supplier records"
            />
          </>
        )}
      </div>

      <SectionCard
        title="Purchase ledger"
        description={
          purchasesQuery.data
            ? `${formatNumber(purchasesQuery.data.total)} purchases recorded.`
            : "Filter deliveries by supplier or date."
        }
        bodyClassName="p-4 sm:p-5"
      >
        <div className="mb-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_160px_160px_auto] xl:items-end">
          <div>
            <Label
              htmlFor="purchase-filter-supplier"
              className="sr-only"
            >
              Filter by supplier
            </Label>
            <Select
              value={supplierId}
              onValueChange={(value) => {
                setSupplierId(value);
                setPage(1);
              }}
            >
              <SelectTrigger
                id="purchase-filter-supplier"
                className="h-10 w-full rounded-xl"
              >
                <SelectValue placeholder="All suppliers" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="all">All suppliers</SelectItem>
                {(suppliersQuery.data?.items ?? []).map((supplier) => (
                  <SelectItem key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="purchase-filter-from" className="sr-only">
              From date
            </Label>
            <Input
              id="purchase-filter-from"
              type="date"
              value={from}
              max={to || undefined}
              onChange={(event) => {
                setFrom(event.target.value);
                setPage(1);
              }}
              className="h-10 rounded-xl"
              aria-label="Purchases from date"
            />
          </div>

          <div>
            <Label htmlFor="purchase-filter-to" className="sr-only">
              To date
            </Label>
            <Input
              id="purchase-filter-to"
              type="date"
              value={to}
              min={from || undefined}
              onChange={(event) => {
                setTo(event.target.value);
                setPage(1);
              }}
              className="h-10 rounded-xl"
              aria-label="Purchases to date"
            />
          </div>

          {filtersActive ? (
            <Button
              variant="ghost"
              className="h-10 rounded-full px-3 text-muted-foreground"
              onClick={clearFilters}
            >
              <X className="size-3.5" />
              Clear filters
            </Button>
          ) : (
            <span className="hidden items-center gap-1.5 px-2 pb-2.5 text-xs text-muted-foreground xl:flex">
              <Search className="size-3.5" />
              {formatNumber(pageItems.length)} on this page
            </span>
          )}
        </div>

        {purchasesQuery.isPending ? (
          <TableSkeleton rows={7} columns={7} className="py-2" />
        ) : purchasesQuery.isError ? (
          <ErrorState
            title="Could not load purchases"
            message={
              purchasesQuery.error instanceof ApiError
                ? purchasesQuery.error.detail
                : "The purchase ledger could not be loaded. Check the API and try again."
            }
            onRetry={() => void purchasesQuery.refetch()}
          />
        ) : pageItems.length === 0 ? (
          <EmptyState
            title={filtersActive ? "No purchases match" : "No purchases yet"}
            description={
              filtersActive
                ? "Try a wider date range or a different supplier."
                : "Record your first supplier delivery to start the purchase ledger."
            }
            icon={<Truck />}
            action={
              filtersActive ? (
                <Button
                  variant="outline"
                  className="rounded-full"
                  onClick={clearFilters}
                >
                  Clear filters
                </Button>
              ) : (
                <Button
                  className="rounded-full bg-brand text-white hover:bg-brand-strong"
                  onClick={() => setFormOpen(true)}
                >
                  <Plus className="size-4" />
                  New purchase
                </Button>
              )
            }
          />
        ) : (
          <>
            <PurchaseTable purchases={pageItems} onView={setDetailPurchase} />
            <DataPagination
              className="mt-4"
              page={purchasesQuery.data.page}
              pageSize={purchasesQuery.data.page_size}
              total={purchasesQuery.data.total}
              onPageChange={setPage}
            />
          </>
        )}
      </SectionCard>

      <PurchaseFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        suppliers={suppliersQuery.data?.items ?? []}
        products={productsQuery.data?.items ?? []}
      />

      <PurchaseDetailDialog
        open={Boolean(detailPurchase)}
        onOpenChange={(open) => {
          if (!open) setDetailPurchase(null);
        }}
        purchase={detailPurchase}
      />
    </div>
  );
}
