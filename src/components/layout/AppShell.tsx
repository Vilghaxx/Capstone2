"use client";

import React from "react";
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  Receipt,
  CalendarPlus,
  CalendarRange,
  LogOut,
  Menu,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ToothIcon } from "@/components/common/ToothIcon";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-store";
import { useNav, type ViewName } from "@/lib/nav";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/common/ThemeToggle";

interface NavItem {
  view: ViewName;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: ("dentist" | "cashier" | "patient")[];
}

const NAV_ITEMS: NavItem[] = [
  {
    view: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    roles: ["dentist", "cashier", "patient"],
  },
  {
    view: "patients",
    label: "Patients",
    icon: Users,
    roles: ["dentist", "cashier"],
  },
  {
    view: "appointments",
    label: "Appointments",
    icon: CalendarDays,
    roles: ["dentist", "cashier"],
  },
  {
    view: "billing",
    label: "Billing",
    icon: Receipt,
    roles: ["dentist", "cashier"],
  },
  {
    view: "book",
    label: "Book Appointment",
    icon: CalendarPlus,
    roles: ["patient"],
  },
  {
    view: "my-appointments",
    label: "My Appointments",
    icon: CalendarRange,
    roles: ["patient"],
  },
];

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function roleLabel(role: string) {
  return role.charAt(0).toUpperCase() + role.slice(1);
}

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const user = useAuth((state) => state.user);
  const navigate = useNav((s) => s.navigate);
  const view = useNav((s) => s.view);

  if (!user) return null;
  const items = NAV_ITEMS.filter((i) => i.roles.includes(user.role));

  return (
    <nav className="flex flex-col gap-1">
      {items.map((item) => {
        const Icon = item.icon;
        const active = view === item.view;
        return (
          <button
            key={item.view}
            onClick={() => {
              navigate(item.view);
              onNavigate?.();
            }}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}

function UserCard() {
  const user = useAuth((state) => state.user);
  const logout = useAuth((state) => state.logout);
  const navigate = useNav((s) => s.navigate);
  if (!user) return null;

  return (
    <div className="flex items-center gap-3 rounded-md border border-border bg-muted/40 p-3">
      <Avatar className="h-9 w-9 shrink-0">
        <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
          {initials(user.name)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{user.name}</p>
        <p className="truncate text-xs text-muted-foreground">
          {roleLabel(user.role)}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <ThemeToggle className="h-8 w-8 text-muted-foreground" />
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-destructive"
          onClick={() => {
            logout();
            navigate("dashboard");
          }}
          aria-label="Log out"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = React.useState(false);

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <div className="flex flex-1">
        {/* Desktop sidebar */}
        <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-card p-4 lg:flex 2xl:w-72">
          <div className="mb-6 flex items-center gap-2 px-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <ToothIcon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold leading-tight">Dental System</p>
              <p className="text-xs text-muted-foreground leading-tight">
                Dental Practice
              </p>
            </div>
          </div>
          <div className="flex-1">
            <NavList />
          </div>
          <UserCard />
        </aside>

        {/* Main column */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Mobile top bar */}
          <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-border bg-card/80 px-4 py-3 backdrop-blur lg:hidden">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Open menu">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-4">
                <SheetTitle className="mb-4 flex items-center gap-2">
                  <ToothIcon className="h-5 w-5" /> Dental System
                </SheetTitle>
                <div className="flex flex-col gap-4">
                  <NavList onNavigate={() => setMobileOpen(false)} />
                  <UserCard />
                </div>
              </SheetContent>
            </Sheet>
            <div className="flex flex-1 items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <ToothIcon className="h-4 w-4" />
              </div>
              <span className="font-semibold">Dental System</span>
            </div>
            <ThemeToggle className="h-8 w-8" />
          </header>

          <main className="flex-1 p-4 sm:p-6 lg:p-8 2xl:p-10">{children}</main>
        </div>
      </div>
    </div>
  );
}
