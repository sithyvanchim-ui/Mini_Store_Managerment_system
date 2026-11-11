"use client";

import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { ArrowLeftRight } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAdjustStock } from "@/hooks/use-products";
import type { Product } from "@/types/api";

const adjustSchema = z.object({
  type: z.enum(["restock", "adjustment", "waste"]),
  quantity: z
    .number({ error: "Enter a quantity" })
    .int("Quantity must be a whole number")
    .min(1, "Quantity must be at least 1"),
  note: z.string().trim().max(300, "Use 300 characters or fewer"),
});

type AdjustFormValues = z.infer<typeof adjustSchema>;

const typeHelp: Record<AdjustFormValues["type"], string> = {
  restock: "Adds units received from a supplier to the current stock.",
  adjustment: "Adds a counted correction to the current stock.",
  waste: "Removes damaged or expired units from the current stock.",
};

interface AdjustStockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
}

export function AdjustStockDialog({
  open,
  onOpenChange,
  product,
}: AdjustStockDialogProps) {
  const adjustStock = useAdjustStock();
  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    setError,
    formState: { errors },
  } = useForm<AdjustFormValues>({
    resolver: zodResolver(adjustSchema),
    defaultValues: { type: "restock", quantity: 1, note: "" },
  });

  useEffect(() => {
    if (!open) return;
    reset({ type: "restock", quantity: 1, note: "" });
  }, [open, product?.id, reset]);

  const type = watch("type");
  const quantity = watch("quantity");
  const safeQuantity = Number.isFinite(quantity) ? quantity : 0;
  const currentStock = product?.stock_qty ?? 0;
  const nextStock =
    type === "waste" ? currentStock - safeQuantity : currentStock + safeQuantity;
  const previewStock = Math.max(0, nextStock);

  const onSubmit = handleSubmit(async (values) => {
    if (!product) return;
    if (values.type === "waste" && values.quantity > product.stock_qty) {
      setError("quantity", {
        type: "manual",
        message: `Only ${formatNumber(product.stock_qty)} units are on hand.`,
      });
      return;
    }

    try {
      const updated = await adjustStock.mutateAsync({
        id: product.id,
        payload: {
          type: values.type,
          quantity: values.quantity,
          note: values.note.trim() || undefined,
        },
      });
      toast.success("Stock adjusted", {
        description: `${updated.name} now has ${formatNumber(updated.stock_qty)} units.`,
      });
      onOpenChange(false);
    } catch (error) {
      toast.error("Could not adjust stock", {
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
            Adjust stock
          </DialogTitle>
          <DialogDescription>
            {product
              ? `${product.name} · ${product.code} — ${formatNumber(product.stock_qty)} units on hand.`
              : "Record a stock movement."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <div>
            <Label htmlFor="adjust-type">Movement type</Label>
            <Controller
              control={control}
              name="type"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger
                    id="adjust-type"
                    className="mt-1.5 h-10 w-full rounded-xl"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="restock">Restock</SelectItem>
                    <SelectItem value="adjustment">Adjustment</SelectItem>
                    <SelectItem value="waste">Waste</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              {typeHelp[type]}
            </p>
          </div>

          <div>
            <Label htmlFor="adjust-quantity">Quantity (units)</Label>
            <Input
              id="adjust-quantity"
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

          <div
            className={cn(
              "flex items-center justify-between rounded-2xl border px-4 py-3",
              previewStock <= 0
                ? "border-destructive/25 bg-destructive/[0.06]"
                : "border-border bg-mint/50",
            )}
            aria-live="polite"
          >
            <div>
              <p className="text-xs font-semibold text-muted-foreground">
                Resulting stock
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {formatNumber(currentStock)} → {formatNumber(previewStock)} units
              </p>
            </div>
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-bold",
                previewStock <= 0
                  ? "bg-destructive/10 text-destructive"
                  : "bg-white text-brand-strong",
              )}
            >
              <ArrowLeftRight className="size-3.5" />
              {formatNumber(previewStock)}
            </span>
          </div>

          <div>
            <Label htmlFor="adjust-note">Note (optional)</Label>
            <Textarea
              id="adjust-note"
              className="mt-1.5 min-h-20 rounded-xl"
              placeholder="e.g. Weekly supplier delivery"
              {...register("note")}
            />
            {errors.note?.message ? (
              <p
                className="mt-1 text-xs font-medium text-destructive"
                role="alert"
              >
                {errors.note.message}
              </p>
            ) : null}
          </div>

          <DialogFooter className="rounded-b-[24px]">
            <Button
              type="button"
              variant="outline"
              className="rounded-full"
              onClick={() => onOpenChange(false)}
              disabled={adjustStock.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="rounded-full bg-brand text-white hover:bg-brand-strong"
              disabled={adjustStock.isPending || !product}
            >
              {adjustStock.isPending ? "Saving…" : "Record movement"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
