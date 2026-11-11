"use client";

import { useState } from "react";
import { CalendarCog } from "lucide-react";
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
import { TableSkeleton } from "@/components/shared/table-skeleton";
import { useDailyCloseHistory } from "@/hooks/use-daily-close";
import { ApiError } from "@/lib/api";
import { cn, formatDateTime, formatKHR } from "@/lib/utils";

const PAGE_SIZE = 10;

export function DailyCloseHistory() {
  const [page, setPage] = useState(1);
  const historyQuery = useDailyCloseHistory({ page, page_size: PAGE_SIZE });

  const rows = historyQuery.data?.items ?? [];

  return (
    <section className="card-surface overflow-hidden">
      <div className="px-5 pb-1 pt-5">
        <h2 className="font-heading text-lg font-bold text-ink">
          Reconciliation history
        </h2>
        <p className="text-xs text-muted-foreground">
          Every closed business date, newest first.
        </p>
      </div>

      {historyQuery.isPending ? (
        <div className="p-5">
          <TableSkeleton rows={5} columns={8} />
        </div>
      ) : historyQuery.isError ? (
        <div className="p-5">
          <ErrorState
            title="History could not be loaded"
            message={
              historyQuery.error instanceof ApiError
                ? historyQuery.error.detail
                : undefined
            }
            onRetry={() => void historyQuery.refetch()}
          />
        </div>
      ) : rows.length === 0 ? (
        <div className="p-5">
          <EmptyState
            icon={<CalendarCog />}
            title="No closes recorded yet"
            description="Submit the first daily reconciliation above and it will be archived here."
          />
        </div>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-5">Business date</TableHead>
                <TableHead className="text-right">ABA sales</TableHead>
                <TableHead className="text-right">Profit</TableHead>
                <TableHead className="text-right">Expenses</TableHead>
                <TableHead className="text-right">Expected</TableHead>
                <TableHead className="text-right">ABA balance</TableHead>
                <TableHead className="text-right">Variance</TableHead>
                <TableHead className="pr-5">Closed by</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="pl-5">
                    <p className="text-xs font-bold text-ink">
                      {formatDateTime(row.business_date, "MMM d, yyyy")}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {formatDateTime(row.closed_at)}
                    </p>
                  </TableCell>
                  <TableCell className="text-right text-xs font-semibold tabular-nums text-ink">
                    {formatKHR(row.aba_sales)}
                  </TableCell>
                  <TableCell className="text-right text-xs font-semibold tabular-nums text-[#0d7a5b]">
                    {formatKHR(row.gross_profit)}
                  </TableCell>
                  <TableCell className="text-right text-xs tabular-nums text-muted-foreground">
                    {formatKHR(row.expenses)}
                  </TableCell>
                  <TableCell className="text-right text-xs tabular-nums text-muted-foreground">
                    {formatKHR(row.aba_sales - row.expenses)}
                  </TableCell>
                  <TableCell className="text-right text-xs tabular-nums text-ink">
                    {row.aba_balance !== null ? formatKHR(row.aba_balance) : "—"}
                  </TableCell>
                  <TableCell
                    className={cn(
                      "text-right text-xs font-bold tabular-nums",
                      row.variance === null
                        ? "text-muted-foreground"
                        : row.variance === 0
                          ? "text-[#0d7a5b]"
                          : "text-destructive",
                    )}
                  >
                    {row.variance !== null ? formatKHR(row.variance) : "—"}
                  </TableCell>
                  <TableCell className="pr-5 text-xs text-muted-foreground">
                    {row.closed_by_name}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="px-5 pb-5">
            <DataPagination
              page={historyQuery.data?.page ?? page}
              pageSize={historyQuery.data?.page_size ?? PAGE_SIZE}
              total={historyQuery.data?.total ?? 0}
              onPageChange={setPage}
            />
          </div>
        </>
      )}
    </section>
  );
}
