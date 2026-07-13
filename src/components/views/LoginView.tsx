"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  User,
  Lock,
  Eye,
  EyeOff,
  Sparkles,
  ShieldCheck,
  CalendarCheck,
  HeartPulse,
} from "lucide-react";
import { motion } from "framer-motion";
import { ToothIcon } from "@/components/common/ToothIcon";
import { toast } from "sonner";

import { loginFormSchema, type LoginFormValues } from "@/lib/schemas/auth-schema";
import { useAuth } from "@/lib/auth-store";
import { useNav } from "@/lib/nav";
import { apiClient } from "@/lib/api";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { ThemeToggle } from "@/components/common/ThemeToggle";

const DEMO_CREDENTIALS = [
  { role: "Dentist", username: "dentist", password: "dentist123" },
  { role: "Cashier", username: "cashier", password: "cashier123" },
];

const TRUST_SIGNALS = [
  {
    icon: ShieldCheck,
    title: "Secure & HIPAA-aware",
    description: "JWT auth with bcrypt password hashing",
  },
  {
    icon: CalendarCheck,
    title: "Smart scheduling",
    description: "Real-time appointment calendar with approvals",
  },
  {
    icon: HeartPulse,
    title: "Complete clinical records",
    description: "Interactive 32-tooth chart with treatment history",
  },
];

export default function LoginView() {
  const login = useAuth((state) => state.login);
  const navigate = useNav((state) => state.navigate);
  const [showPassword, setShowPassword] = useState(false);
  const [isSeedingDemoData, setIsSeedingDemoData] = useState(false);

  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: { username: "", password: "" },
  });

  const isSubmitting = loginForm.formState.isSubmitting;

  async function handleLogin(values: LoginFormValues) {
    try {
      const user = await login(values.username, values.password);
      toast.success(`Welcome back, ${user.name}`);
      navigate("dashboard");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sign in failed");
    }
  }

  function fillDemoCredentials(username: string, password: string) {
    loginForm.setValue("username", username, { shouldDirty: true });
    loginForm.setValue("password", password, { shouldDirty: true });
  }

  async function seedDemoData() {
    setIsSeedingDemoData(true);
    try {
      await apiClient.post("/api/auth/seed");
      toast.success("Demo data seeded. You can use the credentials below.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Seed failed");
    } finally {
      setIsSeedingDemoData(false);
    }
  }

  return (
    <div className="relative flex min-h-screen w-full bg-background">
      {/* Theme toggle — always accessible */}
      <div className="absolute right-4 top-4 z-20">
        <ThemeToggle />
      </div>

      {/* ===== Branded hero panel (desktop only) ===== */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-gradient-to-br from-emerald-600 via-teal-600 to-emerald-700 p-12 lg:flex">
        {/* Decorative background pattern */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 80%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />

        {/* Brand header */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative flex items-center gap-3 text-white"
        >
          <div className="flex size-11 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm">
            <ToothIcon className="size-6" />
          </div>
          <div>
            <p className="text-xl font-bold leading-tight">Dental System</p>
            <p className="text-sm text-white/70 leading-tight">
              Practice Management
            </p>
          </div>
        </motion.div>

        {/* Hero message */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="relative space-y-6 text-white"
        >
          <h1 className="text-4xl font-bold leading-tight tracking-tight">
            Manage your dental practice with confidence.
          </h1>
          <p className="max-w-md text-lg text-white/80">
            Patients, appointments, treatments, and billing — all in one
            elegant, clinically-focused platform.
          </p>

          {/* Trust signals */}
          <div className="space-y-4 pt-4">
            {TRUST_SIGNALS.map((signal, index) => {
              const Icon = signal.icon;
              return (
                <motion.div
                  key={signal.title}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: 0.3 + index * 0.1 }}
                  className="flex items-start gap-3"
                >
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white/15 backdrop-blur-sm">
                    <Icon className="size-5" />
                  </div>
                  <div>
                    <p className="font-semibold leading-tight">
                      {signal.title}
                    </p>
                    <p className="text-sm text-white/70 leading-tight">
                      {signal.description}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* Footer */}
        <p className="relative text-sm text-white/50">
          © {new Date().getFullYear()} Dental System. All rights reserved.
        </p>
      </div>

      {/* ===== Login form panel ===== */}
      <div className="flex w-full items-center justify-center bg-gradient-to-br from-emerald-50 via-background to-teal-50 p-4 dark:from-emerald-950/20 dark:via-background dark:to-teal-950/20 lg:w-1/2">
        <motion.div
          initial={{ opacity: 0, y: 12, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="w-full max-w-[90vw] sm:max-w-md"
        >
          {/* Mobile brand (shown when hero panel is hidden) */}
          <div className="mb-6 flex items-center justify-center gap-2.5 lg:hidden">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <ToothIcon className="size-5" />
            </div>
            <div>
              <p className="text-lg font-bold leading-tight">Dental System</p>
              <p className="text-xs text-muted-foreground leading-tight">
                Practice Management
              </p>
            </div>
          </div>

          <Card className="border-border/60 shadow-xl">
            <CardHeader className="items-center gap-2 text-center">
              <CardTitle className="text-2xl">Welcome back</CardTitle>
              <CardDescription>
                Sign in to your Dental System account
              </CardDescription>
            </CardHeader>

            <CardContent className="p-4 xs:p-6 sm:p-8">
              <Form {...loginForm}>
                <form
                  onSubmit={loginForm.handleSubmit(handleLogin)}
                  className="space-y-4"
                  aria-busy={isSubmitting}
                  noValidate
                >
                  <FormField
                    control={loginForm.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Username</FormLabel>
                        <div className="relative">
                          <User className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                          <FormControl>
                            <Input
                              className="pl-9"
                              placeholder="your.username"
                              autoComplete="username"
                              {...field}
                            />
                          </FormControl>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={loginForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <div className="relative">
                          <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                          <FormControl>
                            <Input
                              className="pl-9 pr-9"
                              type={showPassword ? "text" : "password"}
                              placeholder="••••••••"
                              autoComplete="current-password"
                              {...field}
                            />
                          </FormControl>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            tabIndex={-1}
                            className="absolute right-1 top-1/2 size-7 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            onClick={() => setShowPassword((prev) => !prev)}
                            aria-label={
                              showPassword ? "Hide password" : "Show password"
                            }
                          >
                            {showPassword ? (
                              <EyeOff className="size-4" />
                            ) : (
                              <Eye className="size-4" />
                            )}
                          </Button>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        Signing in…
                      </>
                    ) : (
                      "Sign in"
                    )}
                  </Button>
                </form>
              </Form>

              {/* Demo credentials */}
              <div className="mt-5 rounded-lg border border-emerald-200/60 bg-emerald-50/60 p-3 dark:border-emerald-900/40 dark:bg-emerald-950/20">
                <p className="mb-2 text-sm font-medium text-emerald-900 dark:text-emerald-100">
                  Demo credentials — click to autofill
                </p>
                <div className="flex flex-col xs:flex-row xs:flex-wrap gap-2">
                  {DEMO_CREDENTIALS.map((cred) => (
                    <button
                      key={cred.username}
                      type="button"
                      onClick={() =>
                        fillDemoCredentials(cred.username, cred.password)
                      }
                      className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/60 bg-background px-3 py-1 text-xs font-medium text-emerald-900 shadow-sm transition-colors hover:bg-emerald-100/80 dark:border-emerald-800/60 dark:text-emerald-100 dark:hover:bg-emerald-900/30"
                      aria-label={`Fill ${cred.role} demo credentials: ${cred.username} / ${cred.password}`}
                    >
                      <span className="font-semibold">{cred.role}:</span>
                      <span className="text-muted-foreground">
                        {cred.username} / {cred.password}
                      </span>
                    </button>
                  ))}
                </div>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <p className="text-xs text-muted-foreground">
                    Reset the DB? Seed demo data.
                  </p>
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    className="h-auto gap-1 px-0 text-xs"
                    onClick={seedDemoData}
                    disabled={isSeedingDemoData}
                  >
                    <Sparkles className="size-3" />
                    {isSeedingDemoData ? "Seeding…" : "Seed demo data"}
                  </Button>
                </div>
              </div>
            </CardContent>

            <CardFooter className="justify-center">
              <p className="text-sm text-muted-foreground">
                Don&apos;t have an account?{" "}
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  className="h-auto px-0"
                  onClick={() => navigate("register")}
                >
                  Register as a patient
                </Button>
              </p>
            </CardFooter>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
