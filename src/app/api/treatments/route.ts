import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getUserFromRequest, requireRole } from "@/lib/auth";
import {
  errorResponse,
  notFound,
  jsonResponse,
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
  // After the role check, user is guaranteed non-null.
  const dentist = user!;

  const body = await req.json().catch(() => null);
  if (body === null) return errorResponse("Invalid JSON body", 400);

  const parsed = treatmentFormSchema.safeParse(body);
  if (!parsed.success) {
    return handleZodError(parsed.error);
  }

  const { patientId, toothNumber, procedure, notes, cost, followUpDate } =
    parsed.data;

  // Verify the patient exists before creating a treatment (no FK in schema).
  const patient = await db.patient.findUnique({ where: { id: patientId } });
  if (!patient) return notFound("Patient not found");

  // Create the treatment and update the tooth status atomically. Use upsert
  // for the tooth so the transaction does not crash (P2025) if the tooth row
  // is somehow missing for this patient/toothNumber combination.
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
        dentistId: dentist.sub,
        dentistName: dentist.name,
        paid: false,
      },
    });

    // Side effect: mark the tooth as treated and record the last procedure.
    await tx.tooth.upsert({
      where: { patientId_toothNumber: { patientId, toothNumber } },
      update: {
        status: TOOTH_STATUSES.TREATED,
        lastTreatment: procedure,
        lastTreatmentDate: new Date(),
      },
      create: {
        patientId,
        toothNumber,
        status: TOOTH_STATUSES.TREATED,
        lastTreatment: procedure,
        lastTreatmentDate: new Date(),
      },
    });

    return created;
  });

  return jsonResponse(treatment, 201);
});
