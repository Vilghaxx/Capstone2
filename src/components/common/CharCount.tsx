"use client";

export function CharCount({ current, max = 1000 }: { current: number; max?: number }) {
  const nearLimit = current >= max * 0.9;
  const overLimit = current > max;
  return (
    <p
      className={`text-xs text-right mt-1 ${
        overLimit
          ? "text-destructive font-medium"
          : nearLimit
            ? "text-amber-500"
            : "text-muted-foreground"
      }`}
    >
      {current} / {max}
    </p>
  );
}
