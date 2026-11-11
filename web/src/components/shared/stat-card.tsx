import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type StatTone = "brand" | "lavender" | "warning" | "danger" | "blue";

const toneStyles: Record<StatTone, { icon: string; curve: string; dot: string }> = {
  brand: {
    icon: "bg-mint text-brand-strong",
    curve: "border-mint",
    dot: "bg-brand",
  },
  lavender: {
    icon: "bg-[#EEF0FE] text-[#5B66D9]",
    curve: "border-[#EEF0FE]",
    dot: "bg-[#7C86EA]",
  },
  warning: {
    icon: "bg-[#FEF5E5] text-[#B37A16]",
    curve: "border-[#FEF5E5]",
    dot: "bg-warning",
  },
  danger: {
    icon: "bg-[#FDECEC] text-destructive",
    curve: "border-[#FDECEC]",
    dot: "bg-destructive",
  },
  blue: {
    icon: "bg-[#EAF5FD] text-[#2E86BD]",
    curve: "border-[#EAF5FD]",
    dot: "bg-[#54A8DE]",
  },
};

interface StatCardProps {
  label: string;
  value: string;
  icon: ReactNode;
  tone?: StatTone;
  trend?: string;
  trendLabel?: string;
  hint?: string;
  className?: string;
  footer?: ReactNode;
}

export function StatCard({
  label,
  value,
  icon,
  tone = "brand",
  trend,
  trendLabel,
  hint,
  className,
  footer,
}: StatCardProps) {
  const styles = toneStyles[tone];
  const isNegative = trend?.startsWith("-");

  return (
    <div
      className={cn(
        "card-surface animate-fade-up relative overflow-hidden p-5",
        className,
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute -bottom-16 -right-14 size-44 rounded-full border-[18px]",
          styles.curve,
        )}
      />
      <div
        className={cn(
          "pointer-events-none absolute -bottom-7 -right-5 size-24 rounded-full border-[12px] opacity-60",
          styles.curve,
        )}
      />
      <div className="relative z-10">
        <div className="flex items-start justify-between gap-3">
          <span
            className={cn(
              "flex size-10 items-center justify-center rounded-2xl [&_svg]:size-5",
              styles.icon,
            )}
          >
            {icon}
          </span>
          {trend ? (
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-bold",
                isNegative
                  ? "bg-destructive/10 text-destructive"
                  : "bg-success/10 text-[#0d7a5b]",
              )}
            >
              <span className={cn("size-1.5 rounded-full", styles.dot)} />
              {trend}
            </span>
          ) : null}
        </div>
        <p className="mt-4 text-[13px] font-semibold text-muted-foreground">
          {label}
        </p>
        <p className="mt-1 font-heading text-4xl font-extrabold tracking-tight text-ink">
          {value}
        </p>
        {trend || trendLabel || hint ? (
          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
            {trend && trendLabel ? (
              <span className="font-semibold text-brand-strong">{trendLabel}</span>
            ) : null}
            {hint ? <span className="text-muted-foreground">{hint}</span> : null}
          </div>
        ) : null}
        {footer ? <div className="mt-3">{footer}</div> : null}
      </div>
    </div>
  );
}
