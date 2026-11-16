import { asc } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { erfordereAdmin } from "@/auth";
import { Absenden, Formular } from "@/components/admin/formular";
import { AKnopf, Block, Seite, Tabelle } from "@/components/admin/ui";
import { datumZahl, heuteBerlin, plusTage } from "@/lib/calc/deadlines";
import { euro } from "@/lib/geld";
import { db, schema } from "../../../../../db";
import { preisBestaetigen } from "../../aktionen";

/** Admin-Seiten rendern bewusst blockierend auf dem Server (kein Prerender, keine Sofort-Navigation). */
export const instant = false;

export const metadata: Metadata = { title: "Artikel" };

const STATUS = { belegt: "belegt", richtwert: "Richtwert", geschaetzt: "geschätzt" } as const;

export default async function ArtikelListe({ searchParams }: PageProps<"/admin/artikel">) {
  await erfordereAdmin();
  const q = await searchParams;
  const filter = typeof q.filter === "string" ? q.filter : "";
  const alle = await db.select().from(schema.articles).orderBy(asc(schema.articles.laden), asc(schema.articles.kategorie), asc(schema.articles.name));
  const grenze = plusTage(heuteBerlin(), -30);
  const zeilen = alle.filter((a) => (filter === "alt" ? a.geprueftAm < grenze : filter === "allergene" ? !a.allergeneGeprueft && a.kategorie !== "Non-Food" : filter === "geschaetzt" ? a.status !== "belegt" : true));
  const tabs: [string, string, number][] = [
    ["", "Alle", alle.length],
    ["alt", "Preis älter als 30 Tage", alle.filter((a) => a.geprueftAm < grenze).length],
    ["geschaetzt", "Richtwert / geschätzt", alle.filter((a) => a.status !== "belegt").length],
    ["allergene", "Allergene ungeprüft", alle.filter((a) => !a.allergeneGeprueft && a.kategorie !== "Non-Food").length],
  ];
  return (
    <Seite titel="Artikel" hinweis="Der Katalog, aus dem Boxen zusammengestellt werden. Preise mit Prüfdatum älter als 30 Tage sind markiert." aktionen={<AKnopf href="/admin/artikel/neu">Neuer Artikel</AKnopf>}>
      <nav aria-label="Filter" className="mb-5 flex flex-wrap gap-1.5">
        {tabs.map(([wert, name, n]) => (
          <Link key={wert} href={wert ? `/admin/artikel?filter=${wert}` : "/admin/artikel"} aria-current={filter === wert ? "true" : undefined} className={`klein rounded-[2px] border px-2.5 py-1.5 no-underline ${filter === wert ? "border-dunkel bg-dunkel text-creme" : "border-salbei text-dunkel hover:border-dunkel"}`}>
            {name} <span className="zahl">({n})</span>
          </Link>
        ))}
      </nav>
      <Block>
        <Tabelle kopf={["Artikel", "Laden", "Preis", "Status", "Geprüft", "Bestand", ""]}>
          {zeilen.map((a) => {
            const alt = a.geprueftAm < grenze;
            return (
              <tr key={a.id} className={a.aktiv ? "" : "opacity-60"}>
                <td>
                  <Link href={`/admin/artikel/${a.id}`} className="textlink">
                    {a.marke} {a.name}
                  </Link>
                  <div className="text-dunkel">
                    {a.groesse} · {a.kategorie}
                    {a.alkohol ? " · Alkohol" : ""}
                    {!a.allergeneGeprueft && a.kategorie !== "Non-Food" ? " · Allergene ungeprüft" : ""}
                  </div>
                </td>
                <td>{a.laden}</td>
                <td className="zahl whitespace-nowrap">{euro(a.preisCent, { immerCent: true })}</td>
                <td>{a.status === "geschaetzt" ? <span className="label rounded-[2px] border border-ink px-1.5 py-0.5 !text-[0.625rem]">geschätzt</span> : STATUS[a.status]}</td>
                <td className="zahl whitespace-nowrap">
                  {datumZahl(a.geprueftAm)}
                  {alt ? <span className="label ml-2 rounded-[2px] bg-signal px-1.5 py-0.5 !text-[0.625rem] text-creme">prüfen</span> : null}
                </td>
                <td className="zahl">{a.bestand}</td>
                <td>
                  <Formular aktion={preisBestaetigen}>
                    <input type="hidden" name="id" value={a.id} />
                    <Absenden className="textlink klein whitespace-nowrap">Preis stimmt</Absenden>
                  </Formular>
                </td>
              </tr>
            );
          })}
        </Tabelle>
      </Block>
    </Seite>
  );
}
