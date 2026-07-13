"use client";

import { Inbox } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  title?: string;
  message?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

/** Centered message for empty data states. */
export function EmptyState({
  title = "Nothing here yet",
  message,
  icon,
  action,
  className,
}: Props) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-muted/30 px-6 py-12 text-center",
        className
      )}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        {icon ?? <Inbox className="h-6 w-6" />}
      </div>
      <div>
        <p className="font-medium">{title}</p>
        {message && (
          <p className="mt-1 text-sm text-muted-foreground">{message}</p>
        )}
      </div>
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
