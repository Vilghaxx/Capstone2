import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth";
import { jsonResponse, unauthorized, withErrors } from "@/lib/api-response";

/**
 * GET /api/billing/[id]
 * The `id` param is interpreted as a **patientId** here.
 * List treatments for a single patient plus a per-patient billing summary.
 *
 * Returns: { data: treatments, summary: { totalCost, paid, unpaid, count } }
 *
 * (The sibling `[id]/pay/route.ts` treats the same segment as a treatment id;
 * both share the `[id]` slug to satisfy Next.js App Router's sibling rule.)
 */
export const GET = withErrors(
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const user = getUserFromRequest(req);
    if (!user) return unauthorized();

    const { id: patientId } = await params;

    const [treatments, allAgg, paidAgg] = await Promise.all([
      db.treatment.findMany({
        where: { patientId },
        orderBy: { date: "desc" },
      }),
      db.treatment.aggregate({
        _sum: { cost: true },
        _count: true,
        where: { patientId },
      }),
      db.treatment.aggregate({
        _sum: { cost: true },
        where: { patientId, paid: true },
      }),
    ]);

    const totalCost = allAgg._sum.cost ?? 0;
    const paid = paidAgg._sum.cost ?? 0;
    const unpaid = totalCost - paid;

    return jsonResponse({
      data: treatments,
      summary: {
        totalCost,
        paid,
        unpaid,
        count: allAgg._count,
      },
    });
  }
);
