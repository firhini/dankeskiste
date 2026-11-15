# Dankeskiste – Plan

Stand: 15.11.2026 · Ziel: bestellbereiter B2B-Shop für Geschenkboxen mit Admin-Dashboard, Start zum Weihnachtsgeschäft 2026, danach ganzjährig.

## Phasen

| # | Phase | Ergebnis | Commit |
|---|-------|----------|--------|
| 0 | Plan & Gerüst | `PLAN.md`, `DECISIONS.md`, Next.js-Projekt, Design-Tokens | `Phase 0` |
| 1 | Sortiment & Einkauf | `SORTIMENT.md`, `EINKAUFSLISTE.md`, `db/seed-data/*`, `db/seed.ts`; jede aktive Box ≥ 45 % Rohertrag | `Phase 1` |
| 2 | Produktbilder | `scripts/render/*` (Blender/Cycles), `scripts/process-images.ts` (sharp), je Box 3 Bilder als AVIF/WebP + Blur | `Phase 2` |
| 3 | Datenbank & Admin | Drizzle-Schema + Migration, Auth.js (Magic Link), 12 Admin-Bereiche, Gewinnrechnung | `Phase 3` |
| 4 | Website & Bestellung | Startseite, Boxen, Kollektionen, Bestellstrecke, Stripe Checkout + Webhook, Mails, Rechtstexte | `Phase 4` |
| 5 | SEO, Performance, Tests | SEO-Seiten, JSON-LD, Sitemap, OG-Bilder, CSP, Vitest, Playwright, Lighthouse, `README.md` | `Phase 5` |

Am Ende jeder Phase: Selbstprüfung (wirtschaftlich sinnvoll? würde ein Büroleiter bestellen? wirkt etwas billig oder nach KI?) – Ergebnis steht in `DECISIONS.md` unter „Selbstprüfung“.

## Datenmodell (Postgres, Drizzle) – Geldbeträge immer in Cent (Integer)

**Katalog**
- `collections` – Kollektion (Weihnachten, Mitarbeiter, Kunden, Ostern, Sommer) mit Sichtbarkeitszeitraum.
- `articles` – Artikelkatalog: Marke, Größe, Laden + Ersatzquelle, Preis, Quelle, Prüfdatum, Status `verifiziert|geschätzt`, Gewicht, MHD-Hinweis, Alkohol, alkoholfreier Ersatzartikel, Allergene/Zutaten-Hinweis, Bestand, gleitender Einstandspreis.
- `packaging_items` – Karton, Holzwolle, Band, Karte, Sticker, Versandkarton … mit Stückkosten, Quelle, Bestand.
- `boxes` – Box: Slug, Name, Kollektion, Anlass, Zielgruppe, Texte, Preis, Größe, Packzeit, aktiv, Sichtbarkeitszeitraum.
- `box_items` (Box ↔ Artikel, Menge), `box_packaging` (Box ↔ Verpackung, Menge), `box_images` (Varianten, Blur, Platzhalter-Flag).

**Verkauf**
- `orders` – Bestellung inkl. Firmendaten, Lieferart, Personalisierung, Preis-Snapshot, Stripe-IDs, echte Gebühr, echte Versandkosten, Kampagne.
- `order_items` – Box-Positionen mit Preis- und Inhalts-Snapshot (was verkauft wurde, bleibt nachvollziehbar, auch wenn die Box später geändert wird).
- `order_recipients` – Empfänger bei Versand an mehrere Adressen, Sendungsnummer je Paket.
- `inquiries` – Anfragen (Angebot / Musterbox).
- `discount_codes` – Rabattcodes, gespiegelt aus Stripe Promotion Codes.
- `campaigns`, `campaign_scans` – Kurzlinks `/k/<slug>`, Scans als Tageszähler ohne personenbezogene Daten.

**Betrieb**
- `purchases` – tatsächliche Einkäufe (Menge, bezahlter Preis) → gleitender Einstandspreis, echter Gewinn.
- `stock_movements` – Lagerbewegungen (Einkauf, Gepackt, Korrektur).
- `expenses` – sonstige Ausgaben, optional einer Kampagne zugeordnet.
- `settings` – eine typisierte JSON-Zeile (Fristen, Liefergebiet, Versandstufen, Rabatte, Personalisierung, Kontakt).
- `mail_log`, `stripe_events` (Idempotenz), `rate_limits`, Auth.js-Tabellen.

## Seiten

**Shop (statisch vorgerendert, per Tag revalidiert):** `/`, `/boxen`, `/boxen/[slug]`, `/kollektionen/[slug]`, `/bestellen`, `/danke`, `/impressum`, `/datenschutz`, `/agb`, SEO-Seiten `/weihnachtsgeschenke-mitarbeiter`, `/kundengeschenke`, `/firmengeschenke-mit-logo`, `/onboarding-geschenk`, `/lieferung-schwetzingen-mannheim-heidelberg`, Kurzlinks `/k/[slug]`.

**Admin (`/admin`, nur mit Login):** Übersicht · Bestellungen (+ Detail, Packliste, Lieferschein) · Einkaufsliste · Boxen (+ Editor mit Live-Kalkulation) · Artikel · Bestand · Ausgaben · Kampagnen (+ QR) · Anfragen · Rabattcodes · Einstellungen · Export.

**APIs:** `POST /api/checkout`, `POST /api/stripe/webhook`, `POST /api/upload/logo`, `POST /api/anfrage`, `POST /api/rabattcode`, `/api/auth/*`, Admin-Exporte.

## Rechenkern (reine Funktionen in `src/lib/calc/`, mit Unit-Tests)

- `quote.ts` – Angebot: Staffelrabatt, Personalisierung, Rabattcode, Versand, Summe. Läuft identisch im Browser (Live-Zusammenfassung) und auf dem Server (maßgeblich).
- `shipping.ts` – Pakete nach Gewicht bilden, DHL-Stufen anwenden.
- `deadlines.ts` – Bestellschlüsse je Lieferart, Liefertage, Liefergebiet (PLZ-Präfixe).
- `margin.ts` – Box-Kalkulation: Einkauf, Verpackung, Gebühr, Rohertrag.
- `profit.ts` – geplanter und echter Gewinn je Bestellung und gesamt.

## Risiken und Gegenmaßnahmen

| Risiko | Gegenmaßnahme |
|--------|---------------|
| Supermarktpreise sind standortabhängig und online oft nicht einsehbar | Quelle + Prüfdatum je Preis; Unbelegtes als `geschätzt`; Admin warnt bei Prüfdatum > 30 Tage; Kalkulation mit Reserve (Ziel 45 %, nicht 35 %) |
| Marge kippt durch Preiserhöhungen | Live-Kalkulation im Box-Editor, Ampel 45 % / 35 %, echte Einkaufspreise fließen in den Gewinn |
| Stripe-Testmodus und Händlerseiten sind aus der Build-Umgebung nicht erreichbar | Stripe hinter schmaler Schnittstelle; E2E-Test gegen lokalen Stripe-Nachbau (gleiche Endpunkte, signierte Webhooks); README beschreibt die drei echten Testbestellungen |
| Renderbilder wirken künstlich | Einheitliche Art Direction, echte Maße, neutrale Etiketten, sharp-Grading; Hinweis „Beispielabbildung“; Austausch gegen Fotos im Admin |
| Lebensmittel-/Alkoholrecht | Nur original verpackte Ware, Allergene/Zutaten je Artikel, Hinweis „maßgeblich ist die Packung“, Alkohol nur in wenigen Boxen und abwählbar, Volljährigkeits-Bestätigung |
| Verbraucher bestellen im B2B-Shop | Pflicht-Checkbox Unternehmer, Hinweise in Footer/AGB/Checkout, Firmenname Pflicht |
| Preismanipulation im Browser | Server berechnet alles neu; Client sendet nur IDs, Mengen, Optionen |
| Weihnachtsspitze: Paketlaufzeiten | Bestellschlüsse je Lieferart in den Einstellungen, Puffer vor Heiligabend, Sperre mit Anfrageformular |

## Definition of Done

Siehe Auftrag Abschnitt 9; der Abnahmestand wird am Ende in `README.md` → „Abnahme“ festgehalten (was geprüft wurde, was vor Livegang noch vom Inhaber zu tun ist).
