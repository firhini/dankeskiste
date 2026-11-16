import "server-only";
import Stripe from "stripe";

let client: Stripe | null = null;

/**
 * Stripe-Client. `STRIPE_API_BASE` (z. B. http://localhost:4010) leitet auf den lokalen
 * Stripe-Nachbau für E2E-Tests um – das greift ausschließlich mit Test-Schlüsseln (sk_test_…),
 * niemals mit Live-Schlüsseln.
 */
export function stripe(): Stripe {
  if (client) return client;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY ist nicht gesetzt.");
  const basis = process.env.STRIPE_API_BASE;
  if (basis && key.startsWith("sk_test_")) {
    const url = new URL(basis);
    client = new Stripe(key, {
      host: url.hostname,
      port: url.port || (url.protocol === "https:" ? 443 : 80),
      protocol: url.protocol === "https:" ? "https" : "http",
      maxNetworkRetries: 0,
      telemetry: false,
    });
  } else {
    client = new Stripe(key, { maxNetworkRetries: 2, telemetry: false, appInfo: { name: "Dankeskiste" } });
  }
  return client;
}

export function stripeKonfiguriert(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export const RECHNUNG_FUSS = "Gemäß § 19 UStG wird keine Umsatzsteuer berechnet.";
