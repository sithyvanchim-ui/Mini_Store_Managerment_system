"use client";

import { Minus, Plus, ShoppingBasket, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/shared/empty-state";
import { ProductThumb } from "@/components/shared/product-thumb";
import { formatKHR } from "@/lib/utils";
import type { Product } from "@/types/api";

export interface CartLine {
  product: Product;
  quantity: number;
}

interface PosCartProps {
  lines: CartLine[];
  subtotal: number;
  discount: number;
  total: number;
  notes: string;
  isPending: boolean;
  onIncrement: (productId: string) => void;
  onDecrement: (productId: string) => void;
  onRemove: (productId: string) => void;
  onClear: () => void;
  onDiscountChange: (value: number) => void;
  onNotesChange: (value: string) => void;
  onCharge: () => void;
}

export function PosCart({
  lines,
  subtotal,
  discount,
  total,
  notes,
  isPending,
  onIncrement,
  onDecrement,
  onRemove,
  onClear,
  onDiscountChange,
  onNotesChange,
  onCharge,
}: PosCartProps) {
  const itemCount = lines.reduce((sum, line) => sum + line.quantity, 0);
  const canCharge = lines.length > 0 && !isPending;

  return (
    <aside className="card-surface flex flex-col overflow-hidden xl:sticky xl:top-24 xl:max-h-[calc(100vh-7rem)]">
      <div className="flex items-center justify-between gap-3 border-b border-border/70 px-5 py-4">
        <div>
          <h2 className="font-heading text-lg font-bold text-ink">Current sale</h2>
          <p className="text-xs text-muted-foreground">
            {itemCount === 0
              ? "No items yet"
              : `${itemCount} item${itemCount === 1 ? "" : "s"} · ${lines.length} line${lines.length === 1 ? "" : "s"}`}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="rounded-full text-xs text-muted-foreground"
          onClick={onClear}
          disabled={lines.length === 0 || isPending}
        >
          Clear
        </Button>
      </div>

      <div className="min-h-[180px] flex-1 overflow-y-auto px-5 py-4 scrollbar-thin">
        {lines.length === 0 ? (
          <EmptyState
            icon={<ShoppingBasket />}
            title="Cart is empty"
            description="Tap a product from the catalogue to start a sale."
            className="border-0 bg-transparent px-2 py-10"
          />
        ) : (
          <ul className="space-y-4">
            {lines.map(({ product, quantity }) => (
              <li key={product.id} className="flex gap-3">
                <ProductThumb
                  name={product.name}
                  category={product.category?.name}
                  size="sm"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="line-clamp-1 text-sm font-bold text-ink">
                        {product.name}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {formatKHR(product.selling_price)} each
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onRemove(product.id)}
                      aria-label={`Remove ${product.name} from cart`}
                      className="flex size-7 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                      disabled={isPending}
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>

                  <div className="mt-2 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => onDecrement(product.id)}
                        aria-label={`Decrease ${product.name} quantity`}
                        className="flex size-7 items-center justify-center rounded-full border border-border bg-card text-ink transition-colors hover:border-brand/40 hover:text-brand-strong"
                        disabled={isPending}
                      >
                        <Minus className="size-3.5" />
                      </button>
                      <span className="min-w-6 text-center text-sm font-bold tabular-nums">
                        {quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => onIncrement(product.id)}
                        aria-label={`Increase ${product.name} quantity`}
                        className="flex size-7 items-center justify-center rounded-full border border-border bg-card text-ink transition-colors hover:border-brand/40 hover:text-brand-strong disabled:cursor-not-allowed disabled:opacity-40"
                        disabled={isPending || quantity >= product.stock_qty}
                      >
                        <Plus className="size-3.5" />
                      </button>
                    </div>
                    <p className="text-sm font-extrabold text-ink">
                      {formatKHR(product.selling_price * quantity)}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="space-y-4 border-t border-border/70 px-5 py-4">
        <div className="space-y-1.5">
          <Label
            htmlFor="pos-discount"
            className="text-xs font-semibold text-muted-foreground"
          >
            Discount (KHR)
          </Label>
          <Input
            id="pos-discount"
            type="number"
            inputMode="numeric"
            min={0}
            max={subtotal}
            step={100}
            value={discount || ""}
            placeholder="0"
            onChange={(event) => {
              const value = Number(event.target.value);
              onDiscountChange(
                Number.isFinite(value)
                  ? Math.min(Math.max(Math.floor(value), 0), subtotal)
                  : 0,
              );
            }}
            className="h-10 rounded-xl"
            disabled={lines.length === 0 || isPending}
          />
        </div>

        <div className="rounded-xl bg-mint/70 px-3 py-2 text-[11px] leading-5 text-brand-strong">
          Every sale settles by ABA transfer — confirm the payment on the
          customer&apos;s phone before charging.
        </div>

        <div className="space-y-1.5">
          <Label
            htmlFor="pos-notes"
            className="text-xs font-semibold text-muted-foreground"
          >
            Note (optional)
          </Label>
          <Input
            id="pos-notes"
            value={notes}
            onChange={(event) => onNotesChange(event.target.value)}
            placeholder="e.g. Dorm room 204"
            className="h-10 rounded-xl"
            maxLength={200}
            disabled={isPending}
          />
        </div>

        <div className="space-y-1.5 border-t border-dashed border-border/80 pt-3 text-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span>Subtotal</span>
            <span className="font-semibold text-ink">
              {formatKHR(subtotal)}
            </span>
          </div>
          <div className="flex items-center justify-between text-muted-foreground">
            <span>Discount</span>
            <span className="font-semibold text-ink">
              {discount > 0 ? `-${formatKHR(discount)}` : formatKHR(0)}
            </span>
          </div>
          <div className="flex items-end justify-between pt-1">
            <span className="text-sm font-bold text-ink">Total</span>
            <span className="font-heading text-3xl font-extrabold tracking-tight text-ink">
              {formatKHR(total)}
            </span>
          </div>
        </div>

        <Button
          className="h-12 w-full rounded-full text-base font-bold shadow-[0_14px_30px_rgba(15,181,160,0.24)]"
          onClick={onCharge}
          disabled={!canCharge}
        >
          {isPending ? "Charging…" : `Charge ${formatKHR(total)}`}
        </Button>
      </div>
    </aside>
  );
}
