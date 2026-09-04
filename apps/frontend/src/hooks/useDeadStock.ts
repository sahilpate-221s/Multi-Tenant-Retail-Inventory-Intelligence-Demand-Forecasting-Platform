import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../lib/apiClient";
import type { DeadStockScore } from "../lib/types";

export function useDeadStockScores() {
  return useQuery({
    queryKey: ["dead-stock"],
    queryFn: () => apiClient.get<DeadStockScore[]>("/api/dead-stock"),
  });
}

export function useGenerateDeadStockScores() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiClient.post<{ scoredCount: number }>("/api/dead-stock/generate"),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["dead-stock"] }),
  });
}