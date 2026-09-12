import { useMutation } from "@tanstack/react-query";
import { apiClient } from "../lib/apiClient";

interface AskResponse {
  answer: string;
  toolsUsed: string[];
}

export function useAskAssistant() {
  return useMutation({
    mutationFn: (question: string) => apiClient.post<AskResponse>("/api/ai/ask", { question }),
  });
}