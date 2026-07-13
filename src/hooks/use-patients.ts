"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import type { Patient, PaginatedResponse } from "@/lib/types";
import { queryKeys } from "@/hooks/query-keys";

export function usePatients(search = "", page = 1, limit = 50) {
  return useQuery({
    queryKey: queryKeys.patientsList(search, page, limit),
    queryFn: () =>
      apiClient.get<PaginatedResponse<Patient>>(
        `/api/patients?search=${encodeURIComponent(search)}&page=${page}&limit=${limit}`
      ),
    placeholderData: keepPreviousData,
  });
}

export function usePatient(id: string | null) {
  return useQuery({
    queryKey: queryKeys.patientDetail(id ?? ""),
    queryFn: () => apiClient.get<Patient>(`/api/patients/${id}`),
    enabled: !!id,
  });
}

export function useCreatePatient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      apiClient.post<Patient>("/api/patients", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patients"] });
    },
  });
}

export function useUpdatePatient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      apiClient.put<Patient>(`/api/patients/${id}`, data),
    onSuccess: (patient) => {
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      queryClient.invalidateQueries({
        queryKey: queryKeys.patientDetail(patient.id),
      });
    },
  });
}

export function useDeletePatient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.del(`/api/patients/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patients"] });
    },
  });
}
