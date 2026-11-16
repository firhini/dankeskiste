import type { Metadata } from "next";
import { Rechtstext, Wert } from "@/components/shop/rechtstext";
import { ladeEinstellungen } from "@/lib/server/einstellungen";

export const ensureStatic = "navigation";
export const metadata: Metadata = { title: "Datenschutzerklärung", description: "Welche Daten Dankeskiste bei Bestellung und Anfrage verarbeitet, wer sie erhält und welche Rechte Sie haben.", alternates: { canonical: "/datenschutz" } };

export default async function Datenschutz() {
  const { kontakt: k } = await ladeEinstellungen();
  const ads = Boolean(process.env.NEXT_PUBLIC_GOOGLE_ADS_ID);
  return (
    <Rechtstext titel="Datenschutzerklärung" pfad="/datenschutz" stand="November 2026" entwurf="Dieser Text beschreibt, was die Website technisch tut. Er ersetzt keine Rechtsberatung. Bitte vor Livegang prüfen lassen und die Verträge zur Auftragsverarbeitung mit Vercel, Neon, Stripe und Resend abschließen.">
      <h2>1. Verantwortlicher</h2>
      <p>
        <Wert>{k.inhaber}</Wert>, {k.firma}, <Wert>{k.strasse}</Wert>, <Wert>{k.plzOrt}</Wert>. E-Mail: <Wert>{k.email}</Wert>
      </p>

      <h2>2. Kurz gesagt</h2>
      <ul>
        <li>Diese Website setzt beim normalen Besuch <strong>keine Cookies</strong> und bindet keine Schriften, Karten oder Skripte von Dritten ein.</li>
        <li>Wir verarbeiten nur die Daten, die Sie bei einer Bestellung oder Anfrage selbst eingeben.</li>
        <li>Bezahlt wird beim Zahlungsdienst Stripe; Kartendaten erreichen unsere Server nicht.</li>
      </ul>

      <h2>3. Aufruf der Website</h2>
      <p>Beim Aufruf verarbeitet unser Hosting-Dienstleister technisch notwendige Daten (IP-Adresse, Zeitpunkt, aufgerufene Seite, Browsertyp), um die Seite auszuliefern und Angriffe abzuwehren. Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO. Hosting: Vercel Inc., USA, mit Servern in der EU; Datenbank: Neon Inc., Region EU. Mit beiden bestehen Verträge zur Auftragsverarbeitung einschließlich EU-Standardvertragsklauseln.</p>
      <p>Zum Schutz vor Missbrauch der Formulare zählen wir Anfragen je Absender für kurze Zeit. Dazu speichern wir keinen Klartext der IP-Adresse, sondern einen nicht rückrechenbaren Prüfwert, der nach spätestens 24 Stunden gelöscht wird.</p>

      <h2>4. Bestellung</h2>
      <p>Für die Bestellung verarbeiten wir: Firmenname, Ansprechperson, E-Mail-Adresse, Telefonnummer (freiwillig), Rechnungs- und Lieferadresse, bestellte Boxen, Personalisierung (Logo, Grußtext), Liefertermin und Ihre Notizen. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung). Rechnungsrelevante Daten bewahren wir nach § 147 AO zehn Jahre auf.</p>
      <h3>Empfängerlisten</h3>
      <p>Beim Versand an mehrere Empfänger erhalten wir von Ihnen Namen und Anschriften Ihrer Mitarbeiter oder Kunden. Wir verwenden diese Daten ausschließlich für den Versand dieser Bestellung und löschen sie 90 Tage nach Zustellung. Sie sind dafür verantwortlich, dass Sie uns diese Daten übermitteln dürfen. Auf Wunsch schließen wir einen Vertrag zur Auftragsverarbeitung.</p>
      <h3>Zwischenspeicher im Browser</h3>
      <p>Damit Ihre Eingaben beim Wechsel zwischen den Bestellschritten nicht verloren gehen, legt die Seite sie im Sitzungsspeicher Ihres Browsers ab. Dieser Speicher ist für die von Ihnen gewünschte Bestellung erforderlich (§ 25 Abs. 2 Nr. 2 TDDDG), wird nicht an uns übertragen und beim Schließen des Tabs gelöscht.</p>

      <h2>5. Zahlung</h2>
      <p>Die Zahlung wickelt Stripe Payments Europe, Ltd., Irland, ab. Dazu übermitteln wir Firmenname, E-Mail-Adresse, Rechnungsadresse und Bestellinhalt. Stripe erstellt in unserem Auftrag auch die Rechnung. Zahlungsdaten geben Sie direkt bei Stripe ein. Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO. Näheres: stripe.com/de/privacy.</p>

      <h2>6. E-Mails</h2>
      <p>Bestellbestätigung, Versandbenachrichtigung und Antworten auf Anfragen versenden wir über den Dienst Resend (Resend, Inc., USA; Auftragsverarbeitung mit Standardvertragsklauseln). Werbung per E-Mail verschicken wir nicht.</p>

      <h2>7. Anfrageformular</h2>
      <p>Wenn Sie ein Angebot oder eine Musterbox anfragen, verarbeiten wir Ihre Angaben, um die Anfrage zu beantworten (Art. 6 Abs. 1 lit. b und f DSGVO). Kommt kein Auftrag zustande, löschen wir die Anfrage nach zwölf Monaten.</p>

      <h2>8. Logo-Upload</h2>
      <p>Hochgeladene Logos speichern wir bei Vercel (Blob-Speicher) unter einer nicht erratbaren Adresse und verwenden sie nur für Ihre Bestellung.</p>

      <h2>9. QR-Codes und Kurzlinks</h2>
      <p>Auf Flyern und Visitenkarten stehen Kurzlinks (zum Beispiel /k/flyer). Beim Aufruf zählen wir lediglich, wie oft ein Link am jeweiligen Tag genutzt wurde. Dabei speichern wir weder IP-Adresse noch Gerätedaten und setzen kein Cookie. Welche Kampagne zu einer Bestellung geführt hat, merken wir uns nur, wenn Sie in derselben Sitzung bestellen.</p>

      <h2 id="messung">10. Erfolgsmessung für Anzeigen</h2>
      {ads ? (
        <p>Nur wenn Sie im Hinweis am Seitenrand „Einverstanden“ wählen, meldet die Bestätigungsseite nach einer Bestellung an Google Ads (Google Ireland Ltd.), dass eine Anzeige zu einem Kauf geführt hat, einschließlich Bestellwert und Bestellnummer. Google setzt dafür Cookies. Rechtsgrundlage ist Ihre Einwilligung (Art. 6 Abs. 1 lit. a DSGVO, § 25 Abs. 1 TDDDG). Sie können sie jederzeit widerrufen, indem Sie die Website-Daten für diese Seite in Ihrem Browser löschen; danach erscheint die Abfrage erneut.</p>
      ) : (
        <p>Derzeit findet keine Erfolgsmessung über Dritte statt. Es werden keine Analyse- oder Werbe-Cookies gesetzt.</p>
      )}

      <h2>11. Ihre Rechte</h2>
      <p>Sie haben das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung, Datenübertragbarkeit und Widerspruch gegen Verarbeitungen auf Grundlage berechtigter Interessen. Eine Nachricht an die oben genannte Adresse genügt. Außerdem können Sie sich bei einer Datenschutz-Aufsichtsbehörde beschweren; zuständig ist der Landesbeauftragte für den Datenschutz und die Informationsfreiheit Baden-Württemberg.</p>
    </Rechtstext>
  );
}
