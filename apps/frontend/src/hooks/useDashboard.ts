import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../lib/apiClient";
import type { DashboardData } from "../lib/types";

export function useDashboard(days: number) {
  return useQuery({
    queryKey: ["dashboard", days],
    queryFn: () => apiClient.get<DashboardData>(`/api/analytics/dashboard?days=${days}`),
  });
}