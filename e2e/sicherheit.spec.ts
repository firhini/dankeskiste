import { createHmac } from "node:crypto";
import { expect, test } from "@playwright/test";
import { mails, sql, STRIPE, stripeZustand } from "./hilfen";

const firma = { firma: "Prüfstein AG", ansprechpartner: "Paul Prüfer", email: "paul@pruefstein.example", telefon: "", strasse: "Testweg 1", zusatz: "", plz: "68723", ort: "Schwetzingen" };
const basis = () => ({
  positionen: [{ slug: "weihnachtskiste", menge: 5 }],
  perso: { handgeschrieben: false, banderole: false, namensanhaenger: false, bandfarbe: "oliv", grusstext: "", logoUrl: null, logoName: null },
  lieferung: { art: "versand", termin: "saison", adresse: { name: "", firma: "Prüfstein AG", strasse: "Testweg 1", zusatz: "", plz: "68723", ort: "Schwetzingen" } },
  ohneAlkohol: false,
  volljaehrig: false,
  firma,
  notiz: "",
  b2b: true,
  agb: true,
});

test.describe("Serverseitige Prüfungen", () => {
  test("manipulierte Preise vom Client werden ignoriert", async ({ request }) => {
    const koerper = basis() as Record<string, unknown>;
    koerper.positionen = [{ slug: "weihnachtskiste", menge: 5, preisCent: 1, stueckpreisCent: 1, listenpreisCent: 1 }];
    koerper.summeCent = 1;
    koerper.versandCent = 0;
    koerper.staffelProzent = 99;
    const antwort = await request.post("/api/checkout", { data: koerper });
    expect(antwort.status()).toBe(200);
    const { nummer } = await antwort.json();
    const session = (await stripeZustand()).sessions.find((s) => (s.metadata as { nummer: string }).nummer === nummer)!;
    expect(session.amount_total).toBe(5 * 4500 + 1290);
    const [b] = await sql<{ summe_cent: number; status: string }>("select summe_cent, status from orders where nummer = $1", [nummer]);
    expect(b).toEqual({ summe_cent: 23790, status: "offen" });
  });

  test("Mindestmenge, B2B-Bestätigung und unbekannte Boxen", async ({ request }) => {
    let a = await request.post("/api/checkout", { data: { ...basis(), positionen: [{ slug: "weihnachtskiste", menge: 4 }] } });
    expect(a.status()).toBe(422);
    expect((await a.json()).meldungen.join(" ")).toContain("Mindestbestellmenge");
    a = await request.post("/api/checkout", { data: { ...basis(), b2b: false } });
    expect(a.status()).toBe(422);
    expect((await a.json()).meldungen.join(" ")).toContain("Unternehmer");
    a = await request.post("/api/checkout", { data: { ...basis(), positionen: [{ slug: "osterkiste", menge: 5 }] } });
    expect(a.status()).toBe(422); // außerhalb des Sichtbarkeitszeitraums nicht bestellbar
  });

  test("Liefergebiet und Termine werden serverseitig durchgesetzt", async ({ request }) => {
    const pers = (plz: string, termin: string) => ({ ...basis(), lieferung: { art: "persoenlich", termin, adresse: { name: "", firma: "X GmbH", strasse: "Weg 1", zusatz: "", plz, ort: "Ort" } } });
    let a = await request.post("/api/checkout", { data: pers("10115", "2026-12-15") });
    expect(a.status()).toBe(422);
    expect((await a.json()).meldungen.join(" ")).toContain("außerhalb unseres Liefergebiets");
    a = await request.post("/api/checkout", { data: pers("68161", "2026-12-21") }); // nach dem Lieferfenster, vor dem Neustart
    expect(a.status()).toBe(422);
    expect((await a.json()).meldungen.join(" ")).toContain("Termin");
    a = await request.post("/api/checkout", { data: pers("68161", "2026-12-16") });
    expect(a.status()).toBe(200);
  });

  test("nach dem Bestellschluss lehnt der Server ab – je Lieferart", async ({ request }) => {
    const [{ wert }] = await sql<{ wert: { fristen: Record<string, unknown> } }>("select wert from settings where id = 'main'");
    const vorbei = { ...wert, fristen: { ...wert.fristen, versand: { bestellschluss: "2026-11-01", lieferungBis: "2026-11-05" } } };
    await sql("update settings set wert = $1 where id = 'main'", [JSON.stringify(vorbei)]);
    try {
      const versand = await request.post("/api/checkout", { data: basis() });
      expect(versand.status()).toBe(422);
      expect((await versand.json()).meldungen.join(" ")).toContain("Bestellschluss");
      // Persönliche Lieferung hat einen eigenen Bestellschluss und bleibt möglich
      const pers = await request.post("/api/checkout", { data: { ...basis(), lieferung: { art: "persoenlich", termin: "2026-12-16", adresse: { name: "", firma: "X GmbH", strasse: "Weg 1", zusatz: "", plz: "68161", ort: "Mannheim" } } } });
      expect(pers.status()).toBe(200);
    } finally {
      await sql("update settings set wert = $1 where id = 'main'", [JSON.stringify(wert)]);
    }
  });

  test("Alkohol: Volljährigkeit bestätigen oder alkoholfrei", async ({ request }) => {
    const mitWein = { ...basis(), positionen: [{ slug: "grosse-weihnachtskiste", menge: 5 }] };
    let a = await request.post("/api/checkout", { data: mitWein });
    expect(a.status()).toBe(422);
    expect((await a.json()).meldungen.join(" ")).toContain("volljährige");
    a = await request.post("/api/checkout", { data: { ...mitWein, volljaehrig: true } });
    expect(a.status()).toBe(200);
  });

  test("Webhook: Signatur wird geprüft, Events sind idempotent", async ({ request }) => {
    const ohne = await request.post("/api/stripe/webhook", { data: { id: "evt_x", type: "checkout.session.completed" } });
    expect(ohne.status()).toBe(400);
    const payload = JSON.stringify({ id: "evt_gefaelscht", object: "event", type: "checkout.session.completed", data: { object: { id: "cs_test_x", metadata: {}, payment_status: "paid" } } });
    const t = Math.floor(Date.now() / 1000);
    const falsch = await request.post("/api/stripe/webhook", { data: payload, headers: { "content-type": "application/json", "stripe-signature": `t=${t},v1=${createHmac("sha256", "whsec_falsch").update(`${t}.${payload}`).digest("hex")}` } });
    expect(falsch.status()).toBe(400);

    // Ein bereits zugestelltes Event erneut senden: keine zweite Verarbeitung, keine zweite Mail
    const { events } = await stripeZustand();
    const fertig = events.find((e) => e.type === "checkout.session.completed")!;
    const vorher = mails("bestellung-kunde").length;
    const erneut = await (await fetch(`${STRIPE}/__test/erneut/${fertig.id}`)).json();
    expect(erneut.status).toBe(200);
    expect(JSON.parse(erneut.body).bereitsVerarbeitet).toBe(true);
    expect(mails("bestellung-kunde").length).toBe(vorher);
  });

  test("Admin und Admin-APIs sind ohne Login gesperrt", async ({ request, page }) => {
    for (const pfad of ["/admin/export/bestellungen", "/admin/export/ausgaben", "/admin/kampagnen/1/qr"]) {
      const a = await request.get(pfad, { maxRedirects: 0 });
      expect([302, 307, 401], pfad).toContain(a.status());
    }
    await page.goto("/admin/bestellungen");
    await expect(page).toHaveURL(/\/admin\/login/);
    // Fremde Adressen bekommen dieselbe Antwort, aber keine Mail
    const vorher = mails("anmeldung").length;
    await page.locator("#email").fill("fremd@example.com");
    await page.getByRole("button", { name: "Anmeldelink schicken" }).click();
    await page.waitForURL(/gesendet=1/);
    await page.waitForTimeout(500);
    expect(mails("anmeldung").length).toBe(vorher);
  });

  test("Upload prüft den Dateiinhalt", async ({ request }) => {
    const hoch = (name: string, mimeType: string, buffer: Buffer) => request.post("/api/upload/logo", { multipart: { datei: { name, mimeType, buffer } } });
    expect((await hoch("logo.png", "image/png", Buffer.from("das ist kein Bild"))).status()).toBe(415);
    expect((await hoch("logo.svg", "image/svg+xml", Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'))).status()).toBe(415);
    expect((await hoch("gross.png", "image/png", Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(5 * 1024 * 1024 + 10)]))).status()).toBe(413);
    const ok = await hoch("logo.svg", "image/svg+xml", Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><circle cx="5" cy="5" r="4"/></svg>'));
    expect(ok.status()).toBe(200);
    expect((await ok.json()).url).toMatch(/^\/api\/datei\/[\w-]{20,}-logo\.svg$/);
  });

  test("Kampagnen-Kurzlink zählt Scans ohne Personenbezug und ordnet Bestellungen zu", async ({ request, page }) => {
    await sql("insert into campaigns (slug, name, kanal, ziel) values ('flyer-test', 'Flyer Test', 'flyer', '/') on conflict (slug) do nothing");
    const a = await request.get("/k/flyer-test", { maxRedirects: 0, headers: { "user-agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1" } });
    expect(a.status()).toBe(302);
    expect(a.headers().location).toContain("utm_campaign=flyer-test");
    expect(a.headers().location).toContain("utm_source=flyer");
    expect(a.headers()["set-cookie"]).toBeUndefined();
    await request.get("/k/flyer-test", { maxRedirects: 0, headers: { "user-agent": "Googlebot/2.1" } });
    const scans = await sql<{ anzahl: number }>("select anzahl from campaign_scans s join campaigns c on c.id = s.campaign_id where c.slug = 'flyer-test'");
    expect(scans).toEqual([{ anzahl: 1 }]);
    expect((await sql("select column_name from information_schema.columns where table_name = 'campaign_scans'")).map((c) => (c as { column_name: string }).column_name).sort()).toEqual(["anzahl", "campaign_id", "tag"]);

    // Über den Kurzlink kommen, bestellen → Bestellung trägt die Kampagne
    await page.goto("/k/flyer-test");
    await expect(page).toHaveURL(/utm_campaign=flyer-test/);
    await page.getByRole("link", { name: "Bestellen", exact: true }).first().click();
    await page.waitForURL(/\/bestellen/);
    await page.locator("#m-pasta-abend").fill("5");
    const abfrage = page.waitForRequest((r) => r.url().endsWith("/api/checkout"));
    for (let i = 0; i < 2; i++) await page.locator("button:visible", { hasText: /^Weiter/ }).first().click();
    await page.locator("#lFirma").fill("Flyer GmbH");
    await page.locator("#lStrasse").fill("Weg 2");
    await page.locator("#lPlz").fill("68723");
    await page.locator("#lOrt").fill("Schwetzingen");
    await page.locator("button:visible", { hasText: /^Weiter/ }).first().click();
    await page.locator("#ansprechpartner").fill("Fiona Flyer");
    await page.locator("#email").fill("fiona@flyer.example");
    await page.getByText("Ich bestelle als Unternehmer").click();
    await page.getByText("Ich akzeptiere die").click({ position: { x: 5, y: 10 } });
    await page.locator("button:visible", { hasText: /Jetzt bestellen/ }).first().click();
    expect((await abfrage).postDataJSON().kampagne).toBe("flyer-test");
    await page.waitForURL(/\/pay\/cs_test_/);
    await page.getByTestId("bezahlen").click();
    await page.waitForURL(/\/danke/);
    const [b] = await sql<{ slug: string }>("select c.slug from orders o join campaigns c on c.id = o.campaign_id where o.email = 'fiona@flyer.example'");
    expect(b.slug).toBe("flyer-test");
  });

  test("Sicherheits-Header und Suchmaschinen-Dateien", async ({ request }) => {
    const start = await request.get("/");
    const h = start.headers();
    expect(h["content-security-policy"]).toContain("default-src 'self'");
    expect(h["content-security-policy"]).toContain("frame-ancestors 'none'");
    expect(h["x-content-type-options"]).toBe("nosniff");
    expect(h["strict-transport-security"]).toContain("max-age=");
    expect(h["x-powered-by"]).toBeUndefined();
    const robots = await (await request.get("/robots.txt")).text();
    expect(robots).toContain("Disallow: /admin");
    const sitemap = await (await request.get("/sitemap.xml")).text();
    expect(sitemap).toContain("/boxen/weihnachtskiste");
    expect(sitemap).not.toContain("/boxen/osterkiste"); // noch nicht sichtbar
    expect(sitemap).not.toContain("/admin");
    expect((await request.get("/boxen/osterkiste")).status()).toBe(404);
    expect((await request.get("/boxen/gibt-es-nicht")).status()).toBe(404);
  });

  test("Rate-Limit auf dem Rabattcode-Endpunkt", async ({ request }) => {
    // Limit: 10 Versuche je 10 Minuten (im Test × RATE_LIMIT_FAKTOR)
    const limit = 10 * Number(process.env.RATE_LIMIT_FAKTOR ?? 1);
    const codes: number[] = [];
    for (let stapel = 0; stapel < limit + 20; stapel += 20) {
      codes.push(...(await Promise.all(Array.from({ length: 20 }, (_, i) => request.post("/api/rabattcode", { data: { code: `RATEN${stapel + i}` }, headers: { "x-forwarded-for": "203.0.113.77" } }).then((a) => a.status())))));
    }
    expect(codes.filter((s) => s === 404).length).toBeLessThanOrEqual(limit);
    expect(codes).toContain(429);
  });
});
