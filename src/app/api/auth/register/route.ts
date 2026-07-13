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

  // Create the user, patient, link, and 32 teeth atomically so a failure at
  // any step does not leave orphan rows behind.
  const result = await db.$transaction(async (tx) => {
    // Re-check inside the transaction to close the race window.
    const raceExisting = await tx.user.findUnique({ where: { username } });
    if (raceExisting) {
      throw new Error("USERNAME_TAKEN");
    }

    const newUser = await tx.user.create({
      data: {
        username,
        password: hashPassword(password),
        role: ROLES.PATIENT,
        name,
      },
    });

    const newPatient = await tx.patient.create({
      data: {
        name,
        phone,
        email,
        dateOfBirth,
        address: address ?? "",
      },
    });

    await tx.user.update({
      where: { id: newUser.id },
      data: { patientRef: newPatient.id },
    });

    // Create 32 default tooth records (all healthy) for the new patient.
    const teethData = Array.from({ length: TOTAL_TEETH }, (_, i) => ({
      patientId: newPatient.id,
      toothNumber: i + 1,
      status: TOOTH_STATUSES.HEALTHY,
      notes: null,
    }));
    await tx.tooth.createMany({ data: teethData });

    return { user: newUser, patient: newPatient };
  }).catch((err) => {
    if (err instanceof Error && err.message === "USERNAME_TAKEN") {
      return null;
    }
    throw err;
  });

  if (!result) {
    return fail("Username is already taken", 409);
  }

  const { user, patient } = result;

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
