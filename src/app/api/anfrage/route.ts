import { z } from "zod";
import { sendeMail } from "@/lib/server/mail";
import { anfrageMailInhaber, anfrageMailKunde } from "@/lib/server/mails";
import { rateLimit, zuVieleAnfragen } from "@/lib/server/ratelimit";
import { db, schema } from "../../../../db";

const anfrageSchema = z.object({
  art: z.enum(["angebot", "musterbox"]).default("angebot"),
  firma: z.string().trim().min(2, "Bitte nennen Sie Ihre Firma.").max(120),
  name: z.string().trim().min(2, "Bitte nennen Sie Ihren Namen.").max(120),
  email: z.string().trim().toLowerCase().email("Bitte geben Sie eine gültige E-Mail-Adresse an.").max(160),
  telefon: z.string().trim().max(40).default(""),
  menge: z.string().trim().max(60).default(""),
  nachricht: z.string().trim().max(3000).default(""),
  b2b: z.literal(true, { message: "Bitte bestätigen Sie, dass Sie als Unternehmer anfragen." }),
  kampagne: z.string().max(80).optional(),
  website: z.string().optional(),
});

export async function POST(request: Request) {
  const limit = await rateLimit("anfrage", 5, 900);
  if (!limit.ok) return zuVieleAnfragen();
  const roh = await request.json().catch(() => null);
  const ergebnis = anfrageSchema.safeParse(roh);
  if (!ergebnis.success) {
    const felder: Record<string, string> = {};
    for (const i of ergebnis.error.issues) felder[String(i.path[0])] ??= i.message;
    return Response.json({ fehler: "Bitte prüfen Sie die markierten Felder.", felder }, { status: 422 });
  }
  const a = ergebnis.data;
  // Honeypot: Bots bekommen eine Erfolgsmeldung, gespeichert wird nichts
  if (a.website) return Response.json({ ok: true });
  await db.insert(schema.inquiries).values({ art: a.art, firma: a.firma, name: a.name, email: a.email, telefon: a.telefon, menge: a.menge, nachricht: a.nachricht, kampagne: a.kampagne ?? null });
  if (process.env.OWNER_EMAIL) await sendeMail({ an: process.env.OWNER_EMAIL, art: "anfrage-inhaber", antwortAn: a.email, ...anfrageMailInhaber(a) });
  await sendeMail({ an: a.email, art: "anfrage-kunde", antwortAn: process.env.OWNER_EMAIL, ...anfrageMailKunde(a) });
  return Response.json({ ok: true });
}
