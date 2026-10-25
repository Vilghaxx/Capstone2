"use client";
import { TOOTH_STATUS_COLORS, TOOTH_STATUS_META } from "@/lib/format";
/**
 * Colour legend shared by the permanent and primary dental charts. Counts
 * only the teeth belonging to the chart that renders it.
 */
export function ToothStatusLegend({ teeth, codes }) {
    const inChart = new Set(codes);
    const counts = new Map();
    for (const tooth of teeth) {
        if (inChart.has(tooth.toothNumber)) {
            counts.set(tooth.status, (counts.get(tooth.status) ?? 0) + 1);
        }
    }
    return (<div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 rounded-lg border bg-muted/30 px-4 py-3">
      {Object.entries(TOOTH_STATUS_META).map(([status, meta]) => (<div key={status} className="flex items-center gap-2">
          <span className="h-3.5 w-3.5 rounded-full ring-1 ring-inset ring-black/10" style={{ backgroundColor: TOOTH_STATUS_COLORS[status].fill }}/>
          <span className="text-xs font-medium">{meta.label}</span>
          <span className="text-xs text-muted-foreground">({counts.get(status) ?? 0})</span>
        </div>))}
    </div>);
}
