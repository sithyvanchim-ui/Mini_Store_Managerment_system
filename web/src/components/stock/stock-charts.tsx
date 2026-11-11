"use client";

import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
} from "recharts";
import { PieChart as PieIcon, Trophy } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { formatKHR, formatNumber } from "@/lib/utils";
import type { CategoryMixItem, TopProduct } from "@/types/api";

const FALLBACK_COLORS = [
  "#0FB5A0",
  "#AAB2F8",
  "#F3B34C",
  "#6C7BF0",
  "#7ED9C7",
  "#E58FB1",
];

interface CategoryDonutProps {
  data: CategoryMixItem[];
}

export function StockCategoryDonut({ data }: CategoryDonutProps) {
  if (data.length === 0) {
    return (
      <EmptyState
        icon={<PieIcon />}
        title="No category sales yet"
        description="Sales recorded this month will show a category mix here."
        className="py-8"
      />
    );
  }

  const totalRevenue = data.reduce((sum, item) => sum + item.revenue, 0);

  return (
    <div className="space-y-3">
      <div className="relative h-[210px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="revenue"
              nameKey="category"
              cx="50%"
              cy="50%"
              innerRadius={58}
              outerRadius={88}
              paddingAngle={3}
              stroke="none"
            >
              {data.map((entry, index) => (
                <Cell
                  key={entry.category}
                  fill={entry.color || FALLBACK_COLORS[index % FALLBACK_COLORS.length]}
                />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
            Revenue
          </p>
          <p className="font-heading text-xl font-extrabold tracking-tight text-ink">
            {formatKHR(totalRevenue, { compact: true })}
          </p>
        </div>
      </div>

      <ul className="space-y-2">
        {data.map((entry, index) => (
          <li key={entry.category} className="flex items-center gap-2.5 text-xs">
            <span
              className="size-2.5 shrink-0 rounded-full"
              style={{
                backgroundColor:
                  entry.color || FALLBACK_COLORS[index % FALLBACK_COLORS.length],
              }}
            />
            <span className="min-w-0 flex-1 truncate font-semibold text-ink">
              {entry.category}
            </span>
            <span className="shrink-0 text-muted-foreground">
              {formatNumber(entry.units)} units
            </span>
            <span className="w-20 shrink-0 text-right font-bold text-ink">
              {formatKHR(entry.revenue, { compact: true })}
            </span>
            <span className="w-11 shrink-0 text-right font-semibold text-brand-strong">
              {entry.percent.toFixed(1)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

interface TopProductsListProps {
  data: TopProduct[];
}

export function StockTopProducts({ data }: TopProductsListProps) {
  if (data.length === 0) {
    return (
      <EmptyState
        icon={<Trophy />}
        title="No top sellers yet"
        description="Once products sell this month, the leaders appear here."
        className="py-8"
      />
    );
  }

  const maxUnits = Math.max(...data.map((item) => item.units_sold), 1);

  return (
    <ul className="space-y-4">
      {data.map((product, index) => (
        <li key={product.product_id}>
          <div className="flex items-center gap-2.5">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-mint text-[10px] font-extrabold text-brand-strong">
              {index + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-bold text-ink">
                {product.name}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {product.code} · {formatNumber(product.units_sold)} units
              </p>
            </div>
            <p className="shrink-0 text-xs font-bold text-ink">
              {formatKHR(product.revenue, { compact: true })}
            </p>
          </div>
          <div className="ml-8 mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-gradient-to-r from-brand to-[#7ED9C7]"
              style={{ width: `${Math.max((product.units_sold / maxUnits) * 100, 4)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
