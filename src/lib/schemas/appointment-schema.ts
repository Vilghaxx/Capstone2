import { z } from "zod";

export const appointmentFormSchema = z.object({
  patientId: z.string().min(1, "Patient is required"),
  date: z.string().min(1, "Date is required"),
  time: z.string().min(1, "Time is required"),
  type: z.string().min(1, "Type is required"),
  notes: z.string().optional().default(""),
  status: z.string().optional().default("scheduled"),
});

export const appointmentStatusUpdateSchema = z.object({
  status: z.string().min(1, "Status is required"),
});

export type AppointmentFormValues = z.infer<typeof appointmentFormSchema>;
