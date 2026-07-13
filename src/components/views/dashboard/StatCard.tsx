"use client";

import { motion } from "framer-motion";
import { type LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Stat card                                                           */
/* ------------------------------------------------------------------ */

export interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  /** Tailwind classes for the icon container background. */
  accent: string;
  hint?: string;
  onClick?: () => void;
  loading?: boolean;
}

/** Animated KPI tile. Optionally clickable to deep-link into a view. */
export function StatCard({
  label,
  value,
  icon: Icon,
  accent,
  hint,
  onClick,
  loading,
}: StatCardProps) {
  const clickable = !!onClick;
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      whileHover={clickable ? { y: -3, transition: { duration: 0.15 } } : undefined}
      whileTap={clickable ? { scale: 0.98 } : undefined}
    >
      <Card
        role={clickable ? "button" : undefined}
        tabIndex={clickable ? 0 : undefined}
        onClick={onClick}
        onKeyDown={(e) => {
          if (clickable && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            onClick?.();
          }
        }}
        className={cn(
          "gap-0 py-5 transition-shadow 2xl:py-6",
          clickable &&
            "cursor-pointer hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        )}
      >
        <CardContent className="flex items-start gap-4 2xl:gap-5">
          <motion.div
            className={cn(
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white 2xl:h-12 2xl:w-12",
              accent
            )}
            whileHover={{ rotate: -8, scale: 1.08 }}
            transition={{ type: "spring", stiffness: 300, damping: 15 }}
          >
            <Icon className="h-5 w-5 2xl:h-6 2xl:w-6" />
          </motion.div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm text-muted-foreground">{label}</p>
            {loading ? (
              <Skeleton className="mt-1 h-7 w-20" />
            ) : (
              <motion.p
                className="truncate text-xl font-semibold tracking-tight xs:text-2xl 2xl:text-3xl"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
              >
                {value}
              </motion.p>
            )}
            {hint && (
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {hint}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
