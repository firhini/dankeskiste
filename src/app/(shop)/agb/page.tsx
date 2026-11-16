import type { Metadata } from "next";
import { Rechtstext, Wert } from "@/components/shop/rechtstext";
import { euro } from "@/lib/geld";
import { ladeEinstellungen } from "@/lib/server/einstellungen";

export const ensureStatic = "navigation";
export const metadata: Metadata = { title: "Allgemeine Geschäftsbedingungen", description: "AGB von Dankeskiste für Bestellungen von Unternehmen: Preise, Zahlung, Lieferung, Personalisierung und Gewährleistung.", alternates: { canonical: "/agb" } };

export default async function Agb() {
  const e = await ladeEinstellungen();
  const k = e.kontakt;
  return (
    <Rechtstext titel="Allgemeine Geschäftsbedingungen" pfad="/agb" stand="November 2026" entwurf="Diese AGB sind ein sorgfältig formulierter Entwurf für den B2B-Verkauf, aber keine Rechtsberatung. Bitte vor Livegang von einem Anwalt prüfen lassen – insbesondere §§ 6, 8 und 9.">
      <h2>§ 1 Geltung, Vertragspartner</h2>
      <ol>
        <li>Diese Bedingungen gelten für alle Bestellungen bei {k.firma}, Inhaber <Wert>{k.inhaber}</Wert>, <Wert>{k.strasse}</Wert>, <Wert>{k.plzOrt}</Wert> (nachfolgend „wir“).</li>
        <li>Unser Angebot richtet sich <strong>ausschließlich an Unternehmer</strong> im Sinne von § 14 BGB, juristische Personen des öffentlichen Rechts und öffentlich-rechtliche Sondervermögen. Mit Verbrauchern im Sinne von § 13 BGB schließen wir keine Verträge. Der Besteller bestätigt bei der Bestellung, als Unternehmer zu handeln.</li>
        <li>Abweichende Bedingungen des Bestellers gelten nur, wenn wir ihnen ausdrücklich in Textform zustimmen.</li>
      </ol>

      <h2>§ 2 Vertragsschluss</h2>
      <ol>
        <li>Die Darstellung der Boxen auf der Website ist kein bindendes Angebot. Mit dem Abschluss der Bestellung und der Zahlung gibt der Besteller ein verbindliches Angebot ab. Der Vertrag kommt mit unserer Bestellbestätigung per E-Mail zustande.</li>
        <li>Die Mindestbestellmenge beträgt {e.mindestmenge} Boxen je Bestellung.</li>
        <li>Abbildungen sind Beispielabbildungen. Maßgeblich ist die Inhaltsliste der jeweiligen Box zum Zeitpunkt der Bestellung.</li>
      </ol>

      <h2>§ 3 Preise, Umsatzsteuer</h2>
      <ol>
        <li>Es gelten die zum Zeitpunkt der Bestellung angezeigten Preise in Euro. Als Kleinunternehmer berechnen wir gemäß § 19 UStG keine Umsatzsteuer und weisen sie nicht aus.</li>
        <li>Versand- und Lieferkosten sowie Aufpreise für Personalisierung werden vor Abschluss der Bestellung gesondert ausgewiesen.</li>
      </ol>

      <h2>§ 4 Zahlung</h2>
      <ol>
        <li>Die Zahlung erfolgt im Voraus über den Zahlungsdienst Stripe mit den dort angebotenen Zahlungsarten. Die Rechnung wird nach Zahlungseingang per E-Mail übermittelt.</li>
        <li>Zahlung auf Rechnung ist nur nach gesonderter Vereinbarung möglich.</li>
      </ol>

      <h2>§ 5 Lieferung, Termine</h2>
      <ol>
        <li>Wir liefern innerhalb Deutschlands per DHL an eine Adresse oder an mehrere vom Besteller benannte Empfänger sowie persönlich im angegebenen Liefergebiet.</li>
        <li>Für saisonale Aktionen gelten die auf der Website genannten Bestellschlüsse. Genannte Zustelltermine beruhen auf den Regellaufzeiten des Paketdienstes; sie sind keine Fixtermine, sofern nicht ausdrücklich in Textform vereinbart.</li>
        <li>Für die Richtigkeit und Vollständigkeit der Lieferadressen ist der Besteller verantwortlich. Kosten für Rückläufer und erneuten Versand wegen fehlerhafter Adressen oder Nichtannahme trägt der Besteller.</li>
        <li>Die Gefahr geht beim Versand mit Übergabe an den Paketdienst auf den Besteller über. Transportschäden bitten wir mit Foto innerhalb von fünf Werktagen zu melden; wir kümmern uns um Ersatz und die Abwicklung mit dem Paketdienst.</li>
      </ol>

      <h2>§ 6 Lebensmittel, Ersatzartikel, Alkohol</h2>
      <ol>
        <li>Die Boxen enthalten original verpackte, vom Hersteller gekennzeichnete Lebensmittel. Für Zutaten, Allergene und Mindesthaltbarkeit ist die Kennzeichnung auf der Verpackung maßgeblich. Der Besteller ist dafür verantwortlich, die Empfänger auf enthaltene Allergene hinzuweisen, soweit erforderlich.</li>
        <li>Ist ein Artikel bei der Beschaffung nicht verfügbar, dürfen wir ihn durch einen nach Art, Qualität und Wert gleichwertigen Artikel ersetzen. Bei wesentlichen Abweichungen stimmen wir uns vorher mit dem Besteller ab.</li>
        <li>Boxen mit alkoholischen Getränken geben wir nur ab, wenn der Besteller bestätigt, dass sie ausschließlich an volljährige Personen weitergegeben werden. Beim Versand an mehrere Empfänger werden alkoholische Getränke durch alkoholfreie ersetzt.</li>
        <li>Lebensmittel sind nach Lieferung kühl und trocken zu lagern.</li>
      </ol>

      <h2>§ 7 Personalisierung, Logos, Texte</h2>
      <ol>
        <li>Der Besteller versichert, dass er die Rechte an den übermittelten Logos und Texten besitzt, und stellt uns von Ansprüchen Dritter wegen deren Verwendung frei.</li>
        <li>Farbabweichungen im Druck gegenüber der Bildschirmdarstellung sind technisch bedingt und kein Mangel.</li>
        <li>Wir dürfen Texte ablehnen, die rechtswidrig, beleidigend oder diskriminierend sind.</li>
      </ol>

      <h2>§ 8 Stornierung</h2>
      <ol>
        <li>Ein gesetzliches Widerrufsrecht besteht für Unternehmer nicht.</li>
        <li>Bis zum Beginn des Einkaufs für die Bestellung stornieren wir auf Wunsch kostenfrei und erstatten den gezahlten Betrag. Danach ist eine Stornierung nur gegen Erstattung der bereits entstandenen Kosten möglich; personalisierte Bestandteile sind von der Erstattung ausgenommen.</li>
      </ol>

      <h2>§ 9 Mängel, Haftung</h2>
      <ol>
        <li>Der Besteller hat die Lieferung unverzüglich zu prüfen und offensichtliche Mängel innerhalb von fünf Werktagen in Textform anzuzeigen (§ 377 HGB). Bei berechtigten Mängeln leisten wir nach unserer Wahl Ersatz oder erstatten den anteiligen Preis.</li>
        <li>Wir haften unbeschränkt bei Vorsatz und grober Fahrlässigkeit sowie bei Verletzung von Leben, Körper oder Gesundheit und nach dem Produkthaftungsgesetz. Bei leicht fahrlässiger Verletzung wesentlicher Vertragspflichten ist die Haftung auf den vertragstypischen, vorhersehbaren Schaden begrenzt; im Übrigen ist sie ausgeschlossen.</li>
        <li>Mängelansprüche verjähren in einem Jahr ab Ablieferung.</li>
      </ol>

      <h2>§ 10 Eigentumsvorbehalt</h2>
      <p>Die Ware bleibt bis zur vollständigen Bezahlung unser Eigentum.</p>

      <h2>§ 11 Schlussbestimmungen</h2>
      <ol>
        <li>Es gilt deutsches Recht unter Ausschluss des UN-Kaufrechts.</li>
        <li>Ist der Besteller Kaufmann, juristische Person des öffentlichen Rechts oder öffentlich-rechtliches Sondervermögen, ist Gerichtsstand Schwetzingen bzw. das für Schwetzingen zuständige Gericht.</li>
        <li>Sollte eine Bestimmung unwirksam sein, bleibt der Vertrag im Übrigen wirksam.</li>
      </ol>
      <p className="klein">Persönliche Lieferung derzeit {euro(e.lieferung.gebuehrCent, { immerCent: true })}, ab {euro(e.lieferung.freiAbCent)} Warenwert kostenlos. Aktuelle Versandkosten siehe Bestellstrecke.</p>
    </Rechtstext>
  );
}
