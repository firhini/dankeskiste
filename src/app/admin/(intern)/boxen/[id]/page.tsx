import { asc } from "drizzle-orm";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { erfordereAdmin } from "@/auth";
import { BoxEditor } from "@/components/admin/box-editor";
import { Absenden, Formular, FotoEingabe } from "@/components/admin/formular";
import { AKnopf, Block, Seite, feldKlein } from "@/components/admin/ui";
import { Bild } from "@/components/bild";
import { ladeBoxenMitKalkulation } from "@/lib/server/admin-daten";
import { ladeEinstellungenFrisch } from "@/lib/server/einstellungen";
import { db, schema } from "../../../../../../db";
import { verpackungJeGroesse } from "../../../../../../db/seed-data/verpackung";
import { bildHochladen, bildLoeschen, type BoxEingabe } from "../../../aktionen";

/** Admin-Seiten rendern bewusst blockierend auf dem Server (kein Prerender, keine Sofort-Navigation). */
export const instant = false;

export const metadata: Metadata = { title: "Box bearbeiten" };

const ART_NAME: Record<string, string> = { hero: "Geöffnet, schräg von oben", flatlay: "Von oben", geschlossen: "Geschlossen mit Sticker", foto: "Weiteres Foto" };

export default async function BoxSeite({ params }: PageProps<"/admin/boxen/[id]">) {
  await erfordereAdmin();
  const { id } = await params;
  const neu = id === "neu";
  const e = await ladeEinstellungenFrisch();
  const [kollektionen, artikel, verpackung, daten] = await Promise.all([
    db.select({ id: schema.collections.id, name: schema.collections.name }).from(schema.collections).orderBy(asc(schema.collections.sortierung)),
    db.select().from(schema.articles).orderBy(asc(schema.articles.kategorie), asc(schema.articles.name)),
    db.select().from(schema.packagingItems).orderBy(asc(schema.packagingItems.art), asc(schema.packagingItems.name)),
    neu ? Promise.resolve([]) : ladeBoxenMitKalkulation(e, Number(id) || 0),
  ]);
  const b = daten[0];
  if (!neu && !b) notFound();
  const start: BoxEingabe = b
    ? {
        id: b.box.id, name: b.box.name, slug: b.box.slug, collectionId: b.box.collectionId, anlass: b.box.anlass, zielgruppe: b.box.zielgruppe, kurz: b.box.kurz,
        text: b.box.text, preisCent: b.box.preisCent, groesse: b.box.groesse, packMinuten: b.box.packMinuten, bestseller: b.box.bestseller, aktiv: b.box.aktiv,
        sichtbarVon: b.box.sichtbarVon, sichtbarBis: b.box.sichtbarBis, sortierung: b.box.sortierung, band: b.box.band, seoTitel: b.box.seoTitel, seoBeschreibung: b.box.seoBeschreibung,
        artikel: b.artikel.map((x) => ({ articleId: x.artikel.id, menge: x.menge })),
        verpackung: b.verpackung.map((x) => ({ packagingId: x.item.id, menge: x.menge })),
      }
    : {
        id: null, name: "", slug: "", collectionId: kollektionen[0]?.id ?? 0, anlass: "", zielgruppe: "", kurz: "", text: "", preisCent: 3900, groesse: "flach", packMinuten: 6,
        bestseller: false, aktiv: false, sichtbarVon: null, sichtbarBis: null, sortierung: 10, band: "oliv", seoTitel: "", seoBeschreibung: "", artikel: [],
        verpackung: verpackungJeGroesse.flach.map(([packagingId, menge]) => ({ packagingId, menge })),
      };
  return (
    <Seite
      titel={b ? b.box.name : "Neue Box"}
      hinweis={b ? `${b.kollektion} · /boxen/${b.box.slug}` : "Neue Boxen sind zunächst inaktiv – erst aktivieren, wenn Inhalt, Preis und Bilder stimmen."}
      aktionen={<>{b ? <AKnopf href={`/boxen/${b.box.slug}`} hell>Im Shop ansehen</AKnopf> : null}<AKnopf href="/admin/boxen" hell>Zur Liste</AKnopf></>}
    >
      <BoxEditor
        key={b?.box.updatedAt.toISOString() ?? "neu"}
        start={start}
        kollektionen={kollektionen}
        artikel={artikel.map((a) => ({ id: a.id, text: `${a.marke} ${a.name}, ${a.groesse}`, preisCent: a.preisCent, gewichtGramm: a.gewichtGramm, laden: a.laden, alkohol: a.alkohol, aktiv: a.aktiv }))}
        verpackung={verpackung.filter((v) => v.art !== "versand").map((v) => ({ id: v.id, name: v.name, preisCent: v.preisCent, einheit: v.einheit, gewichtGramm: v.gewichtGramm }))}
        standardVerpackung={verpackungJeGroesse}
        gebuehren={e.gebuehren}
        mindestmenge={e.mindestmenge}
        margen={e.margen}
        bandfarben={e.personalisierung.bandfarben}
      />
      {b ? (
        <Block titel="Bilder" className="mt-2">
          <p className="klein mb-4 max-w-[70ch] text-dunkel">
            Gerenderte Beispielbilder tragen im Shop den Hinweis „Beispielabbildung – echte Fotos folgen“. Ersetzen Sie ein Bild durch ein eigenes Foto, verschwindet der Hinweis bei diesem Bild. Fotos werden automatisch in AVIF und WebP in vier Größen umgerechnet.
          </p>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {b.bilder.map((bild) => (
              <div key={bild.id} className="border border-salbei p-3">
                <Bild bild={bild} sizes="(min-width: 1024px) 28vw, 90vw" className="aspect-[4/3] w-full object-cover" />
                <p className="klein mt-2">
                  <strong>{ART_NAME[bild.art] ?? bild.art}</strong> · {bild.platzhalter ? "Beispielabbildung" : "eigenes Foto"}
                </p>
                <Formular aktion={bildHochladen} className="mt-2 space-y-2">
                  <input type="hidden" name="boxId" value={b.box.id} />
                  <input type="hidden" name="bildId" value={bild.id} />
                  <input type="hidden" name="art" value={bild.art} />
                  <label className="nur-sr" htmlFor={`d-${bild.id}`}>Foto für {ART_NAME[bild.art]}</label>
                  <FotoEingabe id={`d-${bild.id}`} />
                  <label className="nur-sr" htmlFor={`alt-${bild.id}`}>Bildbeschreibung</label>
                  <input id={`alt-${bild.id}`} name="alt" defaultValue={bild.alt} className={feldKlein} />
                  <Absenden>Durch Foto ersetzen</Absenden>
                </Formular>
                <Formular aktion={bildLoeschen} bestaetigen="Dieses Bild entfernen?" className="mt-1">
                  <input type="hidden" name="bildId" value={bild.id} />
                  <Absenden className="textlink klein">Entfernen</Absenden>
                </Formular>
              </div>
            ))}
            <div className="border border-dashed border-salbei p-3">
              <p className="klein font-semibold">Weiteres Foto hinzufügen</p>
              <Formular aktion={bildHochladen} leeren className="mt-2 space-y-2">
                <input type="hidden" name="boxId" value={b.box.id} />
                <label className="nur-sr" htmlFor="d-neu">Foto</label>
                <FotoEingabe id="d-neu" />
                <label className="feldname" htmlFor="alt-neu">Bildbeschreibung (Alt-Text)</label>
                <input id="alt-neu" name="alt" className={feldKlein} placeholder={`Geschenkbox „${b.box.name}“ …`} />
                <Absenden>Hochladen</Absenden>
              </Formular>
            </div>
          </div>
        </Block>
      ) : null}
    </Seite>
  );
}
