import { asc, desc, eq } from "drizzle-orm";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { erfordereAdmin } from "@/auth";
import { Absenden, Formular } from "@/components/admin/formular";
import { AKnopf, Block, Meldung, Seite, Tabelle, feldKlein } from "@/components/admin/ui";
import { datumZahl, heuteBerlin, plusTage } from "@/lib/calc/deadlines";
import { euro } from "@/lib/geld";
import { db, schema } from "../../../../../../db";
import { artikelSpeichern } from "../../../aktionen";

/** Admin-Seiten rendern bewusst blockierend auf dem Server (kein Prerender, keine Sofort-Navigation). */
export const instant = false;

export const metadata: Metadata = { title: "Artikel bearbeiten" };

const KATEGORIEN = ["Kaffee & Tee", "Schokolade & Pralinen", "Gebäck", "Frühstück", "Nüsse & Snacks", "Getränke", "Feinkost", "Non-Food"];
const LAEDEN = ["REWE", "EDEKA", "Kaufland", "dm", "Rossmann", "Lidl", "Aldi Süd", "Metro"];

function F({ name, label, wert, ...rest }: { name: string; label: string; wert?: string | number | null } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label htmlFor={name} className="feldname">{label}</label>
      <input id={name} name={name} defaultValue={wert ?? ""} className={feldKlein} {...rest} />
    </div>
  );
}

export default async function ArtikelSeite({ params }: PageProps<"/admin/artikel/[id]">) {
  await erfordereAdmin();
  const { id } = await params;
  const neu = id === "neu";
  const [a] = neu ? [null] : await db.select().from(schema.articles).where(eq(schema.articles.id, id));
  if (!neu && !a) notFound();
  const [alkoholfrei, einkaeufe, verwendung] = await Promise.all([
    db.select({ id: schema.articles.id, name: schema.articles.name, marke: schema.articles.marke, groesse: schema.articles.groesse }).from(schema.articles).where(eq(schema.articles.alkohol, false)).orderBy(asc(schema.articles.name)),
    a ? db.select().from(schema.purchases).where(eq(schema.purchases.articleId, a.id)).orderBy(desc(schema.purchases.gekauftAm)).limit(12) : [],
    a ? db.select({ name: schema.boxes.name, id: schema.boxes.id }).from(schema.boxItems).innerJoin(schema.boxes, eq(schema.boxes.id, schema.boxItems.boxId)).where(eq(schema.boxItems.articleId, a.id)) : [],
  ]);
  const alt = a ? a.geprueftAm < plusTage(heuteBerlin(), -30) : false;
  return (
    <Seite titel={a ? `${a.marke} ${a.name}` : "Neuer Artikel"} hinweis={a ? `${a.groesse} · verwendet in: ${verwendung.map((v) => v.name).join(", ") || "keiner Box"}` : undefined} aktionen={<AKnopf href="/admin/artikel" hell>Zur Liste</AKnopf>}>
      {alt ? <Meldung art="fehler">Der Preis wurde zuletzt am {datumZahl(a!.geprueftAm)} geprüft – das ist über 30 Tage her. Bitte im Laden oder online prüfen und unten bestätigen.</Meldung> : null}
      <Formular aktion={artikelSpeichern}>
        <input type="hidden" name="id" value={a?.id ?? ""} />
        <div className="grid gap-x-6 lg:grid-cols-2">
          <Block titel="Artikel">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2"><F name="name" label="Name / Sorte" wert={a?.name} required /></div>
              <F name="marke" label="Marke" wert={a?.marke} />
              <F name="groesse" label="Größe (z. B. 250 g)" wert={a?.groesse} />
              <div>
                <label htmlFor="kategorie" className="feldname">Kategorie</label>
                <select id="kategorie" name="kategorie" defaultValue={a?.kategorie ?? KATEGORIEN[0]} className={feldKlein}>{KATEGORIEN.map((k) => <option key={k}>{k}</option>)}</select>
              </div>
              <F name="gewichtGramm" label="Gewicht mit Verpackung (g)" wert={a?.gewichtGramm ?? 0} type="number" min={0} required />
              <div className="sm:col-span-2"><F name="mhd" label="Mindesthaltbarkeit (Hinweis)" wert={a?.mhd} placeholder="z. B. 6–9 Monate; erst ab November einkaufen" /></div>
              <label className="klein flex items-center gap-2 sm:col-span-2">
                <input type="checkbox" name="aktiv" defaultChecked={a?.aktiv ?? true} className="h-5 w-5 accent-[#455230]" /> Aktiv (in Boxen wählbar)
              </label>
            </div>
          </Block>
          <Block titel="Einkauf und Preis">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="laden" className="feldname">Laden</label>
                <input id="laden" name="laden" list="laeden" defaultValue={a?.laden ?? ""} required className={feldKlein} />
                <datalist id="laeden">{LAEDEN.map((l) => <option key={l} value={l} />)}</datalist>
              </div>
              <F name="preis" label="Preis (€, brutto)" wert={a ? (a.preisCent / 100).toFixed(2).replace(".", ",") : ""} inputMode="decimal" required />
              <div className="sm:col-span-2"><F name="ersatz" label="Ersatzquelle" wert={a?.ersatz} placeholder="Wo gibt es den Artikel sonst?" /></div>
              <div className="sm:col-span-2"><F name="quelleUrl" label="Link zur Preisquelle" wert={a?.quelleUrl} type="url" /></div>
              <div className="sm:col-span-2"><F name="quelleHinweis" label="Was zeigt die Quelle?" wert={a?.quelleHinweis} /></div>
              <div>
                <label htmlFor="status" className="feldname">Preisstatus</label>
                <select id="status" name="status" defaultValue={a?.status ?? "geschaetzt"} className={feldKlein}>
                  <option value="belegt">belegt (im Laden / auf Händlerseite gesehen)</option>
                  <option value="richtwert">Richtwert (Online-Supermarkt, UVP)</option>
                  <option value="geschaetzt">geschätzt</option>
                </select>
              </div>
              <label className="klein flex items-center gap-2 self-end pb-2">
                <input type="checkbox" name="preisGeprueft" className="h-5 w-5 accent-[#455230]" /> Preis heute geprüft
              </label>
              {a ? <p className="klein text-dunkel sm:col-span-2">Zuletzt geprüft: {datumZahl(a.geprueftAm)} · Einstandspreis aus Einkäufen: {a.einstandCent != null ? euro(a.einstandCent, { immerCent: true }) : "noch keiner"} · Bestand {a.bestand}</p> : null}
            </div>
          </Block>
          <Block titel="Alkohol">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="klein flex items-center gap-2 sm:col-span-2">
                <input type="checkbox" name="alkohol" defaultChecked={a?.alkohol ?? false} className="h-5 w-5 accent-[#455230]" /> Enthält Alkohol
              </label>
              <F name="alkoholVol" label="Alkoholgehalt" wert={a?.alkoholVol} placeholder="z. B. 11 % vol" />
              <div>
                <label htmlFor="ersatzOhneAlkoholId" className="feldname">Ersatz bei „ohne Alkohol“</label>
                <select id="ersatzOhneAlkoholId" name="ersatzOhneAlkoholId" defaultValue={a?.ersatzOhneAlkoholId ?? ""} className={feldKlein}>
                  <option value="">– kein Ersatz (Artikel entfällt nicht automatisch)</option>
                  {alkoholfrei.map((x) => <option key={x.id} value={x.id}>{x.marke} {x.name}, {x.groesse}</option>)}
                </select>
              </div>
            </div>
          </Block>
          <Block titel="Zutaten und Allergene (für die Box-Seite)">
            <div className="space-y-3">
              <div>
                <label htmlFor="allergene" className="feldname">Allergene</label>
                <textarea id="allergene" name="allergene" rows={2} defaultValue={a?.allergene ?? ""} className={feldKlein} />
              </div>
              <div>
                <label htmlFor="zutaten" className="feldname">Zutaten (von der Packung abschreiben)</label>
                <textarea id="zutaten" name="zutaten" rows={4} defaultValue={a?.zutaten ?? ""} className={feldKlein} />
              </div>
              <label className="klein flex items-start gap-2">
                <input type="checkbox" name="allergeneGeprueft" defaultChecked={a?.allergeneGeprueft ?? false} className="mt-0.5 h-5 w-5 accent-[#455230]" />
                <span>An der Originalpackung geprüft. Erst dann erscheinen Zutaten und Allergene im Shop; vorher steht dort ein allgemeiner Hinweis.</span>
              </label>
            </div>
          </Block>
        </div>
        <Absenden className="knopf">{a ? "Artikel speichern" : "Artikel anlegen"}</Absenden>
      </Formular>
      {einkaeufe.length ? (
        <Block titel="Letzte Einkäufe" className="mt-6">
          <Tabelle kopf={["Datum", "Laden", "Menge", "Stückpreis"]}>
            {einkaeufe.map((e) => (
              <tr key={e.id}>
                <td className="zahl">{datumZahl(e.gekauftAm)}</td>
                <td>{e.laden}</td>
                <td className="zahl">{e.menge}</td>
                <td className="zahl">{euro(e.stueckpreisCent, { immerCent: true })}</td>
              </tr>
            ))}
          </Tabelle>
        </Block>
      ) : null}
    </Seite>
  );
}
