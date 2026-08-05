/**
 * Centralised React Query key factory.
 *
 * Every query has a stable, structured key so mutations can invalidate
 * exactly the right cache entries. Keys are arrays so React Query can
 * do partial matching when invalidating by prefix.
 */
export const queryKeys = {
    patientsList: (search, page, limit) => ["patients", { search, page, limit }],
    patientDetail: (id) => ["patient", id],
    teeth: (patientId) => ["teeth", patientId],
    treatments: (patientId) => ["treatments", patientId],
    toothTreatments: (patientId, toothNumber) => ["toothTreatments", patientId, toothNumber],
    appointmentsList: (filters) => ["appointments", filters !== null && filters !== void 0 ? filters : {}],
    appointmentDetail: (id) => ["appointment", id],
    billingList: (filters) => ["billing", filters !== null && filters !== void 0 ? filters : {}],
    billingSummary: () => ["billingSummary"],
    patientBilling: (patientId) => ["patientBilling", patientId],
};
