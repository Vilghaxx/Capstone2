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
      ? "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300"
      : role === "cashier"
      ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
      : "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300";
  return (
    <Badge variant="outline" className={cn("font-medium", cls)}>
      {label}
    </Badge>
  );
}
