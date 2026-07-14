'use client';

import { useMemo } from "react";
import {
  CalendarCheck2,
  CalendarClock,
  CalendarPlus,
  CalendarX2,
  Clock,
  StickyNote,
} from "lucide-react";

import { useAppointments } from "@/hooks";
import { useNav } from "@/lib/nav";
import { APPOINTMENT_TYPE_META } from "@/lib/format";
import type { Appointment } from "@/lib/types";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { EmptyState } from "@/components/common/EmptyState";
import { AppointmentStatusBadge } from "@/components/common/StatusBadge";
import { cn } from "@/lib/utils";

/** Start of today as a Date (local time, midnight). */
function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Format a date string with weekday for patient-friendly display. */
function formatWithWeekday(value: string): string {
  const d = new Date(value);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-PH", {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * An appointment is "upcoming" if it is pending/scheduled AND its date is
 * today or later. Everything else (completed/cancelled/no-show, or any
 * appointment whose date has already passed) falls into history.
 */
function isUpcoming(a: Appointment): boolean {
  const today = startOfToday();
  const apptDate = new Date(a.date);
  apptDate.setHours(0, 0, 0, 0);
  if (apptDate < today) return false;
  return a.status === "pending" || a.status === "scheduled";
}

function AppointmentCard({ appointment }: { appointment: Appointment }) {
  const upcoming = isUpcoming(appointment);

  const accentClass = upcoming
    ? appointment.status === "pending"
      ? "border-l-4 border-l-amber-400"
      : "border-l-4 border-l-sky-400"
    : "";

  return (
    <Card className={cn("p-3 xs:p-4", accentClass)}>
      <CardContent className="space-y-2 px-0">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-base font-semibold text-foreground">
            {APPOINTMENT_TYPE_META[appointment.type] ?? appointment.type}
          </h3>
          <AppointmentStatusBadge status={appointment.status} />
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <CalendarClock className="h-4 w-4 text-blue-600" aria-hidden="true" />
            <span>{formatWithWeekday(appointment.date)}</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Clock className="h-4 w-4 text-blue-600" aria-hidden="true" />
            <span>{appointment.time || "—"}</span>
          </span>
        </div>

        {appointment.notes && (
          <div className="flex items-start gap-1.5 rounded-md bg-muted/50 px-3 py-2 text-sm">
            <StickyNote
              className="mt-0.5 h-4 w-4 shrink-0 text-amber-600"
              aria-hidden="true"
            />
            <span className="text-muted-foreground">
              <span className="font-medium text-foreground/80">Notes: </span>
              {appointment.notes}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function MyAppointmentsView() {
  const navigate = useNav((s) => s.navigate);
  const { data: appointments, isLoading, isError } = useAppointments();

  const { upcoming, history } = useMemo(() => {
    const all = appointments ?? [];
    const up: Appointment[] = [];
    const hist: Appointment[] = [];
    for (const a of all) {
      if (isUpcoming(a)) up.push(a);
      else hist.push(a);
    }
    up.sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    hist.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    return { upcoming: up, history: hist };
  }, [appointments]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-blue-700 dark:text-blue-300">
            My Appointments
          </h1>
          <p className="text-sm text-muted-foreground">
            View your upcoming visits and history.
          </p>
        </div>
        <Button
          type="button"
          onClick={() => navigate("book")}
          className="bg-blue-600 text-white hover:bg-blue-700"
        >
          <CalendarPlus className="h-4 w-4" aria-hidden="true" />
          Book New
        </Button>
      </header>

      {isLoading ? (
        <LoadingSpinner text="Loading your appointments…" />
      ) : isError ? (
        <EmptyState
          title="Couldn't load appointments"
          message="Something went wrong while fetching your appointments. Please try again later."
        />
      ) : (
        <div className="space-y-8">
          {/* Upcoming */}
          <section className="space-y-3" aria-labelledby="upcoming-heading">
            <h2
              id="upcoming-heading"
              className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
            >
              <CalendarCheck2 className="h-4 w-4" aria-hidden="true" />
              Upcoming
            </h2>
            {upcoming.length === 0 ? (
              <EmptyState
                title="No upcoming appointments"
                message="When you request a visit, it'll show up here."
                action={
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate("book")}
                  >
                    <CalendarPlus className="h-4 w-4" aria-hidden="true" />
                    Book one now
                  </Button>
                }
              />
            ) : (
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                {upcoming.map((a) => (
                  <AppointmentCard key={a.id} appointment={a} />
                ))}
              </div>
            )}
          </section>

          {/* History */}
          <section className="space-y-3" aria-labelledby="history-heading">
            <h2
              id="history-heading"
              className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
            >
              <CalendarX2 className="h-4 w-4" aria-hidden="true" />
              History
            </h2>
            {history.length === 0 ? (
              <EmptyState
                title="No appointment history"
                message="Your past appointments will appear here."
              />
            ) : (
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                {history.map((a) => (
                  <AppointmentCard key={a.id} appointment={a} />
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
