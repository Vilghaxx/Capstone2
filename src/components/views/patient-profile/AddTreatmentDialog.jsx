"use client";
import { useState } from "react";
import { toast } from "sonner";
import { useCreateTreatment } from "@/hooks";
import { toastError } from "@/lib/api";
import { PERMANENT_TEETH, PRIMARY_TEETH, toothOptionLabel } from "@/lib/teeth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, } from "@/components/ui/dialog";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue, } from "@/components/ui/select";
const FULL_MOUTH = "full-mouth";
const TOOTH_GROUPS = [
    { label: "Permanent teeth (FDI 11–48)", teeth: PERMANENT_TEETH },
    { label: "Primary teeth (FDI 51–85)", teeth: PRIMARY_TEETH },
];
/**
 * Records one treatment. "Full mouth" stores `toothNumber: null`, so procedures
 * like cleaning never overwrite per-tooth statuses.
 */
export function AddTreatmentDialog({ patientId, open, onOpenChange }) {
    const createTreatment = useCreateTreatment();
    const [tooth, setTooth] = useState(FULL_MOUTH);
    const [procedure, setProcedure] = useState("");
    const [cost, setCost] = useState("");
    const [notes, setNotes] = useState("");
    function reset() {
        setTooth(FULL_MOUTH);
        setProcedure("");
        setCost("");
        setNotes("");
    }
    async function onSubmit(event) {
        event.preventDefault();
        if (procedure.trim().length < 2) {
            toast.error("Procedure is required");
            return;
        }
        const amount = Number(cost);
        if (!Number.isFinite(amount) || amount < 0) {
            toast.error("Enter a valid cost");
            return;
        }
        try {
            await createTreatment.mutateAsync({
                patientId,
                toothNumber: tooth === FULL_MOUTH ? null : Number(tooth),
                procedure: procedure.trim(),
                notes: notes.trim(),
                cost: amount,
                followUpDate: null,
            });
            toast.success(tooth === FULL_MOUTH ? "Full-mouth treatment recorded" : "Treatment recorded");
            reset();
            onOpenChange(false);
        }
        catch (err) {
            toastError(err, "Failed to record treatment");
        }
    }
    return (<Dialog open={open} onOpenChange={(next) => {
            if (!next)
                reset();
            onOpenChange(next);
        }}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Record treatment</DialogTitle>
          <DialogDescription>
            Choose “Full mouth” for procedures like cleaning or whitening.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="at-tooth">Tooth</Label>
            <Select value={tooth} onValueChange={setTooth}>
              <SelectTrigger id="at-tooth" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={FULL_MOUTH}>Full mouth — all teeth</SelectItem>
                {TOOTH_GROUPS.map((group) => (<SelectGroup key={group.label}>
                    <SelectLabel>{group.label}</SelectLabel>
                    {group.teeth.map((toothNumber) => (<SelectItem key={toothNumber} value={String(toothNumber)}>
                        {toothOptionLabel(toothNumber)}
                      </SelectItem>))}
                  </SelectGroup>))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="at-procedure">Procedure</Label>
            <Input id="at-procedure" value={procedure} onChange={(event) => setProcedure(event.target.value)} placeholder="e.g. Teeth Cleaning" required/>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="at-cost">Cost (₱)</Label>
            <Input id="at-cost" type="number" min="0" step="0.01" value={cost} onChange={(event) => setCost(event.target.value)} required/>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="at-notes">Notes</Label>
            <Textarea id="at-notes" rows={3} value={notes} onChange={(event) => setNotes(event.target.value)}/>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createTreatment.isPending}>
              {createTreatment.isPending ? "Saving…" : "Save treatment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>);
}
