"use client";

import { useEffect, useMemo, useState } from "react";
import { TOOTH_PATHS } from "@/lib/tooth-paths";
import {
  TOOTH_STATUS_META,
  TOOTH_STATUSES,
  type ToothStatus,
} from "@/lib/format";
import type { Tooth } from "@/lib/types";

const STATUS_VALUES = Object.values(TOOTH_STATUSES) as ToothStatus[];

/** Hex colors used for SVG fills + strokes. */
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

// Mouth outline paths (from the original illustration geometry)
const LIP_OUTLINE =
  "M347.42,201.45c0,107.13-43.94,183.74-145.07,183.74c-94.65,0-145.07-76.62-145.07-183.74 c0-89.74,35.14-169.09,96.85-188.74c13.38-4.26,32.47-1.27,48.57-1.27c16.5,0,35.76-3.18,49.11,0.59 C317.7,30.67,347.42,110.7,347.42,201.45z";
const MOUTH_OPENING =
  "M332.68,196.83c0,97.39-46.37,163.56-128.25,163.56c-85.09,0-134.47-65.31-134.47-162.71 S113.8,27.45,204.43,30.67C299.84,34.06,332.68,99.44,332.68,196.83z";

/**
 * Inline mouth anatomy details — layered ON TOP of the base oral cavity
 * illustration. Only subtle enhancements: lip rim, tongue, palatal rugae,
 * gum highlights, and depth vignette. All clipped to the inner mouth so
 * nothing overlaps the teeth from the outside.
 */
function MouthAnatomyDetails() {
  return (
    <>
      <defs>
        {/* Lip rim gradient (the ring of tissue between lips and mouth) */}
        <linearGradient id="lipRim" x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stopColor="#D86858" stopOpacity="0.7" />
          <stop offset="50%" stopColor="#C2584C" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#D86858" stopOpacity="0.7" />
        </linearGradient>
        {/* Tongue gradient */}
        <radialGradient id="tongueGrad" cx="50%" cy="35%" r="60%">
          <stop offset="0%" stopColor="#E88884" />
          <stop offset="55%" stopColor="#CC6460" />
          <stop offset="100%" stopColor="#9C4844" />
        </radialGradient>
        {/* Subtle inner vignette for depth */}
        <radialGradient id="innerShadow" cx="50%" cy="50%" r="55%">
          <stop offset="65%" stopColor="#000000" stopOpacity="0" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0.3" />
        </radialGradient>
        {/* Clip to the inner mouth opening */}
        <clipPath id="mouthClip">
          <path d={MOUTH_OPENING} />
        </clipPath>
      </defs>

      {/* ===== Lip rim (the ring between outer lip and inner mouth) ===== */}
      {/* Uses evenodd fill rule: outer outline minus inner opening = ring.
          This frames the mouth WITHOUT covering the teeth. */}
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d={`${LIP_OUTLINE} ${MOUTH_OPENING}`}
        fill="url(#lipRim)"
      />

      {/* ===== Details clipped to the inner mouth ===== */}
      <g clipPath="url(#mouthClip)">
        {/* Palatal rugae (ridges on the roof of the mouth) — top area only */}
        <g
          stroke="#7C2E2A"
          strokeWidth={1.2}
          opacity={0.25}
          fill="none"
          strokeLinecap="round"
        >
          <path d="M155,52 Q157,72 155,90" />
          <path d="M170,48 Q172,70 170,93" />
          <path d="M185,46 Q187,69 185,95" />
          <path d="M200,45 Q202,69 200,97" />
          <path d="M215,45 Q213,69 215,97" />
          <path d="M230,46 Q228,70 230,95" />
          <path d="M245,48 Q243,71 245,93" />
          <path d="M258,52 Q256,73 258,90" />
        </g>

        {/* Upper gum highlight (glossy ridge along the upper arch) */}
        <path
          d="M120,118 Q130,72 204,60 Q280,72 290,118"
          fill="none"
          stroke="#F4B0A8"
          strokeWidth={3.5}
          opacity={0.25}
          strokeLinecap="round"
        />

        {/* Lower gum highlight */}
        <path
          d="M120,282 Q130,328 204,340 Q280,328 290,282"
          fill="none"
          stroke="#F4B0A8"
          strokeWidth={3.5}
          opacity={0.25}
          strokeLinecap="round"
        />

        {/* Tongue (floor of mouth) — lower center only */}
        <ellipse
          cx={204}
          cy={335}
          rx={72}
          ry={28}
          fill="url(#tongueGrad)"
          opacity={0.75}
        />
        {/* Tongue central groove */}
        <path
          d="M172,330 Q204,340 236,330"
          fill="none"
          stroke="#883838"
          strokeWidth={1.5}
          opacity={0.4}
          strokeLinecap="round"
        />

        {/* Frenum attachments (subtle tissue lines) */}
        <path
          d="M204,108 L204,128"
          fill="none"
          stroke="#A84440"
          strokeWidth={1.2}
          opacity={0.35}
        />
        <path
          d="M204,292 L204,272"
          fill="none"
          stroke="#A84440"
          strokeWidth={1.2}
          opacity={0.35}
        />

        {/* Subtle inner vignette (depth at edges only) */}
        <ellipse
          cx={204}
          cy={200}
          rx={130}
          ry={165}
          fill="url(#innerShadow)"
        />
      </g>

      {/* Lip shine (subtle, on the outer lip area only) */}
      <path
        d="M170,28 Q204,20 238,28"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth={2.5}
        opacity={0.18}
        strokeLinecap="round"
      />
      <ellipse
        cx={204}
        cy={345}
        rx={48}
        ry={6}
        fill="#FFFFFF"
        opacity={0.1}
      />
    </>
  );
}

/**
 * Oral Cavity Dental Chart
 *
 * Renders a clinically-detailed illustration of the oral cavity (lips,
 * gums, palate, tongue) with all 32 FDI-numbered teeth overlaid as
 * interactive, color-coded SVG paths. Each tooth is clickable and tints
 * according to its clinical status.
 */
export function OralCavityChart({
  teeth,
  onSelectTooth,
  selectedTooth,
}: Props) {
  const [hovered, setHovered] = useState<number | null>(null);
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
            {/* Base oral cavity illustration (400 gradient-shaded paths) —
                injected as native SVG markup so CSS classes render correctly */}
            {baseSvg && (
              <g dangerouslySetInnerHTML={{ __html: baseSvg }} />
            )}

            {/* Added anatomical details (tongue, rugae, highlights, depth) */}
            <MouthAnatomyDetails />

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
                        style={{ filter: "blur(1px)" }}
                      />
                    )}
                    <path
                      d={d}
                      fill={colors.fill}
                      fillOpacity={isHovered ? 0.95 : 0.85}
                      stroke={colors.stroke}
                      strokeWidth={isSelected ? 2.2 : isHovered ? 1.8 : 1}
                      strokeLinejoin="round"
                      className="cursor-pointer transition-all duration-150"
                      style={{
                        filter: isHovered
                          ? "drop-shadow(0 1px 2px rgba(0,0,0,0.35))"
                          : "drop-shadow(0 1px 1px rgba(0,0,0,0.2))",
                      }}
                      onClick={() => onSelectTooth(num)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          onSelectTooth(num);
                        }
                      }}
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
              opacity={0.2}
            />
          </svg>

          {/* Hover tooltip */}
          {hovered != null && (
            <ToothTooltip num={hovered} tooth={teethByNumber.get(hovered)} />
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
            <div key={s} className="flex items-center gap-2">
              <span
                className="h-3.5 w-3.5 rounded-full ring-1 ring-inset ring-black/10"
                style={{ backgroundColor: c.fill }}
              />
              <span className="text-xs font-medium">{meta.label}</span>
              <span className="text-xs text-muted-foreground">({count})</span>
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
