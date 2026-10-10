"use client";
import { ClipboardList, Shield, Stethoscope, Wrench, CalendarCheck } from "lucide-react";
const PHASES = [
    {
        phase: "1",
        title: "Emergency / Acute",
        icon: Stethoscope,
        color: "bg-red-500/10 text-red-600 dark:bg-red-900/30 dark:text-red-400",
        steps: [
            "Pain assessment and emergency relief",
            "Extraction of non-restorable teeth",
            "Incision and drainage for abscess",
            "Temporary restorations for immediate relief",
        ],
    },
    {
        phase: "2",
        title: "Preventive / Stabilization",
        icon: Shield,
        color: "bg-green-500/10 text-green-600 dark:bg-green-900/30 dark:text-green-400",
        steps: [
            "Oral prophylaxis (professional cleaning)",
            "Fluoride application and oral hygiene instructions",
            "Composite fillings for carious teeth",
            "Scaling and root planing for gum disease",
        ],
    },
    {
        phase: "3",
        title: "Definitive Treatment",
        icon: Wrench,
        color: "bg-blue-500/10 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
        steps: [
            "Root canal treatment for infected/pulpal teeth",
            "Crown and bridge restorations",
            "Dentures or partial dentures for missing teeth",
            "Implant placement and restoration",
        ],
    },
    {
        phase: "4",
        title: "Maintenance / Recall",
        icon: CalendarCheck,
        color: "bg-amber-500/10 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
        steps: [
            "Follow-up visit to assess healing (1–2 weeks post-op)",
            "Periodic oral examination every 6 months",
            "Professional cleaning every 6–12 months",
            "Monitor previously treated teeth and restorations",
        ],
    },
];
export function TreatmentPlan() {
    return (<div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <ClipboardList className="h-4 w-4" aria-hidden="true"/>
        <span>
          Standard treatment plan phases. The dentist will customize this based
          on clinical findings.
        </span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {PHASES.map((p) => {
            const Icon = p.icon;
            return (<div key={p.phase} className="rounded-lg border border-border bg-card/40 p-4">
              <div className="mb-2 flex items-center gap-2">
                <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${p.color}`}>
                  {p.phase}
                </span>
                <h4 className="text-sm font-semibold">{p.title}</h4>
                <Icon className="ml-auto h-4 w-4 text-muted-foreground" aria-hidden="true"/>
              </div>
              <ul className="ml-9 flex flex-col gap-1 text-xs text-muted-foreground">
                {p.steps.map((step) => (<li key={step} className="flex items-start gap-1.5">
                    <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-muted-foreground/50"/>
                    {step}
                  </li>))}
              </ul>
            </div>);
        })}
      </div>
    </div>);
}
