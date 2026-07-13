import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth";
import { jsonResponse, unauthorized, withErrors } from "@/lib/api-response";

/**
 * GET /api/billing/summary
 * Compute revenue totals across ALL treatments.
 *
 * Returns:
 *   - totalRevenue   sum of all cost
 *   - collected      sum of cost where paid=true
 *   - unpaid         sum of cost where paid=false
 *   - treatmentCount count of all treatments
 *   - paidCount      count where paid=true
 *   - unpaidCount    count where paid=false
 */
export const GET = withErrors(async (req: NextRequest) => {
  const user = getUserFromRequest(req);
  if (!user) return unauthorized();

  const [allAgg, paidAgg, unpaidAgg] = await Promise.all([
    db.treatment.aggregate({
      _sum: { cost: true },
      _count: true,
    }),
    db.treatment.aggregate({
      _sum: { cost: true },
      _count: true,
      where: { paid: true },
    }),
    db.treatment.aggregate({
      _sum: { cost: true },
      _count: true,
      where: { paid: false },
    }),
  ]);

  return jsonResponse({
    totalRevenue: allAgg._sum.cost ?? 0,
    collected: paidAgg._sum.cost ?? 0,
    unpaid: unpaidAgg._sum.cost ?? 0,
    treatmentCount: allAgg._count,
    paidCount: paidAgg._count,
    unpaidCount: unpaidAgg._count,
  });
});
