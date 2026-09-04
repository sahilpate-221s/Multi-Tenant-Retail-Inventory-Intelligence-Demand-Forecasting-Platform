import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../lib/apiClient";
import type { InventoryItem, InventoryMovement } from "../lib/types";

export function useInventory() {
  return useQuery({
    queryKey: ["inventory"],
    queryFn: () => apiClient.get<InventoryItem[]>("/api/inventory"),
  });
}

export function useMovementHistory(productId: string | null) {
  return useQuery({
    queryKey: ["inventory-history", productId],
    queryFn: () => apiClient.get<InventoryMovement[]>(`/api/inventory/${productId}/history`),
    enabled: Boolean(productId),
  });
}

export function useAdjustStock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { productId: string; quantityChange: number; reason: string; note?: string }) =>
      apiClient.post("/api/inventory/adjust", input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-history", variables.productId] });
    },
  });
}