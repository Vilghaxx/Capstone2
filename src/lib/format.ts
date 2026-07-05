// Frontend constants (mirrors backend, plus UI meta maps).
// Re-export the meta maps from the shared constants module so there is a
// single source of truth.

export {
  ROLES,
  TOOTH_STATUSES,
  APPOINTMENT_TYPES,
  APPOINTMENT_STATUSES,
  PAYMENT_METHODS,
  PAGINATION_DEFAULTS,
  TOTAL_TEETH,
  TOOTH_STATUS_META,
  APPOINTMENT_TYPE_META,
  APPOINTMENT_STATUS_META,
  PAYMENT_METHOD_META,
} from "@/lib/constants";

export type {
  Role,
  ToothStatus,
  AppointmentType,
  AppointmentStatus,
  PaymentMethod,
} from "@/lib/constants";

/** Currency formatting — Philippine Peso. */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
  }).format(amount || 0);
}

/** Short peso format for compact UI. */
export function formatPesoShort(amount: number): string {
  return "₱" + (amount || 0).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Format a date string / epoch number into a readable date. */
export function formatDate(
  value: string | number | Date | null | undefined,
  withTime = false
): string {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "—";
  const opts: Intl.DateTimeFormatOptions = withTime
    ? { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }
    : { year: "numeric", month: "short", day: "numeric" };
  return d.toLocaleDateString("en-PH", opts);
}

/** Relative "time ago" helper. */
export function timeAgo(value: string | number | Date | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value).getTime();
  if (isNaN(d)) return "—";
  const diff = Date.now() - d;
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day}d ago`;
  return formatDate(value);
}

/** Greeting based on the current hour. */
export function greetingFor(date = new Date()): string {
  const h = date.getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

/** Build a list of hour-slot labels for the schedule view (8am–6pm). */
export const TIME_SLOTS = Array.from({ length: 11 }, (_, i) => {
  const h = i + 8;
  return `${String(h).padStart(2, "0")}:00`;
});
