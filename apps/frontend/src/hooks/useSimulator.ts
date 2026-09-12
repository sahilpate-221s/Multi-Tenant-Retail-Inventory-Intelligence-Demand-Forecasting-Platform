import { useMutation } from "@tanstack/react-query";
import { apiClient } from "../lib/apiClient";
import type { SimulationResult } from "../lib/types";

export function useRunSimulation() {
  return useMutation({
    mutationFn: (input: {
      productId: string;
      demandChangePercent?: number;
      supplierDelayDays?: number;
      budgetLimit?: number;
    }) => apiClient.post<SimulationResult>("/api/simulations", input),
  });
}