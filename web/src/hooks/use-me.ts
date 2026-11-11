"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type { LoginResponse, User } from "@/types/api";

export function useMe() {
  return useQuery({
    queryKey: queryKeys.me,
    queryFn: () => api.get<LoginResponse>("/api/v1/auth/me"),
    staleTime: 5 * 60_000,
    retry: false,
  });
}

export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => api.post<void>("/api/v1/auth/logout"),
    onSettled: () => {
      queryClient.clear();
      if (typeof window !== "undefined") {
        window.location.assign("/login");
      }
    },
  });
}

export type { User };
