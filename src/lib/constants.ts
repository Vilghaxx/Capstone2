// Shared constants for the dental practice management system

export const ROLES = {
  DENTIST: "dentist",
  CASHIER: "cashier",
  PATIENT: "patient",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const TOOTH_STATUSES = {
  HEALTHY: "healthy",
  TREATED: "treated",
  NEEDS_ATTENTION: "needs-attention",
  URGENT: "urgent",
} as const;

export type ToothStatus = (typeof TOOTH_STATUSES)[keyof typeof TOOTH_STATUSES];

export const APPOINTMENT_TYPES = {
  CHECKUP: "checkup",
  CLEANING: "cleaning",
  FILLING: "filling",
  EXTRACTION: "extraction",
  ROOT_CANAL: "root-canal",
  CROWN: "crown",
  OTHER: "other",
} as const;

export type AppointmentType =
  (typeof APPOINTMENT_TYPES)[keyof typeof APPOINTMENT_TYPES];

export const APPOINTMENT_STATUSES = {
  PENDING: "pending",
  SCHEDULED: "scheduled",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
  NO_SHOW: "no-show",
} as const;

export type AppointmentStatus =
  (typeof APPOINTMENT_STATUSES)[keyof typeof APPOINTMENT_STATUSES];

export const PAYMENT_METHODS = {
  CASH: "cash",
  CARD: "card",
  INSURANCE: "insurance",
  BANK_TRANSFER: "bank-transfer",
} as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[keyof typeof PAYMENT_METHODS];

export const PAGINATION_DEFAULTS = {
  PAGE: 1,
  LIMIT: 50,
  MAX_LIMIT: 200,
} as const;

// FDI tooth numbering (1-32). Upper right 1-8, upper left 9-16,
// lower left 17-24, lower right 25-32.
export const TOTAL_TEETH = 32;

export const TOOTH_STATUS_META: Record<
  ToothStatus,
  { label: string; color: string; ring: string; description: string }
> = {
  healthy: {
    label: "Healthy",
    color: "bg-emerald-500",
    ring: "ring-emerald-500/40",
    description: "No issues detected",
  },
  treated: {
    label: "Treated",
    color: "bg-sky-500",
    ring: "ring-sky-500/40",
    description: "Procedure completed",
  },
  "needs-attention": {
    label: "Needs Attention",
    color: "bg-amber-500",
    ring: "ring-amber-500/40",
    description: "Monitor or schedule follow-up",
  },
  urgent: {
    label: "Urgent",
    color: "bg-rose-500",
    ring: "ring-rose-500/40",
    description: "Requires immediate care",
  },
};

export const APPOINTMENT_TYPE_META: Record<string, string> = {
  checkup: "Checkup",
  cleaning: "Cleaning",
  filling: "Filling",
  extraction: "Extraction",
  "root-canal": "Root Canal",
  crown: "Crown",
  other: "Other",
};

export const APPOINTMENT_STATUS_META: Record<
  AppointmentStatus,
  { label: string; className: string }
> = {
  pending: {
    label: "Pending",
    className:
      "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  },
  scheduled: {
    label: "Scheduled",
    className:
      "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300",
  },
  completed: {
    label: "Completed",
    className:
      "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  },
  cancelled: {
    label: "Cancelled",
    className:
      "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300",
  },
  "no-show": {
    label: "No Show",
    className:
      "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  },
};

export const PAYMENT_METHOD_META: Record<string, string> = {
  cash: "Cash",
  card: "Card",
  insurance: "Insurance",
  "bank-transfer": "Bank Transfer",
};
