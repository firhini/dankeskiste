import { desc, inArray, sql } from "drizzle-orm";
import type { Metadata } from "next";
import { erfordereAdmin } from "@/auth";
import { Absenden, Formular } from "@/components/admin/formular";
import { Block, Leer, Meldung, Seite, Tabelle, feldKlein } from "@/components/admin/ui";
import { datumZahl } from "@/lib/calc/deadlines";
import { euro } from "@/lib/geld";
import { BEZAHLT_STATUS } from "@/lib/server/bestellungen";
import { stripeKonfiguriert } from "@/lib/server/stripe";
import { db, schema } from "../../../../../db";
import { rabattcodeAnlegen, rabattcodeUmschalten } from "../../aktionen";

/** Admin-Seiten rendern bewusst blockierend auf dem Server (kein Prerender, keine Sofort-Navigation). */
export const instant = false;

export const metadata: Metadata = { title: "Rabattcodes" };

export default async function Rabattcodes() {
  await erfordereAdmin();
  const [codes, nutzung] = await Promise.all([
    db.select().from(schema.discountCodes).orderBy(desc(schema.discountCodes.createdAt)),
    db
      .select({ code: schema.orders.rabattCode, n: sql<number>`count(*)::int`, rabatt: sql<number>`coalesce(sum(${schema.orders.rabattCodeCent}), 0)::int` })
      .from(schema.orders)
      .where(inArray(schema.orders.status, BEZAHLT_STATUS))
      .groupBy(schema.orders.rabattCode),
  ]);
  return (
    <Seite titel="Rabattcodes" hinweis="Werden als Stripe Promotion Codes angelegt; Stripe setzt Ablaufdatum und Nutzungslimit durch. Der Rabatt gilt für Boxen und Personalisierung, nicht für den Versand.">
      {!stripeKonfiguriert() ? <Meldung art="fehler">Stripe ist nicht eingerichtet (STRIPE_SECRET_KEY fehlt). Codes können erst danach angelegt werden.</Meldung> : null}
      <Block titel="Neuer Code">
        <Formular aktion={rabattcodeAnlegen} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[12rem_9rem_8rem_10rem_8rem_auto] lg:items-end">
          <div>
            <label htmlFor="code" className="feldname">Code</label>
            <input id="code" name="code" required placeholder="MANNHEIM10" autoCapitalize="characters" className={`${feldKlein} uppercase`} />
          </div>
          <div>
            <label htmlFor="art" className="feldname">Art</label>
            <select id="art" name="art" className={feldKlein}>
              <option value="prozent">Prozent</option>
              <option value="betrag">Betrag in €</option>
            </select>
          </div>
          <div>
            <label htmlFor="wert" className="feldname">Wert</label>
            <input id="wert" name="wert" required inputMode="decimal" placeholder="10" className={feldKlein} />
          </div>
          <div>
            <label htmlFor="gueltigBis" className="feldname">Gültig bis (optional)</label>
            <input id="gueltigBis" name="gueltigBis" type="date" className={feldKlein} />
          </div>
          <div>
            <label htmlFor="max" className="feldname">Limit (optional)</label>
            <input id="max" name="max" type="number" min={1} className={feldKlein} />
          </div>
          <Absenden>Anlegen</Absenden>
        </Formular>
      </Block>
      <Block titel="Codes">
        {codes.length === 0 ? (
          <Leer>Noch kein Rabattcode.</Leer>
        ) : (
          <Tabelle kopf={["Code", "Rabatt", "Gültig bis", "Eingelöst", "Rabatt gesamt", "Status", ""]}>
            {codes.map((c) => {
              const n = nutzung.find((x) => x.code === c.code);
              return (
                <tr key={c.id}>
                  <td className="zahl font-semibold">{c.code}</td>
                  <td className="zahl">{c.art === "prozent" ? `${c.wert} %` : euro(c.wert)}</td>
                  <td className="zahl">{c.gueltigBis ? datumZahl(c.gueltigBis.toISOString().slice(0, 10)) : "unbegrenzt"}</td>
                  <td className="zahl">{n?.n ?? 0}{c.maxEinloesungen ? ` von ${c.maxEinloesungen}` : ""}</td>
                  <td className="zahl">{euro(n?.rabatt ?? 0, { immerCent: true })}</td>
                  <td>{c.aktiv ? "aktiv" : "aus"}</td>
                  <td>
                    <Formular aktion={rabattcodeUmschalten}>
                      <input type="hidden" name="id" value={c.id} />
                      <Absenden className="textlink klein">{c.aktiv ? "Deaktivieren" : "Aktivieren"}</Absenden>
                    </Formular>
                  </td>
                </tr>
              );
            })}
          </Tabelle>
        )}
      </Block>
    </Seite>
  );
}
