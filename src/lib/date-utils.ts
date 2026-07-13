/**
 * Timezone-safe date helpers for the dental practice app.
 *
 * Appointments are stored as ISO date strings at UTC midnight. The local
 * user's "today" date and a selected calendar date must be formatted with
 * LOCAL parts, while a stored appointment date must be formatted with UTC
 * parts so the calendar day matches what the server stored (and what the
 * date filter expects).
 */

/** Format a local Date as YYYY-MM-DD using local parts (for today / selected day). */
export function formatDateToLocalYearMonthDay(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Format an appointment's stored date string (ISO, UTC midnight) as
 * YYYY-MM-DD using UTC parts so the calendar day matches what the server
 * stored (and what the date filter expects).
 */
export function formatAppointmentDateToYearMonthDay(value: string): string {
  const date = new Date(value);
  if (isNaN(date.getTime())) return "";
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

/** Pretty-print a YYYY-MM-DD string as a localized date (timezone-safe). */
export function formatYearMonthDayForDisplay(yearMonthDay: string): string {
  if (!yearMonthDay) return "—";
  const [year, month, day] = yearMonthDay.split("-").map(Number);
  if (!year || !month || !day) return yearMonthDay;
  return new Date(year, month - 1, day).toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
