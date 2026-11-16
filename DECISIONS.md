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

### T14 · Bestellformular erscheint erst nach dem Laden
- **Entscheidung:** Die Bestellstrecke zeigt zuerst einen ruhigen Platzhalter und rendert das Formular erst, wenn der Warenkorb aus dem Sitzungsspeicher gelesen ist.
- **Warum:** Im Test ließ sich ein Fehler nachstellen: Wer auf einem langsamen Gerät tippte, bevor React die Seite übernommen hatte, bekam einen dauerhaft deaktivierten „Weiter“-Knopf. Ohne Eingabefelder vor dem Laden kann das nicht mehr passieren.
- **Verworfen:** Formular serverseitig vorrendern (schneller sichtbar, aber genau dieser Wettlauf).

### T15 · Admin-Formulare behalten Eingaben nach Fehlern
- **Entscheidung:** Server Actions werden von Hand ausgelöst statt über das `action`-Attribut des Formulars.
- **Warum:** React leert Formulare nach einer Action automatisch. Im Test verschwand dadurch nach einer Fehlermeldung der Erstattungsbetrag – der zweite Klick hätte den vollen Betrag erstattet. „Neu anlegen“-Formulare werden nur nach Erfolg geleert.

### T16 · Sicherheitsnetz auf der Danke-Seite
- **Entscheidung:** `/danke` fragt die Checkout-Session bei Stripe ab, falls der Webhook noch nicht angekommen ist, und verbucht die Zahlung über denselben, idempotenten Code.
- **Warum:** Der Kunde sieht sofort seine Bestellnummer, auch wenn ein Webhook Sekunden später oder doppelt eintrifft.

### T17 · Drei Stufen „statisch“
- **Entscheidung:** Shop-Seiten tragen `ensureStatic = "navigation"`: Next bricht den Build ab, wenn eine dieser Seiten versehentlich pro Anfrage rendern würde. Unbekannte Box-Adressen liefern einen echten 404. Admin-Seiten sind mit `instant = false` bewusst dynamisch.
- **Warum:** „Startseite blitzschnell“ soll eine geprüfte Eigenschaft sein, kein Zufall.

### T18 · Newsreader als lokaler Display-Schnitt statt `next/font/google`
- **Entscheidung:** Hanken Grotesk kommt über `next/font/google`. Newsreader wird aus Googles variabler Datei mit fontTools instanziert (optische Größe 72, Gewicht 400–500, lateinischer Zeichensatz) und über `next/font/local` eingebunden.
- **Warum:** `next/font/google` kann die optische Größe nur als ganze Achse laden: 132 kB + 147 kB für Normal und Kursiv. Die instanzierten Dateien wiegen 37 kB + 40 kB und zeigen genau den Display-Schnitt, den die Headlines brauchen. Das war der größte einzelne Hebel für LCP auf dem Handy.
- **Abweichung vom Auftrag:** „beide über `next/font/google`“ – bewusst nur für eine der beiden Schriften eingehalten. Lizenz: SIL Open Font License, Weitergabe erlaubt.

## Geschäft

### G1 · Preisstatus in drei Stufen statt „verifiziert / geschätzt“
- **Entscheidung:** Jeder Preis trägt Quelle, Prüfdatum und einen Status: `belegt` (Seite des Händlers, bei dem gekauft wird), `richtwert` (Online-Supermarkt oder UVP), `geschätzt` (kein Beleg).
- **Warum:** Die Händlerseiten waren aus der Arbeitsumgebung nicht direkt abrufbar; die Preise stammen aus Suchauszügen der verlinkten Seiten. REWE, Kaufland und EDEKA zeigen online keine Filialpreise für Schwetzingen. Ein Online-Preis von EDEKA24 ist kein „geschätzter“, aber auch kein bestätigter Regalpreis – das soll sichtbar bleiben.
- **Folge:** Für 19 von 41 Artikeln ist dm, Rossmann, Lidl oder Aldi Süd als Laden eingetragen, weil dort der Preis belegt ist – obwohl REWE/Kaufland/EDEKA bevorzugt wären. Diese stehen jeweils als Ersatzquelle dabei. Nach dem ersten Einkauf lassen sich Laden und Preis im Admin umstellen.

### G2 · Kalkulation mit der teuersten üblichen Zahlungsgebühr
- **Entscheidung:** 2,8 % + 0,25 € (Stripe, Premium-/Firmenkarten EWR) + 0,4 % für die automatische Rechnung. Quelle: stripe.com/en-de/pricing und Stripe-Support, geprüft 15.11.2026.
- **Warum:** B2B-Kunden zahlen oft mit Firmenkarten. Standardkarten (1,5 %) und SEPA (0,35 €) sind günstiger; die echte Gebühr je Bestellung kommt aus der Stripe-`balance_transaction`.
- **Verworfen:** Mit 1,5 % rechnen (würde die Marge um rund 1,3 Punkte schönen).

### G3 · 15 Boxen, vier Kartongrößen
- **Entscheidung:** 6 Weihnachten, 5 Mitarbeiter, 2 Kunden, je 1 Ostern/Sommer. Flache Boxen ohne Glas im Klappdeckelkarton (0,55 €), nur Boxen mit Gläsern/Flaschen im 10 cm hohen Karton.
- **Warum:** Der Karton ist nach den Artikeln der größte Kostenblock. Die Standard-Weihnachtskiste wurde deshalb ohne Glas zusammengestellt (Marzipan statt Konfitüre): 46,7 % statt 45,1 % Marge, 1,1 kg statt 1,7 kg, kein Bruchrisiko.
- **Verworfen:** Ein Einheitskarton (teurer, viel Luft); Magnetboxen (ab ca. 12 € je Stück).

### G4 · Alkohol nur in drei Boxen, immer abwählbar, nie im Mehrfachversand
- **Entscheidung:** Wein/Sekt nur in „Große Weihnachtskiste“, „Jubiläum“ und „Geburtstagsgruß“; jeder alkoholische Artikel hat einen alkoholfreien Ersatz zum gleichen Boxpreis. Beim Versand an mehrere Empfänger packt das System automatisch alkoholfrei. Bei Lieferung an eine Firmenadresse bestätigt der Besteller, dass die Boxen nur an Volljährige gehen. Keine Spirituosen.
- **Warum:** § 9 JuSchG (Wein/Sekt ab 16, Spirituosen ab 18). Nach LG Bochum (13 O 1/19, nicht rechtskräftig) gilt das auch im Versandhandel und verlangt eine wirksame Alterskontrolle bei der Übergabe; höchstrichterlich ungeklärt. Pakete an Privatadressen (Homeoffice) wären ohne DHL-Alterssichtprüfung angreifbar. **Rechtliche Annahme – vor Livegang prüfen lassen.**
- **Zusatz:** DHL sieht für Flaschen zertifizierte Flaschenkartons vor (dhl.de/verpackung). Kalkuliert ist eine Wellpapp-Hülse je Flasche; für den Versand von Flaschen-Boxen empfiehlt sich die persönliche Lieferung oder ein zertifizierter Umkarton.

### G5 · Personalisierung: Logo und Karte inklusive, drei Optionen mit Aufpreis
- **Entscheidung:** Logo-Sticker und gedruckte Grußkarte sind im Preis enthalten. Handgeschriebene Karte 2,50 €, Banderole 1,20 €, Namensanhänger 0,80 € je Box; Bandfarbe frei wählbar.
- **Warum:** Wettbewerber bieten Logo-Personalisierung meist erst ab 25–50 Stück und gegen Aufpreis. „Ab 5 Boxen mit Logo, ohne Aufpreis“ ist das stärkste Argument für eine kleine Manufaktur. Die Aufpreise decken die Handarbeit (ca. 45 €/Stunde) und summieren sich auf 4,50 € – eine 45-€-Kiste bleibt bei 49,50 € unter der 50-€-Grenze.

### G6 · Mengenrabatt 3 / 5 / 8 / 10 %
- **Entscheidung:** ab 10 / 25 / 50 / 100 Boxen, nur auf den Warenwert.
- **Warum:** Selbst mit 10 % bleibt jede Box über 40 % Rohertrag. Größere Bestellungen sparen Einkaufs- und Fahrtzeit je Box.

### G7 · Versand: DHL-Privatkundenpreise als Start, Material eingerechnet
- **Entscheidung:** Preisstufen 7,90 / 9,50 / 12,90 / 21,90 / 26,90 € (bis 2 / 5 / 10 / 20 / 31,5 kg); dahinter DHL-Porto 2026 online (6,19 / 7,69 / 10,49 / 18,99 / 23,99 €) plus ca. 0,90 € Versandmaterial. An eine Adresse werden bis zu sechs Boxen (nach Platzbedarf) bzw. 20 kg je Sammelpaket gepackt.
- **Warum:** Ohne Geschäftskundenvertrag (ab ca. 200 Sendungen/Jahr) gelten die Privatkundenpreise. Der Versand soll kostendeckend sein, kein Gewinnbringer und kein Verlust.
- **Persönliche Lieferung:** 9,90 €, ab 250 € Warenwert frei – spart gegenüber DHL schon ab drei Paketen und vermeidet Glasbruch.

### G8 · Fristen
- **Entscheidung:** Startwerte wie beauftragt (Versand: Bestellschluss 10.12., Lieferung bis 16.12.; persönlich: Bestellschluss 12.12., Lieferung 15.–19.12.). Nach dem Bestellschluss ist die jeweilige Lieferart bis zum 06.01.2027 gesperrt (Meldung + Anfrageformular), danach gilt die normale Vorlaufzeit (Versand 5 Werktage, persönlich 4 Werktage).
- **Warum:** DHL empfiehlt für Weihnachten 2026 die Einlieferung bis 21.12. (Pressemitteilung 30.10.2026) – der 16.12. lässt fünf Tage Puffer.

### G9 · Rechtliche Annahmen (vor Livegang prüfen lassen)
- **§ 19 UStG:** Grenzen seit 2025: 25.000 € Vorjahresumsatz, 100.000 € im laufenden Jahr (BMF-Schreiben 18.03.2025). Wird die 100.000-€-Grenze überschritten, ist schon dieser Umsatz steuerpflichtig – das Dashboard zeigt den Jahresumsatz.
- **B2B-Beschränkung:** deutlicher Hinweis auf jeder Seite plus eigene, nicht vorangekreuzte Checkbox am Bestellbutton (BGH I ZR 60/16; Empfehlung IT-Recht Kanzlei). Damit entfallen Widerrufsrecht und Preisangabenverordnung.
- **Lebensmittel:** Registrierung als Lebensmittelunternehmer (Art. 6 VO (EG) 852/2004) beim Landratsamt Rhein-Neckar-Kreis nötig, auch für reinen Handel mit verpackter Ware. Zutaten und Allergene je Artikel vor Kauf verfügbar (Art. 14 LMIV) – im Shop erst nach Prüfung an der Packung (`allergeneGeprueft`), sonst ein Hinweis mit Kontaktmöglichkeit.
- **Verpackung:** Registrierung im Verpackungsregister LUCID und Systembeteiligung vor dem ersten Paket (seit 12.08.2026 EU-Verpackungsverordnung/VerpackDG; keine Bagatellgrenze).
- **Marken:** Originalware darf weiterverkauft und im Text mit dem Markennamen benannt werden (§ 24 MarkenG, Erschöpfung); Logos erscheinen nicht – weder in Texten noch auf den Bildern.
- **Impressum:** § 5 DDG; kein Link zur EU-Streitschlichtungsplattform (seit 20.07.2025 eingestellt).

### G10 · Signalfarbe im Admin
- **Entscheidung (überholt durch G11):** Ursprünglich nutzte der Shop nur die vier Palettenfarben und Ink, im Admin gab es ein gedecktes Ziegelrot `#8C3B2A` für „Marge unter 35 %“ und Fehler. Seit G11 verwendet der Admin dasselbe Rot wie der Shop.
- **Warum:** „Rot unter 35 %“ ist ausdrücklich verlangt und muss beim schnellen Blick aufs Handy auffallen.

### G11 · Rot als Akzentfarbe (16.11.2026, auf Wunsch nachträglich)
- **Entscheidung:** Die Palette bekommt eine fünfte Farbe, ein kräftiges Zinnoberrot `#CC2216`. Leitidee: Rot ist die Farbe von Stempel und Rotstift – es markiert, was ein Mensch von Hand anstreichen würde. Eingesetzt wird es an genau diesen Stellen:
  - kursive Akzentwörter in `h1` und `h2` (überall, wo die Überschrift ohnehin kursiv betont), dazu „kiste“ in der Wortmarke;
  - der runde Stempel im Hero und ein einzelner, von Hand gezogener Unterstrich unter „von Hand“ (einmal auf der Startseite, zeichnet sich einmal, steht bei reduzierter Bewegung sofort);
  - Fristen (Bestellschluss-Datum, roter Randstrich) und Rabatte (Minus-Beträge, Staffel-Prozente);
  - Zustände: Hover des Hauptknopfs und der Textlinks, Textauswahl, aktiver Schritt der Bestellung, Fehler an Formularfeldern.
- **Warum so:** Als reine Schmuckfarbe würde Rot neben Oliv schnell laut und beliebig. An Bedeutung gebunden (Handarbeit, Frist, Nachlass, „hier sind Sie“) bleibt es selten genug, um aufzufallen.
- **Regeln:** Rot steht nur auf Creme (Kontrast 4,6 : 1, WCAG AA auch für kleine Schrift). Auf Oliv oder Dunkel-Oliv wird es nie verwendet (1,1 bzw. 1,5 : 1) – dort bleiben die Akzente cremefarben. Keine roten Flächen außer dem Knopf im Hover. In der Bestellstrecke bleiben die Schritt-Überschriften ruhig, damit Rot dort nur Schritt, Rabatt und Fehler markiert.
- **Verworfen:** gedecktes Weinrot (passt zu Oliv, ist aber nicht „kräftig“ und wirkt schnell braun); Rot als Knopffarbe im Ruhezustand (konkurriert mit den Überschriften, der Auftritt würde insgesamt rot statt oliv); helleres Signalrot `#E03A24` (nur 3,6 : 1 auf Creme, für kleine Schrift zu schwach).

## Selbstprüfung je Phase

### Phase 1 – Sortiment
- **Wirtschaftlich?** Alle 15 Boxen liegen zwischen 46,2 % und 52,8 % Rohertrag bei der teuersten Zahlungsart und Online-Richtpreisen; mit 10 % Staffelrabatt mindestens 40,6 %. Zwei Boxen lagen im ersten Entwurf unter 45 % und wurden umgestellt (Standardkiste ohne Glas, Süße Weihnacht ohne zweite Schokolade); das Teamfrühstück wurde von 69 auf 75 € angehoben.
- **Würde ein Büroleiter bestellen?** Inhalte sind bekannte Marken (Lavazza, Lindt, Niederegger, Bonne Maman, Seeberger) und Bio-Eigenmarke von dm. Schwachpunkt: Bei 29 € sind nur vier Artikel drin – die Texte nennen deshalb genau, was enthalten ist, statt Fülle zu versprechen.
- **Ehrlichkeit:** Kein Preis ist für die Märkte in Schwetzingen vor Ort bestätigt. Das steht in beiden Dokumenten ganz oben; der Admin warnt, wenn ein Prüfdatum älter als 30 Tage ist.

### Phase 2 – Bilder
- **Wirken sie echt?** Sie wirken wie ein sorgfältiges Produkt-Mockup: Kraftkarton mit Wellenkante, Holzwolle, Schärfentiefe, Körnung, einheitliches Fensterlicht von links. Ein geübtes Auge erkennt das Rendering an den makellosen Packungen – deshalb steht unter jedem Bild „Beispielabbildung – echte Fotos folgen“, und jedes Bild lässt sich im Admin einzeln durch ein Foto ersetzen.
- **Ehrlich?** Auf den Bildern ist nur, was in der Box ist; Etiketten nennen die Art des Artikels („Kaffee · gemahlen · 250 g“), keine Marken. Der Sticker zeigt „Ihr Logo“.
- **Nachgebessert:** Packungen waren anfangs fast nur grün und weiß; ergänzt um Kraft-, Sand- und Terrakottatöne.

### Phase 3 – Admin
- **Am Handy benutzbar?** Navigation scrollt horizontal, Einkaufsliste als Karten mit großen Feldern, Tabellen scrollen in sich. Geprüft bei 390 px.
- **Stimmt der Gewinn?** Per Test belegt: echter Gewinn = bezahlter Betrag − Artikel zum bezahlten Einkaufspreis − Verpackung − Personalisierung − eingetragenes Porto − Stripe-Gebühr aus der `balance_transaction`.
- **Gefunden und behoben:** Formular-Reset nach Fehlermeldung (T15), Wettlauf zwischen Erstattung und Webhook.

### Phase 4 – Shop
- **Würde ein Büroleiter bestellen?** Preis, Mindestmenge, „Logo inklusive“ und Bestellschluss stehen auf dem ersten Bildschirm. Die Bestellung ist in vier Schritten durch, die Summe ist immer sichtbar.
- **KI-Merkmale?** Automatisch geprüft auf allen 27 Seiten: keine Verläufe, keine Schatten, keine Emojis, keine der verbotenen Floskeln, keine erfundenen Bewertungen oder Kundenzahlen.
- **Gefunden und behoben:** Eingaben während des Ladens (T14); das Weihnachts-Lieferfenster fehlte in der Terminauswahl, wenn man Wochen vorher bestellte; doppelte Zeile „Weihnachten · Weihnachten“.

### Phase 5 – Tests und SEO
- **Was ist belegt?** 43 Unit-Tests und 17 Ende-zu-Ende-Tests, darunter drei komplette Bestellungen bei 375 px. Jede Seite hat genau eine H1, eigenen Titel (≤ 60 Zeichen), Beschreibung, Canonical, OG-Bild und gültiges JSON-LD.
- **Lighthouse (Mobil):** Performance 92–100, Barrierefreiheit, Best Practices und SEO je 100 auf acht geprüften Seiten, CLS 0. Das LCP-Ziel < 2,5 s wird im Simulationsmodus auf den Bildseiten verfehlt (2,5–3,3 s), mit echter Drosselung erreicht (1,8–2,0 s). Größter Hebel war die Schrift (T18); die Vorab-Ankündigung des Hauptbilds brachte wenig.
- **Was nicht?** Der echte Stripe-Testmodus, echte Resend-Mails, Vercel Blob und der Rich-Results-Test von Google waren aus der Arbeitsumgebung nicht erreichbar. Die drei Testbestellungen laufen gegen einen lokalen Stripe-Nachbau; die Schritte für den echten Testmodus stehen im README.
