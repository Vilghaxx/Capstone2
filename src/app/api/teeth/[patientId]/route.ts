import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getUserFromRequest, requireRole } from "@/lib/auth";
import { ROLES } from "@/lib/constants";
import { ok, unauthorized, withErrors } from "@/lib/api-response";

/**
 * GET /api/teeth/[patientId]
 * Returns all teeth for a patient, ordered by toothNumber ascending.
 * Authenticated users only.
 */
export const GET = withErrors(
  async (req: NextRequest, { params }: { params: Promise<{ patientId: string }> }) => {
    const user = getUserFromRequest(req);
    const roleCheck = requireRole(user, ROLES.DENTIST, ROLES.CASHIER, ROLES.PATIENT);
    if (!roleCheck.ok) return unauthorized(roleCheck.error);

    const { patientId } = await params;

    const teeth = await db.tooth.findMany({
      where: { patientId },
      orderBy: { toothNumber: "asc" },
    });

    return ok(teeth);
  }
);
