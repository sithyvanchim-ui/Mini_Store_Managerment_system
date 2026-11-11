import {
  format,
  formatDistanceToNow,
  isValid,
  parseISO,
} from "date-fns";
import { cn } from "cn";

export { cn };

const KHR_SYMBOL = "៛";

const numberFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0,
});

const compactFormatter = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});

export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return numberFormatter.format(value);
}

export function formatKHR(
  value: number | null | undefined,
  options: { compact?: boolean; withSymbol?: boolean } = {},
): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  const { compact = false, withSymbol = true } = options;
  const text = compact ? compactFormatter.format(value) : numberFormatter.format(value);
  return withSymbol ? `${text}${KHR_SYMBOL}` : text;
}

export function formatPercent(
  value: number | null | undefined,
  digits = 1,
): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return `${value.toFixed(digits)}%`;
}

export function formatChange(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

function toDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : parseISO(value);
  return isValid(date) ? date : null;
}

export function formatDate(
  value: string | Date | null | undefined,
  pattern = "MMM d, yyyy",
): string {
  const date = toDate(value);
  return date ? format(date, pattern) : "—";
}

export function formatDateTime(
  value: string | Date | null | undefined,
  pattern = "MMM d, yyyy · h:mm a",
): string {
  return formatDate(value, pattern);
}

export function formatTime(value: string | Date | null | undefined): string {
  return formatDate(value, "h:mm a");
}

export function relativeTime(value: string | Date | null | undefined): string {
  const date = toDate(value);
  if (!date) return "—";
  return formatDistanceToNow(date, { addSuffix: true });
}

export function getInitials(name: string | null | undefined): string {
  const trimmed = typeof name === "string" ? name.trim() : null;
  if (!trimmed) return "?";
  return trimmed
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function formatCompact(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return compactFormatter.format(value);
}

const CATEGORY_COLORS = [
  "#0FB5A0",
  "#AAB2F8",
  "#F3B34C",
  "#6C7BF0",
  "#7ED9C7",
  "#E58FB1",
  "#84C7F2",
  "#C7A3E8",
];

export function categoryColor(name: string | null | undefined): string {
  if (!name) return CATEGORY_COLORS[0];
  let hash = 0;
  for (let index = 0; index < name.length; index += 1) {
    hash = name.charCodeAt(index) + ((hash << 5) - hash);
  }
  return CATEGORY_COLORS[Math.abs(hash) % CATEGORY_COLORS.length];
}

export type StockTone = {
  label: string;
  className: string;
  dotClassName: string;
};

export function stockStatusMeta(status: string): StockTone {
  switch (status) {
    case "low_stock":
      return {
        label: "Low stock",
        className: "bg-warning/12 text-[#9a6a12] border-warning/25",
        dotClassName: "bg-warning",
      };
    case "out_of_stock":
      return {
        label: "Out of stock",
        className: "bg-destructive/10 text-destructive border-destructive/20",
        dotClassName: "bg-destructive",
      };
    default:
      return {
        label: "In stock",
        className: "bg-success/10 text-[#0d7a5b] border-success/20",
        dotClassName: "bg-success",
      };
  }
}

export function saleStatusMeta(status: string): StockTone {
  if (status === "voided") {
    return {
      label: "Voided",
      className: "bg-destructive/10 text-destructive border-destructive/20",
      dotClassName: "bg-destructive",
    };
  }
  return {
    label: "Completed",
    className: "bg-success/10 text-[#0d7a5b] border-success/20",
    dotClassName: "bg-success",
  };
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function monthKey(date = new Date()): string {
  return date.toISOString().slice(0, 7);
}
