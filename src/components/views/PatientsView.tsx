"use client";

import { useEffect, useState } from "react";
import { useForm, type Control } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Calendar,
  ChevronRight,
  Mail,
  Phone,
  Search,
  UserPlus,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { useIsDentist } from "@/lib/auth-store";
import { useNav } from "@/lib/nav";
import {
  useCreatePatient,
  useDebounce,
  usePatients,
} from "@/hooks/queries";
import { patientFormSchema } from "@/lib/schemas/patient-schema";
import { formatDate } from "@/lib/format";
import { toastError } from "@/lib/api";
import type { Patient } from "@/lib/types";

type PatientFormInput = z.input<typeof patientFormSchema>;
type PatientFormOutput = z.output<typeof patientFormSchema>;

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { EmptyState } from "@/components/common/EmptyState";

const PAGE_SIZE = 50;

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function PatientCard({ patient }: { patient: Patient }) {
  const navigate = useNav((s) => s.navigate);
  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={() => navigate("patient-profile", { id: patient.id })}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          navigate("patient-profile", { id: patient.id });
        }
      }}
      className="cursor-pointer transition-all hover:border-primary/40 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <CardContent className="flex items-start gap-4">
        <Avatar className="h-12 w-12 shrink-0">
          <AvatarFallback className="bg-primary/10 text-sm font-semibold text-primary">
            {getInitials(patient.name) || "?"}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{patient.name}</p>
          <div className="mt-1.5 space-y-1 text-xs text-muted-foreground">
            <p className="flex items-center gap-1.5">
              <Phone className="h-3 w-3 shrink-0" />
              <span className="truncate">{patient.phone}</span>
            </p>
            <p className="flex items-center gap-1.5">
              <Mail className="h-3 w-3 shrink-0" />
              <span className="truncate">{patient.email}</span>
            </p>
            <p className="flex items-center gap-1.5">
              <Calendar className="h-3 w-3 shrink-0" />
              <span>Born {formatDate(patient.dateOfBirth)}</span>
            </p>
          </div>
        </div>
        <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
      </CardContent>
    </Card>
  );
}

function PatientCardSkeleton() {
  return (
    <Card>
      <CardContent className="flex items-start gap-4">
        <Skeleton className="h-12 w-12 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-3 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
          <Skeleton className="h-3 w-2/3" />
        </div>
      </CardContent>
    </Card>
  );
}

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
                <Input
                  type="email"
                  placeholder="juan@example.com"
                  {...field}
                />
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

interface AddPatientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function AddPatientDialog({ open, onOpenChange }: AddPatientDialogProps) {
  const createPatient = useCreatePatient();
  const form = useForm<PatientFormInput, any, PatientFormOutput>({
    resolver: zodResolver(patientFormSchema),
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      dateOfBirth: "",
      address: "",
      notes: "",
    },
  });

  // Reset the form whenever the dialog opens.
  useEffect(() => {
    if (open) form.reset();
  }, [open, form]);

  async function onSubmit(values: PatientFormOutput) {
    try {
      await createPatient.mutateAsync(values as Record<string, unknown>);
      toast.success("Patient added successfully");
      onOpenChange(false);
    } catch (err) {
      toastError(err, "Failed to add patient");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Add New Patient</DialogTitle>
          <DialogDescription>
            Create a new patient record. A default 32-tooth dental chart will
            be generated automatically.
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
                disabled={createPatient.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createPatient.isPending}>
                {createPatient.isPending ? "Adding…" : "Add Patient"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default function PatientsView() {
  const isDentist = useIsDentist();
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);
  const [addOpen, setAddOpen] = useState(false);

  const search = useDebounce(searchInput, 300);

  // Reset to page 1 whenever the user types a new search term.
  function onSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSearchInput(e.target.value);
    setPage(1);
  }

  const { data, isLoading, isError } = usePatients(search, page, PAGE_SIZE);
  const patients = data?.data ?? [];
  const totalPages = data?.totalPages ?? 1;
  const total = data?.total ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Patients</h1>
          <p className="text-sm text-muted-foreground">
            Manage patient records and dental charts
          </p>
        </div>
        {isDentist && (
          <Button onClick={() => setAddOpen(true)}>
            <UserPlus className="h-4 w-4" />
            Add Patient
          </Button>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Search by name, email, or phone…"
          value={searchInput}
          onChange={onSearchChange}
          aria-label="Search patients"
        />
      </div>

      {/* Body */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <PatientCardSkeleton key={i} />
          ))}
        </div>
      ) : isError ? (
        <EmptyState
          title="Could not load patients"
          message="Something went wrong. Please try again later."
        />
      ) : patients.length === 0 ? (
        <EmptyState
          title={search ? "No matching patients" : "No patients yet"}
          message={
            search
              ? `No patients match “${search}”. Try a different search.`
              : "Add your first patient to get started."
          }
          icon={<Users className="h-6 w-6" />}
          action={
            isDentist ? (
              <Button onClick={() => setAddOpen(true)}>
                <UserPlus className="h-4 w-4" />
                Add Patient
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <p className="text-xs text-muted-foreground">
            Showing {patients.length} of {total} patient
            {total === 1 ? "" : "s"}
            {search ? ` matching “${search}”` : ""}
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {patients.map((p) => (
              <PatientCard key={p.id} patient={p} />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}

      <AddPatientDialog open={addOpen} onOpenChange={setAddOpen} />
    </div>
  );
}
