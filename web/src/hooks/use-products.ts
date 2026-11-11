"use client";

import { useEffect, useState } from "react";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { api, toQuery } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type {
  AdjustStockPayload,
  Category,
  Paginated,
  Product,
  ProductListParams,
  ProductPayload,
  StockSummary,
} from "@/types/api";

export const PRODUCTS_PAGE_SIZE = 20;

export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

export function useProducts(params: ProductListParams = {}) {
  return useQuery({
    queryKey: queryKeys.products.list(params),
    queryFn: () =>
      api.get<Paginated<Product>>(`/api/v1/products${toQuery(params)}`),
    placeholderData: keepPreviousData,
  });
}

export function useAllProducts() {
  return useProducts({ page: 1, page_size: 200, sort: "name" });
}

export function useCategories() {
  return useQuery({
    queryKey: queryKeys.categories.all,
    queryFn: () => api.get<Category[]>("/api/v1/categories"),
    staleTime: 5 * 60_000,
  });
}

export function useStockSummary(month: string) {
  return useQuery({
    queryKey: queryKeys.stock.summary(month),
    queryFn: () =>
      api.get<StockSummary>(`/api/v1/stock/summary${toQuery({ month })}`),
  });
}

function invalidateProductData(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
  void queryClient.invalidateQueries({ queryKey: queryKeys.categories.all });
  void queryClient.invalidateQueries({ queryKey: queryKeys.stock.all });
  void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: ProductPayload) =>
      api.post<Product>("/api/v1/products", payload),
    onSuccess: () => invalidateProductData(queryClient),
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: Partial<ProductPayload>;
    }) => api.patch<Product>(`/api/v1/products/${id}`, payload),
    onSuccess: () => invalidateProductData(queryClient),
  });
}

export function useSetProductActive() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      api.patch<Product>(`/api/v1/products/${id}`, { is_active }),
    onSuccess: () => invalidateProductData(queryClient),
  });
}

export function useAdjustStock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: AdjustStockPayload;
    }) => api.post<Product>(`/api/v1/products/${id}/adjust-stock`, payload),
    onSuccess: () => invalidateProductData(queryClient),
  });
}
