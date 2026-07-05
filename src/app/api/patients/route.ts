import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import {
  getUserFromRequest,
  requireRole,
} from "@/lib/auth";
import {
  fail,
  forbidden,
  handleZodError,
  ok,
  unauthorized,
  withErrors,
} from "@/lib/api-response";
import { patientFormSchema } from "@/lib/schemas/patient-schema";
import {
  PAGINATION_DEFAULTS,
  ROLES,
  TOTAL_TEETH,
  TOOTH_STATUSES,
} from "@/lib/constants";

/**
 * GET /api/patients?search=&page=&limit=
 * Any authenticated user can list patients.
 */
export const GET = withErrors(async (req: NextRequest) => {
  const user = getUserFromRequest(req);
  if (!user) return unauthorized();

  const url = req.nextUrl;
  const searchParam = url.searchParams.get("search")?.trim() ?? "";
  const rawPage = Number(url.searchParams.get("page") ?? PAGINATION_DEFAULTS.PAGE);
  const rawLimit = Number(
    url.searchParams.get("limit") ?? PAGINATION_DEFAULTS.LIMIT
  );

  const page =
    Number.isFinite(rawPage) && rawPage > 0
      ? Math.floor(rawPage)
      : PAGINATION_DEFAULTS.PAGE;
  const limit =
    Number.isFinite(rawLimit) && rawLimit > 0
      ? Math.min(Math.floor(rawLimit), PAGINATION_DEFAULTS.MAX_LIMIT)
      : PAGINATION_DEFAULTS.LIMIT;

  // SQLite is case-insensitive for ASCII by default with `contains`, so we
  // do NOT use mode: "insensitive" (not supported by the SQLite connector).
  const where = searchParam
    ? {
        OR: [
          { name: { contains: searchParam } },
          { email: { contains: searchParam } },
          { phone: { contains: searchParam } },
        ],
      }
    : {};

  const [total, patients] = await Promise.all([
    db.patient.count({ where }),
    db.patient.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  return ok({
    data: patients,
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  });
});

/**
 * POST /api/patients
 * Dentist only. Creates a patient and seeds 32 default Teeth rows.
 */
export const POST = withErrors(async (req: NextRequest) => {
  const user = getUserFromRequest(req);
  if (!user) return unauthorized();
  const roleCheck = requireRole(user, ROLES.DENTIST);
  if (!roleCheck.ok) return forbidden();

  const body = await req.json().catch(() => null);
  if (body === null) return fail("Invalid JSON body");

  const parsed = patientFormSchema.safeParse(body);
  if (!parsed.success) return handleZodError(parsed.error);

  const created = await db.patient.create({
    data: {
      name: parsed.data.name,
      phone: parsed.data.phone,
      email: parsed.data.email,
      dateOfBirth: parsed.data.dateOfBirth,
      address: parsed.data.address ?? "",
      notes: parsed.data.notes ?? "",
    },
  });

  // Seed the 32 default teeth (FDI numbering 1..32) as healthy.
  await db.tooth.createMany({
    data: Array.from({ length: TOTAL_TEETH }, (_, i) => ({
      patientId: created.id,
      toothNumber: i + 1,
      status: TOOTH_STATUSES.HEALTHY,
      notes: null,
    })),
  });

  return ok(created, 201);
});
