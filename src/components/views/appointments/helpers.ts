"use client";

import { toast } from "sonner";
import { APPOINTMENT_STATUSES, APPOINTMENT_TYPE_META } from "@/lib/format";
import type { AppointmentStatus } from "@/lib/types";

/** All appointment statuses, in declaration order from the constants map. */
export const ALL_APPOINTMENT_STATUSES = Object.values(
  APPOINTMENT_STATUSES
) as AppointmentStatus[];

/** Human-readable label for an appointment type (already capitalized). */
export function formatAppointmentTypeLabel(type: string): string {
  if (APPOINTMENT_TYPE_META[type]) return APPOINTMENT_TYPE_META[type];
  if (!type) return "—";
  return type.charAt(0).toUpperCase() + type.slice(1);
}

/** Standard error toast for caught API errors. */
export function reportError(err: unknown, fallback: string): void {
  toast.error(err instanceof Error ? err.message : fallback);
}
