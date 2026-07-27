"use client";

import { motion } from "framer-motion";
import { ToothIcon } from "@/components/common/ToothIcon";
import { toast } from "sonner";

import { GoogleLogin, type CredentialResponse } from "@react-oauth/google";
import { useAuth } from "@/lib/auth-store";
import { useNav } from "@/lib/nav";

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { ThemeToggle } from "@/components/common/ThemeToggle";

export default function LoginView() {
  const googleLogin = useAuth((state) => state.googleLogin);
  const navigate = useNav((state) => state.navigate);

  async function handleGoogleLogin(response: CredentialResponse) {
    if (!response.credential) return;
    try {
      const user = await googleLogin(response.credential);
      toast.success(`Welcome back, ${user.name}`);
      navigate("dashboard");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Google sign in failed");
    }
  }

  return (
    <div className="relative flex min-h-screen w-full bg-background">
      <div className="absolute right-4 top-4 z-20">
        <ThemeToggle />
      </div>

      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-gradient-to-br from-blue-600 via-sky-600 to-blue-700 p-12 lg:flex">
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 80%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
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
             <p className="text-sm text-white/70 leading-tight">Patient Portal</p>
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="relative space-y-6 text-white"
        >
          <h1 className="text-4xl font-bold leading-tight tracking-tight">
            Your dental care, simplified.
          </h1>
          <p className="max-w-md text-lg text-white/80">
            Schedule visits, track treatments, and stay on top of your oral
            health — all in one place.
          </p>
        </motion.div>
        <p className="relative text-sm text-white/50">
          &copy; {new Date().getFullYear()} Dental System. All rights reserved.
        </p>
      </div>

      <div className="flex w-full items-center justify-center bg-gradient-to-br from-blue-50 via-background to-sky-50 p-4 dark:from-blue-950/20 dark:via-background dark:to-sky-950/20 lg:w-1/2">
        <motion.div
          initial={{ opacity: 0, y: 12, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="w-full max-w-[90vw] sm:max-w-md"
        >
          <div className="mb-6 flex items-center justify-center gap-2.5 lg:hidden">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <ToothIcon className="size-5" />
            </div>
            <div>
              <p className="text-lg font-bold leading-tight">Dental System</p>
              <p className="text-xs text-muted-foreground leading-tight">Patient Portal</p>
            </div>
          </div>

          <Card className="border-border/60 shadow-xl">
            <CardHeader className="items-center gap-2 text-center">
              <CardTitle className="text-2xl">Welcome back</CardTitle>
              <CardDescription>Sign in with your Google account</CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center p-4 xs:p-6 sm:p-8">
              <GoogleLogin
                onSuccess={handleGoogleLogin}
                onError={() => toast.error("Google sign in failed")}
                size="large"
                theme="outline"
                width={400}
              />
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
