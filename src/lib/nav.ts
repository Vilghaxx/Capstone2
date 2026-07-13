"use client";

import { create } from "zustand";

/**
 * Client-side router. Because the project is constrained to a single Next.js
 * route (`/`), we implement a tiny hash-based router so that views are
 * bookmarkable and the browser back/forward buttons work.
 *
 * Hash format: #/<view>?<query>
 * e.g. #/patients, #/patients?id=abc, #/book
 */

export type ViewName =
  | "dashboard"
  | "patients"
  | "patient-profile"
  | "appointments"
  | "billing"
  | "book"
  | "my-appointments"
  | "register";

interface NavState {
  view: ViewName;
  params: Record<string, string>;
  navigate: (view: ViewName, params?: Record<string, string>) => void;
  back: () => void;
  init: () => () => void; // returns cleanup
}

function parseHash(): { view: ViewName; params: Record<string, string> } {
  if (typeof window === "undefined")
    return { view: "dashboard", params: {} };
  const hash = window.location.hash.replace(/^#\/?/, "");
  const [viewPart, queryPart] = hash.split("?");
  const view = (viewPart || "dashboard") as ViewName;
  const params: Record<string, string> = {};
  if (queryPart) {
    new URLSearchParams(queryPart).forEach((v, k) => {
      params[k] = v;
    });
  }
  return { view, params };
}

function writeHash(view: ViewName, params?: Record<string, string>) {
  let hash = `#/${view}`;
  if (params && Object.keys(params).length > 0) {
    const qs = new URLSearchParams(params).toString();
    hash += `?${qs}`;
  }
  if (window.location.hash !== hash) {
    window.location.hash = hash;
  }
}

export const useNav = create<NavState>((set, get) => ({
  view: typeof window !== "undefined" ? parseHash().view : "dashboard",
  params: typeof window !== "undefined" ? parseHash().params : {},

  navigate: (view, params) => {
    writeHash(view, params);
    set({ view, params: params ?? {} });
    // Scroll to top on navigation.
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  },

  back: () => {
    if (typeof window !== "undefined") window.history.back();
  },

  init: () => {
    if (typeof window === "undefined") return () => {};
    const handler = () => {
      const { view, params } = parseHash();
      set({ view, params });
    };
    window.addEventListener("hashchange", handler);
    // Sync once on init.
    const { view, params } = parseHash();
    set({ view, params });
    return () => window.removeEventListener("hashchange", handler);
  },
}));
