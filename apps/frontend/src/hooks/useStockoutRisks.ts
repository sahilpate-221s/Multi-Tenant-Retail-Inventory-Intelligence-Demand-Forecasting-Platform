import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../lib/apiClient";
import type { StockoutPrediction } from "../lib/types";

export function useStockoutRisks() {
  return useQuery({
    queryKey: ["stockout-risks"],
    queryFn: () => apiClient.get<StockoutPrediction[]>("/api/stockout-risks"),
  });
}

export function useGenerateStockoutRisks() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiClient.post<{ analyzedCount: number }>("/api/stockout-risks/generate"),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["stockout-risks"] }),
  });
}