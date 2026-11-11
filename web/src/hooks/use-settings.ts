"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type { Settings } from "@/types/api";

export function useSettings() {
  return useQuery({
    queryKey: queryKeys.settings.all,
    queryFn: () => api.get<Settings>("/api/v1/settings"),
  });
}

export interface UpdateSettingsPayload {
  store_name?: string;
  dorm_name?: string;
  currency?: string;
  low_stock_default?: number;
  receipt_footer?: string;
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateSettingsPayload) =>
      api.patch<Settings>("/api/v1/settings", payload),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.settings.all, data);
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.all });
    },
  });
}

export interface ChangePasswordPayload {
  current_password: string;
  new_password: string;
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (payload: ChangePasswordPayload) =>
      api.post<void>("/api/v1/auth/change-password", payload),
  });
}

export interface HealthStatus {
  ok: boolean;
  status: number;
}

export function useHealthStatus() {
  return useQuery({
    queryKey: ["health"],
    queryFn: async (): Promise<HealthStatus> => {
      try {
        const response = await fetch("/health", {
          cache: "no-store",
          headers: { Accept: "application/json" },
        });
        return { ok: response.ok, status: response.status };
      } catch {
        return { ok: false, status: 0 };
      }
    },
    retry: false,
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
}
