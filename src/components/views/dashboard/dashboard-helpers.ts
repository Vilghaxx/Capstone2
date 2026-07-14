import { APPOINTMENT_TYPE_META } from "@/lib/format";
import type { Appointment } from "@/lib/types";

/* ------------------------------------------------------------------ */
/* Shared dashboard helpers                                            */
/* ------------------------------------------------------------------ */

/** Appointment statuses that count as "active" (still in the pipeline). */
export const ACTIVE_STATUSES = new Set(["pending", "scheduled"]);

/** Start of today (local time) for "is upcoming" comparisons. */
function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Whether the given date string falls on the current calendar day. */
export function isToday(dateStr: string): boolean {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return false;
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

/** Capitalize a type key's display label (uses meta map when known). */
export function appointmentTypeLabel(type: string): string {
  const fromMeta = APPOINTMENT_TYPE_META[type];
  if (fromMeta) return fromMeta;
  if (!type) return "—";
  return type.charAt(0).toUpperCase() + type.slice(1);
}

/** Filter + sort upcoming (active, today-or-later) appointments. */
export function getUpcomingAppointments(
  appointments: Appointment[] | undefined
): Appointment[] {
  if (!appointments) return [];
  const today = startOfToday().getTime();
  return appointments
    .filter(
      (appointment) =>
        ACTIVE_STATUSES.has(appointment.status) &&
        new Date(appointment.date).getTime() >= today
    )
    .sort(
      (a, b) =>
        new Date(a.date).getTime() - new Date(b.date).getTime() ||
        (a.time || "").localeCompare(b.time || "")
    );
}

/** All appointments scheduled for today, sorted by time ascending. */
export function getTodaysAppointments(
  appointments: Appointment[] | undefined
): Appointment[] {
  if (!appointments) return [];
  return appointments
    .filter((appointment) => isToday(appointment.date))
    .sort((a, b) => (a.time || "").localeCompare(b.time || ""));
}

/** Count appointments currently awaiting approval. */
export function countPendingAppointments(
  appointments: Appointment[] | undefined
): number {
  if (!appointments) return 0;
  return appointments.filter((appointment) => appointment.status === "pending")
    .length;
}
