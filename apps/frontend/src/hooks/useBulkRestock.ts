import { useMutation, useQueryClient } from "@tanstack/react-query";
import { postFile } from "../lib/apiClient";
import type { RestockPreviewResult, RestockCommitResult } from "../lib/types";

export function useBulkRestockPreview() {
  return useMutation({
    mutationFn: (file: File) =>
      postFile<RestockPreviewResult>("/api/inventory/bulk-restock/preview", file),
  });
}

export function useBulkRestockCommit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) =>
      postFile<RestockCommitResult>("/api/inventory/bulk-restock/commit", file),
    onSuccess: () => {
      // Invalidate inventory data so the list refreshes with new stock levels
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
    },
  });
}
