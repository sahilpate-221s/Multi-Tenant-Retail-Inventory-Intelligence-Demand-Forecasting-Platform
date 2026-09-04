import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient, postFile } from "../lib/apiClient";
import type { ImportRecord, ImportDetail, PreviewResult } from "../lib/types";

export function usePreviewCsv() {
  return useMutation({
    mutationFn: (file: File) => postFile<PreviewResult>("/api/imports/preview", file),
  });
}

export function useCommitCsv() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => postFile<{ importId: string; status: string }>("/api/imports/commit", file),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["imports"] }),
  });
}

export function useImports() {
  return useQuery({
    queryKey: ["imports"],
    queryFn: () => apiClient.get<ImportRecord[]>("/api/imports"),
  });
}

export function useImportDetail(importId: string | null) {
  return useQuery({
    queryKey: ["import", importId],
    queryFn: () => apiClient.get<ImportDetail>(`/api/imports/${importId}`),
    enabled: Boolean(importId),
    refetchInterval: (query) => (query.state.data?.status === "processing" ? 1500 : false),
  });
}