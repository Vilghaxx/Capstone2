"use client";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ClipboardList, Save, Upload, X, ImageIcon } from "lucide-react";
import { useIsDentist } from "@/lib/auth-store";
import { useTeeth, useUpdateTooth } from "@/hooks";
import { toastError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
const TOOTH_OPTIONS = Array.from({ length: 32 }, (_, i) => ({
    value: String(i + 1),
    label: `Tooth #${i + 1}`,
}));
export function TreatmentPlan({ patientId }) {
    const isDentist = useIsDentist();
    const { data: teeth } = useTeeth(patientId);
    const updateTooth = useUpdateTooth();
    const fileInputRef = useRef(null);
    const [selectedTooth, setSelectedTooth] = useState("");
    const [planText, setPlanText] = useState("");
    const [xrayPreview, setXrayPreview] = useState(null);
    const [xrayData, setXrayData] = useState(null);
    const [xrayFilename, setXrayFilename] = useState(null);
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const tooth = (teeth ?? []).find((t) => String(t.toothNumber) === selectedTooth);
    useEffect(() => {
        setPlanText(tooth?.treatmentPlan ?? "");
        setXrayPreview(tooth?.xrayUrl ?? null);
        setXrayData(null);
        setXrayFilename(null);
    }, [selectedTooth, tooth]);
    function handleFileChange(e) {
        const file = e.target.files?.[0];
        if (!file)
            return;
        if (file.size > 3_000_000) {
            toast.error("Image must be under 3MB.");
            return;
        }
        const reader = new FileReader();
        reader.onload = () => {
            setXrayData(reader.result);
            setXrayPreview(reader.result);
            setXrayFilename(file.name);
        };
        reader.readAsDataURL(file);
    }
    function handleRemoveXray() {
        setXrayData(null);
        setXrayFilename(null);
        setXrayPreview(null);
        if (fileInputRef.current)
            fileInputRef.current.value = "";
    }
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
                    ...(xrayData && { xrayData, xrayFilename }),
                },
            });
            toast.success(`Treatment plan saved for Tooth #${selectedTooth}`);
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
            ? "Select a tooth, write the treatment plan, and attach an X-ray."
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
              {TOOTH_OPTIONS.map((opt) => (<SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>))}
            </SelectContent>
          </Select>
        </div>
        {isDentist && (<Button onClick={handleSave} disabled={!selectedTooth || updateTooth.isPending} className="sm:mb-0">
            <Save className="h-4 w-4"/>
            {updateTooth.isPending ? "Saving…" : "Save Plan"}
          </Button>)}
      </div>
      {selectedTooth && (<div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="tp-plan">Treatment Plan — Tooth #{selectedTooth}</Label>
            <Textarea id="tp-plan" placeholder={isDentist
            ? "Describe the proposed treatment for this tooth…"
            : "No treatment plan written yet."} rows={5} value={planText} onChange={(e) => setPlanText(e.target.value)} readOnly={!isDentist}/>
            {isDentist && (<p className="text-xs text-muted-foreground">Max 2000 characters.</p>)}
          </div>
          <div className="space-y-1.5">
            <Label>X-Ray — Tooth #{selectedTooth}</Label>
            {isDentist && (<input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden"/>)}
            {xrayPreview ? (<div className="relative inline-block">
                <img src={xrayPreview} alt={`X-ray of tooth ${selectedTooth}`} onClick={() => setLightboxOpen(true)} className="max-h-48 cursor-zoom-in rounded-lg border border-border object-contain transition-opacity hover:opacity-90"/>
                {isDentist && (<button type="button" onClick={handleRemoveXray} className="absolute -right-2 -top-2 rounded-full bg-destructive p-1 text-destructive-foreground" aria-label="Remove X-ray">
                    <X className="h-3 w-3"/>
                  </button>)}
              </div>) : (<div className="flex items-center gap-2 text-sm text-muted-foreground">
                <ImageIcon className="h-4 w-4" aria-hidden="true"/>
                <span>No X-ray attached.</span>
              </div>)}
            {isDentist && (<Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                <Upload className="h-4 w-4"/>
                {xrayPreview ? "Replace X-ray" : "Attach X-ray"}
              </Button>)}
          </div>
</div>)}
      </div>)}
      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent className="max-w-[90vw] sm:max-w-[700px]">
          <DialogTitle>X-Ray — Tooth #{selectedTooth}</DialogTitle>
          <img src={xrayPreview} alt={`X-ray of tooth ${selectedTooth}`} className="w-full rounded-lg object-contain"/>
        </DialogContent>
      </Dialog>
    </div>);
}
