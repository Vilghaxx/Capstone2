"use client";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { useIsDentist, useIsStaff } from "@/lib/auth-store";
import { useNav } from "@/lib/nav";
import { useDeletePatient, usePatient, useTeeth, useTreatments, } from "@/hooks";
import { toastError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { EmptyState } from "@/components/common/EmptyState";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { OralCavityChart } from "@/components/common/OralCavityChart";
import { PatientInfoCard } from "@/components/views/patient-profile/PatientInfoCard";
import { NotesDialog } from "@/components/views/patient-profile/EditPatientDialog";
import { ToothModal } from "@/components/views/patient-profile/ToothModal";
import { TreatmentHistoryTable } from "@/components/views/patient-profile/TreatmentHistoryTable";
/** Patient profile view — composes the info card, dental chart, treatment history, and edit/delete/tooth dialogs. */
export default function PatientProfileView() {
    var _a, _b, _c;
    const params = useNav((s) => s.params);
    const navigate = useNav((s) => s.navigate);
    const isDentist = useIsDentist();
    const canManage = useIsStaff();
    const patientId = (_a = params.id) !== null && _a !== void 0 ? _a : null;
    const patientQuery = usePatient(patientId);
    const teethQuery = useTeeth(patientId);
    const treatmentsQuery = useTreatments(patientId);
    const [isNotesDialogOpen, setIsNotesDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [selectedToothNumber, setSelectedToothNumber] = useState(null);
    const deletePatient = useDeletePatient();
    if (!patientId) {
        return (<EmptyState title="No patient selected" message="Pick a patient from the list to view their profile and dental chart." action={<Button onClick={() => navigate("patients")}>
            <ArrowLeft className="h-4 w-4"/>
            Back to Patients
          </Button>}/>);
    }
    if (patientQuery.isLoading) {
        return (<div className="space-y-6">
        <Skeleton className="h-9 w-40"/>
        <Skeleton className="h-32 w-full rounded-xl"/>
        <Skeleton className="h-72 w-full rounded-xl"/>
      </div>);
    }
    if (patientQuery.isError || !patientQuery.data) {
        return (<EmptyState title="Patient not found" message="This patient record may have been deleted or you don't have access." action={<Button onClick={() => navigate("patients")}>
            <ArrowLeft className="h-4 w-4"/>
            Back to Patients
          </Button>}/>);
    }
    const patient = patientQuery.data;
    const teeth = (_b = teethQuery.data) !== null && _b !== void 0 ? _b : [];
    const treatments = (_c = treatmentsQuery.data) !== null && _c !== void 0 ? _c : [];
    async function onConfirmDelete() {
        if (!patientId)
            return;
        try {
            await deletePatient.mutateAsync(patientId);
            toast.success("Patient deleted");
            navigate("patients");
        }
        catch (err) {
            toastError(err, "Failed to delete patient");
            // Re-throw so ConfirmDialog keeps the dialog open for retry.
            throw err;
        }
    }
    return (<div className="mx-auto max-w-7xl space-y-6 2xl:max-w-[1400px]">
      {/* Back button */}
      <Button variant="ghost" size="sm" onClick={() => navigate("patients")} className="-ml-2 text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4"/>
        Back to Patients
      </Button>

      {/* Patient info */}
      <PatientInfoCard patient={patient} canManage={canManage} onNotes={() => setIsNotesDialogOpen(true)} onDelete={() => setIsDeleteDialogOpen(true)}/>

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
          {teethQuery.isLoading ? (<LoadingSpinner text="Loading dental chart…"/>) : teethQuery.isError ? (<EmptyState title="Could not load dental chart" message="Please try again later."/>) : (<div className="mx-auto max-w-[400px] xs:max-w-[480px] sm:max-w-[520px]">
              <OralCavityChart teeth={teeth} onSelectTooth={setSelectedToothNumber} selectedTooth={selectedToothNumber}/>
            </div>)}
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
          <TreatmentHistoryTable treatments={treatments} isLoading={treatmentsQuery.isLoading}/>
        </CardContent>
      </Card>

      {/* Dialogs */}
      <NotesDialog patient={patient} open={isNotesDialogOpen} onOpenChange={setIsNotesDialogOpen}/>
      <ConfirmDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen} title="Delete patient?" message={`This will permanently remove ${patient.name} and all related teeth, treatments, and appointments. This cannot be undone.`} confirmLabel="Delete patient" destructive onConfirm={onConfirmDelete}/>
      <ToothModal patientId={patientId} toothNumber={selectedToothNumber} open={selectedToothNumber !== null} onOpenChange={(open) => {
            if (!open)
                setSelectedToothNumber(null);
        }}/>
    </div>);
}
