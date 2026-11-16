import type { Metadata } from "next";
import Link from "next/link";
import { Ratgeber } from "@/components/shop/ratgeber";
import { euro } from "@/lib/geld";
import { ladeEinstellungen } from "@/lib/server/einstellungen";
import { ladeKatalog } from "@/lib/server/katalog";

export const ensureStatic = "navigation";
export const metadata: Metadata = {
  title: { absolute: "Onboarding-Geschenk: Welcome Box für neue Mitarbeiter" },
  description: "Onboarding-Geschenk für den ersten Arbeitstag: Welcome Box mit Notizbuch, Kaffee und Snacks, mit Logo und Namensanhänger. Auch direkt ins Homeoffice.",
  alternates: { canonical: "/onboarding-geschenk" },
};

export default async function Seite() {
  const [{ boxen }, e] = await Promise.all([ladeKatalog(), ladeEinstellungen()]);
  const welcome = boxen.find((b) => b.slug === "willkommen-im-team");
  const mitarbeiter = boxen.filter((b) => b.kollektionSlug === "mitarbeiter");
  return (
    <Ratgeber
      label="Ratgeber · Onboarding"
      name="Onboarding-Geschenk"
      pfad="/onboarding-geschenk"
      titel={<>Das Onboarding-Geschenk, das <em>am ersten Tag</em> schon da ist</>}
      vorspann="Der erste Arbeitstag entscheidet mit, ob jemand bleibt. Eine Kiste auf dem Schreibtisch kostet wenig und sagt viel: Wir haben mit dir gerechnet."
      boxen={[...(welcome ? [welcome] : []), ...mitarbeiter.filter((b) => b.slug !== "willkommen-im-team")]}
      boxenTitel={<>Für den Start <em>und danach</em></>}
      schluss="Viele Firmen bestellen einen kleinen Vorrat an Willkommenskisten – dann liegt immer eine bereit, wenn jemand anfängt."
      fragen={[
        { frage: "Was gehört in eine Welcome Box?", text: "Etwas Nützliches für die ersten Tage (Notizbuch), etwas für die Pause (Kaffee, Tee, Snack) und ein persönlicher Gruß vom Team. Technik, Zugangsdaten und Verträge gehören nicht in die Geschenkbox, sondern in die IT-Übergabe." },
        { frage: "Kann die Box vor dem ersten Tag zu Hause ankommen?", text: `Ja. Wählen Sie den Versand an mehrere Empfänger oder geben Sie die Privatadresse als Lieferadresse an. Bestellen Sie etwa ${e.fristen.vorlaufVersandWerktage + 3} Werktage vor dem Starttermin, dann ist die Box sicher rechtzeitig da.` },
        { frage: "Kann ich einzelne Boxen bestellen, wenn jemand Neues anfängt?", text: `Die Mindestmenge sind ${e.mindestmenge} Boxen je Bestellung. Für einzelne Neueinstellungen lohnt sich ein kleiner Vorrat: Alle Artikel der Willkommenskiste halten mehrere Monate.` },
        { frage: "Steht der Name der neuen Kollegin auf der Box?", text: "Mit der Option Namensanhänger ja: Ein Kraft-Anhänger mit dem Namen hängt am Band. Die Namen kommen aus der Empfängerliste oder aus Ihrer Bestellnotiz." },
      ]}
    >
      <h2>Was eine gute Welcome Box ausmacht</h2>
      <p>Sie muss am ersten Tag da sein, sie darf nicht nach Werbemittelkatalog aussehen, und sie sollte etwas enthalten, das man in der ersten Woche tatsächlich benutzt. Mehr braucht es nicht.</p>
      {welcome ? (
        <p>
          Die Kiste <Link href={`/boxen/${welcome.slug}`} className="textlink">{welcome.name}</Link> für {euro(welcome.preisCent)} enthält genau das: {welcome.inhalt.map((a) => `${a.marke} ${a.name}`.replace(/,.*$/, "")).join(", ")}. Dazu Ihr Logo auf dem Deckel und eine Karte mit Ihrer Begrüßung.
        </p>
      ) : null}

      <h2>Büro oder Remote: zwei Wege</h2>
      <ul>
        <li><strong>Im Büro:</strong> Die Kisten kommen gesammelt zu Ihnen und warten im Schrank auf den nächsten Starttermin. In Schwetzingen, Mannheim und Heidelberg bringe ich sie persönlich.</li>
        <li><strong>Remote:</strong> Die Box geht direkt an die Privatadresse. Wichtig ist das Timing – sie sollte ein, zwei Tage vor dem ersten Arbeitstag ankommen, nicht eine Woche danach.</li>
      </ul>

      <h2>Der Text auf der Karte</h2>
      <p>Schreiben Sie nicht „Herzlich willkommen im Unternehmen“. Schreiben Sie, wer sich freut und was am ersten Tag passiert:</p>
      <blockquote className="border-l-2 border-dunkel pl-5 font-serif text-[1.375rem] italic leading-snug text-dunkel">
        „Schön, dass du da bist. Um 9 Uhr holt dich Jana am Empfang ab, mittags gehen wir alle zusammen essen. Dein Team aus dem Vertrieb“
      </blockquote>
      <p>Der gedruckte Text ist für alle Boxen einer Bestellung gleich. Für einen Vorrat eignet sich deshalb ein Text ohne Datum und Namen – oder die handgeschriebene Karte, die Sie selbst ergänzen.</p>

      <h2>Steuerlich – nur zur Orientierung</h2>
      <p>Eine Willkommenskiste ist eine Sachzuwendung an Mitarbeiter. Dafür gibt es die monatliche Sachbezugsfreigrenze von 50&nbsp;€; die Kiste liegt mit {welcome ? euro(welcome.preisCent) : "39 €"} darunter. Ob die Grenze im Eintrittsmonat bereits durch andere Leistungen genutzt wird, <strong>klärt Ihr Steuerberater</strong>.</p>

      <h2>Nach dem ersten Tag</h2>
      <p>Onboarding endet nicht nach einer Woche. Für die Anlässe danach gibt es eigene Kisten: <Link href="/boxen/danke-fuers-projekt" className="textlink">Danke fürs Projekt</Link>, den <Link href="/boxen/geburtstagsgruss" className="textlink">Geburtstagsgruß</Link>, das <Link href="/boxen/jubilaeum" className="textlink">Jubiläum</Link> – und das <Link href="/boxen/teamfruehstueck" className="textlink">Teamfrühstück</Link> für den Einstand.</p>
    </Ratgeber>
  );
}
