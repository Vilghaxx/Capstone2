"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm, type Control } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ArrowLeft,
  Calendar,
  Lock,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Plus,
  StickyNote,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { useIsCashier, useIsDentist, useIsStaff } from "@/lib/auth-store";
import { useNav } from "@/lib/nav";
import {
  useCreateTreatment,
  useDeletePatient,
  usePatient,
  useTeeth,
  useTreatments,
  useToothTreatments,
  useUpdatePatient,
  useUpdateTooth,
} from "@/hooks/queries";
import {
  patientFormSchema,
} from "@/lib/schemas/patient-schema";
import {
  treatmentFormSchema,
} from "@/lib/schemas/treatment-schema";
import {
  formatCurrency,
  formatDate,
  TOOTH_STATUS_META,
  TOOTH_STATUSES,
} from "@/lib/format";
import { toastError } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { Patient, Tooth, ToothStatus, Treatment } from "@/lib/types";

type PatientFormInput = z.input<typeof patientFormSchema>;
type PatientFormOutput = z.output<typeof patientFormSchema>;
type TreatmentFormInput = z.input<typeof treatmentFormSchema>;
type TreatmentFormOutput = z.output<typeof treatmentFormSchema>;

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { EmptyState } from "@/components/common/EmptyState";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { OralCavityChart } from "@/components/common/OralCavityChart";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TOOTH_STATUS_VALUES = Object.values(TOOTH_STATUSES) as ToothStatus[];

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

// ---------------------------------------------------------------------------
// Patient form fields (shared by Add + Edit dialogs)
// ---------------------------------------------------------------------------

function PatientFormFields({
  control,
}: {
  control: Control<PatientFormInput, any, PatientFormOutput>;
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
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// Edit patient dialog
// ---------------------------------------------------------------------------

function EditPatientDialog({
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

// ---------------------------------------------------------------------------
// Tooth modal — status editor + treatment timeline + add treatment
// ---------------------------------------------------------------------------

function ToothModal({
  patientId,
  toothNumber,
  open,
  onOpenChange,
}: {
  patientId: string;
  toothNumber: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const isDentist = useIsDentist();
  const isCashier = useIsCashier();
  const teethQuery = useTeeth(patientId);
  const toothTreatmentsQuery = useToothTreatments(
    patientId,
    toothNumber
  );
  const updateTooth = useUpdateTooth();
  const createTreatment = useCreateTreatment();

  const teeth = teethQuery.data ?? [];
  const tooth = useMemo(
    () =>
      toothNumber == null
        ? null
        : teeth.find((t) => t.toothNumber === toothNumber) ?? null,
    [teeth, toothNumber]
  );
  const treatments = toothTreatmentsQuery.data ?? [];

  // Status editor local state (synced to the loaded tooth). We use the
  // "previous value" pattern so the drafts reset whenever the underlying
  // tooth data changes OR the dialog re-opens, without needing a setState
  // inside an effect.
  const [statusDraft, setStatusDraft] = useState<ToothStatus>(
    tooth?.status ?? "healthy"
  );
  const [prevStatus, setPrevStatus] = useState<ToothStatus | undefined>(
    tooth?.status
  );
  const [notesDraft, setNotesDraft] = useState<string>(tooth?.notes ?? "");
  const [prevNotes, setPrevNotes] = useState<string | null | undefined>(
    tooth?.notes
  );
  const [wasOpen, setWasOpen] = useState(false);

  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      // Reset drafts to the underlying tooth when the modal opens.
      setStatusDraft(tooth?.status ?? "healthy");
      setNotesDraft(tooth?.notes ?? "");
      setPrevStatus(tooth?.status);
      setPrevNotes(tooth?.notes);
    }
  } else if (tooth?.status !== prevStatus || tooth?.notes !== prevNotes) {
    // Underlying tooth data changed while open — resync.
    setPrevStatus(tooth?.status);
    setPrevNotes(tooth?.notes);
    setStatusDraft(tooth?.status ?? "healthy");
    setNotesDraft(tooth?.notes ?? "");
  }

  // Add-treatment form. patientId/toothNumber are hidden fixed values.
  const treatmentForm = useForm<TreatmentFormInput, any, TreatmentFormOutput>({
    resolver: zodResolver(treatmentFormSchema),
    defaultValues: {
      patientId,
      toothNumber: toothNumber ?? 1,
      procedure: "",
      notes: "",
      cost: 0,
      followUpDate: null,
    },
  });

  useEffect(() => {
    if (open) {
      treatmentForm.reset({
        patientId,
        toothNumber: toothNumber ?? 1,
        procedure: "",
        notes: "",
        cost: 0,
        followUpDate: null,
      });
    }
  }, [open, patientId, toothNumber, treatmentForm]);

  async function onSaveStatus() {
    if (toothNumber == null) return;
    try {
      await updateTooth.mutateAsync({
        patientId,
        toothNumber,
        data: {
          status: statusDraft,
          notes: notesDraft.trim() ? notesDraft : null,
        },
      });
      toast.success(`Tooth #${toothNumber} updated`);
    } catch (err) {
      toastError(err, "Failed to update tooth");
    }
  }

  async function onAddTreatment(values: TreatmentFormOutput) {
    try {
      await createTreatment.mutateAsync({
        patientId,
        toothNumber: toothNumber ?? 1,
        procedure: values.procedure,
        notes: values.notes ?? "",
        cost: values.cost,
        followUpDate: values.followUpDate ?? null,
      });
      toast.success("Treatment recorded");
      treatmentForm.reset({
        patientId,
        toothNumber: toothNumber ?? 1,
        procedure: "",
        notes: "",
        cost: 0,
        followUpDate: null,
      });
    } catch (err) {
      toastError(err, "Failed to record treatment");
    }
  }

  const statusMeta = tooth
    ? TOOTH_STATUS_META[tooth.status]
    : TOOTH_STATUS_META.healthy;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-[90vw] overflow-y-auto sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">
            <span>Tooth #{toothNumber ?? "—"}</span>
            <Badge
              className={cn("text-white", statusMeta.color)}
              variant="default"
            >
              {statusMeta.label}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            {tooth?.lastTreatment
              ? `Last treatment: ${tooth.lastTreatment}${
                  tooth.lastTreatmentDate
                    ? ` • ${formatDate(tooth.lastTreatmentDate)}`
                    : ""
                }`
              : "No procedures recorded for this tooth yet."}
            {tooth?.notes ? (
              <span className="mt-1 block text-foreground">
                Notes: {tooth.notes}
              </span>
            ) : null}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Read-only banner — cashier only */}
          {isCashier && (
            <div className="flex items-start gap-2.5 rounded-md border border-amber-200/70 bg-amber-50/70 px-3 py-2 text-xs text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300">
              <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>
                Read-only — clinical edits restricted to dentists.
              </span>
            </div>
          )}

          {/* Status editor — dentist only */}
          {isDentist && toothNumber != null && (
            <div className="space-y-3 rounded-md border p-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold">Update Status</h4>
                <span className="text-xs text-muted-foreground">
                  Dentist only
                </span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label
                    htmlFor="tooth-status-select"
                    className="text-xs font-medium text-muted-foreground"
                  >
                    Status
                  </label>
                  <Select
                    value={statusDraft}
                    onValueChange={(v) => setStatusDraft(v as ToothStatus)}
                  >
                    <SelectTrigger id="tooth-status-select" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TOOTH_STATUS_VALUES.map((s) => (
                        <SelectItem key={s} value={s}>
                          <span className="flex items-center gap-2">
                            <span
                              className={cn(
                                "h-2.5 w-2.5 rounded-full",
                                TOOTH_STATUS_META[s].color
                              )}
                            />
                            {TOOTH_STATUS_META[s].label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label
                    htmlFor="tooth-notes-textarea"
                    className="text-xs font-medium text-muted-foreground"
                  >
                    Clinical notes
                  </label>
                  <Textarea
                    id="tooth-notes-textarea"
                    value={notesDraft}
                    onChange={(e) => setNotesDraft(e.target.value)}
                    placeholder="Add clinical notes…"
                    className="min-h-[60px]"
                  />
                </div>
              </div>
              <Button
                size="sm"
                onClick={onSaveStatus}
                disabled={updateTooth.isPending}
              >
                {updateTooth.isPending ? "Saving…" : "Save Status"}
              </Button>
            </div>
          )}

          {/* Treatment timeline */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold">Treatment Timeline</h4>
            {toothTreatmentsQuery.isLoading ? (
              <LoadingSpinner size="sm" />
            ) : treatments.length === 0 ? (
              <p className="rounded-md border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
                No treatments recorded for this tooth yet.
              </p>
            ) : (
              <ul className="space-y-2">
                {treatments.map((t) => (
                  <li
                    key={t.id}
                    className="rounded-md border p-3 text-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium">{t.procedure}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {formatDate(t.date)} • {t.dentistName}
                        </p>
                        {t.notes ? (
                          <p className="mt-1 text-xs text-muted-foreground">
                            {t.notes}
                          </p>
                        ) : null}
                        {t.followUpDate ? (
                          <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                            Follow-up: {formatDate(t.followUpDate)}
                          </p>
                        ) : null}
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <span className="font-semibold">
                          {formatCurrency(t.cost)}
                        </span>
                        <Badge
                          variant={t.paid ? "default" : "outline"}
                          className={
                            t.paid
                              ? "bg-emerald-600 text-white hover:bg-emerald-600"
                              : "text-amber-700 dark:text-amber-400"
                          }
                        >
                          {t.paid ? "Paid" : "Unpaid"}
                        </Badge>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Add treatment — dentist only */}
          {isDentist && toothNumber != null && (
            <div className="space-y-3 rounded-md border p-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold">Add Treatment</h4>
                <span className="text-xs text-muted-foreground">
                  Auto-marks tooth as “Treated”
                </span>
              </div>
              <Form {...treatmentForm}>
                <form
                  onSubmit={treatmentForm.handleSubmit(onAddTreatment)}
                  className="space-y-3"
                >
                  <FormField
                    control={treatmentForm.control}
                    name="procedure"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Procedure</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g. Filling, Extraction, Root canal…"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <FormField
                      control={treatmentForm.control}
                      name="cost"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Cost (₱)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              {...field}
                              value={
                                typeof field.value === "number"
                                  ? field.value
                                  : 0
                              }
                              onChange={(e) =>
                                field.onChange(
                                  e.target.value === ""
                                    ? 0
                                    : parseFloat(e.target.value)
                                )
                              }
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={treatmentForm.control}
                      name="followUpDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Follow-up (optional)</FormLabel>
                          <FormControl>
                            <Input
                              type="date"
                              value={field.value ?? ""}
                              onChange={(e) =>
                                field.onChange(e.target.value || null)
                              }
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={treatmentForm.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes (optional)</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Clinical notes about this procedure…"
                            className="min-h-[70px]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="submit"
                    disabled={createTreatment.isPending}
                    className="w-full sm:w-auto"
                  >
                    <Plus className="h-4 w-4" />
                    {createTreatment.isPending
                      ? "Recording…"
                      : "Record Treatment"}
                  </Button>
                </form>
              </Form>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Treatment history table
// ---------------------------------------------------------------------------

function TreatmentHistory({
  treatments,
  isLoading,
}: {
  treatments: Treatment[];
  isLoading: boolean;
}) {
  const sorted = useMemo(
    () =>
      [...treatments].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      ),
    [treatments]
  );

  if (isLoading) {
    return <LoadingSpinner size="sm" />;
  }

  if (sorted.length === 0) {
    return (
      <p className="rounded-md border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
        No treatments recorded yet.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs xs:text-sm">
        <thead>
          <tr className="border-b text-left text-xs text-muted-foreground">
            <th className="py-2 pr-3 font-medium">Tooth</th>
            <th className="py-2 pr-3 font-medium">Procedure</th>
            <th className="py-2 pr-3 font-medium">Date</th>
            <th className="py-2 pr-3 font-medium">Dentist</th>
            <th className="py-2 pr-3 text-right font-medium">Cost</th>
            <th className="py-2 pl-3 text-right font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((t) => (
            <tr
              key={t.id}
              className="border-b last:border-0 hover:bg-muted/40"
            >
              <td className="py-2 pr-3">
                <Badge variant="outline">#{t.toothNumber}</Badge>
              </td>
              <td className="py-2 pr-3 font-medium">{t.procedure}</td>
              <td className="py-2 pr-3 text-muted-foreground">
                {formatDate(t.date)}
              </td>
              <td className="py-2 pr-3 text-muted-foreground">
                {t.dentistName}
              </td>
              <td className="py-2 pr-3 text-right font-medium">
                {formatCurrency(t.cost)}
              </td>
              <td className="py-2 pl-3 text-right">
                <Badge
                  variant={t.paid ? "default" : "outline"}
                  className={
                    t.paid
                      ? "bg-emerald-600 text-white hover:bg-emerald-600"
                      : "text-amber-700 dark:text-amber-400"
                  }
                >
                  {t.paid ? "Paid" : "Unpaid"}
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Patient profile (main view)
// ---------------------------------------------------------------------------

export default function PatientProfileView() {
  const params = useNav((s) => s.params);
  const navigate = useNav((s) => s.navigate);
  const isDentist = useIsDentist();
  const canManage = useIsStaff();
  const patientId = params.id ?? null;

  const patientQuery = usePatient(patientId);
  const teethQuery = useTeeth(patientId);
  const treatmentsQuery = useTreatments(patientId);

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [modalTooth, setModalTooth] = useState<number | null>(null);

  const deletePatient = useDeletePatient();

  if (!patientId) {
    return (
      <EmptyState
        title="No patient selected"
        message="Pick a patient from the list to view their profile and dental chart."
        action={
          <Button onClick={() => navigate("patients")}>
            <ArrowLeft className="h-4 w-4" />
            Back to Patients
          </Button>
        }
      />
    );
  }

  if (patientQuery.isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-72 w-full rounded-xl" />
      </div>
    );
  }

  if (patientQuery.isError || !patientQuery.data) {
    return (
      <EmptyState
        title="Patient not found"
        message="This patient record may have been deleted or you don't have access."
        action={
          <Button onClick={() => navigate("patients")}>
            <ArrowLeft className="h-4 w-4" />
            Back to Patients
          </Button>
        }
      />
    );
  }

  const patient = patientQuery.data;
  const teeth = teethQuery.data ?? [];
  const treatments = treatmentsQuery.data ?? [];

  async function onConfirmDelete() {
    if (!patientId) return;
    try {
      await deletePatient.mutateAsync(patientId);
      toast.success("Patient deleted");
      navigate("patients");
    } catch (err) {
      toastError(err, "Failed to delete patient");
      // Re-throw so ConfirmDialog keeps the dialog open for retry.
      throw err;
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 2xl:max-w-[1400px]">
      {/* Back button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate("patients")}
        className="-ml-2 text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Patients
      </Button>

      {/* Patient info */}
      <Card>
        <CardHeader className="flex-row items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <Avatar className="h-14 w-14 shrink-0">
              <AvatarFallback className="bg-primary/10 text-base font-semibold text-primary">
                {getInitials(patient.name) || "?"}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <CardTitle className="text-xl">{patient.name}</CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">
                Patient since {formatDate(patient.createdAt)}
              </p>
            </div>
          </div>
          {canManage && (
            <div className="flex shrink-0 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditOpen(true)}
              >
                <Pencil className="h-4 w-4" />
                Edit
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeleteOpen(true)}
                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Contact
              </p>
              <p className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground" />
                {patient.phone}
              </p>
              <p className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="truncate">{patient.email}</span>
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Demographics
              </p>
              <p className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                Born {formatDate(patient.dateOfBirth)}
              </p>
              {patient.address ? (
                <p className="flex items-start gap-2 text-sm">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <span>{patient.address}</span>
                </p>
              ) : null}
            </div>
            {patient.notes ? (
              <div className="space-y-1 sm:col-span-2 lg:col-span-1">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Notes
                </p>
                <p className="flex items-start gap-2 text-sm">
                  <StickyNote className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <span>{patient.notes}</span>
                </p>
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {/* Dental chart */}
      <Card>
        <CardHeader>
          <CardTitle>Dental Chart</CardTitle>
          <p className="text-sm text-muted-foreground">
            {isDentist
              ? "Click any tooth to view its timeline or update its status."
              : "Click any tooth to view its treatment timeline."}
          </p>
        </CardHeader>
        <CardContent>
          {teethQuery.isLoading ? (
            <LoadingSpinner text="Loading dental chart…" />
          ) : teethQuery.isError ? (
            <EmptyState
              title="Could not load dental chart"
              message="Please try again later."
            />
          ) : (
            <div className="mx-auto max-w-[400px] xs:max-w-[480px] sm:max-w-[520px]">
              <OralCavityChart
                teeth={teeth}
                onSelectTooth={(n) => setModalTooth(n)}
                selectedTooth={modalTooth}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Treatment history */}
      <Card>
        <CardHeader>
          <CardTitle>Treatment History</CardTitle>
          <p className="text-sm text-muted-foreground">
            All procedures for this patient, newest first.
          </p>
        </CardHeader>
        <CardContent>
          <TreatmentHistory
            treatments={treatments}
            isLoading={treatmentsQuery.isLoading}
          />
        </CardContent>
      </Card>

      {/* Dialogs */}
      <EditPatientDialog
        patient={patient}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete patient?"
        message={`This will permanently remove ${patient.name} and all related teeth, treatments, and appointments. This cannot be undone.`}
        confirmLabel="Delete patient"
        destructive
        onConfirm={onConfirmDelete}
      />
      <ToothModal
        patientId={patientId}
        toothNumber={modalTooth}
        open={modalTooth !== null}
        onOpenChange={(v) => {
          if (!v) setModalTooth(null);
        }}
      />
    </div>
  );
}
