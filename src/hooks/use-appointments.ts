"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import type { Appointment } from "@/lib/types";
import { queryKeys } from "@/hooks/query-keys";

export function useAppointments(filters?: Record<string, string>) {
  return useQuery({
    queryKey: queryKeys.appointmentsList(filters),
    queryFn: () => {
      const qs = new URLSearchParams(filters ?? {}).toString();
      return apiClient.get<Appointment[]>(
        `/api/appointments${qs ? `?${qs}` : ""}`
      );
    },
  });
}

export function useAppointment(id: string | null) {
  return useQuery({
    queryKey: queryKeys.appointmentDetail(id ?? ""),
    queryFn: () => apiClient.get<Appointment>(`/api/appointments/${id}`),
    enabled: !!id,
  });
}

export function useCreateAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      apiClient.post<Appointment>("/api/appointments", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
    },
  });
}

export function useUpdateAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      apiClient.put<Appointment>(`/api/appointments/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
    },
  });
}

export function useDeleteAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.del(`/api/appointments/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
    },
  });
}
