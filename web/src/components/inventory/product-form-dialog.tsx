"use client";

import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { PackagePlus } from "lucide-react";
import { ApiError } from "@/lib/api";
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
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useCreateProduct,
  useUpdateProduct,
} from "@/hooks/use-products";
import type { Category, Product, ProductLocation } from "@/types/api";

const productSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, "Product code is required")
    .max(32, "Use 32 characters or fewer"),
  name: z
    .string()
    .trim()
    .min(1, "Product name is required")
    .max(120, "Use 120 characters or fewer"),
  category_id: z.string().min(1, "Choose a category"),
  package: z
    .string()
    .trim()
    .min(1, "Package is required")
    .max(40, "Use 40 characters or fewer"),
  cost_price: z
    .number({ error: "Enter the cost price" })
    .int("Cost must be a whole number of riel")
    .min(0, "Cost cannot be negative"),
  selling_price: z
    .number({ error: "Enter the selling price" })
    .int("Price must be a whole number of riel")
    .min(0, "Price cannot be negative"),
  stock_qty: z
    .number({ error: "Enter the opening stock" })
    .int("Stock must be a whole number")
    .min(0, "Stock cannot be negative"),
  low_stock_threshold: z
    .number({ error: "Enter a threshold" })
    .int("Threshold must be a whole number")
    .min(0, "Threshold cannot be negative"),
  location: z.enum(["fridge", "shelf"]),
  slot_code: z.string().trim().max(20, "Use 20 characters or fewer"),
  is_active: z.boolean(),
});

type ProductFormValues = z.infer<typeof productSchema>;

const emptyValues: ProductFormValues = {
  code: "",
  name: "",
  category_id: "",
  package: "",
  cost_price: 0,
  selling_price: 0,
  stock_qty: 0,
  low_stock_threshold: 5,
  location: "fridge",
  slot_code: "",
  is_active: true,
};

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="mt-1 text-xs font-medium text-destructive" role="alert">
      {message}
    </p>
  );
}

interface ProductFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: Product | null;
  categories: Category[];
}

export function ProductFormDialog({
  open,
  onOpenChange,
  product,
  categories,
}: ProductFormDialogProps) {
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const isEditing = Boolean(product);
  const isPending = createProduct.isPending || updateProduct.isPending;

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: emptyValues,
  });

  useEffect(() => {
    if (!open) return;
    reset(
      product
        ? {
            code: product.code,
            name: product.name,
            category_id: product.category_id,
            package: product.package,
            cost_price: product.cost_price,
            selling_price: product.selling_price,
            stock_qty: product.stock_qty,
            low_stock_threshold: product.low_stock_threshold,
            location: product.location,
            slot_code: product.slot_code ?? "",
            is_active: product.is_active,
          }
        : emptyValues,
    );
  }, [open, product, reset]);

  const onSubmit = handleSubmit(async (values) => {
    const payload = {
      code: values.code.trim().toUpperCase(),
      name: values.name.trim(),
      category_id: values.category_id,
      package: values.package.trim(),
      cost_price: values.cost_price,
      selling_price: values.selling_price,
      low_stock_threshold: values.low_stock_threshold,
      location: values.location as ProductLocation,
      slot_code: values.slot_code.trim() || null,
      is_active: values.is_active,
    };

    try {
      if (product) {
        await updateProduct.mutateAsync({ id: product.id, payload });
        toast.success("Product updated", {
          description: `${payload.name} was saved.`,
        });
      } else {
        await createProduct.mutateAsync({
          ...payload,
          stock_qty: values.stock_qty,
        });
        toast.success("Product added", {
          description: `${payload.name} is now in the catalogue.`,
        });
      }
      onOpenChange(false);
    } catch (error) {
      toast.error(
        isEditing ? "Could not update product" : "Could not add product",
        {
          description:
            error instanceof ApiError
              ? error.detail
              : "Check the form and try again.",
        },
      );
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto rounded-[24px] sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl font-bold text-ink">
            {isEditing ? "Edit product" : "Add product"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update catalogue details. Use Adjust stock to change the quantity on hand."
              : "Create a new catalogue item and record its opening stock."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-5" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="product-code">Product code</Label>
              <Input
                id="product-code"
                className="mt-1.5 h-10 rounded-xl uppercase"
                placeholder="DRK-1001"
                autoComplete="off"
                aria-invalid={Boolean(errors.code)}
                {...register("code")}
              />
              <FieldError message={errors.code?.message} />
            </div>
            <div>
              <Label htmlFor="product-name">Name</Label>
              <Input
                id="product-name"
                className="mt-1.5 h-10 rounded-xl"
                placeholder="Kulen (Big)"
                autoComplete="off"
                aria-invalid={Boolean(errors.name)}
                {...register("name")}
              />
              <FieldError message={errors.name?.message} />
            </div>

            <div>
              <Label htmlFor="product-category">Category</Label>
              <Controller
                control={control}
                name="category_id"
                render={({ field }) => (
                  <Select
                    value={field.value || undefined}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger
                      id="product-category"
                      className="mt-1.5 h-10 w-full rounded-xl"
                      aria-invalid={Boolean(errors.category_id)}
                    >
                      <SelectValue placeholder="Choose a category" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <FieldError message={errors.category_id?.message} />
            </div>
            <div>
              <Label htmlFor="product-package">Package</Label>
              <Input
                id="product-package"
                className="mt-1.5 h-10 rounded-xl"
                placeholder="Bottle"
                autoComplete="off"
                aria-invalid={Boolean(errors.package)}
                {...register("package")}
              />
              <FieldError message={errors.package?.message} />
            </div>

            <div>
              <Label htmlFor="product-cost">Cost price (KHR)</Label>
              <Input
                id="product-cost"
                type="number"
                inputMode="numeric"
                step={1}
                min={0}
                className="mt-1.5 h-10 rounded-xl"
                aria-invalid={Boolean(errors.cost_price)}
                {...register("cost_price", { valueAsNumber: true })}
              />
              <FieldError message={errors.cost_price?.message} />
            </div>
            <div>
              <Label htmlFor="product-selling">Selling price (KHR)</Label>
              <Input
                id="product-selling"
                type="number"
                inputMode="numeric"
                step={1}
                min={0}
                className="mt-1.5 h-10 rounded-xl"
                aria-invalid={Boolean(errors.selling_price)}
                {...register("selling_price", { valueAsNumber: true })}
              />
              <FieldError message={errors.selling_price?.message} />
            </div>

            <div>
              <Label htmlFor="product-stock">
                {isEditing ? "Current stock" : "Opening stock"}
              </Label>
              {isEditing ? (
                <>
                  <Input
                    id="product-stock"
                    className="mt-1.5 h-10 rounded-xl bg-muted/50"
                    value={product?.stock_qty ?? 0}
                    disabled
                    readOnly
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Stock is read-only here. Use Adjust stock to record a change.
                  </p>
                </>
              ) : (
                <>
                  <Input
                    id="product-stock"
                    type="number"
                    inputMode="numeric"
                    step={1}
                    min={0}
                    className="mt-1.5 h-10 rounded-xl"
                    aria-invalid={Boolean(errors.stock_qty)}
                    {...register("stock_qty", { valueAsNumber: true })}
                  />
                  <FieldError message={errors.stock_qty?.message} />
                </>
              )}
            </div>
            <div>
              <Label htmlFor="product-threshold">Low stock threshold</Label>
              <Input
                id="product-threshold"
                type="number"
                inputMode="numeric"
                step={1}
                min={0}
                className="mt-1.5 h-10 rounded-xl"
                aria-invalid={Boolean(errors.low_stock_threshold)}
                {...register("low_stock_threshold", { valueAsNumber: true })}
              />
              <FieldError message={errors.low_stock_threshold?.message} />
            </div>

            <div>
              <Label htmlFor="product-location">Location</Label>
              <Controller
                control={control}
                name="location"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger
                      id="product-location"
                      className="mt-1.5 h-10 w-full rounded-xl"
                    >
                      <SelectValue placeholder="Choose a location" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="fridge">Fridge</SelectItem>
                      <SelectItem value="shelf">Shelf</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              <FieldError message={errors.location?.message} />
            </div>
            <div>
              <Label htmlFor="product-slot">Slot code (optional)</Label>
              <Input
                id="product-slot"
                className="mt-1.5 h-10 rounded-xl"
                placeholder="F1-01"
                autoComplete="off"
                aria-invalid={Boolean(errors.slot_code)}
                {...register("slot_code")}
              />
              <FieldError message={errors.slot_code?.message} />
            </div>
          </div>

          <Controller
            control={control}
            name="is_active"
            render={({ field }) => (
              <div className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-muted/20 px-4 py-3">
                <div>
                  <Label htmlFor="product-active">Active in the catalogue</Label>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Inactive products stay in history but are hidden from selling.
                  </p>
                </div>
                <Switch
                  id="product-active"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </div>
            )}
          />

          <DialogFooter className="rounded-b-[24px]">
            <Button
              type="button"
              variant="outline"
              className="rounded-full"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="rounded-full bg-brand text-white hover:bg-brand-strong"
              disabled={isPending}
            >
              <PackagePlus className="size-4" />
              {isPending
                ? "Saving…"
                : isEditing
                  ? "Save changes"
                  : "Add product"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
