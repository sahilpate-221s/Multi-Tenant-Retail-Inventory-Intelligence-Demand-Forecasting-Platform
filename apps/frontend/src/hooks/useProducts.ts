import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../lib/apiClient";
import type { Product, Category, ProductListParams } from "../lib/types";
import { getPaginated } from "../lib/apiClient";

interface RawProductsResponse {
  success: true;
  data: Product[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
}

function buildQueryString(params: ProductListParams): string {
  const query = new URLSearchParams();
  if (params.search) query.set("search", params.search);
  if (params.categoryId) query.set("categoryId", params.categoryId);
  if (params.isActive) query.set("isActive", params.isActive);
  query.set("sortBy", params.sortBy);
  query.set("sortOrder", params.sortOrder);
  query.set("page", String(params.page));
  query.set("pageSize", String(params.pageSize));
  return query.toString();
}

export function useProducts(params: ProductListParams) {
  return useQuery({
    queryKey: ["products", params],
    queryFn: () => getPaginated<Product>(`/api/products?${buildQueryString(params)}`),
  });
}



export function useCreateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      name: string;
      sku: string;
      barcode?: string;
      categoryId?: string | null;
      costPrice: number;
      sellingPrice: number;
      isActive?: boolean;
    }) => apiClient.post<Product>("/api/products", input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: { id: string } & Partial<{
      name: string;
      sku: string;
      barcode?: string;
      categoryId?: string | null;
      costPrice: number;
      sellingPrice: number;
      isActive: boolean;
    }>) => apiClient.patch<Product>(`/api/products/${id}`, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/products/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}

export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: () => apiClient.get<Category[]>("/api/categories"),
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => apiClient.post<Category>("/api/categories", { name }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["categories"] }),
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/categories/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["categories"] }),
  });
}