import type { Appointment } from "@/lib/types";

/**
 * Date/time preset passed from the Schedule tab to the New Appointment
 * dialog so the dialog can pre-fill the date/time fields when the user
 * clicks an empty time slot.
 */
export type NewAppointmentPreset = { date?: string; time?: string };

/** Callback that opens the New Appointment dialog with an optional preset. */
export type OpenNewAppointmentDialog = (
  preset?: NewAppointmentPreset
) => void;

/** Grouped appointment list — one group per YYYY-MM-DD, sorted ascending. */
export interface AppointmentDateGroup {
  date: string;
  items: Appointment[];
}
