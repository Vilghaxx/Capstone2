import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getUserFromRequest, requireRole } from "@/lib/auth";
import { ROLES } from "@/lib/constants";
import { toothUpdateSchema } from "@/lib/schemas/billing-schema";
import {
  fail,
  ok,
  unauthorized,
  forbidden,
  notFound,
  handleZodError,
  withErrors,
} from "@/lib/api-response";

/**
 * GET /api/teeth/[patientId]/[toothNumber]
 * Returns a single tooth for a patient by toothNumber.
 * Authenticated users only.
 */
export const GET = withErrors(
  async (
    req: NextRequest,
    { params }: { params: Promise<{ patientId: string; toothNumber: string }> }
  ) => {
    const user = getUserFromRequest(req);
    const roleCheck = requireRole(user, ROLES.DENTIST, ROLES.CASHIER, ROLES.PATIENT);
    if (!roleCheck.ok) return unauthorized(roleCheck.error);

    const { patientId, toothNumber } = await params;
    const toothNumberNum = Number(toothNumber);
    if (Number.isNaN(toothNumberNum)) {
      return notFound("Invalid tooth number");
    }

    const tooth = await db.tooth.findUnique({
      where: {
        patientId_toothNumber: {
          patientId,
          toothNumber: toothNumberNum,
        },
      },
    });

    if (!tooth) return notFound("Tooth not found");
    return ok(tooth);
  }
);

/**
 * PUT /api/teeth/[patientId]/[toothNumber]
 * Updates (or creates) a tooth's status and notes. Dentist only.
 */
export const PUT = withErrors(
  async (
    req: NextRequest,
    { params }: { params: Promise<{ patientId: string; toothNumber: string }> }
  ) => {
    const user = getUserFromRequest(req);
    if (!user) return unauthorized();
    const roleCheck = requireRole(user, ROLES.DENTIST);
    if (!roleCheck.ok) return forbidden(roleCheck.error);

    const { patientId, toothNumber } = await params;
    const toothNumberNum = Number(toothNumber);
    if (Number.isNaN(toothNumberNum)) {
      return notFound("Invalid tooth number");
    }

    const body = await req.json().catch(() => null);
    if (body === null) return fail("Invalid JSON body", 400);

    const parsed = toothUpdateSchema.safeParse(body);
    if (!parsed.success) return handleZodError(parsed.error);

    const { status, notes } = parsed.data;

    const tooth = await db.tooth.upsert({
      where: {
        patientId_toothNumber: {
          patientId,
          toothNumber: toothNumberNum,
        },
      },
      update: {
        status,
        notes: notes ?? null,
        updatedAt: new Date(),
      },
      create: {
        patientId,
        toothNumber: toothNumberNum,
        status,
        notes: notes ?? null,
      },
    });

    return ok(tooth);
  }
);
