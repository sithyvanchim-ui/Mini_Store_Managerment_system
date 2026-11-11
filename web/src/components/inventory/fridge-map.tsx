"use client";

import { ArrowUpDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StockStatusBadge } from "@/components/shared/status-badge";
import { cn, formatNumber, stockStatusMeta } from "@/lib/utils";
import type { Product, ProductLocation, StockStatus } from "@/types/api";

const locationLabels: Record<ProductLocation, string> = {
  fridge: "Fridge",
  shelf: "Shelf",
};

const statusCellStyles: Record<StockStatus, string> = {
  in_stock: "border-success/25 bg-success/[0.055] hover:border-success/45",
  low_stock: "border-warning/35 bg-warning/[0.09] hover:border-warning/55",
  out_of_stock:
    "border-destructive/30 bg-destructive/[0.055] hover:border-destructive/50",
};

const statusTextStyles: Record<StockStatus, string> = {
  in_stock: "text-[#0d7a5b]",
  low_stock: "text-[#9a6a12]",
  out_of_stock: "text-destructive",
};

function slotSort(a: string, b: string): number {
  if (a === "Unassigned") return 1;
  if (b === "Unassigned") return -1;
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
}

function groupBySlot(products: Product[]) {
  const groups = new Map<string, Product[]>();
  for (const product of products) {
    const key = product.slot_code?.trim() || "Unassigned";
    const current = groups.get(key) ?? [];
    current.push(product);
    groups.set(key, current);
  }
  return Array.from(groups.entries())
    .sort(([a], [b]) => slotSort(a, b))
    .map(([slot, items]) => ({
      slot,
      items: [...items].sort((a, b) => a.name.localeCompare(b.name)),
    }));
}

function statusCounts(products: Product[]) {
  return products.reduce(
    (counts, product) => {
      counts[product.stock_status] += 1;
      return counts;
    },
    { in_stock: 0, low_stock: 0, out_of_stock: 0 } as Record<
      StockStatus,
      number
    >,
  );
}

interface FridgeMapProps {
  products: Product[];
  onSelectProduct: (product: Product) => void;
}

export function FridgeMap({ products, onSelectProduct }: FridgeMapProps) {
  const counts = statusCounts(products);
  const locations: ProductLocation[] = ["fridge", "shelf"];
  const sortedProducts = [...products].sort((a, b) => {
    const locationOrder =
      locations.indexOf(a.location) - locations.indexOf(b.location);
    if (locationOrder !== 0) return locationOrder;
    return slotSort(a.slot_code ?? "Unassigned", b.slot_code ?? "Unassigned");
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          {(["in_stock", "low_stock", "out_of_stock"] as StockStatus[]).map(
            (status) => (
              <span
                key={status}
                className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground"
              >
                <span
                  className={cn(
                    "size-2.5 rounded-full",
                    status === "in_stock"
                      ? "bg-success"
                      : status === "low_stock"
                        ? "bg-warning"
                        : "bg-destructive",
                  )}
                  aria-hidden="true"
                />
                {stockStatusMeta(status).label}
                <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-bold text-ink">
                  {counts[status]}
                </span>
              </span>
            ),
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {formatNumber(products.length)} products ·{" "}
          {formatNumber(
            products.reduce((total, product) => total + product.stock_qty, 0),
          )}{" "}
          units across slots
        </p>
      </div>

      {locations.map((location) => {
        const locationProducts = products.filter(
          (product) => product.location === location,
        );
        const groups = groupBySlot(locationProducts);

        return (
          <section key={location} aria-labelledby={`${location}-map-heading`}>
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3
                id={`${location}-map-heading`}
                className="font-heading text-base font-bold text-ink"
              >
                {locationLabels[location]}
              </h3>
              <p className="text-xs text-muted-foreground">
                {groups.length} slots · {locationProducts.length} products
              </p>
            </div>

            {groups.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
                No products are assigned to the {locationLabels[location].toLowerCase()}.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5 2xl:grid-cols-6">
                {groups.flatMap((group) =>
                  group.items.map((product) => {
                    const status = product.stock_status;
                    return (
                      <button
                        key={product.id}
                        type="button"
                        onClick={() => onSelectProduct(product)}
                        aria-label={`Adjust stock for ${product.name}, slot ${
                          group.slot
                        }, ${formatNumber(product.stock_qty)} units, ${
                          stockStatusMeta(status).label
                        }`}
                        className={cn(
                          "group relative flex min-h-32 flex-col rounded-2xl border p-3 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                          statusCellStyles[status],
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="rounded-md bg-white/75 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-muted-foreground">
                            {group.slot}
                          </span>
                          <span
                            className={cn(
                              "mt-1 size-2 rounded-full",
                              status === "in_stock"
                                ? "bg-success"
                                : status === "low_stock"
                                  ? "bg-warning"
                                  : "bg-destructive",
                            )}
                            aria-hidden="true"
                          />
                        </div>
                        <p className="mt-2 line-clamp-2 text-xs font-semibold leading-4 text-ink">
                          {product.name}
                        </p>
                        <div className="mt-auto flex items-end justify-between gap-2 pt-3">
                          <span className="flex items-baseline gap-1">
                            <span className="font-heading text-2xl font-extrabold tracking-tight text-ink">
                              {formatNumber(product.stock_qty)}
                            </span>
                            <span className="text-[10px] font-semibold text-muted-foreground">
                              units
                            </span>
                          </span>
                          <span
                            className={cn(
                              "text-[10px] font-bold",
                              statusTextStyles[status],
                            )}
                          >
                            {stockStatusMeta(status).label}
                          </span>
                        </div>
                        {!product.is_active ? (
                          <Badge
                            variant="outline"
                            className="absolute right-2 top-8 rounded-full border-border bg-white/80 px-1.5 text-[9px] text-muted-foreground"
                          >
                            Inactive
                          </Badge>
                        ) : null}
                      </button>
                    );
                  }),
                )}
              </div>
            )}
          </section>
        );
      })}

      <div className="rounded-2xl border border-border/70 bg-muted/20 p-1">
        <div className="px-3 pb-2 pt-3">
          <h3 className="font-heading text-sm font-bold text-ink">Slot list</h3>
          <p className="text-xs text-muted-foreground">
            Accessible alternative to the visual map.
          </p>
        </div>
        <Table className="min-w-[640px]">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Slot</TableHead>
              <TableHead>Product</TableHead>
              <TableHead>Location</TableHead>
              <TableHead className="text-right">Stock</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">
                <span className="sr-only">Action</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedProducts.map((product) => (
              <TableRow key={product.id}>
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {product.slot_code ?? "Unassigned"}
                </TableCell>
                <TableCell>
                  <p className="font-semibold text-ink">{product.name}</p>
                  <p className="text-xs text-muted-foreground">{product.code}</p>
                </TableCell>
                <TableCell className="capitalize text-muted-foreground">
                  {product.location}
                </TableCell>
                <TableCell className="text-right font-semibold tabular-nums text-ink">
                  {formatNumber(product.stock_qty)}
                </TableCell>
                <TableCell>
                  <StockStatusBadge status={product.stock_status} />
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-full"
                    onClick={() => onSelectProduct(product)}
                    aria-label={`Adjust stock for ${product.name}`}
                  >
                    <ArrowUpDown className="size-3.5" />
                    Adjust
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
