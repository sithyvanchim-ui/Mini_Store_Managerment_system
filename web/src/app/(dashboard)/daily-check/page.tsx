"use client";

import { Lock } from "lucide-react";
import { DailyCloseForm } from "@/components/daily-check/daily-close-form";
import { DailyCloseHistory } from "@/components/daily-check/daily-close-history";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { EmptyState } from "@/components/shared/empty-state";
import { useMe } from "@/hooks/use-me";

export default function DailyCheckPage() {
  const me = useMe();
  const isAdmin = me.data?.user.role === "admin";

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Register"
        title="Daily check"
        description="Count the drawer, balance ABA, and archive the day. Submitting again updates the same business date."
      />
      {isAdmin ? (
        <DailyCloseForm />
      ) : (
        <SectionCard
          title="Today's check"
          description="Only admins can submit the daily reconciliation."
          bodyClassName="p-4 sm:p-5"
        >
          <EmptyState
            icon={<Lock />}
            title="Admins only"
            description="Your account has view-only access. You can review the close history below."
          />
        </SectionCard>
      )}
      <DailyCloseHistory />
    </div>
  );
}
