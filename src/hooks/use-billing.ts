"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import type {
  BillingRecord,
  BillingSummary,
  PatientBillingSummary,
  Treatment,
} from "@/lib/types";
import { queryKeys } from "@/hooks/query-keys";

export function useBilling(filters?: Record<string, string>) {
  return useQuery({
    queryKey: queryKeys.billingList(filters),
    queryFn: () => {
      const qs = new URLSearchParams(filters ?? {}).toString();
      return apiClient.get<BillingRecord[]>(
        `/api/billing${qs ? `?${qs}` : ""}`
      );
    },
  });
}

export function useBillingSummary() {
  return useQuery({
    queryKey: queryKeys.billingSummary(),
    queryFn: () => apiClient.get<BillingSummary>("/api/billing/summary"),
  });
}

export function usePatientBilling(patientId: string | null) {
  return useQuery({
    queryKey: queryKeys.patientBilling(patientId ?? ""),
    queryFn: () =>
      apiClient.get<{ data: Treatment[]; summary: PatientBillingSummary }>(
        `/api/billing/${patientId}`
      ),
    enabled: !!patientId,
  });
}

export function useRecordPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      treatmentId,
      data,
    }: {
      treatmentId: string;
      data: Record<string, unknown>;
    }) => apiClient.put<Treatment>(`/api/billing/${treatmentId}/pay`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["billing"] });
      queryClient.invalidateQueries({ queryKey: ["billingSummary"] });
      queryClient.invalidateQueries({ queryKey: ["patientBilling"] });
    },
  });
}
