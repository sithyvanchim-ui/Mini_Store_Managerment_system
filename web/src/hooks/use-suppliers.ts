"use client";

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { api, toQuery } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type { Paginated, Supplier } from "@/types/api";

export const SUPPLIERS_PAGE_SIZE = 12;

export interface SupplierListParams {
  q?: string;
  is_active?: boolean;
  page?: number;
  page_size?: number;
}

export interface SupplierPayload {
  name: string;
  contact_name?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
}

export function useSuppliers(params: SupplierListParams = {}) {
  return useQuery({
    queryKey: queryKeys.suppliers.list(params),
    queryFn: () =>
      api.get<Paginated<Supplier>>(`/api/v1/suppliers${toQuery(params)}`),
    placeholderData: keepPreviousData,
  });
}

export function useAllSuppliers() {
  return useSuppliers({ page: 1, page_size: 200 });
}

function invalidateSuppliers(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: queryKeys.suppliers.all });
}

export function useCreateSupplier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: SupplierPayload) =>
      api.post<Supplier>("/api/v1/suppliers", payload),
    onSuccess: () => invalidateSuppliers(queryClient),
  });
}

export function useUpdateSupplier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: Partial<SupplierPayload> & { is_active?: boolean };
    }) => api.patch<Supplier>(`/api/v1/suppliers/${id}`, payload),
    onSuccess: () => invalidateSuppliers(queryClient),
  });
}

export function useDeactivateSupplier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      api.delete<Supplier>(`/api/v1/suppliers/${id}`),
    onSuccess: () => invalidateSuppliers(queryClient),
  });
}

export function useActivateSupplier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      api.patch<Supplier>(`/api/v1/suppliers/${id}`, { is_active: true }),
    onSuccess: () => invalidateSuppliers(queryClient),
  });
}
