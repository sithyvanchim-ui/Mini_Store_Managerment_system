"use client";

import { ShieldOff, ShieldCheck, UserCog } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getInitials } from "@/lib/utils";
import type { Role, User } from "@/types/api";

interface TeamTableProps {
  users: User[];
  onActivate: (user: User) => void;
  onRequestDisable: (user: User) => void;
  onSetRole: (user: User, role: Role) => void;
}

export function TeamTable({
  users,
  onActivate,
  onRequestDisable,
  onSetRole,
}: TeamTableProps) {
  if (users.length === 0) {
    return (
      <EmptyState
        icon={<UserCog />}
        title="No team yet"
        description="Add admin and staff accounts from the button above."
        className="py-6"
      />
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className="pl-0">Member</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="pr-0 text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.map((user) => (
          <TableRow key={user.id}>
            <TableCell className="pl-0">
              <div className="flex items-center gap-2.5">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-mint text-[10px] font-extrabold text-brand-strong">
                  {getInitials(user.name)}
                </span>
                <span className="text-xs font-bold text-ink">{user.name}</span>
              </div>
            </TableCell>
            <TableCell className="text-xs text-muted-foreground">
              {user.email}
            </TableCell>
            <TableCell>
              <Select
                value={user.role}
                onValueChange={(value) => onSetRole(user, value as Role)}
              >
                <SelectTrigger
                  className="h-8 w-[130px] rounded-lg text-xs"
                  aria-label={`Role for ${user.name}`}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-lg">
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="staff">Staff</SelectItem>
                </SelectContent>
              </Select>
            </TableCell>
            <TableCell>
              <span
                className={
                  user.is_active
                    ? "inline-flex items-center rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-bold text-[#0d7a5b]"
                    : "inline-flex items-center rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-bold text-destructive"
                }
              >
                {user.is_active ? "Active" : "Disabled"}
              </span>
            </TableCell>
            <TableCell className="pr-0 text-right">
              {user.is_active ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="rounded-full text-xs text-destructive hover:text-destructive"
                  onClick={() => onRequestDisable(user)}
                >
                  <ShieldOff className="size-3.5" />
                  Disable
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full text-xs"
                  onClick={() => onActivate(user)}
                >
                  <ShieldCheck className="size-3.5" />
                  Enable
                </Button>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
