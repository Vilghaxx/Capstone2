import { z } from "zod";

export const patientFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  phone: z.string().min(7, "Phone number is too short"),
  email: z.string().email("Invalid email address"),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  address: z.string().optional().default(""),
  notes: z.string().optional().default(""),
});

export type PatientFormValues = z.infer<typeof patientFormSchema>;
