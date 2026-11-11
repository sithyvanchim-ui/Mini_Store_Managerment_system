import Link from "next/link";
import {
  BookOpen,
  ClipboardCheck,
  HandCoins,
  Keyboard,
  LifeBuoy,
  Package,
  Route,
  ScanBarcode,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";

const WORKFLOWS = [
  {
    icon: Package,
    title: "Restock the fridge",
    description:
      "Open Purchases, add a purchase with the supplier, quantities, and unit costs. Stock rises and every movement is written to the ledger.",
    link: { href: "/purchases", label: "Go to purchases" },
  },
  {
    icon: ScanBarcode,
    title: "Sell at the counter",
    description:
      "On Sales, tap products to build the cart, confirm the customer's ABA transfer, and complete the sale. The receipt is generated for you.",
    link: { href: "/sales", label: "Open the counter" },
  },
  {
    icon: ClipboardCheck,
    title: "Close the day",
    description:
      "Count the drawer, enter the ABA balance and expenses, then submit. You can resubmit the same date to correct a mistake.",
    link: { href: "/daily-check", label: "Daily check" },
  },
  {
    icon: HandCoins,
    title: "Fix stock by hand",
    description:
      "In Inventory, use Adjust stock to record waste, corrections, or missed restocks. Add a note so the audit trail stays clear.",
    link: { href: "/inventory", label: "Open inventory" },
  },
];

export default function HelpPage() {
  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Support"
        title="Help"
        description="The five-minute tour of MiniStore — what each area does and where daily work happens."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        {WORKFLOWS.map((workflow) => (
          <SectionCard
            key={workflow.title}
            className="flex flex-col justify-between"
          >
            <div className="flex items-start gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-mint text-brand-strong [&_svg]:size-5">
                <workflow.icon />
              </span>
              <div className="min-w-0">
                <h2 className="font-heading text-lg font-bold text-ink">
                  {workflow.title}
                </h2>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  {workflow.description}
                </p>
              </div>
            </div>
            <Link
              href={workflow.link.href}
              className="mt-4 inline-flex w-fit items-center gap-1.5 rounded-full border border-border px-4 py-2 text-xs font-bold text-brand-strong transition-colors hover:bg-mint hover:text-brand"
            >
              {workflow.link.label}
              <Route className="size-3.5" />
            </Link>
          </SectionCard>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard
          title="Where things live"
          description="The sidebar maps to the daily rhythm of the store."
          action={<BookOpen className="size-4 text-brand" />}
        >
          <ul className="space-y-3 text-sm">
            {[
              ["Overview", "Today's KPIs, seven-day revenue, and what needs attention first."],
              ["Inventory", "Products, prices, thresholds, the fridge map, and stock adjustments."],
              ["Sales", "The counter for selling, plus history, receipts, and voids (admin)."],
              ["Purchases", "Restock orders with supplier, costs, and quantities."],
              ["Stock", "Month-level position: value, movement ledger, and alerts."],
              ["Daily check", "ABA reconciliation — wallet balance vs. sales, one close per business date."],
              ["Suppliers", "Wholesaler contacts used by purchase orders."],
              ["Analytics", "Revenue, profit, payment mix, and staff performance."],
            ].map(([name, description]) => (
              <li key={name} className="flex gap-3">
                <span className="mt-1.5 size-2 shrink-0 rounded-full bg-brand" />
                <p className="text-muted-foreground">
                  <span className="font-bold text-ink">{name}</span> —{" "}
                  {description}
                </p>
              </li>
            ))}
          </ul>
        </SectionCard>

        <SectionCard
          title="Good to know"
          description="Rules the system enforces so the books stay clean."
          action={<Keyboard className="size-4 text-brand" />}
        >
          <ul className="space-y-3 text-sm text-muted-foreground">
            <li className="flex gap-3">
              <span className="mt-1.5 size-2 shrink-0 rounded-full bg-lavender" />
              <span>
                All amounts are whole <strong className="text-ink">KHR (៛)</strong> —
                no decimals to round.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="mt-1.5 size-2 shrink-0 rounded-full bg-lavender" />
              <span>
                Stock never goes below zero; the counter blocks selling what is
                not there.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="mt-1.5 size-2 shrink-0 rounded-full bg-lavender" />
              <span>
                Voiding a sale restores stock and writes reverse ledger
                movements.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="mt-1.5 size-2 shrink-0 rounded-full bg-lavender" />
              <span>
                One daily close per business date — submitting again updates the
                same record.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="mt-1.5 size-2 shrink-0 rounded-full bg-lavender" />
              <span>
                Demo logins: <code className="font-bold text-ink">admin@ministore.local</code> /{" "}
                <code className="font-bold text-ink">Admin123!</code> and{" "}
                <code className="font-bold text-ink">staff@ministore.local</code> /{" "}
                <code className="font-bold text-ink">Staff123!</code>
              </span>
            </li>
          </ul>
        </SectionCard>
      </div>

      <SectionCard
        title="Still stuck?"
        description="If something looks wrong, check that the API is running on port 8000 — the workspace proxies /api/v1/* to it."
        action={<LifeBuoy className="size-4 text-brand" />}
      >
        <p className="text-sm text-muted-foreground">
          Reload the page after restarting the services, and try the flows in
          this order once with demo data: restock → sell → close the day. If a
          number still looks off, compare it with the matching month in Stock —
          every report derives from the same ledger.
        </p>
      </SectionCard>
    </div>
  );
}
