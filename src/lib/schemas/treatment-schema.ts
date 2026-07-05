import { z } from "zod";

export const treatmentFormSchema = z.object({
  patientId: z.string().min(1, "Patient is required"),
  toothNumber: z.coerce.number().int().min(1).max(32),
  procedure: z.string().min(2, "Procedure is required"),
  notes: z.string().optional().default(""),
  cost: z.coerce.number().min(0, "Cost must be a positive number"),
  followUpDate: z.string().nullable().optional(),
});

export const treatmentUpdateSchema = z.object({
  procedure: z.string().min(2).optional(),
  notes: z.string().optional(),
  cost: z.coerce.number().min(0).optional(),
  followUpDate: z.string().nullable().optional(),
});

export type TreatmentFormValues = z.infer<typeof treatmentFormSchema>;
