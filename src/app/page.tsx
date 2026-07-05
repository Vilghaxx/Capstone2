"use client";

import { useEffect } from "react";
import { Providers } from "@/components/providers";
import { AppShell } from "@/components/layout/AppShell";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { useAuth } from "@/lib/auth-store";
import { useNav, type ViewName } from "@/lib/nav";

import LoginView from "@/components/views/LoginView";
import RegisterView from "@/components/views/RegisterView";
import DashboardView from "@/components/views/DashboardView";
import PatientsView from "@/components/views/PatientsView";
import PatientProfileView from "@/components/views/PatientProfileView";
import AppointmentsView from "@/components/views/AppointmentsView";
import BillingView from "@/components/views/BillingView";
import BookAppointmentView from "@/components/views/BookAppointmentView";
import MyAppointmentsView from "@/components/views/MyAppointmentsView";

/** Views that require the user to be authenticated. */
const AUTHED_VIEWS: ViewName[] = [
  "dashboard",
  "patients",
  "patient-profile",
  "appointments",
  "billing",
  "book",
  "my-appointments",
];

/** Map nav view name → component. */
function renderView(view: ViewName) {
  switch (view) {
    case "register":
      return <RegisterView />;
    case "dashboard":
      return <DashboardView />;
    case "patients":
      return <PatientsView />;
    case "patient-profile":
      return <PatientProfileView />;
    case "appointments":
      return <AppointmentsView />;
    case "billing":
      return <BillingView />;
    case "book":
      return <BookAppointmentView />;
    case "my-appointments":
      return <MyAppointmentsView />;
    default:
      return <LoginView />;
  }
}

function AppContent() {
  const { user, initialized, loading } = useAuth();
  const { view, navigate, init } = useNav();

  // Initialise the hash router once.
  useEffect(() => {
    const cleanup = init();
    return cleanup;
  }, [init]);

  // While the session is being restored on first mount, show a loader.
  if (!initialized || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner text="Starting Radiograph…" size="lg" />
      </div>
    );
  }

  // Unauthenticated → only Login / Register are accessible.
  if (!user) {
    if (view === "register") return <RegisterView />;
    return <LoginView />;
  }

  // Authenticated but somehow on the login/register view → go to dashboard.
  if (view === "register" || !AUTHED_VIEWS.includes(view)) {
    return <DashboardView />;
  }

  // Role-gate patient-only views.
  if (user.role === "patient" && (view === "patients" || view === "appointments" || view === "billing" || view === "patient-profile")) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-2 text-center">
        <p className="text-lg font-semibold">Access denied</p>
        <p className="text-sm text-muted-foreground">
          You don&apos;t have permission to view this page.
        </p>
        <button
          className="mt-2 text-sm font-medium text-primary hover:underline"
          onClick={() => navigate("dashboard")}
        >
          Go to dashboard
        </button>
      </div>
    );
  }

  return <>{renderView(view)}</>;
}

export default function Home() {
  return (
    <Providers>
      <AuthGate />
    </Providers>
  );
}

function AuthGate() {
  const user = useAuth((s) => s.user);
  if (!user) {
    // Unauthenticated → no shell, just the centered auth view.
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-muted/40 p-4">
        <AppContent />
      </div>
    );
  }
  return (
    <AppShell>
      <AppContent />
    </AppShell>
  );
}
