import { expect, test } from "@playwright/test";
import type { Zeile } from "./hilfen";
import { bestaetigeUndBezahle, fuelleFirma, mails, setzeMenge, sql, stripeZustand, summe, weiter } from "./hilfen";

const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64");

test.describe("Bestellung im Shop (375 px)", () => {
  test("Versand an eine Adresse – mit Logo, Grußtext und handgeschriebener Karte", async ({ page }) => {
    await page.goto("/boxen/weihnachtskiste");
    await expect(page.getByRole("heading", { level: 1, name: "Weihnachtskiste" })).toBeVisible();
    await page.getByRole("link", { name: /Diese Box bestellen/ }).click();
    await page.waitForURL(/\/bestellen\?box=weihnachtskiste/);

    // Schritt 1: Mindestmenge vorbelegt, zweite Box dazumischen
    await expect(page.locator("#m-weihnachtskiste")).toHaveValue("5");
    await setzeMenge(page, "kleine-weihnachtskiste", 2);
    // 5 × 45 € + 2 × 29 € = 283 €; ein Sammelpaket mit 7,9 kg → 12,90 €
    await expect.poll(() => summe(page)).toBe(28300 + 1290);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await weiter(page);

    // Schritt 2: Personalisierung
    await page.locator("#logo").setInputFiles({ name: "testwerk-logo.png", mimeType: "image/png", buffer: PNG });
    await expect(page.getByText("testwerk-logo.png")).toBeVisible();
    await page.locator("#grusstext").fill("Liebes Team, danke für ein starkes Jahr. Schöne Feiertage!");
    await page.getByText("Karte von Hand geschrieben").click();
    await expect.poll(() => summe(page)).toBe(28300 + 7 * 250 + 1290);
    await weiter(page);

    // Schritt 3: Lieferung – Pflichtfelder werden in Klartext angemahnt
    await weiter(page);
    await expect(page.getByText("Straße und Hausnummer fehlen.")).toBeVisible();
    await page.locator("#lFirma").fill("Testwerk GmbH");
    await page.locator("#lStrasse").fill("Industriestraße 12");
    await page.locator("#lPlz").fill("70173");
    await page.locator("#lOrt").fill("Stuttgart");
    await expect(page.getByText("Zustellung bis 16.\u00a0Dezember", { exact: true })).toBeVisible();
    await weiter(page);

    // Schritt 4: Firma und Zahlung – ohne B2B-Bestätigung geht es nicht weiter
    await expect(page.locator("#firma")).toHaveValue("Testwerk GmbH");
    await fuelleFirma(page);
    await page.locator("button:visible", { hasText: /Jetzt bestellen/ }).first().click();
    await expect(page.getByText("Bitte bestätigen Sie, dass Sie als Unternehmer bestellen.")).toBeVisible();
    const vorher = await summe(page);
    const { nummer, total } = await bestaetigeUndBezahle(page);
    expect(total).toBe(vorher);
    expect(total).toBe(31340);
    await expect(page.getByText(/Ihre Zahlung über 313,40\s€ ist eingegangen/)).toBeVisible();

    // Datenbank: bezahlt, mit echter Gebühr, Rechnung und Personalisierung
    const [b] = await sql<Zeile>("select * from orders where nummer = $1", [nummer]);
    expect(b.status).toBe("neu");
    expect(b.bezahlt_cent).toBe(31340);
    expect(b.summe_cent).toBe(31340);
    expect(b.stripe_gebuehr_cent).toBe(Math.round(31340 * 0.015) + 25 + Math.round(31340 * 0.004));
    expect(b.stripe_rechnung_url).toContain("/rechnung/cs_test_");
    expect(b.lieferart).toBe("versand");
    expect(b.termin).toBe("saison");
    expect(b.b2b_bestaetigt).toBe(true);
    expect((b.personalisierung as { logoUrl: string; handgeschrieben: boolean; grusstext: string }).logoUrl).toMatch(/^\/api\/datei\//);
    expect((b.personalisierung as { handgeschrieben: boolean }).handgeschrieben).toBe(true);
    expect(b.plan_artikel_cent).toBeGreaterThan(0);
    const pos = await sql("select box_slug, menge, stueckpreis_cent from order_items where order_id = $1 order by id", [b.id]);
    expect(pos).toEqual([
      { box_slug: "weihnachtskiste", menge: 5, stueckpreis_cent: 4500 },
      { box_slug: "kleine-weihnachtskiste", menge: 2, stueckpreis_cent: 2900 },
    ]);

    // Stripe-Session: Firmenname als Kunde, Rechnung mit § 19-Hinweis, Rechnungsadresse Pflicht
    const session = (await stripeZustand()).sessions.find((s) => (s.metadata as { nummer: string }).nummer === nummer) as { params: Zeile; billing_address_collection: string };
    expect(session.billing_address_collection).toBe("required");
    expect((session.params.invoice_creation as { enabled: string; invoice_data: { footer: string } }).invoice_data.footer).toBe("Gemäß § 19 UStG wird keine Umsatzsteuer berechnet.");
    await page.goto(b.stripe_rechnung_url as string);
    await expect(page.getByTestId("rechnung-kunde")).toHaveText("Testwerk GmbH");
    await expect(page.getByTestId("rechnung-fuss")).toHaveText("Gemäß § 19 UStG wird keine Umsatzsteuer berechnet.");

    // Mails an Kunde und Inhaber
    const kunde = mails("bestellung-kunde").filter((m) => m.orderId === b.id);
    expect(kunde).toHaveLength(1);
    expect(kunde[0].an).toBe("einkauf@testwerk.example");
    expect(kunde[0].betreff).toContain(nummer);
    expect(kunde[0].html).toContain("§ 19 UStG");
    expect(mails("bestellung-inhaber").filter((m) => m.orderId === b.id)).toHaveLength(1);
  });

  test("Versand an mehrere Empfänger per CSV – Boxen mit Alkohol werden alkoholfrei gepackt", async ({ page }) => {
    await page.goto("/bestellen");
    await setzeMenge(page, "geburtstagsgruss", 3);
    await setzeMenge(page, "willkommen-im-team", 2);
    await weiter(page);
    await weiter(page);
    await page.getByText("DHL-Versand an mehrere Empfänger").click();

    // Fehlerhafte Liste: Klartext mit Zeilennummer
    await page.locator("#csv").setInputFiles({ name: "kaputt.csv", mimeType: "text/csv", buffer: Buffer.from("Name;Straße;PLZ;Ort;Box\nAnna Auer;Hauptstraße;6816;Mannheim;geburtstagsgruss\n") });
    await expect(page.getByText(/Zeile 2: .*Hausnummer fehlt/)).toBeVisible();

    const csv = [
      "Name;Firma;Straße und Hausnummer;Adresszusatz;PLZ;Ort;Box;Menge",
      "Anna Auer;;Hauptstraße 1;;68161;Mannheim;Geburtstagsgruß;1",
      "Ben Braun;;Gartenweg 7;2. OG;69115;Heidelberg;geburtstagsgruss;1",
      "Cem Çelik;;Marktplatz 3;;10115;Berlin;geburtstagsgruss;1",
      '"Dörr, Dana";Testwerk GmbH;Am Hafen 9;;20457;Hamburg;willkommen-im-team;1',
      "Emil Eder;;Bergstraße 22;;80331;München;Willkommen im Team;1",
    ].join("\r\n");
    await page.locator("#csv").setInputFiles({ name: "team.csv", mimeType: "text/csv", buffer: Buffer.from("﻿" + csv) });
    await expect(page.getByText("5 Empfänger", { exact: true })).toBeVisible();
    await expect(page.getByText(/packen wir alle Boxen\s+ohne Alkohol/)).toBeVisible();
    // 3 × 29 € + 2 × 39 € = 165 €; fünf Einzelpakete unter 2 kg → 5 × 7,90 €
    await expect.poll(() => summe(page)).toBe(16500 + 5 * 790);
    await weiter(page);

    await fuelleFirma(page);
    await page.locator("#strasse").fill("Industriestraße 12");
    await page.locator("#plz").fill("70173");
    await page.locator("#ort").fill("Stuttgart");
    const { nummer, total } = await bestaetigeUndBezahle(page);
    expect(total).toBe(20450);

    const [b] = await sql<Zeile>("select * from orders where nummer = $1", [nummer]);
    expect(b.status).toBe("neu");
    expect(b.lieferart).toBe("mehrfach");
    expect(b.ohne_alkohol).toBe(true);
    expect(b.pakete_anzahl).toBe(5);
    const empf = await sql("select name, plz, box_slug from order_recipients where order_id = $1 order by id", [b.id]);
    expect(empf).toHaveLength(5);
    expect(empf[3]).toEqual({ name: "Dörr, Dana", plz: "20457", box_slug: "willkommen-im-team" });
    const [geb] = await sql<{ inhalt: { articleId: string; alkohol: boolean; ersetzt?: string }[] }>("select inhalt from order_items where order_id = $1 and box_slug = 'geburtstagsgruss'", [b.id]);
    expect(geb.inhalt.some((x) => x.alkohol)).toBe(false);
    expect(geb.inhalt.find((x) => x.articleId === "rotkaeppchen-alkoholfrei-piccolo-02")?.ersetzt).toContain("Rotkäppchen");
    expect(mails("bestellung-kunde").filter((m) => m.orderId === b.id)).toHaveLength(1);
  });

  test("Persönliche Lieferung – nur im Liefergebiet, mit Wunschtag", async ({ page }) => {
    await page.goto("/bestellen");
    await setzeMenge(page, "teamfruehstueck", 5);
    await weiter(page);
    await weiter(page);
    await page.getByText("Persönliche Lieferung in der Region").click();
    await page.locator("#lFirma").fill("Kanzlei Beispiel & Partner");
    await page.locator("#lStrasse").fill("Planken O7, 5");
    await page.locator("#lOrt").fill("Berlin");
    await page.locator("#lPlz").fill("10115");
    await expect(page.getByText("Außerhalb des Liefergebiets")).toBeVisible();
    await weiter(page);
    await expect(page.getByText(/Die PLZ 10115 liegt außerhalb unseres Liefergebiets/)).toBeVisible();

    await page.locator("#lPlz").fill("68161");
    await page.locator("#lOrt").fill("Mannheim");
    await expect(page.getByText("Liegt im Liefergebiet.")).toBeVisible();
    // Lieferfenster vor dem Fest: 15.–19.12.
    await page.getByText("Di., 15.12.").click();
    // 5 × 75 € = 375 € ≥ 250 € → Lieferung kostenlos
    await expect.poll(() => summe(page)).toBe(37500);
    await weiter(page);
    await fuelleFirma(page, "Kanzlei Beispiel & Partner");
    const { nummer, total } = await bestaetigeUndBezahle(page);
    expect(total).toBe(37500);

    const [b] = await sql<Zeile>("select * from orders where nummer = $1", [nummer]);
    expect(b.status).toBe("neu");
    expect(b.lieferart).toBe("persoenlich");
    expect(b.termin).toBe("2026-12-15");
    expect(b.versand_cent).toBe(0);
    expect(b.liefer_plz).toBe("68161");
    expect(b.rechnung_plz).toBe("68161");
  });
});
