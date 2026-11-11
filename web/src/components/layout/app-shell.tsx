"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { useMe } from "@/hooks/use-me";
import { Skeleton } from "@/components/ui/skeleton";

function ShellSkeleton() {
  return (
    <div className="min-h-screen">
      <aside className="fixed bottom-5 left-5 top-5 hidden w-[248px] flex-col rounded-[28px] border border-white/80 bg-card p-5 shadow-card lg:flex">
        <div className="flex items-center gap-3">
          <Skeleton className="size-10 rounded-2xl" />
          <div className="space-y-1.5">
            <Skeleton className="h-3 w-24 rounded-full" />
            <Skeleton className="h-2 w-16 rounded-full" />
          </div>
        </div>
        <div className="mt-10 space-y-2">
          {Array.from({ length: 8 }).map((_, index) => (
            <Skeleton key={index} className="h-10 rounded-2xl" />
          ))}
        </div>
      </aside>
      <div className="lg:pl-[288px]">
        <div className="flex items-center justify-between px-5 py-3">
          <Skeleton className="h-11 w-full max-w-[430px] rounded-full" />
          <Skeleton className="size-10 rounded-full" />
        </div>
        <main className="mx-auto max-w-[1520px] px-4 pt-6 sm:px-6 lg:px-7">
          <Skeleton className="h-10 w-64 rounded-xl" />
          <Skeleton className="mt-2 h-4 w-96 max-w-full rounded-full" />
          <div className="mt-7 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-[160px] rounded-[26px]" />
            ))}
          </div>
          <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Skeleton className="h-[390px] rounded-[26px] lg:col-span-2" />
            <Skeleton className="h-[390px] rounded-[26px]" />
          </div>
        </main>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [navOpen, setNavOpen] = useState(false);
  const { data, isPending, isError } = useMe();

  // A failed auth check (stale/invalid session cookie) must not leave the
  // user on an eternal skeleton — send them to the login screen instead.
  useEffect(() => {
    if (isError) {
      router.replace("/login");
    }
  }, [isError, router]);

  if (isPending || isError || !data?.user) {
    return <ShellSkeleton />;
  }

  return (
    <div className="min-h-screen">
      <Sidebar />
      <MobileNav open={navOpen} onOpenChange={setNavOpen} />
      <div className="min-h-screen lg:pl-[288px]">
        <Topbar user={data.user} onOpenNav={() => setNavOpen(true)} />
        <main className="mx-auto w-full max-w-[1520px] px-4 pb-10 pt-4 sm:px-6 lg:px-7">
          {children}
        </main>
      </div>
    </div>
  );
}
