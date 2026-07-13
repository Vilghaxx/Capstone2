"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  CalendarDays,
  Check,
  ClipboardList,
  Clock,
  Calendar as CalendarIcon,
  Plus,
  Trash2,
  X,
} from "lucide-react";

import { useIsCashier, useIsDentist } from "@/lib/auth-store";
import {
  useAppointments,
  useCreateAppointment,
  useDeleteAppointment,
  usePatients,
  useUpdateAppointment,
} from "@/hooks/queries";
import {
  appointmentFormSchema,
  type AppointmentFormValues,
} from "@/lib/schemas/appointment-schema";
import {
  APPOINTMENT_STATUSES,
  APPOINTMENT_STATUS_META,
  APPOINTMENT_TYPES,
  APPOINTMENT_TYPE_META,
  TIME_SLOTS,
} from "@/lib/format";
import type { Appointment, AppointmentStatus, Patient } from "@/lib/types";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";

import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { EmptyState } from "@/components/common/EmptyState";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { AppointmentStatusBadge } from "@/components/common/StatusBadge";
import { motion } from "framer-motion";

/**
 * Motion-enabled shadcn Button. Used for the Approve/Decline actions in the
 * Requests tab so we can attach `whileTap` press feedback without losing the
 * variant/size props.
 */
const MotionButton = motion.create(Button);

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const STATUS_VALUES = Object.values(APPOINTMENT_STATUSES) as AppointmentStatus[];

/** Format a local Date as YYYY-MM-DD using local parts (for today / selected day). */
function localToYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Format an appointment's stored date string (ISO, UTC midnight) as
 * YYYY-MM-DD using UTC parts so the calendar day matches what the server
 * stored (and what the date filter expects).
 */
function apptDateToYMD(value: string): string {
  const d = new Date(value);
  if (isNaN(d.getTime())) return "";
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

/** Pretty-print a YYYY-MM-DD string as a localized date (timezone-safe). */
function formatYMD(ymd: string): string {
  if (!ymd) return "—";
  const [y, m, d] = ymd.split("-").map(Number);
  if (!y || !m || !d) return ymd;
  return new Date(y, m - 1, d).toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/** Human-readable label for an appointment type (already capitalized). */
function typeLabel(type: string): string {
  if (APPOINTMENT_TYPE_META[type]) return APPOINTMENT_TYPE_META[type];
  if (!type) return "—";
  return type.charAt(0).toUpperCase() + type.slice(1);
}

/** Standard error toast for caught API errors. */
function reportError(err: unknown, fallback: string) {
  toast.error(err instanceof Error ? err.message : fallback);
}

/* ------------------------------------------------------------------ */
/* Patient name lookup                                                 */
/* ------------------------------------------------------------------ */

/** Build a Map<patientId, name> from the large patient list. */
function usePatientMap(): Map<string, string> {
  const { data } = usePatients("", 1, 200);
  return useMemo(() => {
    const map = new Map<string, string>();
    const patients = (data?.data as Patient[] | undefined) ?? [];
    for (const p of patients) map.set(p.id, p.name);
    return map;
  }, [data]);
}

/* ------------------------------------------------------------------ */
/* Main view                                                           */
/* ------------------------------------------------------------------ */

export default function AppointmentsView() {
  const isDentist = useIsDentist();
  const isCashier = useIsCashier();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [preset, setPreset] = useState<{ date?: string; time?: string }>({});

  const openDialog = (p?: { date?: string; time?: string }) => {
    setPreset(p ?? {});
    setDialogOpen(true);
  };

  // Subtle role indicator so users see at a glance which staff view they
  // are operating under. Dentist (emerald) can delete appointments;
  // cashier (amber) cannot. No indigo/blue per project rule.
  const rolePill = isDentist
    ? {
        label: "Dentist",
        className:
          "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
      }
    : isCashier
      ? {
          label: "Cashier",
          className:
            "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
        }
      : null;

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:py-8 2xl:max-w-[1400px]">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Appointments
            </h1>
            {rolePill ? (
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${rolePill.className}`}
                aria-label={`Signed in as ${rolePill.label.toLowerCase()}`}
              >
                {rolePill.label}
              </span>
            ) : null}
          </div>
          <p className="text-sm text-muted-foreground">
            Schedule, manage, and approve patient appointments.
          </p>
        </div>
        <Button onClick={() => openDialog()}>
          <Plus className="h-4 w-4" />
          New Appointment
        </Button>
      </header>

      <Tabs defaultValue="list" className="w-full">
        <TabsList className="flex w-full overflow-x-auto sm:w-auto">
          <TabsTrigger value="list" className="gap-1.5">
            <ClipboardList className="h-4 w-4" /> List
          </TabsTrigger>
          <TabsTrigger value="schedule" className="gap-1.5">
            <CalendarDays className="h-4 w-4" /> Schedule
          </TabsTrigger>
          <TabsTrigger value="requests" className="gap-1.5">
            <ClipboardList className="h-4 w-4" /> Requests
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="mt-4">
          <ListTab isDentist={isDentist} onNew={openDialog} />
        </TabsContent>
        <TabsContent value="schedule" className="mt-4">
          <ScheduleTab onNew={openDialog} />
        </TabsContent>
        <TabsContent value="requests" className="mt-4">
          <RequestsTab />
        </TabsContent>
      </Tabs>

      <NewAppointmentDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        preset={preset}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Tab 1: List                                                         */
/* ------------------------------------------------------------------ */

function ListTab({
  isDentist,
  onNew,
}: {
  isDentist: boolean;
  onNew: (p?: { date?: string; time?: string }) => void;
}) {
  const patientMap = usePatientMap();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const filters = statusFilter === "all" ? undefined : { status: statusFilter };
  const { data, isLoading, isError } = useAppointments(filters);

  const updateAppt = useUpdateAppointment();
  const deleteAppt = useDeleteAppointment();
  const [deleteTarget, setDeleteTarget] = useState<Appointment | null>(null);

  // Group by YYYY-MM-DD, sort ascending; within each date sort by time.
  const grouped = useMemo(() => {
    const list = data ?? [];
    const map = new Map<string, Appointment[]>();
    for (const a of list) {
      const ymd = apptDateToYMD(a.date);
      if (!ymd) continue;
      const arr = map.get(ymd) ?? [];
      arr.push(a);
      map.set(ymd, arr);
    }
    return Array.from(map.keys())
      .sort()
      .map((k) => ({
        date: k,
        items: map
          .get(k)!
          .sort((x, y) => (x.time || "").localeCompare(y.time || "")),
      }));
  }, [data]);

  const onStatusChange = async (id: string, status: AppointmentStatus) => {
    try {
      await updateAppt.mutateAsync({ id, data: { status } });
      toast.success(`Status updated to "${APPOINTMENT_STATUS_META[status].label}"`);
    } catch (err) {
      reportError(err, "Failed to update status");
    }
  };

  const onConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteAppt.mutateAsync(deleteTarget.id);
      toast.success("Appointment deleted");
      setDeleteTarget(null);
    } catch (err) {
      reportError(err, "Failed to delete appointment");
      // Re-throw so ConfirmDialog keeps the dialog open for retry.
      throw err;
    }
  };

  const totalCount = grouped.reduce((n, g) => n + g.items.length, 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="status-filter" className="text-xs text-muted-foreground">
            Filter by status
          </Label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger id="status-filter" className="w-[200px]">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {STATUS_VALUES.map((s) => (
                <SelectItem key={s} value={s}>
                  {APPOINTMENT_STATUS_META[s].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <p className="text-sm text-muted-foreground">
          {totalCount} appointment{totalCount === 1 ? "" : "s"}
        </p>
      </div>

      {isLoading ? (
        <LoadingSpinner text="Loading appointments…" />
      ) : isError ? (
        <EmptyState
          title="Could not load appointments"
          message="Something went wrong while fetching appointments. Please try again later."
        />
      ) : totalCount === 0 ? (
        <EmptyState
          title="No appointments"
          message={
            statusFilter === "all"
              ? "There are no appointments yet. Create one to get started."
              : "No appointments match this filter."
          }
          action={
            <Button onClick={() => onNew()}>
              <Plus className="h-4 w-4" />
              New Appointment
            </Button>
          }
        />
      ) : (
        <div className="flex flex-col gap-4">
          {grouped.map((group) => (
            <Card key={group.date}>
              <CardHeader className="pb-0">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {formatYMD(group.date)}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                {group.items.map((a, i) => (
                  <AppointmentRow
                    key={a.id}
                    appt={a}
                    patientName={patientMap.get(a.patientId) ?? "Unknown"}
                    isDentist={isDentist}
                    onStatusChange={onStatusChange}
                    onDelete={() => setDeleteTarget(a)}
                    index={i}
                  />
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Delete appointment?"
        message={
          deleteTarget
            ? `Delete ${patientMap.get(deleteTarget.patientId) ?? "this patient"}'s appointment on ${formatYMD(apptDateToYMD(deleteTarget.date))} at ${deleteTarget.time || "—"}? This action cannot be undone.`
            : "This action cannot be undone."
        }
        confirmLabel="Delete"
        destructive
        onConfirm={onConfirmDelete}
      />
    </div>
  );
}

function AppointmentRow({
  appt,
  patientName,
  isDentist,
  onStatusChange,
  onDelete,
  index = 0,
}: {
  appt: Appointment;
  patientName: string;
  isDentist: boolean;
  onStatusChange: (id: string, status: AppointmentStatus) => void;
  onDelete: () => void;
  index?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      whileHover={{ x: 2 }}
      transition={{ duration: 0.2, delay: index * 0.02 }}
      className="flex flex-col gap-3 rounded-lg border border-border bg-card/40 p-3 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2 text-sm font-medium">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span>{appt.time || "—"}</span>
          <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
            {typeLabel(appt.type)}
          </span>
        </div>
        <div className="text-sm">
          <span className="font-medium">{patientName}</span>
          {appt.notes ? (
            <span className="text-muted-foreground"> — {appt.notes}</span>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2">
        <Select
          value={appt.status}
          onValueChange={(v) => onStatusChange(appt.id, v as AppointmentStatus)}
        >
          <SelectTrigger size="sm" className="w-full sm:w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_VALUES.map((s) => (
              <SelectItem key={s} value={s}>
                {APPOINTMENT_STATUS_META[s].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {isDentist && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onDelete}
            aria-label="Delete appointment"
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        )}
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* Tab 2: Schedule                                                     */
/* ------------------------------------------------------------------ */

function ScheduleTab({
  onNew,
}: {
  onNew: (p?: { date?: string; time?: string }) => void;
}) {
  const patientMap = usePatientMap();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const selectedYMD = localToYMD(selectedDate);

  const { data, isLoading, isError } = useAppointments({ date: selectedYMD });

  // Map time → appointments; collect off-grid appointments separately.
  // Only show appointments that belong on the schedule (scheduled or
  // completed). Pending requests, cancelled, and no-shows are excluded so
  // the calendar reflects the confirmed day's agenda.
  const { byTime, otherTimes } = useMemo(() => {
    const map = new Map<string, Appointment[]>();
    const others: Appointment[] = [];
    const slotSet = new Set(TIME_SLOTS);
    const visibleStatuses = new Set(["scheduled", "completed"]);
    for (const a of data ?? []) {
      if (!visibleStatuses.has(a.status)) continue;
      const t = a.time || "";
      if (slotSet.has(t)) {
        const arr = map.get(t) ?? [];
        arr.push(a);
        map.set(t, arr);
      } else {
        others.push(a);
      }
    }
    for (const arr of map.values()) {
      arr.sort((x, y) => (x.time || "").localeCompare(y.time || ""));
    }
    others.sort((x, y) => (x.time || "").localeCompare(y.time || ""));
    return { byTime: map, otherTimes: others };
  }, [data]);

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
      <Card className="w-full lg:w-fit">
        <CardHeader className="pb-0">
          <CardTitle className="flex items-center gap-2 text-sm">
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
            {formatYMD(selectedYMD)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(d) => d && setSelectedDate(d)}
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
            {TIME_SLOTS.map((time) => {
              const items = byTime.get(time) ?? [];
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
                        onClick={() => onNew({ date: selectedYMD, time })}
                        className="flex items-center gap-1.5 self-start rounded-md px-2 py-1 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                      >
                        <Plus className="h-4 w-4" /> Available
                      </button>
                    ) : (
                      items.map((a) => (
                        <div
                          key={a.id}
                          className="flex items-center justify-between gap-2 rounded-md bg-accent/40 px-3 py-2"
                        >
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">
                              {patientMap.get(a.patientId) ?? "Unknown"}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {typeLabel(a.type)}
                              {a.notes ? ` • ${a.notes}` : ""}
                            </span>
                          </div>
                          <AppointmentStatusBadge status={a.status} />
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}

            {otherTimes.length > 0 && (
              <div className="mt-2 flex flex-col gap-2 rounded-lg border border-dashed border-border p-3">
                <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Other times
                </div>
                {otherTimes.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center justify-between gap-2 rounded-md bg-accent/20 px-3 py-2"
                  >
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">
                        {patientMap.get(a.patientId) ?? "Unknown"} ·{" "}
                        {a.time || "—"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {typeLabel(a.type)}
                        {a.notes ? ` • ${a.notes}` : ""}
                      </span>
                    </div>
                    <AppointmentStatusBadge status={a.status} />
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

/* ------------------------------------------------------------------ */
/* Tab 3: Requests                                                     */
/* ------------------------------------------------------------------ */

function RequestsTab() {
  const patientMap = usePatientMap();
  const { data, isLoading, isError } = useAppointments({ status: "pending" });
  const updateAppt = useUpdateAppointment();

  const sorted = useMemo(() => {
    const list = data ?? [];
    return [...list].sort(
      (a, b) =>
        new Date(a.date).getTime() - new Date(b.date).getTime() ||
        (a.time || "").localeCompare(b.time || "")
    );
  }, [data]);

  const onApprove = async (a: Appointment) => {
    try {
      await updateAppt.mutateAsync({ id: a.id, data: { status: "scheduled" } });
      toast.success("Appointment approved and scheduled");
    } catch (err) {
      reportError(err, "Failed to approve appointment");
    }
  };

  const onDecline = async (a: Appointment) => {
    try {
      await updateAppt.mutateAsync({ id: a.id, data: { status: "cancelled" } });
      toast.info("Appointment request declined");
    } catch (err) {
      reportError(err, "Failed to decline appointment");
    }
  };

  if (isLoading) return <LoadingSpinner text="Loading requests…" />;

  if (isError) {
    return (
      <EmptyState
        title="Could not load requests"
        message="Something went wrong while fetching pending requests. Please try again later."
      />
    );
  }

  if (sorted.length === 0) {
    return (
      <EmptyState
        title="No pending requests"
        message="All appointment requests have been reviewed."
      />
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {sorted.map((a) => (
        <Card key={a.id}>
          <CardContent className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                {typeLabel(a.type)}
              </span>
              <AppointmentStatusBadge status={a.status} />
            </div>
            <div className="flex flex-col gap-1 text-sm">
              <span className="font-medium">
                {patientMap.get(a.patientId) ?? "Unknown"}
              </span>
              <span className="text-muted-foreground">
                {formatYMD(apptDateToYMD(a.date))} at {a.time || "—"}
              </span>
              {a.notes ? (
                <span className="text-xs italic text-muted-foreground">
                  &ldquo;{a.notes}&rdquo;
                </span>
              ) : null}
            </div>
            <div className="mt-1 flex gap-2">
              <MotionButton
                size="sm"
                className="flex-1"
                onClick={() => onApprove(a)}
                disabled={updateAppt.isPending}
                whileTap={{ scale: 0.95 }}
              >
                <Check className="h-4 w-4" />
                Approve
              </MotionButton>
              <MotionButton
                size="sm"
                variant="outline"
                className="flex-1"
                onClick={() => onDecline(a)}
                disabled={updateAppt.isPending}
                whileTap={{ scale: 0.95 }}
              >
                <X className="h-4 w-4" />
                Decline
              </MotionButton>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* New Appointment Dialog (shared)                                     */
/* ------------------------------------------------------------------ */

function NewAppointmentDialog({
  open,
  onOpenChange,
  preset,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  preset: { date?: string; time?: string };
}) {
  const { data: patientsData, isLoading: patientsLoading } = usePatients("", 1, 200);
  const patients = (patientsData?.data as Patient[] | undefined) ?? [];
  const createAppt = useCreateAppointment();

  const form = useForm<
    z.input<typeof appointmentFormSchema>,
    unknown,
    AppointmentFormValues
  >({
    resolver: zodResolver(appointmentFormSchema),
    defaultValues: {
      patientId: "",
      date: preset.date ?? localToYMD(new Date()),
      time: preset.time ?? TIME_SLOTS[0],
      type: APPOINTMENT_TYPES.CHECKUP,
      notes: "",
      status: "scheduled",
    },
  });

  // Reset form when opening or when the preset changes.
  useEffect(() => {
    if (open) {
      form.reset({
        patientId: "",
        date: preset.date ?? localToYMD(new Date()),
        time: preset.time ?? TIME_SLOTS[0],
        type: APPOINTMENT_TYPES.CHECKUP,
        notes: "",
        status: "scheduled",
      });
    }
  }, [open, preset.date, preset.time, form]);

  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors },
  } = form;

  // Subscribe to specific fields for controlled selects. `useWatch` is
  // hook-based and safe for React Compiler memoization (unlike `watch`).
  const patientId = useWatch({ control, name: "patientId" });
  const timeValue = useWatch({ control, name: "time" });
  const typeValue = useWatch({ control, name: "type" });

  const onSubmit = async (values: AppointmentFormValues) => {
    try {
      await createAppt.mutateAsync({
        patientId: values.patientId,
        date: values.date,
        time: values.time,
        type: values.type,
        notes: values.notes ?? "",
        status: "scheduled",
      });
      toast.success("Appointment created");
      onOpenChange(false);
    } catch (err) {
      reportError(err, "Failed to create appointment");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[90vw] sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>New Appointment</DialogTitle>
          <DialogDescription>
            Schedule an appointment for a patient. New staff-created
            appointments default to &ldquo;Scheduled&rdquo;.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="appt-patient">Patient</Label>
            <Select
              value={patientId}
              onValueChange={(v) =>
                setValue("patientId", v, { shouldValidate: true })
              }
            >
              <SelectTrigger id="appt-patient" className="w-full">
                <SelectValue
                  placeholder={
                    patientsLoading ? "Loading patients…" : "Select a patient"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {patients.length === 0 ? (
                  <SelectItem value="__none" disabled>
                    {patientsLoading ? "Loading patients…" : "No patients found"}
                  </SelectItem>
                ) : (
                  patients.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {errors.patientId && (
              <p className="text-xs text-destructive">
                {errors.patientId.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="appt-date">Date</Label>
              <Input id="appt-date" type="date" {...register("date")} />
              {errors.date && (
                <p className="text-xs text-destructive">{errors.date.message}</p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="appt-time">Time</Label>
              <Select
                value={timeValue}
                onValueChange={(v) =>
                  setValue("time", v, { shouldValidate: true })
                }
              >
                <SelectTrigger id="appt-time" className="w-full">
                  <SelectValue placeholder="Select a time" />
                </SelectTrigger>
                <SelectContent>
                  {TIME_SLOTS.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.time && (
                <p className="text-xs text-destructive">{errors.time.message}</p>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="appt-type">Type</Label>
            <Select
              value={typeValue}
              onValueChange={(v) =>
                setValue("type", v, { shouldValidate: true })
              }
            >
              <SelectTrigger id="appt-type" className="w-full">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {Object.values(APPOINTMENT_TYPES).map((t) => (
                  <SelectItem key={t} value={t}>
                    {typeLabel(t)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.type && (
              <p className="text-xs text-destructive">{errors.type.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="appt-notes">Notes</Label>
            <Textarea
              id="appt-notes"
              placeholder="Optional notes for the dentist or reception"
              {...register("notes")}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={createAppt.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createAppt.isPending}>
              {createAppt.isPending ? "Creating…" : "Create appointment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
