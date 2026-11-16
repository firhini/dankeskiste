import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { erfordereAdmin } from "@/auth";
import { DruckKnopf } from "@/components/admin/druck";
import { AKnopf } from "@/components/admin/ui";
import { datumLang, heuteBerlin } from "@/lib/calc/deadlines";
import { ladeBestellung } from "@/lib/server/admin-daten";
import { ladeEinstellungenFrisch } from "@/lib/server/einstellungen";

/** Admin-Seiten rendern bewusst blockierend auf dem Server (kein Prerender, keine Sofort-Navigation). */
export const instant = false;

export const metadata: Metadata = { title: "Lieferschein" };

export default async function Lieferschein({ params }: PageProps<"/admin/bestellungen/[id]/lieferschein">) {
  await erfordereAdmin();
  const { id } = await params;
  const [daten, e] = await Promise.all([ladeBestellung(id), ladeEinstellungenFrisch()]);
  if (!daten) notFound();
  const { bestellung: b, positionen, empfaenger } = daten;
  const k = e.kontakt;
  return (
    <div className="mx-auto max-w-[48rem]">
      <div className="nicht-drucken mb-6 flex gap-2">
        <DruckKnopf />
        <AKnopf href={`/admin/bestellungen/${b.id}`} hell>Zur Bestellung</AKnopf>
      </div>
      <article className="border border-salbei p-8 print:border-0 print:p-0">
        <header className="mb-10 flex justify-between gap-6">
          <div>
            <p className="font-serif text-3xl text-dunkel">Dankeskiste</p>
            <p className="klein mt-1 text-dunkel">{k.inhaber} · {k.strasse} · {k.plzOrt}</p>
          </div>
          <div className="klein text-right">
            <p className="label">Lieferschein</p>
            <p className="zahl mt-1">{b.nummer}</p>
            <p className="zahl">{datumLang(heuteBerlin(), true)}</p>
          </div>
        </header>
        <address className="mb-10 not-italic">
          <strong>{b.lieferart === "mehrfach" ? b.firma : b.lieferFirma || b.firma}</strong>
          {b.lieferart !== "mehrfach" ? (
            <>
              {b.lieferName ? <><br />z. Hd. {b.lieferName}</> : null}
              <br />{b.lieferStrasse}{b.lieferZusatz ? `, ${b.lieferZusatz}` : ""}
              <br />{b.lieferPlz} {b.lieferOrt}
            </>
          ) : (
            <><br />{b.rechnungStrasse}<br />{b.rechnungPlz} {b.rechnungOrt}</>
          )}
        </address>
        <table className="w-full">
          <thead>
            <tr className="label border-b border-ink text-left"><th className="py-2">Menge</th><th className="py-2">Box</th><th className="py-2">Inhalt je Box</th></tr>
          </thead>
          <tbody>
            {positionen.map((p) => (
              <tr key={p.id} className="border-b border-salbei align-top">
                <td className="zahl py-3 pr-4">{p.menge}</td>
                <td className="py-3 pr-4 font-semibold">{p.boxName}</td>
                <td className="klein py-3">{p.inhalt.map((x) => `${x.menge > 1 ? `${x.menge} × ` : ""}${x.marke} ${x.name} (${x.groesse})`).join(" · ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {b.lieferart === "mehrfach" ? <p className="klein mt-6">Versand an {empfaenger.length} Einzeladressen laut Empfängerliste.</p> : null}
        <p className="klein mt-10">Bitte prüfen Sie die Lieferung bei Annahme. Alle Lebensmittel sind original verpackt; Zutaten, Allergene und Mindesthaltbarkeit stehen auf den Packungen.</p>
        <div className="mt-14 grid grid-cols-2 gap-10">
          <p className="klein border-t border-ink pt-2">Datum, Unterschrift Empfänger</p>
          <p className="klein border-t border-ink pt-2">Übergeben durch</p>
        </div>
        <footer className="klein mt-12 border-t border-salbei pt-3 text-dunkel">
          Dies ist keine Rechnung. Die Rechnung erhalten Sie per E-Mail. Gemäß § 19 UStG wird keine Umsatzsteuer berechnet.
        </footer>
      </article>
    </div>
  );
}
