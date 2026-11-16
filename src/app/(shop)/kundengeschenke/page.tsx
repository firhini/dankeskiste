import type { Metadata } from "next";
import Link from "next/link";
import { Ratgeber } from "@/components/shop/ratgeber";
import { ladeKatalog } from "@/lib/server/katalog";

export const ensureStatic = "navigation";
export const metadata: Metadata = {
  title: "Kundengeschenke unter 50 € – mit Logo, von Hand gepackt",
  description: "Kundengeschenke für Weihnachten und das ganze Jahr: Geschenkboxen unter 50 € mit Ihrem Logo und Grußkarte. Ab 5 Stück, Versand deutschlandweit.",
  alternates: { canonical: "/kundengeschenke" },
};

export default async function Seite() {
  const { boxen } = await ladeKatalog();
  const zeige = [...boxen.filter((b) => b.kollektionSlug === "kunden"), ...boxen.filter((b) => b.slug === "weihnachtskiste" || b.slug === "grosse-weihnachtskiste")];
  return (
    <Ratgeber
      label="Ratgeber · Kunden"
      name="Kundengeschenke"
      pfad="/kundengeschenke"
      titel={<>Kundengeschenke, die <em>nicht</em> in der Schublade landen</>}
      vorspann="Ein Geschenk an Kunden soll drei Dinge tun: ankommen, angenommen werden dürfen und an Sie erinnern. So klappt alles drei."
      boxen={zeige}
      boxenTitel={<>Für Kunden <em>und Geschäftspartner</em></>}
      schluss="Ein Dankeschön nach einem abgeschlossenen Auftrag bleibt länger im Gedächtnis als die zwanzigste Karte im Dezember."
      fragen={[
        { frage: "Bis zu welchem Wert sind Kundengeschenke absetzbar?", text: "Allgemein gilt: Geschenke an Geschäftspartner sind bis 50 € je Empfänger und Jahr als Betriebsausgabe abziehbar; liegt der Wert darüber, entfällt der Abzug ganz. Zur Geschenkverpackung zählt auch die Box selbst, Versandkosten zählen nicht mit. Details klärt Ihr Steuerberater." },
        { frage: "Dürfen meine Kunden das Geschenk überhaupt annehmen?", text: "Viele Unternehmen und Behörden haben Regeln für die Annahme von Geschenken, oft mit Wertgrenzen zwischen 25 und 50 €. Im Zweifel fragen Sie vorher nach oder wählen eine Kiste, die sich im Team teilen lässt." },
        { frage: "Kann ich jedem Kunden eine eigene Karte schreiben?", text: "Der gedruckte Grußtext ist für alle Boxen einer Bestellung gleich. Mit der handgeschriebenen Karte und den Namen aus Ihrer Empfängerliste wird jede Box persönlich; individuelle Texte je Empfänger stimmen wir über das Anfrageformular ab." },
        { frage: "Verschicken Sie direkt an meine Kunden?", text: "Ja. Sie laden eine Liste mit Namen und Adressen hoch, jede Box geht als eigenes Paket raus – mit Ihrem Logo auf dem Deckel und ohne Rechnung im Paket." },
      ]}
    >
      <h2>Warum etwas zum Essen fast immer richtig ist</h2>
      <p>Ein Kugelschreiber mit Logo sagt: Wir hatten noch welche. Eine Kiste mit Pasta, Pesto und Oliven sagt: Machen Sie sich einen schönen Abend. Lebensmittel werden aufgebraucht, geteilt und weitererzählt – und sie stehen nirgends herum.</p>
      <p>Deshalb gibt es bei Dankeskiste zwei Kisten eigens für Kunden: den herzhaften <Link href="/boxen/pasta-abend" className="textlink">Pasta-Abend</Link> und die klassische Kiste <Link href="/boxen/auf-gute-zusammenarbeit" className="textlink">Auf gute Zusammenarbeit</Link> mit Kaffee, Edelbitter und Marzipan.</p>

      <h2>Die 50-€-Grenze – allgemein erklärt</h2>
      <p>Für Geschenke an Personen, die nicht bei Ihnen angestellt sind, kennt das Steuerrecht eine Freigrenze von 50&nbsp;€ je Empfänger und Jahr. Wird sie überschritten, ist nicht nur der übersteigende Teil, sondern das ganze Geschenk nicht mehr als Betriebsausgabe abziehbar. Beide Kunden-Kisten liegen deshalb mit 39 und 45&nbsp;€ bewusst darunter.</p>
      <p>Zwei Dinge sollten Sie wissen: Dankeskiste berechnet als Kleinunternehmer keine Umsatzsteuer – der Rechnungsbetrag ist der Wert, mit dem Sie rechnen. Und: Bestellen Sie mehrere Geschenke für denselben Empfänger im Jahr, zählen sie zusammen. Wie Sie die Geschenke verbuchen und ob eine Pauschalversteuerung für den Empfänger sinnvoll ist, <strong>klärt Ihr Steuerberater</strong>.</p>

      <h2>Der richtige Moment</h2>
      <ul>
        <li><strong>Nach dem Auftrag.</strong> Wenn das Projekt abgenommen ist, nicht erst zum Jahresende.</li>
        <li><strong>Zum Start.</strong> Ein neuer Kunde, der in der ersten Woche eine Kiste bekommt, merkt sich das.</li>
        <li><strong>Zum Jubiläum der Zusammenarbeit.</strong> Fünf Jahre gemeinsamer Weg sind einen Gruß wert.</li>
        <li><strong>Zu Weihnachten.</strong> Dann aber früh: Was am 2. Dezember ankommt, wird wahrgenommen. Was am 20. kommt, geht unter.</li>
      </ul>

      <h2>So bleibt Ihr Name hängen</h2>
      <p>Auf jedem Deckel sitzt ein Sticker mit Ihrem Logo, in jeder Kiste liegt eine Karte mit Ihrem Text. Wer möchte, nimmt die <Link href="/firmengeschenke-mit-logo" className="textlink">Banderole mit Logo</Link> dazu. Auf den Lebensmitteln selbst steht nichts von Ihnen – und das ist gut so: Es bleibt ein Geschenk und wird kein Werbemittel.</p>

      <h2>Was Sie vor der Bestellung brauchen</h2>
      <ol>
        <li>Die Zahl der Empfänger (ab 5).</li>
        <li>Ihr Logo als PNG, SVG oder PDF.</li>
        <li>Zwei, drei Sätze für die Karte.</li>
        <li>Bei Einzelversand: Namen und Anschriften als Tabelle.</li>
      </ol>
    </Ratgeber>
  );
}
