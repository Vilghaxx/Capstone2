"use client";
import { useQuery, useMutation, useQueryClient, } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { queryKeys } from "@/hooks/query-keys";
export function useAppointments(filters) {
    return useQuery({
        queryKey: queryKeys.appointmentsList(filters),
        queryFn: () => {
            const qs = new URLSearchParams(filters !== null && filters !== void 0 ? filters : {}).toString();
            return apiClient.get(`/api/appointments${qs ? `?${qs}` : ""}`);
        },
    });
}
export function useAppointment(id) {
    return useQuery({
        queryKey: queryKeys.appointmentDetail(id !== null && id !== void 0 ? id : ""),
        queryFn: () => apiClient.get(`/api/appointments/${id}`),
        enabled: !!id,
    });
}
export function useCreateAppointment() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (payload) => apiClient.post("/api/appointments", payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["appointments"] });
        },
    });
}
export function useUpdateAppointment() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }) => apiClient.put(`/api/appointments/${id}`, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["appointments"] });
        },
    });
}
export function useDeleteAppointment() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id) => apiClient.del(`/api/appointments/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["appointments"] });
        },
    });
}
export function useDeleteAppointments() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: () => apiClient.del("/api/appointments"),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["appointments"] });
        },
    });
}
