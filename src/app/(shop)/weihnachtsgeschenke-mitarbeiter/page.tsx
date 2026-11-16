import type { Metadata } from "next";
import Link from "next/link";
import { Ratgeber } from "@/components/shop/ratgeber";
import { datumLang } from "@/lib/calc/deadlines";
import { euro } from "@/lib/geld";
import { ladeEinstellungen } from "@/lib/server/einstellungen";
import { ladeKatalog } from "@/lib/server/katalog";

export const ensureStatic = "navigation";
export const metadata: Metadata = {
  title: "Weihnachtsgeschenke für Mitarbeiter: Boxen ab 29 €",
  description: "Weihnachtsgeschenke für Mitarbeiter ab 5 Stück: Geschenkboxen von 29 bis 69 €, mit Logo und Karte, auch einzeln ins Homeoffice. Bestellschluss 10.12.",
  alternates: { canonical: "/weihnachtsgeschenke-mitarbeiter" },
};

export default async function Seite() {
  const [{ boxen }, e] = await Promise.all([ladeKatalog(), ladeEinstellungen()]);
  const weihnachten = boxen.filter((b) => b.kollektionSlug === "weihnachten");
  const zeige = weihnachten.length ? weihnachten : boxen.filter((b) => b.kollektionSlug === "mitarbeiter");
  const f = e.fristen;
  return (
    <Ratgeber
      label="Ratgeber · Weihnachten"
      name="Weihnachtsgeschenke für Mitarbeiter"
      pfad="/weihnachtsgeschenke-mitarbeiter"
      titel={<>Weihnachtsgeschenke für Mitarbeiter, <em>die ankommen</em></>}
      vorspann="Was ein Team wirklich freut, was es kosten darf und bis wann Sie bestellen müssen – eine ehrliche Übersicht von jemandem, der die Kisten selbst packt."
      boxen={zeige}
      boxenTitel={<>Drei Kisten, <em>die oft gewählt werden</em></>}
      schluss="Die meisten Bestellungen kommen in der letzten Novemberwoche. Wer früher bestellt, hat die freie Wahl beim Liefertag."
      fragen={[
        { frage: "Wie viel sollte ein Weihnachtsgeschenk für Mitarbeiter kosten?", text: "Üblich sind 25 bis 50 € pro Person. In diesem Rahmen liegen die meisten Dankeskisten. Wichtiger als der Betrag ist, dass alle im Team gleich behandelt werden und das Geschenk persönlich wirkt – etwa durch zwei Sätze auf der Karte." },
        { frage: "Bis wann muss ich für Weihnachten bestellen?", text: `Für den DHL-Versand bis zum ${datumLang(f.versand.bestellschluss, true)}, für die persönliche Lieferung in der Region bis zum ${datumLang(f.persoenlich.bestellschluss, true)}. Danach hilft nur noch eine Anfrage.` },
        { frage: "Kann jede Kollegin ihre Box nach Hause bekommen?", text: "Ja. Sie laden eine Empfängerliste als CSV-Datei hoch, jede Box wird einzeln mit DHL verschickt. Die Versandkosten fallen dann je Adresse an." },
        { frage: "Was ist, wenn jemand keinen Alkohol trinkt?", text: "Fünf der sechs Weihnachtskisten enthalten keinen Alkohol. Die große Kiste gibt es auf Wunsch mit Winterpunsch statt Wein; beim Einzelversand an Privatadressen packen wir grundsätzlich alkoholfrei." },
      ]}
    >
      <h2>Was darf es kosten?</h2>
      <p>Drei Preisstufen haben sich bewährt, und für jede gibt es eine Kiste:</p>
      <table className="zahl">
        <tbody>
          {weihnachten.filter((b) => ["kleine-weihnachtskiste", "weihnachtskiste", "grosse-weihnachtskiste"].includes(b.slug)).map((b) => (
            <tr key={b.slug} className="border-t border-salbei last:border-b">
              <th scope="row" className="py-3 pr-4 text-left font-semibold"><Link href={`/boxen/${b.slug}`} className="textlink">{b.name}</Link></th>
              <td className="klein py-3 pr-4">{b.kurz}</td>
              <td className="whitespace-nowrap py-3 text-right font-semibold">{euro(b.preisCent)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p>Ab {e.staffeln[0]?.ab ?? 10} Boxen sinkt der Preis je Box um {e.staffeln[0]?.prozent ?? 3}&nbsp;%, ab {e.staffeln.at(-1)?.ab ?? 100} um {e.staffeln.at(-1)?.prozent ?? 10}&nbsp;%. Sie können die Stufen mischen: kleine Kisten für Aushilfen und Werkstudenten, die Standardkiste fürs Team, die große für langjährige Kolleginnen.</p>

      <h2>Die Sache mit den 50 €</h2>
      <p>Viele Arbeitgeber orientieren sich an der Sachbezugsfreigrenze: Sachzuwendungen bis 50&nbsp;€ im Monat können für Mitarbeiter steuer- und abgabenfrei bleiben. Ein Cent darüber, und der ganze Betrag wird steuerpflichtig. Deshalb kostet die Weihnachtskiste 45&nbsp;€ – auch mit handgeschriebener Karte und Namensanhänger bleiben Sie darunter.</p>
      <p>Das ist eine allgemeine Orientierung, keine Steuerberatung. Ob die Grenze in Ihrem Betrieb in diesem Monat schon durch andere Leistungen ausgeschöpft ist, <strong>klärt Ihr Steuerberater</strong>.</p>

      <h2>Was gut ankommt – und was nicht</h2>
      <ul>
        <li><strong>Dinge zum Aufbrauchen.</strong> Kaffee, Schokolade, Gebäck. Niemand braucht die zwölfte Tasse mit Firmenlogo.</li>
        <li><strong>Bekannte Marken.</strong> Ein Geschenk soll nicht erst gegoogelt werden müssen.</li>
        <li><strong>Etwas zum Teilen.</strong> Wer zu Hause Familie hat, freut sich über Gebäck für alle.</li>
        <li><strong>Rücksicht.</strong> Nicht jeder trinkt Alkohol, nicht jeder verträgt Nüsse. Schreiben Sie Besonderheiten in die Bestellnotiz – wir tauschen einzelne Artikel aus.</li>
        <li><strong>Ein persönlicher Satz.</strong> „Danke für ein starkes Jahr“ von der Geschäftsführung wirkt mehr als jedes zusätzliche Päckchen Tee.</li>
      </ul>

      <h2>Büro, Homeoffice oder beides</h2>
      <p>Arbeitet das Team vor Ort, kommt alles in einem Sammelpaket – oder ich bringe die Kisten in Schwetzingen, Mannheim, Heidelberg und Umgebung selbst vorbei. Für verteilte Teams laden Sie eine Tabelle mit Namen und Adressen hoch; jede Box geht dann einzeln raus. Beides lässt sich nicht in einer Bestellung mischen, wohl aber in zwei.</p>

      <h2>Der Zeitplan für {f.saisonName}</h2>
      <ol>
        <li><strong>Bis Ende November:</strong> Anzahl klären, Adressen sammeln, Logo bereitlegen.</li>
        <li><strong>Bis {datumLang(f.versand.bestellschluss)}:</strong> Bestellschluss für den Versand. Zustellung bis {datumLang(f.versand.lieferungBis)}.</li>
        <li><strong>Bis {datumLang(f.persoenlich.bestellschluss)}:</strong> Bestellschluss für die persönliche Lieferung zwischen {datumLang(f.persoenlich.fensterVon)} und {datumLang(f.persoenlich.fensterBis)}.</li>
      </ol>
      <p>Wer die Weihnachtsfeier früher hat, wählt einfach einen früheren Termin. Weihnachtsgebäck kaufe ich bewusst erst kurz vor dem Packen ein, damit es frisch ist.</p>
    </Ratgeber>
  );
}
