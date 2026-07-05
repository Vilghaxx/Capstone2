"use client";

import { useMemo } from "react";
import {
  Users,
  CalendarDays,
  Wallet,
  CheckCircle,
  CalendarPlus,
  ArrowRight,
  Clock,
  ClipboardList,
  type LucideIcon,
} from "lucide-react";

import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { EmptyState } from "@/components/common/EmptyState";
import { AppointmentStatusBadge } from "@/components/common/StatusBadge";

import { useAuth } from "@/lib/auth-store";
import { useIsStaff, useIsPatient } from "@/lib/auth-store";
import { useNav } from "@/lib/nav";
import {
  usePatients,
  useAppointments,
  useBillingSummary,
} from "@/hooks/queries";
import { greetingFor, formatCurrency, formatDate } from "@/lib/format";
import { APPOINTMENT_TYPE_META } from "@/lib/format";
import type { Appointment } from "@/lib/types";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */

const ACTIVE_STATUSES = new Set(["pending", "scheduled"]);

/** Start of today (local time) for "is upcoming" comparisons. */
function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Capitalize a type key's display label (uses meta map when known). */
function appointmentTypeLabel(type: string): string {
  const fromMeta = APPOINTMENT_TYPE_META[type];
  if (fromMeta) return fromMeta;
  if (!type) return "—";
  return type.charAt(0).toUpperCase() + type.slice(1);
}

/** Filter + sort upcoming (active, today-or-later) appointments. */
function getUpcoming(appts: Appointment[] | undefined): Appointment[] {
  if (!appts) return [];
  const today = startOfToday().getTime();
  return appts
    .filter(
      (a) =>
        ACTIVE_STATUSES.has(a.status) &&
        new Date(a.date).getTime() >= today
    )
    .sort(
      (a, b) =>
        new Date(a.date).getTime() - new Date(b.date).getTime() ||
        (a.time || "").localeCompare(b.time || "")
    );
}

/** Role badge for the dashboard header. */
function RoleBadge({ role }: { role: string }) {
  const label = role.charAt(0).toUpperCase() + role.slice(1);
  const cls =
    role === "dentist"
      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
      : role === "cashier"
      ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
      : "bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300";
  return (
    <Badge variant="outline" className={cn("font-medium", cls)}>
      {label}
    </Badge>
  );
}

/* ------------------------------------------------------------------ */
/* Stat card                                                          */
/* ------------------------------------------------------------------ */

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  /** Tailwind classes for the icon container background. */
  accent: string;
  hint?: string;
  onClick?: () => void;
  loading?: boolean;
}

function StatCard({
  label,
  value,
  icon: Icon,
  accent,
  hint,
  onClick,
  loading,
}: StatCardProps) {
  const clickable = !!onClick;
  return (
    <Card
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      onClick={onClick}
      onKeyDown={(e) => {
        if (clickable && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onClick?.();
        }
      }}
      className={cn(
        "gap-0 py-5 transition-shadow",
        clickable &&
          "cursor-pointer hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      )}
    >
      <CardContent className="flex items-start gap-4">
        <div
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white",
            accent
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm text-muted-foreground">{label}</p>
          {loading ? (
            <Skeleton className="mt-1 h-7 w-20" />
          ) : (
            <p className="truncate text-2xl font-semibold tracking-tight">
              {value}
            </p>
          )}
          {hint && (
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {hint}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function StatCardSkeleton() {
  return (
    <Card className="py-5">
      <CardContent className="flex items-start gap-4">
        <Skeleton className="h-11 w-11 rounded-xl" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-7 w-20" />
        </div>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Upcoming appointments list                                         */
/* ------------------------------------------------------------------ */

function AppointmentRow({
  appt,
  patientName,
}: {
  appt: Appointment;
  patientName?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border bg-card px-4 py-3 transition-colors hover:bg-accent/40">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium">
            {patientName || "Patient"}
          </p>
          <AppointmentStatusBadge status={appt.status} />
        </div>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {appointmentTypeLabel(appt.type)}
          {appt.notes ? ` · ${appt.notes}` : ""}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2 text-right text-xs text-muted-foreground">
        <Clock className="h-3.5 w-3.5" />
        <div>
          <div className="font-medium text-foreground">
            {formatDate(appt.date)}
          </div>
          <div>{appt.time || "—"}</div>
        </div>
      </div>
    </div>
  );
}

function UpcomingAppointmentsCard({
  appointments,
  patientNameById,
  loading,
  emptyTitle = "No upcoming appointments",
  emptyMessage = "Scheduled appointments will appear here.",
  viewAllLabel,
  viewAllOnClick,
}: {
  appointments: Appointment[];
  patientNameById?: Map<string, string>;
  loading: boolean;
  emptyTitle?: string;
  emptyMessage?: string;
  viewAllLabel?: string;
  viewAllOnClick?: () => void;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Upcoming Appointments</CardTitle>
          <CardDescription>
            The next {appointments.length || 0} visit
            {appointments.length === 1 ? "" : "s"} on the calendar.
          </CardDescription>
        </div>
        {viewAllLabel && viewAllOnClick && appointments.length > 0 && (
          <Button
            size="sm"
            variant="ghost"
            className="gap-1"
            onClick={viewAllOnClick}
          >
            {viewAllLabel}
            <ArrowRight className="h-4 w-4" />
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-2">
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-lg" />
            ))}
          </div>
        ) : appointments.length === 0 ? (
          <EmptyState title={emptyTitle} message={emptyMessage} />
        ) : (
          appointments.map((a) => (
            <AppointmentRow
              key={a.id}
              appt={a}
              patientName={patientNameById?.get(a.patientId)}
            />
          ))
        )}
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Quick actions                                                      */
/* ------------------------------------------------------------------ */

function QuickActionCard({
  title,
  description,
  icon: Icon,
  accent,
  onClick,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
  accent: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full items-start gap-4 rounded-xl border bg-card p-4 text-left transition-all hover:shadow-md hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-white",
          accent
        )}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold">{title}</p>
          <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      </div>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Staff dashboard                                                    */
/* ------------------------------------------------------------------ */

function StaffDashboard() {
  const navigate = useNav((s) => s.navigate);

  // Light fetch to read the `total` count.
  const patientsQuery = usePatients("", 1, 1);
  // All appointments (staff scope).
  const apptsQuery = useAppointments();
  const billingQuery = useBillingSummary();
  // For patient name lookup on the upcoming list. Fetch a larger page so we
  // can map patientId → name without an extra endpoint.
  const patientsLookup = usePatients("", 1, 200);

  const totalPatients = patientsQuery.data?.total ?? 0;
  const billing = billingQuery.data;

  const patientNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of patientsLookup.data?.data ?? []) {
      map.set(p.id, p.name);
    }
    return map;
  }, [patientsLookup.data]);

  const upcoming = useMemo(
    () => getUpcoming(apptsQuery.data).slice(0, 5),
    [apptsQuery.data]
  );

  const upcomingCount = useMemo(
    () => getUpcoming(apptsQuery.data).length,
    [apptsQuery.data]
  );

  const statsLoading =
    patientsQuery.isLoading ||
    apptsQuery.isLoading ||
    billingQuery.isLoading;

  return (
    <div className="space-y-6">
      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Patients"
          value={totalPatients}
          icon={Users}
          accent="bg-emerald-500"
          hint="Registered in the clinic"
          loading={patientsQuery.isLoading}
          onClick={() => navigate("patients")}
        />
        <StatCard
          label="Upcoming Appointments"
          value={upcomingCount}
          icon={CalendarDays}
          accent="bg-teal-500"
          hint="Pending or scheduled"
          loading={apptsQuery.isLoading}
          onClick={() => navigate("appointments")}
        />
        <StatCard
          label="Total Revenue"
          value={formatCurrency(billing?.totalRevenue ?? 0)}
          icon={Wallet}
          accent="bg-amber-500"
          hint="All billed treatments"
          loading={billingQuery.isLoading}
          onClick={() => navigate("billing")}
        />
        <StatCard
          label="Collected"
          value={formatCurrency(billing?.collected ?? 0)}
          icon={CheckCircle}
          accent="bg-rose-500"
          hint={`${billing?.paidCount ?? 0} paid · ${
            billing?.unpaidCount ?? 0
          } unpaid`}
          loading={billingQuery.isLoading}
          onClick={() => navigate("billing")}
        />
      </div>

      {/* Quick actions */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <QuickActionCard
            title="View Patients"
            description="Browse, search, and manage patient records."
            icon={Users}
            accent="bg-emerald-500"
            onClick={() => navigate("patients")}
          />
          <QuickActionCard
            title="Schedule Appointment"
            description="Create or update upcoming appointments."
            icon={CalendarPlus}
            accent="bg-teal-500"
            onClick={() => navigate("appointments")}
          />
          <QuickActionCard
            title="View Billing"
            description="Track payments and outstanding balances."
            icon={ClipboardList}
            accent="bg-amber-500"
            onClick={() => navigate("billing")}
          />
        </div>
      </section>

      {/* Upcoming appointments */}
      <UpcomingAppointmentsCard
        appointments={upcoming}
        patientNameById={patientNameById}
        loading={apptsQuery.isLoading}
        viewAllLabel="View all"
        viewAllOnClick={() => navigate("appointments")}
      />

      {statsLoading && apptsQuery.isLoading && (
        <p className="sr-only">Loading dashboard data…</p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Patient dashboard                                                  */
/* ------------------------------------------------------------------ */

function PatientDashboard() {
  const navigate = useNav((s) => s.navigate);

  // API auto-filters to this patient's appointments.
  const apptsQuery = useAppointments();

  const upcoming = useMemo(
    () => getUpcoming(apptsQuery.data).slice(0, 5),
    [apptsQuery.data]
  );

  const upcomingCount = useMemo(
    () => getUpcoming(apptsQuery.data).length,
    [apptsQuery.data]
  );

  const nextAppointmentDate = useMemo(() => {
    const list = getUpcoming(apptsQuery.data);
    return list.length > 0 ? formatDate(list[0].date) : "None scheduled";
  }, [apptsQuery.data]);

  const totalVisits = useMemo(
    () =>
      (apptsQuery.data ?? []).filter((a) => a.status === "completed").length,
    [apptsQuery.data]
  );

  const loading = apptsQuery.isLoading;

  return (
    <div className="space-y-6">
      {/* Welcome card */}
      <Card className="bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent">
        <CardHeader>
          <CardTitle className="text-lg">Your dental health at a glance</CardTitle>
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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

      {/* Quick actions */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <QuickActionCard
            title="Book Appointment"
            description="Request a new appointment with the clinic."
            icon={CalendarPlus}
            accent="bg-emerald-500"
            onClick={() => navigate("book")}
          />
          <QuickActionCard
            title="View My Appointments"
            description="See your upcoming and past visits."
            icon={ClipboardList}
            accent="bg-teal-500"
            onClick={() => navigate("my-appointments")}
          />
        </div>
      </section>

      {/* Upcoming appointments */}
      <UpcomingAppointmentsCard
        appointments={upcoming}
        loading={loading}
        emptyTitle="No upcoming appointments"
        emptyMessage="Book a visit to see it appear here."
        viewAllLabel="View all"
        viewAllOnClick={() => navigate("my-appointments")}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Root                                                               */
/* ------------------------------------------------------------------ */

export default function DashboardView() {
  const user = useAuth((s) => s.user);
  const isStaff = useIsStaff();
  const isPatient = useIsPatient();

  const todayLabel = formatDate(new Date());

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">
              {greetingFor()}, {user?.name?.split(" ")[0] || "there"}
            </h1>
            {user && <RoleBadge role={user.role} />}
          </div>
          <p className="text-sm text-muted-foreground">
            {isPatient
              ? "Here's an overview of your dental care."
              : "Here's what's happening at the clinic today."}{" "}
            · {todayLabel}
          </p>
        </div>
      </header>

      {/* Body */}
      {!user ? (
        <LoadingSpinner text="Loading dashboard…" />
      ) : isStaff ? (
        <StaffDashboard />
      ) : isPatient ? (
        <PatientDashboard />
      ) : (
        <EmptyState
          title="Unknown role"
          message="Your account role is not recognized. Please contact support."
        />
      )}
    </div>
  );
}
