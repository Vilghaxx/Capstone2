"use client";

import { useState } from "react";
import { CalendarDays, ClipboardList, Plus } from "lucide-react";

import { useIsCashier, useIsDentist } from "@/lib/auth-store";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { AppointmentsListTab } from "./appointments/AppointmentsListTab";
import { AppointmentsScheduleTab } from "./appointments/AppointmentsScheduleTab";
import { AppointmentsRequestsTab } from "./appointments/AppointmentsRequestsTab";
import { NewAppointmentDialog } from "./appointments/NewAppointmentDialog";
import type { NewAppointmentPreset } from "./appointments/types";

/**
 * Appointments view — the staff scheduling hub.
 *
 * This file is a thin shell that renders the page header, the three tabs
 * (List / Schedule / Requests), and the shared New Appointment dialog. The
 * actual tab logic lives in `./appointments/*` so each concern is isolated.
 *
 * Dentist (blue pill) can delete appointments; cashier (amber pill)
 * cannot. No indigo/blue per project rule.
 */
export default function AppointmentsView() {
  const isDentist = useIsDentist();
  const isCashier = useIsCashier();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [preset, setPreset] = useState<NewAppointmentPreset>({});

  const openDialog = (presetArg?: NewAppointmentPreset) => {
    setPreset(presetArg ?? {});
    setDialogOpen(true);
  };

  const rolePill = isDentist
    ? {
        label: "Dentist",
        className:
          "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
      }
    : isCashier
      ? {
          label: "Cashier",
          className:
            "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
        }
      : null;

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:py-8 2xl:max-w-[1400px]">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Appointments
            </h1>
            {rolePill ? (
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${rolePill.className}`}
                aria-label={`Signed in as ${rolePill.label.toLowerCase()}`}
              >
                {rolePill.label}
              </span>
            ) : null}
          </div>
          <p className="text-sm text-muted-foreground">
            Schedule, manage, and approve patient appointments.
          </p>
        </div>
        <Button onClick={() => openDialog()}>
          <Plus className="h-4 w-4" />
          New Appointment
        </Button>
      </header>

      <Tabs defaultValue="list" className="w-full">
        <TabsList className="flex w-full overflow-x-auto sm:w-auto">
          <TabsTrigger value="list" className="gap-1.5">
            <ClipboardList className="h-4 w-4" /> List
          </TabsTrigger>
          <TabsTrigger value="schedule" className="gap-1.5">
            <CalendarDays className="h-4 w-4" /> Schedule
          </TabsTrigger>
          <TabsTrigger value="requests" className="gap-1.5">
            <ClipboardList className="h-4 w-4" /> Requests
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="mt-4">
          <AppointmentsListTab isDentist={isDentist} onNew={openDialog} />
        </TabsContent>
        <TabsContent value="schedule" className="mt-4">
          <AppointmentsScheduleTab onNew={openDialog} />
        </TabsContent>
        <TabsContent value="requests" className="mt-4">
          <AppointmentsRequestsTab />
        </TabsContent>
      </Tabs>

      <NewAppointmentDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        preset={preset}
      />
    </div>
  );
}
