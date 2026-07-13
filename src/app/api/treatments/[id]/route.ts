import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getUserFromRequest, requireRole } from "@/lib/auth";
import {
  errorResponse,
  jsonResponse,
  unauthorized,
  forbidden,
  notFound,
  handleZodError,
  withErrors,
} from "@/lib/api-response";
import { ROLES } from "@/lib/constants";
import { treatmentUpdateSchema } from "@/lib/schemas/treatment-schema";

/**
 * GET /api/treatments/[id]
 * Authenticated users only.
 * The `id` param is interpreted as a **patientId** here — returns all
 * treatments for that patient, newest first.
 *
 * (PUT below treats the same param as a treatment id; both share the single
 * dynamic segment `id` to satisfy Next.js App Router's sibling-segment rule.)
 */
export const GET = withErrors(
  async (
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
  ) => {
    const user = getUserFromRequest(_req);
    if (!user) return unauthorized();

    const { id: patientId } = await params;

    const treatments = await db.treatment.findMany({
      where: { patientId },
      orderBy: { date: "desc" },
    });

    return jsonResponse(treatments);
  }
);

/**
 * PUT /api/treatments/[id]
 * Dentist only.
 * The `id` param is interpreted as a **treatment id** here.
 * Updates an existing treatment. Returns 404 if the treatment does not exist.
 */
export const PUT = withErrors(
  async (
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
  ) => {
    const user = getUserFromRequest(req);
    const roleCheck = requireRole(user, ROLES.DENTIST);
    if (!roleCheck.ok) {
      return roleCheck.error === "Authentication required"
        ? unauthorized(roleCheck.error)
        : forbidden(roleCheck.error);
    }

    const { id } = await params;

    const existing = await db.treatment.findUnique({ where: { id } });
    if (!existing) return notFound("Treatment not found");

    const body = await req.json().catch(() => null);
    if (body === null) return errorResponse("Invalid JSON body", 400);

    const parsed = treatmentUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return handleZodError(parsed.error);
    }

    const updated = await db.treatment.update({
      where: { id },
      data: parsed.data,
    });

    return jsonResponse(updated);
  }
);
