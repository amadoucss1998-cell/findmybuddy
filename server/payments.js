import { randomBytes } from "node:crypto";
import { config } from "./config.js";

export const METHODS = {
  orange: { name: "Orange Money", short: "OM", color: "#FF7900" },
  mtn: { name: "MTN MoMo", short: "MoMo", color: "#FFCC00" },
  card: { name: "Card", short: "VISA", color: "#1A1F71" },
  cash: { name: "Cash (USD / LRD)", short: "$", color: "#16A34A" },
  wallet: { name: "LoneStar credit", short: "LS", color: "#1E4FD8" },
};

export class PaymentError extends Error {
  constructor(message, statusCode = 402) {
    super(message);
    this.statusCode = statusCode;
  }
}

// Collects money from a customer. Returns { status, providerRef }.
// - cash: nothing is collected in-app; the payment is "due" to the Tasker.
// - sandbox mode: mobile money / card succeed immediately (for development & demos).
// - live mode: requires merchant integrations with Orange Money / MTN MoMo,
//   which need credentials issued to a registered Liberian business.
export async function collect({ method, amountCents, phone }) {
  if (!METHODS[method] || method === "wallet") throw new PaymentError(`Unsupported payment method "${method}"`, 400);
  if (method === "cash") return { status: "due", providerRef: null };
  if (amountCents === 0) return { status: "succeeded", providerRef: null };
  if (config.payments.mode === "sandbox") {
    return { status: "succeeded", providerRef: `sbx_${method}_${randomBytes(6).toString("hex")}` };
  }
  // Live integrations plug in here (Orange Money Web Payment API, MTN MoMo Collections
  // requestToPay). They are intentionally not faked: fail loudly until configured.
  throw new PaymentError(`Live ${METHODS[method].name} payments are not configured yet for ${phone}`, 501);
}
