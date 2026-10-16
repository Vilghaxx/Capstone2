"use client";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Calendar, ImageIcon, Mail, MapPin, Phone, StickyNote, Trash2, Upload, X } from "lucide-react";
import { formatDate } from "@/lib/format";
import { useSavePatientXray } from "@/hooks";
import { toastError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
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
 * name, "patient since" date, contact details, demographics, notes, and a
 * single patient-level X-ray. Attach/replace/remove X-ray is dentist-only
 * and saved immediately.
 */
export function PatientInfoCard({ patient, canManage, isDentist, onNotes, onDelete, }) {
    const saveXray = useSavePatientXray();
    const fileInputRef = useRef(null);
    const [lightboxOpen, setLightboxOpen] = useState(false);
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
            try {
                await saveXray.mutateAsync({
                    id: patient.id,
                    data: { xrayData: reader.result },
                });
                toast.success("X-ray saved");
            }
            catch (err) {
                toastError(err, "Failed to save X-ray");
            }
        };
        reader.readAsDataURL(file);
    }
    async function handleRemoveXray() {
        try {
            await saveXray.mutateAsync({ id: patient.id, data: { removeXray: true } });
            toast.success("X-ray removed");
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
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
          {canManage && (<Button variant="outline" size="sm" onClick={onNotes}>
              <StickyNote className="h-4 w-4"/>
              Progress Notes
            </Button>)}
          {isDentist && (<>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden"/>
              <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={saveXray.isPending}>
                <Upload className="h-4 w-4"/>
                {patient.xrayUrl ? "Replace X-ray" : "Attach X-ray"}
              </Button>
            </>)}
        </div>
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

        {/* X-Ray */}
        <div className="mt-4 space-y-2 border-t border-border pt-4">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            X-Ray
          </p>
          {patient.xrayUrl ? (<div className="relative inline-block">
              <img src={patient.xrayUrl} alt={`X-ray of ${patient.name}`} onClick={() => setLightboxOpen(true)} className="max-h-48 cursor-zoom-in rounded-lg border border-border object-contain transition-opacity hover:opacity-90"/>
              {isDentist && (<button type="button" onClick={handleRemoveXray} disabled={saveXray.isPending} className="absolute -right-2 -top-2 rounded-full bg-destructive p-1 text-destructive-foreground" aria-label="Remove X-ray">
                  <X className="h-3 w-3"/>
                </button>)}
            </div>) : (<div className="flex items-center gap-2 text-sm text-muted-foreground">
              <ImageIcon className="h-4 w-4" aria-hidden="true"/>
              <span>No X-ray attached.</span>
            </div>)}
        </div>

        {canManage && (<div className="mt-4 flex justify-end">
            <Button variant="outline" size="sm" onClick={onDelete} className="text-destructive hover:bg-destructive/10 hover:text-destructive">
              <Trash2 className="h-4 w-4"/>
              Delete Patient
            </Button>
          </div>)}
      </CardContent>
      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent className="max-w-[90vw] sm:max-w-[700px]">
          <DialogTitle>X-Ray — {patient.name}</DialogTitle>
          <img src={patient.xrayUrl} alt={`X-ray of ${patient.name}`} className="w-full rounded-lg object-contain"/>
        </DialogContent>
      </Dialog>
    </Card>);
}
