"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Boxes,
  Grid2x2,
  Package,
  Plus,
  Search,
  SlidersHorizontal,
  Wallet,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { ApiError } from "@/lib/api";
import { cn, formatKHR, formatNumber } from "@/lib/utils";
import type {
  Product,
  ProductListParams,
  ProductLocation,
  StockStatus,
} from "@/types/api";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { SectionCard } from "@/components/shared/section-card";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { TableSkeleton } from "@/components/shared/table-skeleton";
import { DataPagination } from "@/components/shared/data-pagination";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { ProductsTable } from "@/components/inventory/products-table";
import { ProductFormDialog } from "@/components/inventory/product-form-dialog";
import { AdjustStockDialog } from "@/components/inventory/adjust-stock-dialog";
import { FridgeMap } from "@/components/inventory/fridge-map";
import {
  PRODUCTS_PAGE_SIZE,
  useAllProducts,
  useCategories,
  useDebouncedValue,
  useProducts,
  useSetProductActive,
} from "@/hooks/use-products";

type TabValue = "products" | "fridge";

export default function InventoryPage() {
  const [tab, setTab] = useState<TabValue>("products");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search);
  const [categoryId, setCategoryId] = useState("all");
  const [status, setStatus] = useState<StockStatus | "all">("all");
  const [location, setLocation] = useState<ProductLocation | "all">("all");
  const [page, setPage] = useState(1);

  const [formOpen, setFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [adjustProduct, setAdjustProduct] = useState<Product | null>(null);
  const [deactivateProduct, setDeactivateProduct] = useState<Product | null>(
    null,
  );

  const listParams = useMemo<ProductListParams>(() => {
    const params: ProductListParams = {
      page,
      page_size: PRODUCTS_PAGE_SIZE,
      sort: "name",
    };
    if (debouncedSearch.trim()) params.q = debouncedSearch.trim();
    if (categoryId !== "all") params.category_id = categoryId;
    if (status !== "all") params.status = status;
    if (location !== "all") params.location = location;
    return params;
  }, [page, debouncedSearch, categoryId, status, location]);

  const productsQuery = useProducts(listParams);
  const categoriesQuery = useCategories();
  const allProductsQuery = useAllProducts();
  const setActive = useSetProductActive();

  const filtersActive =
    search.trim().length > 0 ||
    categoryId !== "all" ||
    status !== "all" ||
    location !== "all";

  const clearFilters = () => {
    setSearch("");
    setCategoryId("all");
    setStatus("all");
    setLocation("all");
    setPage(1);
  };

  const stats = useMemo(() => {
    const active = (allProductsQuery.data?.items ?? []).filter(
      (product) => product.is_active,
    );
    return {
      activeCount: active.length,
      totalUnits: active.reduce(
        (total, product) => total + product.stock_qty,
        0,
      ),
      inventoryValue: active.reduce(
        (total, product) => total + product.cost_price * product.stock_qty,
        0,
      ),
      lowCount: active.filter((product) => product.stock_status === "low_stock")
        .length,
      outCount: active.filter(
        (product) => product.stock_status === "out_of_stock",
      ).length,
    };
  }, [allProductsQuery.data]);

  const openAdd = () => {
    setEditingProduct(null);
    setFormOpen(true);
  };

  const openEdit = (product: Product) => {
    setEditingProduct(product);
    setFormOpen(true);
  };

  const toggleActive = (product: Product) => {
    if (product.is_active) {
      setDeactivateProduct(product);
      return;
    }

    setActive.mutate(
      { id: product.id, is_active: true },
      {
        onSuccess: () => {
          toast.success("Product activated", {
            description: `${product.name} is available for selling again.`,
          });
        },
        onError: (error) => {
          toast.error("Could not activate product", {
            description:
              error instanceof ApiError
                ? error.detail
                : "Please try again in a moment.",
          });
        },
      },
    );
  };

  const confirmDeactivate = () => {
    if (!deactivateProduct) return;
    setActive.mutate(
      { id: deactivateProduct.id, is_active: false },
      {
        onSuccess: () => {
          toast.success("Product deactivated", {
            description: `${deactivateProduct.name} was hidden from selling.`,
          });
          setDeactivateProduct(null);
        },
        onError: (error) => {
          toast.error("Could not deactivate product", {
            description:
              error instanceof ApiError
                ? error.detail
                : "Please try again in a moment.",
          });
        },
      },
    );
  };

  const allProducts = allProductsQuery.data?.items ?? [];

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Catalogue"
        title="Inventory"
        description="Manage products, pricing, and stock positions across the dorm fridge and shelves."
        actions={
          <>
            <Button
              variant="outline"
              className="rounded-full"
              onClick={() => setTab("fridge")}
            >
              <Grid2x2 className="size-4" />
              Fridge map
            </Button>
            <Button
              className="rounded-full bg-brand px-4 text-white hover:bg-brand-strong"
              onClick={openAdd}
            >
              <Plus className="size-4" />
              Add product
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {allProductsQuery.isPending ? (
          Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-[150px] rounded-[26px]" />
          ))
        ) : (
          <>
            <StatCard
              label="Active products"
              value={formatNumber(stats.activeCount)}
              icon={<Package />}
              hint={
                allProductsQuery.isError
                  ? "Summary unavailable"
                  : `${formatNumber(allProducts.length)} in catalogue`
              }
            />
            <StatCard
              label="Units on hand"
              value={formatNumber(stats.totalUnits)}
              icon={<Boxes />}
              tone="lavender"
              hint="Across active products"
            />
            <StatCard
              label="Inventory value (cost)"
              value={formatKHR(stats.inventoryValue, { compact: true })}
              icon={<Wallet />}
              tone="blue"
              hint="Cost basis of current stock"
            />
            <StatCard
              label="Low / out of stock"
              value={formatNumber(stats.lowCount + stats.outCount)}
              icon={<AlertTriangle />}
              tone={stats.lowCount + stats.outCount > 0 ? "warning" : "brand"}
              hint={`${formatNumber(stats.lowCount)} low · ${formatNumber(
                stats.outCount,
              )} out`}
            />
          </>
        )}
      </div>

      <Tabs
        value={tab}
        onValueChange={(value) => setTab(value as TabValue)}
        className="gap-0"
      >
        <TabsList className="h-10 rounded-full border border-border/70 bg-white/80 p-1">
          <TabsTrigger
            value="products"
            className="h-8 rounded-full px-4 data-[state=active]:bg-mint data-[state=active]:text-brand-strong"
          >
            Products
          </TabsTrigger>
          <TabsTrigger
            value="fridge"
            className="h-8 rounded-full px-4 data-[state=active]:bg-mint data-[state=active]:text-brand-strong"
          >
            Fridge map
          </TabsTrigger>
        </TabsList>

        <TabsContent value="products" className="mt-4">
          <SectionCard
            title="All products"
            description={
              productsQuery.data
                ? `${formatNumber(productsQuery.data.total)} products match the current view.`
                : "Search, filter, and manage the catalogue."
            }
            bodyClassName="p-4 sm:p-5"
          >
            <div className="mb-4 flex flex-col gap-2 xl:flex-row xl:items-center">
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
                  placeholder="Search by name or code…"
                  aria-label="Search products"
                  className="h-10 rounded-xl pl-9"
                />
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:flex">
                <Select
                  value={categoryId}
                  onValueChange={(value) => {
                    setCategoryId(value);
                    setPage(1);
                  }}
                >
                  <SelectTrigger
                    className="h-10 w-full rounded-xl xl:w-44"
                    aria-label="Filter by category"
                  >
                    <SelectValue placeholder="All categories" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="all">All categories</SelectItem>
                    {(categoriesQuery.data ?? []).map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={status}
                  onValueChange={(value) => {
                    setStatus(value as StockStatus | "all");
                    setPage(1);
                  }}
                >
                  <SelectTrigger
                    className="h-10 w-full rounded-xl xl:w-40"
                    aria-label="Filter by stock status"
                  >
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="in_stock">In stock</SelectItem>
                    <SelectItem value="low_stock">Low stock</SelectItem>
                    <SelectItem value="out_of_stock">Out of stock</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={location}
                  onValueChange={(value) => {
                    setLocation(value as ProductLocation | "all");
                    setPage(1);
                  }}
                >
                  <SelectTrigger
                    className="h-10 w-full rounded-xl xl:w-36"
                    aria-label="Filter by location"
                  >
                    <SelectValue placeholder="All locations" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="all">All locations</SelectItem>
                    <SelectItem value="fridge">Fridge</SelectItem>
                    <SelectItem value="shelf">Shelf</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {filtersActive ? (
                <Button
                  variant="ghost"
                  className="h-10 rounded-full px-3 text-muted-foreground"
                  onClick={clearFilters}
                >
                  <X className="size-3.5" />
                  Clear
                </Button>
              ) : (
                <span className="hidden items-center gap-1.5 px-2 text-xs text-muted-foreground xl:flex">
                  <SlidersHorizontal className="size-3.5" />
                  Filters
                </span>
              )}
            </div>

            {productsQuery.isPending ? (
              <TableSkeleton rows={7} columns={9} className="py-2" />
            ) : productsQuery.isError ? (
              <ErrorState
                title="Could not load products"
                message={
                  productsQuery.error instanceof ApiError
                    ? productsQuery.error.detail
                    : "The catalogue could not be loaded. Check the API and try again."
                }
                onRetry={() => void productsQuery.refetch()}
              />
            ) : productsQuery.data.items.length === 0 ? (
              <EmptyState
                title={filtersActive ? "No products match" : "No products yet"}
                description={
                  filtersActive
                    ? "Try a different search term or clear the filters."
                    : "Add your first product to start tracking stock and sales."
                }
                icon={<Package />}
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
                      Add product
                    </Button>
                  )
                }
              />
            ) : (
              <>
                <ProductsTable
                  products={productsQuery.data.items}
                  onEdit={openEdit}
                  onAdjust={setAdjustProduct}
                  onToggleActive={toggleActive}
                />
                <DataPagination
                  className="mt-4"
                  page={productsQuery.data.page}
                  pageSize={productsQuery.data.page_size}
                  total={productsQuery.data.total}
                  onPageChange={setPage}
                />
              </>
            )}
          </SectionCard>
        </TabsContent>

        <TabsContent value="fridge" className="mt-4">
          <SectionCard
            title="Fridge & shelf map"
            description="Stock by slot. Click any slot to adjust its stock."
            bodyClassName="p-4 sm:p-5"
          >
            {allProductsQuery.isPending ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
                {Array.from({ length: 10 }).map((_, index) => (
                  <Skeleton
                    key={index}
                    className={cn("h-32 rounded-2xl", index % 3 === 0 && "opacity-70")}
                  />
                ))}
              </div>
            ) : allProductsQuery.isError ? (
              <ErrorState
                title="Could not load the fridge map"
                message={
                  allProductsQuery.error instanceof ApiError
                    ? allProductsQuery.error.detail
                    : "The product list could not be loaded."
                }
                onRetry={() => void allProductsQuery.refetch()}
              />
            ) : allProducts.length === 0 ? (
              <EmptyState
                title="Nothing in the fridge yet"
                description="Add products with a location and slot code to populate the map."
                icon={<Grid2x2 />}
                action={
                  <Button
                    className="rounded-full bg-brand text-white hover:bg-brand-strong"
                    onClick={openAdd}
                  >
                    <Plus className="size-4" />
                    Add product
                  </Button>
                }
              />
            ) : (
              <FridgeMap
                products={allProducts}
                onSelectProduct={setAdjustProduct}
              />
            )}
          </SectionCard>
        </TabsContent>
      </Tabs>

      <ProductFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        product={editingProduct}
        categories={categoriesQuery.data ?? []}
      />

      <AdjustStockDialog
        open={Boolean(adjustProduct)}
        onOpenChange={(open) => {
          if (!open) setAdjustProduct(null);
        }}
        product={adjustProduct}
      />

      <ConfirmDialog
        open={Boolean(deactivateProduct)}
        onOpenChange={(open) => {
          if (!open) setDeactivateProduct(null);
        }}
        title="Deactivate product?"
        description={
          <>
            <span className="font-semibold text-ink">
              {deactivateProduct?.name}
            </span>{" "}
            will be hidden from selling. Its stock, sale, and purchase history
            stay intact, and you can reactivate it at any time.
          </>
        }
        confirmLabel="Deactivate"
        destructive
        loading={setActive.isPending}
        onConfirm={confirmDeactivate}
      />
    </div>
  );
}
