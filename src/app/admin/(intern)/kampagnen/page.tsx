import { desc } from "drizzle-orm";
import type { Metadata } from "next";
import { erfordereAdmin } from "@/auth";
import { Absenden, Formular } from "@/components/admin/formular";
import { Block, Leer, Seite, feldKlein } from "@/components/admin/ui";
import { euro, prozent } from "@/lib/geld";
import { ladeKampagnen } from "@/lib/server/admin-daten";
import { SITE_URL } from "@/lib/site";
import { db, schema } from "../../../../../db";
import { kampagneSpeichern } from "../../aktionen";

/** Admin-Seiten rendern bewusst blockierend auf dem Server (kein Prerender, keine Sofort-Navigation). */
export const instant = false;

export const metadata: Metadata = { title: "Kampagnen" };

const KANAELE: [string, string][] = [["flyer", "Flyer"], ["visitenkarte", "Visitenkarte"], ["plakat", "Plakat / Aushang"], ["anzeige", "Anzeige"], ["ads", "Google Ads"], ["sonstiges", "Sonstiges"]];

export default async function Kampagnen() {
  await erfordereAdmin();
  const [kampagnen, codes] = await Promise.all([ladeKampagnen(), db.select({ code: schema.discountCodes.code }).from(schema.discountCodes).orderBy(desc(schema.discountCodes.createdAt))]);
  const anzeige = SITE_URL.replace(/^https?:\/\//, "");
  return (
    <Seite titel="Kampagnen" hinweis="Jeder Flyer und jede Visitenkarte bekommt einen eigenen Kurzlink mit QR-Code. Gezählt werden nur Aufrufe pro Tag – ohne IP-Adresse, Cookie oder Geräteerkennung.">
      <Block titel="Neue Kampagne">
        <Formular aktion={kampagneSpeichern} leeren className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1.2fr_1fr_10rem_8rem_10rem_auto] lg:items-end">
          <div>
            <label htmlFor="name" className="feldname">Name</label>
            <input id="name" name="name" required placeholder="Flyer Mannheim Quadrate" className={feldKlein} />
          </div>
          <div>
            <label htmlFor="slug" className="feldname">Kurzlink /k/…</label>
            <input id="slug" name="slug" placeholder="flyer-mannheim" className={feldKlein} />
          </div>
          <div>
            <label htmlFor="kanal" className="feldname">Kanal</label>
            <select id="kanal" name="kanal" className={feldKlein}>{KANAELE.map(([w, n]) => <option key={w} value={w}>{n}</option>)}</select>
          </div>
          <div>
            <label htmlFor="kosten" className="feldname">Kosten (€)</label>
            <input id="kosten" name="kosten" inputMode="decimal" placeholder="0" className={feldKlein} />
          </div>
          <div>
            <label htmlFor="rabattCode" className="feldname">Rabattcode (optional)</label>
            <input id="rabattCode" name="rabattCode" list="codes" className={`${feldKlein} uppercase`} />
            <datalist id="codes">{codes.map((c) => <option key={c.code} value={c.code} />)}</datalist>
          </div>
          <Absenden>Anlegen</Absenden>
        </Formular>
        <p className="klein mt-3 text-dunkel">Mit Rabattcode zählen auch Bestellungen zur Kampagne, bei denen jemand die Adresse später von Hand eintippt und den Code vom Flyer nutzt.</p>
      </Block>
      {kampagnen.length === 0 ? (
        <Block><Leer>Noch keine Kampagne. Legen Sie eine an, laden Sie den QR-Code herunter und drucken Sie ihn auf den Flyer.</Leer></Block>
      ) : (
        kampagnen.map((k) => (
          <Block key={k.kampagne.id} titel={`${k.kampagne.name}${k.kampagne.aktiv ? "" : " · pausiert"}`} rechts={<span className="klein zahl text-dunkel">{anzeige}/k/{k.kampagne.slug}</span>}>
            <div className="grid gap-5 md:grid-cols-[9rem_1fr]">
              <div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/admin/kampagnen/${k.kampagne.id}/qr`} alt={`QR-Code für ${k.kampagne.name}`} width={144} height={144} className="border border-salbei" />
                <p className="klein mt-2 flex gap-3">
                  <a className="textlink" href={`/admin/kampagnen/${k.kampagne.id}/qr?download`}>SVG</a>
                  <a className="textlink" href={`/admin/kampagnen/${k.kampagne.id}/qr?format=png&download`}>PNG</a>
                  <a className="textlink" href={`/admin/kampagnen/${k.kampagne.id}/qr?format=png&grund=weiss&download`}>PNG weiß</a>
                </p>
              </div>
              <div>
                <dl className="grid grid-cols-3 gap-x-4 gap-y-3 sm:grid-cols-6">
                  {[
                    ["Scans", String(k.scans)],
                    ["7 Tage", String(k.scans7Tage)],
                    ["Bestellungen", String(k.bestellungen)],
                    ["Umsatz", euro(k.umsatzCent)],
                    ["Gewinn", euro(k.gewinnCent)],
                    ["Kosten", euro(k.kostenCent)],
                  ].map(([name, wert]) => (
                    <div key={name}>
                      <dt className="label text-dunkel">{name}</dt>
                      <dd className="zahl mt-0.5 font-serif text-xl">{wert}</dd>
                    </div>
                  ))}
                </dl>
                <p className="klein mt-3">
                  ROI: <strong className="zahl">{k.roiProzent == null ? "– (keine Kosten erfasst)" : prozent(k.roiProzent, 0)}</strong>
                  {k.scans > 0 ? <> · Umwandlung: <span className="zahl">{prozent((k.bestellungen / k.scans) * 100)}</span> der Scans bestellen</> : null}
                  {k.kampagne.rabattCode ? <> · Code <span className="zahl">{k.kampagne.rabattCode}</span></> : null}
                </p>
                <details className="mt-3">
                  <summary className="textlink klein inline-block">Bearbeiten</summary>
                  <Formular aktion={kampagneSpeichern} className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:items-end">
                    <input type="hidden" name="id" value={k.kampagne.id} />
                    <input type="hidden" name="slug" value={k.kampagne.slug} />
                    <div>
                      <label className="feldname" htmlFor={`n${k.kampagne.id}`}>Name</label>
                      <input id={`n${k.kampagne.id}`} name="name" defaultValue={k.kampagne.name} className={feldKlein} />
                    </div>
                    <div>
                      <label className="feldname" htmlFor={`z${k.kampagne.id}`}>Zielseite</label>
                      <input id={`z${k.kampagne.id}`} name="ziel" defaultValue={k.kampagne.ziel} className={feldKlein} />
                    </div>
                    <div>
                      <label className="feldname" htmlFor={`k${k.kampagne.id}`}>Kosten (€)</label>
                      <input id={`k${k.kampagne.id}`} name="kosten" defaultValue={(k.kampagne.kostenCent / 100).toFixed(2).replace(".", ",")} className={feldKlein} />
                    </div>
                    <div>
                      <label className="feldname" htmlFor={`c${k.kampagne.id}`}>Rabattcode</label>
                      <input id={`c${k.kampagne.id}`} name="rabattCode" defaultValue={k.kampagne.rabattCode ?? ""} className={`${feldKlein} uppercase`} />
                    </div>
                    <input type="hidden" name="kanal" value={k.kampagne.kanal} />
                    <div>
                      <label className="feldname" htmlFor={`a${k.kampagne.id}`}>Status</label>
                      <select id={`a${k.kampagne.id}`} name="aktiv" defaultValue={k.kampagne.aktiv ? "an" : "aus"} className={feldKlein}>
                        <option value="an">aktiv</option>
                        <option value="aus">pausiert (Link leitet nur noch weiter)</option>
                      </select>
                    </div>
                    <Absenden>Speichern</Absenden>
                  </Formular>
                  <p className="klein mt-2 text-dunkel">Der Kurzlink selbst bleibt unverändert, damit gedruckte QR-Codes weiter funktionieren.</p>
                </details>
              </div>
            </div>
          </Block>
        ))
      )}
    </Seite>
  );
}
