import { expect, test } from "@playwright/test";
import type { Zeile } from "./hilfen";
import { alsAdmin, cent, mails, sql, stripeZustand } from "./hilfen";

test.describe("Admin-Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await alsAdmin(page);
  });

  test("Bestellung ist sichtbar; Einkaufsliste, Packen, Versandmail und echter Gewinn", async ({ page }) => {
    const [b] = await sql<Zeile>("select * from orders where email = 'einkauf@testwerk.example' and lieferart = 'versand' order by created_at limit 1");
    await page.goto("/admin/bestellungen");
    await expect(page.getByRole("link", { name: b.nummer as string })).toBeVisible();
    await page.getByLabel(/Suche nach Nummer/).fill("Testwerk");
    await page.getByRole("button", { name: "Suchen" }).click();
    await expect(page.getByRole("link", { name: b.nummer as string })).toBeVisible();

    // Einkaufsliste: nach Laden gruppiert, Bedarf aus offenen Bestellungen
    await page.goto("/admin/einkauf");
    for (const laden of ["dm", "Rossmann", "REWE"]) await expect(page.getByRole("heading", { name: new RegExp(`^${laden} ·`) })).toBeVisible();
    const [{ bedarf }] = await sql<{ bedarf: number }>(
      `select sum((x->>'menge')::int * i.menge)::int as bedarf from order_items i join orders o on o.id = i.order_id, jsonb_array_elements(i.inhalt) x
       where o.status in ('neu','eingekauft') and x->>'articleId' = 'lavazza-crema-e-gusto-250'`,
    );
    const kaffee = page.locator("li", { hasText: "Lavazza Crema e Gusto" });
    await expect(kaffee).toContainText(`Bedarf ${bedarf}`);
    // Abhaken mit tatsächlich bezahltem Preis (Aktion: 4,99 € statt 5,49 €)
    await kaffee.getByLabel("Gekauft").fill(String(bedarf));
    await kaffee.getByLabel(/Bezahlt gesamt/).fill((bedarf * 4.99).toFixed(2).replace(".", ","));
    await kaffee.getByRole("button", { name: "Abhaken" }).click();
    await expect(kaffee).toContainText("✓");
    const [art] = await sql<{ bestand: number; einstand_cent: number }>("select bestand, einstand_cent from articles where id = 'lavazza-crema-e-gusto-250'");
    expect(art).toEqual({ bestand: bedarf, einstand_cent: 499 });

    // Status: Neu → Eingekauft → Gepackt (bucht Lager ab, hält echte Artikelkosten fest)
    await page.goto(`/admin/bestellungen/${b.id}`);
    await page.getByRole("button", { name: "→ Eingekauft" }).click();
    await expect(page.getByRole("button", { name: "→ Gepackt" })).toBeVisible();
    await page.getByRole("button", { name: "→ Gepackt" }).click();
    await expect(page.getByRole("button", { name: "→ Versendet" })).toBeVisible();
    const [nach] = await sql<{ status: string; echt_artikel_cent: number; plan_artikel_cent: number }>("select status, echt_artikel_cent, plan_artikel_cent from orders where id = $1", [b.id]);
    expect(nach.status).toBe("gepackt");
    // 5 Boxen mit je einem Kaffee: 5 × (5,49 − 4,99) = 2,50 € günstiger als geplant
    expect(nach.echt_artikel_cent).toBe(nach.plan_artikel_cent - 250);
    const [lager] = await sql<{ bestand: number }>("select bestand from articles where id = 'lavazza-crema-e-gusto-250'");
    expect(lager.bestand).toBe(bedarf - 5);

    // Sendungsnummer eintragen → Kunde bekommt automatisch die Versandmail
    await page.getByLabel(/DHL-Sendungsnummer/).fill("00340434161094042557");
    await page.getByLabel(/Tatsächlich bezahltes Porto/).fill("10,49");
    await page.getByRole("button", { name: "Speichern und Versandmail senden" }).click();
    await expect(page.getByText("Gespeichert – die Versandmail ist raus.")).toBeVisible();
    const versand = mails("versand").filter((m) => m.orderId === b.id);
    expect(versand).toHaveLength(1);
    expect(versand[0].an).toBe("einkauf@testwerk.example");
    expect(versand[0].html).toContain("00340434161094042557");
    expect(versand[0].html).toContain("dhl.de");

    // Echter Gewinn: Umsatz − echte Artikel − Verpackung − Perso-Material − echtes Porto − echte Stripe-Gebühr
    const [e] = await sql<Record<string, number>>("select * from orders where id = $1", [b.id]);
    expect(e.status).toBe("versendet");
    expect(e.echt_versand_kosten_cent).toBe(1049);
    const erwartet = e.bezahlt_cent - e.echt_artikel_cent - e.plan_verpackung_cent - e.plan_perso_material_cent - 1049 - e.stripe_gebuehr_cent;
    const zeile = page.locator("tr", { hasText: "Gewinn vor sonstigen Ausgaben" });
    await expect(zeile).toBeVisible();
    expect(cent(await zeile.locator("td").nth(2).textContent())).toBe(erwartet);
    const gebuehr = page.locator("tr", { hasText: "Stripe-Gebühr" });
    expect(Math.abs(cent(await gebuehr.locator("td").nth(2).textContent()))).toBe(e.stripe_gebuehr_cent);
    expect(e.stripe_gebuehr_cent).not.toBe(e.plan_gebuehr_cent);

    // Packliste und Lieferschein
    await page.goto(`/admin/bestellungen/${b.id}/packliste`);
    await expect(page.getByRole("heading", { name: new RegExp(`Packliste ${b.nummer}`) })).toBeVisible();
    await expect(page.getByText("Karte: handgeschrieben")).toBeVisible();
    await page.goto(`/admin/bestellungen/${b.id}/lieferschein`);
    await expect(page.getByText("Gemäß § 19 UStG wird keine Umsatzsteuer berechnet.")).toBeVisible();
  });

  test("Rabattcode über Stripe Promotion Codes, Erstattung und Export", async ({ page, request }) => {
    await page.goto("/admin/rabattcodes");
    await page.getByLabel("Code", { exact: true }).fill("TEST10");
    await page.getByLabel("Wert").fill("10");
    await page.getByRole("button", { name: "Anlegen" }).click();
    await expect(page.getByText("Code TEST10 angelegt.")).toBeVisible();
    expect((await stripeZustand()).promos.some((p) => p.code === "TEST10")).toBe(true);

    // Bestellung mit Code (über die öffentliche API) und Zahlung im Stripe-Nachbau
    const pruefung = await request.post("/api/rabattcode", { data: { code: "test10" } });
    expect(await pruefung.json()).toEqual({ code: "TEST10", art: "prozent", wert: 10 });
    const antwort = await request.post("/api/checkout", {
      data: {
        positionen: [{ slug: "pasta-abend", menge: 10 }],
        perso: { handgeschrieben: false, banderole: true, namensanhaenger: false, bandfarbe: "natur", grusstext: "Danke!", logoUrl: null, logoName: null },
        lieferung: { art: "versand", termin: "schnell", adresse: { name: "", firma: "Rabatt KG", strasse: "Sparweg 3", zusatz: "", plz: "50667", ort: "Köln" } },
        ohneAlkohol: false, volljaehrig: false,
        firma: { firma: "Rabatt KG", ansprechpartner: "Rita Rabatt", email: "rita@rabatt.example", telefon: "", strasse: "Sparweg 3", zusatz: "", plz: "50667", ort: "Köln" },
        notiz: "", rabattCode: "TEST10", b2b: true, agb: true,
      },
    });
    expect(antwort.status()).toBe(200);
    const { url, nummer } = await antwort.json();
    // 10 Boxen → 3 % Staffel: 39,00 → 37,83 €; Banderole 10 × 1,20 €; 10 % Code auf (378,30 + 12,00)
    const erwarteterRabatt = Math.round((37830 + 1200) * 0.1);
    await page.goto(url);
    expect(cent(await page.getByTestId("rabatt").textContent())).toBe(-erwarteterRabatt);
    await page.getByTestId("bezahlen").click();
    await page.waitForURL(/\/danke/);
    const [b] = await sql<Zeile>("select * from orders where nummer = $1", [nummer]);
    expect(b.status).toBe("neu");
    expect(b.rabatt_code).toBe("TEST10");
    expect(b.rabatt_code_cent).toBe(erwarteterRabatt);
    expect(b.staffel_prozent).toBe("3.00");
    expect(b.bezahlt_cent).toBe(b.summe_cent);

    // Erstattung über die Stripe-API, mit Bestätigung
    await page.goto(`/admin/bestellungen/${b.id}`);
    page.on("dialog", (d) => d.accept());
    await page.getByLabel(/Betrag \(€\)/).fill("20,00");
    await page.getByRole("button", { name: "Erstatten" }).click();
    await expect(page.getByText("Bitte zur Bestätigung ERSTATTEN eintippen.")).toBeVisible();
    await page.getByLabel(/Zur Bestätigung/).fill("ERSTATTEN");
    await page.getByRole("button", { name: "Erstatten" }).click();
    await expect(page.getByText("Erstattung bei Stripe angestoßen.")).toBeVisible();
    await expect.poll(async () => (await sql<{ erstattet_cent: number }>("select erstattet_cent from orders where id = $1", [b.id]))[0].erstattet_cent).toBe(2000);

    // Export für die Steuer
    const csv = await (await page.request.get(`/admin/export/bestellungen?jahr=2026`)).text();
    expect(csv).toContain("Bestellnummer;Zahlungsdatum;Firma");
    expect(csv).toContain(`${nummer};`);
    expect(csv).toContain("Rabatt KG");
    const ausgaben = await (await page.request.get(`/admin/export/ausgaben?jahr=2026`)).text();
    expect(ausgaben).toContain("Zahlungsgebühren");
    expect(ausgaben).toContain("Wareneinkauf");
  });

  test("Kampagne mit QR-Code, Ausgaben, Anfragen und Einstellungen mit sofortiger Wirkung im Shop", async ({ page, request }) => {
    // Kampagne anlegen → QR-Code als SVG und PNG
    await page.goto("/admin/kampagnen");
    await page.locator("#name").fill("Visitenkarte Messe");
    await page.locator("#kosten").fill("45,00");
    await page.getByRole("button", { name: "Anlegen" }).click();
    await expect(page.getByText("Kampagne angelegt: /k/visitenkarte-messe")).toBeVisible();
    const [k] = await sql<{ id: number }>("select id from campaigns where slug = 'visitenkarte-messe'");
    const svg = await page.request.get(`/admin/kampagnen/${k.id}/qr`);
    expect(svg.headers()["content-type"]).toContain("image/svg+xml");
    expect((await svg.text()).toLowerCase()).toContain("#455230");
    const png = await page.request.get(`/admin/kampagnen/${k.id}/qr?format=png`);
    expect((await png.body()).subarray(1, 4).toString()).toBe("PNG");
    // Die Flyer-Kampagne aus dem Shop-Test zeigt Scan, Bestellung und Umsatz
    const flyer = page.locator("section", { hasText: "Flyer Test" }).first();
    await expect(flyer).toContainText("Scans");
    await expect(flyer.locator("dd").nth(0)).toHaveText("2"); // ein Abruf per API, einer im Browser; der Bot zählt nicht
    await expect(flyer.locator("dd").nth(2)).toHaveText("1");

    // Ausgabe erfassen
    await page.goto("/admin/ausgaben");
    await page.getByLabel("Beschreibung").fill("500 Flyer A6");
    await page.getByLabel("Betrag (€)").fill("89,00");
    await page.getByRole("button", { name: "Speichern" }).click();
    await expect(page.getByText("Ausgabe gespeichert.")).toBeVisible();

    // Anfrage aus dem Shop landet im Admin
    const anfrage = await request.post("/api/anfrage", { data: { art: "musterbox", firma: "Muster AG", name: "Mia Muster", email: "mia@muster.example", telefon: "", menge: "80 Boxen", nachricht: "Bitte eine Weihnachtskiste zur Ansicht.", b2b: true } });
    expect(anfrage.status()).toBe(200);
    await page.goto("/admin/anfragen");
    await expect(page.getByText("Muster AG")).toBeVisible();
    expect(mails("anfrage-inhaber").length).toBeGreaterThan(0);
    // Honeypot: ausgefülltes Feld → nichts gespeichert
    await request.post("/api/anfrage", { data: { art: "angebot", firma: "Spam Ltd", name: "Bot", email: "bot@spam.example", b2b: true, website: "http://spam.example" } });
    expect(await sql("select 1 from inquiries where firma = 'Spam Ltd'")).toHaveLength(0);

    // Einstellungen: Mindestmenge ändern → die statische Startseite zeigt es sofort (Cache wird verworfen)
    await page.goto("/admin/einstellungen");
    await page.getByLabel("Mindestmenge (Boxen)").fill("6");
    await page.getByRole("button", { name: "Einstellungen speichern" }).click();
    await expect(page.getByText(/Gespeichert – gilt ab sofort/)).toBeVisible();
    await expect.poll(async () => (await (await request.get("/")).text()).includes(">6 Boxen<"), { timeout: 20_000 }).toBe(true);
    const zuWenig = await request.post("/api/checkout", { data: { positionen: [{ slug: "weihnachtskiste", menge: 5 }], perso: { handgeschrieben: false, banderole: false, namensanhaenger: false, bandfarbe: "oliv", grusstext: "", logoUrl: null, logoName: null }, lieferung: { art: "versand", termin: "saison", adresse: { name: "", firma: "X", strasse: "Weg 1", zusatz: "", plz: "68723", ort: "Schwetzingen" } }, ohneAlkohol: false, volljaehrig: false, firma: { firma: "X", ansprechpartner: "Y", email: "y@x.example", telefon: "", strasse: "Weg 1", zusatz: "", plz: "68723", ort: "Schwetzingen" }, notiz: "", b2b: true, agb: true } });
    expect(zuWenig.status()).toBe(422);
    await page.getByLabel("Mindestmenge (Boxen)").fill("5");
    await page.getByRole("button", { name: "Einstellungen speichern" }).click();
    await expect.poll(async () => (await (await request.get("/")).text()).includes(">5 Boxen<"), { timeout: 20_000 }).toBe(true);

    // Box-Editor: Live-Kalkulation warnt unter 45 % und wird rot unter 35 %
    const [box] = await sql<{ id: number }>("select id from boxes where slug = 'weihnachtskiste'");
    await page.goto(`/admin/boxen/${box.id}`);
    await expect(page.getByText("Marge im Ziel")).toBeVisible();
    await page.getByLabel("Verkaufspreis (€)").fill("41");
    await expect(page.getByText(/Warnung: unter 45/)).toBeVisible();
    await page.getByLabel("Verkaufspreis (€)").fill("33");
    await expect(page.getByText(/unter 35 % – so nicht verkaufbar/)).toBeVisible();
    await page.getByLabel(/Was wäre bei diesem Preis/).fill("49");
    await expect(page.getByText(/Marge\s+5\d,\d/)).toBeVisible();

    // Übersicht rechnet mit echten Werten
    await page.goto("/admin");
    await expect(page.getByText("Gewinn echt")).toBeVisible();
    await expect(page.getByText("Bestellungen nach Status")).toBeVisible();
  });
});
