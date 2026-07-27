"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Calendar as CalendarIcon, Info, Loader2, Plus } from "lucide-react";

import { useAuth } from "@/lib/auth-store";
import { useNav } from "@/lib/nav";
import { apiClient } from "@/lib/api";
import {
  APPOINTMENT_TIME_SLOTS,
  APPOINTMENT_TYPES,
  APPOINTMENT_TYPE_META,
} from "@/lib/format";
import { useCreateAppointment, useMyProfile } from "@/hooks";
import { formatYearMonthDayForDisplay, formatDateToLocalYearMonthDay } from "@/lib/date-utils";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { EmptyState } from "@/components/common/EmptyState";
import { AppointmentStatusBadge } from "@/components/common/StatusBadge";

interface ScheduleSlot {
  id: string;
  time: string;
  type: string;
  status: string;
}

/** Today's date as a YYYY-MM-DD string. */
function todayStr(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Date 30 days from now as YYYY-MM-DD. */
function oneMonthFromToday(): string {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function PatientBookView() {
  const user = useAuth((s) => s.user);
  const navigate = useNav((s) => s.navigate);
  const createAppt = useCreateAppointment();
  const { data: profile, isLoading: profileLoading } = useMyProfile();

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [slots, setSlots] = useState<ScheduleSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Booking dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [bookTime, setBookTime] = useState("");
  const [bookType, setBookType] = useState("");
  const [bookNotes, setBookNotes] = useState("");

  const selectedDateStr = formatDateToLocalYearMonthDay(selectedDate);

  // Fetch schedule when date changes
  useEffect(() => {
    setError(false);
    setLoading(true);
    apiClient
      .get<ScheduleSlot[]>(`/api/appointments/schedule?date=${selectedDateStr}`)
      .then(setSlots)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [selectedDateStr]);

  // Map time -> schedule slot
  const slotByTime = useMemo(() => {
    const map = new Map<string, ScheduleSlot>();
    for (const s of slots) {
      map.set(s.time, s);
    }
    return map;
  }, [slots]);

  const typeValues = Object.values(APPOINTMENT_TYPES);

  function handleOpenBooking(time: string) {
    setBookTime(time);
    setBookType("");
    setBookNotes("");
    setDialogOpen(true);
  }

  async function handleSubmitBooking() {
    if (!bookType) {
      toast.error("Please select an appointment type.");
      return;
    }
    if (!user?.patientRef) {
      toast.error("No patient profile linked to your account.");
      return;
    }
    setSubmitting(true);
    try {
      await createAppt.mutateAsync({
        patientId: user.patientRef,
        date: selectedDateStr,
        time: bookTime,
        type: bookType,
        notes: bookNotes || "",
      });
      toast.success("Appointment requested!");
      setDialogOpen(false);
      // Refetch schedule to reflect the new booking
      const updated = await apiClient.get<ScheduleSlot[]>(
        `/api/appointments/schedule?date=${selectedDateStr}`
      );
      setSlots(updated);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Failed to submit your request. Please try again.";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  const today = todayStr();
  const maxDate = oneMonthFromToday();

  // Guard: no patientRef
  if (!user?.patientRef) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10">
        <EmptyState
          title="Cannot book appointments"
          message="Your account is not linked to a patient record."
        />
      </div>
    );
  }

  // Guard: loading profile
  if (profileLoading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <Skeleton className="mb-6 h-8 w-48" />
        <Skeleton className="h-72 w-full rounded-xl" />
      </div>
    );
  }

  // Guard: phone required
  if (profile?.patient && !profile.patient.phone) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10">
        <Card className="border-amber-200 bg-amber-50/60 dark:border-amber-900/50 dark:bg-amber-950/30">
          <CardContent className="flex flex-col items-center gap-4 px-6 py-12 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-900/60 dark:text-amber-300">
              <Info className="h-9 w-9" aria-hidden="true" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-amber-900 dark:text-amber-100">
                Complete your profile
              </h2>
              <p className="mx-auto max-w-md text-sm text-amber-800/80 dark:text-amber-200/80">
                Please add a phone number to your profile before booking an
                appointment.
              </p>
            </div>
            <Button
              type="button"
              onClick={() => navigate("my-profile")}
              className="bg-amber-600 text-white hover:bg-amber-700"
            >
              Go to My Profile
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <header className="mb-6 space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-blue-700 dark:text-blue-300">
          Book an Appointment
        </h1>
        <p className="text-sm text-muted-foreground">
          Pick an available time slot. Requests are subject to approval.
        </p>
      </header>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        {/* Calendar */}
        <Card className="w-full lg:w-fit">
          <CardHeader className="pb-0">
            <CardTitle className="flex items-center gap-2 text-sm">
              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
              {formatYearMonthDayForDisplay(selectedDateStr)}
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
              Tap a date to view available slots.
            </p>
          </CardContent>
        </Card>

        {/* Time slots */}
        <div className="flex-1">
          {loading ? (
            <LoadingSpinner text="Loading schedule…" />
          ) : error ? (
            <EmptyState
              title="Could not load schedule"
              message="Something went wrong. Please try again later."
            />
          ) : (
            <div className="flex flex-col gap-2">
              {APPOINTMENT_TIME_SLOTS.map((time) => {
                const booked = slotByTime.get(time);
                const disabled =
                  selectedDateStr < today || selectedDateStr > maxDate;
                return (
                  <div
                    key={time}
                    className="flex gap-3 rounded-lg border border-border bg-card/30 p-2 xs:p-3 lg:p-4"
                  >
                    <div className="w-16 shrink-0 pt-0.5 text-sm font-medium text-muted-foreground">
                      {time}
                    </div>
                    <div className="flex flex-1 flex-col gap-2">
                      {booked ? (
                        <div className="flex items-center justify-between gap-2 rounded-md bg-muted/50 px-3 py-2">
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">
                              {APPOINTMENT_TYPE_META[booked.type] ??
                                booked.type}
                            </span>
                          </div>
                          <AppointmentStatusBadge status={booked.status} />
                        </div>
                      ) : (
                        <button
                          type="button"
                          disabled={disabled}
                          onClick={() => handleOpenBooking(time)}
                          className="flex items-center gap-1.5 self-start rounded-md px-2 py-1 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <Plus className="h-4 w-4" /> Available
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Info note */}
      <div className="mt-6 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
        <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <span>
          Appointments are subject to approval. You&apos;ll see the status
          update in My Appointments.
        </span>
      </div>

      {/* Booking dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Book Appointment</DialogTitle>
            <DialogDescription>
              {selectedDateStr} at {bookTime}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="book-type">Appointment Type</Label>
              <Select value={bookType} onValueChange={setBookType}>
                <SelectTrigger id="book-type" className="w-full">
                  <SelectValue placeholder="Select a type" />
                </SelectTrigger>
                <SelectContent>
                  {typeValues.map((v) => (
                    <SelectItem key={v} value={v}>
                      {APPOINTMENT_TYPE_META[v] ?? v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="book-notes">Notes (optional)</Label>
              <Textarea
                id="book-notes"
                placeholder="Anything we should know?"
                rows={3}
                value={bookNotes}
                onChange={(e) => setBookNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSubmitBooking}
              disabled={submitting}
              className="bg-blue-600 text-white hover:bg-blue-700"
            >
              {submitting && (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              )}
              {submitting ? "Booking…" : "Request Appointment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
