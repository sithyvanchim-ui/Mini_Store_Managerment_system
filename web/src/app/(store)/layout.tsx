"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { Brand } from "@/components/layout/brand";
import { Skeleton } from "@/components/ui/skeleton";
import { useLogout, useMe } from "@/hooks/use-me";

/**
 * Storefront layout: a light header for buyers. Customers land here; staff
 * and admins belong to the dashboard and are sent back there.
 */
export default function StoreLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const me = useMe();
  const logout = useLogout();

  useEffect(() => {
    if (me.isError) {
      router.replace("/login");
    }
  }, [me.isError, router]);

  useEffect(() => {
    const role = me.data?.user.role;
    if (role && role !== "customer") {
      router.replace("/");
    }
  }, [me.data?.user.role, router]);

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-border/70 bg-card/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-4 px-4 py-3">
          <Brand />
          <div className="flex items-center gap-3">
            {me.isPending || !me.data?.user ? (
              <Skeleton className="h-8 w-24 rounded-full" />
            ) : (
              <span className="text-xs font-semibold text-muted-foreground">
                Hi, {me.data.user.name.split(" ")[0]}
              </span>
            )}
            <button
              type="button"
              onClick={() => logout.mutate()}
              disabled={logout.isPending}
              className="flex h-9 items-center gap-2 rounded-full border border-border/70 px-3 text-xs font-bold text-muted-foreground transition-colors hover:bg-destructive/5 hover:text-destructive disabled:opacity-60"
            >
              <LogOut className="size-4" />
              {logout.isPending ? "Signing out…" : "Logout"}
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl px-4 pb-12 pt-5">{children}</main>
    </div>
  );
}
