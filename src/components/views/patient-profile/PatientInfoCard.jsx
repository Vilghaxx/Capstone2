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
/** Read a file as a base64 data URL. */
function readFileDataUrl(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(reader.error ?? new Error("Could not read file"));
        reader.readAsDataURL(file);
    });
}
const XRAY_LIMIT = 10;
/**
 * Header card for the patient profile view. Shows the patient's avatar,
 * name, "patient since" date, contact details, demographics, notes, and up
 * to {@link XRAY_LIMIT} patient-level X-rays. Attach/remove X-ray is
 * dentist-only and saved immediately.
 */
export function PatientInfoCard({ patient, canManage, isDentist, onNotes, onDelete, }) {
    const saveXray = useSavePatientXray();
    const fileInputRef = useRef(null);
    const [lightboxIndex, setLightboxIndex] = useState(null);
    // Legacy patients hold a single image on `xrayUrl`; it shows as one attachment.
    // (Object form is a guard for RTDB occasionally object-encoding arrays.)
    const xrays = Array.isArray(patient.xrays)
        ? patient.xrays.filter(Boolean)
        : patient.xrays
            ? Object.values(patient.xrays).filter(Boolean)
            : patient.xrayUrl
                ? [patient.xrayUrl]
                : [];
    async function handleFiles(e) {
        const files = Array.from(e.target.files ?? []);
        e.target.value = "";
        if (files.length === 0)
            return;
        const slots = XRAY_LIMIT - xrays.length;
        if (slots <= 0) {
            toast.error(`X-ray attachments are limited to ${XRAY_LIMIT} images.`);
            return;
        }
        let added = 0;
        for (const file of files.slice(0, slots)) {
            if (file.size > 3_000_000) {
                toast.error(`${file.name} must be under 3MB.`);
                continue;
            }
            try {
                const dataUrl = await readFileDataUrl(file);
                await saveXray.mutateAsync({
                    id: patient.id,
                    data: { xrayData: dataUrl },
                });
                added++;
            }
            catch (err) {
                toastError(err, `Failed to save ${file.name}`);
            }
        }
        if (added > 0)
            toast.success(added === 1 ? "X-ray saved" : `${added} X-rays saved`);
        if (files.length > slots) {
            toast.error(`Only ${slots} more X-ray image${slots === 1 ? "" : "s"} could be added.`);
        }
    }
    async function handleRemoveXray(index) {
        try {
            await saveXray.mutateAsync({ id: patient.id, data: { removeXrayIndex: index } });
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
              <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleFiles} className="hidden"/>
              <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={saveXray.isPending || xrays.length >= XRAY_LIMIT}>
                <Upload className="h-4 w-4"/>
                Attach X-ray
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
            X-Ray{xrays.length > 0 && ` (${xrays.length}/${XRAY_LIMIT})`}
          </p>
          {xrays.length > 0 ? (<div className="flex flex-wrap gap-3">
              {xrays.map((url, index) => (<div key={index} className="relative inline-block">
                  <img src={url} alt={`X-ray ${index + 1} of ${patient.name}`} onClick={() => setLightboxIndex(index)} className="max-h-48 cursor-zoom-in rounded-lg border border-border object-contain transition-opacity hover:opacity-90"/>
                  {isDentist && (<button type="button" onClick={() => handleRemoveXray(index)} disabled={saveXray.isPending} className="absolute -right-2 -top-2 rounded-full bg-destructive p-1 text-destructive-foreground" aria-label={`Remove X-ray ${index + 1}`}>
                      <X className="h-3 w-3"/>
                    </button>)}
                </div>))}
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
      <Dialog open={lightboxIndex !== null} onOpenChange={(open) => {
            if (!open)
                setLightboxIndex(null);
        }}>
        {lightboxIndex !== null && (<DialogContent className="max-w-[90vw] sm:max-w-[700px]">
            <DialogTitle>
              X-Ray {lightboxIndex + 1} of {xrays.length} — {patient.name}
            </DialogTitle>
            <img src={xrays[lightboxIndex]} alt={`X-ray ${lightboxIndex + 1} of ${patient.name}`} className="w-full rounded-lg object-contain"/>
          </DialogContent>)}
      </Dialog>
    </Card>);
}
