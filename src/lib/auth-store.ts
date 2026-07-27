"use client";

import { create } from "zustand";
import { authApi, setToken, getToken, apiClient } from "@/lib/api";
import type { AuthUser, Role } from "@/lib/types";

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  initialized: boolean;
  googleLogin: (credential: string) => Promise<AuthUser>;
  logout: () => void;
  restore: () => Promise<void>;
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  token: getToken(),
  loading: true,
  initialized: false,

  googleLogin: async (credential) => {
    const { token, user } = await authApi.googleLogin(credential);
    setToken(token);
    set({ user, token, initialized: true });
    return user;
  },

  logout: () => {
    setToken(null);
    set({ user: null, token: null });
  },

  restore: async () => {
    const token = getToken();
    if (!token) {
      set({ user: null, token: null, loading: false, initialized: true });
      return;
    }
    try {
      const { user } = await authApi.me();
      set({ user, token, loading: false, initialized: true });
    } catch {
      setToken(null);
      set({ user: null, token: null, loading: false, initialized: true });
    }
  },
}));

// Convenience role-check selectors.
export const useIsDentist = () =>
  useAuth((state) => state.user?.role === "dentist");
export const useIsCashier = () =>
  useAuth((state) => state.user?.role === "cashier");
export const useIsPatient = () =>
  useAuth((state) => state.user?.role === "patient");
export const useIsStaff = () =>
  useAuth(
    (state) => state.user?.role === "dentist" || state.user?.role === "cashier"
  );
export const useIsAuthenticated = () => useAuth((state) => !!state.user);

/** Role helper usable outside React components. */
export function roleOf(user: AuthUser | null): Role | null {
  return user?.role ?? null;
}

export { apiClient };
