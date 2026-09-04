import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../lib/apiClient";
import type { Supplier } from "../lib/types";

export function useSuppliers() {
  return useQuery({
    queryKey: ["suppliers"],
    queryFn: () => apiClient.get<Supplier[]>("/api/suppliers"),
  });
}

export function useCreateSupplier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; contactEmail?: string; contactPhone?: string; reliabilityNotes?: string }) =>
      apiClient.post<Supplier>("/api/suppliers", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["suppliers"] }),
  });
}

export function useUpdateSupplier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: { id: string } & Partial<{ name: string; contactEmail: string; contactPhone: string; reliabilityNotes: string }>) =>
      apiClient.patch<Supplier>(`/api/suppliers/${id}`, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["suppliers"] }),
  });
}

export function useDeleteSupplier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/suppliers/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["suppliers"] }),
  });
}