"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { queryKeys } from "@/hooks/query-keys";
export function useTeeth(patientId) {
    return useQuery({
        queryKey: queryKeys.teeth(patientId !== null && patientId !== void 0 ? patientId : ""),
        queryFn: () => apiClient.get(`/api/teeth/${patientId}`),
        enabled: !!patientId,
    });
}
export function useUpdateTooth() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ patientId, toothNumber, data, }) => apiClient.put(`/api/teeth/${patientId}/${toothNumber}`, data),
        onSuccess: (_updatedTooth, mutationVariables) => {
            queryClient.invalidateQueries({
                queryKey: queryKeys.teeth(mutationVariables.patientId),
            });
        },
    });
}
