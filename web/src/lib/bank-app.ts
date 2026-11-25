import type { PaymentMethod } from "@/types/api";

/**
 * Bank apps that can be opened straight from checkout. The KHQR payload is
 * passed to the app so it opens on the exact amount that is due.
 */
export const BANK_APP_SCHEMES: Partial<Record<PaymentMethod, string>> = {
  aba_khqr: "aba",
  acleda: "acleda",
};

export const BANK_APP_NAMES: Partial<Record<PaymentMethod, string>> = {
  aba_khqr: "ABA",
  acleda: "ACLEDA",
};

/** Deep link that hands the KHQR payload to the chosen bank app. */
export function buildBankAppLink(
  method: PaymentMethod,
  qr: string,
): string | null {
  const scheme = BANK_APP_SCHEMES[method];
  if (!scheme) return null;
  return `${scheme}://pay?qr=${encodeURIComponent(qr)}`;
}

/** True when the page is running on a phone or tablet. */
export function isMobileBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}
