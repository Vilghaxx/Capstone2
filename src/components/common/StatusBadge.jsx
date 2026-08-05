"use client";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { APPOINTMENT_STATUS_META, } from "@/lib/format";
/** Colored badge for appointment statuses. */
export function AppointmentStatusBadge({ status }) {
    var _a;
    const meta = APPOINTMENT_STATUS_META[status];
    return (<Badge variant="outline" className={cn("font-medium", meta === null || meta === void 0 ? void 0 : meta.className)}>
      {(_a = meta === null || meta === void 0 ? void 0 : meta.label) !== null && _a !== void 0 ? _a : status}
    </Badge>);
}
