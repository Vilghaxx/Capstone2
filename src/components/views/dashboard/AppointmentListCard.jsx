"use client";
import { ArrowRight, Clock } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription, } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/common/EmptyState";
import { AppointmentStatusBadge } from "@/components/common/StatusBadge";
import { formatDate } from "@/lib/format";
import { appointmentTypeLabel } from "./dashboard-helpers";
/** Single row inside the appointment list. */
function AppointmentRow({ appt, patientName }) {
    return (<div className="flex items-center justify-between gap-3 xs:gap-4 rounded-lg border bg-card p-3 xs:p-4 transition-colors hover:bg-accent/40">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium">
            {patientName || "Patient"}
          </p>
          <AppointmentStatusBadge status={appt.status}/>
        </div>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {appointmentTypeLabel(appt.type)}
          {appt.notes ? ` · ${appt.notes}` : ""}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2 text-right text-xs text-muted-foreground">
        <Clock className="h-3.5 w-3.5"/>
        <div>
          <div className="font-medium text-foreground">
            {formatDate(appt.date)}
          </div>
          <div>{appt.time || "—"}</div>
        </div>
      </div>
    </div>);
}
/** Reusable card that lists a handful of appointments with loading + empty states. */
export function AppointmentListCard({ title, description, appointments, patientNameById, loading, emptyTitle = "No appointments", emptyMessage = "Appointments will appear here.", viewAllOnClick, }) {
    return (<Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        {viewAllOnClick && appointments.length > 0 && (<Button size="sm" variant="ghost" className="gap-1" onClick={viewAllOnClick}>
            View all
            <ArrowRight className="h-4 w-4"/>
          </Button>)}
      </CardHeader>
      <CardContent className="space-y-2">
        {loading ? (<div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (<Skeleton key={i} className="h-16 w-full rounded-lg"/>))}
          </div>) : appointments.length === 0 ? (<EmptyState title={emptyTitle} message={emptyMessage}/>) : (appointments.map((appointment) => (<AppointmentRow key={appointment.id} appt={appointment} patientName={patientNameById === null || patientNameById === void 0 ? void 0 : patientNameById.get(appointment.patientId)}/>)))}
      </CardContent>
    </Card>);
}
