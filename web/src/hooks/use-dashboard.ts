"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type {
  ActivityItem,
  DailyClosePreview,
  DashboardSummary,
  LowStockItem,
  SalesTrendPoint,
  TopProduct,
} from "@/types/api";

export function useDashboardSummary() {
  return useQuery({
    queryKey: queryKeys.dashboard.summary,
    queryFn: () => api.get<DashboardSummary>("/api/v1/dashboard/summary"),
  });
}

export function useSalesTrend(days: number) {
  return useQuery({
    queryKey: queryKeys.dashboard.trend(days),
    queryFn: () =>
      api.get<SalesTrendPoint[]>(
        `/api/v1/dashboard/sales-trend?days=${days}`,
      ),
  });
}

export function useRecentActivity(limit = 8) {
  return useQuery({
    queryKey: queryKeys.dashboard.activity(limit),
    queryFn: () =>
      api.get<ActivityItem[]>(
        `/api/v1/dashboard/recent-activity?limit=${limit}`,
      ),
  });
}

export function useTopProducts(days = 30, limit = 5) {
  return useQuery({
    queryKey: queryKeys.dashboard.topProducts(days, limit),
    queryFn: () =>
      api.get<TopProduct[]>(
        `/api/v1/dashboard/top-products?days=${days}&limit=${limit}`,
      ),
  });
}

export function useStockAlerts() {
  return useQuery({
    queryKey: queryKeys.stock.alerts,
    queryFn: () => api.get<LowStockItem[]>("/api/v1/stock/alerts"),
  });
}

export function useTodayClose() {
  return useQuery({
    queryKey: queryKeys.dailyClose.today,
    queryFn: () => api.get<DailyClosePreview>("/api/v1/daily-closes/today"),
  });
}
