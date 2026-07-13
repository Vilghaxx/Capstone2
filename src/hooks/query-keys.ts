/**
 * Centralised React Query key factory.
 *
 * Every query has a stable, structured key so mutations can invalidate
 * exactly the right cache entries. Keys are arrays so React Query can
 * do partial matching when invalidating by prefix.
 */
export const queryKeys = {
  patientsList: (search?: string, page?: number, limit?: number) =>
    ["patients", { search, page, limit }] as const,
  patientDetail: (id: string) => ["patient", id] as const,
  teeth: (patientId: string) => ["teeth", patientId] as const,
  treatments: (patientId: string) => ["treatments", patientId] as const,
  toothTreatments: (patientId: string, toothNumber: number) =>
    ["toothTreatments", patientId, toothNumber] as const,
  appointmentsList: (filters?: Record<string, string>) =>
    ["appointments", filters ?? {}] as const,
  appointmentDetail: (id: string) => ["appointment", id] as const,
  billingList: (filters?: Record<string, string>) =>
    ["billing", filters ?? {}] as const,
  billingSummary: () => ["billingSummary"] as const,
  patientBilling: (patientId: string) =>
    ["patientBilling", patientId] as const,
};
