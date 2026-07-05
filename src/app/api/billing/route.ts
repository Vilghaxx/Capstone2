import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import {
  getUserFromRequest,
  requireRole,
} from "@/lib/auth";
import { ROLES } from "@/lib/constants";
import {
  forbidden,
  ok,
  unauthorized,
  withErrors,
} from "@/lib/api-response";

/**
 * GET /api/billing
 * List billing records (treatments that have a cost).
 *
 * Optional query filters:
 *   - status=paid|unpaid  → filter by paid flag
 *   - patientId=...        → filter by patient
 *
 * Results are ordered by date desc. Since the schema has no Treatment↔Patient
 * relation, the patient name is joined manually via a second query.
 */
export const GET = withErrors(async (req: NextRequest) => {
  const user = getUserFromRequest(req);
  if (!user) return unauthorized();

  // Any authenticated role may view billing records.
  const roleCheck = requireRole(
    user,
    ROLES.DENTIST,
    ROLES.CASHIER,
    ROLES.PATIENT
  );
  if (!roleCheck.ok) return forbidden(roleCheck.error);

  const url = req.nextUrl;
  const status = url.searchParams.get("status");
  const patientId = url.searchParams.get("patientId");

  const where: {
    paid?: boolean;
    patientId?: string;
  } = {};

  if (status === "paid") where.paid = true;
  else if (status === "unpaid") where.paid = false;
  if (patientId) where.patientId = patientId;

  const treatments = await db.treatment.findMany({
    where,
    orderBy: { date: "desc" },
  });

  // Manual join: fetch patient names for the treatments returned.
  const patientIds = Array.from(
    new Set(treatments.map((t) => t.patientId))
  );
  const patients =
    patientIds.length > 0
      ? await db.patient.findMany({
          where: { id: { in: patientIds } },
          select: { id: true, name: true },
        })
      : [];
  const patientMap = new Map(patients.map((p) => [p.id, p.name]));

  const data = treatments.map((t) => ({
    ...t,
    patientName: patientMap.get(t.patientId) ?? null,
  }));

  return ok(data);
});
