"use client";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { useAppointments, useDeleteAppointment, useUpdateAppointment, } from "@/hooks";
import { APPOINTMENT_STATUS_META } from "@/lib/format";
import { formatAppointmentDateToYearMonthDay, formatYearMonthDayForDisplay, } from "@/lib/date-utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from "@/components/ui/select";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { EmptyState } from "@/components/common/EmptyState";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { AppointmentRow } from "./AppointmentRow";
import { usePatientNameById } from "./usePatientNameById";
import { ALL_APPOINTMENT_STATUSES, reportError, } from "./helpers";
/**
 * Tab 1 — List.
 *
 * Shows all appointments grouped by date (ascending) with a status filter.
 * Dentists can change an appointment's status inline and delete it via the
 * ConfirmDialog.
 */
export function AppointmentsListTab({ isDentist, onNew, }) {
    var _a;
    const patientNameById = usePatientNameById();
    const [statusFilter, setStatusFilter] = useState("all");
    const filters = statusFilter === "all" ? undefined : { status: statusFilter };
    const { data: appointmentsData, isLoading, isError } = useAppointments(filters);
    const updateAppointment = useUpdateAppointment();
    const deleteAppointment = useDeleteAppointment();
    const [appointmentToDelete, setAppointmentToDelete] = useState(null);
    // Group by YYYY-MM-DD, sort ascending; within each date sort by time.
    const appointmentsGroupedByDate = useMemo(() => {
        var _a;
        const appointmentsList = appointmentsData !== null && appointmentsData !== void 0 ? appointmentsData : [];
        const patientNameByIdLocal = new Map();
        for (const appointment of appointmentsList) {
            const yearMonthDay = formatAppointmentDateToYearMonthDay(appointment.date);
            if (!yearMonthDay)
                continue;
            const bucket = (_a = patientNameByIdLocal.get(yearMonthDay)) !== null && _a !== void 0 ? _a : [];
            bucket.push(appointment);
            patientNameByIdLocal.set(yearMonthDay, bucket);
        }
        return Array.from(patientNameByIdLocal.keys())
            .sort()
            .map((key) => ({
            date: key,
            items: patientNameByIdLocal
                .get(key)
                .sort((x, y) => (x.time || "").localeCompare(y.time || "")),
        }));
    }, [appointmentsData]);
    const onStatusChange = async (id, status) => {
        try {
            await updateAppointment.mutateAsync({ id, data: { status } });
            toast.success(`Status updated to "${APPOINTMENT_STATUS_META[status].label}"`);
        }
        catch (err) {
            reportError(err, "Failed to update status");
        }
    };
    const onConfirmDelete = async () => {
        if (!appointmentToDelete)
            return;
        try {
            await deleteAppointment.mutateAsync(appointmentToDelete.id);
            toast.success("Appointment deleted");
            setAppointmentToDelete(null);
        }
        catch (err) {
            reportError(err, "Failed to delete appointment");
            // Re-throw so ConfirmDialog keeps the dialog open for retry.
            throw err;
        }
    };
    const totalCount = appointmentsGroupedByDate.reduce((count, group) => count + group.items.length, 0);
    return (<div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="status-filter" className="text-xs text-muted-foreground">
            Filter by status
          </Label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger id="status-filter" className="w-[200px]">
              <SelectValue placeholder="All statuses"/>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {ALL_APPOINTMENT_STATUSES.map((status) => (<SelectItem key={status} value={status}>
                  {APPOINTMENT_STATUS_META[status].label}
                </SelectItem>))}
            </SelectContent>
          </Select>
        </div>
        <p className="text-sm text-muted-foreground">
          {totalCount} appointment{totalCount === 1 ? "" : "s"}
        </p>
      </div>

      {isLoading ? (<LoadingSpinner text="Loading appointments…"/>) : isError ? (<EmptyState title="Could not load appointments" message="Something went wrong while fetching appointments. Please try again later."/>) : totalCount === 0 ? (<EmptyState title="No appointments" message={statusFilter === "all"
                ? "There are no appointments yet. Create one to get started."
                : "No appointments match this filter."} action={<Button onClick={() => onNew()}>
              <Plus className="h-4 w-4"/>
              New Appointment
            </Button>}/>) : (<div className="flex flex-col gap-4">
          {appointmentsGroupedByDate.map((group) => (<Card key={group.date}>
              <CardHeader className="pb-0">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {formatYearMonthDayForDisplay(group.date)}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                {group.items.map((appointment, index) => {
                    var _a;
                    return (<AppointmentRow key={appointment.id} appointment={appointment} patientName={(_a = patientNameById.get(appointment.patientId)) !== null && _a !== void 0 ? _a : "Unknown"} isDentist={isDentist} onStatusChange={onStatusChange} onDelete={() => setAppointmentToDelete(appointment)} index={index}/>);
                })}
              </CardContent>
            </Card>))}
        </div>)}

      <ConfirmDialog open={!!appointmentToDelete} onOpenChange={(open) => !open && setAppointmentToDelete(null)} title="Delete appointment?" message={appointmentToDelete
            ? `Delete ${(_a = patientNameById.get(appointmentToDelete.patientId)) !== null && _a !== void 0 ? _a : "this patient"}'s appointment on ${formatYearMonthDayForDisplay(formatAppointmentDateToYearMonthDay(appointmentToDelete.date))} at ${appointmentToDelete.time || "—"}? This action cannot be undone.`
            : "This action cannot be undone."} confirmLabel="Delete" destructive onConfirm={onConfirmDelete}/>
    </div>);
}
