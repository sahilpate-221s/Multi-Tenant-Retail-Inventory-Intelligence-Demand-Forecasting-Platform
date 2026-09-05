import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../lib/apiClient";
import type { ForecastRun } from "../lib/types";

export function useLatestForecast(productId: string, horizonDays: 7 | 30) {
  return useQuery({
    queryKey: ["forecast-latest", productId, horizonDays],
    queryFn: () => apiClient.get<ForecastRun>(`/api/forecasting/${productId}/latest?horizonDays=${horizonDays}`),
    retry: false, // a 404 (no forecast yet) is an expected, valid state
  });
}

export function useForecastHistory(productId: string) {
  return useQuery({
    queryKey: ["forecast-history", productId],
    queryFn: () => apiClient.get<ForecastRun[]>(`/api/forecasting/${productId}/history`),
  });
}

export function useGenerateForecast() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ productId, horizonDays }: { productId: string; horizonDays: 7 | 30 }) =>
      apiClient.post<ForecastRun>(`/api/forecasting/${productId}/generate`, { horizonDays }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["forecast-latest", variables.productId] });
      queryClient.invalidateQueries({ queryKey: ["forecast-history", variables.productId] });
    },
  });
}