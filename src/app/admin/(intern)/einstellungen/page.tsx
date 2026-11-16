import { asc } from "drizzle-orm";
import type { Metadata } from "next";
import { erfordereAdmin } from "@/auth";
import { EinstellungenEditor } from "@/components/admin/einstellungen-editor";
import { Absenden, Formular, FotoEingabe } from "@/components/admin/formular";
import { Systemstatus } from "@/components/admin/systemstatus";
import { Block, Seite, feldKlein } from "@/components/admin/ui";
import { ladeEinstellungenFrisch } from "@/lib/server/einstellungen";
import { db, schema } from "../../../../../db";
import { inhaberFotoEntfernen, inhaberFotoSpeichern, kollektionSpeichern } from "../../aktionen";

/** Admin-Seiten rendern bewusst blockierend auf dem Server (kein Prerender, keine Sofort-Navigation). */
export const instant = false;

export const metadata: Metadata = { title: "Einstellungen" };

export default async function Einstellungen() {
  await erfordereAdmin();
  const [e, kollektionen] = await Promise.all([ladeEinstellungenFrisch(), db.select().from(schema.collections).orderBy(asc(schema.collections.sortierung))]);
  return (
    <Seite titel="Einstellungen" hinweis="Änderungen gelten sofort für den Shop und für neue Bestellungen. Bereits bezahlte Bestellungen behalten ihre Preise.">
      <Systemstatus e={e} />
      <Block titel="Foto für „Wer packt Ihre Kiste?“">
        <div className="flex flex-wrap items-start gap-5">
          {e.kontakt.fotoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={e.kontakt.fotoUrl} alt="Aktuelles Foto" width={96} height={120} className="h-[120px] w-24 rounded-[2px] object-cover" />
          ) : null}
          <div className="min-w-0 flex-1">
            <p className="klein max-w-[60ch] text-dunkel">Ein echtes Foto von Ihnen am Packtisch – Hochformat, gern mit dem Handy aufgenommen. Es erscheint auf der Startseite neben Ihrem Namen. Ohne Foto wird der Abschnitt nur mit Text gezeigt.</p>
            <Formular aktion={inhaberFotoSpeichern} leeren className="mt-3 flex flex-wrap items-center gap-3">
              <label className="nur-sr" htmlFor="inhaberfoto">Foto auswählen</label>
              <div className="min-w-[14rem] flex-1"><FotoEingabe id="inhaberfoto" /></div>
              <Absenden>Foto hochladen</Absenden>
            </Formular>
            {e.kontakt.fotoUrl ? (
              <Formular aktion={inhaberFotoEntfernen} bestaetigen="Das Foto von der Startseite entfernen?" className="mt-1">
                <Absenden className="textlink klein">Foto entfernen</Absenden>
              </Formular>
            ) : null}
          </div>
        </div>
      </Block>
      <EinstellungenEditor start={e} kollektionen={kollektionen.map((k) => ({ slug: k.slug, name: k.name }))} />
      <Block titel="Kollektionen: Texte und Sichtbarkeit" className="mt-8">
        <div className="space-y-5">
          {kollektionen.map((k) => (
            <Formular key={k.id} aktion={kollektionSpeichern} className="grid gap-3 border-b border-salbei/60 pb-5 last:border-0 last:pb-0 sm:grid-cols-2 lg:grid-cols-[1fr_1.4fr_9rem_9rem_auto] lg:items-end">
              <input type="hidden" name="id" value={k.id} />
              <div>
                <label className="feldname" htmlFor={`kn${k.id}`}>Name</label>
                <input id={`kn${k.id}`} name="name" defaultValue={k.name} className={feldKlein} />
              </div>
              <div>
                <label className="feldname" htmlFor={`kk${k.id}`}>Kurzzeile</label>
                <input id={`kk${k.id}`} name="kurz" defaultValue={k.kurz} className={feldKlein} />
              </div>
              <div>
                <label className="feldname" htmlFor={`kv${k.id}`}>Sichtbar ab</label>
                <input id={`kv${k.id}`} name="sichtbarVon" type="date" defaultValue={k.sichtbarVon ?? ""} className={feldKlein} />
              </div>
              <div>
                <label className="feldname" htmlFor={`kb${k.id}`}>Sichtbar bis</label>
                <input id={`kb${k.id}`} name="sichtbarBis" type="date" defaultValue={k.sichtbarBis ?? ""} className={feldKlein} />
              </div>
              <label className="klein flex items-center gap-2 pb-2"><input type="checkbox" name="aktiv" defaultChecked={k.aktiv} className="h-5 w-5 accent-[#455230]" /> aktiv</label>
              <div className="sm:col-span-2 lg:col-span-4">
                <label className="feldname" htmlFor={`kt${k.id}`}>Beschreibung</label>
                <textarea id={`kt${k.id}`} name="beschreibung" rows={2} defaultValue={k.beschreibung} className={feldKlein} />
              </div>
              <Absenden>Speichern</Absenden>
            </Formular>
          ))}
        </div>
      </Block>
    </Seite>
  );
}
