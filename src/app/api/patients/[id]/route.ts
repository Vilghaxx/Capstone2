import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getUserFromRequest, requireRole } from "@/lib/auth";
import {
  errorResponse,
  forbidden,
  handleZodError,
  notFound,
  jsonResponse,
  unauthorized,
  withErrors,
} from "@/lib/api-response";
import { patientFormSchema } from "@/lib/schemas/patient-schema";
import { ROLES } from "@/lib/constants";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * GET /api/patients/:id
 * Any authenticated user.
 */
export const GET = withErrors(async (req: NextRequest, ctx: RouteContext) => {
  const user = getUserFromRequest(req);
  if (!user) return unauthorized();

  const { id } = await ctx.params;
  const patient = await db.patient.findUnique({ where: { id } });
  if (!patient) return notFound("Patient not found");

  return jsonResponse(patient);
});

/**
 * PUT /api/patients/:id
 * Dentist or cashier.
 */
export const PUT = withErrors(async (req: NextRequest, ctx: RouteContext) => {
  const user = getUserFromRequest(req);
  if (!user) return unauthorized();
  const roleCheck = requireRole(user, ROLES.DENTIST, ROLES.CASHIER);
  if (!roleCheck.ok) return forbidden();

  const { id } = await ctx.params;

  const existing = await db.patient.findUnique({ where: { id } });
  if (!existing) return notFound("Patient not found");

  const body = await req.json().catch(() => null);
  if (body === null) return errorResponse("Invalid JSON body");

  const parsed = patientFormSchema.safeParse(body);
  if (!parsed.success) return handleZodError(parsed.error);

  const updated = await db.patient.update({
    where: { id },
    data: {
      name: parsed.data.name,
      phone: parsed.data.phone,
      email: parsed.data.email,
      dateOfBirth: parsed.data.dateOfBirth,
      address: parsed.data.address ?? "",
      notes: parsed.data.notes ?? "",
      updatedAt: new Date(),
    },
  });

  return jsonResponse(updated);
});

/**
 * DELETE /api/patients/:id
 * Dentist or cashier. Cascades teeth, treatments, and appointments.
 */
export const DELETE = withErrors(
  async (req: NextRequest, ctx: RouteContext) => {
    const user = getUserFromRequest(req);
    if (!user) return unauthorized();
    const roleCheck = requireRole(user, ROLES.DENTIST, ROLES.CASHIER);
    if (!roleCheck.ok) return forbidden();

    const { id } = await ctx.params;

    const existing = await db.patient.findUnique({ where: { id } });
    if (!existing) return notFound("Patient not found");

    // Cascade-delete related rows before the patient itself.
    await db.tooth.deleteMany({ where: { patientId: id } });
    await db.treatment.deleteMany({ where: { patientId: id } });
    await db.appointment.deleteMany({ where: { patientId: id } });
    await db.patient.delete({ where: { id } });

    return jsonResponse({ success: true });
  }
);
