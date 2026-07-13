import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import {
  getUserFromRequest,
  requireRole,
} from "@/lib/auth";
import {
  fail,
  handleZodError,
  notFound,
  ok,
  unauthorized,
  withErrors,
} from "@/lib/api-response";
import { appointmentFormSchema } from "@/lib/schemas/appointment-schema";
import { APPOINTMENT_STATUSES, ROLES } from "@/lib/constants";

/**
 * GET /api/appointments?status=&date=
 * - Authenticated users only.
 * - Patients only see their own appointments (patientId === user.patientRef).
 * - Staff (dentist / cashier) see all appointments.
 * - Optional `status` filter: equality match.
 * - Optional `date` filter (YYYY-MM-DD): matches appointments on the same
 *   calendar day, compared by a UTC day range (gte startOfDay, lt startOfNextDay).
 * - Ordered by date ascending.
 */
export const GET = withErrors(async (req: NextRequest) => {
  const user = getUserFromRequest(req);
  const roleCheck = requireRole(
    user,
    ROLES.DENTIST,
    ROLES.CASHIER,
    ROLES.PATIENT,
  );
  if (!roleCheck.ok) return unauthorized(roleCheck.error);

  const url = req.nextUrl;
  const status = url.searchParams.get("status")?.trim() || undefined;
  const date = url.searchParams.get("date")?.trim() || undefined;

  // Build the where clause
  const where: Record<string, unknown> = {};

  if (user!.role === ROLES.PATIENT) {
    // Patients are sandboxed to their own appointments. If the patient
    // account is not linked to a patient record, return an empty result set
    // rather than accidentally listing everyone's appointments.
    if (!user!.patientRef) return ok([]);
    where.patientId = user!.patientRef;
  }

  if (status) {
    where.status = status;
  }

  if (date) {
    // date is expected as YYYY-MM-DD. Filter by a UTC day range.
    const startOfDay = new Date(`${date}T00:00:00.000Z`);
    if (Number.isNaN(startOfDay.getTime())) {
      return fail("Invalid date format. Expected YYYY-MM-DD.", 400);
    }
    const startOfNextDay = new Date(
      startOfDay.getTime() + 24 * 60 * 60 * 1000,
    );
    where.date = { gte: startOfDay, lt: startOfNextDay };
  }

  const appointments = await db.appointment.findMany({
    where,
    orderBy: { date: "asc" },
  });

  return ok(appointments);
});

/**
 * POST /api/appointments
 * - Authenticated users only.
 * - Patients: patientId is forced to their own patientRef, status forced to
 *   "pending", createdBy = user.id.
 * - Staff: use body's patientId, status defaults to "scheduled" unless body
 *   specifies otherwise, createdBy = user.id.
 */
export const POST = withErrors(async (req: NextRequest) => {
  const user = getUserFromRequest(req);
  const roleCheck = requireRole(
    user,
    ROLES.DENTIST,
    ROLES.CASHIER,
    ROLES.PATIENT,
  );
  if (!roleCheck.ok) return unauthorized(roleCheck.error);

  const body = await req.json().catch(() => null);
  if (body === null) return fail("Invalid JSON body");

  const parsed = appointmentFormSchema.safeParse(body);
  if (!parsed.success) {
    return handleZodError(parsed.error);
  }
  const data = parsed.data;

  let patientId: string;
  let status: string;

  if (user!.role === ROLES.PATIENT) {
    if (!user!.patientRef) {
      return fail(
        "Patient account is not linked to a patient record.",
        400,
      );
    }
    patientId = user!.patientRef;
    status = APPOINTMENT_STATUSES.PENDING;
  } else {
    // Staff
    patientId = data.patientId;
    status = data.status || APPOINTMENT_STATUSES.SCHEDULED;
  }

  // Parse the date string into a Date object for storage.
  const parsedDate = new Date(data.date);
  if (Number.isNaN(parsedDate.getTime())) {
    return fail("Invalid date format.", 400);
  }

  // Verify the patient exists (no FK in schema, so we check explicitly).
  const patient = await db.patient.findUnique({ where: { id: patientId } });
  if (!patient) return notFound("Patient not found");

  const created = await db.appointment.create({
    data: {
      patientId,
      date: parsedDate,
      time: data.time,
      type: data.type,
      status,
      notes: data.notes ?? "",
      createdBy: user!.sub,
    },
  });

  return ok(created, 201);
});
