"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Stethoscope, User, Lock, Eye, EyeOff, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { loginFormSchema, type LoginFormValues } from "@/lib/schemas/auth-schema";
import { useAuth } from "@/lib/auth-store";
import { useNav } from "@/lib/nav";
import { api } from "@/lib/api";

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

const DEMO_CREDS = [
  { role: "Dentist", username: "dentist", password: "dentist123" },
  { role: "Cashier", username: "cashier", password: "cashier123" },
];

export default function LoginView() {
  const login = useAuth((s) => s.login);
  const navigate = useNav((s) => s.navigate);
  const [showPassword, setShowPassword] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: { username: "", password: "" },
  });

  const isSubmitting = form.formState.isSubmitting;

  const onSubmit = async (values: LoginFormValues) => {
    try {
      const user = await login(values.username, values.password);
      toast.success(`Welcome back, ${user.name}`);
      navigate("dashboard");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sign in failed");
    }
  };

  const fillCreds = (username: string, password: string) => {
    form.setValue("username", username, { shouldDirty: true });
    form.setValue("password", password, { shouldDirty: true });
  };

  const seedDemo = async () => {
    setSeeding(true);
    try {
      await api.post("/api/auth/seed");
      toast.success("Demo data seeded. You can use the credentials below.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Seed failed");
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center bg-gradient-to-br from-emerald-50 via-background to-teal-50 p-4 dark:from-emerald-950/20 dark:via-background dark:to-teal-950/20">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-[90vw] sm:max-w-md">
        <Card className="border-border/60 shadow-lg">
          <CardHeader className="items-center gap-3 text-center">
            <div className="flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <Stethoscope className="size-6" />
            </div>
            <div className="space-y-1.5">
              <CardTitle className="text-2xl">Welcome back</CardTitle>
              <CardDescription>
                Sign in to your Radiograph account
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="p-4 xs:p-6 sm:p-8">
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4"
                aria-busy={isSubmitting}
                noValidate
              >
                <FormField
                  control={form.control}
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
                  control={form.control}
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
                          onClick={() => setShowPassword((s) => !s)}
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

            <div className="mt-5 rounded-lg border border-emerald-200/60 bg-emerald-50/60 p-3 dark:border-emerald-900/40 dark:bg-emerald-950/20">
              <p className="mb-2 text-sm font-medium text-emerald-900 dark:text-emerald-100">
                Demo credentials — click to autofill
              </p>
              <div className="flex flex-col xs:flex-row xs:flex-wrap gap-2">
                {DEMO_CREDS.map((c) => (
                  <button
                    key={c.username}
                    type="button"
                    onClick={() => fillCreds(c.username, c.password)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/60 bg-background px-3 py-1 text-xs font-medium text-emerald-900 shadow-sm transition-colors hover:bg-emerald-100/80 dark:border-emerald-800/60 dark:text-emerald-100 dark:hover:bg-emerald-900/30"
                    aria-label={`Fill ${c.role} demo credentials: ${c.username} / ${c.password}`}
                  >
                    <span className="font-semibold">{c.role}:</span>
                    <span className="text-muted-foreground">
                      {c.username} / {c.password}
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
                  onClick={seedDemo}
                  disabled={seeding}
                >
                  <Sparkles className="size-3" />
                  {seeding ? "Seeding…" : "Seed demo data"}
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
      </div>
    </div>
  );
}
