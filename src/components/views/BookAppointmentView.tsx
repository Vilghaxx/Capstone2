'use client';

import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  CalendarPlus,
  CheckCircle2,
  ClipboardList,
  Info,
  Loader2,
} from "lucide-react";

import { useAuth } from "@/lib/auth-store";
import { useNav } from "@/lib/nav";
import { useCreateAppointment } from "@/hooks";
import { appointmentFormSchema } from "@/lib/schemas/appointment-schema";
import {
  APPOINTMENT_TYPES,
  APPOINTMENT_TYPE_META,
  APPOINTMENT_TIME_SLOTS,
} from "@/lib/format";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

type AppointmentFormInput = z.input<typeof appointmentFormSchema>;

const APPOINTMENT_TYPE_VALUES = Object.values(APPOINTMENT_TYPES);

/** Today's date as a YYYY-MM-DD string, suitable for the date input's `min`. */
function todayStr(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function BookAppointmentView() {
  const user = useAuth((state) => state.user);
  const navigate = useNav((s) => s.navigate);
  const createAppointment = useCreateAppointment();
  const [submitted, setSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AppointmentFormInput>({
    resolver: zodResolver(appointmentFormSchema),
    defaultValues: {
      patientId: user?.patientRef ?? "",
      date: "",
      time: "",
      type: "",
      notes: "",
      status: "pending",
    },
  });

  const typeValue = useWatch({ control, name: "type" });
  const timeValue = useWatch({ control, name: "time" });

  async function onSubmit(values: AppointmentFormInput) {
    if (!user?.patientRef) {
      toast.error("No patient profile linked to your account.");
      return;
    }
    try {
      await createAppointment.mutateAsync({
        patientId: user.patientRef,
        date: values.date,
        time: values.time,
        type: values.type,
        notes: values.notes ?? "",
      });
      toast.success("Appointment requested!");
      setSubmitted(true);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Failed to submit your request. Please try again.";
      toast.error(message);
    }
  }

  function handleBookAnother() {
    reset({
      patientId: user?.patientRef ?? "",
      date: "",
      time: "",
      type: "",
      notes: "",
      status: "pending",
    });
    setSubmitted(false);
  }

  if (submitted) {
    return (
      <div className="mx-auto w-full max-w-[90vw] sm:max-w-2xl px-4 py-10">
        <Card className="border-blue-200 bg-blue-50/60 dark:border-blue-900/50 dark:bg-blue-950/30">
          <CardContent className="flex flex-col items-center gap-4 px-6 py-12 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/60 dark:text-blue-300">
              <CheckCircle2 className="h-9 w-9" aria-hidden="true" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-blue-900 dark:text-blue-100">
                Request submitted!
              </h2>
              <p className="mx-auto max-w-md text-sm text-blue-800/80 dark:text-blue-200/80">
                Your appointment request has been submitted and is pending
                approval. We&apos;ll confirm it shortly.
              </p>
            </div>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                onClick={handleBookAnother}
              >
                <CalendarPlus className="h-4 w-4" aria-hidden="true" />
                Book Another
              </Button>
              <Button
                type="button"
                onClick={() => navigate("my-appointments")}
                className="bg-blue-600 text-white hover:bg-blue-700"
              >
                View My Appointments
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[90vw] sm:max-w-md px-4 py-8">
      <header className="mb-6 space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-blue-700 dark:text-blue-300">
          Book an Appointment
        </h1>
        <p className="text-sm text-muted-foreground">
          Request a visit and our team will confirm it.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ClipboardList
              className="h-5 w-5 text-blue-600"
              aria-hidden="true"
            />
            Appointment details
          </CardTitle>
          <CardDescription>
            Pick a preferred date and time. We&apos;ll review and confirm
            shortly.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <CardContent className="space-y-5">
            {/* Appointment Type */}
            <div className="space-y-2">
              <Label htmlFor="appt-type">Appointment Type</Label>
              <Select
                value={typeValue}
                onValueChange={(v) =>
                  setValue("type", v, { shouldValidate: true })
                }
              >
                <SelectTrigger
                  id="appt-type"
                  className="w-full"
                  aria-invalid={!!errors.type}
                >
                  <SelectValue placeholder="Select a type" />
                </SelectTrigger>
                <SelectContent>
                  {APPOINTMENT_TYPE_VALUES.map((v) => (
                    <SelectItem key={v} value={v}>
                      {APPOINTMENT_TYPE_META[v] ?? v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.type && (
                <p className="text-xs font-medium text-rose-600" role="alert">
                  {errors.type.message}
                </p>
              )}
            </div>

            {/* Preferred Date + Time */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {/* Preferred Date */}
            <div className="space-y-2">
              <Label htmlFor="appt-date">Preferred Date</Label>
              <Input
                id="appt-date"
                type="date"
                min={todayStr()}
                aria-invalid={!!errors.date}
                {...register("date")}
              />
              {errors.date && (
                <p className="text-xs font-medium text-rose-600" role="alert">
                  {errors.date.message}
                </p>
              )}
            </div>

            {/* Preferred Time */}
            <div className="space-y-2">
              <Label htmlFor="appt-time">Preferred Time</Label>
              <Select
                value={timeValue}
                onValueChange={(v) =>
                  setValue("time", v, { shouldValidate: true })
                }
              >
                <SelectTrigger
                  id="appt-time"
                  className="w-full"
                  aria-invalid={!!errors.time}
                >
                  <SelectValue placeholder="Select a time" />
                </SelectTrigger>
                <SelectContent>
                  {APPOINTMENT_TIME_SLOTS.map((slot) => (
                    <SelectItem key={slot} value={slot}>
                      {slot}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.time && (
                <p className="text-xs font-medium text-rose-600" role="alert">
                  {errors.time.message}
                </p>
              )}
            </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="appt-notes">Notes</Label>
              <Textarea
                id="appt-notes"
                placeholder="Anything we should know?"
                rows={4}
                aria-invalid={!!errors.notes}
                {...register("notes")}
              />
              <p className="text-xs text-muted-foreground">Optional.</p>
            </div>

            {/* Info note */}
            <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
              <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>
                Appointments are subject to approval. You&apos;ll see the status
                update in My Appointments.
              </span>
            </div>
          </CardContent>

          <CardFooter className="mt-2 flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-blue-600 text-white hover:bg-blue-700"
            >
              {isSubmitting && (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              )}
              {isSubmitting ? "Submitting…" : "Request Appointment"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
