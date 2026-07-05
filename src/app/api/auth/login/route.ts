import { db } from "@/lib/db";
import {
  comparePassword,
  signToken,
  type JwtPayload,
} from "@/lib/auth";
import {
  fail,
  handleZodError,
  ok,
  withErrors,
} from "@/lib/api-response";
import { loginFormSchema } from "@/lib/schemas/auth-schema";

/**
 * POST /api/auth/login
 * Authenticates a user with username + password and returns a JWT.
 */
export const POST = withErrors(async (req: Request) => {
  const body = await req.json().catch(() => null);
  if (!body) return fail("Invalid JSON body", 400);

  const parsed = loginFormSchema.safeParse(body);
  if (!parsed.success) return handleZodError(parsed.error);

  const { username, password } = parsed.data;

  const user = await db.user.findUnique({ where: { username } });
  if (!user || !comparePassword(password, user.password)) {
    return fail("Invalid username or password", 401);
  }

  const payload: JwtPayload = {
    sub: user.id,
    username: user.username,
    role: user.role,
    name: user.name,
    patientRef: user.patientRef ?? null,
  };

  const token = signToken(payload);

  return ok({
    token,
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
      name: user.name,
      patientRef: user.patientRef ?? null,
    },
  });
});
