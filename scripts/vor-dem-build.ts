/**
 * Läuft vor jedem Build auf Netlify oder Vercel (`npm run bereitstellen`):
 * 1. prüft die Umgebungsvariablen und nennt fehlende beim Namen,
 * 2. bringt die Datenbank auf den aktuellen Stand (Migrationen),
 * 3. füllt eine leere Datenbank einmalig mit Sortiment und Starteinstellungen.
 * Eine bereits gefüllte Datenbank wird nicht angefasst – Preise und Texte aus dem Admin bleiben erhalten.
 */
import { config } from "dotenv";
config({ path: ".env.local" });
config();

import { spawnSync } from "node:child_process";
import { sql } from "drizzle-orm";

const PFLICHT: [string, string][] = [
  ["DATABASE_URL", "Verbindung zur Postgres-Datenbank (Neon: die gepoolte URL)"],
  ["AUTH_SECRET", "zufällige Zeichenkette für die Admin-Anmeldung"],
  ["ADMIN_EMAILS", "E-Mail-Adresse(n), die sich im Admin anmelden dürfen"],
  ["NEXT_PUBLIC_SITE_URL", "Adresse der Website, z. B. https://www.dankeskiste.de"],
];
const BETRIEB: [string, string][] = [
  ["STRIPE_SECRET_KEY", "ohne ihn kann niemand bezahlen"],
  ["STRIPE_WEBHOOK_SECRET", "ohne ihn werden bezahlte Bestellungen nicht als bezahlt erkannt"],
  ["RESEND_API_KEY", "ohne ihn gehen keine Mails raus (auch kein Admin-Login)"],
  ["MAIL_FROM", "Absender der Mails"],
  ["OWNER_EMAIL", "Empfänger der Bestell-Benachrichtigungen"],
];

function pruefeUmgebung() {
  const fehlt = PFLICHT.filter(([name]) => !process.env[name]?.trim());
  if (fehlt.length) {
    console.error("\nDer Build wurde angehalten. Diese Umgebungsvariablen fehlen:\n");
    for (const [name, wozu] of fehlt) console.error(`  ${name} – ${wozu}`);
    console.error("\nBitte beim Hoster unter „Environment variables“ eintragen und neu bereitstellen. Details: LIVEGANG.md\n");
    process.exit(1);
  }
  const url = process.env.NEXT_PUBLIC_SITE_URL!.trim();
  if (!/^https?:\/\/[^/]+$/.test(url)) {
    console.error(`\nNEXT_PUBLIC_SITE_URL muss mit https:// beginnen und ohne Schrägstrich enden (ist: „${url}“).\n`);
    process.exit(1);
  }
  const offen = BETRIEB.filter(([name]) => !process.env[name]?.trim());
  if (offen.length) {
    console.warn("\nHinweis – noch nicht gesetzt (die Seite baut, verkauft aber noch nicht vollständig):");
    for (const [name, wozu] of offen) console.warn(`  ${name} – ${wozu}`);
  }
  const key = process.env.STRIPE_SECRET_KEY ?? "";
  if (key.startsWith("sk_test_")) console.warn("\nStripe läuft im TESTMODUS – es wird kein echtes Geld bewegt.");
  if (key.startsWith("sk_live_")) console.warn("\nStripe läuft im LIVE-Modus.");
  console.warn("");
}

async function main() {
  pruefeUmgebung();
  const { db, pool } = await import("../db/index");
  const { migrate } = await import("drizzle-orm/node-postgres/migrator");
  await migrate(db, { migrationsFolder: "db/migrations" });
  console.log("Datenbank: Tabellen sind auf dem aktuellen Stand.");
  const [{ n }] = (await db.execute(sql`select count(*)::int as n from boxes`)).rows as { n: number }[];
  await pool.end();
  if (n > 0) {
    console.log(`Datenbank: ${n} Boxen vorhanden – Sortiment bleibt unverändert.`);
    return;
  }
  console.log("Datenbank ist leer – Sortiment und Starteinstellungen werden eingespielt …");
  const lauf = spawnSync("npx", ["tsx", "db/seed.ts"], { stdio: "inherit" });
  if (lauf.status !== 0) process.exit(lauf.status ?? 1);
}

main().catch((e) => {
  console.error("\nDie Datenbank konnte nicht vorbereitet werden. Stimmt DATABASE_URL?\n");
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
