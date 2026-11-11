import {
  BadgeCheck,
  Boxes,
  CircleDollarSign,
  Refrigerator,
  ScanLine,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";

const valueProps = [
  {
    icon: Boxes,
    title: "Live stock, every sale",
    description: "Fridge and shelf counts update the moment a sale is rung up.",
  },
  {
    icon: ScanLine,
    title: "Fast counter POS",
    description: "Search a SKU, confirm the ABA transfer, and print the total in seconds.",
  },
  {
    icon: Wallet,
    title: "Daily ABA close",
    description: "ABA sales reconcile in one calm end-of-day check.",
  },
];

const shelfRows = [
  ["h-8 bg-brand/25", "h-10 bg-lavender/45", "h-7 bg-warning/35", "h-9 bg-mint"],
  ["h-9 bg-lavender/40", "h-7 bg-brand/20", "h-10 bg-warning/30", "h-8 bg-lavender/35"],
  ["h-7 bg-warning/30", "h-9 bg-mint", "h-8 bg-brand/25", "h-10 bg-lavender/45"],
];

export function AuthBrandPanel({ className }: { className?: string }) {
  return (
    <aside
      className={cn(
        "relative flex flex-col overflow-hidden rounded-[32px] bg-gradient-to-br from-brand-strong via-brand to-brand-strong p-8 text-white shadow-[0_30px_80px_rgba(10,143,128,0.35)] lg:min-h-[calc(100vh-40px)] lg:p-10 xl:p-12",
        className,
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 -top-24 size-80 rounded-full bg-white/10"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-28 -left-20 size-96 rounded-full bg-white/[0.07]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute right-10 top-1/3 size-24 rounded-full border-[18px] border-white/10"
      />

      <div className="relative z-10 flex items-center gap-3">
        <span className="flex size-11 items-center justify-center rounded-2xl border border-white/25 bg-white/15 backdrop-blur">
          <Refrigerator className="size-5" strokeWidth={2.2} />
        </span>
        <span>
          <span className="block font-heading text-lg font-extrabold leading-tight tracking-tight">
            MiniStore
          </span>
          <span className="block text-[10px] font-bold uppercase tracking-[0.2em] text-white/65">
            Dorm operations
          </span>
        </span>
      </div>

      <div className="relative z-10 mt-10 max-w-lg xl:mt-12">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-white/85">
          <BadgeCheck className="size-3.5" />
          Block C · Dorm fridge
        </span>
        <h1 className="mt-5 text-balance font-heading text-[34px] font-extrabold leading-[1.08] tracking-tight sm:text-[40px] xl:text-[46px]">
          Run the dorm fridge without the guesswork.
        </h1>
        <p className="mt-4 max-w-md text-sm leading-6 text-white/80">
          One calm workspace for stock, sales, restocking, and the daily ABA
          count — built for a busy student store.
        </p>
      </div>

      <div className="relative z-10 mt-8 grid gap-3 xl:mt-9">
        {valueProps.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.title}
              className="flex items-start gap-3 rounded-2xl border border-white/12 bg-white/[0.08] px-3.5 py-3 backdrop-blur-sm"
            >
              <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl bg-white/15 text-white">
                <Icon className="size-4" />
              </span>
              <span>
                <span className="block text-[13px] font-bold text-white">
                  {item.title}
                </span>
                <span className="mt-0.5 block text-[11px] leading-5 text-white/70">
                  {item.description}
                </span>
              </span>
            </div>
          );
        })}
      </div>

      <div className="relative z-10 mt-8 flex flex-1 items-end xl:mt-10">
        <div className="w-full">
          <div
            aria-hidden
            className="relative mx-auto mb-6 w-full max-w-[320px] xl:max-w-[340px]"
          >
            <div className="absolute -inset-6 rounded-[40px] bg-white/10 blur-2xl" />
            <div className="relative rounded-[26px] border border-white/30 bg-white/15 p-2.5 backdrop-blur-sm">
              <div className="rounded-[20px] bg-card p-3 shadow-[0_24px_50px_rgba(5,70,60,0.35)]">
                <div className="flex items-center justify-between border-b border-border/70 pb-2">
                  <span className="font-heading text-[9px] font-extrabold uppercase tracking-[0.16em] text-ink">
                    Fridge 01 · Block C
                  </span>
                  <span className="flex items-center gap-1 text-[9px] font-bold text-brand-strong">
                    <span className="size-1.5 rounded-full bg-success" />
                    LIVE
                  </span>
                </div>
                <div className="mt-2.5 space-y-2">
                  {shelfRows.map((row, rowIndex) => (
                    <div
                      key={rowIndex}
                      className="rounded-xl border border-border/60 bg-canvas/60 px-2 pb-1.5 pt-2"
                    >
                      <div className="flex items-end gap-1.5">
                        {row.map((tone, itemIndex) => (
                          <span
                            key={itemIndex}
                            className={cn("flex-1 rounded-[4px]", tone)}
                          />
                        ))}
                      </div>
                      <span className="mt-1.5 block h-px bg-border" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <span className="absolute -right-4 top-12 inline-flex items-center gap-1.5 rounded-full bg-card px-2.5 py-1.5 text-[9px] font-bold text-ink shadow-[0_16px_36px_rgba(5,70,60,0.28)]">
              <span className="size-1.5 rounded-full bg-warning" />
              2 low stock
            </span>
            <span className="absolute -left-4 bottom-12 inline-flex items-center gap-1.5 rounded-full bg-card px-2.5 py-1.5 text-[9px] font-bold text-brand-strong shadow-[0_16px_36px_rgba(5,70,60,0.28)]">
              <CircleDollarSign className="size-3" />
              ABA ready
            </span>
          </div>

          <dl className="grid grid-cols-3 divide-x divide-white/15 rounded-2xl border border-white/15 bg-white/[0.08] px-2 py-3 backdrop-blur-sm">
            {[
              { value: "KHR", label: "Integer riel totals" },
              { value: "ABA", label: "Every payment" },
              { value: "Live", label: "Stock ledger" },
            ].map((stat) => (
              <div key={stat.label} className="px-3">
                <dt className="font-heading text-sm font-extrabold tracking-tight text-white">
                  {stat.value}
                </dt>
                <dd className="mt-0.5 text-[9px] font-semibold uppercase tracking-[0.1em] text-white/60">
                  {stat.label}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </aside>
  );
}

export function AuthMobileHeader() {
  return (
    <div className="mb-5 flex items-center justify-between gap-3 rounded-[24px] border border-border/70 bg-card px-4 py-3 shadow-[0_10px_30px_rgba(20,60,50,0.06)] lg:hidden">
      <div className="flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-2xl bg-primary text-white shadow-[0_10px_24px_rgba(15,181,160,0.3)]">
          <Refrigerator className="size-5" strokeWidth={2.2} />
        </span>
        <span>
          <span className="block font-heading text-base font-extrabold leading-tight tracking-tight text-ink">
            MiniStore
          </span>
          <span className="block text-[9px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
            Dorm operations
          </span>
        </span>
      </div>
      <span className="inline-flex items-center gap-1.5 rounded-full bg-mint px-2.5 py-1 text-[10px] font-bold text-brand-strong">
        <span className="size-1.5 rounded-full bg-success" />
        Block C
      </span>
    </div>
  );
}
