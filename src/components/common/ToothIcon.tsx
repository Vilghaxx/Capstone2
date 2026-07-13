"use client";

import * as React from "react";

/**
 * ToothIcon — a custom dental tooth mark used as the Dental System brand icon.
 * Replaces the generic Stethoscope lucide icon with something theme-appropriate.
 *
 * Accepts standard SVG props (className, etc.) so it drops into any lucide-sized slot.
 */
export function ToothIcon({
  className,
  ...props
}: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...props}
    >
      {/* Tooth body — a molar/incisor hybrid shape */}
      <path d="M12 2.5c-1.5 0-2.3.7-3.5 1-1.7.4-3.5.3-3.5 3 0 1.8.6 3 1.2 4.8.4 1.2.5 2.5.7 3.8.2 1.4.4 3 1.1 3 .7 0 .8-1.6 1-3 .2-1.1.4-2.1 1-2.1s.8 1 1 2.1c.2 1.4.3 3 1 3 .7 0 .9-1.6 1.1-3 .2-1.3.3-2.6.7-3.8.6-1.8 1.2-3 1.2-4.8 0-2.7-1.8-2.6-3.5-3-1.2-.3-2-1-3.5-1z" />
    </svg>
  );
}
