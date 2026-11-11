"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  ArrowRight,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { AuthBrandPanel, AuthMobileHeader } from "@/components/auth/brand-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useMe } from "@/hooks/use-me";
import { api, ApiError } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type { LoginResponse } from "@/types/api";

const loginSchema = z.object({
  email: z.email("Enter a valid email address"),
  password: z.string().min(1, "Enter your password"),
});

type LoginValues = z.infer<typeof loginSchema>;

const demoAccounts = [
  {
    label: "Admin demo",
    email: "admin@ministore.local",
    password: "Admin123!",
    hint: "Full access · settings, team, voids",
  },
  {
    label: "Staff demo",
    email: "staff@ministore.local",
    password: "Staff123!",
    hint: "POS, restock, and daily close",
  },
];

function safeNext(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}

export function LoginScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const me = useMe();
  const loggedIn = useRef(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const destination = safeNext(searchParams.get("next"));

  const login = useMutation({
    mutationFn: (values: LoginValues) =>
      api.post<LoginResponse>("/api/v1/auth/login", values),
    onSuccess: (data) => {
      loggedIn.current = true;
      queryClient.setQueryData(queryKeys.me, data);
      queryClient.invalidateQueries({ queryKey: queryKeys.me });
      toast.success("Signed in", {
        description: `Welcome back, ${data.user.name}.`,
      });
      router.replace(destination);
    },
    onError: (error) => {
      setFormError(
        error instanceof ApiError
          ? error.detail
          : "Unable to sign in. Check your connection and try again.",
      );
    },
  });

  useEffect(() => {
    if (me.data?.user && !loggedIn.current) {
      router.replace("/");
    }
  }, [me.data, router]);

  function fillDemo(email: string, password: string) {
    setFormError(null);
    setValue("email", email, { shouldValidate: true, shouldDirty: true });
    setValue("password", password, { shouldValidate: true, shouldDirty: true });
  }

  function onSubmit(values: LoginValues) {
    setFormError(null);
    login.mutate(values);
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-canvas px-3 py-3 sm:px-5 sm:py-5">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-40 -top-32 size-[32rem] rounded-full bg-brand/10 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-40 -left-32 size-[34rem] rounded-full bg-lavender/20 blur-3xl"
      />

      <div className="relative mx-auto grid min-h-[calc(100vh-24px)] w-full max-w-[1440px] items-stretch gap-5 sm:min-h-[calc(100vh-40px)] lg:grid-cols-[1.02fr_0.98fr]">
        <AuthBrandPanel className="hidden lg:flex" />

        <section className="flex flex-col justify-center py-4 lg:py-8">
          <div className="mx-auto w-full max-w-[450px]">
            <AuthMobileHeader />

            <div className="card-surface animate-fade-up p-6 sm:p-8">
              <div className="mb-6">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-mint px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-brand-strong">
                  <Sparkles className="size-3" />
                  Welcome back
                </span>
                <h1 className="mt-3 font-heading text-[28px] font-extrabold tracking-tight text-ink">
                  Sign in to MiniStore
                </h1>
                <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
                  Use your store account to open the counter, restock, and close
                  the day.
                </p>
              </div>

              <form
                onSubmit={handleSubmit(onSubmit)}
                className="space-y-4"
                noValidate
              >
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-xs font-bold text-ink">
                    Email address
                  </Label>
                  <div className="relative">
                    <Mail
                      aria-hidden
                      className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                    />
                    <Input
                      id="email"
                      type="email"
                      autoComplete="email"
                      inputMode="email"
                      placeholder="you@ministore.local"
                      className="h-11 rounded-2xl border-border bg-background/60 pl-10 text-sm"
                      aria-invalid={Boolean(errors.email)}
                      aria-describedby={errors.email ? "email-error" : undefined}
                      {...register("email")}
                    />
                  </div>
                  {errors.email ? (
                    <p id="email-error" className="text-xs font-medium text-destructive">
                      {errors.email.message}
                    </p>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="password"
                    className="text-xs font-bold text-ink"
                  >
                    Password
                  </Label>
                  <div className="relative">
                    <Lock
                      aria-hidden
                      className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                    />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      placeholder="Your password"
                      className="h-11 rounded-2xl border-border bg-background/60 pl-10 pr-12 text-sm"
                      aria-invalid={Boolean(errors.password)}
                      aria-describedby={
                        errors.password ? "password-error" : undefined
                      }
                      {...register("password")}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-1.5 top-1/2 size-8 -translate-y-1/2 rounded-full text-muted-foreground hover:bg-muted"
                      onClick={() => setShowPassword((value) => !value)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? (
                        <EyeOff className="size-4" />
                      ) : (
                        <Eye className="size-4" />
                      )}
                    </Button>
                  </div>
                  {errors.password ? (
                    <p
                      id="password-error"
                      className="text-xs font-medium text-destructive"
                    >
                      {errors.password.message}
                    </p>
                  ) : null}
                </div>

                <div aria-live="polite" role="status" className="min-h-0">
                  {formError ? (
                    <div
                      role="alert"
                      className="rounded-2xl border border-destructive/20 bg-destructive/[0.06] px-3.5 py-2.5 text-xs font-medium leading-5 text-destructive"
                    >
                      {formError}
                    </div>
                  ) : null}
                </div>

                <Button
                  type="submit"
                  className="h-11 w-full rounded-full bg-primary text-sm font-bold text-primary-foreground shadow-[0_14px_30px_rgba(15,181,160,0.28)] transition-transform hover:-translate-y-0.5 hover:bg-brand-strong"
                  disabled={login.isPending}
                >
                  {login.isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <KeyRound className="size-4" />
                  )}
                  {login.isPending ? "Signing in…" : "Sign in"}
                  {!login.isPending ? <ArrowRight className="size-4" /> : null}
                </Button>
              </form>

              <div className="mt-6 flex items-center gap-3">
                <span className="h-px flex-1 bg-border" />
                <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                  Demo accounts
                </span>
                <span className="h-px flex-1 bg-border" />
              </div>

              <div className="mt-3 grid gap-2">
                {demoAccounts.map((account) => (
                  <button
                    key={account.email}
                    type="button"
                    onClick={() => fillDemo(account.email, account.password)}
                    className="group flex items-center gap-3 rounded-2xl border border-border/80 bg-background/50 px-3 py-2.5 text-left transition-colors hover:border-brand/30 hover:bg-mint/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                    aria-label={`Fill the form with the ${account.label} credentials`}
                  >
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-mint text-brand-strong [&_svg]:size-4">
                      <ShieldCheck />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-bold text-ink">
                          {account.label}
                        </span>
                        <span className="text-[9px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                          Tap to fill
                        </span>
                      </span>
                      <span className="mt-0.5 block truncate font-mono text-[10px] text-muted-foreground">
                        {account.email} · {account.password}
                      </span>
                      <span className="mt-0.5 block text-[9px] text-muted-foreground/80">
                        {account.hint}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <p className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
              <ShieldCheck className="size-3.5 text-brand" />
              Sessions are protected by an httpOnly cookie.
            </p>
            <p className="mt-1.5 text-center text-[11px] text-muted-foreground">
              New here?{" "}
              <Link
                href="/help"
                className="font-bold text-brand-strong underline-offset-2 hover:underline"
              >
                Read the quick start
              </Link>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

export function LoginPageSkeleton() {
  return (
    <main className="min-h-screen bg-canvas px-3 py-3 sm:px-5 sm:py-5">
      <div className="mx-auto grid min-h-[calc(100vh-24px)] w-full max-w-[1440px] gap-5 sm:min-h-[calc(100vh-40px)] lg:grid-cols-[1.02fr_0.98fr]">
        <div className="hidden rounded-[32px] bg-mint lg:block" />
        <div className="flex items-center justify-center">
          <div className="card-surface w-full max-w-[450px] space-y-4 p-8">
            <Skeleton className="h-5 w-28 rounded-full" />
            <Skeleton className="h-8 w-56 rounded-xl" />
            <Skeleton className="h-4 w-full rounded-full" />
            <Skeleton className="mt-4 h-11 w-full rounded-2xl" />
            <Skeleton className="h-11 w-full rounded-2xl" />
            <Skeleton className="h-11 w-full rounded-full" />
            <Skeleton className="h-16 w-full rounded-2xl" />
            <Skeleton className="h-16 w-full rounded-2xl" />
          </div>
        </div>
      </div>
    </main>
  );
}
