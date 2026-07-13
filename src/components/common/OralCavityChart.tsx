"use client";

import { useEffect, useMemo, useState } from "react";
import { TOOTH_PATHS } from "@/lib/tooth-paths";
import {
  TOOTH_STATUS_META,
  TOOTH_STATUSES,
  type ToothStatus,
} from "@/lib/format";
import type { Tooth } from "@/lib/types";
import { MouthAnatomy } from "@/components/common/MouthAnatomy";

/** All valid tooth statuses, derived from the shared {@link TOOTH_STATUSES} map. */
const ALL_TOOTH_STATUSES = Object.values(TOOTH_STATUSES) as ToothStatus[];

/**
 * Hex colors used to fill + stroke each tooth path on the chart, keyed by
 * the tooth's clinical status. `fill` is the body color; `stroke` is the
 * slightly darker outline used for the path border and the selection glow.
 */
const TOOTH_STATUS_COLORS: Record<ToothStatus, { fill: string; stroke: string }> = {
  healthy: { fill: "#10b981", stroke: "#059669" },
  treated: { fill: "#0ea5e9", stroke: "#0284c7" },
  "needs-attention": { fill: "#f59e0b", stroke: "#d97706" },
  urgent: { fill: "#f43f5e", stroke: "#e11d48" },
};

/** Props for the {@link OralCavityChart} component. */
interface OralCavityChartProps {
  /** All 32 teeth (FDI-numbered) for the patient currently in view. */
  teeth: Tooth[];
  /** Invoked when the user clicks or keyboard-activates a tooth. */
  onSelectTooth: (toothNumber: number) => void;
  /** Tooth number currently marked as selected (e.g. via a side panel). */
  selectedTooth?: number | null;
}

/** Props for the floating {@link ToothTooltip}. */
interface ToothTooltipProps {
  /** FDI number of the tooth the cursor is hovering over. */
  toothNumber: number;
  /** The patient's tooth record, if one exists for this number. */
  toothRecord: Tooth | undefined;
}

/**
 * Oral Cavity Dental Chart
 *
 * Renders a clinically-detailed illustration of the oral cavity (lips,
 * gums, palate, tongue) with all 32 FDI-numbered teeth overlaid as
 * interactive, color-coded SVG paths. Each tooth is clickable and tints
 * according to its clinical status.
 *
 * The chart is composed of three SVG layers, back to front:
 *  1. **Base illustration** — fetched from `/charts/oral-cavity-base.svg`
 *     (≈400 gradient-shaded paths) and injected as native markup so CSS
 *     classes and gradients render correctly.
 *  2. **Anatomical overlay** — {@link MouthAnatomy} adds the lip rim,
 *     palatal rugae, gum highlights, tongue, and depth vignette.
 *  3. **Interactive teeth** — 32 paths from {@link TOOTH_PATHS}, each
 *     hoverable / keyboard-focusable, color-coded via
 *     {@link TOOTH_STATUS_COLORS}.
 *
 * Below the chart a legend summarizes the count of teeth in each status.
 *
 * @example
 * ```tsx
 * <OralCavityChart
 *   teeth={patient.teeth}
 *   selectedTooth={selectedToothNumber}
 *   onSelectTooth={setSelectedToothNumber}
 * />
 * ```
 */
export function OralCavityChart({
  teeth,
  onSelectTooth,
  selectedTooth,
}: OralCavityChartProps) {
  const [hoveredToothNumber, setHoveredToothNumber] = useState<number | null>(
    null,
  );
  const [baseSvg, setBaseSvg] = useState<string>("");

  // Fetch the base oral cavity SVG and extract its inner content for inline
  // rendering. This ensures CSS classes + gradients render correctly (unlike
  // <image href> which rasterizes and loses styling).
  useEffect(() => {
    let cancelled = false;
    fetch("/charts/oral-cavity-base.svg")
      .then((r) => r.text())
      .then((text) => {
        if (cancelled) return;
        // Extract inner content between <svg ...> and </svg>
        const inner = text.replace(/^<svg[^>]*>/, "").replace(/<\/svg>$/, "");
        setBaseSvg(inner);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const teethByToothNumber = useMemo(() => {
    const map = new Map<number, Tooth>();
    for (const t of teeth) map.set(t.toothNumber, t);
    return map;
  }, [teeth]);

  return (
    <div className="space-y-4">
      {/* Orientations */}
      <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full bg-primary/40" />
          Patient&apos;s Right
        </span>
        <span className="text-muted-foreground/70">Upper / Lower</span>
        <span className="flex items-center gap-1">
          Patient&apos;s Left
          <span className="inline-block h-2 w-2 rounded-full bg-primary/40" />
        </span>
      </div>

      {/* The chart itself */}
      <div className="relative mx-auto w-full max-w-[520px]">
        <div className="relative aspect-square w-full overflow-hidden rounded-2xl border border-border bg-gradient-to-b from-rose-50/40 to-background p-2 shadow-inner dark:from-rose-950/10">
          <svg
            viewBox="0 0 400 400"
            className="h-full w-full"
            role="img"
            aria-label="Interactive dental chart showing 32 teeth color-coded by status"
          >
            {/* Base oral cavity illustration (400 gradient-shaded paths) —
                injected as native SVG markup so CSS classes render correctly */}
            {baseSvg && (
              <g dangerouslySetInnerHTML={{ __html: baseSvg }} />
            )}

            {/* Added anatomical details (tongue, rugae, highlights, depth) */}
            <MouthAnatomy />

            {/* Teeth overlay */}
            <g>
              {Object.entries(TOOTH_PATHS).map(
                ([toothNumberString, toothPathData]) => {
                  const toothNumber = Number(toothNumberString);
                  const tooth = teethByToothNumber.get(toothNumber);
                  const status: ToothStatus = tooth?.status ?? "healthy";
                  const statusColors = TOOTH_STATUS_COLORS[status];
                  const isHovered = hoveredToothNumber === toothNumber;
                  const isSelected = selectedTooth === toothNumber;
                  const statusDisplayInfo = TOOTH_STATUS_META[status];
                  return (
                    <g key={toothNumber}>
                      {/* Soft glow / selection ring */}
                      {(isHovered || isSelected) && (
                        <path
                          d={toothPathData}
                          fill="none"
                          stroke={isSelected ? "#0f172a" : statusColors.stroke}
                          strokeWidth={isSelected ? 2.5 : 2}
                          strokeLinejoin="round"
                          opacity={0.9}
                          style={{ filter: "blur(1px)" }}
                        />
                      )}
                      <path
                        d={toothPathData}
                        fill={statusColors.fill}
                        fillOpacity={isHovered ? 0.95 : 0.85}
                        stroke={statusColors.stroke}
                        strokeWidth={isSelected ? 2.2 : isHovered ? 1.8 : 1}
                        strokeLinejoin="round"
                        className="cursor-pointer transition-all duration-150"
                        style={{
                          filter: isHovered
                            ? "drop-shadow(0 1px 2px rgba(0,0,0,0.35))"
                            : "drop-shadow(0 1px 1px rgba(0,0,0,0.2))",
                        }}
                        onClick={() => onSelectTooth(toothNumber)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            onSelectTooth(toothNumber);
                          }
                        }}
                        onMouseEnter={() => setHoveredToothNumber(toothNumber)}
                        onMouseLeave={() => setHoveredToothNumber(null)}
                        role="button"
                        tabIndex={0}
                        aria-label={`Tooth ${toothNumber}, ${statusDisplayInfo.label}`}
                      >
                        <title>{`Tooth #${toothNumber} — ${statusDisplayInfo.label}`}</title>
                      </path>
                    </g>
                  );
                },
              )}
            </g>

            {/* Quadrant divider (subtle vertical midline) */}
            <line
              x1={200}
              y1={20}
              x2={200}
              y2={380}
              stroke="#ffffff"
              strokeWidth={0.5}
              strokeDasharray="3 3"
              opacity={0.2}
            />
          </svg>

          {/* Hover tooltip */}
          {hoveredToothNumber != null && (
            <ToothTooltip
              toothNumber={hoveredToothNumber}
              toothRecord={teethByToothNumber.get(hoveredToothNumber)}
            />
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 rounded-lg border bg-muted/30 px-4 py-3">
        {ALL_TOOTH_STATUSES.map((status) => {
          const statusColors = TOOTH_STATUS_COLORS[status];
          const statusDisplayInfo = TOOTH_STATUS_META[status];
          const count = teeth.filter((t) => t.status === status).length;
          return (
            <div key={status} className="flex items-center gap-2">
              <span
                className="h-3.5 w-3.5 rounded-full ring-1 ring-inset ring-black/10"
                style={{ backgroundColor: statusColors.fill }}
              />
              <span className="text-xs font-medium">
                {statusDisplayInfo.label}
              </span>
              <span className="text-xs text-muted-foreground">({count})</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Floating tooltip shown above the chart while the cursor hovers over a
 * tooth. Displays the tooth number, its status label, and (if known) the
 * most recent treatment applied to it.
 */
function ToothTooltip({ toothNumber, toothRecord }: ToothTooltipProps) {
  const status: ToothStatus = toothRecord?.status ?? "healthy";
  const statusDisplayInfo = TOOTH_STATUS_META[status];
  const statusColors = TOOTH_STATUS_COLORS[status];
  return (
    <div className="pointer-events-none absolute left-1/2 top-2 z-10 -translate-x-1/2 rounded-lg border border-border bg-popover/95 px-3 py-2 text-center shadow-lg backdrop-blur">
      <div className="flex items-center gap-2">
        <span
          className="h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: statusColors.fill }}
        />
        <span className="text-sm font-semibold">Tooth #{toothNumber}</span>
      </div>
      <p className="text-xs text-muted-foreground">
        {statusDisplayInfo.label}
      </p>
      {toothRecord?.lastTreatment && (
        <p className="mt-0.5 max-w-[180px] truncate text-[11px] text-muted-foreground/80">
          {toothRecord.lastTreatment}
        </p>
      )}
    </div>
  );
}
