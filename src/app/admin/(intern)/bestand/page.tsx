import { asc } from "drizzle-orm";
import type { Metadata } from "next";
import { erfordereAdmin } from "@/auth";
import { Absenden, Formular } from "@/components/admin/formular";
import { Block, Seite, Tabelle, feldKlein } from "@/components/admin/ui";
import { euro } from "@/lib/geld";
import { ladeEinkaufsliste } from "@/lib/server/admin-daten";
import { db, schema } from "../../../../../db";
import { bestandSetzen } from "../../aktionen";

/** Admin-Seiten rendern bewusst blockierend auf dem Server (kein Prerender, keine Sofort-Navigation). */
export const instant = false;

export const metadata: Metadata = { title: "Bestand" };

export default async function Bestand() {
  await erfordereAdmin();
  const [artikel, verpackung, einkauf] = await Promise.all([
    db.select().from(schema.articles).orderBy(asc(schema.articles.kategorie), asc(schema.articles.name)),
    db.select().from(schema.packagingItems).orderBy(asc(schema.packagingItems.art), asc(schema.packagingItems.name)),
    ladeEinkaufsliste(),
  ]);
  const reserviert = new Map(einkauf.gruppen.flatMap((g) => g.zeilen.map((z) => [z.artikel.id, z.bedarf] as const)));
  const lagerwert = artikel.reduce((s, a) => s + Math.max(0, a.bestand) * (a.einstandCent ?? a.preisCent), 0);
  const knapp = (bestand: number, mindest: number, bedarf = 0) => bestand < 0 || bestand < bedarf || (mindest > 0 && bestand < mindest);
  return (
    <Seite titel="Bestand" hinweis={`Wird beim Einkauf erhöht und beim Status „Gepackt“ abgebucht. Lagerwert zu Einstandspreisen: ${euro(lagerwert, { immerCent: true })}.`}>
      <Block titel="Artikel">
        <Tabelle kopf={["Artikel", "Reserviert", "Einstand", "Bestand · Mindestbestand", ""]}>
          {artikel.map((a) => {
            const res = reserviert.get(a.id) ?? 0;
            const warn = knapp(a.bestand, a.mindestbestand, res);
            return (
              <tr key={a.id}>
                <td>
                  {a.marke} {a.name}, {a.groesse}
                  {warn ? <span className="label ml-2 rounded-[2px] bg-signal px-1.5 py-0.5 !text-[0.625rem] text-creme">knapp</span> : null}
                </td>
                <td className="zahl">{res || "–"}</td>
                <td className="zahl whitespace-nowrap">{a.einstandCent != null ? euro(a.einstandCent, { immerCent: true }) : <span className="text-dunkel">Katalog {euro(a.preisCent, { immerCent: true })}</span>}</td>
                <td colSpan={2}>
                  <Formular aktion={bestandSetzen} className="flex flex-wrap items-center gap-2">
                    <input type="hidden" name="id" value={a.id} />
                    <label className="nur-sr" htmlFor={`b-${a.id}`}>Bestand {a.name}</label>
                    <input id={`b-${a.id}`} name="bestand" type="number" defaultValue={a.bestand} className={`${feldKlein} w-20`} />
                    <label className="nur-sr" htmlFor={`mb-${a.id}`}>Mindestbestand {a.name}</label>
                    <input id={`mb-${a.id}`} name="mindestbestand" type="number" min={0} defaultValue={a.mindestbestand} className={`${feldKlein} w-20`} />
                    <Absenden className="textlink klein">Speichern</Absenden>
                  </Formular>
                </td>
              </tr>
            );
          })}
        </Tabelle>
      </Block>
      <Block titel="Verpackung">
        <Tabelle kopf={["Material", "Einheit", "Bestand · Mindestbestand"]}>
          {verpackung.map((v) => (
            <tr key={v.id}>
              <td>
                {v.name}
                {knapp(v.bestand, v.mindestbestand) ? <span className="label ml-2 rounded-[2px] bg-signal px-1.5 py-0.5 !text-[0.625rem] text-creme">knapp</span> : null}
              </td>
              <td>{v.einheit}</td>
              <td>
                <Formular aktion={bestandSetzen} className="flex flex-wrap items-center gap-2">
                  <input type="hidden" name="id" value={v.id} />
                  <input type="hidden" name="typ" value="verpackung" />
                  <label className="nur-sr" htmlFor={`vb-${v.id}`}>Bestand {v.name}</label>
                  <input id={`vb-${v.id}`} name="bestand" type="number" step="0.001" defaultValue={v.bestand} className={`${feldKlein} w-24`} />
                  <label className="nur-sr" htmlFor={`vm-${v.id}`}>Mindestbestand {v.name}</label>
                  <input id={`vm-${v.id}`} name="mindestbestand" type="number" step="0.001" min={0} defaultValue={v.mindestbestand} className={`${feldKlein} w-24`} />
                  <Absenden className="textlink klein">Speichern</Absenden>
                </Formular>
              </td>
            </tr>
          ))}
        </Tabelle>
      </Block>
    </Seite>
  );
}
