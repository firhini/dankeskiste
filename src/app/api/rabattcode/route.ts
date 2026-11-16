import { pruefeRabattCode } from "@/lib/server/bestellungen";
import { rateLimit, zuVieleAnfragen } from "@/lib/server/ratelimit";

export async function POST(request: Request) {
  // Enges Limit gegen Durchprobieren von Codes
  const limit = await rateLimit("rabattcode", 10, 600);
  if (!limit.ok) return zuVieleAnfragen();
  const daten = (await request.json().catch(() => null)) as { code?: unknown } | null;
  if (!daten || typeof daten.code !== "string") return Response.json({ fehler: "Bitte geben Sie einen Code ein." }, { status: 400 });
  const ergebnis = await pruefeRabattCode(daten.code);
  if (!ergebnis.ok) return Response.json({ fehler: ergebnis.grund }, { status: 404 });
  return Response.json({ code: ergebnis.code, art: ergebnis.art, wert: ergebnis.wert });
}
