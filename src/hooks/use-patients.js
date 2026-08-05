"use client";
import { useQuery, useMutation, useQueryClient, keepPreviousData, } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { queryKeys } from "@/hooks/query-keys";
export function usePatients(search = "", page = 1, limit = 50) {
    return useQuery({
        queryKey: queryKeys.patientsList(search, page, limit),
        queryFn: () => apiClient.get(`/api/patients?search=${encodeURIComponent(search)}&page=${page}&limit=${limit}`),
        placeholderData: keepPreviousData,
    });
}
export function usePatient(id) {
    return useQuery({
        queryKey: queryKeys.patientDetail(id !== null && id !== void 0 ? id : ""),
        queryFn: () => apiClient.get(`/api/patients/${id}`),
        enabled: !!id,
    });
}
export function useCreatePatient() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (payload) => apiClient.post("/api/patients", payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["patients"] });
        },
    });
}
export function useUpdatePatient() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }) => apiClient.put(`/api/patients/${id}`, data),
        onSuccess: (patient) => {
            queryClient.invalidateQueries({ queryKey: ["patients"] });
            queryClient.invalidateQueries({
                queryKey: queryKeys.patientDetail(patient.id),
            });
        },
    });
}
export function useMyProfile() {
    return useQuery({
        queryKey: ["my-profile"],
        queryFn: () => apiClient.get("/api/auth/profile"),
    });
}
export function useUpdateMyProfile() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data) => apiClient.put("/api/auth/profile", data),
        onSuccess: (patient) => {
            queryClient.invalidateQueries({ queryKey: ["my-profile"] });
            queryClient.invalidateQueries({
                queryKey: queryKeys.patientDetail(patient.id),
            });
            queryClient.invalidateQueries({ queryKey: ["patients"] });
        },
    });
}
export function useDeletePatient() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id) => apiClient.del(`/api/patients/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["patients"] });
        },
    });
}
