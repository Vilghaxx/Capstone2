import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getUserFromRequest, requireRole } from "@/lib/auth";
import {
  ok,
  unauthorized,
  forbidden,
  handleZodError,
  withErrors,
} from "@/lib/api-response";
import { ROLES, TOOTH_STATUSES } from "@/lib/constants";
import { treatmentFormSchema } from "@/lib/schemas/treatment-schema";

/**
 * POST /api/treatments
 * Dentist only.
 * Creates a treatment record and marks the related tooth as "treated".
 */
export const POST = withErrors(async (req: NextRequest) => {
  const user = getUserFromRequest(req);
  const roleCheck = requireRole(user, ROLES.DENTIST);
  if (!roleCheck.ok) {
    return roleCheck.error === "Authentication required"
      ? unauthorized(roleCheck.error)
      : forbidden(roleCheck.error);
  }

  const body = await req.json();
  const parsed = treatmentFormSchema.safeParse(body);
  if (!parsed.success) {
    return handleZodError(parsed.error);
  }

  const { patientId, toothNumber, procedure, notes, cost, followUpDate } =
    parsed.data;

  // Create the treatment and update the tooth status atomically.
  const treatment = await db.$transaction(async (tx) => {
    const created = await tx.treatment.create({
      data: {
        patientId,
        toothNumber,
        procedure,
        notes,
        cost,
        followUpDate: followUpDate ?? null,
        date: new Date(),
        dentistId: user.sub,
        dentistName: user.name,
        paid: false,
      },
    });

    // Side effect: mark the tooth as treated and record the last procedure.
    await tx.tooth.update({
      where: { patientId_toothNumber: { patientId, toothNumber } },
      data: {
        status: TOOTH_STATUSES.TREATED,
        lastTreatment: procedure,
        lastTreatmentDate: new Date(),
      },
    });

    return created;
  });

  return ok(treatment, 201);
});
