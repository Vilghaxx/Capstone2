import { z } from "zod";

export const loginFormSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

/**
 * The backend registration payload schema. confirmPassword is optional here
 * because it is a frontend-only field (used for the password-match check in
 * the form). The API never requires it.
 */
export const registerFormSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    username: z
      .string()
      .min(3, "Username must be at least 3 characters")
      .max(30, "Username is too long"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string().optional(),
    phone: z.string().min(7, "Phone number is too short"),
    email: z.string().email("Invalid email address"),
    dateOfBirth: z.string().min(1, "Date of birth is required"),
    address: z.string().optional().default(""),
  })
  .refine(
    (data) =>
      data.confirmPassword === undefined ||
      data.password === data.confirmPassword,
    {
      message: "Passwords do not match",
      path: ["confirmPassword"],
    }
  );

export type LoginFormValues = z.infer<typeof loginFormSchema>;
export type RegisterFormValues = z.infer<typeof registerFormSchema>;
