import { z } from "zod";

export const paymentFormSchema = z.object({
  paymentMethod: z.string().min(1, "Payment method is required"),
  paidAmount: z.coerce
    .number()
    .min(0.01, "Amount must be greater than 0"),
});

export const toothUpdateSchema = z.object({
  status: z.string().min(1, "Status is required"),
  notes: z.string().nullable().optional(),
});

export type PaymentFormValues = z.infer<typeof paymentFormSchema>;
