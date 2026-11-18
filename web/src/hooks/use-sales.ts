"use client";

import { keepPreviousData, useMutation, useQuery } from "@tanstack/react-query";
import { api, toQuery } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type { KhqrResponse, Paginated, Sale, SaleListParams } from "@/types/api";

export function useSalesList(params: SaleListParams) {
  return useQuery({
    queryKey: queryKeys.sales.list(params),
    queryFn: () =>
      api.get<Paginated<Sale>>(`/api/v1/sales${toQuery(params)}`),
    placeholderData: keepPreviousData,
  });
}

export function useSaleDetail(id: string | null, enabled = true) {
  return useQuery({
    queryKey: queryKeys.sales.detail(id ?? "none"),
    queryFn: () => api.get<Sale>(`/api/v1/sales/${id}`),
    enabled: Boolean(id) && enabled,
  });
}

export function useVoidSale() {
  return useMutation({
    mutationFn: (id: string) => api.post<Sale>(`/api/v1/sales/${id}/void`),
  });
}

/** Fetches the KHQR payment QR for the pending sale amount. */
export function usePaymentKhqr(amount: number | null, enabled = true) {
  return useQuery({
    queryKey: queryKeys.sales.khqr(amount ?? 0),
    queryFn: () =>
      api.get<KhqrResponse>(`/api/v1/payments/khqr?amount=${amount ?? 0}`),
    enabled: enabled && amount !== null && amount > 0,
    staleTime: 0,
    retry: false,
  });
}
