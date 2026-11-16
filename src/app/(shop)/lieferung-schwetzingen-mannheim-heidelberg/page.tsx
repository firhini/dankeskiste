import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/shop/jsonld";
import { Ratgeber } from "@/components/shop/ratgeber";
import { datumLang, lieferStatus } from "@/lib/calc/deadlines";
import { euro } from "@/lib/geld";
import { ladeEinstellungen } from "@/lib/server/einstellungen";
import { ladeKatalog } from "@/lib/server/katalog";
import { SITE_URL } from "@/lib/site";

export const ensureStatic = "navigation";
export const metadata: Metadata = {
  title: { absolute: "Firmengeschenke: Lieferung Mannheim, Heidelberg, Schwetzingen" },
  description: "Geschenkboxen für Firmen, persönlich geliefert in Schwetzingen, Mannheim, Heidelberg und Umgebung. Wunschtermin, ab 250 € Warenwert kostenlos.",
  alternates: { canonical: "/lieferung-schwetzingen-mannheim-heidelberg" },
};

const ORTE: [string, string][] = [
  ["68723", "Schwetzingen, Oftersheim, Plankstadt"],
  ["68766", "Hockenheim"],
  ["68775", "Ketsch"],
  ["68782", "Brühl"],
  ["68789", "St. Leon-Rot"],
  ["68804", "Altlußheim"],
  ["68809", "Neulußheim"],
  ["68535", "Edingen-Neckarhausen"],
  ["68542", "Heddesheim"],
  ["68526", "Ladenburg"],
  ["681", "Mannheim (Innenstadt, Neckarstadt, Lindenhof, Neckarau …)"],
  ["682", "Mannheim (Rheinau, Seckenheim, Friedrichsfeld, Feudenheim …)"],
  ["683", "Mannheim (Käfertal, Waldhof, Sandhofen, Vogelstang …)"],
  ["691", "Heidelberg, Leimen, Walldorf, Wiesloch, Schriesheim"],
  ["692", "Eppelheim, Dossenheim, Sandhausen, Nußloch und Umgebung"],
];

export default async function Seite() {
  const [{ boxen, heute }, e] = await Promise.all([ladeKatalog(), ladeEinstellungen()]);
  const pStatus = lieferStatus("persoenlich", heute, e.fristen);
  const bekannt = new Map(ORTE);
  const praefixe = e.lieferung.plzPraefixe;
  return (
    <>
      <Ratgeber
        label="Rhein-Neckar"
        name="Lieferung Schwetzingen, Mannheim, Heidelberg"
        pfad="/lieferung-schwetzingen-mannheim-heidelberg"
        titel={<>Firmengeschenke, persönlich geliefert in <em>Mannheim, Heidelberg</em> und Schwetzingen</>}
        vorspann="Im Rhein-Neckar-Raum kommen Ihre Geschenkboxen nicht mit dem Paketdienst, sondern mit mir: an Ihrem Wunschtag, bis in den Besprechungsraum."
        boxen={boxen.filter((b) => ["teamfruehstueck", "weihnachtskiste", "willkommen-im-team", "pasta-abend"].includes(b.slug))}
        boxenTitel={<>Wird in der Region <em>gern geliefert</em></>}
        schluss="Liegt Ihre Firma knapp außerhalb des Gebiets? Fragen Sie einfach – oft lässt sich eine Tour passend legen."
        fragen={[
          { frage: "Was kostet die persönliche Lieferung?", text: `${euro(e.lieferung.gebuehrCent, { immerCent: true })} je Bestellung. Ab ${euro(e.lieferung.freiAbCent)} Warenwert ist sie kostenlos.` },
          { frage: "Kann ich den Liefertag selbst bestimmen?", text: `Ja. In der Bestellung wählen Sie einen Tag von Montag bis Samstag, frühestens ${e.fristen.vorlaufPersoenlichWerktage} Werktage nach der Bestellung. Eine Uhrzeit stimmen wir kurz per Telefon oder Mail ab.` },
          { frage: "Liefern Sie auch an mehrere Standorte in der Region?", text: "Eine Bestellung geht an eine Adresse. Für zwei Standorte legen Sie zwei Bestellungen an oder schreiben über das Anfrageformular – dann plane ich eine gemeinsame Tour." },
          { frage: "Meine PLZ steht nicht in der Liste – und jetzt?", text: "Dann versenden wir mit DHL; im Umkreis ist das Paket in der Regel am nächsten Werktag da. Für größere Bestellungen knapp außerhalb des Gebiets lohnt sich eine kurze Anfrage." },
        ]}
      >
        <h2>Warum persönlich?</h2>
        <ul>
          <li><strong>Kein Bruch.</strong> Gläser und Flaschen fahren aufrecht im Kofferraum statt über Förderbänder.</li>
          <li><strong>Kein Verpackungsberg.</strong> Die Boxen kommen ohne Umkartons und Füllmaterial.</li>
          <li><strong>Ein fester Termin.</strong> Sie wissen, an welchem Tag die Kisten da sind – wichtig vor der Weihnachtsfeier.</li>
          <li><strong>Ein Gesicht.</strong> Wenn etwas nicht stimmt, klären wir es an der Tür.</li>
        </ul>

        <h2>Liefergebiet nach Postleitzahl</h2>
        <p>Die persönliche Lieferung lässt sich in der Bestellung wählen, sobald Ihre Postleitzahl im Gebiet liegt. Derzeit gehören dazu:</p>
        <table className="klein">
          <thead>
            <tr className="label border-b border-ink text-left text-dunkel">
              <th scope="col" className="py-2.5 pr-4">PLZ</th>
              <th scope="col" className="py-2.5">Orte</th>
            </tr>
          </thead>
          <tbody>
            {praefixe.map((p) => (
              <tr key={p} className="border-b border-salbei">
                <th scope="row" className="zahl whitespace-nowrap py-2.5 pr-4 text-left font-semibold">{p.length < 5 ? `${p}…` : p}</th>
                <td className="py-2.5">{bekannt.get(p) ?? (p.length < 5 ? `alle Postleitzahlen, die mit ${p} beginnen` : "–")}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <h2>Kosten und Termine</h2>
        <p>
          Die Lieferung kostet {euro(e.lieferung.gebuehrCent, { immerCent: true })}; ab {euro(e.lieferung.freiAbCent)} Warenwert – das sind zum Beispiel sechs Weihnachtskisten – ist sie kostenlos. Geliefert wird von Montag bis Samstag.
        </p>
        {e.fristen.aktiv && pStatus.verfuegbar && pStatus.saison ? (
          <p className="border-l-2 border-dunkel pl-4">
            <strong>{e.fristen.saisonName}:</strong> Bestellschluss für die persönliche Lieferung ist der {datumLang(e.fristen.persoenlich.bestellschluss)}. Geliefert wird vom {datumLang(e.fristen.persoenlich.fensterVon)} bis zum {datumLang(e.fristen.persoenlich.fensterBis)}.
          </p>
        ) : e.fristen.aktiv && !pStatus.verfuegbar ? (
          <p className="border-l-2 border-dunkel pl-4">Der Bestellschluss für die Lieferung vor dem Fest ist vorbei. Ab dem {datumLang(e.fristen.wiederAb, true)} liefere ich wieder regulär.</p>
        ) : null}

        <h2>So läuft die Übergabe</h2>
        <ol>
          <li>Am Vortag bekommen Sie eine kurze Nachricht mit dem ungefähren Zeitfenster.</li>
          <li>Ich bringe die Boxen bis zum Empfang oder in den Raum, den Sie nennen.</li>
          <li>Sie zählen kurz durch und unterschreiben den Lieferschein. Die Rechnung haben Sie da schon per Mail.</li>
        </ol>

        <h2>Für Büros in der Region: das Teamfrühstück</h2>
        <p>Eine Kiste gibt es fast nur hier: das <Link href="/boxen/teamfruehstueck" className="textlink">Teamfrühstück</Link> mit einem Pfund Kaffee, Konfitüren, Honig und Nuss-Nougat-Creme. Vier Gläser sind schwer und empfindlich – genau das Richtige für die Lieferung im Kofferraum.</p>
      </Ratgeber>
      <JsonLd
        daten={{
          "@context": "https://schema.org",
          "@type": "Service",
          name: "Persönliche Lieferung von Firmengeschenken im Rhein-Neckar-Raum",
          provider: { "@id": `${SITE_URL}/#organisation` },
          serviceType: "Lieferung von Geschenkboxen für Unternehmen",
          areaServed: ["Schwetzingen", "Mannheim", "Heidelberg", "Hockenheim", "Ketsch", "Brühl", "Plankstadt", "Oftersheim", "Eppelheim", "Ladenburg"].map((name) => ({ "@type": "City", name })),
          offers: { "@type": "Offer", price: (e.lieferung.gebuehrCent / 100).toFixed(2), priceCurrency: "EUR" },
        }}
      />
    </>
  );
}
