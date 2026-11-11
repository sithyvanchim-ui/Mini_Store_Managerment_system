"use client";

import { useState } from "react";
import { UserPlus, UsersRound } from "lucide-react";
import { toast } from "sonner";
import { SectionCard } from "@/components/shared/section-card";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { TeamTable } from "@/components/settings/team-table";
import { UserFormDialog } from "@/components/settings/user-form-dialog";
import {
  useCreateUser,
  useUpdateUser,
  useUsers,
} from "@/hooks/use-users";
import { ApiError } from "@/lib/api";
import type { User } from "@/types/api";

export function TeamSection() {
  const usersQuery = useUsers();
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();

  const [formOpen, setFormOpen] = useState(false);
  const [disableTarget, setDisableTarget] = useState<User | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const users = usersQuery.data?.items ?? [];

  const toggleActive = (user: User, nextActive: boolean) => {
    setActionError(null);
    updateUser.mutate(
      { id: user.id, is_active: nextActive },
      {
        onSuccess: () => {
          if (!nextActive) {
            setDisableTarget(null);
          }
          toast.success(
            nextActive
              ? `${user.name} can sign in again.`
              : `${user.name} can no longer sign in.`,
          );
        },
        onError: (error) => {
          const message =
            error instanceof ApiError
              ? error.detail
              : "The team member could not be updated.";
          setActionError(message);
          toast.error("Account update failed", { description: message });
        },
      },
    );
  };

  const setRole = (user: User, role: "admin" | "staff") => {
    setActionError(null);
    updateUser.mutate(
      { id: user.id, role },
      {
        onError: (error) => {
          const message =
            error instanceof ApiError
              ? error.detail
              : "The role could not be changed.";
          setActionError(message);
          toast.error("Role change failed", { description: message });
        },
      },
    );
  };

  const title = `${users.length} team member${users.length === 1 ? "" : "s"}`;

  return (
    <SectionCard
      title="Team"
      description={`Who can open the store and close the day — ${title.toLowerCase()}.`}
      action={
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-full bg-brand px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-brand-strong"
          onClick={() => setFormOpen(true)}
        >
          <UserPlus className="size-4" />
          Add member
        </button>
      }
      bodyClassName="p-4 sm:p-5"
    >
      {actionError ? (
        <p className="mb-3 rounded-xl bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">
          {actionError}
        </p>
      ) : null}
      {usersQuery.isPending ? (
        <div className="space-y-3" aria-hidden>
          {Array.from({ length: 3 }).map((_, index) => (
            <p
              key={index}
              className="h-12 animate-pulse rounded-2xl bg-muted/60"
            />
          ))}
        </div>
      ) : usersQuery.isError ? (
        <p className="flex items-center gap-2 rounded-xl bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">
          <UsersRound className="size-4" />
          The team list could not be loaded.
          <button
            type="button"
            className="font-bold underline underline-offset-2"
            onClick={() => void usersQuery.refetch()}
          >
            Retry
          </button>
        </p>
      ) : users.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No team members on file yet. Add the first account so staff can sign
          in.
        </p>
      ) : (
        <TeamTable
          users={users}
          onActivate={(user) => toggleActive(user, true)}
          onRequestDisable={setDisableTarget}
          onSetRole={setRole}
        />
      )}

      <UserFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={(values) =>
          createUser
            .mutateAsync(values)
            .then(() => {
              setFormOpen(false);
              toast.success("Team member added", {
                description: `${values.name} can sign in now.`,
              });
            })
            .catch((error: unknown) => {
              const message =
                error instanceof ApiError
                  ? error.detail
                  : "The account could not be created.";
              toast.error("Could not add team member", {
                description: message,
              });
            })
        }
        submitting={createUser.isPending}
      />

      <ConfirmDialog
        open={Boolean(disableTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setDisableTarget(null);
            setActionError(null);
          }
        }}
        title="Disable this account?"
        description={
          <>
            <span className="font-semibold text-ink">
              {disableTarget?.name}
            </span>{" "}
            will no longer be able to sign in. Their past sales stay intact, and
            an admin can re-enable the account at any time.
            {actionError ? (
              <span className="mt-2 block rounded-lg bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">
                {actionError}
              </span>
            ) : null}
          </>
        }
        confirmLabel="Disable account"
        destructive
        loading={updateUser.isPending}
        onConfirm={() => {
          if (disableTarget) {
            toggleActive(disableTarget, false);
          }
        }}
      />
    </SectionCard>
  );
}
