"use client";
import { create } from "zustand";
import { authApi, setToken, getToken, apiClient } from "@/lib/api";
export const useAuth = create((set) => ({
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
        }
        catch (_a) {
            setToken(null);
            set({ user: null, token: null, loading: false, initialized: true });
        }
    },
}));
// Convenience role-check selectors.
export const useIsDentist = () => useAuth((state) => { var _a; return ((_a = state.user) === null || _a === void 0 ? void 0 : _a.role) === "dentist"; });
export const useIsCashier = () => useAuth((state) => { var _a; return ((_a = state.user) === null || _a === void 0 ? void 0 : _a.role) === "cashier"; });
export const useIsPatient = () => useAuth((state) => { var _a; return ((_a = state.user) === null || _a === void 0 ? void 0 : _a.role) === "patient"; });
export const useIsStaff = () => useAuth((state) => { var _a, _b; return ((_a = state.user) === null || _a === void 0 ? void 0 : _a.role) === "dentist" || ((_b = state.user) === null || _b === void 0 ? void 0 : _b.role) === "cashier"; });
export const useIsAuthenticated = () => useAuth((state) => !!state.user);
/** Role helper usable outside React components. */
export function roleOf(user) {
    var _a;
    return (_a = user === null || user === void 0 ? void 0 : user.role) !== null && _a !== void 0 ? _a : null;
}
export { apiClient };
