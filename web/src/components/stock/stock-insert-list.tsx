"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError } from "@/lib/api";
import { formatNumber } from "@/lib/utils";
import { useInsertStock, useProducts } from "@/hooks/use-products";
import type { Product } from "@/types/api";

interface RowDraft {
  store: number;
  sell: number;
}

export function StockInsertList() {
  const productsQuery = useProducts({ page: 1, page_size: 50, sort: "name" });
  const insertStock = useInsertStock();
  const [drafts, setDrafts] = useState<Record<string, RowDraft>>({});

  const products = productsQuery.data?.items ?? [];
  const pending = insertStock.isPending;

  function draft(product: Product): RowDraft {
    return drafts[product.id] ?? { store: 1, sell: 1 };
  }

  function setDraftValue(product: Product, key: "store" | "sell", value: number) {
    setDrafts((current) => ({
      ...current,
      [product.id]: { ...draft(product), [key]: value },
    }));
  }

  async function insert(product: Product, place: "store" | "sell") {
    const quantity = draft(product)[place];
    if (quantity <= 0) return;
    try {
      await insertStock.mutateAsync({
        id: product.id,
        payload: { place, quantity },
      });
      toast.success("Stock inserted", {
        description: `${product.name}: +${quantity} ${place}`,
      });
      setDraftValue(product, place, 0);
    } catch (error) {
      toast.error("Could not insert stock", {
        description:
          error instanceof ApiError ? error.detail : "Try again with a smaller quantity.",
      });
    }
  }

  return (
    <div className="space-y-3">
      {productsQuery.isPending ? (
        <div className="space-y-2">
          <Skeleton className="h-8 rounded-xl" />
          <div className="grid grid-cols-2 gap-2">
            <Skeleton className="h-24 rounded-xl" />
            <Skeleton className="h-24 rounded-xl" />
            <Skeleton className="h-24 rounded-xl" />
          </div>
        </div>
      ) : productsQuery.isError ? (
        <ErrorState
          title="Insert positions could not be loaded"
          onRetry={() => void productsQuery.refetch()}
        />
      ) : products.length === 0 ? (
        <EmptyState
          title="No products to update"
          description="Products will appear here so you can add stock to the store or sell places."
        />
      ) : (
        <Table className="w-full text-sm">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-3">Product</TableHead>
              <TableHead>Store</TableHead>
              <TableHead>Sell</TableHead>
              <TableHead className="text-right">Insert to store</TableHead>
              <TableHead className="text-right">Insert to sell</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((product) => (
              <TableRow key={product.id}>
                <TableCell className="pl-3">
                  <div>
                    <p className="font-bold text-ink">{product.name}</p>
                    <p className="text-[11px] text-muted-foreground">{product.code}</p>
                  </div>
                </TableCell>
                <TableCell>{formatNumber(product.store_qty)}</TableCell>
                <TableCell>{formatNumber(product.sell_qty)}</TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-2">
                    <Input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      step={1}
                      className="h-8 w-16 rounded-xl text-center text-xs"
                      value={draft(product).store}
                      disabled={pending}
                      onChange={(event) =>
                        setDraftValue(product, "store", Number(event.target.value) || 0)
                      }
                      aria-label={`Store insert quantity for ${product.name}`}
                    />
                    <Button
                      size="sm"
                      className="h-8 rounded-full bg-brand px-3 text-xs text-white hover:bg-brand-strong"
                      disabled={pending || draft(product).store <= 0}
                      onClick={() => void insert(product, "store")}
                    >
                      <Plus className="size-3.5" />
                    </Button>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-2">
                    <Input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      step={1}
                      className="h-8 w-16 rounded-xl text-center text-xs"
                      value={draft(product).sell}
                      disabled={pending}
                      onChange={(event) =>
                        setDraftValue(product, "sell", Number(event.target.value) || 0)
                      }
                      aria-label={`Sell insert quantity for ${product.name}`}
                    />
                    <Button
                      size="sm"
                      className="h-8 rounded-full bg-brand px-3 text-xs text-white hover:bg-brand-strong"
                      disabled={pending || draft(product).sell <= 0}
                      onClick={() => void insert(product, "sell")}
                    >
                      <Plus className="size-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
