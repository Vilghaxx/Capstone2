"use client";
import { useEffect, useState } from "react";
import { PRIMARY_TOOTH_PATHS } from "@/lib/primary-tooth-paths";
import { TOOTH_STATUS_COLORS, TOOTH_STATUS_META } from "@/lib/format";
import { toothName } from "@/lib/teeth";
import { ToothStatusLegend } from "@/components/common/ToothStatusLegend";
const ALL_PRIMARY_TEETH = Object.keys(PRIMARY_TOOTH_PATHS).map(Number);
const UPPER_TEETH = ALL_PRIMARY_TEETH.filter((code) => code < 70);
const LOWER_TEETH = ALL_PRIMARY_TEETH.filter((code) => code >= 70);
// Both panels use a 100-unit-tall viewBox so the two arches line up. The
// 1-unit margins keep the source's black outlines from clipping at the edges.
const UPPER_VIEW_BOX = "0 -1 118.592 100";
const LOWER_VIEW_BOX = "0 99.449 118.592 100";
/**
 * Primary ("baby") dentition chart.
 *
 * The illustration is an anatomical occlusal view of a child's upper and
 * lower arches: the upper palate on the left, the lower jaw on the right.
 * Twenty FDI-numbered crown outlines are overlaid as interactive,
 * status-coloured SVG paths. Records are created on first edit (the teeth
 * PUT upserts).
 *
 * Illustration adapted from "Teeth Gum Child" by Science Figures
 * (https://sciencefigures.org/figure/3074/teeth_gum_child), free for
 * commercial use under the Open Design License.
 */
export function PrimaryTeethChart({ teeth, onSelectTooth, selectedTooth }) {
    const [baseSvg, setBaseSvg] = useState("");
    const [activeTooth, setActiveTooth] = useState(null);
    useEffect(() => {
        let cancelled = false;
        fetch("/charts/primary-teeth-base.svg")
            .then((response) => response.text())
            .then((text) => {
            if (cancelled)
                return;
            const match = text.match(/<svg\b[^>]*>([\s\S]*)<\/svg>/);
            setBaseSvg(match ? match[1] : "");
        })
            .catch(() => { });
        return () => {
            cancelled = true;
        };
    }, []);
    const teethByNumber = new Map(teeth.map((tooth) => [tooth.toothNumber, tooth]));
    const readoutTooth = activeTooth ?? selectedTooth;
    const readoutStatus = readoutTooth != null
        ? teethByNumber.get(readoutTooth)?.status ?? "healthy"
        : "healthy";
    return (<div className="space-y-4">
      <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full bg-primary/40"/>
          Patient&apos;s Right
        </span>
        <span className="text-muted-foreground/70">Occlusal view</span>
        <span className="flex items-center gap-1">
          Patient&apos;s Left
          <span className="inline-block h-2 w-2 rounded-full bg-primary/40"/>
        </span>
      </div>

      <div className="isolate mx-auto w-full max-w-[560px] rounded-2xl border border-border bg-gradient-to-b from-rose-50/40 to-background p-3 shadow-inner dark:from-rose-950/10">
        <div className="grid grid-cols-1 gap-3 xs:grid-cols-2">
          <ArchPanel label="Upper" codes={UPPER_TEETH} viewBox={UPPER_VIEW_BOX} baseSvg={baseSvg} teethByNumber={teethByNumber} activeTooth={activeTooth} selectedTooth={selectedTooth} onActivateTooth={setActiveTooth} onSelectTooth={onSelectTooth}/>
          <ArchPanel label="Lower" codes={LOWER_TEETH} viewBox={LOWER_VIEW_BOX} baseSvg={baseSvg} teethByNumber={teethByNumber} activeTooth={activeTooth} selectedTooth={selectedTooth} onActivateTooth={setActiveTooth} onSelectTooth={onSelectTooth}/>
        </div>
        <p className="mt-2 min-h-4 text-center text-xs text-muted-foreground" aria-live="polite">
          {readoutTooth != null && (<>
              Tooth <span className="font-semibold text-foreground">{readoutTooth}</span>
              {" — "}{toothName(readoutTooth)}
              {" · "}{(TOOTH_STATUS_META[readoutStatus] ?? TOOTH_STATUS_META.healthy).label}
            </>)}
        </p>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        FDI quadrants 5–8 · 20 primary teeth (no premolars or third molars).
        Records are created when a tooth is first edited.
      </p>

      <ToothStatusLegend teeth={teeth} codes={ALL_PRIMARY_TEETH}/>
    </div>);
}
function ArchPanel({ label, codes, viewBox, baseSvg, teethByNumber, activeTooth, selectedTooth, onActivateTooth, onSelectTooth }) {
    return (<div className="min-w-0">
      <p className="mb-1 text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <svg viewBox={viewBox} role="group" aria-label={`${label} primary teeth`} className="block h-auto w-full">
        {baseSvg && (<g dangerouslySetInnerHTML={{ __html: baseSvg }}/>)}
        {codes.map((code) => (<ToothPath key={code} code={code} pathData={PRIMARY_TOOTH_PATHS[code]} toothRecord={teethByNumber.get(code)} selected={selectedTooth === code} active={activeTooth === code} onActivate={onActivateTooth} onSelect={onSelectTooth}/>))}
      </svg>
    </div>);
}
function ToothPath({ code, pathData, toothRecord, selected, active, onActivate, onSelect }) {
    const status = toothRecord?.status ?? "healthy";
    const colors = TOOTH_STATUS_COLORS[status] ?? TOOTH_STATUS_COLORS.healthy;
    const meta = TOOTH_STATUS_META[status] ?? TOOTH_STATUS_META.healthy;
    const name = toothName(code);
    const highlighted = selected || active;
    return (<g>
      <path d={pathData} fill={colors.fill} style={{ mixBlendMode: "multiply" }} className="cursor-pointer focus-visible:outline-none" onClick={() => onSelect(code)} onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onSelect(code);
            }
        }} onMouseEnter={() => onActivate(code)} onMouseLeave={() => onActivate(null)} onFocus={() => onActivate(code)} onBlur={() => onActivate(null)} role="button" tabIndex={0} aria-pressed={selected} aria-label={`Tooth ${code}, ${name}, ${meta.label}`}>
        <title>{`Tooth ${code} — ${name} · ${meta.label}`}</title>
      </path>
      {highlighted && (<g pointerEvents="none">
          <path d={pathData} fill="none" stroke="#ffffff" strokeWidth={selected ? 3.2 : 2.2} strokeLinejoin="round" opacity={0.9}/>
          <path d={pathData} fill="none" stroke={selected ? "#0f172a" : colors.stroke} strokeWidth={selected ? 1.6 : 1.1} strokeLinejoin="round"/>
        </g>)}
    </g>);
}
