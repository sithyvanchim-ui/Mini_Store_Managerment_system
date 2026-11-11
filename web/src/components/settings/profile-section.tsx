"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { KeyRound, Loader2, LogOut, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { SectionCard } from "@/components/shared/section-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useChangePassword } from "@/hooks/use-settings";
import { useLogout, useMe } from "@/hooks/use-me";
import { ApiError } from "@/lib/api";
import { getInitials } from "@/lib/utils";

const passwordSchema = z
  .object({
    current_password: z.string().min(1, "Enter your current password"),
    new_password: z
      .string()
      .min(8, "Use at least 8 characters")
      .regex(/[A-Za-z]/, "Include at least one letter")
      .regex(/[0-9]/, "Include at least one number"),
    confirm_password: z.string(),
  })
  .refine((values) => values.new_password === values.confirm_password, {
    message: "The two passwords do not match",
    path: ["confirm_password"],
  });

type PasswordValues = z.infer<typeof passwordSchema>;

const inputClass =
  "h-11 rounded-2xl border-border bg-background/60 px-3.5 text-sm";

export function ProfileSection() {
  const me = useMe();
  const changePassword = useChangePassword();
  const logout = useLogout();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      current_password: "",
      new_password: "",
      confirm_password: "",
    },
  });

  const user = me.data?.user;

  async function onSubmit(values: PasswordValues) {
    try {
      await changePassword.mutateAsync({
        current_password: values.current_password,
        new_password: values.new_password,
      });
      reset();
      toast.success("Password updated", {
        description: "Use your new password next time you sign in.",
      });
    } catch (error) {
      toast.error("Could not change password", {
        description:
          error instanceof ApiError
            ? error.detail
            : "Check your current password and try again.",
      });
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <SectionCard
        title="Your profile"
        description="Who is currently signed into this workstation."
      >
        {user ? (
          <div className="flex items-center gap-4">
            <span className="flex size-14 items-center justify-center rounded-full bg-mint font-heading text-lg font-extrabold text-brand-strong">
              {getInitials(user.name)}
            </span>
            <div className="min-w-0">
              <p className="font-heading text-lg font-bold text-ink">
                {user.name}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {user.email}
              </p>
              <span className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-mint px-2.5 py-0.5 text-[10px] font-bold text-brand-strong">
                <ShieldCheck className="size-3" />
                {user.role === "admin" ? "Administrator" : "Staff"}
              </span>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Loading your profile…
          </p>
        )}

        <div className="mt-4 border-t border-border/70 pt-4">
          <Button
            variant="outline"
            className="rounded-full text-xs font-bold"
            onClick={() => logout.mutate()}
            disabled={logout.isPending}
          >
            <LogOut className="size-4" />
            Sign out
          </Button>
        </div>
      </SectionCard>

      <SectionCard
        title="Change password"
        description="Pick something stronger than the demo default."
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label
              htmlFor="current_password"
              className="text-xs font-bold text-ink"
            >
              Current password
            </Label>
            <Input
              id="current_password"
              type="password"
              autoComplete="current-password"
              className={inputClass}
              aria-invalid={Boolean(errors.current_password)}
              {...register("current_password")}
            />
            {errors.current_password ? (
              <p className="text-xs font-medium text-destructive">
                {errors.current_password.message}
              </p>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="new_password" className="text-xs font-bold text-ink">
                New password
              </Label>
              <Input
                id="new_password"
                type="password"
                autoComplete="new-password"
                className={inputClass}
                aria-invalid={Boolean(errors.new_password)}
                {...register("new_password")}
              />
              {errors.new_password ? (
                <p className="text-xs font-medium text-destructive">
                  {errors.new_password.message}
                </p>
              ) : (
                <p className="text-[11px] text-muted-foreground">
                  8+ characters with a letter and a number.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="confirm_password"
                className="text-xs font-bold text-ink"
              >
                Confirm new password
              </Label>
              <Input
                id="confirm_password"
                type="password"
                autoComplete="new-password"
                className={inputClass}
                aria-invalid={Boolean(errors.confirm_password)}
                {...register("confirm_password")}
              />
              {errors.confirm_password ? (
                <p className="text-xs font-medium text-destructive">
                  {errors.confirm_password.message}
                </p>
              ) : null}
            </div>
          </div>

          <div className="flex justify-end border-t border-border/70 pt-4">
            <Button
              type="submit"
              className="h-10 rounded-full px-5 text-xs font-bold"
              disabled={changePassword.isPending || isSubmitting}
            >
              {changePassword.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <KeyRound className="size-4" />
              )}
              Update password
            </Button>
          </div>
        </form>
      </SectionCard>
    </div>
  );
}
