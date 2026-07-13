"use client";

import { useMemo } from "react";

import { formatCurrency, formatDate } from "@/lib/format";
import type { Treatment } from "@/lib/types";

import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";

/**
 * Read-only table of every treatment recorded for the patient, newest first.
 * Renders loading and empty states inline. Used by `PatientProfileView`.
 */
export function TreatmentHistoryTable({
  treatments,
  isLoading,
}: {
  treatments: Treatment[];
  isLoading: boolean;
}) {
  const sortedTreatments = useMemo(
    () =>
      [...treatments].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      ),
    [treatments]
  );

  if (isLoading) {
    return <LoadingSpinner size="sm" />;
  }

  if (sortedTreatments.length === 0) {
    return (
      <p className="rounded-md border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
        No treatments recorded yet.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs xs:text-sm">
        <thead>
          <tr className="border-b text-left text-xs text-muted-foreground">
            <th className="py-2 pr-3 font-medium">Tooth</th>
            <th className="py-2 pr-3 font-medium">Procedure</th>
            <th className="py-2 pr-3 font-medium">Date</th>
            <th className="py-2 pr-3 font-medium">Dentist</th>
            <th className="py-2 pr-3 text-right font-medium">Cost</th>
            <th className="py-2 pl-3 text-right font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {sortedTreatments.map((treatment) => (
            <tr
              key={treatment.id}
              className="border-b last:border-0 hover:bg-muted/40"
            >
              <td className="py-2 pr-3">
                <Badge variant="outline">#{treatment.toothNumber}</Badge>
              </td>
              <td className="py-2 pr-3 font-medium">{treatment.procedure}</td>
              <td className="py-2 pr-3 text-muted-foreground">
                {formatDate(treatment.date)}
              </td>
              <td className="py-2 pr-3 text-muted-foreground">
                {treatment.dentistName}
              </td>
              <td className="py-2 pr-3 text-right font-medium">
                {formatCurrency(treatment.cost)}
              </td>
              <td className="py-2 pl-3 text-right">
                <Badge
                  variant={treatment.paid ? "default" : "outline"}
                  className={
                    treatment.paid
                      ? "bg-emerald-600 text-white hover:bg-emerald-600"
                      : "text-amber-700 dark:text-amber-400"
                  }
                >
                  {treatment.paid ? "Paid" : "Unpaid"}
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
