"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, toQuery } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type {
  CreateFundRequestPayload,
  FundDecision,
  FundRequest,
  FundRequestListParams,
  FundReviewPayload,
  Paginated,
} from "@/types/api";

export function useFundRequests(params: FundRequestListParams) {
  return useQuery({
    queryKey: queryKeys.funds.list(params),
    queryFn: () =>
      api.get<Paginated<FundRequest>>(
        `/api/v1/fund-requests${toQuery(params)}`,
      ),
  });
}

export function usePendingFundCount() {
  return useQuery({
    queryKey: queryKeys.funds.pending,
    queryFn: () =>
      api.get<{ pending: number }>("/api/v1/fund-requests/pending-count"),
  });
}

export function useCreateFundRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateFundRequestPayload) =>
      api.post<FundRequest>("/api/v1/fund-requests", payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.funds.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.activity.all });
    },
  });
}

export function useReviewFundRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: FundReviewPayload;
    }) => api.post<FundRequest>(`/api/v1/fund-requests/${id}/review`, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.funds.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.activity.all });
    },
  });
}

export function useDisburseFundRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.post<FundRequest>(`/api/v1/fund-requests/${id}/disburse`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.funds.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.activity.all });
    },
  });
}

export type { FundDecision };
