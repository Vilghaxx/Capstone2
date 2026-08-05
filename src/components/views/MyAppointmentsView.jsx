'use client';
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { CalendarCheck2, CalendarClock, CalendarPlus, CalendarX2, Clock, Loader2, Pencil, StickyNote, Trash2, XCircle, } from "lucide-react";
import { useAppointments, useDeleteAppointment, useDeleteAppointments, useUpdateAppointment, } from "@/hooks";
import { useNav } from "@/lib/nav";
import { APPOINTMENT_TYPE_META, APPOINTMENT_TIME_SLOTS } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger, } from "@/components/ui/alert-dialog";
import { CharCount } from "@/components/common/CharCount";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { EmptyState } from "@/components/common/EmptyState";
import { AppointmentStatusBadge } from "@/components/common/StatusBadge";
import { cn } from "@/lib/utils";
/** Start of today as a Date (local time, midnight). */
function startOfToday() {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
}
/** Format a date string with weekday for patient-friendly display. */
function formatWithWeekday(value) {
    const d = new Date(value);
    if (isNaN(d.getTime()))
        return "—";
    return d.toLocaleDateString("en-PH", {
        weekday: "long",
        month: "short",
        day: "numeric",
        year: "numeric",
    });
}
/**
 * An appointment is "upcoming" if it is pending/scheduled AND its date is
 * today or later. Everything else (completed/cancelled/no-show, or any
 * appointment whose date has already passed) falls into history.
 */
function isUpcoming(a) {
    const today = startOfToday();
    const apptDate = new Date(a.date);
    apptDate.setHours(0, 0, 0, 0);
    if (apptDate < today)
        return false;
    return a.status === "pending" || a.status === "scheduled";
}
/** Format a date as YYYY-MM-DD for input[type=date] */
function toDateInputValue(date) {
    const d = new Date(date);
    if (isNaN(d.getTime()))
        return "";
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
}
function AppointmentCard({ appointment }) {
    var _a, _b;
    const updateAppt = useUpdateAppointment();
    const deleteAppt = useDeleteAppointment();
    const upcoming = isUpcoming(appointment);
    const canEdit = appointment.status === "pending";
    const canCancel = appointment.status === "pending" || appointment.status === "scheduled";
    const canDelete = !canEdit && !canCancel;
    // Edit dialog state
    const [editOpen, setEditOpen] = useState(false);
    const [editDate, setEditDate] = useState(toDateInputValue(appointment.date));
    const [editTime, setEditTime] = useState(appointment.time);
    const [editType, setEditType] = useState(appointment.type);
    const [editNotes, setEditNotes] = useState((_a = appointment.notes) !== null && _a !== void 0 ? _a : "");
    // Cancel dialog state
    const [cancelOpen, setCancelOpen] = useState(false);
    const [cancelling, setCancelling] = useState(false);
    function resetEditForm() {
        var _a;
        setEditDate(toDateInputValue(appointment.date));
        setEditTime(appointment.time);
        setEditType(appointment.type);
        setEditNotes((_a = appointment.notes) !== null && _a !== void 0 ? _a : "");
    }
    function handleEditOpenChange(open) {
        setEditOpen(open);
        if (open)
            resetEditForm();
    }
    async function handleCancel() {
        setCancelling(true);
        try {
            await updateAppt.mutateAsync({
                id: appointment.id,
                data: { status: "cancelled" },
            });
            toast.success("Appointment cancelled.");
            setCancelOpen(false);
        }
        catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to cancel appointment.");
        }
        finally {
            setCancelling(false);
        }
    }
    async function handleEditSubmit(e) {
        e.preventDefault();
        if (!editDate || !editTime || !editType) {
            toast.error("Date, time, and type are required.");
            return;
        }
        try {
            await updateAppt.mutateAsync({
                id: appointment.id,
                data: {
                    date: editDate,
                    time: editTime,
                    type: editType,
                    notes: editNotes || "",
                },
            });
            toast.success("Appointment updated.");
            setEditOpen(false);
        }
        catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to update appointment.");
        }
    }
    const accentClass = upcoming
        ? appointment.status === "pending"
            ? "border-l-4 border-l-amber-400"
            : "border-l-4 border-l-sky-400"
        : "";
    return (<>
      <Card className={cn("p-3 xs:p-4", accentClass)}>
        <CardContent className="space-y-2 px-0">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-base font-semibold text-foreground">
              {(_b = APPOINTMENT_TYPE_META[appointment.type]) !== null && _b !== void 0 ? _b : appointment.type}
            </h3>
            <AppointmentStatusBadge status={appointment.status}/>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <CalendarClock className="h-4 w-4 text-blue-600" aria-hidden="true"/>
              <span>{formatWithWeekday(appointment.date)}</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-blue-600" aria-hidden="true"/>
              <span>{appointment.time || "—"}</span>
            </span>
          </div>

          {appointment.notes && (<div className="flex items-start gap-1.5 rounded-md bg-muted/50 px-3 py-2 text-sm">
              <StickyNote className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden="true"/>
              <span className="text-muted-foreground">
                <span className="font-medium text-foreground/80">Notes: </span>
                {appointment.notes}
              </span>
            </div>)}

          {(canEdit || canCancel || canDelete) && (<div className="flex flex-wrap gap-2 pt-1">
              {canEdit && (<Dialog open={editOpen} onOpenChange={handleEditOpenChange}>
                <DialogTrigger asChild>
                  <Button type="button" variant="outline" size="sm" className="gap-1.5">
                    <Pencil className="h-3.5 w-3.5" aria-hidden="true"/>
                    Edit
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <form onSubmit={handleEditSubmit}>
                    <DialogHeader>
                      <DialogTitle>Edit Appointment</DialogTitle>
                      <DialogDescription>
                        Update your preferred date, time, or notes.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      {/* Type */}
                      <div className="space-y-2">
                        <Label htmlFor="edit-type">Type</Label>
                        <Select value={editType} onValueChange={setEditType}>
                          <SelectTrigger id="edit-type" className="w-full">
                            <SelectValue placeholder="Select type"/>
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(APPOINTMENT_TYPE_META).map(([value, label]) => (<SelectItem key={value} value={value}>
                                  {label}
                                </SelectItem>))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Date + Time */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="edit-date">Date</Label>
                          <Input id="edit-date" type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)}/>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="edit-time">Time</Label>
                          <Select value={editTime} onValueChange={setEditTime}>
                            <SelectTrigger id="edit-time" className="w-full">
                              <SelectValue placeholder="Select time"/>
                            </SelectTrigger>
                            <SelectContent>
                              {APPOINTMENT_TIME_SLOTS.map((slot) => (<SelectItem key={slot} value={slot}>
                                  {slot}
                                </SelectItem>))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Notes */}
                      <div className="space-y-2">
                        <Label htmlFor="edit-notes">Notes</Label>
                        <Textarea id="edit-notes" placeholder="Anything else?" rows={3} value={editNotes} onChange={(e) => setEditNotes(e.target.value)}/>
                        <CharCount current={editNotes.length}/>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={updateAppt.isPending} className="bg-blue-600 text-white hover:bg-blue-700">
                        {updateAppt.isPending && (<Loader2 className="h-4 w-4 animate-spin" aria-hidden="true"/>)}
                        Save Changes
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>)}

              {canCancel && (<AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
                <AlertDialogTrigger asChild>
                  <Button type="button" variant="outline" size="sm" className="gap-1.5 text-rose-600 hover:text-rose-700">
                    <XCircle className="h-3.5 w-3.5" aria-hidden="true"/>
                    Cancel
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Cancel this appointment?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. The appointment will be
                      marked as cancelled.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={cancelling}>
                      Keep It
                    </AlertDialogCancel>
                    <AlertDialogAction onClick={handleCancel} disabled={cancelling} className="bg-rose-600 text-white hover:bg-rose-700">
                      {cancelling && (<Loader2 className="h-4 w-4 animate-spin" aria-hidden="true"/>)}
                      Yes, Cancel It
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>)}

              {canDelete && (<AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button type="button" variant="outline" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground">
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true"/>
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete this appointment?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently remove this past appointment from your history.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Keep It</AlertDialogCancel>
                    <AlertDialogAction onClick={() => deleteAppt.mutate(appointment.id)} disabled={deleteAppt.isPending} className="bg-rose-600 text-white hover:bg-rose-700">
                      {deleteAppt.isPending && (<Loader2 className="h-4 w-4 animate-spin" aria-hidden="true"/>)}
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>)}
            </div>)}
        </CardContent>
      </Card>
    </>);
}
export default function MyAppointmentsView() {
    const navigate = useNav((s) => s.navigate);
    const { data: appointments, isLoading, isError } = useAppointments();
    const deleteAll = useDeleteAppointments();
    const { upcoming, history } = useMemo(() => {
        const all = appointments !== null && appointments !== void 0 ? appointments : [];
        const up = [];
        const hist = [];
        for (const a of all) {
            if (isUpcoming(a))
                up.push(a);
            else
                hist.push(a);
        }
        up.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        hist.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        return { upcoming: up, history: hist };
    }, [appointments]);
    return (<div className="mx-auto max-w-4xl px-4 py-8">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-blue-700 dark:text-blue-300">
            My Appointments
          </h1>
          <p className="text-sm text-muted-foreground">
            View your upcoming visits and history.
          </p>
        </div>
        <Button type="button" onClick={() => navigate("book")} className="bg-blue-600 text-white hover:bg-blue-700">
          <CalendarPlus className="h-4 w-4" aria-hidden="true"/>
          Book New
        </Button>
      </header>

      {isLoading ? (<LoadingSpinner text="Loading your appointments…"/>) : isError ? (<EmptyState title="Couldn't load appointments" message="Something went wrong while fetching your appointments. Please try again later."/>) : (<div className="space-y-8">
          {/* Upcoming */}
          <section className="space-y-3" aria-labelledby="upcoming-heading">
            <h2 id="upcoming-heading" className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <CalendarCheck2 className="h-4 w-4" aria-hidden="true"/>
              Upcoming
            </h2>
            {upcoming.length === 0 ? (<EmptyState title="No upcoming appointments" message="When you request a visit, it'll show up here." action={<Button type="button" variant="outline" onClick={() => navigate("book")}>
                    <CalendarPlus className="h-4 w-4" aria-hidden="true"/>
                    Book one now
                  </Button>}/>) : (<div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                {upcoming.map((a) => (<AppointmentCard key={a.id} appointment={a}/>))}
              </div>)}
          </section>

          {/* History */}
          <section className="space-y-3" aria-labelledby="history-heading">
            <div className="flex items-center justify-between">
              <h2 id="history-heading" className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <CalendarX2 className="h-4 w-4" aria-hidden="true"/>
                History
              </h2>
              {history.length > 0 && (<AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button type="button" variant="outline" size="sm" className="gap-1.5 text-muted-foreground">
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true"/>
                      Delete All
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete all history?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently remove all {history.length} past
                        appointments from your history.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Keep Them</AlertDialogCancel>
                      <AlertDialogAction onClick={() => deleteAll.mutate()} disabled={deleteAll.isPending} className="bg-rose-600 text-white hover:bg-rose-700">
                        {deleteAll.isPending && (<Loader2 className="h-4 w-4 animate-spin" aria-hidden="true"/>)}
                        Delete All
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>)}
            </div>
            {history.length === 0 ? (<EmptyState title="No appointment history" message="Your past appointments will appear here."/>) : (<div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                {history.map((a) => (<AppointmentCard key={a.id} appointment={a}/>))}
              </div>)}
          </section>
        </div>)}
    </div>);
}
