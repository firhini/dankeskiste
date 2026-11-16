import "server-only";
import { createHash } from "node:crypto";
import { lt, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { db, schema } from "../../../db";

/**
 * Zählt Anfragen je Schlüssel und Zeitfenster in Postgres (funktioniert auch auf Serverless).
 * Gespeichert wird nur ein gesalzener Hash der IP; abgelaufene Fenster werden gelöscht.
 */
export async function rateLimit(bereich: string, limit: number, fensterSekunden: number): Promise<{ ok: boolean; rest: number }> {
  const h = await headers();
  const ip = (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || h.get("x-real-ip") || "unbekannt";
  const salz = process.env.AUTH_SECRET ?? "dankeskiste";
  const schluessel = `${bereich}:${createHash("sha256").update(`${salz}:${ip}`).digest("base64url").slice(0, 22)}`;
  const jetzt = Date.now();
  const fenster = new Date(Math.floor(jetzt / (fensterSekunden * 1000)) * fensterSekunden * 1000);
  const [zeile] = await db
    .insert(schema.rateLimits)
    .values({ schluessel, fenster, anzahl: 1 })
    .onConflictDoUpdate({ target: [schema.rateLimits.schluessel, schema.rateLimits.fenster], set: { anzahl: sql`${schema.rateLimits.anzahl} + 1` } })
    .returning({ anzahl: schema.rateLimits.anzahl });
  if (Math.random() < 0.02) {
    await db.delete(schema.rateLimits).where(lt(schema.rateLimits.fenster, new Date(jetzt - 86_400_000))).catch(() => {});
  }
  return { ok: zeile.anzahl <= limit, rest: Math.max(0, limit - zeile.anzahl) };
}

export function zuVieleAnfragen(): Response {
  return Response.json({ fehler: "Zu viele Anfragen. Bitte versuchen Sie es in ein paar Minuten noch einmal." }, { status: 429 });
}
