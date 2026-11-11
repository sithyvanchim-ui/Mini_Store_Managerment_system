"use client";

import { UsersRound } from "lucide-react";
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
import { formatKHR, formatNumber } from "@/lib/utils";
import type { StaffPerformance } from "@/types/api";

interface StaffPerformanceTableProps {
  data: StaffPerformance[];
}

export function StaffPerformanceTable({ data }: StaffPerformanceTableProps) {
  if (data.length === 0) {
    return (
      <EmptyState
        icon={<UsersRound />}
        title="No staff sales yet"
        description="Per-counterperson totals appear once sales land in the range."
        className="py-8"
      />
    );
  }

  const maxRevenue = Math.max(...data.map((row) => row.revenue), 1);

  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className="pl-0">Staff</TableHead>
          <TableHead className="text-right">Sales</TableHead>
          <TableHead className="text-right">Units</TableHead>
          <TableHead className="pr-0 text-right">Revenue</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((row) => (
          <TableRow key={row.user_id}>
            <TableCell className="pl-0">
              <div className="flex items-center gap-2.5">
                <ProductThumb name={row.name} size="sm" />
                <span className="text-xs font-bold text-ink">{row.name}</span>
              </div>
            </TableCell>
            <TableCell className="text-right text-xs tabular-nums text-muted-foreground">
              {formatNumber(row.sales_count)}
            </TableCell>
            <TableCell className="text-right text-xs tabular-nums text-muted-foreground">
              {formatNumber(row.units)}
            </TableCell>
            <TableCell className="pr-0 text-right">
              <div className="flex items-center justify-end gap-2">
                <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-brand to-[#7ED9C7]"
                    style={{
                      width: `${Math.max((row.revenue / maxRevenue) * 100, 6)}%`,
                    }}
                  />
                </div>
                <span className="w-20 text-right text-xs font-bold tabular-nums text-ink">
                  {formatKHR(row.revenue, { compact: true })}
                </span>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
