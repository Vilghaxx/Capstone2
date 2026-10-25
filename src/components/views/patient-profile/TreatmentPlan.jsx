"use client";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ClipboardList, Save } from "lucide-react";
import { useIsDentist } from "@/lib/auth-store";
import { useTeeth, useUpdateTooth } from "@/hooks";
import { toastError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PERMANENT_TEETH, PRIMARY_TEETH, toothOptionLabel } from "@/lib/teeth";
const TOOTH_GROUPS = [
    { label: "Permanent teeth (FDI 11–48)", teeth: PERMANENT_TEETH },
    { label: "Primary teeth (FDI 51–85)", teeth: PRIMARY_TEETH },
];
export function TreatmentPlan({ patientId }) {
    const isDentist = useIsDentist();
    const { data: teeth } = useTeeth(patientId);
    const updateTooth = useUpdateTooth();
    const [selectedTooth, setSelectedTooth] = useState("");
    const [planText, setPlanText] = useState("");
    const tooth = (teeth ?? []).find((t) => String(t.toothNumber) === selectedTooth);
    useEffect(() => {
        setPlanText(tooth?.treatmentPlan ?? "");
    }, [selectedTooth, tooth]);
    async function handleSave() {
        if (!selectedTooth) {
            toast.error("Select a tooth first.");
            return;
        }
        try {
            await updateTooth.mutateAsync({
                patientId,
                toothNumber: Number(selectedTooth),
                data: {
                    status: tooth?.status ?? "healthy",
                    notes: tooth?.notes ?? null,
                    treatmentPlan: planText || null,
                },
            });
            toast.success(`Treatment plan saved for Tooth ${selectedTooth}`);
        }
        catch (err) {
            toastError(err, "Failed to save treatment plan");
        }
    }
    return (<div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <ClipboardList className="h-4 w-4" aria-hidden="true"/>
        <span>
          {isDentist
            ? "Select a tooth and write the treatment plan."
            : "View the dentist's treatment plan per tooth."}
        </span>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="w-full sm:w-48">
          <Label htmlFor="tp-tooth">Tooth</Label>
          <Select value={selectedTooth} onValueChange={setSelectedTooth}>
            <SelectTrigger id="tp-tooth" className="mt-1.5 w-full">
              <SelectValue placeholder="Select a tooth"/>
            </SelectTrigger>
            <SelectContent>
              {TOOTH_GROUPS.map((group) => (<SelectGroup key={group.label}>
                  <SelectLabel>{group.label}</SelectLabel>
                  {group.teeth.map((toothNumber) => (<SelectItem key={toothNumber} value={String(toothNumber)}>
                      {toothOptionLabel(toothNumber)}
                    </SelectItem>))}
                </SelectGroup>))}
            </SelectContent>
          </Select>
        </div>
        {isDentist && (<Button onClick={handleSave} disabled={!selectedTooth || updateTooth.isPending} className="sm:mb-0">
            <Save className="h-4 w-4"/>
            {updateTooth.isPending ? "Saving…" : "Save Plan"}
          </Button>)}
      </div>
      {selectedTooth && (<div className="space-y-1.5">
          <Label htmlFor="tp-plan">Treatment Plan — Tooth {selectedTooth}</Label>
          <Textarea id="tp-plan" placeholder={isDentist
            ? "Describe the proposed treatment for this tooth…"
            : "No treatment plan written yet."} rows={5} value={planText} onChange={(e) => setPlanText(e.target.value)} readOnly={!isDentist}/>
          {isDentist && (<p className="text-xs text-muted-foreground">Max 2000 characters.</p>)}
        </div>)}
    </div>);
}
