import type { Metadata } from "next";
import Link from "next/link";
import { Ratgeber } from "@/components/shop/ratgeber";
import { euro } from "@/lib/geld";
import { ladeEinstellungen } from "@/lib/server/einstellungen";
import { ladeKatalog } from "@/lib/server/katalog";

export const ensureStatic = "navigation";
export const metadata: Metadata = {
  title: { absolute: "Firmengeschenke mit Logo ab 5 Stück · Dankeskiste" },
  description: "Firmengeschenke mit Logo schon ab 5 Boxen: Sticker und Grußkarte inklusive, Banderole und Namensanhänger auf Wunsch. So liefern Sie Ihr Logo richtig an.",
  alternates: { canonical: "/firmengeschenke-mit-logo" },
};

export default async function Seite() {
  const [{ boxen }, e] = await Promise.all([ladeKatalog(), ladeEinstellungen()]);
  const p = e.personalisierung;
  const alle3 = p.handgeschrieben.preisCent + p.banderole.preisCent + p.namensanhaenger.preisCent;
  return (
    <Ratgeber
      label="Personalisierung"
      name="Firmengeschenke mit Logo"
      pfad="/firmengeschenke-mit-logo"
      titel={<>Firmengeschenke mit Logo – <em>ohne</em> Mindestauflage von 50 Stück</>}
      vorspann={`Ihr Logo auf dem Deckel und Ihr Text auf der Karte gehören bei jeder Dankeskiste dazu. Schon ab ${e.mindestmenge} Boxen, ohne Einrichtungskosten.`}
      boxen={boxen.filter((b) => b.bestseller)}
      boxenTitel={<>Drei Boxen, <em>die ein Logo gut tragen</em></>}
      schluss="Logo hochladen, Text eintippen, fertig – die Personalisierung ist Schritt zwei von vier in der Bestellung."
      fragen={[
        { frage: "Was kostet das Logo auf der Box?", text: "Nichts extra. Der runde Logo-Sticker auf dem Deckel und die gedruckte Grußkarte sind im Preis jeder Box enthalten. Es gibt keine Einrichtungs- oder Druckvorstufenkosten." },
        { frage: "In welchem Format brauchen Sie das Logo?", text: "Am besten als Vektordatei (SVG oder PDF). PNG und JPG gehen auch, wenn das Logo mindestens 600 Pixel breit ist. Die Datei darf bis 4 MB groß sein. Ein Logo mit transparentem oder weißem Hintergrund wirkt auf dem runden Sticker am besten." },
        { frage: "Bekomme ich vorab einen Korrekturabzug?", text: "Auf Wunsch ja: Schreiben Sie „Bitte Abzug“ in die Bestellnotiz. Sie bekommen dann ein Foto des fertigen Stickers per Mail, bevor gepackt wird. Bei knappen Terminen vor Weihnachten kostet das etwa einen Tag." },
        { frage: "Können Sie das Logo auch auf den Karton drucken?", text: "Nein. Bedruckte Kartons lohnen sich erst ab einigen hundert Stück und brauchen Wochen Vorlauf. Mit Sticker und Banderole sieht die Box nach Ihrer Firma aus – auch bei fünf Stück und in fünf Tagen." },
      ]}
    >
      <h2>Wo Ihr Logo zu sehen ist</h2>
      <table>
        <thead>
          <tr className="label border-b border-ink text-left text-dunkel">
            <th scope="col" className="py-2.5 pr-3">Stelle</th>
            <th scope="col" className="py-2.5 pr-3">Was Sie bekommen</th>
            <th scope="col" className="py-2.5 text-right">Je Box</th>
          </tr>
        </thead>
        <tbody>
          {[
            ["Deckel", "Runder Sticker, 5 cm, mit Ihrem Logo", "inklusive"],
            ["In der Box", `Grußkarte A6 mit Ihrem Text (bis ${p.grusstextMaxZeichen} Zeichen)`, "inklusive"],
            ["Um die Box", "Banderole aus Papier, bedruckt mit Logo", `+ ${euro(p.banderole.preisCent, { immerCent: true })}`],
            ["Am Band", "Namensanhänger je Empfänger", `+ ${euro(p.namensanhaenger.preisCent, { immerCent: true })}`],
            ["Karte", "von Hand geschrieben statt gedruckt", `+ ${euro(p.handgeschrieben.preisCent, { immerCent: true })}`],
          ].map(([a, b, c]) => (
            <tr key={a} className="border-b border-salbei">
              <th scope="row" className="py-3 pr-3 text-left font-semibold">{a}</th>
              <td className="klein py-3 pr-3">{b}</td>
              <td className="zahl whitespace-nowrap py-3 text-right font-semibold">{c}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p>Alle drei Zusatzoptionen zusammen kosten {euro(alle3, { immerCent: true })} je Box. Eine Kiste für 45&nbsp;€ bleibt damit unter 50&nbsp;€.</p>

      <h2>Warum hier fünf Stück reichen</h2>
      <p>Große Werbemittelhändler lassen Kartons und Banderolen in der Druckerei fertigen. Das lohnt sich erst bei hohen Auflagen, deshalb gibt es dort Logo-Personalisierung meist ab 25 oder 50 Stück und mit Aufpreis. Bei Dankeskiste entstehen Sticker und Banderole in kleiner Auflage direkt neben dem Packtisch. Das ist langsamer je Stück, aber es gibt keine Mindestmenge außer den {e.mindestmenge} Boxen, ab denen wir überhaupt packen.</p>

      <h2>So liefern Sie das Logo an</h2>
      <ul>
        <li><strong>Format:</strong> SVG oder PDF (Vektor) ist ideal. PNG oder JPG ab 600 Pixel Breite funktioniert ebenfalls.</li>
        <li><strong>Hintergrund:</strong> transparent oder weiß. Der Sticker ist rund – ein Logo mit etwas Luft drumherum sieht besser aus als eines, das bis an den Rand reicht.</li>
        <li><strong>Farben:</strong> Der Druck erfolgt im Vierfarbdruck auf weißem oder Kraftpapier. Sonderfarben (Pantone) werden angenähert; kleine Abweichungen sind normal.</li>
        <li><strong>Rechte:</strong> Laden Sie nur Logos hoch, die Sie verwenden dürfen.</li>
      </ul>
      <p>Ist die Datei nicht druckfähig, melde ich mich, bevor irgendetwas gedruckt wird. Sie können das Logo auch nach der Bestellung per Mail nachreichen.</p>

      <h2>Was auf die Karte gehört</h2>
      <p>Zwei bis vier Sätze reichen. Nennen Sie den Anlass, sagen Sie Danke, unterschreiben Sie mit Namen – nicht mit „Ihre Geschäftsleitung“. Ein Beispiel:</p>
      <blockquote className="border-l-2 border-dunkel pl-5 font-serif text-[1.375rem] italic leading-snug text-dunkel">
        „Liebes Team, 2026 war das Jahr mit dem Umzug, der neuen Software und trotzdem pünktlichen Lieferungen. Danke dafür. Schöne Feiertage – Anna und Markus“
      </blockquote>
      <p>Wer es persönlicher möchte, wählt die <Link href="/bestellen" className="textlink">handgeschriebene Karte</Link>: jede einzeln mit Fineliner geschrieben.</p>

      <h2>Was wir nicht machen</h2>
      <p>Keine Gravuren, keine bestickten Textilien, keine bedruckten Lebensmittelverpackungen. Die Lebensmittel bleiben so, wie der Hersteller sie verpackt hat – mit allen Pflichtangaben. Ihr Logo steht auf der Kiste, nicht auf der Schokolade.</p>
    </Ratgeber>
  );
}
