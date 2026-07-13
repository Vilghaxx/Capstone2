import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getUserFromRequest, requireRole } from "@/lib/auth";
import { ROLES } from "@/lib/constants";
import { paymentFormSchema } from "@/lib/schemas/billing-schema";
import {
  fail,
  forbidden,
  handleZodError,
  notFound,
  ok,
  unauthorized,
  withErrors,
} from "@/lib/api-response";

/**
 * PUT /api/billing/[id]/pay
 * The `id` param is interpreted as a **treatment id** here.
 * Mark a treatment as paid. Staff only (dentist or cashier).
 *
 * Body (validated by paymentFormSchema):
 *   - paymentMethod: string
 *   - paidAmount:    number > 0
 */
export const PUT = withErrors(
  async (
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
  ) => {
    const user = getUserFromRequest(req);
    if (!user) return unauthorized();

    const roleCheck = requireRole(user, ROLES.DENTIST, ROLES.CASHIER);
    if (!roleCheck.ok) return forbidden(roleCheck.error);

    const { id: treatmentId } = await params;

    const body = await req.json().catch(() => null);
    if (body === null) return fail("Invalid JSON body", 400);

    const parsed = paymentFormSchema.safeParse(body);
    if (!parsed.success) return handleZodError(parsed.error);

    const { paymentMethod, paidAmount } = parsed.data;

    const existing = await db.treatment.findUnique({
      where: { id: treatmentId },
    });
    if (!existing) return notFound("Treatment not found");

    const updated = await db.treatment.update({
      where: { id: treatmentId },
      data: {
        paid: true,
        paidAt: new Date(),
        paidBy: user.name,
        paymentMethod,
        paidAmount,
      },
    });

    return ok(updated);
  }
);
