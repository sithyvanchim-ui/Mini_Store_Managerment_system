import crypto from "node:crypto";

const WEBHOOK_SECRET = process.env.PAYMENT_WEBHOOK_SECRET;
const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const ABA_ACCOUNT_ID = "019449489";

/** Deep-link schemes for the bank apps the POS can hand a payment to. */
const BANK_APP_SCHEMES = {
  aba: "aba",
  acleda: "acleda"
};

export function createReference() {
  return `POS-${Date.now()}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
}

/**
 * The MiniStore POS uses the ABA account `019449489` as the merchant account.
 * This provider returns a KHQR-style payment payload plus a deep link that
 * opens the chosen bank app (ABA or ACLEDA) on the exact amount.
 */
export async function createPayment({ order, provider }) {
  const scheme = BANK_APP_SCHEMES[provider];

  if (!scheme) {
    throw new Error(
      `Unsupported payment provider: ${provider}. Choose "aba" or "acleda".`
    );
  }

  const providerReference = `${provider.toUpperCase()}_${crypto
    .randomBytes(8)
    .toString("hex")
    .toUpperCase()}`;

  const qrContent = JSON.stringify({
    v: "1",
    account: ABA_ACCOUNT_ID,
    currency: order.currency,
    amount: order.total_cents / 100,
    merchant: "MiniStore POS",
    reference: order.reference
  });

  return {
    provider,
    providerReference,
    qrContent,
    appLink: `${scheme}://pay?qr=${encodeURIComponent(qrContent)}`,
    checkoutUrl: `${BASE_URL}/pay/${order.reference}`
  };
}

/**
 * Verify the provider webhook.
 */
export function verifyWebhookSignature(rawBody, signature) {
  if (!signature) return false;

  const expected = crypto
    .createHmac("sha256", WEBHOOK_SECRET)
    .update(rawBody)
    .digest("hex");

  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected),
      Buffer.from(signature)
    );
  } catch {
    return false;
  }
}
