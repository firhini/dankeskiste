import type { Metadata } from "next";
import { Rechtstext, Wert } from "@/components/shop/rechtstext";
import { ladeEinstellungen } from "@/lib/server/einstellungen";

export const ensureStatic = "navigation";
export const metadata: Metadata = { title: "Impressum", description: "Impressum von Dankeskiste, Schwetzingen: Anbieterkennzeichnung, Kontakt und Hinweis auf die Kleinunternehmerregelung nach § 19 UStG.", alternates: { canonical: "/impressum" } };

export default async function Impressum() {
  const { kontakt: k } = await ladeEinstellungen();
  return (
    <Rechtstext titel="Impressum" pfad="/impressum" stand="November 2026" entwurf="Name, Anschrift, Telefon und E-Mail tragen Sie im Admin unter Einstellungen → Kontakt und Impressum ein. Bitte prüfen Sie die Angaben mit Ihrem Steuerberater oder Anwalt.">
      <h2>Angaben gemäß § 5 DDG</h2>
      <p>
        <Wert>{k.inhaber}</Wert>
        <br />
        {k.firma} (Einzelunternehmen)
        <br />
        <Wert>{k.strasse}</Wert>
        <br />
        <Wert>{k.plzOrt}</Wert>
      </p>
      <h2>Kontakt</h2>
      <p>
        Telefon: <Wert>{k.telefon}</Wert>
        <br />
        E-Mail: <Wert>{k.email}</Wert>
      </p>
      <h2>Umsatzsteuer</h2>
      <p>Kleinunternehmer im Sinne von § 19 UStG. Es wird keine Umsatzsteuer berechnet und ausgewiesen; eine Umsatzsteuer-Identifikationsnummer besteht nicht.</p>
      <h2>Angebot nur für Unternehmer</h2>
      <p>Das Angebot auf dieser Website richtet sich ausschließlich an Unternehmer im Sinne von § 14 BGB, juristische Personen des öffentlichen Rechts und öffentlich-rechtliche Sondervermögen. Verträge mit Verbrauchern im Sinne von § 13 BGB werden nicht geschlossen.</p>
      <h2>Lebensmittelrechtlicher Hinweis</h2>
      <p>Alle angebotenen Lebensmittel werden in der Originalverpackung des Herstellers weitergegeben. Maßgeblich für Zutaten, Allergene und Mindesthaltbarkeit ist die Kennzeichnung auf der jeweiligen Verpackung.</p>
      <h2>Verantwortlich für den Inhalt</h2>
      <p>
        <Wert>{k.inhaber}</Wert>, Anschrift wie oben.
      </p>
      {k.aufsichtHinweis ? <p>{k.aufsichtHinweis}</p> : null}
      <h2>Streitbeilegung</h2>
      <p>Wir sind nicht bereit und nicht verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen. Das Angebot richtet sich nicht an Verbraucher.</p>
      <h2>Marken</h2>
      <p>Die in den Boxen enthaltenen Markenartikel sind Originalware der jeweiligen Hersteller. Markennamen werden ausschließlich zur Beschreibung des Inhalts genannt; die Marken gehören ihren jeweiligen Inhabern. Dankeskiste steht in keiner geschäftlichen Verbindung zu diesen Herstellern.</p>
    </Rechtstext>
  );
}
