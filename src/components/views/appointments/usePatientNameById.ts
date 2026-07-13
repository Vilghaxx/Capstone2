"use client";

import { useMemo } from "react";
import { usePatients } from "@/hooks";
import type { Patient } from "@/lib/types";

/**
 * Build a `Map<patientId, name>` from the large patient list.
 *
 * Used by the List, Schedule, and Requests tabs to resolve patient names
 * without an extra round-trip per appointment row.
 */
export function usePatientNameById(): Map<string, string> {
  const { data } = usePatients("", 1, 200);
  return useMemo(() => {
    const patientNameById = new Map<string, string>();
    const patients = (data?.data as Patient[] | undefined) ?? [];
    for (const patient of patients) {
      patientNameById.set(patient.id, patient.name);
    }
    return patientNameById;
  }, [data]);
}
