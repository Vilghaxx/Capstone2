"use client";

import { useMemo, useState } from "react";
import { Calendar as CalendarIcon, Plus } from "lucide-react";

import { useAppointments } from "@/hooks";
import { APPOINTMENT_TIME_SLOTS } from "@/lib/format";
import type { Appointment } from "@/lib/types";
import { formatYearMonthDayForDisplay, formatDateToLocalYearMonthDay } from "@/lib/date-utils";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { EmptyState } from "@/components/common/EmptyState";
import { AppointmentStatusBadge } from "@/components/common/StatusBadge";

import { usePatientNameById } from "./usePatientNameById";
import { formatAppointmentTypeLabel } from "./helpers";
import type { OpenNewAppointmentDialog } from "./types";

interface AppointmentsScheduleTabProps {
  onNew: OpenNewAppointmentDialog;
}

/** Visible appointment statuses on the schedule grid. */
const VISIBLE_SCHEDULE_STATUSES = new Set(["scheduled", "completed"]);

/**
 * Tab 2 — Schedule.
 *
 * Shows a calendar on the left and a time-slot grid for the selected day on
 * the right. Appointments whose time matches one of the `APPOINTMENT_TIME_SLOTS` appear
 * under that slot; appointments at other times appear in an "Other times"
 * panel below the grid. Only scheduled / completed appointments are shown
 * so the calendar reflects the confirmed day's agenda.
 */
export function AppointmentsScheduleTab({
  onNew,
}: AppointmentsScheduleTabProps) {
  const patientNameById = usePatientNameById();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const selectedDateYearMonthDay = formatDateToLocalYearMonthDay(selectedDate);

  const {
    data: appointmentsData,
    isLoading,
    isError,
  } = useAppointments({ date: selectedDateYearMonthDay });

  // Map time → appointments; collect off-grid appointments separately.
  const { appointmentsByTimeSlot, offGridAppointments } = useMemo(() => {
    const slotMap = new Map<string, Appointment[]>();
    const others: Appointment[] = [];
    const slotSet = new Set(APPOINTMENT_TIME_SLOTS);
    for (const appointment of appointmentsData ?? []) {
      if (!VISIBLE_SCHEDULE_STATUSES.has(appointment.status)) continue;
      const time = appointment.time || "";
      if (slotSet.has(time)) {
        const bucket = slotMap.get(time) ?? [];
        bucket.push(appointment);
        slotMap.set(time, bucket);
      } else {
        others.push(appointment);
      }
    }
    for (const bucket of slotMap.values()) {
      bucket.sort((x, y) => (x.time || "").localeCompare(y.time || ""));
    }
    others.sort((x, y) => (x.time || "").localeCompare(y.time || ""));
    return { appointmentsByTimeSlot: slotMap, offGridAppointments: others };
  }, [appointmentsData]);

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
      <Card className="w-full lg:w-fit">
        <CardHeader className="pb-0">
          <CardTitle className="flex items-center gap-2 text-sm">
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
            {formatYearMonthDayForDisplay(selectedDateYearMonthDay)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(date) => date && setSelectedDate(date)}
            className="mx-auto"
          />
          <p className="mt-2 text-center text-xs text-muted-foreground">
            Tap a date to view its schedule.
          </p>
        </CardContent>
      </Card>

      <div className="flex-1">
        {isLoading ? (
          <LoadingSpinner text="Loading schedule…" />
        ) : isError ? (
          <EmptyState
            title="Could not load schedule"
            message="Something went wrong while fetching appointments. Please try again later."
          />
        ) : (
          <div className="flex flex-col gap-2">
            {APPOINTMENT_TIME_SLOTS.map((time) => {
              const items = appointmentsByTimeSlot.get(time) ?? [];
              return (
                <div
                  key={time}
                  className="flex gap-3 rounded-lg border border-border bg-card/30 p-2 xs:p-3 lg:p-4"
                >
                  <div className="w-16 shrink-0 pt-0.5 text-sm font-medium text-muted-foreground">
                    {time}
                  </div>
                  <div className="flex flex-1 flex-col gap-2">
                    {items.length === 0 ? (
                      <button
                        type="button"
                        onClick={() =>
                          onNew({ date: selectedDateYearMonthDay, time })
                        }
                        className="flex items-center gap-1.5 self-start rounded-md px-2 py-1 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                      >
                        <Plus className="h-4 w-4" /> Available
                      </button>
                    ) : (
                      items.map((appointment) => (
                        <div
                          key={appointment.id}
                          className="flex items-center justify-between gap-2 rounded-md bg-accent/40 px-3 py-2"
                        >
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">
                              {patientNameById.get(appointment.patientId) ??
                                "Unknown"}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {formatAppointmentTypeLabel(appointment.type)}
                              {appointment.notes
                                ? ` • ${appointment.notes}`
                                : ""}
                            </span>
                          </div>
                          <AppointmentStatusBadge status={appointment.status} />
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}

            {offGridAppointments.length > 0 && (
              <div className="mt-2 flex flex-col gap-2 rounded-lg border border-dashed border-border p-3">
                <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Other times
                </div>
                {offGridAppointments.map((appointment) => (
                  <div
                    key={appointment.id}
                    className="flex items-center justify-between gap-2 rounded-md bg-accent/20 px-3 py-2"
                  >
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">
                        {patientNameById.get(appointment.patientId) ??
                          "Unknown"}{" "}
                        · {appointment.time || "—"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatAppointmentTypeLabel(appointment.type)}
                        {appointment.notes ? ` • ${appointment.notes}` : ""}
                      </span>
                    </div>
                    <AppointmentStatusBadge status={appointment.status} />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
