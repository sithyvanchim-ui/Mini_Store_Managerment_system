"use client";

import {
  ArrowUpDown,
  MoreHorizontal,
  Pencil,
  Power,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { ProductThumb } from "@/components/shared/product-thumb";
import { StockStatusBadge } from "@/components/shared/status-badge";
import { formatKHR, formatNumber } from "@/lib/utils";
import type { Product } from "@/types/api";

interface ProductsTableProps {
  products: Product[];
  onEdit: (product: Product) => void;
  onAdjust: (product: Product) => void;
  onToggleActive: (product: Product) => void;
}

export function ProductsTable({
  products,
  onEdit,
  onAdjust,
  onToggleActive,
}: ProductsTableProps) {
  return (
    <Table className="min-w-[1080px]">
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className="pl-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Product
          </TableHead>
          <TableHead className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Category
          </TableHead>
          <TableHead className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Package
          </TableHead>
          <TableHead className="text-right text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Cost
          </TableHead>
          <TableHead className="text-right text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Selling
          </TableHead>
          <TableHead className="text-right text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Margin
          </TableHead>
          <TableHead className="text-right text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Stock
          </TableHead>
          <TableHead className="text-right text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Threshold
          </TableHead>
          <TableHead className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Location
          </TableHead>
          <TableHead className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Status
          </TableHead>
          <TableHead className="w-12 pr-1 text-right text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            <span className="sr-only">Actions</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {products.map((product) => (
          <TableRow key={product.id} className="group">
            <TableCell className="pl-1">
              <div className="flex items-center gap-3">
                <ProductThumb
                  name={product.name}
                  category={product.category?.name}
                  size="sm"
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="max-w-56 truncate font-semibold text-ink">
                      {product.name}
                    </p>
                    {!product.is_active ? (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                        Inactive
                      </span>
                    ) : null}
                  </div>
                  <p className="text-xs text-muted-foreground">{product.code}</p>
                </div>
              </div>
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-2">
                <span
                  className="size-2 rounded-full"
                  style={{
                    backgroundColor: product.category?.color ?? "#0FB5A0",
                  }}
                  aria-hidden="true"
                />
                <span className="text-sm text-ink">
                  {product.category?.name ?? "Uncategorised"}
                </span>
              </div>
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {product.package}
            </TableCell>
            <TableCell className="text-right tabular-nums text-ink">
              {formatKHR(product.cost_price)}
            </TableCell>
            <TableCell className="text-right tabular-nums font-semibold text-ink">
              {formatKHR(product.selling_price)}
            </TableCell>
            <TableCell className="text-right">
              {product.margin < 0 ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="cursor-help font-semibold tabular-nums text-destructive underline decoration-dotted underline-offset-4">
                      {formatKHR(product.margin)}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    Negative margin — selling price is{" "}
                    {formatKHR(Math.abs(product.margin))} below cost.
                  </TooltipContent>
                </Tooltip>
              ) : (
                <span className="tabular-nums text-ink">
                  {formatKHR(product.margin)}
                </span>
              )}
            </TableCell>
            <TableCell className="text-right">
              <span
                className={
                  product.stock_status === "out_of_stock"
                    ? "font-bold tabular-nums text-destructive"
                    : product.stock_status === "low_stock"
                      ? "font-bold tabular-nums text-[#9a6a12]"
                      : "font-bold tabular-nums text-ink"
                }
              >
                {formatNumber(product.stock_qty)}
              </span>
            </TableCell>
            <TableCell className="text-right tabular-nums text-muted-foreground">
              {formatNumber(product.low_stock_threshold)}
            </TableCell>
            <TableCell>
              <p className="text-sm capitalize text-ink">{product.location}</p>
              <p className="text-xs text-muted-foreground">
                {product.slot_code ?? "Unassigned"}
              </p>
            </TableCell>
            <TableCell>
              <StockStatusBadge status={product.stock_status} />
            </TableCell>
            <TableCell className="pr-1 text-right">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="rounded-full"
                    aria-label={`Actions for ${product.name}`}
                  >
                    <MoreHorizontal className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 rounded-xl">
                  <DropdownMenuItem onSelect={() => onEdit(product)}>
                    <Pencil className="size-4" />
                    Edit product
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => onAdjust(product)}>
                    <ArrowUpDown className="size-4" />
                    Adjust stock
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant={product.is_active ? "destructive" : "default"}
                    onSelect={() => onToggleActive(product)}
                  >
                    <Power className="size-4" />
                    {product.is_active ? "Deactivate" : "Activate"}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
