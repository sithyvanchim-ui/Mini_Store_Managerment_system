"use client";

import { useMemo, useState } from "react";
import { Handshake, Plus, Search, X } from "lucide-react";
import { toast } from "sonner";
import { ApiError } from "@/lib/api";
import { cn, formatNumber } from "@/lib/utils";
import type { Supplier } from "@/types/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { DataPagination } from "@/components/shared/data-pagination";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { SupplierCardGrid } from "@/components/suppliers/supplier-card-grid";
import { SupplierFormDialog } from "@/components/suppliers/supplier-form-dialog";
import {
  SUPPLIERS_PAGE_SIZE,
  useActivateSupplier,
  useDeactivateSupplier,
  useSuppliers,
  type SupplierListParams,
} from "@/hooks/use-suppliers";
import { useDebouncedValue } from "@/hooks/use-products";

type ActiveFilter = "all" | "active" | "inactive";

export default function SuppliersPage() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search);
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>("all");
  const [page, setPage] = useState(1);

  const [formOpen, setFormOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<Supplier | null>(
    null,
  );
  const [deactivateError, setDeactivateError] = useState<string | null>(null);

  const listParams = useMemo<SupplierListParams>(() => {
    const params: SupplierListParams = {
      page,
      page_size: SUPPLIERS_PAGE_SIZE,
    };
    if (debouncedSearch.trim()) params.q = debouncedSearch.trim();
    if (activeFilter !== "all") params.is_active = activeFilter === "active";
    return params;
  }, [page, debouncedSearch, activeFilter]);

  const suppliersQuery = useSuppliers(listParams);
  const deactivateSupplier = useDeactivateSupplier();
  const activateSupplier = useActivateSupplier();

  const filtersActive = search.trim().length > 0 || activeFilter !== "all";

  const clearFilters = () => {
    setSearch("");
    setActiveFilter("all");
    setPage(1);
  };

  const openAdd = () => {
    setEditingSupplier(null);
    setFormOpen(true);
  };

  const openEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setFormOpen(true);
  };

  const requestDeactivate = (supplier: Supplier) => {
    setDeactivateError(null);
    setDeactivateTarget(supplier);
  };

  const confirmDeactivate = () => {
    if (!deactivateTarget) return;
    deactivateSupplier.mutate(deactivateTarget.id, {
      onSuccess: () => {
        toast.success("Supplier deactivated", {
          description: `${deactivateTarget.name} is hidden from new purchases.`,
        });
        setDeactivateTarget(null);
        setDeactivateError(null);
      },
      onError: (error) => {
        const message =
          error instanceof ApiError
            ? error.detail
            : "The supplier could not be deactivated.";
        setDeactivateError(message);
        toast.error("Supplier could not be deactivated", {
          description: message,
        });
      },
    });
  };

  const activate = (supplier: Supplier) => {
    activateSupplier.mutate(supplier.id, {
      onSuccess: () => {
        toast.success("Supplier activated", {
          description: `${supplier.name} can be used for new purchases.`,
        });
      },
      onError: (error) => {
        toast.error("Could not activate supplier", {
          description:
            error instanceof ApiError
              ? error.detail
              : "Please try again in a moment.",
        });
      },
    });
  };

  const suppliers = suppliersQuery.data?.items ?? [];

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Partners"
        title="Suppliers"
        description="The people and wholesalers who keep the dorm store stocked."
        actions={
          <Button
            className="rounded-full bg-brand px-4 text-white hover:bg-brand-strong"
            onClick={openAdd}
          >
            <Plus className="size-4" />
            Add supplier
          </Button>
        }
      />

      <SectionCard
        title="Supplier directory"
        description={
          suppliersQuery.data
            ? `${formatNumber(suppliersQuery.data.total)} suppliers on file.`
            : "Search contacts and manage partner status."
        }
        bodyClassName="p-4 sm:p-5"
      >
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative min-w-0 flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              value={search}
              onChange={(event) => {
                setPage(1);
                setSearch(event.target.value);
              }}
              placeholder="Search suppliers by name or contact…"
              aria-label="Search suppliers"
              className="h-10 rounded-xl pl-9"
            />
          </div>
          <Select
            value={activeFilter}
            onValueChange={(value) => {
              setActiveFilter(value as ActiveFilter);
              setPage(1);
            }}
          >
            <SelectTrigger
              className="h-10 w-full rounded-xl sm:w-40"
              aria-label="Filter by supplier status"
            >
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
          {filtersActive ? (
            <Button
              variant="ghost"
              className="h-10 rounded-full px-3 text-muted-foreground"
              onClick={clearFilters}
            >
              <X className="size-3.5" />
              Clear
            </Button>
          ) : null}
        </div>

        {suppliersQuery.isPending ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton
                key={index}
                className={cn("h-[260px] rounded-[22px]", index % 2 === 0 && "opacity-75")}
              />
            ))}
          </div>
        ) : suppliersQuery.isError ? (
          <ErrorState
            title="Could not load suppliers"
            message={
              suppliersQuery.error instanceof ApiError
                ? suppliersQuery.error.detail
                : "The supplier directory could not be loaded. Check the API and try again."
            }
            onRetry={() => void suppliersQuery.refetch()}
          />
        ) : suppliers.length === 0 ? (
          <EmptyState
            title={filtersActive ? "No suppliers match" : "No suppliers yet"}
            description={
              filtersActive
                ? "Try a different search or clear the status filter."
                : "Add the wholesalers and contacts you restock from."
            }
            icon={<Handshake />}
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
                  onClick={openAdd}
                >
                  <Plus className="size-4" />
                  Add supplier
                </Button>
              )
            }
          />
        ) : (
          <>
            <SupplierCardGrid
              suppliers={suppliers}
              onEdit={openEdit}
              onDeactivate={requestDeactivate}
              onActivate={activate}
            />
            <DataPagination
              className="mt-4"
              page={suppliersQuery.data.page}
              pageSize={suppliersQuery.data.page_size}
              total={suppliersQuery.data.total}
              onPageChange={setPage}
            />
          </>
        )}
      </SectionCard>

      <SupplierFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        supplier={editingSupplier}
      />

      <ConfirmDialog
        open={Boolean(deactivateTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setDeactivateTarget(null);
            setDeactivateError(null);
          }
        }}
        title="Deactivate supplier?"
        description={
          <>
            <span className="font-semibold text-ink">
              {deactivateTarget?.name}
            </span>{" "}
            will be marked inactive and hidden from new purchase forms. Existing
            purchase records are preserved, and you can reactivate the supplier
            at any time.
            {deactivateError ? (
              <span className="mt-2 block rounded-lg bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">
                {deactivateError}
              </span>
            ) : null}
          </>
        }
        confirmLabel="Deactivate"
        destructive
        loading={deactivateSupplier.isPending}
        onConfirm={confirmDeactivate}
      />
    </div>
  );
}
