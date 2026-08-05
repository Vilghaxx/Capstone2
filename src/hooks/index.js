/**
 * Barrel file — single import surface for all client-side hooks.
 *
 *   import { usePatients, usePatient, useAppointments } from "@/hooks";
 */
export { usePatients, usePatient, useCreatePatient, useUpdatePatient, useDeletePatient, useMyProfile, useUpdateMyProfile, } from "@/hooks/use-patients";
export { useTeeth, useUpdateTooth } from "@/hooks/use-teeth";
export { useTreatments, useToothTreatments, useCreateTreatment, useUpdateTreatment, } from "@/hooks/use-treatments";
export { useAppointments, useAppointment, useCreateAppointment, useUpdateAppointment, useDeleteAppointment, useDeleteAppointments, } from "@/hooks/use-appointments";
export { useBilling, useBillingSummary, usePatientBilling, useRecordPayment, } from "@/hooks/use-billing";
export { useDebounce } from "@/hooks/use-debounce";
export { queryKeys } from "@/hooks/query-keys";
