"use client";

import { ShieldCheck } from "lucide-react";
import { useMe } from "@/hooks/use-me";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { TeamSection } from "@/components/settings/team-section";

export default function UsersPage() {
  const me = useMe();
  const isAdmin = me.data?.user.role === "admin";

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Settings"
        title="Team"
        description="Manage who can open the store and what they are allowed to do."
      />
      {isAdmin ? (
        <TeamSection />
      ) : (
        <EmptyState
          icon={<ShieldCheck />}
          title="Admins only"
          description="Only admins can manage team accounts."
        />
      )}
    </div>
  );
}
