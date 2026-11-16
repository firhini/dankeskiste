# Livegang: Schritt für Schritt bis zur ersten Werbung

Diese Anleitung führt von „Code liegt auf GitHub“ bis „Flyer dürfen raus“. Es muss dafür **kein Code geändert** werden: Schlüssel und Adressen werden bei Netlify als Umgebungsvariablen eingetragen, alles Inhaltliche (Preise, Fristen, Impressum, Fotos) im Admin der Website.

Stand: 16.11.2026. Menüs der Anbieter werden gelegentlich umbenannt – wenn ein Punkt anders heißt, hilft die Suche im jeweiligen Dashboard.

**Wichtig vorab**

- **Schlüssel nie in einen Chat, eine Mail oder ins Repository schreiben.** Sie gehören ausschließlich in die Umgebungsvariablen bei Netlify. Wer den Stripe-Schlüssel kennt, kann Erstattungen auslösen.
- **Erst im Testmodus von Stripe alles durchspielen, dann auf Live umstellen.** Der Wechsel ist am Ende nur das Austauschen von zwei Werten.
- Im Admin unter **Einstellungen** steht ganz oben der **Livegang-Check**. Er zeigt jederzeit, was eingerichtet ist und was fehlt. Werbung erst schalten, wenn dort nichts mehr auf „offen“ steht.
- **Netlify ist für dieses Projekt vorbereitet, aber noch nicht live erprobt.** Der Netlify-Build läuft lokal durch; der echte Betrieb (Caching, Uploads, Login) zeigt sich beim ersten Deployment. Deshalb gibt es in Teil C eine feste Kontrollrunde. Falls dort etwas hakt, steht am Ende ein Ausweichweg.

---

## Teil A · Vorbereiten (ohne Technik)

### 1. Behörden und Register

Das sind die Punkte, die vor dem ersten Verkauf erledigt sein müssen. Einzelheiten klären Steuerberater bzw. die jeweilige Stelle.

- [ ] **Gewerbe anmelden** (Gewerbeamt Schwetzingen).
- [ ] **Fragebogen zur steuerlichen Erfassung** beim Finanzamt, Kleinunternehmerregelung nach § 19 UStG wählen. Die Steuernummer kommt ins Impressum.
- [ ] **Registrierung als Lebensmittelunternehmer** beim Landratsamt Rhein-Neckar-Kreis (gilt auch für den reinen Handel mit verpackter Ware).
- [ ] **Verpackungsregister LUCID** und ein Systembeteiligungsvertrag (duales System) – vor dem ersten Paket.
- [ ] **Geschäftskonto** für die Auszahlungen von Stripe.

### 2. Domain und Postfach

- [ ] Domain kaufen (z. B. `dankeskiste.de`) bei einem beliebigen Anbieter.
- [ ] Ein Postfach auf der Domain einrichten, z. B. `hallo@dankeskiste.de`. Dorthin gehen Bestell-Benachrichtigungen und die Antworten der Kunden.

---

## Teil B · Konten anlegen und Werte sammeln

Am besten eine Notiz in einem Passwort-Manager anlegen und die Werte dort sammeln. Am Ende von Teil B stehen diese neun Einträge bereit:

| Variable | Woher | Beispiel |
|---|---|---|
| `DATABASE_URL` | Neon (Schritt 3) | `postgresql://…-pooler.eu-central-1.aws.neon.tech/…?sslmode=require` |
| `AUTH_SECRET` | selbst erzeugt (Schritt 6) | 40+ zufällige Zeichen |
| `ADMIN_EMAILS` | eigene Adresse(n), mit Komma getrennt | `hallo@dankeskiste.de` |
| `NEXT_PUBLIC_SITE_URL` | zuerst die Netlify-Adresse, später die Domain | `https://dankeskiste.netlify.app` |
| `STRIPE_SECRET_KEY` | Stripe (Schritt 5) | `sk_test_…` |
| `STRIPE_WEBHOOK_SECRET` | Stripe (Schritt 10) | `whsec_…` |
| `RESEND_API_KEY` | Resend (Schritt 4) | `re_…` |
| `MAIL_FROM` | eigene Absenderadresse | `Dankeskiste <hallo@dankeskiste.de>` |
| `OWNER_EMAIL` | wohin Bestellungen gemeldet werden | `hallo@dankeskiste.de` |

### 3. Datenbank bei Neon

1. Auf neon.tech ein Konto anlegen und ein Projekt erstellen. **Region: Europa (Frankfurt).**
2. Unter „Connect“ die Verbindungs-URL kopieren – die Variante **mit „Pooled connection“** (im Hostnamen steht `-pooler`).
3. Als `DATABASE_URL` notieren.

Tabellen und Sortiment muss niemand von Hand anlegen: Beim ersten Deployment richtet die Website die Datenbank selbst ein und spielt die 15 Boxen ein. Spätere Deployments lassen vorhandene Daten unangetastet.

### 4. E-Mail-Versand bei Resend

1. Auf resend.com ein Konto anlegen.
2. **Domains → Add Domain:** die eigene Domain eintragen. Resend zeigt DNS-Einträge (SPF, DKIM). Diese beim Domain-Anbieter in der DNS-Verwaltung anlegen und in Resend auf „Verify“ klicken. Das kann einige Minuten bis Stunden dauern.
3. **API Keys → Create API Key** (Berechtigung „Sending access“). Wert als `RESEND_API_KEY` notieren.
4. `MAIL_FROM` muss eine Adresse der bestätigten Domain sein.

Ohne bestätigte Domain kommen weder Bestellbestätigungen noch der Anmeldelink für den Admin an.

### 5. Stripe-Konto

1. Auf stripe.com ein Konto anlegen und die Geschäftsdaten vollständig ausfüllen (Rechtsform, Adresse, Bankverbindung, Ausweis). Erst danach schaltet Stripe echte Zahlungen frei.
2. Oben im Dashboard in den **Testmodus** (bzw. die „Sandbox“) wechseln.
3. Unter **Entwickler → API-Schlüssel** den **Geheimschlüssel** kopieren (`sk_test_…`) und als `STRIPE_SECRET_KEY` notieren. Der „veröffentlichbare Schlüssel“ wird nicht gebraucht.

Der Webhook folgt in Schritt 10 – dafür muss die Website erst eine Adresse haben.

### 6. Zwei eigene Werte

- `AUTH_SECRET`: eine zufällige Zeichenkette mit mindestens 40 Zeichen, z. B. aus dem Passwort-Generator des Passwort-Managers (nur Buchstaben und Ziffern).
- `ADMIN_EMAILS`: die E-Mail-Adresse, mit der die Anmeldung im Admin erfolgen soll. Nur diese Adresse(n) bekommen einen Anmeldelink.

---

## Teil C · Website auf Netlify bringen

### 7. Code bereitstellen

Hier ist nichts zu tun. Das Repository hat nur einen Branch (`claude/dankeskiste-shop-admin-t1l0o7`), und er ist der Standard-Branch. Netlify wählt ihn beim Import von selbst als „Production branch“.

Wer lieber einen Branch namens `main` möchte, kann ihn später auf GitHub anlegen und in den Repository-Einstellungen als Standard setzen; in Netlify dann den „Production branch“ umstellen. Nötig ist das nicht.

### 8. Site anlegen und Variablen eintragen

1. Auf netlify.com anmelden → **Add new project → Import an existing project → GitHub** → Repository `dankeskiste` wählen.
2. Die Build-Einstellungen nicht ändern. Sie stehen in der Datei `netlify.toml` (Befehl `npm run bereitstellen`).
3. **Vor dem ersten Deploy** unter **Environment variables** alle Werte aus der Tabelle in Teil B eintragen. `STRIPE_WEBHOOK_SECRET` bleibt vorerst leer. Für `NEXT_PUBLIC_SITE_URL` die Adresse eintragen, die Netlify der Site gibt (`https://NAME.netlify.app`, ohne Schrägstrich am Ende). Den Namen kann man unter „Site configuration“ vorher ändern.
4. **Deploy** starten.

Fehlt eine Pflichtangabe, bricht der Build ab und nennt sie im Log beim Namen („Diese Umgebungsvariablen fehlen: …“). Eintragen und erneut bereitstellen.

**Wichtig bei jeder späteren Änderung einer Variable:** Sie wirkt erst nach einem neuen Deploy (**Deploys → Trigger deploy → Deploy site**).

### 9. Region und erste Kontrolle

1. **Region:** Unter **Functions → Region** auf **EU (Frankfurt)** stellen und neu bereitstellen. Sonst laufen die Server-Funktionen in den USA, die Datenbank steht aber in Frankfurt – die Seite würde spürbar langsamer, und Bestelldaten nähmen den Umweg über die USA. Lässt der gewählte Netlify-Tarif die Regionswahl nicht zu, bitte Bescheid geben, bevor Werbung läuft.
2. **Kontrollrunde** auf der Netlify-Adresse:
   - [ ] Startseite, eine Box-Seite und `/boxen` laden mit Bildern.
   - [ ] `/admin` öffnen, E-Mail-Adresse eingeben, Anmeldelink kommt per Mail, Anmeldung klappt.
   - [ ] Im Admin unter **Boxen** einen Preis um 1 € ändern, speichern, die Box-Seite im Shop neu laden: Der neue Preis muss nach wenigen Sekunden erscheinen. Danach zurückstellen. (Das prüft, ob das Caching auf Netlify richtig arbeitet.)
   - [ ] Im Admin unter **Einstellungen** ein Foto für „Wer packt Ihre Kiste?“ hochladen und prüfen, dass es auf der Startseite erscheint. (Das prüft den Datei-Speicher.)
   - [ ] In der Bestellung (Schritt 2) ein Logo hochladen.

Scheitert einer dieser Punkte, nicht weitermachen, sondern den Ausweichweg am Ende lesen.

---

## Teil D · Stripe fertig einrichten

### 10. Webhook anlegen

Der Webhook meldet der Website, dass eine Zahlung angekommen ist. Ohne ihn bleiben Bestellungen auf „Zahlung offen“.

1. In Stripe (Testmodus): **Entwickler → Webhooks** (in neueren Dashboards: **Workbench → Webhooks → Ereignisziel erstellen**).
2. Endpunkt-URL: `https://NAME.netlify.app/api/stripe/webhook`
3. Diese Ereignisse auswählen:
   - `checkout.session.completed`
   - `checkout.session.async_payment_succeeded`
   - `checkout.session.async_payment_failed`
   - `charge.succeeded`
   - `charge.updated`
   - `charge.refunded`
   - `invoice.paid`
   - `invoice.finalized`
4. Nach dem Anlegen das **Signaturgeheimnis** anzeigen lassen (`whsec_…`), bei Netlify als `STRIPE_WEBHOOK_SECRET` eintragen und neu bereitstellen.

### 11. Einstellungen im Stripe-Dashboard

- [ ] **Branding:** Logo hochladen, Markenfarbe `#455230`, Akzentfarbe `#CC2216`. Das gilt für die Bezahlseite, Rechnungen und Mails von Stripe.
- [ ] **Öffentliche Angaben:** Firmenname, Support-E-Mail, Telefonnummer, Website. Den **Abrechnungstext** (erscheint auf dem Kontoauszug der Kunden) auf `DANKESKISTE` setzen.
- [ ] **Zahlungsmethoden:** Karte und SEPA-Lastschrift aktivieren. Die Website zeigt an, was hier eingeschaltet ist; es muss nichts im Code angepasst werden.
- [ ] **Rechnungen:** Rechnungsnummern-Präfix und Absenderadresse prüfen. Der Hinweis „Gemäß § 19 UStG wird keine Umsatzsteuer berechnet.“ wird von der Website auf jede Rechnung gesetzt.
- [ ] **Steuern:** Stripe Tax **nicht** aktivieren – als Kleinunternehmer wird keine Umsatzsteuer ausgewiesen.
- [ ] **Kunden-E-Mails:** „Erfolgreiche Zahlungen“ kann aus bleiben; die Bestätigung schickt die Website selbst.

Diese Einstellungen gelten teils getrennt für Test- und Live-Modus. Nach dem Umschalten auf Live (Schritt 17) einmal kontrollieren.

### 12. Drei Testbestellungen

Auf der Website bestellen, auf der Bezahlseite von Stripe mit Testdaten zahlen:

- Testkarte: `4242 4242 4242 4242`, beliebiges künftiges Datum, beliebige Prüfziffer.
- Test-SEPA: IBAN `DE89 3704 0044 0532 0130 00`.

| Bestellung | Was geprüft wird |
|---|---|
| 1 · Versand an eine Adresse, mit Logo | Bestätigungsmail kommt an, Benachrichtigung an `OWNER_EMAIL` kommt an, Bestellung steht im Admin auf „Neu“, Rechnung von Stripe trägt den § 19-Hinweis |
| 2 · Versand an mehrere Empfänger (CSV aus der Vorlage) | alle Empfänger stehen in der Bestellung, Versandkosten je Adresse stimmen |
| 3 · Persönliche Lieferung (PLZ aus dem Liefergebiet) | Liefertag wählbar, Liefergebühr bzw. „kostenlos ab 250 €“ stimmt |

Danach im Admin an Bestellung 1 den ganzen Weg gehen: **Eingekauft → Gepackt → Sendungsnummer eintragen → Versendet** (Versandmail kommt an) und eine **Teilerstattung** auslösen (erscheint in Stripe). Im Livegang-Check muss beim Stripe-Webhook jetzt ein Datum stehen.

---

## Teil E · Domain verbinden

### 13. Domain bei Netlify

1. **Domain management → Add a domain** → eigene Domain eintragen.
2. Netlify zeigt, welche DNS-Einträge nötig sind. Entweder die Nameserver auf Netlify umstellen oder beim Domain-Anbieter die genannten Einträge setzen. **Die Einträge von Resend (Schritt 4) dabei nicht löschen.**
3. Warten, bis Netlify das HTTPS-Zertifikat ausgestellt hat. `www` und die Domain ohne `www` sollten beide funktionieren; eine davon als Hauptdomain festlegen.

### 14. Adressen umstellen

- [ ] Bei Netlify `NEXT_PUBLIC_SITE_URL` auf die Hauptdomain ändern (z. B. `https://www.dankeskiste.de`) und neu bereitstellen. Die Adresse steckt in Sitemap, QR-Codes, Mails und Suchmaschinen-Angaben.
- [ ] In Stripe die Webhook-URL auf `https://www.dankeskiste.de/api/stripe/webhook` ändern. Das Geheimnis bleibt gleich.
- [ ] Eine Testbestellung über die neue Adresse.

---

## Teil F · Inhalte fertig machen (alles im Admin)

### 15. Einstellungen

Unter **Admin → Einstellungen**:

- [ ] **Kontakt und Impressum:** Name, Straße, Telefon, E-Mail, Steuernummer. Solange hier „[vor Livegang ausfüllen]“ steht, ist das im Impressum sichtbar.
- [ ] **Foto „Wer packt Ihre Kiste?“:** ein echtes Foto am Packtisch, Hochformat. Das ist der stärkste Vertrauensbeweis auf der Seite.
- [ ] **Fristen:** Bestellschluss und Liefertermine für die Saison prüfen.
- [ ] **Versand, Mindestmenge, Staffelrabatte, Personalisierung:** Werte prüfen.

### 16. Sortiment und Preise

- [ ] **Artikel:** Im Markt die Einkaufspreise prüfen und unter **Artikel** nachtragen (Haken „Preis heute geprüft“). 23 von 41 Preisen sind bisher Richtwerte.
- [ ] **Boxen:** Die Marge je Box kontrollieren. Unter 45 % erscheint eine Warnung, unter 35 % wird die Box rot markiert. Boxen, die noch nicht verkauft werden sollen, auf „nicht aktiv“ stellen.
- [ ] **Allergene:** je Artikel an der Packung prüfen und den Haken „Allergene geprüft“ setzen.

### 17. Echte Fotos

Die Bilder sind gerenderte Beispielabbildungen und als solche beschriftet. Vor bezahlter Werbung mindestens die drei wichtigsten Boxen fotografieren (geöffnet, Tageslicht am Fenster, heller Untergrund) und unter **Boxen → Bilder → „Durch Foto ersetzen“** hochladen. Der Hinweis „Beispielabbildung“ verschwindet dann bei diesem Bild. Große Handyfotos werden beim Hochladen automatisch verkleinert.

### 18. Rechtstexte

Impressum, Datenschutzerklärung und AGB sind sorgfältige Entwürfe, aber keine Rechtsberatung. Vor dem Livegang prüfen lassen (Anwalt oder ein Rechtstexte-Dienst für Online-Händler). Die Kontaktdaten kommen aus den Einstellungen; geänderte Textpassagen müssen im Code angepasst werden – das ist die einzige Stelle, an der dafür jemand an den Code muss.

---

## Teil G · Auf Live umstellen

### 19. Live-Schlüssel

1. In Stripe den Testmodus verlassen. Das Konto muss freigeschaltet sein (Schritt 5).
2. Unter **Entwickler → API-Schlüssel** den Live-Geheimschlüssel (`sk_live_…`) kopieren.
3. Im **Live-Modus einen eigenen Webhook** anlegen, genau wie in Schritt 10, mit der endgültigen Domain. Er hat ein eigenes `whsec_…`.
4. Bei Netlify `STRIPE_SECRET_KEY` und `STRIPE_WEBHOOK_SECRET` durch die Live-Werte ersetzen und neu bereitstellen.
5. Die Einstellungen aus Schritt 11 im Live-Modus kontrollieren.

Rabattcodes aus dem Testmodus gibt es im Live-Modus nicht – unter **Admin → Rabattcodes** neu anlegen.

### 20. Eine echte Bestellung

Einmal selbst mit echter Karte bestellen (Mindestmenge, günstigste Box), prüfen, dass Mail, Rechnung und Admin stimmen, und die Bestellung im Admin vollständig erstatten. Die Stripe-Gebühr dieser einen Zahlung ist der Preis für die Gewissheit.

- [ ] Livegang-Check im Admin: nichts mehr „offen“, Stripe zeigt „Live-Modus“.

---

## Teil H · Vor der Werbung

### 21. Gefunden werden

- [ ] **Google Search Console:** Property für die Domain anlegen. Bei der Bestätigung per HTML-Tag den Code als `NEXT_PUBLIC_GSC_VERIFICATION` bei Netlify eintragen und neu bereitstellen. Danach die Sitemap `https://www.dankeskiste.de/sitemap.xml` einreichen.
- [ ] **Google-Unternehmensprofil** für Schwetzingen anlegen (kostenlos, wichtig für die regionale Suche).

### 22. Flyer und QR-Codes messbar machen

Unter **Admin → Kampagnen** je Werbemittel eine Kampagne anlegen (z. B. „Flyer Gewerbegebiet Nord“). Der Admin erzeugt einen Kurzlink `/k/…` und den QR-Code als SVG oder PNG für den Druck. Jeder Scan wird gezählt, ohne personenbezogene Daten. Bestellungen aus dem Scan werden der Kampagne zugeordnet.

- [ ] QR-Code vor dem Druck mit zwei verschiedenen Handys scannen.

### 23. Google Ads (nur falls geplant)

Die Werte „Conversion-ID“ und „Conversion-Label“ aus Google Ads als `NEXT_PUBLIC_GOOGLE_ADS_ID` und `NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_LABEL` eintragen und neu bereitstellen. Erst dann erscheint auf der Website ein Einwilligungsbanner, und die Bestellung wird nur nach Zustimmung an Google gemeldet. Ohne diese Werte lädt die Seite nichts von Google.

### 24. Generalprobe am Handy

- [ ] Flyer-QR scannen, Box wählen, bis zur Bezahlseite gehen – auf dem eigenen Handy und einem zweiten Gerät.
- [ ] Bestätigungsmail landet im Posteingang, nicht im Spam.
- [ ] Antwort auf die Bestätigungsmail kommt im eigenen Postfach an.
- [ ] Anfrageformular auf der Startseite abschicken; die Anfrage erscheint unter **Admin → Anfragen**.

### 25. Wenn es zu viel wird

- Einzelne Boxen unter **Boxen** auf „nicht aktiv“ stellen.
- Unter **Einstellungen → Fristen** den Bestellschluss vorziehen: Die Bestellung zeigt dann automatisch den Hinweis und verweist auf das Anfrageformular.
- Erstattungen laufen im Admin an der jeweiligen Bestellung.

---

## Wenn etwas nicht klappt

| Anzeichen | Ursache und Abhilfe |
|---|---|
| Build bricht ab mit „Diese Umgebungsvariablen fehlen“ | Die genannte Variable bei Netlify eintragen, neu bereitstellen. |
| Build bricht ab mit „Die Datenbank konnte nicht vorbereitet werden“ | `DATABASE_URL` stimmt nicht. Die gepoolte URL aus Neon vollständig kopieren (mit `?sslmode=require`). |
| Anmeldelink für den Admin kommt nicht | Adresse steht nicht in `ADMIN_EMAILS`, oder die Domain ist bei Resend noch nicht bestätigt, oder `MAIL_FROM` gehört nicht zur bestätigten Domain. Spam-Ordner prüfen. |
| Bestellung bleibt auf „Zahlung offen“ | Webhook fehlt oder `STRIPE_WEBHOOK_SECRET` passt nicht zum Modus (Test/Live). In Stripe beim Webhook stehen die Zustellversuche mit Fehlermeldung. |
| Preisänderung im Admin erscheint nicht im Shop | Seite nach einer Minute neu laden. Bleibt es dabei, arbeitet das Caching auf Netlify nicht wie erwartet – siehe Ausweichweg. |
| Logo- oder Foto-Upload schlägt fehl | Datei größer als 4 MB (Logo) oder der Speicher steht nicht bereit; im Livegang-Check steht der Zustand. |
| Seite ist langsam | Region der Functions prüfen (Schritt 9). |

### Ausweichweg: Vercel

Das Projekt wurde ursprünglich für Vercel gebaut und dort ist der Betrieb der Normalfall. Der Umzug ist klein: Repository bei Vercel importieren, dieselben Variablen eintragen, zusätzlich unter **Storage → Blob** einen Speicher anlegen (setzt `BLOB_READ_WRITE_TOKEN`), als Region Frankfurt wählen. Zu beachten: Der kostenlose Tarif von Vercel ist nur für nicht-kommerzielle Projekte gedacht; für einen Shop ist der bezahlte Tarif nötig.
