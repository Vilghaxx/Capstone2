"use client";
import React, { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { Toaster } from "@/components/ui/sonner";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import { useAuth } from "@/lib/auth-store";
function makeQueryClient() {
    return new QueryClient({
        defaultOptions: {
            queries: {
                staleTime: 30000,
                retry: 1,
                refetchOnWindowFocus: false,
            },
        },
    });
}
let browserQueryClient;
function getQueryClient() {
    if (typeof window === "undefined") {
        return makeQueryClient();
    }
    if (!browserQueryClient)
        browserQueryClient = makeQueryClient();
    return browserQueryClient;
}
export function Providers({ children }) {
    const queryClient = getQueryClient();
    const restore = useAuth((state) => state.restore);
    // Restore the session once on mount.
    useEffect(() => {
        void restore();
    }, [restore]);
    return (<GoogleOAuthProvider clientId="397113028490-mceosup2ro2mm7utkl2il1cpo21pk2v6.apps.googleusercontent.com">
      <QueryClientProvider client={queryClient}>
        <ErrorBoundary>{children}</ErrorBoundary>
        <Toaster richColors position="top-right"/>
      </QueryClientProvider>
    </GoogleOAuthProvider>);
}
