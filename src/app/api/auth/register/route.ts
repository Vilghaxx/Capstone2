import { db } from "@/lib/db";
import { hashPassword, signToken, type JwtPayload } from "@/lib/auth";
import {
  fail,
  handleZodError,
  ok,
  withErrors,
} from "@/lib/api-response";
import { registerFormSchema } from "@/lib/schemas/auth-schema";
import { ROLES, TOOTH_STATUSES, TOTAL_TEETH } from "@/lib/constants";

/**
 * POST /api/auth/register
 * Registers a new patient account: creates a User (role="patient"), a linked
 * Patient record, and 32 default Tooth records for the new patient.
 * Returns a JWT and the public user object.
 */
export const POST = withErrors(async (req: Request) => {
  const body = await req.json().catch(() => null);
  if (!body) return fail("Invalid JSON body", 400);

  const parsed = registerFormSchema.safeParse(body);
  if (!parsed.success) return handleZodError(parsed.error);

  const { name, username, password, phone, email, dateOfBirth, address } =
    parsed.data;

  // Ensure username is not taken.
  const existing = await db.user.findUnique({ where: { username } });
  if (existing) {
    return fail("Username is already taken", 409);
  }

  // Create the user account (patient role, not yet linked).
  const user = await db.user.create({
    data: {
      username,
      password: hashPassword(password),
      role: ROLES.PATIENT,
      name,
    },
  });

  // Create the corresponding Patient record.
  const patient = await db.patient.create({
    data: {
      name,
      phone,
      email,
      dateOfBirth,
      address: address ?? "",
    },
  });

  // Link the user to the new patient.
  await db.user.update({
    where: { id: user.id },
    data: { patientRef: patient.id },
  });

  // Create 32 default tooth records (all healthy) for the new patient.
  const teethData = Array.from({ length: TOTAL_TEETH }, (_, i) => ({
    patientId: patient.id,
    toothNumber: i + 1,
    status: TOOTH_STATUSES.HEALTHY,
    notes: null,
  }));
  await db.tooth.createMany({ data: teethData });

  const payload: JwtPayload = {
    sub: user.id,
    username: user.username,
    role: user.role,
    name: user.name,
    patientRef: patient.id,
  };

  const token = signToken(payload);

  return ok({
    token,
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
      name: user.name,
      patientRef: patient.id,
    },
  });
});
