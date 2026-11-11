"use client";

import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PosCatalogue } from "@/components/sales/pos-catalogue";
import { PosCart, type CartLine } from "@/components/sales/pos-cart";
import { ReceiptDialog } from "@/components/sales/receipt-dialog";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { ApiError } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { formatKHR } from "@/lib/utils";
import { useCreateSale, usePosCategories, usePosProducts } from "@/hooks/use-pos";
import type { CreateSalePayload, Product, Sale } from "@/types/api";

function newIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function PosScreen() {
  const queryClient = useQueryClient();
  const [inStockOnly, setInStockOnly] = useState(true);
  const productsQuery = usePosProducts(inStockOnly);
  const categoriesQuery = usePosCategories();

  const [lines, setLines] = useState<CartLine[]>([]);
  const [discount, setDiscount] = useState(0);
  const [notes, setNotes] = useState("");
  const [idempotencyKey, setIdempotencyKey] = useState(newIdempotencyKey);
  const [receiptSale, setReceiptSale] = useState<Sale | null>(null);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [abaConfirmOpen, setAbaConfirmOpen] = useState(false);

  const createSale = useCreateSale();

  const subtotal = useMemo(
    () =>
      lines.reduce(
        (sum, line) => sum + line.product.selling_price * line.quantity,
        0,
      ),
    [lines],
  );
  const effectiveDiscount = Math.min(discount, subtotal);
  const total = Math.max(subtotal - effectiveDiscount, 0);
  const cartQuantities = useMemo(
    () =>
      Object.fromEntries(
        lines.map((line) => [line.product.id, line.quantity]),
      ) as Record<string, number>,
    [lines],
  );

  function resetCart() {
    setLines([]);
    setDiscount(0);
    setNotes("");
  }

  function addProduct(product: Product) {
    setLines((current) => {
      const existing = current.find((line) => line.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock_qty) return current;
        return current.map((line) =>
          line.product.id === product.id
            ? { product, quantity: line.quantity + 1 }
            : line,
        );
      }
      if (product.stock_qty <= 0) return current;
      return [...current, { product, quantity: 1 }];
    });
  }

  function increment(productId: string) {
    setLines((current) =>
      current.map((line) =>
        line.product.id === productId && line.quantity < line.product.stock_qty
          ? { ...line, quantity: line.quantity + 1 }
          : line,
      ),
    );
  }

  function decrement(productId: string) {
    setLines((current) =>
      current
        .map((line) =>
          line.product.id === productId
            ? { ...line, quantity: line.quantity - 1 }
            : line,
        )
        .filter((line) => line.quantity > 0),
    );
  }

  function removeLine(productId: string) {
    setLines((current) =>
      current.filter((line) => line.product.id !== productId),
    );
  }

  function invalidateAfterSale() {
    void queryClient.invalidateQueries({ queryKey: queryKeys.sales.all });
    void queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
    void queryClient.invalidateQueries({ queryKey: queryKeys.stock.all });
    void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
    void queryClient.invalidateQueries({ queryKey: queryKeys.dailyClose.all });
  }

  function submitSale() {
    const payload: CreateSalePayload = {
      items: lines.map((line) => ({
        product_id: line.product.id,
        quantity: line.quantity,
      })),
      discount: effectiveDiscount,
      ...(notes.trim() ? { notes: notes.trim() } : {}),
    };

    createSale.mutate(
      { payload, idempotencyKey },
      {
        onSuccess: (sale) => {
          setReceiptSale(sale);
          setReceiptOpen(true);
          resetCart();
          setIdempotencyKey(newIdempotencyKey());
          toast.success(`Sale ${sale.reference} completed`);
          invalidateAfterSale();
        },
        onError: (error) => {
          if (error instanceof ApiError && error.status === 409) {
            toast.error(error.detail);
            void queryClient.invalidateQueries({
              queryKey: queryKeys.products.all,
            });
            return;
          }
          toast.error(
            error instanceof Error ? error.message : "Checkout failed. Try again.",
          );
        },
      },
    );
  }

  function handleCharge() {
    if (lines.length === 0) return;
    setAbaConfirmOpen(true);
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <div className="min-w-0 xl:col-span-8">
          <PosCatalogue
            products={productsQuery.data?.items}
            categories={categoriesQuery.data}
            isLoading={productsQuery.isLoading}
            isError={productsQuery.isError}
            onRetry={() => {
              void productsQuery.refetch();
            }}
            inStockOnly={inStockOnly}
            onInStockOnlyChange={setInStockOnly}
            cartQuantities={cartQuantities}
            onAdd={addProduct}
          />
        </div>
        <div className="min-w-0 xl:col-span-4">
          <PosCart
            lines={lines}
            subtotal={subtotal}
            discount={effectiveDiscount}
            total={total}
            notes={notes}
            isPending={createSale.isPending}
            onIncrement={increment}
            onDecrement={decrement}
            onRemove={removeLine}
            onClear={resetCart}
            onDiscountChange={setDiscount}
            onNotesChange={setNotes}
            onCharge={handleCharge}
          />
        </div>
      </div>

      <ConfirmDialog
        open={abaConfirmOpen}
        onOpenChange={setAbaConfirmOpen}
        title="Charge with ABA?"
        description={`Confirm the customer has transferred ${formatKHR(total)} by ABA before completing this sale.`}
        confirmLabel="Yes, charge"
        onConfirm={() => {
          setAbaConfirmOpen(false);
          submitSale();
        }}
        loading={createSale.isPending}
      />

      <ReceiptDialog
        sale={receiptSale}
        open={receiptOpen}
        onOpenChange={setReceiptOpen}
        onNewSale={() => setReceiptOpen(false)}
      />
    </>
  );
}
