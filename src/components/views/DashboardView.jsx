"use client";
import { useAuth } from "@/lib/auth-store";
import { greetingFor, formatDate } from "@/lib/format";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { EmptyState } from "@/components/common/EmptyState";
import { RoleBadge } from "./dashboard/RoleBadge";
import { DentistDashboard } from "./dashboard/DentistDashboard";
import { CashierDashboard } from "./dashboard/CashierDashboard";
import { PatientDashboard } from "./dashboard/PatientDashboard";
/* ------------------------------------------------------------------ */
/* Root dashboard — picks the right panel by role                      */
/* ------------------------------------------------------------------ */
export default function DashboardView() {
    var _a;
    const user = useAuth((state) => state.user);
    const formattedTodayDate = formatDate(new Date());
    const isPatient = (user === null || user === void 0 ? void 0 : user.role) === "patient";
    return (<div className="mx-auto w-full max-w-7xl space-y-6 2xl:max-w-[1400px]">
      {/* Header */}
      <header className="flex flex-col gap-3 xs:flex-row xs:items-center xs:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">
              {greetingFor()}, {((_a = user === null || user === void 0 ? void 0 : user.name) === null || _a === void 0 ? void 0 : _a.split(" ")[0]) || "there"}
            </h1>
            {user && <RoleBadge role={user.role}/>}
          </div>
          <p className="text-sm text-muted-foreground">
            {isPatient
            ? "Here's an overview of your dental care."
            : "Here's what's happening at the clinic today."}{" "}
            · {formattedTodayDate}
          </p>
        </div>
      </header>

      {/* Body */}
      {!user ? (<LoadingSpinner text="Loading dashboard…"/>) : user.role === "dentist" ? (<DentistDashboard />) : user.role === "cashier" ? (<CashierDashboard />) : user.role === "patient" ? (<PatientDashboard />) : (<EmptyState title="Unknown role" message="Your account role is not recognized. Please contact support."/>)}
    </div>);
}
