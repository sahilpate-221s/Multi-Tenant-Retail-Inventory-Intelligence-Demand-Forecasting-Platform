import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../lib/apiClient";
import type { SalesListResponse, Sale, CreateSaleInput } from "../lib/types";

export interface SalesQueryParams {
  page?: number;
  limit?: number;
  startDate?: string;
  endDate?: string;
  search?: string;
  productId?: string;
}

function buildSalesQueryString(params: SalesQueryParams): string {
  const query = new URLSearchParams();
  if (params.page) query.set("page", String(params.page));
  if (params.limit) query.set("limit", String(params.limit));
  if (params.startDate) query.set("startDate", params.startDate);
  if (params.endDate) query.set("endDate", params.endDate);
  if (params.search && params.search.trim()) query.set("search", params.search.trim());
  if (params.productId) query.set("productId", params.productId);
  return query.toString();
}

export function useSales(params: SalesQueryParams = {}) {
  const queryString = buildSalesQueryString(params);
  return useQuery({
    queryKey: ["sales", params],
    queryFn: () => apiClient.get<SalesListResponse>(`/api/sales?${queryString}`),
  });
}

export function useSale(id: string | null) {
  return useQuery({
    queryKey: ["sales", id],
    queryFn: () => apiClient.get<Sale>(`/api/sales/${id}`),
    enabled: Boolean(id),
  });
}

export function useCreateSale() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateSaleInput) => apiClient.post<Sale>("/api/sales", input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      queryClient.invalidateQueries({ queryKey: ["analytics"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useCreateReturn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { saleItemId: string; quantity: number; reason: string }) =>
      apiClient.post<{ id: string }>("/api/returns", input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["analytics"] });
    },
  });
}
