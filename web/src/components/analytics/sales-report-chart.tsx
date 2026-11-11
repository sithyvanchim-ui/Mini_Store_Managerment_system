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
import { EmptyState } from "@/components/shared/empty-state";
import { formatDate, formatNumber, formatKHR } from "@/lib/utils";
import type { ReportSalesPoint } from "@/types/api";

interface SalesReportChartProps {
  data: ReportSalesPoint[];
}

export function SalesReportChart({ data }: SalesReportChartProps) {
  if (data.length === 0) {
    return (
      <EmptyState
        title="No sales in this period"
        description="Completed sales in the selected range will draw revenue bars and a profit line."
        className="py-8"
      />
    );
  }

  const sorted = [...data].sort((a, b) => a.period.localeCompare(b.period));

  return (
    <div className="h-[340px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={sorted} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E6EFEC" vertical={false} />
          <XAxis
            dataKey="period"
            tickFormatter={(value) => formatDate(`${value}T00:00:00`, "MMM d")}
            tickLine={false}
            axisLine={false}
            tick={{ fill: "#7A8B87", fontSize: 11 }}
          />
          <YAxis
            tickFormatter={(value) =>
              formatKHR(Number(value), { compact: true, withSymbol: false })
            }
            tickLine={false}
            axisLine={false}
            tick={{ fill: "#7A8B87", fontSize: 11 }}
            width={54}
          />
          <Tooltip
            cursor={{ fill: "rgba(15, 181, 160, 0.06)" }}
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const row = sorted.find((item) => item.period === label);
              if (!row) return null;
              return (
                <div className="rounded-xl border border-border bg-card px-3 py-2.5 text-xs shadow-soft">
                  <p className="mb-1.5 font-bold text-ink">
                    {formatDate(`${row.period}T00:00:00`, "EEEE, MMM d")}
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
                    Units
                    <span className="font-semibold text-ink">
                      {formatNumber(row.units)}
                    </span>
                  </p>
                  <p className="flex justify-between gap-4 text-muted-foreground">
                    Sales
                    <span className="font-semibold text-ink">
                      {formatNumber(row.sales)}
                    </span>
                  </p>
                </div>
              );
            }}
          />
          <Bar
            dataKey="revenue"
            name="Revenue"
            fill="#AAB2F8"
            radius={[6, 6, 0, 0]}
            maxBarSize={34}
          />
          <Line
            type="monotone"
            dataKey="profit"
            name="Profit"
            stroke="#0FB5A0"
            strokeWidth={2.5}
            dot={{ r: 3, fill: "#0FB5A0", strokeWidth: 0 }}
            activeDot={{ r: 5 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
