"use client";

import { useEffect, useMemo, useState } from "react";
import { PackageSearch, Search } from "lucide-react";
import { ProductThumb } from "@/components/shared/product-thumb";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { StockStatusBadge } from "@/components/shared/status-badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, formatKHR } from "@/lib/utils";
import type { Category, Product } from "@/types/api";

interface PosCatalogueProps {
  products: Product[] | undefined;
  categories: Category[] | undefined;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  inStockOnly: boolean;
  onInStockOnlyChange: (value: boolean) => void;
  cartQuantities: Record<string, number>;
  onAdd: (product: Product) => void;
}

function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

export function PosCatalogue({
  products,
  categories,
  isLoading,
  isError,
  onRetry,
  inStockOnly,
  onInStockOnlyChange,
  cartQuantities,
  onAdd,
}: PosCatalogueProps) {
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState<string>("all");
  const debouncedSearch = useDebouncedValue(search, 250);

  const filtered = useMemo(() => {
    const query = debouncedSearch.trim().toLowerCase();
    return (products ?? []).filter((product) => {
      if (categoryId !== "all" && product.category_id !== categoryId) {
        return false;
      }
      if (inStockOnly && product.stock_qty <= 0) {
        return false;
      }
      if (query) {
        const haystack = [
          product.name,
          product.code,
          product.category?.name ?? "",
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    });
  }, [products, categoryId, inStockOnly, debouncedSearch]);

  return (
    <div className="space-y-4">
      <div className="card-surface-flat space-y-3 p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search products by name or code…"
            aria-label="Search products"
            className="h-11 rounded-full border-border/80 bg-card pl-10 pr-4 text-sm"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => setCategoryId("all")}
            aria-pressed={categoryId === "all"}
            className={cn(
              "h-8 shrink-0 rounded-full border px-3.5 text-xs font-semibold transition-colors",
              categoryId === "all"
                ? "border-brand bg-brand text-white"
                : "border-border/80 bg-card text-muted-foreground hover:border-brand/30 hover:text-brand-strong",
            )}
          >
            All products
          </button>
          {(categories ?? []).map((category) => (
            <button
              key={category.id}
              type="button"
              onClick={() => setCategoryId(category.id)}
              aria-pressed={categoryId === category.id}
              className={cn(
                "h-8 shrink-0 rounded-full border px-3.5 text-xs font-semibold transition-colors",
                categoryId === category.id
                  ? "border-brand bg-brand text-white"
                  : "border-border/80 bg-card text-muted-foreground hover:border-brand/30 hover:text-brand-strong",
              )}
            >
              {category.name}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Switch
              id="in-stock-only"
              checked={inStockOnly}
              onCheckedChange={onInStockOnlyChange}
            />
            <Label
              htmlFor="in-stock-only"
              className="text-xs font-semibold text-muted-foreground"
            >
              In stock only
            </Label>
          </div>
          <p className="text-xs text-muted-foreground">
            <span className="font-semibold text-ink">
              {filtered.length}
            </span>{" "}
            {filtered.length === 1 ? "product" : "products"}
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <Skeleton key={index} className="h-[178px] rounded-[22px]" />
          ))}
        </div>
      ) : isError ? (
        <ErrorState
          title="Products could not be loaded"
          message="Check the connection to the store API and try again."
          onRetry={onRetry}
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<PackageSearch />}
          title="No products found"
          description={
            search || categoryId !== "all"
              ? "Try a different search, category, or turn off the stock filter."
              : "Add products in Inventory before selling."
          }
        />
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
          {filtered.map((product) => {
            const quantity = cartQuantities[product.id] ?? 0;
            const outOfStock = product.stock_qty <= 0;
            const atLimit = quantity >= product.stock_qty;

            return (
              <button
                key={product.id}
                type="button"
                onClick={() => onAdd(product)}
                disabled={outOfStock || atLimit}
                aria-pressed={quantity > 0}
                aria-label={`Add ${product.name} to cart`}
                className={cn(
                  "group relative flex min-h-[178px] flex-col rounded-[22px] border bg-card p-3.5 text-left transition-all duration-150",
                  outOfStock
                    ? "cursor-not-allowed border-border/60 opacity-55"
                    : "border-border/70 hover:-translate-y-0.5 hover:border-brand/35 hover:shadow-soft active:translate-y-0",
                  quantity > 0 && "border-brand/50 ring-2 ring-brand/15",
                  atLimit && !outOfStock && "cursor-not-allowed opacity-80",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <ProductThumb
                    name={product.name}
                    category={product.category?.name}
                    size="lg"
                  />
                  {quantity > 0 ? (
                    <span className="inline-flex size-6 items-center justify-center rounded-full bg-brand text-[11px] font-extrabold text-white shadow-sm">
                      {quantity}
                    </span>
                  ) : null}
                </div>

                <p className="mt-3 line-clamp-1 text-sm font-bold text-ink">
                  {product.name}
                </p>
                <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {product.code}
                  {product.slot_code ? ` · ${product.slot_code}` : ""}
                </p>

                <p className="mt-auto pt-3 font-heading text-lg font-extrabold tracking-tight text-brand-strong">
                  {formatKHR(product.selling_price)}
                </p>

                <div className="mt-2 flex items-center justify-between gap-2">
                  <StockStatusBadge
                    status={product.stock_status}
                    className="h-5 px-2 text-[10px]"
                  />
                  <span className="truncate text-[10px] font-medium text-muted-foreground">
                    {product.stock_qty} left
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
