"use client";

import { keepPreviousData, useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type {
  Paginated,
  Sale,
  StoreCheckoutPayload,
  StoreMenu,
} from "@/types/api";

/** The customer-facing product menu. */
export function useStoreMenu(query: string) {
  return useQuery({
    queryKey: queryKeys.store.menu(query),
    queryFn: () =>
      api.get<StoreMenu>(
        `/api/v1/store/products${query.trim() ? `?q=${encodeURIComponent(query.trim())}` : ""}`,
      ),
    placeholderData: keepPreviousData,
  });
}

export function useStoreCheckout() {
  return useMutation({
    mutationFn: ({
      payload,
      idempotencyKey,
    }: {
      payload: StoreCheckoutPayload;
      idempotencyKey: string;
    }) =>
      api.post<Sale>("/api/v1/store/checkout", payload, {
        headers: { "Idempotency-Key": idempotencyKey },
      }),
  });
}

/** The signed-in customer's own purchase history. */
export function useStoreOrders(enabled = true) {
  return useQuery({
    queryKey: queryKeys.store.orders,
    queryFn: () => api.get<Paginated<Sale>>("/api/v1/store/orders"),
    enabled,
    placeholderData: keepPreviousData,
  });
}
