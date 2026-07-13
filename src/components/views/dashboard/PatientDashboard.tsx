"use client";

import { useMemo } from "react";
import {
  CalendarDays,
  CalendarPlus,
  CheckCircle,
  Clock,
} from "lucide-react";

import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import { useNav } from "@/lib/nav";
import { useAppointments } from "@/hooks";
import { formatDate } from "@/lib/format";

import { StatCard } from "./StatCard";
import { AppointmentListCard } from "./AppointmentListCard";
import { getUpcomingAppointments } from "./dashboard-helpers";

/* ------------------------------------------------------------------ */
/* Patient dashboard (self-service)                                    */
/* ------------------------------------------------------------------ */

export function PatientDashboard() {
  const navigate = useNav((s) => s.navigate);

  // API auto-filters to this patient's appointments.
  const apptsQuery = useAppointments();

  const upcoming = useMemo(
    () => getUpcomingAppointments(apptsQuery.data).slice(0, 5),
    [apptsQuery.data]
  );

  const upcomingCount = useMemo(
    () => getUpcomingAppointments(apptsQuery.data).length,
    [apptsQuery.data]
  );

  const nextAppointmentDate = useMemo(() => {
    const list = getUpcomingAppointments(apptsQuery.data);
    return list.length > 0 ? formatDate(list[0].date) : "None scheduled";
  }, [apptsQuery.data]);

  const totalVisits = useMemo(
    () =>
      (apptsQuery.data ?? []).filter(
        (appointment) => appointment.status === "completed"
      ).length,
    [apptsQuery.data]
  );

  const loading = apptsQuery.isLoading;

  return (
    <div className="space-y-6">
      {/* Welcome / hero card with primary CTAs */}
      <Card className="bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent">
        <CardHeader>
          <CardTitle className="text-lg">
            Your dental health at a glance
          </CardTitle>
          <CardDescription>
            Track upcoming visits, review past treatments, and book new
            appointments.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => navigate("book")} className="gap-1">
              <CalendarPlus className="h-4 w-4" />
              Book Appointment
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate("my-appointments")}
            >
              View My Appointments
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 xs:gap-4 lg:gap-5">
        <StatCard
          label="Upcoming Appointments"
          value={upcomingCount}
          icon={CalendarDays}
          accent="bg-emerald-500"
          hint="Pending or scheduled"
          loading={loading}
          onClick={() => navigate("my-appointments")}
        />
        <StatCard
          label="Next Appointment"
          value={nextAppointmentDate}
          icon={Clock}
          accent="bg-teal-500"
          hint={upcoming[0]?.time ? `at ${upcoming[0].time}` : undefined}
          loading={loading}
          onClick={() => navigate("my-appointments")}
        />
        <StatCard
          label="Total Visits"
          value={totalVisits}
          icon={CheckCircle}
          accent="bg-amber-500"
          hint="Completed appointments"
          loading={loading}
        />
      </div>

      {/* Upcoming appointments */}
      <AppointmentListCard
        title="Upcoming Appointments"
        description={
          upcoming.length > 0
            ? `You have ${upcoming.length} upcoming visit${
                upcoming.length === 1 ? "" : "s"
              }.`
            : "Your upcoming visits will appear here."
        }
        appointments={upcoming}
        loading={loading}
        emptyTitle="No upcoming appointments"
        emptyMessage="Book a visit to see it appear here."
        viewAllOnClick={() => navigate("my-appointments")}
      />
    </div>
  );
}
