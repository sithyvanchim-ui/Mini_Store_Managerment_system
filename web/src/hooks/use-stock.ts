"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { api, toQuery } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type {
  MonthlyStock,
  Paginated,
  StockMovement,
  StockSummary,
} from "@/types/api";

export interface StockMovementParams {
  product_id?: string;
  type?: string;
  page?: number;
  page_size?: number;
}

export function useStockSummary(month: string) {
  return useQuery({
    queryKey: queryKeys.stock.summary(month),
    queryFn: () =>
      api.get<StockSummary>(`/api/v1/stock/summary${toQuery({ month })}`),
    enabled: Boolean(month),
  });
}

export function useStockMovements(params: StockMovementParams) {
  return useQuery({
    queryKey: queryKeys.stock.movements(params),
    queryFn: () =>
      api.get<Paginated<StockMovement>>(
        `/api/v1/stock/movements${toQuery(params)}`,
      ),
    placeholderData: keepPreviousData,
  });
}

export function useStockMonthly(months = 6) {
  return useQuery({
    queryKey: queryKeys.stock.monthly(months),
    queryFn: () =>
      api.get<MonthlyStock[]>(`/api/v1/stock/monthly${toQuery({ months })}`),
  });
}
