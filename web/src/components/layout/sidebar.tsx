"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import {
  ChartSpline,
  CircleDollarSign,
  CircleHelp,
  ClipboardCheck,
  Coins,
  Handshake,
  LayoutDashboard,
  LogOut,
  Package,
  Settings,
  ShoppingCart,
  Truck,
  Users,
  Warehouse,
} from "lucide-react";
import { Brand } from "@/components/layout/brand";
import { useLogout, useMe } from "@/hooks/use-me";
import { cn } from "@/lib/utils";

const primaryNav = [
  { label: "Overview", href: "/", icon: LayoutDashboard, adminOnly: false },
  { label: "Inventory", href: "/inventory", icon: Package, adminOnly: false },
  { label: "Sales", href: "/sales", icon: ShoppingCart, adminOnly: false },
  { label: "Purchases", href: "/purchases", icon: Truck, adminOnly: false },
  { label: "Stock", href: "/stock", icon: Warehouse, adminOnly: false },
  {
    label: "Daily Check",
    href: "/daily-check",
    icon: ClipboardCheck,
    adminOnly: false,
  },
  {
    label: "Fund Requests",
    href: "/funds",
    icon: CircleDollarSign,
    adminOnly: false,
  },
  { label: "Expenses", href: "/expenses", icon: Coins, adminOnly: false },
  { label: "Suppliers", href: "/suppliers", icon: Handshake, adminOnly: false },
  { label: "Analytics", href: "/analytics", icon: ChartSpline, adminOnly: false },
  { label: "Team", href: "/users", icon: Users, adminOnly: true },
];

const footerNav = [
  { label: "Settings", href: "/settings", icon: Settings },
  { label: "Help", href: "/help", icon: CircleHelp },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

interface SidebarContentProps {
  onNavigate?: () => void;
  className?: string;
}

export function SidebarContent({ onNavigate, className }: SidebarContentProps) {
  const pathname = usePathname();
  const router = useRouter();
  const me = useMe();
  const logout = useLogout();
  const isAdmin = me.data?.user.role === "admin";

  // A failed auth check (stale session) must not strand the sidebar.
  useEffect(() => {
    if (me.isError) {
      router.replace("/login");
    }
  }, [me.isError, router]);

  if (me.isPending || me.isError || !me.data?.user) {
    return (
      <div className={cn("flex h-full min-h-0 flex-col", className)}>
        <div className="h-10 w-40 self-center rounded-2xl bg-muted/60" aria-hidden />
      </div>
    );
  }

  return (
    <div className={cn("flex h-full min-h-0 flex-col", className)}>
      <div className="px-2 pb-5 pt-1">
        <Brand onNavigate={onNavigate} />
      </div>

      <div className="rounded-2xl bg-mint/70 px-3 py-2.5">
        <div className="flex items-center gap-2">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-60" />
            <span className="relative inline-flex size-2 rounded-full bg-success" />
          </span>
          <span className="text-[11px] font-bold text-brand-strong">
            Dorm fridge is open
          </span>
        </div>
        <p className="mt-0.5 pl-4 text-[10px] text-muted-foreground">
          06:00 – 23:00 · Block C
        </p>
      </div>

      <nav className="mt-5 flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto scrollbar-none">
        <p className="px-3 pb-2 text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground/70">
          Workspace
        </p>
        {primaryNav
          .filter((item) => !item.adminOnly || isAdmin)
          .map((item) => {
            const Icon = item.icon;
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group flex h-11 items-center gap-3 rounded-2xl px-3.5 text-[13px] font-semibold transition-all duration-200",
                  active
                    ? "bg-primary text-white shadow-[0_10px_24px_rgba(15,181,160,0.25)]"
                    : "text-muted-foreground hover:bg-mint/70 hover:text-brand-strong",
                )}
              >
                <Icon
                  className={cn(
                    "size-[18px] shrink-0 transition-transform group-hover:scale-105",
                    active ? "text-white" : "text-muted-foreground/80",
                  )}
                  strokeWidth={2}
                />
                <span className="truncate">{item.label}</span>
                {item.label === "Stock" ? (
                  <span
                    className={cn(
                      "ml-auto size-1.5 rounded-full",
                      active ? "bg-white" : "bg-warning",
                    )}
                  />
                ) : null}
              </Link>
            );
          })}
      </nav>

      <div className="mt-4 border-t border-border/70 pt-3">
        {footerNav.map((item) => {
          const Icon = item.icon;
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex h-10 items-center gap-3 rounded-xl px-3.5 text-[13px] font-semibold transition-colors",
                active
                  ? "bg-mint text-brand-strong"
                  : "text-muted-foreground hover:bg-muted hover:text-ink",
              )}
            >
              <Icon className="size-[17px]" />
              {item.label}
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => logout.mutate()}
          disabled={logout.isPending}
          className="flex h-10 w-full items-center gap-3 rounded-xl px-3.5 text-[13px] font-semibold text-muted-foreground transition-colors hover:bg-destructive/5 hover:text-destructive disabled:opacity-60"
        >
          <LogOut className="size-[17px]" />
          {logout.isPending ? "Signing out…" : "Logout"}
        </button>
      </div>

      <p className="px-3 pb-1 pt-3 text-[9px] font-medium text-muted-foreground/60">
        MiniStore v1.0 · KHR
      </p>
    </div>
  );
}

export function Sidebar() {
  return (
    <aside className="fixed bottom-5 left-5 top-5 z-40 hidden w-[248px] flex-col rounded-[28px] border border-white/80 bg-card p-3 shadow-[0_24px_60px_rgba(20,60,50,0.09)] lg:flex">
      <SidebarContent />
    </aside>
  );
}
