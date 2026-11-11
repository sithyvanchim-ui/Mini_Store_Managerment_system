"use client";

import { keepPreviousData, useMutation, useQuery } from "@tanstack/react-query";
import { api, toQuery } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type {
  DailyClose,
  DailyClosePayload,
  DailyClosePreview,
  Paginated,
} from "@/types/api";

export interface DailyCloseListParams {
  page?: number;
  page_size?: number;
  from?: string;
  to?: string;
}

export function useTodayDailyClose() {
  return useQuery({
    queryKey: queryKeys.dailyClose.today,
    queryFn: () =>
      api.get<DailyClosePreview>("/api/v1/daily-closes/today"),
  });
}

export function useDailyCloseHistory(params: DailyCloseListParams) {
  return useQuery({
    queryKey: queryKeys.dailyClose.list(params),
    queryFn: () =>
      api.get<Paginated<DailyClose>>(
        `/api/v1/daily-closes${toQuery(params)}`,
      ),
    placeholderData: keepPreviousData,
  });
}

export function useSaveDailyClose() {
  return useMutation({
    mutationFn: (payload: DailyClosePayload) =>
      api.post<DailyClose>("/api/v1/daily-closes", payload),
  });
}
