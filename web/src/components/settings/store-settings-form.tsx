"use client";

import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Lock, Save, Store } from "lucide-react";
import { toast } from "sonner";
import { ErrorState } from "@/components/shared/error-state";
import { SectionCard } from "@/components/shared/section-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useSettings, useUpdateSettings } from "@/hooks/use-settings";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";

const storeSchema = z.object({
  store_name: z
    .string()
    .trim()
    .min(1, "Store name is required")
    .max(80, "Keep it under 80 characters"),
  dorm_name: z
    .string()
    .trim()
    .min(1, "Dorm name is required")
    .max(80, "Keep it under 80 characters"),
  currency: z.enum(["KHR", "USD"]),
  low_stock_default: z
    .number()
    .int("Use a whole number")
    .min(0, "Cannot be negative")
    .max(100_000, "That threshold is too high"),
  receipt_footer: z
    .string()
    .max(280, "Keep the footer under 280 characters"),
});

type StoreValues = z.infer<typeof storeSchema>;

interface StoreSettingsFormProps {
  readOnly: boolean;
}

const inputClass =
  "h-11 rounded-2xl border-border bg-background/60 px-3.5 text-sm";

export function StoreSettingsForm({ readOnly }: StoreSettingsFormProps) {
  const settings = useSettings();
  const update = useUpdateSettings();

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<StoreValues>({
    resolver: zodResolver(storeSchema),
    defaultValues: {
      store_name: "",
      dorm_name: "",
      currency: "KHR",
      low_stock_default: 6,
      receipt_footer: "",
    },
  });

  useEffect(() => {
    if (!settings.data) return;
    reset({
      store_name: settings.data.store_name,
      dorm_name: settings.data.dorm_name,
      currency: settings.data.currency === "USD" ? "USD" : "KHR",
      low_stock_default: settings.data.low_stock_default,
      receipt_footer: settings.data.receipt_footer ?? "",
    });
  }, [settings.data, reset]);

  function onSubmit(values: StoreValues) {
    update.mutate(values, {
      onSuccess: () => {
        toast.success("Store settings saved", {
          description: "New receipts and alerts will use these details.",
        });
      },
      onError: (error) => {
        toast.error("Could not save settings", {
          description:
            error instanceof ApiError
              ? error.detail
              : "Check your connection and try again.",
        });
      },
    });
  }

  if (settings.isPending) {
    return (
      <SectionCard title="Store profile" description="Store details and receipt defaults">
        <div className="space-y-4" aria-hidden>
          <div className="grid gap-4 sm:grid-cols-2">
            <Skeleton className="h-16 rounded-2xl" />
            <Skeleton className="h-16 rounded-2xl" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Skeleton className="h-16 rounded-2xl" />
            <Skeleton className="h-16 rounded-2xl" />
          </div>
          <Skeleton className="h-28 w-full rounded-2xl" />
          <Skeleton className="h-10 w-36 rounded-full" />
        </div>
      </SectionCard>
    );
  }

  if (settings.isError || !settings.data) {
    return (
      <SectionCard title="Store profile">
        <ErrorState
          title="Settings unavailable"
          message="The store settings could not be loaded."
          onRetry={() => settings.refetch()}
        />
      </SectionCard>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <SectionCard
        title="Store profile"
        description="These details appear across the workspace and on printed receipts."
        action={
          <span className="inline-flex items-center gap-1.5 rounded-full bg-mint px-2.5 py-1 text-[10px] font-bold text-brand-strong">
            <Store className="size-3" />
            Block C
          </span>
        }
      >
        {readOnly ? (
          <div className="mb-4 flex items-start gap-2 rounded-2xl border border-border bg-muted/40 px-3.5 py-2.5 text-[11px] leading-5 text-muted-foreground">
            <Lock className="mt-0.5 size-3.5 shrink-0 text-brand" />
            <span>
              Store settings are read-only for staff. Ask an admin to make
              changes.
            </span>
          </div>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="store_name" className="text-xs font-bold text-ink">
              Store name
            </Label>
            <Input
              id="store_name"
              className={inputClass}
              disabled={readOnly}
              aria-invalid={Boolean(errors.store_name)}
              {...register("store_name")}
            />
            {errors.store_name ? (
              <p className="text-xs font-medium text-destructive">
                {errors.store_name.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="dorm_name" className="text-xs font-bold text-ink">
              Dorm name
            </Label>
            <Input
              id="dorm_name"
              className={inputClass}
              disabled={readOnly}
              aria-invalid={Boolean(errors.dorm_name)}
              {...register("dorm_name")}
            />
            {errors.dorm_name ? (
              <p className="text-xs font-medium text-destructive">
                {errors.dorm_name.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="currency" className="text-xs font-bold text-ink">
              Currency
            </Label>
            <Controller
              control={control}
              name="currency"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={readOnly}
                >
                  <SelectTrigger
                    id="currency"
                    className="h-11 w-full rounded-2xl border-border bg-background/60 px-3.5 text-sm"
                    aria-invalid={Boolean(errors.currency)}
                  >
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="KHR">KHR · Cambodian Riel</SelectItem>
                    <SelectItem value="USD">USD · US Dollar</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            {errors.currency ? (
              <p className="text-xs font-medium text-destructive">
                {errors.currency.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="low_stock_default"
              className="text-xs font-bold text-ink"
            >
              Default low-stock threshold
            </Label>
            <Input
              id="low_stock_default"
              type="number"
              min={0}
              step={1}
              inputMode="numeric"
              className={inputClass}
              disabled={readOnly}
              aria-invalid={Boolean(errors.low_stock_default)}
              {...register("low_stock_default", { valueAsNumber: true })}
            />
            {errors.low_stock_default ? (
              <p className="text-xs font-medium text-destructive">
                {errors.low_stock_default.message}
              </p>
            ) : (
              <p className="text-[11px] text-muted-foreground">
                New products start with this alert level.
              </p>
            )}
          </div>
        </div>

        <div className="mt-4 space-y-2">
          <Label htmlFor="receipt_footer" className="text-xs font-bold text-ink">
            Receipt footer
          </Label>
          <Textarea
            id="receipt_footer"
            rows={3}
            className={cn(
              "min-h-24 rounded-2xl border-border bg-background/60 px-3.5 py-3 text-sm",
            )}
            disabled={readOnly}
            aria-invalid={Boolean(errors.receipt_footer)}
            {...register("receipt_footer")}
          />
          {errors.receipt_footer ? (
            <p className="text-xs font-medium text-destructive">
              {errors.receipt_footer.message}
            </p>
          ) : (
            <p className="text-[11px] text-muted-foreground">
              Shown at the bottom of every printed receipt.
            </p>
          )}
        </div>

        {!readOnly ? (
          <div className="mt-5 flex items-center justify-end gap-3 border-t border-border/70 pt-4">
            <Button
              type="submit"
              className="h-10 rounded-full px-5 text-xs font-bold"
              disabled={update.isPending}
            >
              {update.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              {update.isPending ? "Saving…" : "Save changes"}
            </Button>
          </div>
        ) : null}
      </SectionCard>
    </form>
  );
}
