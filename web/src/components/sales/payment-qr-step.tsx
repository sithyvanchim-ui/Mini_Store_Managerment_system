"use client";

import type { ReactNode } from "react";
import {
  Banknote,
  Landmark,
  Loader2,
  QrCode,
  Smartphone,
  Wallet,
} from "lucide-react";
import { KhqrImage } from "@/components/sales/khqr-image";
import {
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api";
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

/** The checkout channels, in the order the ABA app shows them. */
export const PAYMENT_METHODS: Array<{
  value: PaymentMethod;
  label: string;
  hint: string;
  icon: ReactNode;
}> = [
  {
    value: "aba_khqr",
    label: "ABA KHQR",
    hint: "Scan with ABA Mobile",
    icon: <QrCode />,
  },
  {
    value: "alipay",
    label: "Alipay",
    hint: "Alipay wallet only",
    icon: <Smartphone />,
  },
  {
    value: "card",
    label: "Credit / Debit Card",
    hint: "Visa, Mastercard, UnionPay, and JCB",
    icon: <Banknote />,
  },
  {
    value: "pi_pay",
    label: "Pi Pay",
    hint: "Pi Pay Wallet",
    icon: <Wallet />,
  },
  {
    value: "acleda",
    label: "ACLEDA",
    hint: "Pay via ACLEDA mobile",
    icon: <Landmark />,
  },
];

/** Scan instruction shown under the QR, per chosen method. */
const QR_HINTS: Record<PaymentMethod, string> = {
  aba_khqr:
    "Scan with any bank app — KHQR works with ABA, ACLEDA, and every KHQR bank.",
  alipay: "Open Alipay and scan this QR to pay.",
  card: "The buyer scans this QR with their bank app to pay the exact amount.",
  pi_pay: "Open Pi Pay and scan this QR to pay.",
  acleda: "Open ACLEDA mobile and scan this QR to pay.",
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

  return (
    <>
      <DialogHeader>
        <DialogTitle className="font-heading text-xl font-black text-ink">
          {PAYMENT_LABELS[payMethod]} · {formatKHR(total)}
        </DialogTitle>
        <DialogDescription>
          The buyer scans this QR to pay the exact amount — it is locked to{" "}
          {formatKHR(total)}.
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

      <div className="flex items-center justify-between gap-3 pt-2">
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
