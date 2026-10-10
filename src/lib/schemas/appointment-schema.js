import { z } from "zod";
export const appointmentFormSchema = z.object({
    patientId: z.string().min(1, "Patient is required"),
    date: z.string().min(1, "Date is required"),
    time: z.string().min(1, "Time is required").refine(
        (t) => /^\d{2}:\d{2}$/.test(t) && Number(t.split(':')[0]) >= 9 && Number(t.split(':')[0]) < 17,
        "Appointments must be scheduled between 09:00 and 16:59"
    ),
    type: z.string().min(1, "Type is required"),
    notes: z.string().optional().default(""),
    status: z.string().optional().default("scheduled"),
});
export const appointmentStatusUpdateSchema = z.object({
    status: z.string().min(1, "Status is required"),
});
