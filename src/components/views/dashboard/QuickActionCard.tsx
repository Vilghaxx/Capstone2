"use client";

import { motion } from "framer-motion";
import { ArrowRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Quick action card                                                   */
/* ------------------------------------------------------------------ */

export interface QuickAction {
  title: string;
  description: string;
  icon: LucideIcon;
  accent: string;
  onClick: () => void;
}

type QuickActionCardProps = QuickAction;

/** Single animated shortcut button used in the dashboard's Quick Actions grid. */
export function QuickActionCard({
  title,
  description,
  icon: Icon,
  accent,
  onClick,
}: QuickActionCardProps) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2, transition: { duration: 0.15 } }}
      whileTap={{ scale: 0.98 }}
      className="group flex w-full items-start gap-4 rounded-xl border bg-card p-4 text-left transition-all hover:shadow-md hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <motion.div
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-white",
          accent
        )}
        whileHover={{ scale: 1.1, rotate: -5 }}
        transition={{ type: "spring", stiffness: 300, damping: 15 }}
      >
        <Icon className="h-5 w-5" />
      </motion.div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold">{title}</p>
          <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1" />
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      </div>
    </motion.button>
  );
}

interface QuickActionsProps {
  actions: QuickAction[];
}

/** Responsive grid of quick action cards with a section heading. */
export function QuickActions({ actions }: QuickActionsProps) {
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold text-muted-foreground">
        Quick Actions
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 xs:gap-4 lg:gap-5">
        {actions.map((action) => (
          <QuickActionCard key={action.title} {...action} />
        ))}
      </div>
    </section>
  );
}
