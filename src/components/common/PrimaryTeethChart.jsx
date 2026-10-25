"use client";
import { TOOTH_STATUS_COLORS, TOOTH_STATUS_META } from "@/lib/format";
import { toothName } from "@/lib/teeth";
import { cn } from "@/lib/utils";
import { ToothStatusLegend } from "@/components/common/ToothStatusLegend";
// FDI primary quadrants, patient's right on the viewer's left:
// upper 55-51 (right) then 61-65 (left); lower 85-81 then 71-75.
const UPPER_TEETH = [55, 54, 53, 52, 51, 61, 62, 63, 64, 65];
const LOWER_TEETH = [85, 84, 83, 82, 81, 71, 72, 73, 74, 75];
const ALL_PRIMARY_TEETH = [...UPPER_TEETH, ...LOWER_TEETH];
/**
 * Primary ("baby") dentition chart. The permanent illustration is an adult
 * mouth, so primary teeth are shown as an FDI-labelled grid: 20 clickable
 * teeth, tinted by status, arranged upper/lower arch with the midline in the
 * middle. Records are created on first edit (the teeth PUT upserts).
 */
export function PrimaryTeethChart({ teeth, onSelectTooth, selectedTooth }) {
    const teethByNumber = new Map(teeth.map((tooth) => [tooth.toothNumber, tooth]));
    return (<div className="space-y-4">
      <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full bg-primary/40"/>
          Patient&apos;s Right
        </span>
        <span className="text-muted-foreground/70">Upper / Lower</span>
        <span className="flex items-center gap-1">
          Patient&apos;s Left
          <span className="inline-block h-2 w-2 rounded-full bg-primary/40"/>
        </span>
      </div>

      <div className="mx-auto w-full max-w-[520px] space-y-4 rounded-2xl border border-border bg-gradient-to-b from-rose-50/40 to-background p-3 shadow-inner dark:from-rose-950/10">
        <Arch label="Upper" codes={UPPER_TEETH} teethByNumber={teethByNumber} selectedTooth={selectedTooth} onSelectTooth={onSelectTooth}/>
        <div className="h-px bg-border/70" aria-hidden="true"/>
        <Arch label="Lower" codes={LOWER_TEETH} teethByNumber={teethByNumber} selectedTooth={selectedTooth} onSelectTooth={onSelectTooth}/>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        FDI quadrants 5–8 · 20 primary teeth (no premolars or third molars).
        Records are created when a tooth is first edited.
      </p>

      <ToothStatusLegend teeth={teeth} codes={ALL_PRIMARY_TEETH}/>
    </div>);
}
function Arch({ label, codes, teethByNumber, selectedTooth, onSelectTooth }) {
    return (<div>
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <div className="flex items-stretch justify-center gap-3">
        <ToothRow codes={codes.slice(0, 5)} teethByNumber={teethByNumber} selectedTooth={selectedTooth} onSelectTooth={onSelectTooth}/>
        <span className="w-px self-stretch bg-border/70" aria-hidden="true"/>
        <ToothRow codes={codes.slice(5)} teethByNumber={teethByNumber} selectedTooth={selectedTooth} onSelectTooth={onSelectTooth}/>
      </div>
    </div>);
}
function ToothRow({ codes, teethByNumber, selectedTooth, onSelectTooth }) {
    return (<div className="grid flex-1 grid-cols-5 gap-1.5">
      {codes.map((code) => (<ToothButton key={code} code={code} toothRecord={teethByNumber.get(code)} selected={selectedTooth === code} onSelect={onSelectTooth}/>))}
    </div>);
}
function ToothButton({ code, toothRecord, selected, onSelect }) {
    const status = toothRecord?.status ?? "healthy";
    const colors = TOOTH_STATUS_COLORS[status] ?? TOOTH_STATUS_COLORS.healthy;
    const meta = TOOTH_STATUS_META[status] ?? TOOTH_STATUS_META.healthy;
    const name = toothName(code);
    return (<button type="button" onClick={() => onSelect(code)} title={`Tooth ${code} — ${name} · ${meta.label}`} aria-label={`Tooth ${code}, ${name}, ${meta.label}`} aria-pressed={selected} className={cn("flex h-10 items-center justify-center rounded-md border text-xs font-semibold tabular-nums transition-all hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1", selected && "ring-2 ring-black/70 ring-offset-1 dark:ring-white/80")} style={{
            backgroundColor: `${colors.fill}33`,
            borderColor: colors.stroke,
            color: "var(--foreground)",
        }}>
      {code}
    </button>);
}
