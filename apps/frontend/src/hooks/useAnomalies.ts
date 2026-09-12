import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../lib/apiClient";
import type { Anomaly } from "../lib/types";

export function useAnomalies() {
  return useQuery({
    queryKey: ["anomalies"],
    queryFn: () => apiClient.get<Anomaly[]>("/api/anomalies"),
  });
}

export function useGenerateAnomalies() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiClient.post<{ detectedCount: number }>("/api/anomalies/generate"),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["anomalies"] }),
  });
}