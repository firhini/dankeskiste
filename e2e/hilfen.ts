import { readdirSync, readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { expect, type Page } from "@playwright/test";
import { Client } from "pg";

export const OUTBOX = path.join(process.cwd(), ".mail-outbox");
export const STRIPE = `http://localhost:${process.env.FAKE_STRIPE_PORT ?? 4010}`;

export async function sql<T = Record<string, unknown>>(text: string, werte: unknown[] = []): Promise<T[]> {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    return (await client.query(text, werte)).rows as T[];
  } finally {
    await client.end();
  }
}

export function mails(art?: string): { an: string; betreff: string; text: string; html: string; art: string; orderId?: string }[] {
  if (!existsSync(OUTBOX)) return [];
  return readdirSync(OUTBOX)
    .sort()
    .map((f) => JSON.parse(readFileSync(path.join(OUTBOX, f), "utf8")))
    .filter((m) => !art || m.art === art);
}

/** „237,90 €“ → 23790 */
export function cent(text: string | null): number {
  const m = (text ?? "").replace(/ /g, " ").match(/(−|-)?\s*([\d.]+)(?:,(\d{2}))?\s*€/);
  if (!m) throw new Error(`Kein Betrag in „${text}“`);
  return (m[1] ? -1 : 1) * (Number(m[2].replace(/\./g, "")) * 100 + Number(m[3] ?? 0));
}

/** Klickt den sichtbaren „Weiter“-Knopf (unten in der Leiste am Handy, rechts am Desktop). */
export async function weiter(page: Page) {
  await page.locator("button:visible", { hasText: /^Weiter/ }).first().click();
}

export async function summe(page: Page): Promise<number> {
  const handy = (page.viewportSize()?.width ?? 1000) < 1024;
  const ort = handy ? page.locator("[aria-live='polite']").first() : page.getByTestId("summe").first();
  return cent(await ort.textContent());
}

export async function setzeMenge(page: Page, slug: string, menge: number) {
  await page.locator(`#m-${slug}`).fill(String(menge));
}

export async function fuelleFirma(page: Page, firma = "Testwerk GmbH") {
  await page.locator("#firma").fill(firma);
  await page.locator("#ansprechpartner").fill("Erika Beispiel");
  await page.locator("#email").fill("einkauf@testwerk.example");
  await page.locator("#telefon").fill("0621 123456");
}

export async function bestaetigeUndBezahle(page: Page): Promise<{ nummer: string; total: number }> {
  await page.getByText("Ich bestelle als Unternehmer").click();
  await page.getByText("Ich akzeptiere die").click({ position: { x: 5, y: 10 } });
  await page.locator("button:visible", { hasText: /Jetzt bestellen/ }).first().click();
  await page.waitForURL(/\/pay\/cs_test_/);
  await expect(page.getByTestId("rechnung-fuss")).toHaveText("Gemäß § 19 UStG wird keine Umsatzsteuer berechnet.");
  const total = cent(await page.getByTestId("total").textContent());
  await page.getByTestId("bezahlen").click();
  await page.waitForURL(/\/danke\?session_id=cs_test_/);
  const nummer = (await page.getByTestId("bestellnummer").textContent())!.trim();
  expect(nummer).toMatch(/^DK-\d{2}-\d+$/);
  return { nummer, total };
}

export async function alsAdmin(page: Page) {
  await page.goto("/admin/login");
  const vorher = mails("anmeldung").length;
  await page.locator("#email").fill("admin@dankeskiste.test");
  await page.getByRole("button", { name: "Anmeldelink schicken" }).click();
  await page.waitForURL(/gesendet=1/);
  await expect.poll(() => mails("anmeldung").length).toBeGreaterThan(vorher);
  const link = mails("anmeldung").at(-1)!.text.match(/https?:\/\/\S+/)![0];
  await page.goto(link);
  await expect(page.getByRole("heading", { name: "Übersicht" })).toBeVisible();
}

export async function stripeZustand(): Promise<{ sessions: Record<string, unknown>[]; events: { id: string; type: string }[]; promos: Record<string, unknown>[] }> {
  return (await fetch(`${STRIPE}/__test/zustand`)).json();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Datenbankzeilen in Tests
export type Zeile = Record<string, any>;
