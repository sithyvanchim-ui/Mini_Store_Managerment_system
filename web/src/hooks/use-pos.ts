"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { api, toQuery } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type {
  Category,
  CreateSalePayload,
  Paginated,
  Product,
  Sale,
} from "@/types/api";

export function usePosProducts(inStockOnly: boolean) {
  const params = {
    page_size: 200,
    ...(inStockOnly ? { status: "in_stock" as const } : {}),
  };

  return useQuery({
    queryKey: queryKeys.products.list(params),
    queryFn: () =>
      api.get<Paginated<Product>>(`/api/v1/products${toQuery(params)}`),
  });
}

export function usePosCategories() {
  return useQuery({
    queryKey: queryKeys.categories.all,
    queryFn: () => api.get<Category[]>("/api/v1/categories"),
    staleTime: 5 * 60_000,
  });
}

export interface CreateSaleVariables {
  payload: CreateSalePayload;
  idempotencyKey: string;
}

export function useCreateSale() {
  return useMutation({
    mutationFn: ({ payload, idempotencyKey }: CreateSaleVariables) =>
      api.post<Sale>("/api/v1/sales", payload, {
        headers: { "Idempotency-Key": idempotencyKey },
      }),
  });
}
