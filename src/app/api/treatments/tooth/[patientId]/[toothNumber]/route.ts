import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth";
import { ok, unauthorized, withErrors } from "@/lib/api-response";

/**
 * GET /api/treatments/tooth/[patientId]/[toothNumber]
 * Authenticated users only.
 * Returns all treatments for a specific tooth, newest first.
 */
export const GET = withErrors(
  async (
    _req: NextRequest,
    {
      params,
    }: {
      params: Promise<{ patientId: string; toothNumber: string }>;
    }
  ) => {
    const user = getUserFromRequest(_req);
    if (!user) return unauthorized();

    const { patientId, toothNumber } = await params;
    const toothNum = Number(toothNumber);
    if (Number.isNaN(toothNum)) {
      return ok([]);
    }

    const treatments = await db.treatment.findMany({
      where: { patientId, toothNumber: toothNum },
      orderBy: { date: "desc" },
    });

    return ok(treatments);
  }
);
