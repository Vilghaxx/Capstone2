import type { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  getUserFromRequest,
  requireRole,
} from "@/lib/auth";
import {
  errorResponse,
  forbidden,
  handleZodError,
  notFound,
  jsonResponse,
  unauthorized,
  withErrors,
} from "@/lib/api-response";
import { ROLES } from "@/lib/constants";

// Permissive update schema — any combination of fields is allowed.
const appointmentUpdateSchema = z.object({
  status: z.string().min(1).optional(),
  notes: z.string().optional(),
  time: z.string().min(1).optional(),
  type: z.string().min(1).optional(),
  date: z.string().min(1).optional(),
});

type Params = { params: Promise<{ id: string }> };

/**
 * GET /api/appointments/[id]
 * - Authenticated users only.
 * - Patients can only fetch their own appointments.
 */
export const GET = withErrors(
  async (req: NextRequest, { params }: Params) => {
    const user = getUserFromRequest(req);
    const roleCheck = requireRole(
      user,
      ROLES.DENTIST,
      ROLES.CASHIER,
      ROLES.PATIENT,
    );
    if (!roleCheck.ok) return unauthorized(roleCheck.error);

    const { id } = await params;

    const appointment = await db.appointment.findUnique({ where: { id } });
    if (!appointment) return notFound("Appointment not found");

    if (
      user!.role === ROLES.PATIENT &&
      appointment.patientId !== user!.patientRef
    ) {
      return forbidden("You can only view your own appointments");
    }

    return jsonResponse(appointment);
  },
);

/**
 * PUT /api/appointments/[id]
 * - Staff only (dentist OR cashier). Patients cannot update.
 * - Accepts a partial body: { status?, notes?, time?, type?, date? }.
 * - If `date` is provided, it is parsed to a Date object before storage.
 */
export const PUT = withErrors(
  async (req: NextRequest, { params }: Params) => {
    const user = getUserFromRequest(req);
    const roleCheck = requireRole(user, ROLES.DENTIST, ROLES.CASHIER);
    if (!roleCheck.ok) {
      // Authenticated patient (or unauthenticated) -> 403 for non-staff.
      return user ? forbidden() : unauthorized(roleCheck.error);
    }

    const { id } = await params;

    const existing = await db.appointment.findUnique({ where: { id } });
    if (!existing) return notFound("Appointment not found");

    const body = await req.json().catch(() => null);
    if (body === null) return errorResponse("Invalid JSON body", 400);

    const parsed = appointmentUpdateSchema.safeParse(body);
    if (!parsed.success) return handleZodError(parsed.error);

    const { status, notes, time, type, date } = parsed.data;

    // Build only the fields that were provided.
    const data: Record<string, unknown> = {};
    if (status !== undefined) data.status = status;
    if (notes !== undefined) data.notes = notes;
    if (time !== undefined) data.time = time;
    if (type !== undefined) data.type = type;
    if (date !== undefined) {
      const parsedDate = new Date(date);
      if (Number.isNaN(parsedDate.getTime())) {
        return errorResponse("Invalid date format.", 400);
      }
      data.date = parsedDate;
    }

    if (Object.keys(data).length === 0) {
      return jsonResponse(existing);
    }

    const updated = await db.appointment.update({
      where: { id },
      data,
    });

    return jsonResponse(updated);
  },
);

/**
 * DELETE /api/appointments/[id]
 * - Dentist only.
 */
export const DELETE = withErrors(
  async (req: NextRequest, { params }: Params) => {
    const user = getUserFromRequest(req);
    const roleCheck = requireRole(user, ROLES.DENTIST);
    if (!roleCheck.ok) {
      return user ? forbidden() : unauthorized(roleCheck.error);
    }

    const { id } = await params;

    const existing = await db.appointment.findUnique({ where: { id } });
    if (!existing) return notFound("Appointment not found");

    await db.appointment.delete({ where: { id } });

    return jsonResponse({ success: true });
  },
);
