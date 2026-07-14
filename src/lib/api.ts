"use client";

import { toast } from "sonner";
import type { AuthUser } from "@/lib/types";

const TOKEN_KEY = "radiograph_token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.sessionStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) window.sessionStorage.setItem(TOKEN_KEY, token);
  else window.sessionStorage.removeItem(TOKEN_KEY);
}

export interface ApiError extends Error {
  status: number;
  details?: unknown;
}

/**
 * Authenticated fetch helper. Automatically attaches the Bearer token,
 * parses JSON, and throws a typed ApiError on non-2xx responses.
 */
export async function apiFetch<T = unknown>(
  input: string,
  init: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    ...(init.headers as Record<string, string> | undefined),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (init.body && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(input, { ...init, headers });

  // Handle 401 — token expired or invalid
  if (res.status === 401) {
    setToken(null);
    // Avoid toast spam during initial session restore — callers can catch.
  }

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const message =
      (data && (data.error || data.message)) || `Request failed (${res.status})`;
    const err = new Error(message) as ApiError;
    err.status = res.status;
    err.details = data?.details;
    throw err;
  }

  return data as T;
}

/** Convenience verbs — the API client used across the app. */
export const apiClient = {
  get: <T = unknown>(url: string) => apiFetch<T>(url),
  post: <T = unknown>(url: string, body?: unknown) =>
    apiFetch<T>(url, {
      method: "POST",
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  put: <T = unknown>(url: string, body?: unknown) =>
    apiFetch<T>(url, {
      method: "PUT",
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  del: <T = unknown>(url: string) => apiFetch<T>(url, { method: "DELETE" }),
};

/** Auth API helpers. */
export const authApi = {
  login: (username: string, password: string) =>
    apiClient.post<{ token: string; user: AuthUser }>("/api/auth/login", {
      username,
      password,
    }),
  register: (payload: Record<string, unknown>) =>
    apiClient.post<{ token: string; user: AuthUser }>(
      "/api/auth/register",
      payload
    ),
  me: () => apiClient.get<{ user: AuthUser }>("/api/auth/me"),
};

/** Show a toast for a caught API error. */
export function toastError(err: unknown, fallback = "Something went wrong") {
  const message = err instanceof Error ? err.message : fallback;
  toast.error(message);
}
