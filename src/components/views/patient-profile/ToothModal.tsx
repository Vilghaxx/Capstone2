"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Lock, Plus } from "lucide-react";
import { toast } from "sonner";

import { useIsCashier, useIsDentist } from "@/lib/auth-store";
import {
  useCreateTreatment,
  useTeeth,
  useToothTreatments,
  useUpdateTooth,
} from "@/hooks";
import { treatmentFormSchema } from "@/lib/schemas/treatment-schema";
import {
  formatCurrency,
  formatDate,
  TOOTH_STATUS_META,
  TOOTH_STATUSES,
} from "@/lib/format";
import { toastError } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { ToothStatus } from "@/lib/types";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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

type TreatmentFormInput = z.input<typeof treatmentFormSchema>;
type TreatmentFormOutput = z.output<typeof treatmentFormSchema>;

/** All possible tooth statuses, derived from the shared TOOTH_STATUSES map. */
const ALL_TOOTH_STATUSES = Object.values(TOOTH_STATUSES) as ToothStatus[];

/**
 * Per-tooth modal opened from the dental chart. Combines three sections:
 *   1. A read-only banner for cashiers (clinical edits are dentist-only).
 *   2. A status + notes editor (dentist only) backed by `useUpdateTooth`.
 *   3. The tooth's treatment timeline (everyone).
 *   4. An "Add Treatment" form (dentist only) backed by `useCreateTreatment`.
 *
 * Draft state for the status editor uses the "previous value" sync pattern so
 * it resets when the underlying tooth data changes or the dialog re-opens,
 * without needing a setState inside an effect.
 */
export function ToothModal({
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
  const addTreatmentForm = useForm<TreatmentFormInput, any, TreatmentFormOutput>({
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
      addTreatmentForm.reset({
        patientId,
        toothNumber: toothNumber ?? 1,
        procedure: "",
        notes: "",
        cost: 0,
        followUpDate: null,
      });
    }
  }, [open, patientId, toothNumber, addTreatmentForm]);

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
      addTreatmentForm.reset({
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

  const statusDisplayInfo = tooth
    ? TOOTH_STATUS_META[tooth.status]
    : TOOTH_STATUS_META.healthy;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-[90vw] overflow-y-auto sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">
            <span>Tooth #{toothNumber ?? "—"}</span>
            <Badge
              className={cn("text-white", statusDisplayInfo.color)}
              variant="default"
            >
              {statusDisplayInfo.label}
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
                    onValueChange={(value) => setStatusDraft(value as ToothStatus)}
                  >
                    <SelectTrigger id="tooth-status-select" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ALL_TOOTH_STATUSES.map((status) => (
                        <SelectItem key={status} value={status}>
                          <span className="flex items-center gap-2">
                            <span
                              className={cn(
                                "h-2.5 w-2.5 rounded-full",
                                TOOTH_STATUS_META[status].color
                              )}
                            />
                            {TOOTH_STATUS_META[status].label}
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
                {treatments.map((treatment) => (
                  <li
                    key={treatment.id}
                    className="rounded-md border p-3 text-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium">{treatment.procedure}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {formatDate(treatment.date)} • {treatment.dentistName}
                        </p>
                        {treatment.notes ? (
                          <p className="mt-1 text-xs text-muted-foreground">
                            {treatment.notes}
                          </p>
                        ) : null}
                        {treatment.followUpDate ? (
                          <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                            Follow-up: {formatDate(treatment.followUpDate)}
                          </p>
                        ) : null}
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <span className="font-semibold">
                          {formatCurrency(treatment.cost)}
                        </span>
                        <Badge
                          variant={treatment.paid ? "default" : "outline"}
                          className={
                            treatment.paid
                              ? "bg-emerald-600 text-white hover:bg-emerald-600"
                              : "text-amber-700 dark:text-amber-400"
                          }
                        >
                          {treatment.paid ? "Paid" : "Unpaid"}
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
              <Form {...addTreatmentForm}>
                <form
                  onSubmit={addTreatmentForm.handleSubmit(onAddTreatment)}
                  className="space-y-3"
                >
                  <FormField
                    control={addTreatmentForm.control}
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
                      control={addTreatmentForm.control}
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
                      control={addTreatmentForm.control}
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
                    control={addTreatmentForm.control}
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
