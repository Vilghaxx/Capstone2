import { seedDatabase } from "@/lib/seed";
import { ok, withErrors } from "@/lib/api-response";

/**
 * POST /api/auth/seed
 * Seeds the database with demo staff + sample patients/appointments.
 *
 * NOTE: This endpoint must be disabled (or guarded behind an admin role /
 * environment check) before deploying to production. It is exposed here only
 * for local development convenience.
 */
export const POST = withErrors(async () => {
  const results = await seedDatabase();
  return ok({ message: "Seed completed", results });
});
