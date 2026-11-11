"use client";

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { api, toQuery } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type {
  CreatePurchasePayload,
  Paginated,
  Purchase,
  PurchaseListParams,
} from "@/types/api";

export const PURCHASES_PAGE_SIZE = 15;

export function usePurchases(params: PurchaseListParams = {}) {
  return useQuery({
    queryKey: queryKeys.purchases.list(params),
    queryFn: () =>
      api.get<Paginated<Purchase>>(`/api/v1/purchases${toQuery(params)}`),
    placeholderData: keepPreviousData,
  });
}

export function useCreatePurchase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreatePurchasePayload) =>
      api.post<Purchase>("/api/v1/purchases", payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.purchases.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.stock.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
    },
  });
}
