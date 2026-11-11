import { DailyCloseForm } from "@/components/daily-check/daily-close-form";
import { DailyCloseHistory } from "@/components/daily-check/daily-close-history";
import { PageHeader } from "@/components/shared/page-header";

export default function DailyCheckPage() {
  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Register"
        title="Daily check"
        description="Count the drawer, balance ABA, and archive the day. Submitting again updates the same business date."
      />
      <DailyCloseForm />
      <DailyCloseHistory />
    </div>
  );
}
