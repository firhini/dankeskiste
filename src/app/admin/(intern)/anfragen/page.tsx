import { desc } from "drizzle-orm";
import type { Metadata } from "next";
import { erfordereAdmin } from "@/auth";
import { Absenden, Formular } from "@/components/admin/formular";
import { Block, Leer, Seite, feldKlein } from "@/components/admin/ui";
import { datumZahl } from "@/lib/calc/deadlines";
import { db, schema } from "../../../../../db";
import { anfrageBearbeiten } from "../../aktionen";

/** Admin-Seiten rendern bewusst blockierend auf dem Server (kein Prerender, keine Sofort-Navigation). */
export const instant = false;

export const metadata: Metadata = { title: "Anfragen" };

export default async function Anfragen() {
  await erfordereAdmin();
  const anfragen = await db.select().from(schema.inquiries).orderBy(desc(schema.inquiries.createdAt)).limit(200);
  const offen = anfragen.filter((a) => a.status === "offen");
  const erledigt = anfragen.filter((a) => a.status === "erledigt");
  const Karte = ({ a }: { a: (typeof anfragen)[number] }) => (
    <li className="py-4 first:pt-0 last:pb-0">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4">
        <p className="font-semibold">
          {a.firma} <span className="klein font-normal text-dunkel">· {a.name}</span>
        </p>
        <p className="klein zahl text-dunkel">
          {datumZahl(a.createdAt.toISOString().slice(0, 10))} · {a.art === "musterbox" ? "Musterbox" : "Angebot"}
          {a.menge ? ` · ${a.menge}` : ""}
          {a.kampagne ? ` · Kampagne ${a.kampagne}` : ""}
        </p>
      </div>
      <p className="klein mt-1">
        <a href={`mailto:${a.email}`} className="textlink">{a.email}</a>
        {a.telefon ? <> · <a href={`tel:${a.telefon.replace(/[^\d+]/g, "")}`} className="textlink">{a.telefon}</a></> : null}
      </p>
      {a.nachricht ? <p className="klein mt-2 whitespace-pre-wrap border-l-2 border-salbei pl-3">{a.nachricht}</p> : null}
      <Formular aktion={anfrageBearbeiten} className="mt-3 flex flex-wrap items-end gap-2">
        <input type="hidden" name="id" value={a.id} />
        <div className="min-w-48 flex-1">
          <label htmlFor={`n-${a.id}`} className="label mb-1 block text-dunkel">Notiz</label>
          <input id={`n-${a.id}`} name="notiz" defaultValue={a.notiz} className={feldKlein} />
        </div>
        {a.status === "offen" ? <Absenden name="status" value="erledigt">Erledigt</Absenden> : <Absenden name="status" value="offen" className="textlink klein">Wieder öffnen</Absenden>}
      </Formular>
    </li>
  );
  return (
    <Seite titel="Anfragen" hinweis="Aus dem Formular „Angebot oder Musterbox anfragen“. Sie bekommen zu jeder Anfrage zusätzlich eine Mail.">
      <Block titel={`Offen (${offen.length})`}>{offen.length ? <ul className="divide-y divide-salbei/60">{offen.map((a) => <Karte key={a.id} a={a} />)}</ul> : <Leer>Keine offenen Anfragen.</Leer>}</Block>
      {erledigt.length ? <Block titel={`Erledigt (${erledigt.length})`}><ul className="divide-y divide-salbei/60">{erledigt.map((a) => <Karte key={a.id} a={a} />)}</ul></Block> : null}
    </Seite>
  );
}
