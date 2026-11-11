"use client";

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CalendarRange } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { TableSkeleton } from "@/components/shared/table-skeleton";
import { useStockMonthly } from "@/hooks/use-stock";
import { formatDate, formatKHR, formatNumber } from "@/lib/utils";

export function StockMonthly() {
  const monthlyQuery = useStockMonthly(6);
  const data = monthlyQuery.data ?? [];

  if (monthlyQuery.isLoading) {
    return (
      <div className="card-surface space-y-5 p-5">
        <TableSkeleton rows={4} columns={5} />
        <TableSkeleton rows={6} columns={5} />
      </div>
    );
  }

  if (monthlyQuery.isError) {
    return (
      <div className="card-surface p-5">
        <ErrorState
          title="Monthly history could not be loaded"
          onRetry={() => {
            void monthlyQuery.refetch();
          }}
        />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="card-surface p-5">
        <EmptyState
          icon={<CalendarRange />}
          title="No monthly history yet"
          description="Closed months will build a six-month trend of revenue, profit, and closing units."
        />
      </div>
    );
  }

  const chartData = [...data].sort((a, b) => a.month.localeCompare(b.month));
  const tableData = [...data].sort((a, b) => b.month.localeCompare(a.month));
  const totals = data.reduce(
    (acc, row) => ({
      units: acc.units + row.units_sold,
      revenue: acc.revenue + row.revenue,
      profit: acc.profit + row.profit,
      closing: acc.closing + row.closing_units,
    }),
    { units: 0, revenue: 0, profit: 0, closing: 0 },
  );

  return (
    <div className="space-y-4">
      <section className="card-surface p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-heading text-lg font-bold text-ink">
              Six-month performance
            </h2>
            <p className="text-xs text-muted-foreground">
              Revenue bars, gross profit line, and closing units on the right axis.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-[11px] font-semibold text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-lavender" /> Revenue
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-brand" /> Profit
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-[#7C86EA]" /> Closing units
            </span>
          </div>
        </div>

        <div className="mt-4 h-[320px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={chartData}
              margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#E6EFEC"
                vertical={false}
              />
              <XAxis
                dataKey="month"
                tickFormatter={(value) =>
                  formatDate(`${String(value)}-01`, "MMM yy")
                }
                tickLine={false}
                axisLine={false}
                tick={{ fill: "#7A8B87", fontSize: 11 }}
              />
              <YAxis
                yAxisId="money"
                tickFormatter={(value) =>
                  formatKHR(Number(value), {
                    compact: true,
                    withSymbol: false,
                  })
                }
                tickLine={false}
                axisLine={false}
                tick={{ fill: "#7A8B87", fontSize: 11 }}
                width={54}
              />
              <YAxis
                yAxisId="units"
                orientation="right"
                tickFormatter={(value) => formatNumber(Number(value))}
                tickLine={false}
                axisLine={false}
                tick={{ fill: "#7A8B87", fontSize: 11 }}
                width={44}
              />
              <Tooltip
                cursor={{ fill: "rgba(15, 181, 160, 0.06)" }}
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  const row = chartData.find((item) => item.month === label);
                  if (!row) return null;
                  return (
                    <div className="rounded-xl border border-border bg-card px-3 py-2.5 text-xs shadow-soft">
                      <p className="mb-1.5 font-bold text-ink">
                        {formatDate(`${row.month}-01`, "MMMM yyyy")}
                      </p>
                      <p className="flex justify-between gap-4 text-muted-foreground">
                        Revenue
                        <span className="font-semibold text-ink">
                          {formatKHR(row.revenue)}
                        </span>
                      </p>
                      <p className="flex justify-between gap-4 text-muted-foreground">
                        Profit
                        <span className="font-semibold text-ink">
                          {formatKHR(row.profit)}
                        </span>
                      </p>
                      <p className="flex justify-between gap-4 text-muted-foreground">
                        Closing units
                        <span className="font-semibold text-ink">
                          {formatNumber(row.closing_units)}
                        </span>
                      </p>
                    </div>
                  );
                }}
              />
              <Bar
                yAxisId="money"
                dataKey="revenue"
                name="Revenue"
                fill="#AAB2F8"
                radius={[6, 6, 0, 0]}
                maxBarSize={44}
              />
              <Line
                yAxisId="money"
                type="monotone"
                dataKey="profit"
                name="Profit"
                stroke="#0FB5A0"
                strokeWidth={2.5}
                dot={{ r: 3, fill: "#0FB5A0", strokeWidth: 0 }}
                activeDot={{ r: 5 }}
              />
              <Line
                yAxisId="units"
                type="monotone"
                dataKey="closing_units"
                name="Closing units"
                stroke="#7C86EA"
                strokeWidth={1.8}
                strokeDasharray="5 5"
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="card-surface overflow-hidden">
        <div className="px-5 pb-1 pt-5">
          <h2 className="font-heading text-lg font-bold text-ink">
            Monthly ledger
          </h2>
          <p className="text-xs text-muted-foreground">
            Totals recorded for each of the last six months.
          </p>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-5">Month</TableHead>
              <TableHead className="text-right">Units sold</TableHead>
              <TableHead className="text-right">Revenue</TableHead>
              <TableHead className="text-right">Profit</TableHead>
              <TableHead className="pr-5 text-right">Closing units</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tableData.map((row) => (
              <TableRow key={row.month}>
                <TableCell className="pl-5 text-xs font-bold text-ink">
                  {formatDate(`${row.month}-01`, "MMMM yyyy")}
                </TableCell>
                <TableCell className="text-right text-xs tabular-nums text-muted-foreground">
                  {formatNumber(row.units_sold)}
                </TableCell>
                <TableCell className="text-right text-xs font-semibold tabular-nums text-ink">
                  {formatKHR(row.revenue)}
                </TableCell>
                <TableCell className="text-right text-xs font-semibold tabular-nums text-[#0d7a5b]">
                  {formatKHR(row.profit)}
                </TableCell>
                <TableCell className="pr-5 text-right text-xs tabular-nums text-muted-foreground">
                  {formatNumber(row.closing_units)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow className="hover:bg-transparent">
              <TableCell className="pl-5 text-xs font-bold">Total</TableCell>
              <TableCell className="text-right text-xs font-bold tabular-nums">
                {formatNumber(totals.units)}
              </TableCell>
              <TableCell className="text-right text-xs font-bold tabular-nums">
                {formatKHR(totals.revenue)}
              </TableCell>
              <TableCell className="text-right text-xs font-bold tabular-nums">
                {formatKHR(totals.profit)}
              </TableCell>
              <TableCell className="pr-5 text-right text-xs font-bold tabular-nums">
                {formatNumber(totals.closing)}
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </section>
    </div>
  );
}
