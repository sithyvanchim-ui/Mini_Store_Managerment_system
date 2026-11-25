"use client";

import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { BadgeCheck } from "lucide-react";
import { PosCatalogue } from "@/components/sales/pos-catalogue";
import { PosCart, type CartLine } from "@/components/sales/pos-cart";
import {
  PAYMENT_LABELS,
  PAYMENT_METHODS,
  PaymentQrStep,
} from "@/components/sales/payment-qr-step";
import { ReceiptDialog } from "@/components/sales/receipt-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { cn, formatKHR } from "@/lib/utils";
import { useCreateSale, usePosCategories, usePosProducts } from "@/hooks/use-pos";
import type { CreateSalePayload, PaymentMethod, Product, Sale } from "@/types/api";

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
  const [payOpen, setPayOpen] = useState(false);
  const [payMethod, setPayMethod] = useState<PaymentMethod>("aba_khqr");
  const [payStep, setPayStep] = useState<"method" | "qr">("method");

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
      payment_method: payMethod,
      ...(notes.trim() ? { notes: notes.trim() } : {}),
    };

    createSale.mutate(
      { payload, idempotencyKey },
      {
        onSuccess: (sale) => {
          setReceiptSale(sale);
          setReceiptOpen(true);
          setPayOpen(false);
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
    setPayMethod("aba_khqr");
    setPayStep("method");
    setPayOpen(true);
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

      <Dialog
        open={payOpen}
        onOpenChange={(open) => {
          if (!open) setPayOpen(false);
        }}
      >
        <DialogContent className="rounded-[24px] sm:max-w-md">
          {payStep === "method" ? (
            <>
              <DialogHeader>
                <DialogTitle className="font-heading text-xl font-black text-ink">
                  Choose payment method
                </DialogTitle>
                <DialogDescription>
                  The buyer pays {formatKHR(total)} electronically — no cash.
                  Pick the bank they use and its app opens automatically.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-2">
                {PAYMENT_METHODS.map((method) => {
                  const selected = method.value === payMethod;
                  return (
                    <button
                      key={method.value}
                      type="button"
                      onClick={() => setPayMethod(method.value)}
                      aria-pressed={selected}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-colors",
                        selected
                          ? "border-brand bg-mint/60"
                          : "border-border/70 bg-card hover:bg-mint/40",
                      )}
                    >
                      <span
                        className={cn(
                          "flex size-9 shrink-0 items-center justify-center rounded-full",
                          selected
                            ? "bg-brand text-white"
                            : "bg-muted text-muted-foreground",
                        )}
                      >
                        {method.icon}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-bold text-ink">
                          {method.label}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {method.hint}
                        </span>
                      </span>
                      {selected ? (
                        <BadgeCheck className="size-5 shrink-0 text-brand-strong" />
                      ) : null}
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center justify-between gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-full text-xs font-bold"
                  onClick={() => setPayOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  className="rounded-full text-xs font-bold"
                  onClick={() => setPayStep("qr")}
                >
                  Next · {PAYMENT_LABELS[payMethod]}
                </Button>
              </div>
            </>
          ) : (
            <PaymentQrStep
              total={total}
              payMethod={payMethod}
              onBack={() => setPayStep("method")}
              onPaid={submitSale}
              paying={createSale.isPending}
            />
          )}
        </DialogContent>
      </Dialog>

      <ReceiptDialog
        sale={receiptSale}
        open={receiptOpen}
        onOpenChange={setReceiptOpen}
        onNewSale={() => setReceiptOpen(false)}
      />
    </>
  );
}
