"use client";

import { useMemo, useState } from "react";
import { Controller, useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  Activity,
  AlertCircle,
  CheckCircle,
  Loader2,
  Receipt,
  Wallet,
  type LucideIcon,
} from "lucide-react";

import {
  useBilling,
  useBillingSummary,
  usePatients,
  useRecordPayment,
} from "@/hooks";
import {
  paymentFormSchema,
  type PaymentFormValues,
} from "@/lib/schemas/billing-schema";
import {
  formatCurrency,
  formatDate,
  PAYMENT_METHODS,
  PAYMENT_METHOD_META,
} from "@/lib/format";
import { useAuth } from "@/lib/auth-store";
import { toastError } from "@/lib/api";
import type { BillingRecord, BillingSummary } from "@/lib/types";
import { motion } from "framer-motion";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { EmptyState } from "@/components/common/EmptyState";

type CardColor = "blue" | "sky" | "amber" | "rose";

const COLOR_STYLES: Record<CardColor, { icon: string; value: string }> = {
  blue: {
    icon: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    value: "text-blue-600 dark:text-blue-400",
  },
  sky: {
    icon: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
    value: "text-sky-600 dark:text-sky-400",
  },
  amber: {
    icon: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    value: "text-amber-600 dark:text-amber-400",
  },
  rose: {
    icon: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
    value: "text-rose-600 dark:text-rose-400",
  },
};

/**
 * Motion-enabled table row used for a subtle staggered fade-in when the
 * billing list mounts. Keeps the shadcn TableRow styling intact.
 */
const MotionTableRow = motion.create(TableRow);

export default function BillingView() {
  const role = useAuth((state) => state.user?.role);
  // Cashier and dentist both have full billing capabilities; the subtitle
  // is tuned to each role's primary concern.
  const subtitle =
    role === "cashier"
      ? "Record payments and track outstanding balances"
      : "Review treatment costs and payments";

  const [statusFilter, setStatusFilter] = useState<"all" | "paid" | "unpaid">(
    "all"
  );
  const [patientFilter, setPatientFilter] = useState<string>("all");
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Stable, memoised filters object so the react-query key stays stable.
  const filters = useMemo(() => {
    const f: Record<string, string> = {};
    if (statusFilter !== "all") f.status = statusFilter;
    if (patientFilter !== "all") f.patientId = patientFilter;
    return f;
  }, [statusFilter, patientFilter]);

  const billingQuery = useBilling(filters);
  const summaryQuery = useBillingSummary();
  const patientsQuery = usePatients("", 1, 200);
  const recordPayment = useRecordPayment();

  // Map<patientId, name> — used for the filter dropdown and as a fallback for
  // display when a billing record's joined patientName is missing.
  const patientsMap = useMemo(() => {
    const m = new Map<string, string>();
    patientsQuery.data?.data?.forEach((p) => m.set(p.id, p.name));
    return m;
  }, [patientsQuery.data]);

  const records = billingQuery.data ?? [];

  const selected = useMemo(
    () => records.find((r) => r.id === selectedId) ?? null,
    [records, selectedId]
  );

  const form = useForm<PaymentFormValues>({
    // Cast around the input/output divergence introduced by `z.coerce.number()`
    // in the shared schema (which we cannot modify). Runtime coercion is unchanged.
    resolver: zodResolver(paymentFormSchema) as Resolver<PaymentFormValues>,
    defaultValues: { paymentMethod: "cash", paidAmount: 0 },
  });

  function openPaymentModal(record: BillingRecord) {
    setSelectedId(record.id);
    form.reset({ paymentMethod: "cash", paidAmount: record.cost });
    setPaymentOpen(true);
  }

  function closePaymentModal() {
    setPaymentOpen(false);
    setSelectedId(null);
    form.clearErrors();
  }

  async function onSubmit(values: PaymentFormValues) {
    if (!selectedId) return;
    try {
      await recordPayment.mutateAsync({
        treatmentId: selectedId,
        data: {
          paymentMethod: values.paymentMethod,
          paidAmount: values.paidAmount,
        },
      });
      toast.success("Payment recorded");
      closePaymentModal();
    } catch (err) {
      toastError(err, "Failed to record payment");
    }
  }

  const summary: BillingSummary | undefined = summaryQuery.data;

  const summaryCards: {
    label: string;
    icon: LucideIcon;
    color: CardColor;
    value: string;
  }[] = [
    {
      label: "Total Revenue",
      icon: Wallet,
      color: "blue",
      value: summary ? formatCurrency(summary.totalRevenue) : "—",
    },
    {
      label: "Collected",
      icon: CheckCircle,
      color: "sky",
      value: summary ? formatCurrency(summary.collected) : "—",
    },
    {
      label: "Outstanding",
      icon: AlertCircle,
      color: "amber",
      value: summary ? formatCurrency(summary.unpaid) : "—",
    },
    {
      label: "Total Treatments",
      icon: Activity,
      color: "rose",
      value: summary ? String(summary.treatmentCount) : "—",
    },
  ];

  return (
    <div className="mx-auto max-w-7xl 2xl:max-w-[1400px] space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Billing</h1>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 xs:grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 2xl:gap-5">
        {summaryCards.map((c, index) => {
          const Icon = c.icon;
          const styles = COLOR_STYLES[c.color];
          return (
            <motion.div
              key={c.label}
              initial={{ opacity: 0, y: 10, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              whileHover={{ y: -2 }}
              transition={{ duration: 0.25, delay: index * 0.05 }}
            >
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      {c.label}
                    </CardTitle>
                    <span
                      className={`flex h-9 w-9 items-center justify-center rounded-lg ${styles.icon}`}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  {summaryQuery.isLoading ? (
                    <div className="h-7 w-24 animate-pulse rounded bg-muted" />
                  ) : summaryQuery.isError ? (
                    <p
                      className="text-lg xs:text-2xl font-semibold text-muted-foreground"
                      title="Could not load summary"
                    >
                      —
                    </p>
                  ) : (
                    <p className={`text-lg xs:text-2xl font-semibold ${styles.value}`}>
                      {c.value}
                    </p>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Filters bar */}
      <Card>
        <CardContent className="flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-3">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="billing-status-filter"
              className="text-xs font-medium text-muted-foreground"
            >
              Status
            </label>
            <Select
              value={statusFilter}
              onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}
            >
              <SelectTrigger id="billing-status-filter" className="w-full sm:w-44">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="unpaid">Unpaid</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="billing-patient-filter"
              className="text-xs font-medium text-muted-foreground"
            >
              Patient
            </label>
            <Select
              value={patientFilter}
              onValueChange={(v) => setPatientFilter(v)}
            >
              <SelectTrigger id="billing-patient-filter" className="w-full sm:w-60">
                <SelectValue placeholder="All patients" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All patients</SelectItem>
                {patientsQuery.data?.data?.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Billing table */}
      <Card>
        <CardHeader>
          <CardTitle>Treatments</CardTitle>
          <CardDescription>
            {records.length} record{records.length === 1 ? "" : "s"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {billingQuery.isLoading ? (
            <LoadingSpinner text="Loading billing records…" />
          ) : billingQuery.isError ? (
            <EmptyState
              title="Could not load billing records"
              message="Something went wrong while fetching billing data. Please try again later."
            />
          ) : records.length === 0 ? (
            <EmptyState
              title="No billing records"
              message="Treatments will appear here once they are created."
            />
          ) : (
            <div className="overflow-x-auto text-xs xs:text-sm">
              <Table className="min-w-[640px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Patient</TableHead>
                    <TableHead>Tooth</TableHead>
                    <TableHead>Procedure</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Dentist</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((r, index) => (
                    <MotionTableRow
                      key={r.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{
                        duration: 0.2,
                        delay: Math.min(index * 0.02, 0.3),
                      }}
                    >
                      <TableCell className="font-medium">
                        {r.patientName ?? patientsMap.get(r.patientId) ?? "—"}
                      </TableCell>
                      <TableCell>{r.toothNumber}</TableCell>
                      <TableCell>{r.procedure}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(r.date)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {r.dentistName ?? "—"}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(r.cost)}
                      </TableCell>
                      <TableCell>
                        {r.paid ? (
                          <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
                            Paid
                          </Badge>
                        ) : (
                          <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                            Unpaid
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {r.paid ? (
                          <div className="flex flex-col text-xs">
                            <span>
                              {PAYMENT_METHOD_META[r.paymentMethod ?? ""] ??
                                "Paid"}
                            </span>
                            {r.paidAt && (
                              <span className="text-muted-foreground">
                                {formatDate(r.paidAt)}
                              </span>
                            )}
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openPaymentModal(r)}
                          >
                            <Receipt className="h-3.5 w-3.5" />
                            Record Payment
                          </Button>
                        )}
                      </TableCell>
                    </MotionTableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment modal */}
      <Dialog
        open={paymentOpen}
        onOpenChange={(o) => {
          if (!o) closePaymentModal();
        }}
      >
        <DialogContent className="max-w-[90vw] sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>Record payment</DialogTitle>
            <DialogDescription>
              Record a payment for this treatment. Partial payments are allowed.
            </DialogDescription>
          </DialogHeader>

          {selected && (
            <div className="rounded-lg border bg-muted/30 p-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Patient</span>
                <span className="font-medium">
                  {selected.patientName ??
                    patientsMap.get(selected.patientId) ??
                    "—"}
                </span>
              </div>
              <div className="mt-1 flex items-center justify-between">
                <span className="text-muted-foreground">Procedure</span>
                <span className="font-medium">{selected.procedure}</span>
              </div>
              <div className="mt-1 flex items-center justify-between">
                <span className="text-muted-foreground">Tooth</span>
                <span className="font-medium">{selected.toothNumber}</span>
              </div>
              <div className="mt-1 flex items-center justify-between">
                <span className="text-muted-foreground">Amount due</span>
                <span className="font-semibold text-blue-600 dark:text-blue-400">
                  {formatCurrency(selected.cost)}
                </span>
              </div>
            </div>
          )}

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="paymentMethod" className="text-sm font-medium">
                Payment method
              </label>
              <Controller
                control={form.control}
                name="paymentMethod"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger id="paymentMethod" className="w-full">
                      <SelectValue placeholder="Select method" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(PAYMENT_METHODS).map((m) => (
                        <SelectItem key={m} value={m}>
                          {PAYMENT_METHOD_META[m] ?? m}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {form.formState.errors.paymentMethod && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.paymentMethod.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="paidAmount" className="text-sm font-medium">
                Amount
              </label>
              <Input
                id="paidAmount"
                type="number"
                step="0.01"
                min="0"
                {...form.register("paidAmount")}
              />
              {form.formState.errors.paidAmount && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.paidAmount.message}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Defaults to the full amount due. Adjust for partial payments.
              </p>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={closePaymentModal}
                disabled={recordPayment.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={recordPayment.isPending}>
                {recordPayment.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Recording…
                  </>
                ) : (
                  <>
                    <Receipt className="h-4 w-4" />
                    Record payment
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
