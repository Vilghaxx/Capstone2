import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Role badge                                                          */
/* ------------------------------------------------------------------ */

interface RoleBadgeProps {
  role: string;
}

/** Coloured pill that shows the user's role in the dashboard header. */
export function RoleBadge({ role }: RoleBadgeProps) {
  const label = role.charAt(0).toUpperCase() + role.slice(1);
  const cls =
    role === "dentist"
      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
      : role === "cashier"
      ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
      : "bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300";
  return (
    <Badge variant="outline" className={cn("font-medium", cls)}>
      {label}
    </Badge>
  );
}
