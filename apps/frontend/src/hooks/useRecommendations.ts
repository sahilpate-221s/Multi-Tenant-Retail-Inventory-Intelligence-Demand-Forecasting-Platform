import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../lib/apiClient";
import type { Recommendation } from "../lib/types";

export function useRecommendations() {
  return useQuery({
    queryKey: ["recommendations", "pending"],
    queryFn: () => apiClient.get<Recommendation[]>("/api/recommendations?status=pending"),
  });
}

export function useGenerateRecommendations() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiClient.post<{ generatedCount: number }>("/api/recommendations/generate"),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["recommendations"] }),
  });
}

export function useUpdateRecommendationStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: "ordered" | "dismissed" }) =>
      apiClient.patch(`/api/recommendations/${id}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recommendations"] });
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      queryClient.invalidateQueries({ queryKey: ["stockout-risks"] });
    },
  });
}