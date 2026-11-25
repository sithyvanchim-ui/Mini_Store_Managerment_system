"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { Landmark, Loader2, QrCode } from "lucide-react";
import { KhqrImage } from "@/components/sales/khqr-image";
import {
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api";
import {
  BANK_APP_NAMES,
  buildBankAppLink,
  isMobileBrowser,
} from "@/lib/bank-app";
import { formatKHR } from "@/lib/utils";
import { usePaymentKhqr } from "@/hooks/use-sales";
import type { PaymentMethod } from "@/types/api";

export const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  aba_khqr: "ABA KHQR",
  alipay: "Alipay",
  card: "Credit / Debit Card",
  pi_pay: "Pi Pay",
  acleda: "ACLEDA",
};

/** The bank apps a buyer can pay from. Checkout opens the chosen one. */
export const PAYMENT_METHODS: Array<{
  value: PaymentMethod;
  label: string;
  hint: string;
  icon: ReactNode;
}> = [
  {
    value: "aba_khqr",
    label: "ABA KHQR",
    hint: "Opens ABA Mobile to pay",
    icon: <QrCode />,
  },
  {
    value: "acleda",
    label: "ACLEDA",
    hint: "Opens ACLEDA Mobile to pay",
    icon: <Landmark />,
  },
];

/** Scan instruction shown under the QR, per chosen method. */
const QR_HINTS: Record<PaymentMethod, string> = {
  aba_khqr:
    "ABA Mobile opens automatically on your phone. If it did not, scan this QR or tap Open ABA app.",
  alipay: "Open Alipay and scan this QR to pay.",
  card: "The buyer scans this QR with their bank app to pay the exact amount.",
  pi_pay: "Open Pi Pay and scan this QR to pay.",
  acleda:
    "ACLEDA Mobile opens automatically on your phone. If it did not, scan this QR or tap Open ACLEDA app.",
};

/**
 * Second step of the payment dialog: shows a KHQR locked to the exact
 * amount and waits for the buyer's transfer. Shared by the POS and the
 * customer storefront.
 */
export function PaymentQrStep({
  total,
  payMethod,
  onBack,
  onPaid,
  paying,
  confirmLabel = "Payment received — complete sale",
  skipLabel,
}: {
  total: number;
  payMethod: PaymentMethod;
  onBack: () => void;
  onPaid: () => void;
  paying: boolean;
  confirmLabel?: string;
  skipLabel?: string;
}) {
  const khqrQuery = usePaymentKhqr(total);
  const qr = khqrQuery.data?.qr;
  const notConfigured =
    khqrQuery.error instanceof ApiError && khqrQuery.error.status === 409;

  const bankLink = qr ? buildBankAppLink(payMethod, qr) : null;
  const bankName = BANK_APP_NAMES[payMethod];
  const launchedQr = useRef<string | null>(null);

  // Jump straight into the buyer's bank app as soon as the amount-locked
  // QR is ready. Phones can hand off to the app; desktop browsers cannot, so
  // they keep the QR and the manual button instead (auto window.open during
  // commit also trips React's scheduler).
  useEffect(() => {
    if (!bankLink || !qr || launchedQr.current === qr) return;
    launchedQr.current = qr;
    if (!isMobileBrowser()) return;
    window.location.href = bankLink;
  }, [bankLink, qr]);

  return (
    <>
      <DialogHeader>
        <DialogTitle className="font-heading text-xl font-black text-ink">
          {PAYMENT_LABELS[payMethod]} · {formatKHR(total)}
        </DialogTitle>
        <DialogDescription>
          The buyer&apos;s {bankName ?? "bank"} app opens with this exact amount
          already filled in — it is locked to {formatKHR(total)}.
        </DialogDescription>
      </DialogHeader>

      <div className="flex flex-col items-center gap-3 py-2">
        {notConfigured ? (
          <div className="w-full rounded-2xl bg-warning/10 px-4 py-3 text-center text-xs font-medium text-ink">
            No KHQR account is set up yet, so no QR can be shown. Admins can
            paste one in Settings → KHQR payment account.
          </div>
        ) : qr ? (
          <>
            <div className="rounded-2xl border border-border/70 bg-white p-3">
              <KhqrImage value={qr} size={216} />
            </div>
            <p className="text-center text-xs leading-5 text-muted-foreground">
              {QR_HINTS[payMethod]}
            </p>
          </>
        ) : khqrQuery.isError ? (
          <p className="text-xs font-medium text-destructive">
            The payment QR could not be loaded. You can still pay after
            confirming the transfer on the buyer&apos;s phone.
          </p>
        ) : (
          <Loader2 className="size-8 animate-spin text-brand" />
        )}

        <p className="text-center font-heading text-2xl font-black text-ink">
          {formatKHR(total)}
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        {bankLink && bankName ? (
          <Button
            asChild
            variant="outline"
            className="rounded-full text-xs font-bold"
          >
            <a href={bankLink} target="_blank" rel="noopener noreferrer">
              Open {bankName} app
            </a>
          </Button>
        ) : null}
        <Button
          type="button"
          variant="outline"
          className="rounded-full text-xs font-bold"
          onClick={onBack}
          disabled={paying}
        >
          Back
        </Button>
        <Button
          type="button"
          className="rounded-full text-xs font-bold"
          onClick={onPaid}
          disabled={paying}
        >
          {paying
            ? "Charging…"
            : notConfigured
              ? (skipLabel ?? `Skip QR — charge ${formatKHR(total)}`)
              : confirmLabel}
        </Button>
      </div>
    </>
  );
}
