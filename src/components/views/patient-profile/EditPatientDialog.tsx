"use client";

import { useEffect, useState } from "react";
import { useForm, type Control } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

import { useUpdatePatient } from "@/hooks";
import { patientFormSchema } from "@/lib/schemas/patient-schema";
import { toastError } from "@/lib/api";
import type { Patient } from "@/lib/types";
import { CharCount } from "@/components/common/CharCount";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

/**
 * Minimal dialog for editing a patient's clinical notes (allergies,
 * medical conditions, etc.). Only the notes field — contact info and
 * demographics are intentionally read-only in the profile view.
 */
export function NotesDialog({
  patient,
  open,
  onOpenChange,
}: {
  patient: Patient;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const updatePatient = useUpdatePatient();
  const [notes, setNotes] = useState(patient.notes ?? "");

  useEffect(() => {
    if (open) setNotes(patient.notes ?? "");
  }, [open, patient.notes]);

  async function handleSave() {
    try {
      await updatePatient.mutateAsync({
        id: patient.id,
        data: { notes },
      });
      toast.success("Notes updated");
      onOpenChange(false);
    } catch (err) {
      toastError(err, "Failed to update notes");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Patient Notes</DialogTitle>
          <DialogDescription>
            Allergies, medical conditions, and other clinical notes for{" "}
            {patient.name}.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Allergies, medical conditions, etc."
            className="min-h-[150px]"
          />
          <CharCount current={notes.length} />
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={updatePatient.isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={updatePatient.isPending}
          >
            {updatePatient.isPending ? "Saving…" : "Save Notes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type PatientFormInput = z.input<typeof patientFormSchema>;
type PatientFormOutput = z.output<typeof patientFormSchema>;

/**
 * Shared form fields for the patient create/edit form. Used by both
 * `EditPatientDialog` (this file), the "Add Patient" dialog in
 * `PatientsView`, and the patient self-service profile edit.
 * Renders name, phone, email, date of birth, address, optionally notes.
 */
export function PatientFormFields({
  control,
  hideNotes,
}: {
  control: Control<PatientFormInput, any, PatientFormOutput>;
  hideNotes?: boolean;
}) {
  return (
    <>
      <FormField
        control={control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Full Name</FormLabel>
            <FormControl>
              <Input placeholder="Juan Dela Cruz" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          control={control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Phone</FormLabel>
              <FormControl>
                <Input placeholder="+63 917 123 4567" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="juan@example.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      <FormField
        control={control}
        name="dateOfBirth"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Date of Birth</FormLabel>
            <FormControl>
              <Input type="date" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name="address"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Address (optional)</FormLabel>
            <FormControl>
              <Input placeholder="123 Main St, Quezon City" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      {!hideNotes && (
        <FormField
          control={control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes (optional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Allergies, medical conditions, etc."
                  className="min-h-[80px]"
                  {...field}
                />
              </FormControl>
              <CharCount current={(field.value ?? "").length} />
              <FormMessage />
            </FormItem>
          )}
        />
      )}
    </>
  );
}

/**
 * Dialog for editing an existing patient's contact and clinical information.
 * Re-syncs form defaults whenever the patient record changes or the dialog
 * re-opens. On submit, calls `useUpdatePatient` and toasts the result.
 */
export function EditPatientDialog({
  patient,
  open,
  onOpenChange,
}: {
  patient: Patient;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const updatePatient = useUpdatePatient();
  const form = useForm<PatientFormInput, any, PatientFormOutput>({
    resolver: zodResolver(patientFormSchema),
    defaultValues: {
      name: patient.name,
      phone: patient.phone,
      email: patient.email,
      dateOfBirth: patient.dateOfBirth,
      address: patient.address ?? "",
      notes: patient.notes ?? "",
    },
  });

  // Re-sync defaults if the patient record changes.
  useEffect(() => {
    if (open) {
      form.reset({
        name: patient.name,
        phone: patient.phone,
        email: patient.email,
        dateOfBirth: patient.dateOfBirth,
        address: patient.address ?? "",
        notes: patient.notes ?? "",
      });
    }
  }, [open, patient, form]);

  async function onSubmit(values: PatientFormOutput) {
    try {
      await updatePatient.mutateAsync({
        id: patient.id,
        data: values as Record<string, unknown>,
      });
      toast.success("Patient updated");
      onOpenChange(false);
    } catch (err) {
      toastError(err, "Failed to update patient");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Edit Patient</DialogTitle>
          <DialogDescription>
            Update the patient&apos;s contact and clinical information.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4"
          >
            <PatientFormFields control={form.control} />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={updatePatient.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={updatePatient.isPending}>
                {updatePatient.isPending ? "Saving…" : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
