import { z } from "zod";
import { BestellFehler, checkoutSchema, erstelleCheckout } from "@/lib/server/bestellungen";
import { rateLimit, zuVieleAnfragen } from "@/lib/server/ratelimit";

export async function POST(request: Request) {
  const limit = await rateLimit("checkout", 12, 600);
  if (!limit.ok) return zuVieleAnfragen();
  let roh: unknown;
  try {
    roh = await request.json();
  } catch {
    return Response.json({ fehler: "Die Anfrage war nicht lesbar." }, { status: 400 });
  }
  const eingabe = checkoutSchema.safeParse(roh);
  if (!eingabe.success) {
    // Honeypot gefüllt → wie ein gewöhnlicher Fehler behandeln, ohne Details zu verraten
    const meldungen = [...new Set(eingabe.error.issues.map((i: z.core.$ZodIssue) => (i.path[0] === "website" ? "Die Bestellung konnte nicht angelegt werden." : i.message)))].slice(0, 8);
    return Response.json({ meldungen }, { status: 422 });
  }
  try {
    const { url, nummer } = await erstelleCheckout(eingabe.data);
    return Response.json({ url, nummer });
  } catch (e) {
    if (e instanceof BestellFehler) return Response.json({ meldungen: e.meldungen }, { status: e.status });
    console.error("[checkout]", e);
    return Response.json({ fehler: "Die Bestellung konnte gerade nicht angelegt werden. Bitte versuchen Sie es in ein paar Minuten noch einmal oder nutzen Sie das Anfrageformular." }, { status: 500 });
  }
}
