import { useMutation } from "@tanstack/react-query";
import { apiClient } from "../lib/apiClient";

type ExplainType = "reorder-recommendation" | "dead-stock" | "stockout-risk" | "anomaly";

export function useExplain() {
  return useMutation({
    mutationFn: ({ type, id }: { type: ExplainType; id: string }) =>
      apiClient.post<{ explanation: string }>(`/api/ai/explain/${type}/${id}`),
  });
}