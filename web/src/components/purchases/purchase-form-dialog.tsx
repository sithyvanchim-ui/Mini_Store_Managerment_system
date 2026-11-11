"use client";

import { useEffect, useMemo } from "react";
import {
  Controller,
  useFieldArray,
  useForm,
  useWatch,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { ApiError } from "@/lib/api";
import { formatKHR, formatNumber } from "@/lib/utils";
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
import { useCreatePurchase } from "@/hooks/use-purchases";
import type { Product, Supplier } from "@/types/api";

function localDateTimeInput(date = new Date()): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

const lineSchema = z.object({
  product_id: z.string().min(1, "Choose a product"),
  quantity: z
    .number({ error: "Enter a quantity" })
    .int("Quantity must be a whole number")
    .min(1, "Quantity must be at least 1"),
  unit_cost: z
    .number({ error: "Enter a unit cost" })
    .int("Unit cost must be a whole number of riel")
    .min(0, "Unit cost cannot be negative"),
});

const purchaseSchema = z
  .object({
    supplier_id: z.string().min(1, "Choose a supplier"),
    purchased_at: z
      .string()
      .min(1, "Choose the purchase date and time")
      .refine(
        (value) => !Number.isNaN(new Date(value).getTime()),
        "Enter a valid date and time",
      ),
    notes: z.string().trim().max(500, "Use 500 characters or fewer"),
    items: z.array(lineSchema).min(1, "Add at least one line item"),
  })
  .superRefine((values, ctx) => {
    const seen = new Map<string, number>();
    values.items.forEach((item, index) => {
      if (!item.product_id) return;
      const firstIndex = seen.get(item.product_id);
      if (firstIndex !== undefined) {
        ctx.addIssue({
          code: "custom",
          path: ["items", index, "product_id"],
          message: "This product is already on the purchase.",
        });
      } else {
        seen.set(item.product_id, index);
      }
    });
  });

type PurchaseFormValues = z.infer<typeof purchaseSchema>;

const defaultValues: PurchaseFormValues = {
  supplier_id: "",
  purchased_at: localDateTimeInput(),
  notes: "",
  items: [{ product_id: "", quantity: 1, unit_cost: 0 }],
};

interface PurchaseFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  suppliers: Supplier[];
  products: Product[];
}

export function PurchaseFormDialog({
  open,
  onOpenChange,
  suppliers,
  products,
}: PurchaseFormDialogProps) {
  const createPurchase = useCreatePurchase();
  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<PurchaseFormValues>({
    resolver: zodResolver(purchaseSchema),
    defaultValues,
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "items",
  });

  const watchedItems = useWatch({ control, name: "items" });
  const activeSuppliers = useMemo(
    () => suppliers.filter((supplier) => supplier.is_active),
    [suppliers],
  );
  const activeProducts = useMemo(
    () => products.filter((product) => product.is_active),
    [products],
  );
  const productById = useMemo(
    () => new Map(activeProducts.map((product) => [product.id, product])),
    [activeProducts],
  );

  useEffect(() => {
    if (!open) return;
    reset({ ...defaultValues, purchased_at: localDateTimeInput() });
  }, [open, reset]);

  const totals = useMemo(() => {
    const items = watchedItems ?? [];
    return items.reduce(
      (accumulator, item) => {
        const quantity =
          typeof item?.quantity === "number" && Number.isFinite(item.quantity)
            ? item.quantity
            : 0;
        const unitCost =
          typeof item?.unit_cost === "number" && Number.isFinite(item.unit_cost)
            ? item.unit_cost
            : 0;
        accumulator.quantity += quantity;
        accumulator.cost += quantity * unitCost;
        return accumulator;
      },
      { quantity: 0, cost: 0 },
    );
  }, [watchedItems]);

  const onSubmit = handleSubmit(async (values) => {
    try {
      await createPurchase.mutateAsync({
        supplier_id: values.supplier_id,
        purchased_at: new Date(values.purchased_at).toISOString(),
        notes: values.notes.trim() || undefined,
        items: values.items.map((item) => ({
          product_id: item.product_id,
          quantity: item.quantity,
          unit_cost: item.unit_cost,
        })),
      });
      toast.success("Purchase recorded", {
        description: `${formatNumber(totals.quantity)} units for ${formatKHR(
          totals.cost,
        )} added to stock.`,
      });
      onOpenChange(false);
      reset({ ...defaultValues, purchased_at: localDateTimeInput() });
    } catch (error) {
      toast.error("Could not record purchase", {
        description:
          error instanceof ApiError
            ? error.detail
            : "Check the line items and try again.",
      });
    }
  });

  const canSubmit =
    activeSuppliers.length > 0 &&
    activeProducts.length > 0 &&
    !createPurchase.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto rounded-[24px] sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl font-bold text-ink">
            New purchase
          </DialogTitle>
          <DialogDescription>
            Record a supplier delivery. Quantities are added to stock and a
            restock movement is written for each line.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-5" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="purchase-supplier">Supplier</Label>
              <Controller
                control={control}
                name="supplier_id"
                render={({ field }) => (
                  <Select
                    value={field.value || undefined}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger
                      id="purchase-supplier"
                      className="mt-1.5 h-10 w-full rounded-xl"
                      aria-invalid={Boolean(errors.supplier_id)}
                    >
                      <SelectValue placeholder="Choose a supplier" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {activeSuppliers.map((supplier) => (
                        <SelectItem key={supplier.id} value={supplier.id}>
                          {supplier.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.supplier_id?.message ? (
                <p className="mt-1 text-xs font-medium text-destructive">
                  {errors.supplier_id.message}
                </p>
              ) : activeSuppliers.length === 0 ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  Add an active supplier before recording a purchase.
                </p>
              ) : null}
            </div>

            <div>
              <Label htmlFor="purchase-date">Purchased at</Label>
              <Input
                id="purchase-date"
                type="datetime-local"
                className="mt-1.5 h-10 rounded-xl"
                aria-invalid={Boolean(errors.purchased_at)}
                {...register("purchased_at")}
              />
              {errors.purchased_at?.message ? (
                <p className="mt-1 text-xs font-medium text-destructive">
                  {errors.purchased_at.message}
                </p>
              ) : null}
            </div>
          </div>

          <div>
            <Label htmlFor="purchase-notes">Notes (optional)</Label>
            <Textarea
              id="purchase-notes"
              className="mt-1.5 min-h-16 rounded-xl"
              placeholder="e.g. Weekly restock from Thai market"
              {...register("notes")}
            />
            {errors.notes?.message ? (
              <p className="mt-1 text-xs font-medium text-destructive">
                {errors.notes.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-heading text-sm font-bold text-ink">
                  Line items
                </p>
                <p className="text-xs text-muted-foreground">
                  Choose a product, quantity, and the cost paid per unit.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-full"
                onClick={() =>
                  append({ product_id: "", quantity: 1, unit_cost: 0 })
                }
              >
                <Plus className="size-3.5" />
                Add line
              </Button>
            </div>

            <div className="space-y-3">
              {fields.map((field, index) => {
                const line = watchedItems?.[index];
                const lineQuantity =
                  typeof line?.quantity === "number" &&
                  Number.isFinite(line.quantity)
                    ? line.quantity
                    : 0;
                const lineUnitCost =
                  typeof line?.unit_cost === "number" &&
                  Number.isFinite(line.unit_cost)
                    ? line.unit_cost
                    : 0;
                const lineTotal = lineQuantity * lineUnitCost;
                const productError = errors.items?.[index]?.product_id?.message;
                const quantityError = errors.items?.[index]?.quantity?.message;
                const costError = errors.items?.[index]?.unit_cost?.message;

                return (
                  <div
                    key={field.id}
                    className="rounded-2xl border border-border bg-muted/15 p-3"
                  >
                    <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_105px_130px_110px_36px] md:items-start">
                      <div>
                        <Label
                          htmlFor={`purchase-product-${index}`}
                          className="text-xs text-muted-foreground"
                        >
                          Product
                        </Label>
                        <Controller
                          control={control}
                          name={`items.${index}.product_id`}
                          render={({ field: productField }) => (
                            <Select
                              value={productField.value || undefined}
                              onValueChange={(value) => {
                                productField.onChange(value);
                                const product = productById.get(value);
                                if (product) {
                                  setValue(
                                    `items.${index}.unit_cost`,
                                    product.cost_price,
                                    { shouldValidate: true, shouldDirty: true },
                                  );
                                }
                              }}
                            >
                              <SelectTrigger
                                id={`purchase-product-${index}`}
                                className="mt-1 h-10 w-full rounded-xl"
                                aria-invalid={Boolean(productError)}
                              >
                                <SelectValue placeholder="Choose a product" />
                              </SelectTrigger>
                              <SelectContent className="max-w-[min(90vw,28rem)] rounded-xl">
                                {activeProducts.map((product) => (
                                  <SelectItem
                                    key={product.id}
                                    value={product.id}
                                  >
                                    <span className="truncate">
                                      {product.name} · {product.code} ·{" "}
                                      {formatNumber(product.stock_qty)} in stock
                                    </span>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        />
                        {productError ? (
                          <p className="mt-1 text-xs font-medium text-destructive">
                            {productError}
                          </p>
                        ) : null}
                      </div>

                      <div>
                        <Label
                          htmlFor={`purchase-quantity-${index}`}
                          className="text-xs text-muted-foreground"
                        >
                          Quantity
                        </Label>
                        <Input
                          id={`purchase-quantity-${index}`}
                          type="number"
                          inputMode="numeric"
                          step={1}
                          min={1}
                          className="mt-1 h-10 rounded-xl"
                          aria-invalid={Boolean(quantityError)}
                          {...register(`items.${index}.quantity`, {
                            valueAsNumber: true,
                          })}
                        />
                        {quantityError ? (
                          <p className="mt-1 text-xs font-medium text-destructive">
                            {quantityError}
                          </p>
                        ) : null}
                      </div>

                      <div>
                        <Label
                          htmlFor={`purchase-cost-${index}`}
                          className="text-xs text-muted-foreground"
                        >
                          Unit cost (KHR)
                        </Label>
                        <Input
                          id={`purchase-cost-${index}`}
                          type="number"
                          inputMode="numeric"
                          step={1}
                          min={0}
                          className="mt-1 h-10 rounded-xl"
                          aria-invalid={Boolean(costError)}
                          {...register(`items.${index}.unit_cost`, {
                            valueAsNumber: true,
                          })}
                        />
                        {costError ? (
                          <p className="mt-1 text-xs font-medium text-destructive">
                            {costError}
                          </p>
                        ) : null}
                      </div>

                      <div>
                        <p className="text-xs text-muted-foreground">
                          Line total
                        </p>
                        <p className="mt-3 truncate text-sm font-bold tabular-nums text-ink">
                          {formatKHR(lineTotal)}
                        </p>
                      </div>

                      <div className="flex md:justify-end md:pt-6">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          className="rounded-full text-muted-foreground hover:text-destructive"
                          onClick={() => remove(index)}
                          disabled={fields.length === 1}
                          aria-label={`Remove line ${index + 1}`}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-2 rounded-2xl border border-border bg-mint/45 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm">
              <span className="text-muted-foreground">
                Total quantity{" "}
                <span className="font-bold tabular-nums text-ink">
                  {formatNumber(totals.quantity)}
                </span>
              </span>
              <span className="text-muted-foreground">
                Total cost{" "}
                <span className="font-bold tabular-nums text-brand-strong">
                  {formatKHR(totals.cost)}
                </span>
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Stock is updated when the purchase is saved.
            </p>
          </div>

          <DialogFooter className="rounded-b-[24px]">
            <Button
              type="button"
              variant="outline"
              className="rounded-full"
              onClick={() => onOpenChange(false)}
              disabled={createPurchase.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="rounded-full bg-brand text-white hover:bg-brand-strong"
              disabled={!canSubmit}
            >
              <Plus className="size-4" />
              {createPurchase.isPending ? "Recording…" : "Record purchase"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
