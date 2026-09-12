import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../lib/apiClient";
import type { Store, UpdateStoreInput, ChangePasswordInput } from "../lib/types";

export function useStoreSettings() {
  return useQuery({
    queryKey: ["store", "current"],
    queryFn: () => apiClient.get<Store>("/api/stores/current"),
  });
}

export function useUpdateStoreSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateStoreInput) =>
      apiClient.patch<Store>("/api/stores/current", input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store", "current"] });
    },
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (input: ChangePasswordInput) =>
      apiClient.post<{ message: string }>("/api/auth/change-password", input),
  });
}
