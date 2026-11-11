"use client";

import { Menu } from "lucide-react";
import { GlobalSearch } from "@/components/layout/global-search";
import { Notifications } from "@/components/layout/notifications";
import { UserMenu } from "@/components/layout/user-menu";
import { Button } from "@/components/ui/button";
import type { User } from "@/types/api";

interface TopbarProps {
  user: User;
  onOpenNav: () => void;
}

export function Topbar({ user, onOpenNav }: TopbarProps) {
  return (
    <header className="sticky top-0 z-30 -mx-1 px-1 pb-2 pt-1">
      <div className="flex items-center gap-3 rounded-full border border-white/60 bg-background/70 px-2 py-1.5 backdrop-blur-xl sm:gap-4 sm:px-3">
        <Button
          variant="ghost"
          size="icon"
          className="size-10 shrink-0 rounded-full bg-white/75 text-ink shadow-[0_8px_24px_rgba(20,60,50,0.04)] lg:hidden"
          onClick={onOpenNav}
          aria-label="Open navigation"
        >
          <Menu className="size-5" />
        </Button>

        <GlobalSearch className="hidden sm:block" />
        <div className="flex-1 sm:hidden" />

        <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
          <Notifications />
          <div className="hidden h-7 w-px bg-border/80 sm:block" />
          <UserMenu user={user} />
        </div>
      </div>
    </header>
  );
}
