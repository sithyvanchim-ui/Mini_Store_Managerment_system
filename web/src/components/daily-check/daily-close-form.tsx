"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ArrowDownRight,
  ArrowUpRight,
  ClipboardCheck,
  Loader2,
  Save,
} from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { ErrorState } from "@/components/shared/error-state";
import { SectionCard } from "@/components/shared/section-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useSaveDailyClose, useTodayDailyClose } from "@/hooks/use-daily-close";
import { ApiError } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { cn, formatKHR, formatDate, todayISO } from "@/lib/utils";

const closeSchema = z.object({
  aba_balance: z
    .number({ error: "Enter the ABA wallet balance" })
    .int("Use whole riel")
    .min(0, "Cannot be negative"),
  expenses: z
    .number({ error: "Enter expenses for the day" })
    .int("Use whole riel")
    .min(0, "Cannot be negative"),
  notes: z.string().max(280, "Keep the note under 280 characters"),
});

type CloseValues = z.infer<typeof closeSchema>;

const inputClass =
  "h-11 rounded-2xl border-border bg-background/60 px-3.5 text-sm tabular-nums";

interface SummaryLineProps {
  label: string;
  value: string;
  emphasis?: boolean;
  tone?: "positive" | "negative" | "neutral";
}

function SummaryLine({ label, value, emphasis, tone }: SummaryLineProps) {
  return (
    <div className="flex items-center justify-between gap-4 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={cn(
          "font-semibold tabular-nums",
          emphasis ? "text-sm font-extrabold text-ink" : "text-ink",
          tone === "positive" && "text-[#0d7a5b]",
          tone === "negative" && "text-destructive",
        )}
      >
        {value}
      </span>
    </div>
  );
}

export function DailyCloseForm() {
  const preview = useTodayDailyClose();
  const save = useSaveDailyClose();
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<CloseValues>({
    resolver: zodResolver(closeSchema),
    defaultValues: {
      aba_balance: 0,
      expenses: 0,
      notes: "",
    },
  });

  useEffect(() => {
    const data = preview.data;
    if (!data) return;

    const existing = data.existing_close;
    reset({
      aba_balance: existing && existing.aba_balance !== null ? existing.aba_balance : 0,
      expenses: data.expenses,
      notes: existing?.notes ?? "",
    });
  }, [preview.data, reset]);

  const abaBalance = watch("aba_balance") || 0;
  const expenses = watch("expenses") || 0;

  if (preview.isPending) {
    return (
      <SectionCard
        title="Close the day"
        description="Reconciliation for today"
      >
        <div className="space-y-4" aria-hidden>
          <div className="space-y-2">
            <Skeleton className="h-12 rounded-2xl" />
            <Skeleton className="h-12 rounded-2xl" />
            <Skeleton className="h-12 rounded-2xl" />
          </div>
          <Skeleton className="h-28 w-full rounded-2xl" />
          <Skeleton className="h-10 w-40 rounded-full" />
        </div>
      </SectionCard>
    );
  }

  if (preview.isError || !preview.data) {
    return (
      <SectionCard title="Close the day" description="Reconciliation for today">
        <ErrorState
          title="Today's preview is unavailable"
          message="The reconciliation numbers could not be loaded. Check the API and try again."
          onRetry={() => void preview.refetch()}
        />
      </SectionCard>
    );
  }

  const data = preview.data;
  const expectedAba = data.aba_sales - expenses;
  const variance = abaBalance - expectedAba;

  function onSubmit(values: CloseValues) {
    const businessDate = data.business_date || todayISO();
    save.mutate(
      {
        business_date: businessDate,
        aba_balance: values.aba_balance,
        expenses: values.expenses,
        notes: values.notes.trim() ? values.notes.trim() : undefined,
      },
      {
        onSuccess: () => {
          void queryClient.invalidateQueries({
            queryKey: queryKeys.dailyClose.all,
          });
          void queryClient.invalidateQueries({
            queryKey: queryKeys.dashboard.all,
          });
          toast.success("Day closed", {
            description: `Reconciliation saved for ${formatDate(
              businessDate,
              "MMMM d, yyyy",
            )}. You can submit again to update this date.`,
          });
        },
        onError: (error) => {
          toast.error("Could not save the daily close", {
            description:
              error instanceof ApiError
                ? error.detail
                : "Check the numbers and try again.",
          });
        },
      },
    );
  }

  return (
    <SectionCard
      title="Close the day"
      description={`ABA reconciliation for ${formatDate(
        data.business_date,
        "MMMM d, yyyy",
      )}.`}
      action={
        <span className="inline-flex items-center gap-1.5 rounded-full bg-mint px-2.5 py-1 text-[10px] font-bold text-brand-strong">
          <ClipboardCheck className="size-3" />
          {data.existing_close ? "Reconciliation on file" : "Not closed yet"}
        </span>
      }
    >
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="grid gap-5 lg:grid-cols-[1fr_280px]"
      >
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="aba_balance" className="text-xs font-bold text-ink">
                ABA wallet balance
              </Label>
              <Input
                id="aba_balance"
                type="number"
                min={0}
                step={1}
                inputMode="numeric"
                className={inputClass}
                aria-invalid={Boolean(errors.aba_balance)}
                {...register("aba_balance", { valueAsNumber: true })}
              />
              <p className="text-[11px] text-muted-foreground">
                What the ABA wallet holds right now.
              </p>
              {errors.aba_balance ? (
                <p className="text-xs font-medium text-destructive">
                  {errors.aba_balance.message}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="expenses" className="text-xs font-bold text-ink">
                Expenses paid from ABA
              </Label>
              <Input
                id="expenses"
                type="number"
                min={0}
                step={1}
                inputMode="numeric"
                className={inputClass}
                aria-invalid={Boolean(errors.expenses)}
                {...register("expenses", { valueAsNumber: true })}
              />
              <p className="text-[11px] text-muted-foreground">
                Money sent out during the day (supplies, ice, …).
              </p>
              {errors.expenses ? (
                <p className="text-xs font-medium text-destructive">
                  {errors.expenses.message}
                </p>
              ) : null}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes" className="text-xs font-bold text-ink">
              Notes
            </Label>
            <Textarea
              id="notes"
              rows={3}
              className="min-h-24 rounded-2xl border-border bg-background/60 px-3.5 py-3 text-sm"
              placeholder="Anything unusual today — a short note helps the audit trail."
              aria-invalid={Boolean(errors.notes)}
              {...register("notes")}
            />
            {errors.notes ? (
              <p className="text-xs font-medium text-destructive">
                {errors.notes.message}
              </p>
            ) : null}
          </div>
        </div>

        <aside className="space-y-4 rounded-3xl border border-border bg-muted/40 p-4">
          <SummaryLine label="ABA sales" value={formatKHR(data.aba_sales)} emphasis />
          <SummaryLine label="Gross profit" value={formatKHR(data.gross_profit)} />
          <div className="border-t border-border/70 pt-3">
            <SummaryLine
              label="Expected ABA balance"
              value={formatKHR(expectedAba)}
              emphasis
            />
            <p className="mt-1 text-[11px] leading-4 text-muted-foreground">
              ABA sales − expenses.
            </p>
          </div>
          <div className="border-t border-border/70 pt-3">
            <div className="flex items-center justify-between gap-4 text-xs">
              <span className="text-muted-foreground">Variance</span>
              <span
                className={cn(
                  "inline-flex items-center gap-1 text-sm font-extrabold tabular-nums",
                  variance === 0
                    ? "text-[#0d7a5b]"
                    : variance > 0
                      ? "text-brand-strong"
                      : "text-destructive",
                )}
              >
                {variance === 0 ? (
                  null
                ) : variance > 0 ? (
                  <ArrowUpRight className="size-3.5" />
                ) : (
                  <ArrowDownRight className="size-3.5" />
                )}
                {formatKHR(variance)}
              </span>
            </div>
            <p className="mt-1 text-[11px] leading-4 text-muted-foreground">
              Wallet balance − expected balance.
            </p>
          </div>

          <div className="border-t border-border/70 pt-4">
            <Button
              type="submit"
              className="h-10 w-full rounded-full text-xs font-bold"
              disabled={save.isPending}
            >
              {save.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              {data.existing_close ? "Update close" : "Close the day"}
            </Button>
          </div>
        </aside>
      </form>
    </SectionCard>
  );
}
