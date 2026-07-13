"use client";

import { Clock, Trash2 } from "lucide-react";
import { motion } from "framer-motion";

import type { Appointment, AppointmentStatus } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { APPOINTMENT_STATUS_META } from "@/lib/format";

import { ALL_APPOINTMENT_STATUSES, formatAppointmentTypeLabel } from "./helpers";

interface AppointmentRowProps {
  appointment: Appointment;
  patientName: string;
  isDentist: boolean;
  onStatusChange: (id: string, status: AppointmentStatus) => void;
  onDelete: () => void;
  index?: number;
}

/**
 * A single appointment row inside the List tab.
 *
 * Shows the time, type, patient name, optional notes, an inline status
 * dropdown, and (for dentists) a delete button. Animates in on mount with a
 * tiny stagger based on `index`.
 */
export function AppointmentRow({
  appointment,
  patientName,
  isDentist,
  onStatusChange,
  onDelete,
  index = 0,
}: AppointmentRowProps) {
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
          <span>{appointment.time || "—"}</span>
          <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
            {formatAppointmentTypeLabel(appointment.type)}
          </span>
        </div>
        <div className="text-sm">
          <span className="font-medium">{patientName}</span>
          {appointment.notes ? (
            <span className="text-muted-foreground">
              {" "}— {appointment.notes}
            </span>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2">
        <Select
          value={appointment.status}
          onValueChange={(value) =>
            onStatusChange(appointment.id, value as AppointmentStatus)
          }
        >
          <SelectTrigger size="sm" className="w-full sm:w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ALL_APPOINTMENT_STATUSES.map((status) => (
              <SelectItem key={status} value={status}>
                {APPOINTMENT_STATUS_META[status].label}
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
