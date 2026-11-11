"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, toQuery } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type { Paginated, Role, User } from "@/types/api";

export interface UsersParams {
  page?: number;
  page_size?: number;
  q?: string;
}

export function useUsers(params: UsersParams = {}) {
  const normalized: UsersParams = {
    page: 1,
    page_size: 50,
    ...params,
  };

  return useQuery({
    queryKey: queryKeys.users.list(normalized),
    queryFn: () =>
      api.get<Paginated<User>>(`/api/v1/users${toQuery({ ...normalized })}`),
  });
}

export interface CreateUserPayload {
  name: string;
  email: string;
  password: string;
  role: Role;
}

export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateUserPayload) =>
      api.post<User>("/api/v1/users", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
    },
  });
}

export interface UpdateUserPayload {
  id: string;
  name?: string;
  email?: string;
  role?: Role;
  is_active?: boolean;
}

export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...payload }: UpdateUserPayload) =>
      api.patch<User>(`/api/v1/users/${id}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
    },
  });
}
