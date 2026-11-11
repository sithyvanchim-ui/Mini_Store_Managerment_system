"use client";

import { useMe } from "@/hooks/use-me";
import { PageHeader } from "@/components/shared/page-header";
import { ProfileSection } from "@/components/settings/profile-section";
import { StoreSettingsForm } from "@/components/settings/store-settings-form";
import { TeamSection } from "@/components/settings/team-section";

export default function SettingsPage() {
  const me = useMe();
  const isAdmin = me.data?.user.role === "admin";

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Workspace"
        title="Settings"
        description="Store details, your profile, and the team that runs the fridge."
      />

      <div className="grid gap-4 xl:grid-cols-2">
        <StoreSettingsForm readOnly={!isAdmin} />
        <div className="space-y-4">
          <ProfileSection />
        </div>
      </div>

      {isAdmin ? <TeamSection /> : null}
    </div>
  );
}
