"use client";

import Link from "next/link";
import { ChevronDown, CircleHelp, LogOut, Settings } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLogout } from "@/hooks/use-me";
import { getInitials } from "@/lib/utils";
import type { User } from "@/types/api";

interface UserMenuProps {
  user: User;
}

export function UserMenu({ user }: UserMenuProps) {
  const logout = useLogout();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-3 rounded-full p-1 pr-2 text-left outline-none transition-colors hover:bg-white/70 focus-visible:ring-4 focus-visible:ring-primary/15"
          aria-label="Open account menu"
        >
          <Avatar className="size-9 border-2 border-white shadow-sm">
            <AvatarFallback className="bg-[#D9F5EE] text-xs font-extrabold text-brand-strong">
              {getInitials(user.name)}
            </AvatarFallback>
          </Avatar>
          <span className="hidden min-w-0 sm:block">
            <span className="block max-w-[130px] truncate text-xs font-bold text-ink">
              {user.name}
            </span>
            <span className="block max-w-[130px] truncate text-[10px] text-muted-foreground">
              {user.email}
            </span>
          </span>
          <ChevronDown className="hidden size-3.5 text-muted-foreground sm:block" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-60 rounded-[20px] border-border/80 p-2 shadow-card"
      >
        <DropdownMenuLabel className="px-2 py-2">
          <p className="text-sm font-bold text-ink">{user.name}</p>
          <p className="mt-0.5 text-[11px] font-normal text-muted-foreground">
            {user.email}
          </p>
          <span className="mt-2 inline-flex rounded-full bg-mint px-2 py-0.5 text-[10px] font-bold capitalize text-brand-strong">
            {user.role}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="rounded-xl">
          <Link href="/settings">
            <Settings className="size-4" />
            Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="rounded-xl">
          <Link href="/help">
            <CircleHelp className="size-4" />
            Help & shortcuts
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="rounded-xl text-destructive focus:text-destructive"
          disabled={logout.isPending}
          onSelect={(event) => {
            event.preventDefault();
            logout.mutate();
          }}
        >
          <LogOut className="size-4" />
          {logout.isPending ? "Signing out…" : "Logout"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
