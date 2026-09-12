import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../lib/apiClient";
import type { AdvancedAnalytics } from "../lib/types";

export function useAdvancedAnalytics() {
  return useQuery({
    queryKey: ["advanced-analytics"],
    queryFn: () => apiClient.get<AdvancedAnalytics>("/api/analytics/advanced"),
  });
}