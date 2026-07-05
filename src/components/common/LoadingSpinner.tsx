"use client";

import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  text?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

/** Animated CSS spinner with optional label. */
export function LoadingSpinner({ text, className, size = "md" }: Props) {
  const dim = size === "sm" ? "h-4 w-4" : size === "lg" ? "h-10 w-10" : "h-6 w-6";
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 p-8 text-muted-foreground",
        className
      )}
      role="status"
      aria-live="polite"
    >
      <Loader2 className={cn("animate-spin text-primary", dim)} />
      {text && <p className="text-sm">{text}</p>}
    </div>
  );
}

/** Full-page loading variant. */
export function PageLoader({ text = "Loading…" }: { text?: string }) {
  return (
    <div className="flex min-h-[50vh] w-full items-center justify-center">
      <LoadingSpinner text={text} size="lg" />
    </div>
  );
}
