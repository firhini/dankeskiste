# Entscheidungen

Jede Entscheidung: was, warum, was verworfen wurde. Rechtliche und steuerliche Punkte sind Annahmen nach bestem Wissen – vor Livegang mit Steuerberater bzw. Anwalt abklären.

## Technik

### T1 · Next.js 16 mit Cache Components statt klassischem ISR
- **Entscheidung:** App Router mit `cacheComponents: true`. Shop-Daten werden in `'use cache'`-Funktionen mit `cacheTag('katalog')` / `cacheTag('einstellungen')` gelesen; der Admin ruft nach jeder Änderung `updateTag(...)` auf.
- **Warum:** Das ist in Next 16.4 der Standard für „statisch ausliefern, bei Änderung neu validieren“. Die Startseite ist reines HTML aus dem CDN; Änderungen im Admin sind sofort sichtbar.
- **Verworfen:** `export const revalidate` + `unstable_cache` (Vorgängermodell, wird abgelöst); reines SSR (langsamer, unnötig).

### T2 · `pg` (node-postgres) als Treiber, Neon als Datenbank
- **Entscheidung:** Drizzle ORM über `pg`-Pool. Läuft identisch gegen lokales Postgres (Entwicklung, Tests) und gegen Neon (gepoolte Verbindungs-URL).
- **Warum:** Echte Transaktionen (Bestellstatus + Lager + Stripe-Events müssen atomar sein). Der HTTP-Treiber von Neon kann keine interaktiven Transaktionen.
- **Verworfen:** `@neondatabase/serverless` (HTTP): schneller Kaltstart, aber keine interaktiven Transaktionen und kein lokaler Betrieb ohne Proxy.

### T3 · Geldbeträge als Integer-Cent, Rechenkern als reine Funktionen
- **Entscheidung:** Alle Beträge in Cent; `src/lib/calc/*` ohne Datenbank- oder Framework-Abhängigkeit. Dieselbe `berechneAngebot()`-Funktion läuft im Browser (Live-Zusammenfassung) und auf dem Server (maßgeblich).
- **Warum:** Keine Rundungsfehler, vollständig testbar, Client und Server können nicht auseinanderlaufen.

### T4 · Staffelrabatt im Stückpreis, Rabattcode über Stripe Promotion Codes
- **Entscheidung:** Der Mengenrabatt wird je Box auf den Stückpreis gerechnet (auf Cent gerundet) und als reduzierter Preis an Stripe übergeben. Rabattcodes gibt der Kunde in unserer Bestellstrecke ein; der Server prüft sie und übergibt die Stripe-`promotion_code`-ID. Maßgeblich bleibt, was Stripe abrechnet.
- **Warum:** Stripe Checkout erlaubt keine negativen Positionen und `discounts` nicht zusammen mit `allow_promotion_codes`. So zeigt unsere Zusammenfassung schon vor der Zahlung die Endsumme.
- **Verworfen:** Staffelrabatt als Stripe-Coupon (dann wäre kein zusätzlicher Rabattcode möglich).

### T5 · Bestellung wird vor der Zahlung als Entwurf gespeichert
- **Entscheidung:** `POST /api/checkout` validiert, rechnet neu, speichert die Bestellung mit Status `offen` (inkl. Empfängerliste, Personalisierung, Preis-Snapshot) und erzeugt dann die Checkout-Session mit `metadata.orderId`. Der Webhook setzt sie auf `neu`.
- **Warum:** Stripe-Metadaten fassen keine Empfängerlisten. Der Webhook ist dadurch klein und idempotent (`stripe_events` + bedingtes Update). Unbezahlte Entwürfe erscheinen nicht im Admin und werden nach 7 Tagen aufgeräumt.

### T6 · Stripe-Kunde wird serverseitig angelegt
- **Entscheidung:** Vor der Session wird ein Stripe-Customer mit Firmenname, E-Mail und Rechnungsadresse erzeugt und übergeben (`customer_update: { address: 'auto', name: 'auto' }`), zusätzlich `billing_address_collection: 'required'`.
- **Warum:** Die Rechnung (`invoice_creation`) trägt so sicher den Firmennamen. Footer: „Gemäß § 19 UStG wird keine Umsatzsteuer berechnet.“

### T7 · Eigene `<Bild>`-Komponente statt `next/image`
- **Entscheidung:** Bilder werden vorab mit `sharp` als AVIF + WebP in 4 Breiten erzeugt (Render-Bilder beim Build-Skript, Admin-Uploads beim Hochladen) und über `<picture>` mit `srcset` und Blur-Platzhalter ausgegeben.
- **Warum:** Volle Kontrolle über Formate, Dateinamen (SEO) und Blur; keine Laufzeitkosten für Bildoptimierung; Render-Bilder und eigene Fotos laufen durch dieselbe Strecke.
- **Verworfen:** `next/image` mit Remote-Optimierung (kostet pro Transformation, Dateinamen nicht sprechend).

### T8 · Mail- und Upload-Schicht mit lokalem Ersatz
- **Entscheidung:** `sendeMail()` nutzt Resend, wenn `RESEND_API_KEY` gesetzt ist; sonst (nur außerhalb von Produktion) landet die Mail als Datei in `.mail-outbox/`. Uploads gehen zu Vercel Blob; ohne Token (nur lokal) nach `.uploads/` mit zufälligem Namen.
- **Warum:** Entwicklung und E2E-Tests laufen ohne externe Dienste; jede Mail wird zusätzlich in `mail_log` protokolliert.

### T9 · Kampagnen-Zuordnung ohne Cookie
- **Entscheidung:** `/k/<slug>` zählt den Scan (Tageszähler, keine IP, kein User-Agent gespeichert) und leitet mit UTM-Parametern weiter. Die Kampagne wird im Arbeitsspeicher der Seite gehalten (React-Kontext) und mit der Bestellung gesendet. Zusätzlich kann jede Kampagne einen Rabattcode tragen; Bestellungen mit diesem Code zählen ebenfalls zur Kampagne.
- **Warum:** Kein Zugriff auf das Endgerät im Sinne von § 25 TDDDG, also kein Consent-Banner nötig. Der Rabattcode fängt Fälle ab, in denen jemand später direkt die Domain eintippt.
- **Verworfen:** Attributions-Cookie (bräuchte Einwilligung), Fingerprinting (unzulässig).

### T10 · Rate-Limits in Postgres
- **Entscheidung:** Tabelle `rate_limits` mit atomarem Upsert je Schlüssel und Zeitfenster; als Schlüssel dient ein gesalzener Hash der IP (nicht rückrechenbar, wird nach Ablauf gelöscht).
- **Warum:** Auf Serverless-Instanzen hält ein In-Memory-Zähler nicht. Kein zusätzlicher Dienst (Redis) nötig.

### T11 · Content-Security-Policy ohne Nonce
- **Entscheidung:** Feste CSP über `next.config.ts` (`script-src 'self' 'unsafe-inline'`, alles andere eng), dazu HSTS, `X-Content-Type-Options`, `Referrer-Policy`, `frame-ancestors 'none'`.
- **Warum:** Nonces erzwingen dynamisches Rendern jeder Seite – das widerspricht dem Ziel „Startseite blitzschnell“. Es gibt keine Dritt-Skripte (Stripe Checkout ist eine Weiterleitung, Schriften liegen lokal).
- **Verworfen:** Nonce-CSP per Proxy (langsamer), keine CSP.

### T12 · E2E-Test gegen lokalen Stripe-Nachbau
- **Entscheidung:** `e2e/fake-stripe` bildet die verwendeten Stripe-Endpunkte nach (Customers, Checkout Sessions, Payment Intents, Charges, Balance Transactions, Refunds, Coupons, Promotion Codes) inkl. Bezahlseite und korrekt signierter Webhooks. Die App spricht über das offizielle Stripe-SDK damit (`STRIPE_API_BASE`, nur außerhalb von Produktion wirksam).
- **Warum:** Der Test läuft ohne Schlüssel und ohne Netz deterministisch durch – auch in CI. In der Build-Umgebung dieses Projekts waren `api.stripe.com` und `checkout.stripe.com` nicht erreichbar.
- **Grenze:** Das ersetzt nicht die drei echten Testbestellungen im Stripe-Testmodus; Anleitung dafür steht im README.

### T13 · Auth.js mit JWT-Session
- **Entscheidung:** Magic Link über Resend, Drizzle-Adapter für Nutzer und Tokens, Session als JWT. Zugelassen sind nur Adressen aus `ADMIN_EMAILS` (Prüfung beim Anfordern des Links, beim Einlösen und bei jedem Admin-Zugriff).
- **Warum:** Jeder Server-Zugriff im Admin ruft `erfordereAdmin()` auf; es gibt keine Admin-Funktion, die sich nur auf die Oberfläche verlässt.

## Geschäft

(wird in Phase 1 ergänzt: Sortiment, Preise, Personalisierung, Versand, Rabatte)

## Selbstprüfung je Phase

(wird am Ende jeder Phase ergänzt)
