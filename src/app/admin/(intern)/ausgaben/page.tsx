import { asc, desc } from "drizzle-orm";
import type { Metadata } from "next";
import { erfordereAdmin } from "@/auth";
import { Absenden, Formular } from "@/components/admin/formular";
import { Block, Leer, Seite, Tabelle, feldKlein } from "@/components/admin/ui";
import { datumZahl, heuteBerlin } from "@/lib/calc/deadlines";
import { euro } from "@/lib/geld";
import { db, schema } from "../../../../../db";
import { ausgabeAnlegen, ausgabeLoeschen } from "../../aktionen";

/** Admin-Seiten rendern bewusst blockierend auf dem Server (kein Prerender, keine Sofort-Navigation). */
export const instant = false;

export const metadata: Metadata = { title: "Ausgaben" };

const KATEGORIEN = ["Flyer / Druck", "Visitenkarten", "Domain / Software", "Werbung (Ads)", "Sprit / Fahrtkosten", "Verpackung (Vorrat)", "Wareneinkauf (ohne Einkaufsliste)", "Porto / Versand", "Büro / Material", "Gebühren / Beiträge", "Sonstiges"];

export default async function Ausgaben() {
  await erfordereAdmin();
  const [ausgaben, kampagnen] = await Promise.all([
    db.select().from(schema.expenses).orderBy(desc(schema.expenses.datum), desc(schema.expenses.id)).limit(300),
    db.select({ id: schema.campaigns.id, name: schema.campaigns.name }).from(schema.campaigns).orderBy(asc(schema.campaigns.name)),
  ]);
  const jahr = heuteBerlin().slice(0, 4);
  const imJahr = ausgaben.filter((a) => a.datum.startsWith(jahr));
  const gemein = imJahr.filter((a) => !a.inBestellkosten).reduce((s, a) => s + a.betragCent, 0);
  const gesamt = imJahr.reduce((s, a) => s + a.betragCent, 0);
  return (
    <Seite titel="Ausgaben" hinweis={`${jahr}: ${euro(gesamt, { immerCent: true })} gesamt, davon ${euro(gemein, { immerCent: true })} Gemeinkosten, die anteilig auf Bestellungen umgelegt werden. Verpackung, Wareneinkauf und Porto stecken schon in den Bestellkosten und zählen nur im Steuer-Export.`}>
      <Block titel="Neue Ausgabe">
        <Formular aktion={ausgabeAnlegen} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[9rem_14rem_1fr_8rem_12rem_auto] lg:items-end">
          <div>
            <label htmlFor="datum" className="feldname">Datum</label>
            <input id="datum" name="datum" type="date" defaultValue={heuteBerlin()} required className={feldKlein} />
          </div>
          <div>
            <label htmlFor="kategorie" className="feldname">Kategorie</label>
            <select id="kategorie" name="kategorie" className={feldKlein}>
              {KATEGORIEN.map((k) => <option key={k}>{k}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="beschreibung" className="feldname">Beschreibung</label>
            <input id="beschreibung" name="beschreibung" placeholder="z. B. 500 Flyer A6, Mannheim" className={feldKlein} />
          </div>
          <div>
            <label htmlFor="betrag" className="feldname">Betrag (€)</label>
            <input id="betrag" name="betrag" inputMode="decimal" required className={feldKlein} />
          </div>
          <div>
            <label htmlFor="campaignId" className="feldname">Kampagne (optional)</label>
            <select id="campaignId" name="campaignId" className={feldKlein}>
              <option value="">–</option>
              {kampagnen.map((k) => <option key={k.id} value={k.id}>{k.name}</option>)}
            </select>
          </div>
          <Absenden>Speichern</Absenden>
        </Formular>
      </Block>
      <Block titel="Erfasste Ausgaben">
        {ausgaben.length === 0 ? (
          <Leer>Noch keine Ausgaben erfasst.</Leer>
        ) : (
          <Tabelle kopf={["Datum", "Kategorie", "Beschreibung", "Kampagne", "Betrag", ""]}>
            {ausgaben.map((a) => (
              <tr key={a.id}>
                <td className="zahl whitespace-nowrap">{datumZahl(a.datum)}</td>
                <td>{a.kategorie}{a.inBestellkosten ? <span className="text-dunkel"> · in Bestellkosten</span> : null}</td>
                <td>{a.beschreibung}</td>
                <td>{kampagnen.find((k) => k.id === a.campaignId)?.name ?? "–"}</td>
                <td className="zahl whitespace-nowrap">{euro(a.betragCent, { immerCent: true })}</td>
                <td>
                  <Formular aktion={ausgabeLoeschen} bestaetigen="Diese Ausgabe löschen?">
                    <input type="hidden" name="id" value={a.id} />
                    <Absenden className="textlink klein">Löschen</Absenden>
                  </Formular>
                </td>
              </tr>
            ))}
          </Tabelle>
        )}
      </Block>
    </Seite>
  );
}
