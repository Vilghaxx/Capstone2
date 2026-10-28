import { z } from "zod";
import { isValidToothNumber } from "@/lib/teeth";
export const treatmentFormSchema = z.object({
    patientId: z.string().min(1, "Patient is required"),
    // null = full-mouth procedure (e.g. cleaning).
    toothNumber: z.union([
        z.coerce.number().int().refine(isValidToothNumber, "Invalid tooth number"),
        z.null(),
    ]),
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
