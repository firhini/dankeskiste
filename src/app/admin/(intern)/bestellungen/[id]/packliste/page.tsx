import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { erfordereAdmin } from "@/auth";
import { DruckKnopf } from "@/components/admin/druck";
import { AKnopf, Seite } from "@/components/admin/ui";
import { datumLang } from "@/lib/calc/deadlines";
import { ladeBestellung } from "@/lib/server/admin-daten";

/** Admin-Seiten rendern bewusst blockierend auf dem Server (kein Prerender, keine Sofort-Navigation). */
export const instant = false;

export const metadata: Metadata = { title: "Packliste" };

export default async function Packliste({ params }: PageProps<"/admin/bestellungen/[id]/packliste">) {
  await erfordereAdmin();
  const { id } = await params;
  const daten = await ladeBestellung(id);
  if (!daten) notFound();
  const { bestellung: b, positionen, empfaenger } = daten;
  const p = b.personalisierung;
  const minuten = positionen.reduce((s, x) => s + x.menge * x.packMinuten, 0);
  return (
    <Seite titel={`Packliste ${b.nummer}`} hinweis={`${b.firma} · ${positionen.reduce((s, x) => s + x.menge, 0)} Boxen · ca. ${Math.ceil(minuten / 5) * 5} Minuten Packzeit`} aktionen={<><DruckKnopf /><AKnopf href={`/admin/bestellungen/${b.id}`} hell>Zur Bestellung</AKnopf></>}>
      <div className="klein mb-6 grid gap-x-8 gap-y-1 border border-salbei p-4 sm:grid-cols-2 print:border-black">
        <p>Band: <strong>{p.bandfarbe}</strong></p>
        <p>Karte: <strong>{p.handgeschrieben ? "handgeschrieben" : "gedruckt"}</strong></p>
        <p>Logo-Sticker: <strong>{p.logoUrl ? (p.logoName ?? "Kundenlogo") : "neutral"}</strong></p>
        <p>Banderole: <strong>{p.banderole ? "ja" : "nein"}</strong> · Namensanhänger: <strong>{p.namensanhaenger ? "ja" : "nein"}</strong></p>
        {b.ohneAlkohol ? <p className="font-semibold sm:col-span-2">Alle Boxen OHNE Alkohol packen.</p> : null}
        <p className="sm:col-span-2">Termin: <strong>{/^\d{4}-/.test(b.termin) ? datumLang(b.termin, true) : b.termin === "saison" ? "zum Fest" : "so bald wie möglich"}</strong></p>
        {p.grusstext ? <p className="whitespace-pre-wrap sm:col-span-2">Grußtext: „{p.grusstext}“</p> : null}
        {b.kundenNotiz ? <p className="whitespace-pre-wrap sm:col-span-2">Kundennotiz: {b.kundenNotiz}</p> : null}
      </div>
      {positionen.map((pos) => (
        <section key={pos.id} className="mb-7 break-inside-avoid">
          <h2 className="!text-[1.5rem]">
            <span className="zahl">{pos.menge}&nbsp;×</span> {pos.boxName} <span className="klein font-sans text-dunkel">Karton {pos.groesse}</span>
          </h2>
          <table className="klein mt-2 w-full">
            <thead>
              <tr className="border-b border-ink text-left">
                <th className="w-10 py-1.5">✓</th>
                <th className="py-1.5">Je Box</th>
                <th className="py-1.5">Artikel</th>
                <th className="py-1.5 text-right">Gesamt</th>
              </tr>
            </thead>
            <tbody>
              {pos.inhalt.map((x) => (
                <tr key={x.articleId} className="border-b border-salbei">
                  <td className="py-2"><span className="inline-block h-4 w-4 border border-ink" aria-hidden /></td>
                  <td className="zahl py-2">{x.menge}</td>
                  <td className="py-2">{x.marke} {x.name}, {x.groesse}{x.ersetzt ? ` (statt ${x.ersetzt})` : ""}</td>
                  <td className="zahl py-2 text-right font-semibold">{x.menge * pos.menge}</td>
                </tr>
              ))}
              {pos.verpackung.map((v) => (
                <tr key={v.packagingId} className="border-b border-salbei text-dunkel">
                  <td className="py-2"><span className="inline-block h-4 w-4 border border-ink" aria-hidden /></td>
                  <td className="zahl py-2">{String(v.menge).replace(".", ",")}</td>
                  <td className="py-2">{v.name}</td>
                  <td className="zahl py-2 text-right">{String(Math.round(v.menge * pos.menge * 100) / 100).replace(".", ",")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}
      {empfaenger.length ? (
        <section className="break-before-page">
          <h2 className="!text-[1.5rem]">Empfänger ({empfaenger.length})</h2>
          <table className="klein mt-2 w-full">
            <tbody>
              {empfaenger.map((x, i) => (
                <tr key={x.id} className="border-b border-salbei">
                  <td className="zahl w-8 py-2 align-top">{i + 1}</td>
                  <td className="py-2 align-top"><span className="inline-block h-4 w-4 border border-ink" aria-hidden /></td>
                  <td className="py-2">{x.name}{x.firma ? `, ${x.firma}` : ""}<br />{x.strasse}{x.zusatz ? `, ${x.zusatz}` : ""}, {x.plz} {x.ort}</td>
                  <td className="py-2 align-top">{x.menge > 1 ? `${x.menge} × ` : ""}{positionen.find((q) => q.boxSlug === x.boxSlug)?.boxName ?? x.boxSlug}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}
    </Seite>
  );
}
