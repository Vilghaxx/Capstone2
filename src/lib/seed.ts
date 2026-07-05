import { z } from "zod";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { ROLES, TOTAL_TEETH, TOOTH_STATUSES } from "@/lib/constants";

/**
 * Seed the database with demo dentist + cashier accounts, and a few sample
 * patients + appointments so the app is explorable immediately.
 *
 * Idempotent: re-running will not duplicate existing demo users.
 */
export async function seedDatabase() {
  const results = { users: 0, patients: 0, teeth: 0, appointments: 0 };

  // --- Demo staff accounts ---
  const demoUsers = [
    {
      username: "dentist",
      password: "dentist123",
      role: ROLES.DENTIST,
      name: "Dr. Amara Reyes",
    },
    {
      username: "cashier",
      password: "cashier123",
      role: ROLES.CASHIER,
      name: "Marco Dela Cruz",
    },
  ];

  for (const u of demoUsers) {
    const existing = await db.user.findUnique({ where: { username: u.username } });
    if (!existing) {
      await db.user.create({
        data: {
          username: u.username,
          password: hashPassword(u.password),
          role: u.role,
          name: u.name,
        },
      });
      results.users++;
    }
  }

  const dentist = await db.user.findUnique({ where: { username: "dentist" } });
  const dentistId = dentist?.id ?? "unknown";

  // --- Sample patients (only if none exist) ---
  const patientCount = await db.patient.count();
  if (patientCount === 0) {
    const samplePatients = [
      {
        name: "Juan Santiago",
        phone: "+63 917 123 4567",
        email: "juan.santiago@example.com",
        dateOfBirth: "1991-04-12",
        address: "123 Mabini St, Quezon City",
        notes: "Sensitive to cold drinks.",
      },
      {
        name: "Maria Clara Santos",
        phone: "+63 918 234 5678",
        email: "maria.santos@example.com",
        dateOfBirth: "1996-08-23",
        address: "88 Rizal Ave, Makati City",
        notes: "Prefers morning appointments.",
      },
      {
        name: "Pedro Penduko",
        phone: "+63 919 345 6789",
        email: "pedro.penduko@example.com",
        dateOfBirth: "1988-12-05",
        address: "45 Bonifacio Dr, Pasig City",
        notes: "Wisdom tooth extraction history.",
      },
      {
        name: "Aling Nena",
        phone: "+63 920 456 7890",
        email: "nena.bynet@example.com",
        dateOfBirth: "1973-02-17",
        address: "12 Aguinaldo Hwy, Cavite",
        notes: "Requires partial denture on lower right.",
      },
    ];

    for (const p of samplePatients) {
      const patient = await db.patient.create({ data: p });
      results.patients++;

      // Create 32 default teeth, marking a few with sample statuses
      const sampleStatuses: Record<number, string> = {
        3: TOOTH_STATUSES.TREATED,
        14: TOOTH_STATUSES.NEEDS_ATTENTION,
        19: TOOTH_STATUSES.URGENT,
        30: TOOTH_STATUSES.TREATED,
      };
      const teethData = Array.from({ length: TOTAL_TEETH }, (_, i) => {
        const toothNumber = i + 1;
        const status = sampleStatuses[toothNumber] ?? TOOTH_STATUSES.HEALTHY;
        return {
          patientId: patient.id,
          toothNumber,
          status,
          notes: status === TOOTH_STATUSES.HEALTHY ? null : "Seeded sample status",
        };
      });
      await db.tooth.createMany({ data: teethData });
      results.teeth += TOTAL_TEETH;
    }

    // --- Sample appointments for first patient ---
    const firstPatient = await db.patient.findFirst({
      orderBy: { createdAt: "asc" },
    });
    if (firstPatient) {
      const now = Date.now();
      const day = 24 * 60 * 60 * 1000;
      await db.appointment.create({
        data: {
          patientId: firstPatient.id,
          date: new Date(now + 2 * day),
          time: "10:00",
          type: "checkup",
          status: "scheduled",
          notes: "Routine checkup",
          createdBy: dentistId,
        },
      });
      await db.appointment.create({
        data: {
          patientId: firstPatient.id,
          date: new Date(now + 5 * day),
          time: "14:30",
          type: "cleaning",
          status: "pending",
          notes: "Awaiting confirmation",
          createdBy: dentistId,
        },
      });
      results.appointments += 2;
    }
  }

  return results;
}

/** Zod schema used by both auth + patient endpoints. */
export const patientFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  phone: z.string().min(7, "Phone number is too short"),
  email: z.string().email("Invalid email address"),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  address: z.string().optional().default(""),
  notes: z.string().optional().default(""),
});
