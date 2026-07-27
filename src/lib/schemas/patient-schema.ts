import { z } from "zod";

export const patientFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  phone: z.string().regex(/^(09|\+63)\d{9}$/, "Enter a valid PH mobile number (e.g. 09171234567 or +639171234567)"),
  email: z.string().email("Invalid email address"),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  address: z.string().optional().default(""),
  notes: z.string().max(1000, "Notes must be under 1000 characters").optional().default(""),
});

export type PatientFormValues = z.infer<typeof patientFormSchema>;
