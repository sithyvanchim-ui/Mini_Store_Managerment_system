"use client";

import { useState } from "react";
import { History, Search } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DataPagination } from "@/components/shared/data-pagination";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { TableSkeleton } from "@/components/shared/table-skeleton";
import { useStockMovements } from "@/hooks/use-stock";
import { cn, formatDateTime, formatKHR, formatNumber } from "@/lib/utils";
import type {
  ProductStockRow,
  StockMovementType,
} from "@/types/api";

const PAGE_SIZE = 30;

const MOVEMENT_TYPES: Array<{ value: StockMovementType; label: string }> = [
  { value: "restock", label: "Restock" },
  { value: "sale", label: "Sale" },
  { value: "adjustment", label: "Adjustment" },
  { value: "waste", label: "Waste" },
  { value: "void", label: "Void" },
];

const MOVEMENT_META: Record<
  StockMovementType,
  {
    label: string;
    tone: "success" | "warning" | "danger" | "neutral" | "brand" | "lavender";
  }
> = {
  restock: { label: "Restock", tone: "success" },
  sale: { label: "Sale", tone: "lavender" },
  adjustment: { label: "Adjustment", tone: "neutral" },
  waste: { label: "Waste", tone: "warning" },
  void: { label: "Void", tone: "danger" },
};

interface StockMovementsProps {
  products: ProductStockRow[];
}

export function StockMovements({ products }: StockMovementsProps) {
  const [type, setType] = useState("all");
  const [productId, setProductId] = useState("all");
  const [page, setPage] = useState(1);

  const movementsQuery = useStockMovements({
    type: type === "all" ? undefined : type,
    product_id: productId === "all" ? undefined : productId,
    page,
    page_size: PAGE_SIZE,
  });

  const rows = movementsQuery.data?.items ?? [];

  return (
    <div className="space-y-4">
      <div className="card-surface-flat flex flex-col gap-2.5 p-4 sm:flex-row sm:items-center">
        <Select
          value={type}
          onValueChange={(value) => {
            setType(value);
            setPage(1);
          }}
        >
          <SelectTrigger
            className="h-10 w-full rounded-xl sm:w-[170px]"
            aria-label="Filter movements by type"
          >
            <SelectValue placeholder="Movement type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {MOVEMENT_TYPES.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={productId}
          onValueChange={(value) => {
            setProductId(value);
            setPage(1);
          }}
        >
          <SelectTrigger
            className="h-10 w-full rounded-xl sm:w-[260px]"
            aria-label="Filter movements by product"
          >
            <SelectValue placeholder="All products" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All products</SelectItem>
            {products.map((product) => (
              <SelectItem key={product.id} value={product.id}>
                {product.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex flex-1 items-center justify-between gap-2 sm:justify-end">
          <p className="text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Search className="size-3.5" />
            </span>{" "}
            {formatNumber(movementsQuery.data?.total ?? 0)} movements
          </p>
          <Button
            variant="ghost"
            size="sm"
            className="rounded-full text-xs text-muted-foreground"
            onClick={() => {
              setType("all");
              setProductId("all");
              setPage(1);
            }}
          >
            Reset
          </Button>
        </div>
      </div>

      <section className="card-surface overflow-hidden">
        {movementsQuery.isLoading ? (
          <div className="p-5">
            <TableSkeleton rows={9} columns={8} />
          </div>
        ) : movementsQuery.isError ? (
          <div className="p-5">
            <ErrorState
              title="Stock movements could not be loaded"
              onRetry={() => {
                void movementsQuery.refetch();
              }}
            />
          </div>
        ) : rows.length === 0 ? (
          <div className="p-5">
            <EmptyState
              icon={<History />}
              title="No movements found"
              description="Restocks, sales, adjustments, waste, and voids will be listed here."
            />
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-5">Date</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Delta</TableHead>
                  <TableHead className="text-right">Unit cost</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Note</TableHead>
                  <TableHead className="pr-5">By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((movement) => {
                  const meta = MOVEMENT_META[movement.type];
                  return (
                    <TableRow key={movement.id}>
                      <TableCell className="pl-5 text-xs text-muted-foreground">
                        {formatDateTime(movement.created_at)}
                      </TableCell>
                      <TableCell>
                        <p className="text-xs font-bold text-ink">
                          {movement.product_name}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {movement.product_code}
                        </p>
                      </TableCell>
                      <TableCell>
                        <StatusBadge
                          label={meta.label}
                          tone={meta.tone}
                          dot={false}
                        />
                      </TableCell>
                      <TableCell
                        className={cn(
                          "text-right text-xs font-extrabold tabular-nums",
                          movement.quantity_delta > 0
                            ? "text-[#0d7a5b]"
                            : "text-destructive",
                        )}
                      >
                        {movement.quantity_delta > 0 ? "+" : ""}
                        {formatNumber(movement.quantity_delta)}
                      </TableCell>
                      <TableCell className="text-right text-xs tabular-nums text-muted-foreground">
                        {movement.unit_cost !== null
                          ? formatKHR(movement.unit_cost)
                          : "—"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {movement.reference ?? "—"}
                      </TableCell>
                      <TableCell className="max-w-[220px] truncate text-xs text-muted-foreground">
                        {movement.note ?? "—"}
                      </TableCell>
                      <TableCell className="pr-5 text-xs text-muted-foreground">
                        {movement.created_by_name}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <div className="px-5 pb-5">
              <DataPagination
                page={movementsQuery.data?.page ?? page}
                pageSize={PAGE_SIZE}
                total={movementsQuery.data?.total ?? 0}
                onPageChange={setPage}
              />
            </div>
          </>
        )}
      </section>
    </div>
  );
}
