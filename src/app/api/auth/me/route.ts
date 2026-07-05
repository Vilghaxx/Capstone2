import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth";
import { ok, unauthorized, withErrors } from "@/lib/api-response";

/**
 * GET /api/auth/me
 * Returns the currently authenticated user's latest profile, using the JWT
 * supplied in the Authorization header.
 */
export const GET = withErrors(async (req: NextRequest) => {
  const payload = getUserFromRequest(req);
  if (!payload) return unauthorized();

  // Fetch the fresh user record so name / patientRef reflect any updates.
  const user = await db.user.findUnique({ where: { id: payload.sub } });
  if (!user) return unauthorized("User no longer exists");

  return ok({
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
      name: user.name,
      patientRef: user.patientRef ?? null,
    },
  });
});
