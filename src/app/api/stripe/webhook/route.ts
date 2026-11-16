import type Stripe from "stripe";
import { verarbeiteStripeEvent } from "@/lib/server/bestellungen";
import { stripe } from "@/lib/server/stripe";

/**
 * Stripe-Webhook. Die Signatur wird am unveränderten Rohtext geprüft; jedes Event wird
 * höchstens einmal verarbeitet. Bei einem Fehler antworten wir mit 500, damit Stripe erneut zustellt.
 */
export async function POST(request: Request) {
  const geheimnis = process.env.STRIPE_WEBHOOK_SECRET;
  const signatur = request.headers.get("stripe-signature");
  if (!geheimnis || !signatur) return new Response("Signatur fehlt", { status: 400 });
  const rohtext = await request.text();
  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(rohtext, signatur, geheimnis);
  } catch {
    return new Response("Ungültige Signatur", { status: 400 });
  }
  try {
    const neu = await verarbeiteStripeEvent(event);
    return Response.json({ empfangen: true, bereitsVerarbeitet: !neu });
  } catch (e) {
    console.error("[stripe-webhook]", event.type, e);
    return new Response("Verarbeitung fehlgeschlagen", { status: 500 });
  }
}
