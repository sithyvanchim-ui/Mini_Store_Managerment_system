import { Badge } from "@/components/ui/badge";
import { cn, saleStatusMeta, stockStatusMeta } from "@/lib/utils";

interface StatusBadgeProps {
  label: string;
  tone?: "success" | "warning" | "danger" | "neutral" | "brand" | "lavender";
  dot?: boolean;
  className?: string;
}

const tones = {
  success: "border-success/20 bg-success/10 text-[#0d7a5b]",
  warning: "border-warning/25 bg-warning/12 text-[#9a6a12]",
  danger: "border-destructive/20 bg-destructive/10 text-destructive",
  neutral: "border-border bg-muted text-muted-foreground",
  brand: "border-brand/20 bg-mint text-brand-strong",
  lavender: "border-[#DDE0FC] bg-[#F1F2FE] text-[#5B66D9]",
} as const;

export function StatusBadge({
  label,
  tone = "neutral",
  dot = true,
  className,
}: StatusBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "h-6 gap-1.5 rounded-full px-2.5 text-[11px] font-bold",
        tones[tone],
        className,
      )}
    >
      {dot ? (
        <span
          className={cn(
            "size-1.5 rounded-full",
            tone === "success" && "bg-success",
            tone === "warning" && "bg-warning",
            tone === "danger" && "bg-destructive",
            tone === "brand" && "bg-brand",
            tone === "lavender" && "bg-[#7C86EA]",
            tone === "neutral" && "bg-muted-foreground",
          )}
        />
      ) : null}
      {label}
    </Badge>
  );
}

export function StockStatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  const meta = stockStatusMeta(status);
  const tone =
    status === "out_of_stock"
      ? "danger"
      : status === "low_stock"
        ? "warning"
        : "success";

  return <StatusBadge label={meta.label} tone={tone} className={className} />;
}

export function SaleStatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  const meta = saleStatusMeta(status);
  return (
    <StatusBadge
      label={meta.label}
      tone={status === "voided" ? "danger" : "success"}
      className={className}
    />
  );
}
