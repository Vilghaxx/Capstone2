"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
        <LoadingSpinner text="Starting Dental System…" size="lg" />
      </div>
    );
  }

  // Unauthenticated → only Login / Register are accessible.
  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-muted/30 to-primary/5 p-4 dark:from-background dark:via-muted/20 dark:to-primary/10">
        <AnimatePresence mode="wait">
          <motion.div
            key={view === "register" ? "register" : "login"}
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="w-full"
          >
            {view === "register" ? <RegisterView /> : <LoginView />}
          </motion.div>
        </AnimatePresence>
      </div>
    );
  }

  // Authenticated but somehow on the login/register view → go to dashboard.
  if (view === "register" || !AUTHED_VIEWS.includes(view)) {
    return (
      <AppShell>
        <ViewTransition view="dashboard">
          <DashboardView />
        </ViewTransition>
      </AppShell>
    );
  }

  // Role-gate patient-only views.
  if (user.role === "patient" && (view === "patients" || view === "appointments" || view === "billing" || view === "patient-profile")) {
    return (
      <AppShell>
        <ViewTransition view={view}>
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
        </ViewTransition>
      </AppShell>
    );
  }

  // Role-gate patient-only views (book + my-appointments) — staff cannot
  // access them because they have no patient profile to book against.
  if (
    (user.role === "dentist" || user.role === "cashier") &&
    (view === "book" || view === "my-appointments")
  ) {
    return (
      <AppShell>
        <ViewTransition view={view}>
          <div className="flex min-h-[50vh] flex-col items-center justify-center gap-2 text-center">
            <p className="text-lg font-semibold">Access denied</p>
            <p className="text-sm text-muted-foreground">
              Only patient accounts can access this page.
            </p>
            <button
              className="mt-2 text-sm font-medium text-primary hover:underline"
              onClick={() => navigate("dashboard")}
            >
              Go to dashboard
            </button>
          </div>
        </ViewTransition>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <ViewTransition view={view}>{renderView(view)}</ViewTransition>
    </AppShell>
  );
}

/** Wraps a view with a smooth fade/slide transition keyed on the view name. */
function ViewTransition({
  view,
  children,
}: {
  view: ViewName;
  children: React.ReactNode;
}) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={view}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

export default function Home() {
  return (
    <Providers>
      <AppContent />
    </Providers>
  );
}
