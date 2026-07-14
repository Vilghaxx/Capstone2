"use client";

import {
  Calendar,
  Mail,
  MapPin,
  Pencil,
  Phone,
  StickyNote,
  Trash2,
} from "lucide-react";

import { formatDate } from "@/lib/format";
import type { Patient } from "@/lib/types";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

/** Build a 1-2 character initials string from a full name (e.g. "Juan Dela Cruz" → "JD"). */
function getInitials(name: string): string {
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
 * name, "patient since" date, contact details, demographics, and notes.
 * Edit + Delete actions are gated by the `canManage` flag (any staff role).
 */
export function PatientInfoCard({
  patient,
  canManage,
  onEdit,
  onDelete,
}: {
  patient: Patient;
  canManage: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
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
            <Button variant="outline" size="sm" onClick={onEdit}>
              <Pencil className="h-4 w-4" />
              Edit
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onDelete}
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
  );
}
