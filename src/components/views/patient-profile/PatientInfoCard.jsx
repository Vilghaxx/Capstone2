"use client";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Calendar, Mail, MapPin, Phone, StickyNote, Trash2, Upload, X } from "lucide-react";
import { formatDate } from "@/lib/format";
import { useUpdateTooth } from "@/hooks";
import { toastError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
const TOOTH_OPTIONS = Array.from({ length: 32 }, (_, i) => ({
    value: String(i + 1),
    label: `Tooth #${i + 1}`,
}));
/** Build a 1-2 character initials string from a full name (e.g. "Juan Dela Cruz" → "JD"). */
function getInitials(name) {
    return name
        .split(" ")
        .filter(Boolean)
        .map((part) => part[0])
        .slice(0, 2)
        .join("")
        .toUpperCase();
}
/**
 * Header card for the patient profile view. Shows the patient's avatar,
 * name, "patient since" date, contact details, demographics, notes, and
 * X-rays (attach/replace/remove is dentist-only; saved immediately).
 */
export function PatientInfoCard({ patient, canManage, isDentist, teeth = [], onNotes, onDelete, }) {
    const updateTooth = useUpdateTooth();
    const fileInputRef = useRef(null);
    const [xrayTooth, setXrayTooth] = useState("");
    const [lightbox, setLightbox] = useState(null);
    const withXray = teeth.filter((t) => t.xrayUrl);
    const selectedToothHasXray = teeth.find((t) => String(t.toothNumber) === xrayTooth)?.xrayUrl;
    function handleFileChange(e) {
        const file = e.target.files?.[0];
        e.target.value = "";
        if (!file)
            return;
        if (file.size > 3_000_000) {
            toast.error("Image must be under 3MB.");
            return;
        }
        const reader = new FileReader();
        reader.onload = async () => {
            const tooth = teeth.find((t) => String(t.toothNumber) === xrayTooth);
            try {
                await updateTooth.mutateAsync({
                    patientId: patient.id,
                    toothNumber: Number(xrayTooth),
                    data: {
                        status: tooth?.status ?? "healthy",
                        notes: tooth?.notes ?? null,
                        treatmentPlan: tooth?.treatmentPlan ?? null,
                        xrayData: reader.result,
                        xrayFilename: file.name,
                    },
                });
                toast.success(`X-ray saved for Tooth #${xrayTooth}`);
            }
            catch (err) {
                toastError(err, "Failed to save X-ray");
            }
        };
        reader.readAsDataURL(file);
    }
    async function handleRemoveXray(t) {
        try {
            await updateTooth.mutateAsync({
                patientId: patient.id,
                toothNumber: t.toothNumber,
                data: {
                    status: t.status,
                    notes: t.notes ?? null,
                    treatmentPlan: t.treatmentPlan ?? null,
                    removeXray: true,
                },
            });
            toast.success(`X-ray removed from Tooth #${t.toothNumber}`);
        }
        catch (err) {
            toastError(err, "Failed to remove X-ray");
        }
    }
    return (<Card>
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
        {canManage && (<Button variant="outline" size="sm" onClick={onNotes}>
              <StickyNote className="h-4 w-4"/>
              Progress Notes
            </Button>)}
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Contact
            </p>
            <p className="flex items-center gap-2 text-sm">
              <Phone className="h-4 w-4 text-muted-foreground"/>
              {patient.phone}
            </p>
            <p className="flex items-center gap-2 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground"/>
              <span className="truncate">{patient.email}</span>
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Demographics
            </p>
            <p className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground"/>
              Born {formatDate(patient.dateOfBirth)}
            </p>
            {patient.address ? (<p className="flex items-start gap-2 text-sm">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"/>
                <span>{patient.address}</span>
              </p>) : null}
          </div>
          {patient.notes ? (<div className="space-y-1 sm:col-span-2 lg:col-span-1">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Progress Notes
              </p>
              <p className="flex items-start gap-2 text-sm">
                <StickyNote className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"/>
                <span>{patient.notes}</span>
              </p>
            </div>) : null}
        </div>

        {/* X-Rays */}
        <div className="mt-4 space-y-2 border-t border-border pt-4">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            X-Rays
          </p>
          {withXray.length === 0 ? (<p className="text-sm text-muted-foreground">No X-rays attached.</p>) : (<div className="flex flex-wrap gap-3">
              {withXray.map((t) => (<div key={t.toothNumber} className="relative">
                  <button type="button" onClick={() => setLightbox({ url: t.xrayUrl, toothNumber: t.toothNumber })} className="block">
                    <img src={t.xrayUrl} alt={`X-ray of tooth ${t.toothNumber}`} className="h-24 w-24 cursor-zoom-in rounded-lg border border-border object-cover transition-opacity hover:opacity-90"/>
                  </button>
                  <span className="mt-0.5 block text-center text-xs text-muted-foreground">#{t.toothNumber}</span>
                  {isDentist && (<button type="button" onClick={() => handleRemoveXray(t)} disabled={updateTooth.isPending} className="absolute -right-1.5 -top-1.5 rounded-full bg-destructive p-1 text-destructive-foreground" aria-label={`Remove X-ray of tooth ${t.toothNumber}`}>
                      <X className="h-3 w-3"/>
                    </button>)}
                </div>))}
            </div>)}
          {isDentist && (<div className="flex flex-col gap-3 pt-1 sm:flex-row sm:items-end">
              <div className="w-full sm:w-48">
                <Label htmlFor="xray-tooth">Tooth</Label>
                <Select value={xrayTooth} onValueChange={setXrayTooth}>
                  <SelectTrigger id="xray-tooth" className="mt-1.5 w-full">
                    <SelectValue placeholder="Select a tooth"/>
                  </SelectTrigger>
                  <SelectContent>
                    {TOOTH_OPTIONS.map((opt) => (<SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden"/>
              <Button variant="outline" size="sm" disabled={!xrayTooth || updateTooth.isPending} onClick={() => fileInputRef.current?.click()}>
                <Upload className="h-4 w-4"/>
                {selectedToothHasXray ? "Replace X-ray" : "Attach X-ray"}
              </Button>
            </div>)}
        </div>

        {canManage && (<div className="mt-4 flex justify-end">
            <Button variant="outline" size="sm" onClick={onDelete} className="text-destructive hover:bg-destructive/10 hover:text-destructive">
              <Trash2 className="h-4 w-4"/>
              Delete Patient
            </Button>
          </div>)}
      </CardContent>
      <Dialog open={lightbox !== null} onOpenChange={(open) => {
            if (!open)
                setLightbox(null);
        }}>
        <DialogContent className="max-w-[90vw] sm:max-w-[700px]">
          <DialogTitle>X-Ray — Tooth #{lightbox?.toothNumber}</DialogTitle>
          {lightbox && (<img src={lightbox.url} alt={`X-ray of tooth ${lightbox.toothNumber}`} className="w-full rounded-lg object-contain"/>)}
        </DialogContent>
      </Dialog>
    </Card>);
}
