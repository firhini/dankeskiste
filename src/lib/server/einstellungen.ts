import "server-only";
import { eq } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { db, schema } from "../../../db";
import { einstellungenSchema, startEinstellungen, type Einstellungen } from "../einstellungen";

function lese(wert: unknown): Einstellungen {
  // Fehlende Felder (z. B. nach einem Update) mit Startwerten auffüllen
  const roh = (wert ?? {}) as Record<string, unknown>;
  const zusammen: Record<string, unknown> = { ...startEinstellungen };
  for (const k of Object.keys(startEinstellungen) as (keyof Einstellungen)[]) {
    const v = roh[k];
    if (v !== undefined) {
      zusammen[k] = typeof v === "object" && v !== null && !Array.isArray(v) ? { ...(startEinstellungen[k] as object), ...(v as object) } : v;
    }
  }
  const ergebnis = einstellungenSchema.safeParse(zusammen);
  return ergebnis.success ? ergebnis.data : startEinstellungen;
}

/** Immer frisch aus der Datenbank – für Checkout, Webhook und Admin. */
export async function ladeEinstellungenFrisch(): Promise<Einstellungen> {
  const [zeile] = await db.select().from(schema.settings).where(eq(schema.settings.id, "main"));
  return lese(zeile?.wert);
}

/** Gecacht für Shop-Seiten; wird nach Änderungen im Admin per Tag verworfen. */
export async function ladeEinstellungen(): Promise<Einstellungen> {
  "use cache";
  cacheTag("einstellungen");
  cacheLife("hours");
  return ladeEinstellungenFrisch();
}

export async function speichereEinstellungen(neu: Einstellungen): Promise<void> {
  const wert = einstellungenSchema.parse(neu);
  await db
    .insert(schema.settings)
    .values({ id: "main", wert })
    .onConflictDoUpdate({ target: schema.settings.id, set: { wert, updatedAt: new Date() } });
}
