"use client";

import {
  formatDateTime,
  formatKHR,
  formatNumber,
} from "@/lib/utils";
import type { Sale } from "@/types/api";

interface ReceiptProps {
  sale: Sale;
  storeName?: string;
  dormName?: string;
  footer?: string;
}

export function Receipt({
  sale,
  storeName = "MiniStore",
  dormName,
  footer = "Thank you!",
}: ReceiptProps) {
  return (
    <div className="print-receipt mx-auto w-full max-w-[360px] bg-white px-1 py-2 text-ink">
      <div className="text-center">
        <p className="font-heading text-xl font-extrabold tracking-tight">
          {storeName}
        </p>
        {dormName ? (
          <p className="mt-0.5 text-[11px] text-muted-foreground">{dormName}</p>
        ) : null}
        <p className="mt-2 text-[11px] font-semibold">SALES RECEIPT</p>
      </div>

      <div className="my-4 border-t border-dashed border-border" />

      <dl className="space-y-1 text-[11px]">
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">Reference</dt>
          <dd className="font-semibold">{sale.reference}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">Date</dt>
          <dd className="text-right font-medium">
            {formatDateTime(sale.created_at, "MMM d, yyyy · h:mm a")}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">Staff</dt>
          <dd className="font-medium">{sale.sold_by_name}</dd>
        </div>
      </dl>

      <div className="my-4 border-t border-dashed border-border" />

      <div className="space-y-2.5">
        {sale.items.map((item, index) => (
          <div key={`${item.product_id}-${index}`} className="text-[11px]">
            <div className="flex items-start justify-between gap-3">
              <span className="font-semibold leading-4">{item.product_name}</span>
              <span className="shrink-0 font-semibold">
                {formatKHR(item.line_total)}
              </span>
            </div>
            <p className="mt-0.5 text-[10px] text-muted-foreground">
              {formatNumber(item.quantity)} × {formatKHR(item.unit_price)}
              {item.product_code ? ` · ${item.product_code}` : ""}
            </p>
          </div>
        ))}
      </div>

      <div className="my-4 border-t border-dashed border-border" />

      <dl className="space-y-1.5 text-[11px]">
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">Subtotal</dt>
          <dd>{formatKHR(sale.subtotal)}</dd>
        </div>
        {sale.discount > 0 ? (
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Discount</dt>
            <dd>-{formatKHR(sale.discount)}</dd>
          </div>
        ) : null}
        <div className="flex justify-between gap-4 pt-1 text-sm font-extrabold">
          <dt>Total</dt>
          <dd>{formatKHR(sale.total)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">Payment</dt>
          <dd className="font-semibold">ABA</dd>
        </div>
      </dl>

      {sale.notes ? (
        <p className="mt-3 rounded-lg bg-muted/60 px-2.5 py-2 text-[10px] leading-4 text-muted-foreground">
          {sale.notes}
        </p>
      ) : null}

      <div className="my-4 border-t border-dashed border-border" />

      <p className="text-center text-[11px] font-semibold text-brand-strong">
        {footer}
      </p>
      <p className="mt-1 text-center text-[9px] text-muted-foreground">
        {sale.status === "voided" ? "VOIDED SALE" : "Thank you for shopping with us"}
      </p>
    </div>
  );
}

/**
 * Scopes the browser print output to the receipt only. Injected by the
 * receipt dialog so screens and dialogs around it never land on paper.
 */
export function ReceiptPrintStyles() {
  return (
    <style>{`
      @media print {
        @page { margin: 10mm; }
        body * { visibility: hidden !important; }
        .print-receipt, .print-receipt * { visibility: visible !important; }
        .print-receipt {
          position: static !important;
          width: 100% !important;
          max-width: 80mm !important;
          margin: 0 auto !important;
          padding: 0 !important;
          box-shadow: none !important;
          border: 0 !important;
        }
        .no-print { display: none !important; }
      }
    `}</style>
  );
}
