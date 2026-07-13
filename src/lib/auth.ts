import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { NextRequest } from "next/server";

const JWT_SECRET =
  process.env.JWT_SECRET || "radiograph-dev-secret-change-in-production";
const JWT_EXPIRES_IN = "7d";

export interface JwtPayload {
  sub: string; // user id
  username: string;
  role: string;
  name: string;
  patientRef?: string | null;
}

export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 10);
}

export function comparePassword(password: string, hash: string): boolean {
  return bcrypt.compareSync(password, hash);
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  } as jwt.SignOptions);
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    return decoded;
  } catch {
    return null;
  }
}

/**
 * Extract and verify the Bearer token from a request.
 * Returns the decoded user payload or null.
 */
export function getUserFromRequest(req: NextRequest): JwtPayload | null {
  const authHeader = req.headers.get("authorization");
  if (!authHeader) return null;
  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") return null;
  return verifyToken(parts[1]);
}

export function requireRole(
  user: JwtPayload | null,
  ...roles: string[]
): { ok: boolean; error?: string } {
  if (!user) return { ok: false, error: "Authentication required" };
  if (roles.length > 0 && !roles.includes(user.role)) {
    return { ok: false, error: "Insufficient permissions" };
  }
  return { ok: true };
}
