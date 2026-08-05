"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { queryKeys } from "@/hooks/query-keys";
export function useTreatments(patientId) {
    return useQuery({
        queryKey: queryKeys.treatments(patientId !== null && patientId !== void 0 ? patientId : ""),
        queryFn: () => apiClient.get(`/api/treatments/${patientId}`),
        enabled: !!patientId,
    });
}
export function useToothTreatments(patientId, toothNumber) {
    return useQuery({
        queryKey: queryKeys.toothTreatments(patientId !== null && patientId !== void 0 ? patientId : "", toothNumber !== null && toothNumber !== void 0 ? toothNumber : 0),
        queryFn: () => apiClient.get(`/api/treatments/tooth/${patientId}/${toothNumber}`),
        enabled: !!patientId && toothNumber != null,
    });
}
export function useCreateTreatment() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (payload) => apiClient.post("/api/treatments", payload),
        onSuccess: (_createdRecord, mutationVariables) => {
            const patientId = mutationVariables.patientId;
            queryClient.invalidateQueries({
                queryKey: queryKeys.treatments(patientId),
            });
            queryClient.invalidateQueries({ queryKey: queryKeys.teeth(patientId) });
            if (typeof mutationVariables.toothNumber === "number") {
                queryClient.invalidateQueries({
                    queryKey: queryKeys.toothTreatments(patientId, mutationVariables.toothNumber),
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
        mutationFn: ({ id, data }) => apiClient.put(`/api/treatments/${id}`, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["treatments"] });
            queryClient.invalidateQueries({ queryKey: ["toothTreatments"] });
            queryClient.invalidateQueries({ queryKey: ["billing"] });
        },
    });
}
