"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { TOOTH_PATHS } from "@/lib/tooth-paths";
import {
  TOOTH_STATUS_META,
  TOOTH_STATUSES,
  type ToothStatus,
} from "@/lib/format";
import type { Tooth } from "@/lib/types";

const STATUS_VALUES = Object.values(TOOTH_STATUSES) as ToothStatus[];

/** Tailwind-independent hex colors used for SVG fills + strokes. */
const STATUS_HEX: Record<ToothStatus, { fill: string; stroke: string }> = {
  healthy: { fill: "#10b981", stroke: "#059669" },
  treated: { fill: "#0ea5e9", stroke: "#0284c7" },
  "needs-attention": { fill: "#f59e0b", stroke: "#d97706" },
  urgent: { fill: "#f43f5e", stroke: "#e11d48" },
};

interface Props {
  teeth: Tooth[];
  onSelectTooth: (toothNumber: number) => void;
  selectedTooth?: number | null;
}

/**
 * Oral Cavity Dental Chart
 *
 * Renders a clinically-detailed illustration of the oral cavity (gums,
 * palate, tongue) as a static background, with all 32 FDI-numbered teeth
 * overlaid as interactive, color-coded SVG paths. Each tooth is clickable
 * and tints according to its clinical status.
 *
 * The base anatomy SVG lives at /charts/oral-cavity-base.svg (400x400).
 * Tooth path data is imported from @/lib/tooth-paths.
 */
export function OralCavityChart({ teeth, onSelectTooth, selectedTooth }: Props) {
  const [hovered, setHovered] = useState<number | null>(null);

  const teethByNumber = useMemo(() => {
    const m = new Map<number, Tooth>();
    for (const t of teeth) m.set(t.toothNumber, t);
    return m;
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
            {/* Base anatomy (gums, palate, tongue) */}
            <image
              href="/charts/oral-cavity-base.svg"
              x={0}
              y={0}
              width={400}
              height={400}
              preserveAspectRatio="xMidYMid meet"
            />

            {/* Teeth overlay */}
            <g>
              {Object.entries(TOOTH_PATHS).map(([numStr, d]) => {
                const num = Number(numStr);
                const tooth = teethByNumber.get(num);
                const status: ToothStatus = tooth?.status ?? "healthy";
                const colors = STATUS_HEX[status];
                const isHovered = hovered === num;
                const isSelected = selectedTooth === num;
                const meta = TOOTH_STATUS_META[status];
                return (
                  <g key={num}>
                    {/* Soft glow / selection ring */}
                    {(isHovered || isSelected) && (
                      <path
                        d={d}
                        fill="none"
                        stroke={isSelected ? "#0f172a" : colors.stroke}
                        strokeWidth={isSelected ? 2.5 : 2}
                        strokeLinejoin="round"
                        opacity={0.9}
                        style={{
                          filter: "blur(1px)",
                        }}
                      />
                    )}
                    <path
                      d={d}
                      fill={colors.fill}
                      fillOpacity={isHovered ? 0.95 : 0.82}
                      stroke={colors.stroke}
                      strokeWidth={isSelected ? 2.2 : isHovered ? 1.8 : 1}
                      strokeLinejoin="round"
                      className="cursor-pointer transition-all duration-150"
                      style={{
                        filter: isHovered
                          ? "drop-shadow(0 1px 2px rgba(0,0,0,0.35))"
                          : undefined,
                      }}
                      onClick={() => onSelectTooth(num)}
                      onMouseEnter={() => setHovered(num)}
                      onMouseLeave={() => setHovered(null)}
                      role="button"
                      tabIndex={0}
                      aria-label={`Tooth ${num}, ${meta.label}`}
                    >
                      <title>{`Tooth #${num} — ${meta.label}`}</title>
                    </path>
                  </g>
                );
              })}
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
              opacity={0.25}
            />
          </svg>

          {/* Hover tooltip */}
          {hovered != null && (
            <ToothTooltip
              num={hovered}
              tooth={teethByNumber.get(hovered)}
            />
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 rounded-lg border bg-muted/30 px-4 py-3">
        {STATUS_VALUES.map((s) => {
          const c = STATUS_HEX[s];
          const meta = TOOTH_STATUS_META[s];
          const count = teeth.filter((t) => t.status === s).length;
          return (
            <div
              key={s}
              className="flex items-center gap-2"
            >
              <span
                className="h-3.5 w-3.5 rounded-full ring-1 ring-inset ring-black/10"
                style={{ backgroundColor: c.fill }}
              />
              <span className="text-xs font-medium">{meta.label}</span>
              <span className="text-xs text-muted-foreground">
                ({count})
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Floating tooltip shown on hover. */
function ToothTooltip({
  num,
  tooth,
}: {
  num: number;
  tooth: Tooth | undefined;
}) {
  const status: ToothStatus = tooth?.status ?? "healthy";
  const meta = TOOTH_STATUS_META[status];
  const colors = STATUS_HEX[status];
  return (
    <div className="pointer-events-none absolute left-1/2 top-2 z-10 -translate-x-1/2 rounded-lg border border-border bg-popover/95 px-3 py-2 text-center shadow-lg backdrop-blur">
      <div className="flex items-center gap-2">
        <span
          className="h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: colors.fill }}
        />
        <span className="text-sm font-semibold">Tooth #{num}</span>
      </div>
      <p className="text-xs text-muted-foreground">{meta.label}</p>
      {tooth?.lastTreatment && (
        <p className="mt-0.5 max-w-[180px] truncate text-[11px] text-muted-foreground/80">
          {tooth.lastTreatment}
        </p>
      )}
    </div>
  );
}
