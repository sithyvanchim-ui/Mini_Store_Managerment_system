"use client";

import { Loader2, UserPlus } from "lucide-react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CreateUserPayload } from "@/hooks/use-users";

const userSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80, "Keep it under 80 characters"),
  email: z.string().trim().min(1, "Email is required").email("Enter a valid email"),
  password: z
    .string()
    .min(8, "Use at least 8 characters")
    .regex(/[A-Za-z]/, "Include at least one letter")
    .regex(/[0-9]/, "Include at least one number"),
  role: z.enum(["admin", "staff"]),
});

type UserValues = z.infer<typeof userSchema>;

const inputClass =
  "h-11 rounded-2xl border-border bg-background/60 px-3.5 text-sm";

interface UserFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: CreateUserPayload) => Promise<void>;
  submitting?: boolean;
}

export function UserFormDialog({
  open,
  onOpenChange,
  onSubmit,
  submitting,
}: UserFormDialogProps) {
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<UserValues>({
    resolver: zodResolver(userSchema),
    defaultValues: { name: "", email: "", password: "", role: "staff" },
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) {
          reset();
        }
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl font-bold text-ink">
            Add team member
          </DialogTitle>
          <DialogDescription>
            Create a sign-in for a new admin or shift worker.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4"
          noValidate
        >
          <div className="space-y-2">
            <Label htmlFor="new-user-name" className="text-xs font-bold text-ink">
              Full name
            </Label>
            <Input
              id="new-user-name"
              className={inputClass}
              placeholder="Dara Kong"
              aria-invalid={Boolean(errors.name)}
              {...register("name")}
            />
            {errors.name ? (
              <p className="text-xs font-medium text-destructive">
                {errors.name.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-user-email" className="text-xs font-bold text-ink">
              Email
            </Label>
            <Input
              id="new-user-email"
              type="email"
              className={inputClass}
              placeholder="name@ministore.local"
              aria-invalid={Boolean(errors.email)}
              {...register("email")}
            />
            {errors.email ? (
              <p className="text-xs font-medium text-destructive">
                {errors.email.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="new-user-password"
              className="text-xs font-bold text-ink"
            >
              Temporary password
            </Label>
            <Input
              id="new-user-password"
              type="text"
              className={inputClass}
              placeholder="At least 8 characters, letter + number"
              aria-invalid={Boolean(errors.password)}
              {...register("password")}
            />
            {errors.password ? (
              <p className="text-xs font-medium text-destructive">
                {errors.password.message}
              </p>
            ) : (
              <p className="text-[11px] text-muted-foreground">
                Share this privately; the member should change it after signing
                in.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-user-role" className="text-xs font-bold text-ink">
              Role
            </Label>
            <Controller
              control={control}
              name="role"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger
                    id="new-user-role"
                    className="h-11 w-full rounded-2xl border-border bg-background/60 px-3.5 text-sm"
                  >
                    <SelectValue placeholder="Choose a role" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="staff">
                      Staff — sell, restock, close the day
                    </SelectItem>
                    <SelectItem value="admin">
                      Admin — also users, settings, and voids
                    </SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            {errors.role ? (
              <p className="text-xs font-medium text-destructive">
                {errors.role.message}
              </p>
            ) : null}
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              className="rounded-full"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="rounded-full bg-brand px-5 text-xs font-bold text-white hover:bg-brand-strong"
              disabled={submitting}
            >
              {submitting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <UserPlus className="size-4" />
              )}
              Add member
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
