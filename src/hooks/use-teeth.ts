"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import type { Tooth } from "@/lib/types";
import { queryKeys } from "@/hooks/query-keys";

export function useTeeth(patientId: string | null) {
  return useQuery({
    queryKey: queryKeys.teeth(patientId ?? ""),
    queryFn: () => apiClient.get<Tooth[]>(`/api/teeth/${patientId}`),
    enabled: !!patientId,
  });
}

export function useUpdateTooth() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      patientId,
      toothNumber,
      data,
    }: {
      patientId: string;
      toothNumber: number;
      data: Record<string, unknown>;
    }) =>
      apiClient.put<Tooth>(`/api/teeth/${patientId}/${toothNumber}`, data),
    onSuccess: (_updatedTooth, mutationVariables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.teeth(mutationVariables.patientId),
      });
    },
  });
}
