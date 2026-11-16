import { and, desc, eq, ilike, ne, or, sql } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { erfordereAdmin } from "@/auth";
import { Block, Leer, Seite, StatusMarke, Tabelle, feldKlein, knopfKlein } from "@/components/admin/ui";
import { datumZahl } from "@/lib/calc/deadlines";
import { euro } from "@/lib/geld";
import { db, schema } from "../../../../../db";
import type { BestellStatus } from "../../../../../db/schema";

/** Admin-Seiten rendern bewusst blockierend auf dem Server (kein Prerender, keine Sofort-Navigation). */
export const instant = false;

export const metadata: Metadata = { title: "Bestellungen" };

const FILTER: [string, string][] = [
  ["", "Alle"], ["neu", "Neu"], ["eingekauft", "Eingekauft"], ["gepackt", "Gepackt"], ["versendet", "Versendet"],
  ["geliefert", "Geliefert"], ["abgeschlossen", "Abgeschlossen"], ["zahlung_ausstehend", "Zahlung offen"], ["storniert", "Storniert"],
];
const LIEFERART = { versand: "Versand", mehrfach: "Mehrfachversand", persoenlich: "Persönlich" } as const;

export default async function Bestellungen({ searchParams }: PageProps<"/admin/bestellungen">) {
  await erfordereAdmin();
  const q = await searchParams;
  const status = typeof q.status === "string" ? q.status : "";
  const suche = typeof q.q === "string" ? q.q.trim().slice(0, 80) : "";
  const bedingungen = [ne(schema.orders.status, "offen")];
  if (status) bedingungen.push(eq(schema.orders.status, status as BestellStatus));
  if (suche) {
    const muster = `%${suche.replace(/[%_]/g, "")}%`;
    bedingungen.push(or(ilike(schema.orders.nummer, muster), ilike(schema.orders.firma, muster), ilike(schema.orders.email, muster), ilike(schema.orders.ansprechpartner, muster), ilike(schema.orders.sendungsnummer, muster))!);
  }
  const zeilen = await db
    .select({
      b: schema.orders,
      boxen: sql<number>`(select coalesce(sum(menge), 0)::int from order_items where order_id = "orders"."id")`,
    })
    .from(schema.orders)
    .where(and(...bedingungen))
    .orderBy(desc(schema.orders.createdAt))
    .limit(200);

  return (
    <Seite titel="Bestellungen" hinweis="Ablauf: Neu → Eingekauft → Gepackt → Versendet/Geliefert → Abgeschlossen.">
      <div className="nicht-drucken mb-5 flex flex-wrap items-center gap-x-4 gap-y-3">
        <nav aria-label="Status" className="flex flex-wrap gap-1.5">
          {FILTER.map(([wert, name]) => (
            <Link
              key={wert}
              href={`/admin/bestellungen?${new URLSearchParams({ ...(wert ? { status: wert } : {}), ...(suche ? { q: suche } : {}) })}`}
              aria-current={status === wert ? "true" : undefined}
              className={`klein rounded-[2px] border px-2.5 py-1.5 no-underline ${status === wert ? "border-dunkel bg-dunkel text-creme" : "border-salbei text-dunkel hover:border-dunkel"}`}
            >
              {name}
            </Link>
          ))}
        </nav>
        <form className="ml-auto flex gap-2" role="search">
          {status ? <input type="hidden" name="status" value={status} /> : null}
          <label className="nur-sr" htmlFor="q">
            Suche nach Nummer, Firma, E-Mail oder Sendungsnummer
          </label>
          <input id="q" name="q" defaultValue={suche} placeholder="Nummer, Firma, E-Mail …" className={`${feldKlein} w-56`} />
          <button className={`${knopfKlein} knopf-hell`}>Suchen</button>
        </form>
      </div>
      <Block>
        {zeilen.length === 0 ? (
          <Leer>{suche || status ? "Keine Bestellung passt zu diesem Filter." : "Noch keine Bestellungen. Sobald jemand bezahlt, erscheint die Bestellung hier."}</Leer>
        ) : (
          <Tabelle kopf={["Nummer", "Datum", "Firma", "Boxen", "Lieferung", "Summe", "Status"]}>
            {zeilen.map(({ b, boxen }) => (
              <tr key={b.id}>
                <td className="whitespace-nowrap">
                  <Link href={`/admin/bestellungen/${b.id}`} className="textlink zahl">
                    {b.nummer}
                  </Link>
                </td>
                <td className="zahl whitespace-nowrap">{datumZahl((b.bezahltAm ?? b.createdAt).toISOString().slice(0, 10))}</td>
                <td>
                  {b.firma}
                  <div className="text-dunkel">{b.ansprechpartner}</div>
                </td>
                <td className="zahl">{boxen}</td>
                <td className="whitespace-nowrap">
                  {LIEFERART[b.lieferart]}
                  <div className="zahl text-dunkel">{/^\d{4}-/.test(b.termin) ? datumZahl(b.termin) : b.termin === "saison" ? "zum Fest" : "sofort"}</div>
                </td>
                <td className="zahl whitespace-nowrap">{euro(b.bezahltCent ?? b.summeCent, { immerCent: true })}</td>
                <td>
                  <StatusMarke status={b.status} />
                </td>
              </tr>
            ))}
          </Tabelle>
        )}
      </Block>
    </Seite>
  );
}
