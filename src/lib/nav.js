"use client";
import { create } from "zustand";
function parseHash() {
    if (typeof window === "undefined")
        return { view: "dashboard", params: {} };
    const hash = window.location.hash.replace(/^#\/?/, "");
    const [viewPart, queryPart] = hash.split("?");
    const view = (viewPart || "dashboard");
    const params = {};
    if (queryPart) {
        new URLSearchParams(queryPart).forEach((v, k) => {
            params[k] = v;
        });
    }
    return { view, params };
}
function writeHash(view, params) {
    let hash = `#/${view}`;
    if (params && Object.keys(params).length > 0) {
        const qs = new URLSearchParams(params).toString();
        hash += `?${qs}`;
    }
    if (window.location.hash !== hash) {
        window.location.hash = hash;
    }
}
export const useNav = create((set, get) => ({
    view: typeof window !== "undefined" ? parseHash().view : "dashboard",
    params: typeof window !== "undefined" ? parseHash().params : {},
    navigate: (view, params) => {
        writeHash(view, params);
        set({ view, params: params !== null && params !== void 0 ? params : {} });
        // Scroll to top on navigation.
        if (typeof window !== "undefined") {
            window.scrollTo({ top: 0, behavior: "smooth" });
        }
    },
    back: () => {
        if (typeof window !== "undefined")
            window.history.back();
    },
    init: () => {
        if (typeof window === "undefined")
            return () => { };
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
