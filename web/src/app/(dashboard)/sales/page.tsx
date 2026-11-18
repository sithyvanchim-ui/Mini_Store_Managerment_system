"use client";

import { useState } from "react";
import { Lock } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { EmptyState } from "@/components/shared/empty-state";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { PosScreen } from "@/components/sales/pos-screen";
import { SalesHistory } from "@/components/sales/sales-history";
import { useMe } from "@/hooks/use-me";

export default function SalesPage() {
  const me = useMe();
  const isAdmin = me.data?.user.role === "admin";
  const [tab, setTab] = useState("pos");

  return (
    <Tabs value={tab} onValueChange={setTab} className="space-y-5">
      <PageHeader
        eyebrow="Counter"
        title="Sales"
        description="Ring up dorm essentials in seconds, settle by ABA, and review every receipt."
        actions={
          <TabsList className="h-11 rounded-full border border-border/70 bg-card p-1 shadow-soft">
            <TabsTrigger
              value="pos"
              className="h-full rounded-full px-5 text-xs font-bold data-active:bg-brand data-active:text-white data-active:shadow-sm"
            >
              Point of sale
            </TabsTrigger>
            <TabsTrigger
              value="history"
              className="h-full rounded-full px-5 text-xs font-bold data-active:bg-brand data-active:text-white data-active:shadow-sm"
            >
              Sales history
            </TabsTrigger>
          </TabsList>
        }
      />

      <TabsContent value="pos" className="mt-0">
        {isAdmin ? (
          <PosScreen />
        ) : (
          <SectionCard
            title="Point of sale"
            description="Only admins can charge sales."
            bodyClassName="p-4 sm:p-5"
          >
            <EmptyState
              icon={<Lock />}
              title="Admins only"
              description="Your account has view-only access. Ask an admin to record the sale, or watch it appear in the sales history."
            />
          </SectionCard>
        )}
      </TabsContent>
      <TabsContent value="history" className="mt-0">
        <SalesHistory />
      </TabsContent>
    </Tabs>
  );
}
