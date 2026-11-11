"use client";

import Link from "next/link";
import { ArrowRight, Refrigerator } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDashboardSummary } from "@/hooks/use-dashboard";
import { formatNumber } from "@/lib/utils";

export function RestockPromo() {
  const summary = useDashboardSummary();
  const lowStock = summary.data?.low_stock_count ?? 0;
  const outOfStock = summary.data?.out_of_stock_count ?? 0;

  return (
    <section className="relative overflow-hidden rounded-[28px] bg-gradient-to-r from-brand-strong via-brand to-brand-strong p-6 text-white shadow-[0_24px_60px_rgba(10,143,128,0.24)] sm:p-7">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-20 size-64 rounded-full bg-white/10"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-24 right-24 size-56 rounded-full bg-white/[0.07]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute right-6 top-1/2 hidden -translate-y-1/2 rounded-[26px] border border-white/20 bg-white/10 p-5 lg:block"
      >
        <Refrigerator className="size-14 text-white/80" strokeWidth={1.4} />
      </div>

      <div className="relative z-10 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between sm:pr-24 lg:pr-40">
        <div className="max-w-2xl">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white/85">
            <span className="size-1.5 rounded-full bg-white" />
            Stock watch
          </span>
          <h2 className="mt-2.5 font-heading text-2xl font-extrabold tracking-tight sm:text-[28px]">
            Keep the fridge stocked
          </h2>
          <p className="mt-1.5 max-w-xl text-sm leading-6 text-white/80">
            {summary.data && (lowStock > 0 || outOfStock > 0)
              ? `${formatNumber(lowStock)} low-stock and ${formatNumber(
                  outOfStock,
                )} out-of-stock items need attention before the evening rush.`
              : "Reorder low-stock items before the evening rush so nobody leaves empty-handed."}
          </p>
        </div>
        <Button
          asChild
          className="h-10 shrink-0 rounded-full bg-white px-5 text-xs font-bold text-brand-strong shadow-[0_12px_26px_rgba(5,70,60,0.2)] hover:bg-white/90"
        >
          <Link href="/purchases">
            Restock now
            <ArrowRight className="size-4" />
          </Link>
        </Button>
      </div>
    </section>
  );
}
