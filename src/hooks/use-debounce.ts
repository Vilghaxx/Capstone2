"use client";

import { useEffect, useState } from "react";

/**
 * Generic value debouncer — returns a value that only updates after the
 * input has stopped changing for `delay` milliseconds.
 */
export function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}
