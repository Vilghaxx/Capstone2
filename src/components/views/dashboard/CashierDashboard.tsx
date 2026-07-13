"use client";

import { useMemo } from "react";
import {
  Users,
  CalendarDays,
  Wallet,
  CalendarPlus,
  ArrowRight,
  Clock,
  ClipboardList,
  AlertCircle,
} from "lucide-react";

import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/common/EmptyState";

import { useNav } from "@/lib/nav";
import {
  usePatients,
  useAppointments,
  useBillingSummary,
  useBilling,
} from "@/hooks";
import { formatCurrency, formatDate } from "@/lib/format";
import type { BillingRecord } from "@/lib/types";

import { StatCard } from "./StatCard";
import { QuickActions } from "./QuickActionCard";
import { AppointmentListCard } from "./AppointmentListCard";
import {
  getTodaysAppointments,
  countPendingAppointments,
} from "./dashboard-helpers";

/* ------------------------------------------------------------------ */
/* Cashier dashboard (financial + scheduling focus)                    */
/* ------------------------------------------------------------------ */

/** Single row in the recent unpaid bills list. */
function UnpaidBillRow({ bill }: { bill: BillingRecord }) {
  return (
    <div className="flex items-center justify-between gap-3 xs:gap-4 rounded-lg border bg-card p-3 xs:p-4 transition-colors hover:bg-accent/40">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">
          {bill.patientName || "Patient"}
        </p>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {bill.procedure || "Treatment"}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-sm font-semibold text-rose-600 dark:text-rose-400">
          {formatCurrency(bill.cost)}
        </p>
        <p className="text-xs text-muted-foreground">{formatDate(bill.date)}</p>
      </div>
    </div>
  );
}

export function CashierDashboard() {
  const navigate = useNav((s) => s.navigate);

  const apptsQuery = useAppointments();
  const billingQuery = useBillingSummary();
  const unpaidQuery = useBilling({ status: "unpaid" });
  // Larger patient page so we can map patientId → name without an extra
  // endpoint.
  const patientsLookup = usePatients("", 1, 200);

  const billing = billingQuery.data;

  const patientNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const patient of patientsLookup.data?.data ?? []) {
      map.set(patient.id, patient.name);
    }
    return map;
  }, [patientsLookup.data]);

  const todaysAppointments = useMemo(
    () => getTodaysAppointments(apptsQuery.data),
    [apptsQuery.data]
  );

  const pendingCount = useMemo(
    () => countPendingAppointments(apptsQuery.data),
    [apptsQuery.data]
  );

  const recentUnpaid = useMemo(() => {
    const list = unpaidQuery.data ?? [];
    return [...list]
      .sort(
        (a, b) =>
          new Date(b.date).getTime() - new Date(a.date).getTime() ||
          a.patientName?.localeCompare(b.patientName ?? "") ||
          0
      )
      .slice(0, 5);
  }, [unpaidQuery.data]);

  const statsLoading = apptsQuery.isLoading || billingQuery.isLoading;

  return (
    <div className="space-y-6">
      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 xs:gap-4 lg:gap-5">
        <StatCard
          label="Today's Appointments"
          value={todaysAppointments.length}
          icon={CalendarDays}
          accent="bg-teal-500"
          hint="Scheduled for today"
          loading={apptsQuery.isLoading}
          onClick={() => navigate("appointments")}
        />
        <StatCard
          label="Pending Requests"
          value={pendingCount}
          icon={Clock}
          accent="bg-amber-500"
          hint="Awaiting approval"
          loading={apptsQuery.isLoading}
          onClick={() => navigate("appointments")}
        />
        <StatCard
          label="Total Revenue"
          value={formatCurrency(billing?.totalRevenue ?? 0)}
          icon={Wallet}
          accent="bg-emerald-500"
          hint="All billed treatments"
          loading={billingQuery.isLoading}
          onClick={() => navigate("billing")}
        />
        <StatCard
          label="Outstanding"
          value={formatCurrency(billing?.unpaid ?? 0)}
          icon={AlertCircle}
          accent="bg-rose-500"
          hint={`${billing?.unpaidCount ?? 0} unpaid treatment${
            (billing?.unpaidCount ?? 0) === 1 ? "" : "s"
          }`}
          loading={billingQuery.isLoading}
          onClick={() => navigate("billing")}
        />
      </div>

      {/* Quick actions */}
      <QuickActions
        actions={[
          {
            title: "View Billing",
            description: "Record payments and track balances.",
            icon: ClipboardList,
            accent: "bg-amber-500",
            onClick: () => navigate("billing"),
          },
          {
            title: "Manage Appointments",
            description: "Schedule and approve appointments.",
            icon: CalendarPlus,
            accent: "bg-teal-500",
            onClick: () => navigate("appointments"),
          },
          {
            title: "View Patients",
            description: "Look up patient records.",
            icon: Users,
            accent: "bg-emerald-500",
            onClick: () => navigate("patients"),
          },
        ]}
      />

      {/* Today's appointments + recent unpaid bills */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 xs:gap-5 lg:gap-6">
        <AppointmentListCard
          title="Today's Appointments"
          description={
            todaysAppointments.length > 0
              ? `${todaysAppointments.length} appointment${
                  todaysAppointments.length === 1 ? "" : "s"
                } on the schedule today.`
              : "Nothing on the schedule today."
          }
          appointments={todaysAppointments}
          patientNameById={patientNameById}
          loading={apptsQuery.isLoading}
          emptyTitle="No appointments today"
          emptyMessage="Enjoy the quieter day."
          viewAllOnClick={() => navigate("appointments")}
        />

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Unpaid Bills</CardTitle>
              <CardDescription>
                Treatments awaiting payment.
              </CardDescription>
            </div>
            {recentUnpaid.length > 0 && (
              <Button
                size="sm"
                variant="ghost"
                className="gap-1"
                onClick={() => navigate("billing")}
              >
                View all
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-2">
            {unpaidQuery.isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-lg" />
                ))}
              </div>
            ) : recentUnpaid.length === 0 ? (
              <EmptyState
                title="No unpaid bills"
                message="All treatments are fully paid."
              />
            ) : (
              recentUnpaid.map((bill) => (
                <UnpaidBillRow key={bill.id} bill={bill} />
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {statsLoading && (
        <p className="sr-only">Loading dashboard data…</p>
      )}
    </div>
  );
}
