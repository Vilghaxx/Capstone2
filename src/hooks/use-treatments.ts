"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import type { Treatment } from "@/lib/types";
import { queryKeys } from "@/hooks/query-keys";

export function useTreatments(patientId: string | null) {
  return useQuery({
    queryKey: queryKeys.treatments(patientId ?? ""),
    queryFn: () => apiClient.get<Treatment[]>(`/api/treatments/${patientId}`),
    enabled: !!patientId,
  });
}

export function useToothTreatments(
  patientId: string | null,
  toothNumber: number | null
) {
  return useQuery({
    queryKey: queryKeys.toothTreatments(patientId ?? "", toothNumber ?? 0),
    queryFn: () =>
      apiClient.get<Treatment[]>(
        `/api/treatments/tooth/${patientId}/${toothNumber}`
      ),
    enabled: !!patientId && toothNumber != null,
  });
}

export function useCreateTreatment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      apiClient.post<Treatment>("/api/treatments", payload),
    onSuccess: (_createdRecord, mutationVariables) => {
      const patientId = mutationVariables.patientId as string;
      queryClient.invalidateQueries({
        queryKey: queryKeys.treatments(patientId),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.teeth(patientId) });
      if (typeof mutationVariables.toothNumber === "number") {
        queryClient.invalidateQueries({
          queryKey: queryKeys.toothTreatments(
            patientId,
            mutationVariables.toothNumber
          ),
        });
      }
      queryClient.invalidateQueries({ queryKey: ["billing"] });
      queryClient.invalidateQueries({ queryKey: ["billingSummary"] });
      queryClient.invalidateQueries({ queryKey: ["patientBilling"] });
    },
  });
}

export function useUpdateTreatment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      apiClient.put<Treatment>(`/api/treatments/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["treatments"] });
      queryClient.invalidateQueries({ queryKey: ["toothTreatments"] });
      queryClient.invalidateQueries({ queryKey: ["billing"] });
    },
  });
}
