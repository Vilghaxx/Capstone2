"use client";
import { useQuery, useMutation, useQueryClient, } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { queryKeys } from "@/hooks/query-keys";
export function useBilling(filters) {
    return useQuery({
        queryKey: queryKeys.billingList(filters),
        queryFn: () => {
            const qs = new URLSearchParams(filters !== null && filters !== void 0 ? filters : {}).toString();
            return apiClient.get(`/api/billing${qs ? `?${qs}` : ""}`);
        },
    });
}
export function useBillingSummary() {
    return useQuery({
        queryKey: queryKeys.billingSummary(),
        queryFn: () => apiClient.get("/api/billing/summary"),
    });
}
export function usePatientBilling(patientId) {
    return useQuery({
        queryKey: queryKeys.patientBilling(patientId !== null && patientId !== void 0 ? patientId : ""),
        queryFn: () => apiClient.get(`/api/billing/${patientId}`),
        enabled: !!patientId,
    });
}
export function useRecordPayment() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ treatmentId, data, }) => apiClient.put(`/api/billing/${treatmentId}/pay`, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["billing"] });
            queryClient.invalidateQueries({ queryKey: ["billingSummary"] });
            queryClient.invalidateQueries({ queryKey: ["patientBilling"] });
        },
    });
}
