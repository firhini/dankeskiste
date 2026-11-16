# Dankeskiste

Bestell-Website und Admin-Dashboard für Geschenkboxen an Firmen. Next.js 16 (App Router), TypeScript, Tailwind 4, Postgres (Neon) mit Drizzle, Auth.js, Stripe Checkout, Vercel Blob, Resend.

Weitere Dokumente: [`PLAN.md`](PLAN.md) · [`DECISIONS.md`](DECISIONS.md) · [`SORTIMENT.md`](SORTIMENT.md) · [`EINKAUFSLISTE.md`](EINKAUFSLISTE.md)

---

## 1. Lokal starten

Voraussetzungen: Node 22, eine Postgres-Datenbank (lokal oder Neon).

```bash
npm install
```

```bash
cp .env.example .env.local
```

In `.env.local` mindestens `DATABASE_URL`, `AUTH_SECRET` (`openssl rand -base64 32`), `ADMIN_EMAILS` und `NEXT_PUBLIC_SITE_URL=http://localhost:3000` eintragen. Dann:

```bash
npm run db:migrate
```

```bash
npm run db:seed
```

```bash
npm run dev
```

Shop: <http://localhost:3000> · Admin: <http://localhost:3000/admin>

Ohne `RESEND_API_KEY` landen Mails lokal als Dateien in `.mail-outbox/` – dort steht auch der Anmeldelink für den Admin. Ohne `BLOB_READ_WRITE_TOKEN` liegen Uploads in `.uploads/`. Beides gilt nur außerhalb von Produktion.

## 2. Umgebungsvariablen

| Variable | Wofür | Woher |
|---|---|---|
| `DATABASE_URL` | Postgres | Neon: **gepoolte** Verbindungs-URL |
| `AUTH_SECRET` | Signiert Admin-Sessions | `openssl rand -base64 32` |
| `ADMIN_EMAILS` | Wer sich im Admin anmelden darf (kommagetrennt) | Ihre E-Mail-Adresse |
| `STRIPE_SECRET_KEY` | Zahlungen, Rabattcodes, Erstattungen | Stripe → Entwickler → API-Schlüssel |
| `STRIPE_WEBHOOK_SECRET` | Prüft Stripe-Webhooks | Stripe → Webhooks → Endpunkt → Signaturgeheimnis |
| `NEXT_PUBLIC_SITE_URL` | Absolute Links, Sitemap, Rückkehr von Stripe | z. B. `https://www.dankeskiste.de` (ohne Schrägstrich am Ende) |
| `BLOB_READ_WRITE_TOKEN` | Logo- und Foto-Uploads | Vercel → Storage → Blob |
| `RESEND_API_KEY` | Mailversand | resend.com → API Keys |
| `MAIL_FROM` | Absender, z. B. `Dankeskiste <hallo@dankeskiste.de>` | Domain bei Resend verifizieren |
| `OWNER_EMAIL` | Empfänger für „Neue Bestellung“ und Anfragen | Ihre E-Mail-Adresse |
| `NEXT_PUBLIC_GSC_VERIFICATION` | optional: Google Search Console | Search Console → HTML-Tag → nur der Code |
| `NEXT_PUBLIC_GOOGLE_ADS_ID`, `NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_LABEL` | optional: Conversion auf `/danke` | Google Ads. Nur wenn gesetzt, erscheint der Einwilligungs-Hinweis |
| `IMAGE_API_PROVIDER`, `IMAGE_API_KEY` | optional: Bilder per API statt Blender | siehe Abschnitt 8 |

`NEXT_PUBLIC_…`-Variablen werden beim Build eingebaut – nach einer Änderung neu deployen.

## 3. Datenbank anlegen und füllen

1. In Vercel: **Storage → Create Database → Neon** (Region Frankfurt). Vercel setzt `DATABASE_URL` automatisch.
2. Tabellen anlegen: Das passiert bei jedem Deployment automatisch (`vercel-build` führt `drizzle-kit migrate` aus). Lokal: `npm run db:migrate`.
3. Sortiment einspielen – einmalig, mit der Produktions-URL in `.env.local`:

```bash
npm run db:seed
```

Das Seed-Skript ist wiederholbar: Es aktualisiert Artikel, Verpackung, Boxen und Kollektionen, lässt Bestellungen, Einkäufe, Ausgaben und eigene Fotos unberührt. Einstellungen werden nur beim ersten Mal gesetzt (`npm run db:seed -- --reset` setzt sie zurück).

Nach Schemaänderungen in `db/schema.ts`: `npm run db:generate` erzeugt eine neue Migration in `db/migrations/`.

## 4. Stripe einrichten

Im **Testmodus** beginnen.

1. **Schlüssel:** `STRIPE_SECRET_KEY=sk_test_…` setzen.
2. **Webhook:** Stripe → Entwickler → Webhooks → Endpunkt hinzufügen: `https://IHRE-DOMAIN/api/stripe/webhook` mit den Ereignissen
   `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `charge.succeeded`, `charge.updated`, `charge.refunded`, `invoice.paid`, `invoice.finalized`.
   Das Signaturgeheimnis als `STRIPE_WEBHOOK_SECRET` eintragen.
   Lokal: `stripe listen --forward-to localhost:3000/api/stripe/webhook` (Stripe CLI) zeigt ein eigenes `whsec_…`.
3. **Zahlarten:** Stripe → Einstellungen → Zahlungsmethoden. Empfehlung: Karten, SEPA-Lastschrift, Apple/Google Pay. Der Shop übernimmt, was dort aktiv ist.
4. **Rechnungen:** Stripe → Einstellungen → Rechnungsvorlage: Name, Anschrift und Steuernummer eintragen, **keine** Steuersätze. Der Fußtext „Gemäß § 19 UStG wird keine Umsatzsteuer berechnet.“ kommt automatisch vom Shop.
5. **Branding:** Stripe → Einstellungen → Branding: Farbe `#455230`, Logo.

### Die drei Testbestellungen im Stripe-Testmodus

Diese Abnahme müssen Sie einmal selbst machen – aus der Entwicklungsumgebung war Stripe nicht erreichbar (siehe Abschnitt 11).

| # | Weg | Eingaben | Prüfen |
|---|---|---|---|
| 1 | Versand an eine Adresse | 5 × Weihnachtskiste, Logo hochladen, Karte `4242 4242 4242 4242` | Danke-Seite mit Bestellnummer, Mail an Kunde und an Sie, Rechnung mit § 19-Fußtext, Bestellung im Admin unter „Neu“ |
| 2 | Versand an mehrere Empfänger | 3 × Geburtstagsgruß + 2 × Willkommen im Team, CSV-Vorlage mit 5 Adressen | Versand = 5 Pakete, Bestellung „ohne Alkohol“, Empfängerliste im Admin |
| 3 | Persönliche Lieferung | 5 × Teamfrühstück, PLZ 68161, Wunschtag | Lieferung kostenlos (ab 250 €), Wunschtag im Admin |

Danach im Admin: Einkaufsliste abhaken → Status „Gepackt“ → Sendungsnummer eintragen → Versandmail kommt an. Unter „Gewinn“ steht die echte Stripe-Gebühr (ggf. „Gebühr und Rechnung von Stripe holen“).

### Live gehen

Live-Schlüssel (`sk_live_…`) und ein **eigener Live-Webhook** mit eigenem `whsec_…` in Vercel eintragen, neu deployen. Im Testmodus angelegte Rabattcodes gibt es im Live-Modus nicht – unter Admin → Rabattcodes neu anlegen.

## 5. Deployment und Domain

1. Repository in Vercel importieren (Framework: Next.js). Build-Befehl: `npm run vercel-build`.
2. Alle Variablen aus Abschnitt 2 unter **Settings → Environment Variables** eintragen.
3. **Storage → Blob** anlegen (setzt `BLOB_READ_WRITE_TOKEN`).
4. **Settings → Domains:** Domain hinzufügen, DNS-Einträge beim Registrar setzen. `NEXT_PUBLIC_SITE_URL` auf die endgültige Adresse stellen und neu deployen – sie steckt in Sitemap, Canonicals und QR-Codes.
5. **Resend:** Domain verifizieren (SPF/DKIM), `MAIL_FROM` auf eine Adresse dieser Domain setzen.
6. **Search Console:** Property anlegen, Code in `NEXT_PUBLIC_GSC_VERIFICATION`, Sitemap `/sitemap.xml` einreichen.

## 6. Tägliche Arbeit im Admin

`/admin` – Anmeldung per Link an eine Adresse aus `ADMIN_EMAILS`.

- **Übersicht:** Umsatz, echter und geplanter Gewinn, offene Pakete, Bestellschlüsse, Marge je Box, offene Aufgaben.
- **Bestellungen:** Neu → Eingekauft → Gepackt → Versendet/Geliefert → Abgeschlossen. „Gepackt“ bucht vom Bestand ab. Sendungsnummer eintragen = Versandmail. Packliste und Lieferschein zum Drucken. Erstattung über Stripe (zur Sicherheit `ERSTATTEN` eintippen).
- **Einkaufsliste:** Bedarf aller bezahlten, noch nicht gepackten Bestellungen, nach Laden gruppiert. Abhaken mit **bezahltem Gesamtbetrag** – das wird der Einstandspreis für den echten Gewinn.
- **Boxen:** Inhalt aus dem Artikelkatalog zusammenstellen. Rechts die Live-Kalkulation: Warnung unter 45 %, rot unter 35 %. Der Simulator zeigt, was ein anderer Preis oder Artikel bewirkt. Speichern wirkt sofort im Shop.
- **Artikel:** Preis, Laden, Quelle, Prüfdatum. „Preis stimmt“ setzt das Prüfdatum auf heute; nach 30 Tagen erscheint eine Warnung. Zutaten und Allergene erscheinen im Shop erst, wenn „an der Originalpackung geprüft“ angehakt ist.
- **Kampagnen:** Für jeden Flyer einen Kurzlink anlegen, QR-Code (SVG/PNG) herunterladen und drucken. Scans, Bestellungen, Umsatz und ROI je Kampagne.
- **Einstellungen:** Bestellschlüsse, Liefergebiet, Versandkosten, Staffeln, Personalisierungspreise, Impressumsdaten, Saison-Kollektion.
- **Export:** Einnahmen und Ausgaben als CSV für die EÜR.

### Preise und Sortiment ändern

- **Verkaufspreis einer Box:** Admin → Boxen → Box → Verkaufspreis → speichern.
- **Einkaufspreis:** Admin → Artikel → Artikel → Preis. Alle Boxen mit diesem Artikel rechnen sofort neu.
- **Neue Box:** Admin → Boxen → Neue Box. Sie ist zunächst inaktiv. Bilder: entweder eigene Fotos hochladen oder den Artikel in `db/seed-data` ergänzen und rendern (Abschnitt 8).
- **Saisonwechsel:** Einstellungen → „Kollektion oben auf der Startseite“ und die Fristen anpassen. Ostern und Sommer werden über ihren Sichtbarkeitszeitraum automatisch ein- und ausgeblendet.

## 7. Vor dem Livegang

- [ ] Admin → Einstellungen → **Kontakt und Impressum** ausfüllen (im Shop sind offene Felder markiert).
- [ ] **Impressum, Datenschutz, AGB** prüfen lassen und die Hinweiskästen „vor Livegang entfernen“ löschen (`entwurf`-Eigenschaft in `src/app/(shop)/{impressum,datenschutz,agb}/page.tsx`).
- [ ] **Preise im Markt prüfen:** mit `EINKAUFSLISTE.md` durch REWE, dm, Rossmann & Co. gehen, Preise im Admin bestätigen.
- [ ] **Allergene und Zutaten** je Artikel von der Packung übernehmen und anhaken.
- [ ] Eigenes **Foto** als `public/images/inhaber.jpg` ablegen (Hochformat 4:5); Name steht in den Einstellungen.
- [ ] **Lebensmittelunternehmen registrieren** (Landratsamt Rhein-Neckar-Kreis, Lebensmittelüberwachung).
- [ ] **Verpackungsregister LUCID** und Systembeteiligung.
- [ ] Verträge zur Auftragsverarbeitung: Vercel, Neon, Stripe, Resend.
- [ ] Die drei Testbestellungen (Abschnitt 4) im Stripe-Testmodus, dann eine echte Bestellung mit Live-Schlüssel und anschließender Erstattung.

## 8. Produktbilder

Die Bilder im Shop sind gerenderte **Beispielabbildungen** (Blender/Cycles) und so gekennzeichnet.

**Durch echte Fotos ersetzen:** Admin → Boxen → Box → Bilder → „Durch Foto ersetzen“. Das Foto wird in AVIF und WebP in vier Größen umgerechnet; der Hinweis „Beispielabbildung“ verschwindet für dieses Bild.

**Neu rendern** (nach Änderungen am Inhalt einer Box): siehe [`scripts/render/README.md`](scripts/render/README.md). Kurz:

```bash
pip install bpy pillow
```

```bash
npm run docs && npm run render && npm run bilder && npm run db:seed
```

**Per Bild-API (optional, ungetestet):** `IMAGE_API_PROVIDER=openai` und `IMAGE_API_KEY` setzen, dann `npm run bilder:api`, anschließend `npm run bilder && npm run db:seed`. Mit `npm run bilder:api -- --nur-prompts` entstehen nur die Prompts (`renders/prompts.md`).

## 9. Tests und Qualität

```bash
npm test
```

43 Unit-Tests für Preise, Staffelrabatt, Rabattcode, Versand, Fristen, Liefergebiet, Gewinn und CSV. Zwei Tests prüfen das Sortiment selbst: Jede Box muss ≥ 45 % Rohertrag bringen und auch mit dem höchsten Staffelrabatt über 35 % bleiben.

```bash
npm run e2e
```

17 Ende-zu-Ende-Tests mit Playwright. Sie brauchen ein lokales Postgres mit einer Datenbank `dankeskiste_test` (Standard-URL in `playwright.config.ts`, änderbar über `E2E_DATABASE_URL`). Die App wird gebaut und im Produktionsmodus gestartet; Stripe wird durch `e2e/fake-stripe/server.mjs` ersetzt.

```bash
npm run lint
```

```bash
npm run typecheck
```

```bash
npm run kalkulation
```

zeigt die Marge aller Boxen aus den Seed-Daten.

## 10. Aufbau

```
db/                Schema, Migrationen, Seed-Daten (Artikel, Verpackung, Boxen), seed.ts
scripts/           kalkulation, gen-docs (SORTIMENT/EINKAUFSLISTE), process-images, render/ (Blender)
src/lib/calc/      Rechenkern ohne Framework: Angebot, Versand, Fristen, Marge, Gewinn, CSV
src/lib/server/    Katalog (gecacht), Bestellungen + Stripe, Mail, Uploads, Rate-Limit, Admin-Abfragen
src/app/(shop)/    Startseite, Boxen, Kollektionen, Bestellen, Danke, Rechtstexte, SEO-Seiten
src/app/admin/     Dashboard (12 Bereiche), Server Actions in aktionen.ts
src/app/api/       checkout, stripe/webhook, upload/logo, rabattcode, anfrage
src/app/k/[slug]/  Kampagnen-Kurzlinks
e2e/               Playwright-Tests und Stripe-Nachbau
```

Wo wird gerechnet? Alle Preise, Rabatte, Versandkosten, Fristen und das Liefergebiet bestimmt der Server in `src/lib/server/bestellungen.ts` mit dem Rechenkern aus `src/lib/calc/`. Der Browser schickt nur Box-IDs, Mengen und Optionen.

## 11. Abnahmestand (16.11.2026)

**Lighthouse (Mobil, Produktions-Build auf localhost, 16.11.2026)**

| Seite | Performance | Barrierefreiheit | Best Practices | SEO | LCP simuliert | CLS |
|---|--:|--:|--:|--:|--:|--:|
| `/` | 92 | 100 | 100 | 100 | 3,3 s | 0 |
| `/boxen` | 94 | 100 | 100 | 100 | 3,1 s | 0 |
| `/boxen/weihnachtskiste` | 97 | 100 | 100 | 100 | 2,5 s | 0 |
| `/kollektionen/weihnachten` | 93 | 100 | 100 | 100 | 3,2 s | 0 |
| `/bestellen` | 95 | 100 | 100 | 100 | 2,9 s | 0 |
| `/weihnachtsgeschenke-mitarbeiter` | 100 | 100 | 100 | 100 | 0,9 s | 0 |
| `/firmengeschenke-mit-logo` | 100 | 100 | 100 | 100 | 0,9 s | 0 |
| `/lieferung-schwetzingen-mannheim-heidelberg` | 100 | 100 | 100 | 100 | 0,9 s | 0 |

Alle vier Kategorien liegen über 90, CLS ist 0. **Das LCP-Ziel (< 2,5 s) ist nur teilweise erreicht:** Im Standardmodus von Lighthouse (simulierte Drosselung) liegen die Seiten mit großem Bild bei 2,5–3,3 s, die Werte schwanken zwischen Läufen um etwa ± 0,3 s. Mit tatsächlich gedrosselter Verbindung und CPU (`--throttling-method=devtools`, langsames 4G, 4-fach gebremste CPU) wurden 2,0 s (`/`), 1,9 s (Box-Seite) und 1,8 s (Kollektion) gemessen. Das LCP-Element ist jeweils das Hauptbild (15 kB AVIF); es konkurriert beim Laden mit den drei Schriftdateien (112 kB). Auf Vercel bitte mit PageSpeed Insights nachmessen – dort zählen echte Netzwerkwege.

Nachmessen:

```bash
npx lighthouse https://IHRE-DOMAIN/ --only-categories=performance,accessibility,best-practices,seo --view
```

**Geprüft und belegt**

| Punkt | Wie geprüft |
|---|---|
| Sortiment, Preise mit Quelle und Prüfdatum, jede Box ≥ 45 % | `SORTIMENT.md`, `EINKAUFSLISTE.md`, Unit-Test (niedrigste Marge 46,2 %) |
| Drei Bilder je Box, einheitliche Art Direction | Blender-Pipeline, 45 Bilder gesichtet, AVIF/WebP in vier Breiten mit Blur (360 Dateien, 12 MB) |
| Drei Bestellwege komplett (375 px): Bestellung in der DB, Mails, Rechnungsfuß § 19, im Admin sichtbar | Playwright gegen den **Stripe-Nachbau** |
| Einkaufsliste nach Laden gruppiert, echter Gewinn inkl. Stripe-Gebühr, Versandmail nach Sendungsnummer | Playwright (`e2e/admin.spec.ts`) |
| Kampagnen-Kurzlink zählt Scans ohne personenbezogene Daten und ordnet Bestellungen zu | Playwright |
| Manipulierte Preise werden ignoriert; Fristen, Liefergebiet, Mindestmenge, B2B-Bestätigung serverseitig | Playwright (`e2e/sicherheit.spec.ts`) |
| Webhook-Signatur, Idempotenz, Upload-Prüfung, Rate-Limit, Admin-Schutz, Sicherheits-Header | Playwright |
| Je Seite: eine H1, Titel ≤ 60, Description ≤ 155, Canonical, OG-Bild, gültiges JSON-LD; keine Verläufe, Schatten, Emojis, Floskeln | automatischer Durchlauf über alle Seiten der Sitemap |

**Nicht geprüft – bitte selbst nachholen**

- **Echter Stripe-Testmodus.** `api.stripe.com` und `checkout.stripe.com` waren aus der Entwicklungsumgebung nicht erreichbar, ein Testschlüssel lag nicht vor. Die Integration nutzt das offizielle SDK und ist gegen einen Nachbau der Endpunkte getestet; das ersetzt die drei Testbestellungen aus Abschnitt 4 nicht.
- **Resend und Vercel Blob** im Echtbetrieb (lokal über Datei-Ersatz getestet).
- **Rich-Results-Test von Google** (<https://search.google.com/test/rich-results>): Das JSON-LD ist syntaktisch geprüft, nicht mit Googles Werkzeug.
- **Preise in den Märkten vor Ort:** alle Preise stammen aus Online-Quellen (siehe Status je Artikel); keiner ist in Schwetzingen im Regal bestätigt.
- **Bild-API (Weg B):** Skript vorhanden, Abruf ungetestet.
- **Rechtstexte:** sorgfältige Entwürfe, keine Rechtsberatung.
