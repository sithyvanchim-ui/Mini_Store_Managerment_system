"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, toQuery } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type {
  CreateExpensePayload,
  Expense,
  ExpenseListParams,
  ExpensePage,
} from "@/types/api";

export function useExpenses(params: ExpenseListParams) {
  return useQuery({
    queryKey: queryKeys.expenses.list(params),
    queryFn: () =>
      api.get<ExpensePage>(`/api/v1/expenses${toQuery(params)}`),
  });
}

export function useTodayExpenses() {
  return useQuery({
    queryKey: queryKeys.expenses.today,
    queryFn: () =>
      api.get<{ date: string; total: number }>("/api/v1/expenses/today"),
  });
}

export function useCreateExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateExpensePayload) =>
      api.post<Expense>("/api/v1/expenses", payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.expenses.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.activity.all });
    },
  });
}

export function useDeleteExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/api/v1/expenses/${id}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.expenses.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.activity.all });
    },
  });
}
