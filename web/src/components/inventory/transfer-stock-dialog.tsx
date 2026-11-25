"use client";

import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { ArrowLeftRight, Store, Tag } from "lucide-react";
import { ApiError } from "@/lib/api";
import { cn, formatNumber } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTransferStock } from "@/hooks/use-products";
import type { Product } from "@/types/api";

const transferSchema = z.object({
  to: z.enum(["store", "sell"]),
  quantity: z
    .number({ error: "Enter a quantity" })
    .int("Quantity must be a whole number")
    .min(1, "Quantity must be at least 1"),
});

type TransferFormValues = z.infer<typeof transferSchema>;

const placeHelp: Record<TransferFormValues["to"], string> = {
  store: "Puts units on display in the store so customers can buy them.",
  sell: "Takes units off the display and holds them for counter sales.",
};

interface TransferStockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
}

export function TransferStockDialog({
  open,
  onOpenChange,
  product,
}: TransferStockDialogProps) {
  const transferStock = useTransferStock();
  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    setError,
    formState: { errors },
  } = useForm<TransferFormValues>({
    resolver: zodResolver(transferSchema),
    defaultValues: { to: "store", quantity: 1 },
  });

  useEffect(() => {
    if (!open) return;
    reset({ to: "store", quantity: 1 });
  }, [open, product?.id, reset]);

  const to = watch("to");
  const quantity = Number.isFinite(watch("quantity")) ? watch("quantity") : 0;
  const storeQty = product?.store_qty ?? 0;
  const sellQty = product?.sell_qty ?? 0;
  const available = to === "store" ? sellQty : storeQty;
  const nextStore = to === "store" ? storeQty + quantity : storeQty - quantity;
  const nextSell = to === "store" ? sellQty - quantity : sellQty + quantity;

  const onSubmit = handleSubmit(async (values) => {
    if (!product) return;
    if (values.quantity > available) {
      setError("quantity", {
        type: "manual",
        message:
          to === "store"
            ? `Only ${formatNumber(sellQty)} units are held for selling.`
            : `Only ${formatNumber(storeQty)} units are in the store.`,
      });
      return;
    }

    try {
      const updated = await transferStock.mutateAsync({
        id: product.id,
        payload: { to: values.to, quantity: values.quantity },
      });
      toast.success("Stock moved", {
        description: `${updated.name}: ${formatNumber(updated.store_qty)} in the store, ${formatNumber(updated.sell_qty)} held for selling.`,
      });
      onOpenChange(false);
    } catch (error) {
      toast.error("Could not move stock", {
        description:
          error instanceof ApiError
            ? error.detail
            : "Check the quantity and try again.",
      });
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-[24px] sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl font-bold text-ink">
            Move stock
          </DialogTitle>
          <DialogDescription>
            {product
              ? `${product.name} · ${formatNumber(product.stock_qty)} units in total.`
              : "Move stock between the two places."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <div>
            <Label>Move to</Label>
            <Controller
              control={control}
              name="to"
              render={({ field }) => (
                <div className="mt-1.5 grid grid-cols-2 gap-2">
                  {(
                    [
                      {
                        value: "store",
                        label: "Store display",
                        icon: Store,
                        qty: storeQty,
                      },
                      {
                        value: "sell",
                        label: "For selling",
                        icon: Tag,
                        qty: sellQty,
                      },
                    ] as const
                  ).map((place) => {
                    const selected = field.value === place.value;
                    const Icon = place.icon;
                    return (
                      <button
                        key={place.value}
                        type="button"
                        onClick={() => field.onChange(place.value)}
                        aria-pressed={selected}
                        className={cn(
                          "flex flex-col items-start gap-1 rounded-2xl border px-3 py-2.5 text-left transition-colors",
                          selected
                            ? "border-brand bg-mint/60"
                            : "border-border/70 bg-card hover:bg-mint/40",
                        )}
                      >
                        <span className="flex items-center gap-1.5 text-xs font-bold text-ink">
                          <Icon className="size-3.5" />
                          {place.label}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {formatNumber(place.qty)} now
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              {placeHelp[to]}
            </p>
          </div>

          <div>
            <Label htmlFor="transfer-quantity">Quantity (units)</Label>
            <Input
              id="transfer-quantity"
              type="number"
              inputMode="numeric"
              step={1}
              min={1}
              className="mt-1.5 h-10 rounded-xl"
              aria-invalid={Boolean(errors.quantity)}
              {...register("quantity", { valueAsNumber: true })}
            />
            {errors.quantity?.message ? (
              <p
                className="mt-1 text-xs font-medium text-destructive"
                role="alert"
              >
                {errors.quantity.message}
              </p>
            ) : null}
          </div>

          <div className="flex items-center justify-between rounded-2xl border border-border bg-mint/50 px-4 py-3">
            <div>
              <p className="text-xs font-semibold text-muted-foreground">
                After the move
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Store {formatNumber(Math.max(0, nextStore))} · Selling{" "}
                {formatNumber(Math.max(0, nextSell))}
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-sm font-bold text-brand-strong">
              <ArrowLeftRight className="size-3.5" />
              {formatNumber(Math.max(0, nextStore + nextSell))}
            </span>
          </div>

          <DialogFooter className="rounded-b-[24px]">
            <Button
              type="button"
              variant="outline"
              className="rounded-full"
              onClick={() => onOpenChange(false)}
              disabled={transferStock.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="rounded-full bg-brand text-white hover:bg-brand-strong"
              disabled={transferStock.isPending || !product}
            >
              {transferStock.isPending ? "Moving…" : "Move stock"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
