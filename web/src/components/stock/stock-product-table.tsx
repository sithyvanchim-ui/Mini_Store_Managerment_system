"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, Boxes } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { ProductThumb } from "@/components/shared/product-thumb";
import { StockStatusBadge } from "@/components/shared/status-badge";
import { cn, formatNumber } from "@/lib/utils";
import type { ProductStockRow } from "@/types/api";

type SortKey =
  | "name"
  | "stock_qty"
  | "units_sold";

type SortDirection = "asc" | "desc";

interface StockProductTableProps {
  items: ProductStockRow[];
}

function SortHeader({
  label,
  sortKey,
  activeKey,
  direction,
  onSort,
  align = "right",
}: {
  label: string;
  sortKey: SortKey;
  activeKey: SortKey;
  direction: SortDirection;
  onSort: (key: SortKey) => void;
  align?: "left" | "right";
}) {
  const active = activeKey === sortKey;
  const Icon = active
    ? direction === "asc"
      ? ArrowUp
      : ArrowDown
    : ArrowUpDown;

  return (
    <TableHead
      aria-sort={
        active ? (direction === "asc" ? "ascending" : "descending") : "none"
      }
      className={cn(align === "right" && "text-right")}
    >
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={cn(
          "inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide transition-colors hover:text-brand-strong",
          active ? "text-brand-strong" : "text-muted-foreground",
          align === "right" && "flex-row-reverse",
        )}
      >
        {label}
        <Icon className="size-3" />
      </button>
    </TableHead>
  );
}

export function StockProductTable({ items }: StockProductTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("stock_qty");
  const [direction, setDirection] = useState<SortDirection>("desc");

  const sorted = useMemo(() => {
    const copy = [...items];
    copy.sort((a, b) => {
      const aValue = a[sortKey];
      const bValue = b[sortKey];
      const comparison =
        typeof aValue === "string" && typeof bValue === "string"
          ? aValue.localeCompare(bValue)
          : Number(aValue) - Number(bValue);
      return direction === "asc" ? comparison : -comparison;
    });
    return copy;
  }, [items, sortKey, direction]);

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setDirection(key === "name" ? "asc" : "desc");
  }

  if (items.length === 0) {
    return (
      <EmptyState
        icon={<Boxes />}
        title="No stock rows"
        description="Products with stock and sales data will appear here for the selected month."
      />
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className="pl-5">
            <button
              type="button"
              onClick={() => handleSort("name")}
              className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-muted-foreground hover:text-brand-strong"
            >
              Product
              {sortKey === "name" ? (
                direction === "asc" ? (
                  <ArrowUp className="size-3 text-brand-strong" />
                ) : (
                  <ArrowDown className="size-3 text-brand-strong" />
                )
              ) : (
                <ArrowUpDown className="size-3" />
              )}
            </button>
          </TableHead>
          <TableHead>Category</TableHead>
          <SortHeader
            label="Stock"
            sortKey="stock_qty"
            activeKey={sortKey}
            direction={direction}
            onSort={handleSort}
          />
          <TableHead className="text-right">Threshold</TableHead>
          <SortHeader
            label="Units sold"
            sortKey="units_sold"
            activeKey={sortKey}
            direction={direction}
            onSort={handleSort}
          />
          <TableHead className="pr-5">Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sorted.map((item) => (
          <TableRow key={item.id}>
            <TableCell className="pl-5">
              <div className="flex items-center gap-2.5">
                <ProductThumb
                  name={item.name}
                  category={item.category?.name}
                  size="sm"
                />
                <div className="min-w-0">
                  <p className="max-w-[190px] truncate text-xs font-bold text-ink">
                    {item.name}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {item.code}
                    {item.slot_code ? ` · ${item.slot_code}` : ""}
                  </p>
                </div>
              </div>
            </TableCell>
            <TableCell className="text-xs text-muted-foreground">
              {item.category?.name ?? "—"}
            </TableCell>
            <TableCell className="text-right text-xs font-bold tabular-nums text-ink">
              {formatNumber(item.stock_qty)}
            </TableCell>
            <TableCell className="text-right text-xs tabular-nums text-muted-foreground">
              {formatNumber(item.low_stock_threshold)}
            </TableCell>
            <TableCell className="text-right text-xs tabular-nums text-ink">
              {formatNumber(item.units_sold)}
            </TableCell>
            <TableCell className="pr-5">
              <StockStatusBadge status={item.stock_status} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
