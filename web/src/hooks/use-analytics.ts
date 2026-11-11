"use client";

import { useQuery } from "@tanstack/react-query";
import { api, toQuery } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type {
  CategoryMixItem,
  ReportSalesPoint,
  StaffPerformance,
  TopProduct,
} from "@/types/api";

export function useSalesReport(from: string, to: string) {
  return useQuery({
    queryKey: queryKeys.analytics.sales({ from, to }),
    queryFn: () =>
      api.get<ReportSalesPoint[]>(
        `/api/v1/reports/sales${toQuery({ from, to, group_by: "day" })}`,
      ),
    enabled: Boolean(from && to),
  });
}

export function useStaffPerformance(from: string, to: string) {
  return useQuery({
    queryKey: queryKeys.analytics.staff({ from, to }),
    queryFn: () =>
      api.get<StaffPerformance[]>(
        `/api/v1/reports/staff-performance${toQuery({ from, to })}`,
      ),
    enabled: Boolean(from && to),
  });
}

export function useAnalyticsTopProducts(days = 30, limit = 5) {
  return useQuery({
    queryKey: queryKeys.dashboard.topProducts(days, limit),
    queryFn: () =>
      api.get<TopProduct[]>(
        `/api/v1/dashboard/top-products${toQuery({ days, limit })}`,
      ),
  });
}

export function useAnalyticsCategoryMix(days = 30) {
  return useQuery({
    queryKey: queryKeys.dashboard.categoryMix(days),
    queryFn: () =>
      api.get<CategoryMixItem[]>(
        `/api/v1/dashboard/category-mix${toQuery({ days })}`,
      ),
  });
}
