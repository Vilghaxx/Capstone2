"use client";
import { useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useCreateAppointment, usePatients, } from "@/hooks";
import { appointmentFormSchema, } from "@/lib/schemas/appointment-schema";
import { APPOINTMENT_TYPES, APPOINTMENT_TIME_SLOTS } from "@/lib/format";
import { formatDateToLocalYearMonthDay } from "@/lib/date-utils";
import { Button } from "@/components/ui/button";
import { CharCount } from "@/components/common/CharCount";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from "@/components/ui/select";
import { formatAppointmentTypeLabel, reportError } from "./helpers";
/**
 * Modal dialog for creating a new appointment.
 *
 * The form defaults to status "scheduled" since staff-created appointments
 * skip the pending-approval queue. The `preset` prop pre-fills the date and
 * time fields when the dialog is opened from a Schedule tab time slot.
 */
export function NewAppointmentDialog({ open, onOpenChange, preset, }) {
    var _a, _b, _c;
    const { data: patientsData, isLoading: patientsLoading } = usePatients("", 1, 200);
    const patients = (_a = patientsData === null || patientsData === void 0 ? void 0 : patientsData.data) !== null && _a !== void 0 ? _a : [];
    const createAppointment = useCreateAppointment();
    const form = useForm({
        resolver: zodResolver(appointmentFormSchema),
        defaultValues: {
            patientId: "",
            date: (_b = preset.date) !== null && _b !== void 0 ? _b : formatDateToLocalYearMonthDay(new Date()),
            time: (_c = preset.time) !== null && _c !== void 0 ? _c : APPOINTMENT_TIME_SLOTS[0],
            type: APPOINTMENT_TYPES.CHECKUP,
            notes: "",
            status: "scheduled",
        },
    });
    // Reset form when opening or when the preset changes.
    useEffect(() => {
        var _a, _b;
        if (open) {
            form.reset({
                patientId: "",
                date: (_a = preset.date) !== null && _a !== void 0 ? _a : formatDateToLocalYearMonthDay(new Date()),
                time: (_b = preset.time) !== null && _b !== void 0 ? _b : APPOINTMENT_TIME_SLOTS[0],
                type: APPOINTMENT_TYPES.CHECKUP,
                notes: "",
                status: "scheduled",
            });
        }
    }, [open, preset.date, preset.time, form]);
    const { register, handleSubmit, setValue, control, formState: { errors }, } = form;
    // Subscribe to specific fields for controlled selects. `useWatch` is
    // hook-based and safe for React Compiler memoization (unlike `watch`).
    const patientId = useWatch({ control, name: "patientId" });
    const timeValue = useWatch({ control, name: "time" });
    const typeValue = useWatch({ control, name: "type" });
    const notesValue = useWatch({ control, name: "notes" });
    const onSubmit = async (values) => {
        var _a;
        try {
            await createAppointment.mutateAsync({
                patientId: values.patientId,
                date: values.date,
                time: values.time,
                type: values.type,
                notes: (_a = values.notes) !== null && _a !== void 0 ? _a : "",
                status: "scheduled",
            });
            toast.success("Appointment created");
            onOpenChange(false);
        }
        catch (err) {
            reportError(err, "Failed to create appointment");
        }
    };
    return (<Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[90vw] sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>New Appointment</DialogTitle>
          <DialogDescription>
            Schedule an appointment for a patient. New staff-created
            appointments default to &ldquo;Scheduled&rdquo;.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="appt-patient">Patient</Label>
            <Select value={patientId} onValueChange={(value) => setValue("patientId", value, { shouldValidate: true })}>
              <SelectTrigger id="appt-patient" className="w-full">
                <SelectValue placeholder={patientsLoading ? "Loading patients…" : "Select a patient"}/>
              </SelectTrigger>
              <SelectContent>
                {patients.length === 0 ? (<SelectItem value="__none" disabled>
                    {patientsLoading ? "Loading patients…" : "No patients found"}
                  </SelectItem>) : (patients.map((patient) => (<SelectItem key={patient.id} value={patient.id}>
                      {patient.name}
                    </SelectItem>)))}
              </SelectContent>
            </Select>
            {errors.patientId && (<p className="text-xs text-destructive">
                {errors.patientId.message}
              </p>)}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="appt-date">Date</Label>
              <Input id="appt-date" type="date" {...register("date")}/>
              {errors.date && (<p className="text-xs text-destructive">
                  {errors.date.message}
                </p>)}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="appt-time">Time</Label>
              <Select value={timeValue} onValueChange={(value) => setValue("time", value, { shouldValidate: true })}>
                <SelectTrigger id="appt-time" className="w-full">
                  <SelectValue placeholder="Select a time"/>
                </SelectTrigger>
                <SelectContent>
                  {APPOINTMENT_TIME_SLOTS.map((time) => (<SelectItem key={time} value={time}>
                      {time}
                    </SelectItem>))}
                </SelectContent>
              </Select>
              {errors.time && (<p className="text-xs text-destructive">
                  {errors.time.message}
                </p>)}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="appt-type">Type</Label>
            <Select value={typeValue} onValueChange={(value) => setValue("type", value, { shouldValidate: true })}>
              <SelectTrigger id="appt-type" className="w-full">
                <SelectValue placeholder="Select type"/>
              </SelectTrigger>
              <SelectContent>
                {Object.values(APPOINTMENT_TYPES).map((type) => (<SelectItem key={type} value={type}>
                    {formatAppointmentTypeLabel(type)}
                  </SelectItem>))}
              </SelectContent>
            </Select>
            {errors.type && (<p className="text-xs text-destructive">{errors.type.message}</p>)}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="appt-notes">Notes</Label>
            <Textarea id="appt-notes" placeholder="Optional notes for the dentist or reception" {...register("notes")}/>
            <CharCount current={(notesValue !== null && notesValue !== void 0 ? notesValue : "").length}/>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={createAppointment.isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={createAppointment.isPending}>
              {createAppointment.isPending ? "Creating…" : "Create appointment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>);
}
