"use client";
import { toast } from "sonner";
const TOKEN_KEY = "radiograph_token";
export function getToken() {
    if (typeof window === "undefined")
        return null;
    return window.sessionStorage.getItem(TOKEN_KEY);
}
export function setToken(token) {
    if (typeof window === "undefined")
        return;
    if (token)
        window.sessionStorage.setItem(TOKEN_KEY, token);
    else
        window.sessionStorage.removeItem(TOKEN_KEY);
}
/**
 * Authenticated fetch helper. Automatically attaches the Bearer token,
 * parses JSON, and throws a typed ApiError on non-2xx responses.
 */
export async function apiFetch(input, init = {}) {
    const token = getToken();
    const headers = Object.assign({}, init.headers);
    if (token)
        headers["Authorization"] = `Bearer ${token}`;
    if (init.body && !headers["Content-Type"]) {
        headers["Content-Type"] = "application/json";
    }
    const res = await fetch(input, Object.assign(Object.assign({}, init), { headers }));
    // Handle 401 — token expired or invalid
    if (res.status === 401) {
        setToken(null);
        // Avoid toast spam during initial session restore — callers can catch.
    }
    const text = await res.text();
    let data = null;
    try {
        data = text ? JSON.parse(text) : null;
    }
    catch (_a) {
        // ponytail: non-JSON response (e.g. raw "Internal Server Error")
    }
    if (!res.ok) {
        const message = sanitizeErrorText(text) ||
            (data && (typeof data === "object" && data !== null
                ? data.error ||
                    data.message
                : undefined)) ||
            `Request failed (${res.status})`;
        const err = new Error(message);
        err.status = res.status;
        err.details = data && typeof data === "object" ? data.details : undefined;
        throw err;
    }
    return data;
}
function sanitizeErrorText(text) {
    if (!text)
        return;
    const clean = text.trim();
    if (clean.startsWith("<") || clean.startsWith("{"))
        return;
    return clean.length > 200 ? clean.slice(0, 200) + "…" : clean;
}
/** Convenience verbs — the API client used across the app. */
export const apiClient = {
    get: (url) => apiFetch(url),
    post: (url, body) => apiFetch(url, {
        method: "POST",
        body: body === undefined ? undefined : JSON.stringify(body),
    }),
    put: (url, body) => apiFetch(url, {
        method: "PUT",
        body: body === undefined ? undefined : JSON.stringify(body),
    }),
    del: (url) => apiFetch(url, { method: "DELETE" }),
};
/** Auth API helpers. */
export const authApi = {
    googleLogin: (credential) => apiClient.post("/api/auth/google", {
        credential,
    }),
    me: () => apiClient.get("/api/auth/me"),
};
/** Show a toast for a caught API error. */
export function toastError(err, fallback = "Something went wrong") {
    const message = err instanceof Error ? err.message : fallback;
    toast.error(message);
}
