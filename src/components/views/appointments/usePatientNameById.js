"use client";
import { useMemo } from "react";
import { usePatients } from "@/hooks";
/**
 * Build a `Map<patientId, name>` from the large patient list.
 *
 * Used by the List, Schedule, and Requests tabs to resolve patient names
 * without an extra round-trip per appointment row.
 */
export function usePatientNameById() {
    const { data } = usePatients("", 1, 200);
    return useMemo(() => {
        var _a;
        const patientNameById = new Map();
        const patients = (_a = data === null || data === void 0 ? void 0 : data.data) !== null && _a !== void 0 ? _a : [];
        for (const patient of patients) {
            patientNameById.set(patient.id, patient.name);
        }
        return patientNameById;
    }, [data]);
}
