"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  APPOINTMENT_STATUS_META,
  type AppointmentStatus,
} from "@/lib/format";

/** Colored badge for appointment statuses. */
export function AppointmentStatusBadge({ status }: { status: AppointmentStatus }) {
  const meta = APPOINTMENT_STATUS_META[status];
  return (
    <Badge variant="outline" className={cn("font-medium", meta?.className)}>
      {meta?.label ?? status}
    </Badge>
  );
}
