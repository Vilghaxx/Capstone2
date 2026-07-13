"use client";

import { useMemo } from "react";
import { toast } from "sonner";
import { Check, X } from "lucide-react";
import { motion } from "framer-motion";

import { useAppointments, useUpdateAppointment } from "@/hooks";
import type { Appointment } from "@/lib/types";
import {
  formatAppointmentDateToYearMonthDay,
  formatYearMonthDayForDisplay,
} from "@/lib/date-utils";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { EmptyState } from "@/components/common/EmptyState";
import { AppointmentStatusBadge } from "@/components/common/StatusBadge";

import { usePatientNameById } from "./usePatientNameById";
import { formatAppointmentTypeLabel, reportError } from "./helpers";

/**
 * Motion-enabled shadcn Button. Used for the Approve/Decline actions in the
 * Requests tab so we can attach `whileTap` press feedback without losing the
 * variant/size props.
 */
const MotionButton = motion.create(Button);

/**
 * Tab 3 — Requests.
 *
 * Lists pending appointment requests. Each card lets staff approve (sets
 * status to "scheduled") or decline (sets status to "cancelled") the
 * request.
 */
export function AppointmentsRequestsTab() {
  const patientNameById = usePatientNameById();
  const { data: appointmentsData, isLoading, isError } = useAppointments({
    status: "pending",
  });
  const updateAppointment = useUpdateAppointment();

  const sortedAppointments = useMemo(() => {
    const appointmentsList = appointmentsData ?? [];
    return [...appointmentsList].sort(
      (a, b) =>
        new Date(a.date).getTime() - new Date(b.date).getTime() ||
        (a.time || "").localeCompare(b.time || "")
    );
  }, [appointmentsData]);

  const onApprove = async (appointment: Appointment) => {
    try {
      await updateAppointment.mutateAsync({
        id: appointment.id,
        data: { status: "scheduled" },
      });
      toast.success("Appointment approved and scheduled");
    } catch (err) {
      reportError(err, "Failed to approve appointment");
    }
  };

  const onDecline = async (appointment: Appointment) => {
    try {
      await updateAppointment.mutateAsync({
        id: appointment.id,
        data: { status: "cancelled" },
      });
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

  if (sortedAppointments.length === 0) {
    return (
      <EmptyState
        title="No pending requests"
        message="All appointment requests have been reviewed."
      />
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {sortedAppointments.map((appointment) => (
        <Card key={appointment.id}>
          <CardContent className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                {formatAppointmentTypeLabel(appointment.type)}
              </span>
              <AppointmentStatusBadge status={appointment.status} />
            </div>
            <div className="flex flex-col gap-1 text-sm">
              <span className="font-medium">
                {patientNameById.get(appointment.patientId) ?? "Unknown"}
              </span>
              <span className="text-muted-foreground">
                {formatYearMonthDayForDisplay(
                  formatAppointmentDateToYearMonthDay(appointment.date)
                )}{" "}
                at {appointment.time || "—"}
              </span>
              {appointment.notes ? (
                <span className="text-xs italic text-muted-foreground">
                  &ldquo;{appointment.notes}&rdquo;
                </span>
              ) : null}
            </div>
            <div className="mt-1 flex gap-2">
              <MotionButton
                size="sm"
                className="flex-1"
                onClick={() => onApprove(appointment)}
                disabled={updateAppointment.isPending}
                whileTap={{ scale: 0.95 }}
              >
                <Check className="h-4 w-4" />
                Approve
              </MotionButton>
              <MotionButton
                size="sm"
                variant="outline"
                className="flex-1"
                onClick={() => onDecline(appointment)}
                disabled={updateAppointment.isPending}
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
