"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import { api } from "@/lib/api";
import type {
  Patient,
  Tooth,
  Treatment,
  Appointment,
  BillingRecord,
  BillingSummary,
  PatientBillingSummary,
  PaginatedResponse,
} from "@/lib/types";
import { useEffect, useState } from "react";

// ---------- Query keys ----------
export const qk = {
  patients: (search?: string, page?: number, limit?: number) =>
    ["patients", { search, page, limit }] as const,
  patient: (id: string) => ["patient", id] as const,
  teeth: (patientId: string) => ["teeth", patientId] as const,
  treatments: (patientId: string) => ["treatments", patientId] as const,
  toothTreatments: (patientId: string, toothNumber: number) =>
    ["toothTreatments", patientId, toothNumber] as const,
  appointments: (filters?: Record<string, string>) =>
    ["appointments", filters ?? {}] as const,
  appointment: (id: string) => ["appointment", id] as const,
  billing: (filters?: Record<string, string>) => ["billing", filters ?? {}] as const,
  billingSummary: () => ["billingSummary"] as const,
  patientBilling: (patientId: string) => ["patientBilling", patientId] as const,
};

// ---------- Patients ----------
export function usePatients(search = "", page = 1, limit = 50) {
  return useQuery({
    queryKey: qk.patients(search, page, limit),
    queryFn: () =>
      api.get<PaginatedResponse<Patient>>(
        `/api/patients?search=${encodeURIComponent(search)}&page=${page}&limit=${limit}`
      ),
    placeholderData: keepPreviousData,
  });
}

export function usePatient(id: string | null) {
  return useQuery({
    queryKey: qk.patient(id ?? ""),
    queryFn: () => api.get<Patient>(`/api/patients/${id}`),
    enabled: !!id,
  });
}

export function useCreatePatient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      api.post<Patient>("/api/patients", payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["patients"] });
    },
  });
}

export function useUpdatePatient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      api.put<Patient>(`/api/patients/${id}`, data),
    onSuccess: (patient) => {
      qc.invalidateQueries({ queryKey: ["patients"] });
      qc.invalidateQueries({ queryKey: qk.patient(patient.id) });
    },
  });
}

export function useDeletePatient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del(`/api/patients/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["patients"] });
    },
  });
}

// ---------- Teeth ----------
export function useTeeth(patientId: string | null) {
  return useQuery({
    queryKey: qk.teeth(patientId ?? ""),
    queryFn: () => api.get<Tooth[]>(`/api/teeth/${patientId}`),
    enabled: !!patientId,
  });
}

export function useUpdateTooth() {
  const qc = useQueryClient();
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
      api.put<Tooth>(`/api/teeth/${patientId}/${toothNumber}`, data),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: qk.teeth(vars.patientId) });
    },
  });
}

// ---------- Treatments ----------
export function useTreatments(patientId: string | null) {
  return useQuery({
    queryKey: qk.treatments(patientId ?? ""),
    queryFn: () => api.get<Treatment[]>(`/api/treatments/${patientId}`),
    enabled: !!patientId,
  });
}

export function useToothTreatments(
  patientId: string | null,
  toothNumber: number | null
) {
  return useQuery({
    queryKey: qk.toothTreatments(patientId ?? "", toothNumber ?? 0),
    queryFn: () =>
      api.get<Treatment[]>(
        `/api/treatments/tooth/${patientId}/${toothNumber}`
      ),
    enabled: !!patientId && toothNumber != null,
  });
}

export function useCreateTreatment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      api.post<Treatment>("/api/treatments", payload),
    onSuccess: (_data, vars) => {
      const patientId = vars.patientId as string;
      qc.invalidateQueries({ queryKey: qk.treatments(patientId) });
      qc.invalidateQueries({ queryKey: qk.teeth(patientId) });
      if (typeof vars.toothNumber === "number") {
        qc.invalidateQueries({
          queryKey: qk.toothTreatments(patientId, vars.toothNumber),
        });
      }
      qc.invalidateQueries({ queryKey: ["billing"] });
      qc.invalidateQueries({ queryKey: ["billingSummary"] });
      qc.invalidateQueries({ queryKey: ["patientBilling"] });
    },
  });
}

export function useUpdateTreatment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      api.put<Treatment>(`/api/treatments/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["treatments"] });
      qc.invalidateQueries({ queryKey: ["toothTreatments"] });
      qc.invalidateQueries({ queryKey: ["billing"] });
    },
  });
}

// ---------- Appointments ----------
export function useAppointments(filters?: Record<string, string>) {
  return useQuery({
    queryKey: qk.appointments(filters),
    queryFn: () => {
      const qs = new URLSearchParams(filters ?? {}).toString();
      return api.get<Appointment[]>(
        `/api/appointments${qs ? `?${qs}` : ""}`
      );
    },
  });
}

export function useAppointment(id: string | null) {
  return useQuery({
    queryKey: qk.appointment(id ?? ""),
    queryFn: () => api.get<Appointment>(`/api/appointments/${id}`),
    enabled: !!id,
  });
}

export function useCreateAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      api.post<Appointment>("/api/appointments", payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["appointments"] });
    },
  });
}

export function useUpdateAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      api.put<Appointment>(`/api/appointments/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["appointments"] });
    },
  });
}

export function useDeleteAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del(`/api/appointments/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["appointments"] });
    },
  });
}

// ---------- Billing ----------
export function useBilling(filters?: Record<string, string>) {
  return useQuery({
    queryKey: qk.billing(filters),
    queryFn: () => {
      const qs = new URLSearchParams(filters ?? {}).toString();
      return api.get<BillingRecord[]>(
        `/api/billing${qs ? `?${qs}` : ""}`
      );
    },
  });
}

export function useBillingSummary() {
  return useQuery({
    queryKey: qk.billingSummary(),
    queryFn: () => api.get<BillingSummary>("/api/billing/summary"),
  });
}

export function usePatientBilling(patientId: string | null) {
  return useQuery({
    queryKey: qk.patientBilling(patientId ?? ""),
    queryFn: () =>
      api.get<{ data: Treatment[]; summary: PatientBillingSummary }>(
        `/api/billing/${patientId}`
      ),
    enabled: !!patientId,
  });
}

export function useRecordPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      treatmentId,
      data,
    }: {
      treatmentId: string;
      data: Record<string, unknown>;
    }) => api.put<Treatment>(`/api/billing/${treatmentId}/pay`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["billing"] });
      qc.invalidateQueries({ queryKey: ["billingSummary"] });
      qc.invalidateQueries({ queryKey: ["patientBilling"] });
    },
  });
}

// ---------- Generic debounce ----------
export function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}
