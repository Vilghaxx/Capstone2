"use client";

import { useMemo } from "react";
import {
  Users,
  CalendarDays,
  CalendarPlus,
  ClipboardList,
  AlertCircle,
  Activity,
} from "lucide-react";

import { useNav } from "@/lib/nav";
import {
  usePatients,
  useAppointments,
  useBillingSummary,
} from "@/hooks";

import { StatCard } from "./StatCard";
import { QuickActions } from "./QuickActionCard";
import { AppointmentListCard } from "./AppointmentListCard";
import {
  getUpcomingAppointments,
  countPendingAppointments,
} from "./dashboard-helpers";

/* ------------------------------------------------------------------ */
/* Dentist dashboard (clinical focus)                                  */
/* ------------------------------------------------------------------ */

export function DentistDashboard() {
  const navigate = useNav((s) => s.navigate);

  // Light fetch to read the `total` count.
  const patientsQuery = usePatients("", 1, 1);
  // All appointments (staff scope).
  const apptsQuery = useAppointments();
  const billingQuery = useBillingSummary();
  // Larger patient page so we can map patientId → name without an extra
  // endpoint.
  const patientsLookup = usePatients("", 1, 200);

  const totalPatients = patientsQuery.data?.total ?? 0;
  const billing = billingQuery.data;

  const patientNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const patient of patientsLookup.data?.data ?? []) {
      map.set(patient.id, patient.name);
    }
    return map;
  }, [patientsLookup.data]);

  const upcoming = useMemo(
    () => getUpcomingAppointments(apptsQuery.data).slice(0, 5),
    [apptsQuery.data]
  );

  const upcomingCount = useMemo(
    () => getUpcomingAppointments(apptsQuery.data).length,
    [apptsQuery.data]
  );

  const pendingCount = useMemo(
    () => countPendingAppointments(apptsQuery.data),
    [apptsQuery.data]
  );

  const statsLoading =
    patientsQuery.isLoading ||
    apptsQuery.isLoading ||
    billingQuery.isLoading;

  return (
    <div className="space-y-6">
      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 xs:gap-4 lg:gap-5">
        <StatCard
          label="Total Patients"
          value={totalPatients}
          icon={Users}
          accent="bg-blue-500"
          hint="Registered in the clinic"
          loading={patientsQuery.isLoading}
          onClick={() => navigate("patients")}
        />
        <StatCard
          label="Upcoming Appointments"
          value={upcomingCount}
          icon={CalendarDays}
          accent="bg-sky-500"
          hint="Pending or scheduled"
          loading={apptsQuery.isLoading}
          onClick={() => navigate("appointments")}
        />
        <StatCard
          label="Total Treatments"
          value={billing?.treatmentCount ?? 0}
          icon={Activity}
          accent="bg-amber-500"
          hint="Billed procedures"
          loading={billingQuery.isLoading}
          onClick={() => navigate("billing")}
        />
        <StatCard
          label="Pending Requests"
          value={pendingCount}
          icon={AlertCircle}
          accent="bg-rose-500"
          hint="Awaiting your approval"
          loading={apptsQuery.isLoading}
          onClick={() => navigate("appointments")}
        />
      </div>

      {/* Quick actions */}
      <QuickActions
        actions={[
          {
            title: "Manage Patients",
            description: "View, add, and edit patient records.",
            icon: Users,
            accent: "bg-blue-500",
            onClick: () => navigate("patients"),
          },
          {
            title: "Schedule Appointment",
            description: "Create and manage appointments.",
            icon: CalendarPlus,
            accent: "bg-sky-500",
            onClick: () => navigate("appointments"),
          },
          {
            title: "View Billing",
            description: "Review treatments and payments.",
            icon: ClipboardList,
            accent: "bg-amber-500",
            onClick: () => navigate("billing"),
          },
        ]}
      />

      {/* Upcoming appointments */}
      <AppointmentListCard
        title="Upcoming Appointments"
        description={`The next ${upcoming.length} visit${
          upcoming.length === 1 ? "" : "s"
        } on the calendar.`}
        appointments={upcoming}
        patientNameById={patientNameById}
        loading={apptsQuery.isLoading}
        emptyTitle="No upcoming appointments"
        emptyMessage="Scheduled appointments will appear here."
        viewAllOnClick={() => navigate("appointments")}
      />

      {statsLoading && (
        <p className="sr-only">Loading dashboard data…</p>
      )}
    </div>
  );
}
