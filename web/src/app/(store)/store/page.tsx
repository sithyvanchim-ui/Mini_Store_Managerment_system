"use client";

import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  BadgeCheck,
  Minus,
  Plus,
  ShoppingBasket,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
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
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useStoreCheckout, useStoreMenu, useStoreOrders } from "@/hooks/use-store";
import { queryKeys } from "@/lib/query-keys";
import { cn, formatDateTime, formatKHR, formatNumber } from "@/lib/utils";
import type { PaymentMethod, Sale, StoreProduct } from "@/types/api";

interface CartLine {
  product: StoreProduct;
  quantity: number;
}

function newIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

const STOCK_BADGES: Record<StoreProduct["stock_status"], string> = {
  in_stock: "bg-mint text-brand-strong",
  low_stock: "bg-warning/15 text-warning-strong",
  out_of_stock: "bg-muted text-muted-foreground",
};

const STOCK_LABELS: Record<StoreProduct["stock_status"], string> = {
  in_stock: "In stock",
  low_stock: "Running low",
  out_of_stock: "Out of stock",
};

export default function StorePage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [lines, setLines] = useState<CartLine[]>([]);
  const [note, setNote] = useState("");
  const [idempotencyKey, setIdempotencyKey] = useState(newIdempotencyKey);
  const [payOpen, setPayOpen] = useState(false);
  const [payStep, setPayStep] = useState<"method" | "qr">("method");
  const [payMethod, setPayMethod] = useState<PaymentMethod>("aba_khqr");
  const [receiptSale, setReceiptSale] = useState<Sale | null>(null);
  const [receiptOpen, setReceiptOpen] = useState(false);

  const menu = useStoreMenu(search);
  const orders = useStoreOrders();
  const checkout = useStoreCheckout();

  const products = menu.data?.items ?? [];
  const categories = useMemo(
    () =>
      Array.from(
        new Set(products.map((item) => item.category_name ?? "Other")),
      ).sort(),
    [products],
  );
  const visible = useMemo(
    () =>
      category === "all"
        ? products
        : products.filter(
            (item) => (item.category_name ?? "Other") === category,
          ),
    [products, category],
  );

  const total = lines.reduce(
    (sum, line) => sum + line.product.selling_price * line.quantity,
    0,
  );
  const units = lines.reduce((sum, line) => sum + line.quantity, 0);

  function addToCart(product: StoreProduct) {
    setLines((current) => {
      const existing = current.find((line) => line.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock_qty) return current;
        return current.map((line) =>
          line.product.id === product.id
            ? { ...line, quantity: line.quantity + 1 }
            : line,
        );
      }
      return [...current, { product, quantity: 1 }];
    });
  }

  function setQuantity(productId: string, quantity: number) {
    setLines((current) =>
      quantity <= 0
        ? current.filter((line) => line.product.id !== productId)
        : current.map((line) =>
            line.product.id === productId
              ? {
                  ...line,
                  quantity: Math.min(quantity, line.product.stock_qty),
                }
              : line,
          ),
    );
  }

  function submitOrder() {
    checkout.mutate(
      {
        payload: {
          items: lines.map((line) => ({
            product_id: line.product.id,
            quantity: line.quantity,
          })),
          payment_method: payMethod,
          ...(note.trim() ? { notes: note.trim() } : {}),
        },
        idempotencyKey,
      },
      {
        onSuccess: (sale) => {
          setReceiptSale(sale);
          setReceiptOpen(true);
          setPayOpen(false);
          setLines([]);
          setNote("");
          setIdempotencyKey(newIdempotencyKey());
          queryClient.invalidateQueries({ queryKey: queryKeys.store.all });
          queryClient.invalidateQueries({ queryKey: queryKeys.store.menu("") });
          toast.success(`Order ${sale.reference} placed — thank you!`);
        },
        onError: (error) => {
          const message =
            error instanceof Error ? error.message : "Checkout failed.";
          toast.error("Checkout failed", { description: message });
        },
      },
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-heading text-2xl font-black tracking-tight text-ink">
          Dorm fridge
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Pick what you want, scan the QR with your bank app, and grab it. No
          cash — pay by ABA KHQR, Alipay, card, Pi Pay, or ACLEDA.
        </p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search drinks and snacks…"
          className="h-11 flex-1 rounded-2xl border-border bg-background/60 px-3.5"
        />
        {categories.length > 1 ? (
          <div className="flex gap-1.5 overflow-x-auto scrollbar-none">
            {["all", ...categories].map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => setCategory(name)}
                className={cn(
                  "shrink-0 rounded-full border px-3 py-1.5 text-xs font-bold transition-colors",
                  category === name
                    ? "border-primary bg-primary text-white"
                    : "border-border/70 bg-card text-muted-foreground hover:bg-mint/60",
                )}
              >
                {name === "all" ? "All" : name}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {menu.isPending ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-36 rounded-[22px]" />
          ))}
        </div>
      ) : menu.isError ? (
        <div className="rounded-[22px] bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
          Could not load the menu. Try refreshing the page.
        </div>
      ) : visible.length === 0 ? (
        <div className="rounded-[22px] bg-muted/60 px-4 py-8 text-center text-sm text-muted-foreground">
          Nothing matches that search.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {visible.map((product) => {
            const inCart = lines.find(
              (line) => line.product.id === product.id,
            )?.quantity;
            const soldOut = product.stock_qty <= 0;
            return (
              <div
                key={product.id}
                className="flex flex-col rounded-[22px] border border-border/70 bg-card p-3.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide",
                      STOCK_BADGES[product.stock_status],
                    )}
                  >
                    {STOCK_LABELS[product.stock_status]}
                  </span>
                  <span className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {product.location === "fridge" ? "Fridge" : "Shelf"}
                  </span>
                </div>
                <p className="mt-2 text-sm font-bold leading-5 text-ink">
                  {product.name}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {product.category_name ?? "Other"} · {product.package}
                </p>
                <p className="mt-2 font-heading text-lg font-black text-brand-strong">
                  {formatKHR(product.selling_price)}
                </p>
                <Button
                  type="button"
                  size="sm"
                  className="mt-2 w-full rounded-full text-xs font-bold"
                  onClick={() => addToCart(product)}
                  disabled={soldOut}
                >
                  {soldOut ? (
                    "Sold out"
                  ) : inCart ? (
                    <>
                      <span className="opacity-80">In cart ·</span>{" "}
                      {formatNumber(inCart)}
                    </>
                  ) : (
                    <>
                      <Plus className="size-4" /> Add
                    </>
                  )}
                </Button>
              </div>
            );
          })}
        </div>
      )}

      {lines.length > 0 ? (
        <div className="rounded-[22px] border border-border/70 bg-card p-4">
          <p className="font-heading text-sm font-extrabold text-ink">
            Your basket
          </p>
          <div className="mt-3 space-y-2">
            {lines.map((line) => (
              <div
                key={line.product.id}
                className="flex items-center gap-3 rounded-2xl bg-muted/40 px-3 py-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold text-ink">
                    {line.product.name}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {formatKHR(line.product.selling_price)} each
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    aria-label="Remove one"
                    onClick={() =>
                      setQuantity(line.product.id, line.quantity - 1)
                    }
                    className="flex size-7 items-center justify-center rounded-full bg-card text-ink shadow-sm"
                  >
                    <Minus className="size-3.5" />
                  </button>
                  <span className="w-6 text-center text-xs font-black text-ink">
                    {formatNumber(line.quantity)}
                  </span>
                  <button
                    type="button"
                    aria-label="Add one"
                    disabled={line.quantity >= line.product.stock_qty}
                    onClick={() =>
                      setQuantity(line.product.id, line.quantity + 1)
                    }
                    className="flex size-7 items-center justify-center rounded-full bg-card text-ink shadow-sm disabled:opacity-40"
                  >
                    <Plus className="size-3.5" />
                  </button>
                </div>
                <p className="w-20 text-right text-xs font-black text-ink">
                  {formatKHR(line.product.selling_price * line.quantity)}
                </p>
                <button
                  type="button"
                  aria-label="Remove from basket"
                  onClick={() => setQuantity(line.product.id, 0)}
                  className="text-muted-foreground transition-colors hover:text-destructive"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))}
          </div>
          <Input
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Room number or note (optional)"
            maxLength={500}
            className="mt-3 h-10 rounded-2xl border-border bg-background/60 px-3.5 text-xs"
          />
          <div className="mt-3 flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              {formatNumber(units)} item{units === 1 ? "" : "s"}
            </p>
            <p className="font-heading text-xl font-black text-ink">
              {formatKHR(total)}
            </p>
          </div>
          <Button
            type="button"
            className="mt-3 w-full rounded-full text-sm font-bold"
            onClick={() => {
              setPayMethod("aba_khqr");
              setPayStep("method");
              setPayOpen(true);
            }}
            disabled={checkout.isPending}
          >
            <ShoppingBasket className="size-4" />
            Checkout · {formatKHR(total)}
          </Button>
        </div>
      ) : null}

      {orders.data && orders.data.items.length > 0 ? (
        <div className="rounded-[22px] border border-border/70 bg-card p-4">
          <p className="font-heading text-sm font-extrabold text-ink">
            My purchases
          </p>
          <div className="mt-2 divide-y divide-border/60">
            {orders.data.items.slice(0, 5).map((order) => (
              <div
                key={order.id}
                className="flex items-center justify-between gap-3 py-2"
              >
                <div className="min-w-0">
                  <p className="text-xs font-bold text-ink">
                    {order.reference}
                    {order.status === "voided" ? (
                      <span className="ml-2 font-semibold text-destructive">
                        voided
                      </span>
                    ) : null}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {formatDateTime(order.created_at)} ·{" "}
                    {PAYMENT_LABELS[order.payment_method] ?? "ABA KHQR"}
                  </p>
                </div>
                <p className="text-xs font-black text-ink">
                  {formatKHR(order.total)}
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

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
                  How do you want to pay?
                </DialogTitle>
                <DialogDescription>
                  Your total is {formatKHR(total)}. Pick a channel, scan the QR,
                  and pay — no cash.
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
              onPaid={submitOrder}
              paying={checkout.isPending}
              confirmLabel="I have paid — place my order"
              skipLabel="Place order anyway"
            />
          )}
        </DialogContent>
      </Dialog>

      <ReceiptDialog
        sale={receiptSale}
        open={receiptOpen}
        onOpenChange={setReceiptOpen}
      />
    </div>
  );
}
