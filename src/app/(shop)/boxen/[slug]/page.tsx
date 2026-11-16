import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Bild } from "@/components/bild";
import { BoxKarte } from "@/components/shop/box-karte";
import { Brotkrumen } from "@/components/shop/brotkrumen";
import { JsonLd } from "@/components/shop/jsonld";
import { Haken, Pfeil, Plus } from "@/components/shop/zeichen";
import { datumLang, lieferStatus, plusTage } from "@/lib/calc/deadlines";
import { euro, gramm } from "@/lib/geld";
import { ladeEinstellungen } from "@/lib/server/einstellungen";
import { ladeKatalog } from "@/lib/server/katalog";
import { absolut, SITE_URL } from "@/lib/site";

export const ensureStatic = "navigation";

export async function generateStaticParams() {
  const { boxen } = await ladeKatalog();
  return boxen.length ? boxen.map((b) => ({ slug: b.slug })) : [{ slug: "weihnachtskiste" }];
}

export async function generateMetadata({ params }: PageProps<"/boxen/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const { boxen } = await ladeKatalog();
  const box = boxen.find((b) => b.slug === slug);
  if (!box) return { title: "Box nicht gefunden", robots: { index: false } };
  return {
    title: { absolute: box.seoTitel || `${box.name} – Geschenkbox für ${euro(box.preisCent)}` },
    description: box.seoBeschreibung || box.text.slice(0, 155),
    alternates: { canonical: `/boxen/${box.slug}` },
    openGraph: { title: box.seoTitel || box.name, description: box.seoBeschreibung || box.kurz, url: `/boxen/${box.slug}`, type: "website" },
  };
}

const GROESSE = { klein: "24 × 17 × 7 cm", flach: "30,5 × 21,5 × 7,5 cm", mittel: "30,5 × 21,5 × 10 cm", gross: "33 × 24 × 10 cm" } as const;

export default async function BoxSeite({ params }: PageProps<"/boxen/[slug]">) {
  const { slug } = await params;
  const [{ boxen, heute }, e] = await Promise.all([ladeKatalog(), ladeEinstellungen()]);
  const box = boxen.find((b) => b.slug === slug);
  if (!box) notFound();
  const andere = boxen.filter((b) => b.kollektionSlug === box.kollektionSlug && b.slug !== box.slug).slice(0, 3);
  const hatBeispiel = box.bilder.some((b) => b.platzhalter);
  const [haupt, ...weitere] = box.bilder;
  const v = lieferStatus("versand", heute, e.fristen);
  const p = e.personalisierung;
  const teile = box.inhalt.reduce((s, x) => s + x.menge, 0);
  const ungeprueft = box.inhalt.some((x) => x.kategorie !== "Non-Food" && x.allergene == null);
  const bildUrl = (b: (typeof box.bilder)[number]) => {
    const w = Object.entries(b.varianten.webp).sort((a, c) => Number(c[0]) - Number(a[0]))[0]?.[1];
    return w ? (w.startsWith("http") ? w : absolut(w)) : undefined;
  };

  return (
    <div className="rand pb-24 pt-8 lg:pt-12">
      <Brotkrumen pfad={[["Alle Boxen", "/boxen"], [box.kollektionName, `/kollektionen/${box.kollektionSlug}`], [box.name, `/boxen/${box.slug}`]]} />

      <div className="raster mt-6 gap-y-10 lg:mt-10">
        {/* Galerie */}
        <div className="col-span-12 lg:col-span-7">
          {haupt ? (
            <>
              <div className="overflow-hidden rounded-[2px] bg-salbei/25">
                <Bild bild={haupt} sizes="(min-width: 1024px) 56vw, 92vw" prio className="aspect-[4/3] w-full object-cover" />
              </div>
              {weitere.length ? (
                <div className="mt-3 grid grid-cols-2 gap-3">
                  {weitere.map((b, i) => (
                    <div key={i} className="overflow-hidden rounded-[2px] bg-salbei/25">
                      <Bild bild={b} sizes="(min-width: 1024px) 28vw, 46vw" className="aspect-square w-full object-cover" />
                    </div>
                  ))}
                </div>
              ) : null}
              {hatBeispiel ? <p className="label mt-3 text-dunkel">Beispielabbildung – echte Fotos folgen</p> : null}
            </>
          ) : (
            <div className="flex aspect-[4/3] items-center justify-center rounded-[2px] bg-salbei/35" role="img" aria-label="Abbildung folgt">
              <span className="label text-dunkel">Abbildung folgt</span>
            </div>
          )}
        </div>

        {/* Kaufbereich */}
        <div className="col-span-12 lg:col-span-5 lg:pl-4">
          <p className="label text-dunkel">
            <Link href={`/kollektionen/${box.kollektionSlug}`} className="no-underline hover:underline">{box.kollektionName}</Link>
            {box.anlass && box.anlass !== box.kollektionName ? ` · ${box.anlass}` : ""}
          </p>
          <h1 className="mt-3 !text-[clamp(2.2rem,1.6rem+2.8vw,3.75rem)] text-oliv">{box.name}</h1>
          <p className="lead mt-4">{box.kurz}</p>

          <div className="mt-7 flex items-end justify-between gap-4 border-y border-salbei py-5">
            <div>
              <p className="zahl font-serif text-[3rem] leading-none text-dunkel">{euro(box.preisCent)}</p>
              <p className="klein mt-2">je Box · ohne Umsatzsteuer (§&nbsp;19 UStG) · zzgl. Versand</p>
            </div>
            <p className="klein text-right">ab {e.mindestmenge}&nbsp;Boxen,<br />mischbar</p>
          </div>

          <Link href={`/bestellen?box=${box.slug}`} className="knopf mt-6 w-full">
            Diese Box bestellen <Pfeil />
          </Link>
          <p className="klein mt-3">
            {e.fristen.aktiv && v.verfuegbar && v.saison ? (
              <>Bestellschluss für den Versand: <strong>{datumLang(e.fristen.versand.bestellschluss)}</strong>, Zustellung bis {datumLang(e.fristen.versand.lieferungBis)}.</>
            ) : v.verfuegbar ? (
              <>Versand innerhalb von {e.fristen.vorlaufVersandWerktage}&nbsp;Werktagen, persönliche Lieferung in der Region.</>
            ) : (
              <>Der Bestellschluss für den Versand ist vorbei. <Link href="/#anfrage" className="textlink">Kurz anfragen</Link>, ob noch etwas geht.</>
            )}
          </p>

          <ul className="klein mt-7 space-y-2.5">
            {["Logo-Sticker auf dem Deckel und gedruckte Grußkarte inklusive", box.alkohol ? "Auf Wunsch ohne Alkohol – gleicher Preis" : "Ohne Alkohol", `Versandgewicht ca. ${gramm(Math.ceil((box.gewichtGramm + e.versand.einzelUmkartonGramm) / 100) * 100)}, Karton ${GROESSE[box.groesse]}`].map((t) => (
              <li key={t} className="flex gap-3"><Haken className="mt-1 h-4 w-4 shrink-0 text-oliv" /> <span>{t}</span></li>
            ))}
          </ul>

          <table className="klein zahl mt-8 w-full">
            <caption className="label mb-2 text-left text-dunkel">Preis nach Menge</caption>
            <tbody>
              <tr className="border-t border-salbei">
                <th scope="row" className="py-2 text-left font-normal">{e.mindestmenge}–{e.staffeln[0] ? e.staffeln[0].ab - 1 : ""} Boxen</th>
                <td className="py-2 text-right">{euro(box.preisCent, { immerCent: true })}</td>
              </tr>
              {e.staffeln.map((s, i) => (
                <tr key={s.ab} className="border-t border-salbei last:border-b">
                  <th scope="row" className="py-2 text-left font-normal">{e.staffeln[i + 1] ? `${s.ab}–${e.staffeln[i + 1].ab - 1}` : `ab ${s.ab}`} Boxen <span className="text-dunkel">(−{String(s.prozent).replace(".", ",")}&nbsp;%)</span></th>
                  <td className="py-2 text-right">{euro(Math.round(box.preisCent * (1 - s.prozent / 100)), { immerCent: true })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Beschreibung + Inhalt */}
      <div className="raster mt-16 gap-y-12 border-t border-salbei pt-12 lg:mt-24 lg:pt-16">
        <div className="col-span-12 lg:col-span-5">
          <h2 className="!text-[clamp(1.75rem,1.4rem+1.6vw,2.6rem)] text-oliv">Was drin ist – <em>und warum</em></h2>
          <p className="mass mt-5">{box.text}</p>
          <p className="klein mt-5"><strong>Gedacht für:</strong> {box.zielgruppe}</p>
        </div>
        <div className="col-span-12 lg:col-span-6 lg:col-start-7">
          <h2 className="label text-dunkel !font-sans">Inhalt · {teile}&nbsp;Teile</h2>
          <ul className="mt-3 border-t border-salbei">
            {box.inhalt.map((a) => (
              <li key={a.id} className="border-b border-salbei">
                <details className="group">
                  <summary className="flex items-start justify-between gap-4 py-4">
                    <span>
                      <span className="font-semibold">{a.menge > 1 ? `${a.menge} × ` : ""}{a.marke} {a.name}</span>
                      <span className="klein block text-dunkel">{a.groesse}{a.alkohol ? ` · enthält Alkohol${a.alkoholVol ? ` (${a.alkoholVol})` : ""}` : ""}</span>
                    </span>
                    <span className="klein flex shrink-0 items-center gap-2 pt-0.5 text-dunkel">
                      <span className="hidden sm:inline">Zutaten &amp; Allergene</span>
                      <Plus className="h-4 w-4 transition-transform duration-200 group-open:rotate-45" />
                    </span>
                  </summary>
                  <div className="klein mass space-y-2 pb-5">
                    {a.kategorie === "Non-Food" ? (
                      <p>Kein Lebensmittel.</p>
                    ) : a.allergene != null ? (
                      <>
                        <p><strong>Allergene:</strong> {a.allergene || "keine deklarationspflichtigen Allergene"}</p>
                        {a.zutaten ? <p><strong>Zutaten:</strong> {a.zutaten}</p> : null}
                        <p>Angaben laut Hersteller. Maßgeblich ist die Kennzeichnung auf der Packung, die Rezepturen können sich ändern.</p>
                      </>
                    ) : (
                      <p>Original verpackt und vom Hersteller gekennzeichnet. Die vollständige Zutaten- und Allergenliste dieses Artikels schicken wir Ihnen vor der Bestellung gern zu – <Link href="/#anfrage" className="textlink">kurze Nachricht genügt</Link>. Maßgeblich ist die Kennzeichnung auf der Packung.</p>
                    )}
                    {a.ersatzOhneAlkohol ? <p><strong>Ohne Alkohol:</strong> stattdessen {a.ersatzOhneAlkohol.marke} {a.ersatzOhneAlkohol.name}, {a.ersatzOhneAlkohol.groesse}.</p> : null}
                    <p><strong>Haltbarkeit:</strong> {a.mhd}</p>
                  </div>
                </details>
              </li>
            ))}
          </ul>
          <p className="klein mt-4">
            Dazu: Karton aus Wellpappe, Holzwolle, Baumwollband, Grußkarte und Sticker.{ungeprueft ? "" : " Alle Angaben laut Hersteller."} Ist ein Artikel im Markt nicht zu bekommen, ersetzen wir ihn nach Rücksprache durch einen gleichwertigen.
          </p>
        </div>
      </div>

      {/* Personalisierung */}
      <section className="raster mt-16 gap-y-8 border-t border-salbei pt-12 lg:mt-24 lg:pt-16" aria-labelledby="perso">
        <h2 id="perso" className="col-span-12 !text-[clamp(1.75rem,1.4rem+1.6vw,2.6rem)] text-oliv lg:col-span-5">So wird es <em>Ihre</em> Box</h2>
        <dl className="col-span-12 grid gap-x-8 sm:grid-cols-2 lg:col-span-6 lg:col-start-7">
          {[
            ["Logo-Sticker", "inklusive", "Rund, 5 cm, auf dem Deckel. Logo als PNG, JPG, SVG oder PDF."],
            ["Grußkarte", "inklusive", `Gedruckt, mit Ihrem Text (bis ${p.grusstextMaxZeichen} Zeichen).`],
            ["Handgeschriebene Karte", `+ ${euro(p.handgeschrieben.preisCent, { immerCent: true })}`, "Jede Karte einzeln mit Fineliner geschrieben."],
            ["Banderole mit Logo", `+ ${euro(p.banderole.preisCent, { immerCent: true })}`, "Papierstreifen um die Box, bedruckt mit Ihrem Logo."],
            ["Namensanhänger", `+ ${euro(p.namensanhaenger.preisCent, { immerCent: true })}`, "Kraft-Anhänger mit dem Namen des Empfängers am Band."],
            ["Bandfarbe", "inklusive", p.bandfarben.map((b) => b.name).join(", ") + "."],
          ].map(([name, preis, text]) => (
            <div key={name} className="border-t border-salbei py-4">
              <dt className="flex items-baseline justify-between gap-3 font-semibold">{name} <span className="zahl klein whitespace-nowrap text-dunkel">{preis}</span></dt>
              <dd className="klein mt-1">{text}</dd>
            </div>
          ))}
        </dl>
      </section>

      {andere.length ? (
        <section className="mt-16 border-t border-salbei pt-12 lg:mt-24 lg:pt-16" aria-labelledby="andere">
          <h2 id="andere" className="!text-[clamp(1.75rem,1.4rem+1.6vw,2.6rem)] text-oliv">Auch aus „{box.kollektionName}“</h2>
          <div className="raster mt-8 gap-y-12">
            {andere.map((b) => (
              <div key={b.slug} className="col-span-12 sm:col-span-6 lg:col-span-4"><BoxKarte box={b} /></div>
            ))}
          </div>
        </section>
      ) : null}

      {/* Kaufleiste am Handy: bleibt sichtbar, wenn der Knopf oben aus dem Bild gescrollt ist */}
      <div className="fussleiste nicht-drucken fixed inset-x-0 bottom-0 z-20 border-t border-salbei bg-creme lg:hidden">
        <div className="rand flex items-center gap-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
          <p className="min-w-0 flex-1 leading-tight">
            <span className="zahl font-serif text-[1.375rem] leading-none">{euro(box.preisCent)}</span>
            <span className="klein block truncate text-dunkel">je Box · ab {e.mindestmenge}&nbsp;Stück</span>
          </p>
          <Link href={`/bestellen?box=${box.slug}`} className="knopf shrink-0 !px-5">Bestellen <Pfeil /></Link>
        </div>
      </div>
      <JsonLd
        daten={{
          "@context": "https://schema.org",
          "@type": "Product",
          name: `Geschenkbox „${box.name}“`,
          description: box.text,
          sku: box.slug,
          category: `Geschenkboxen > ${box.kollektionName}`,
          brand: { "@type": "Brand", name: "Dankeskiste" },
          image: box.bilder.map(bildUrl).filter(Boolean),
          audience: { "@type": "BusinessAudience", name: "Unternehmen" },
          offers: {
            "@type": "Offer",
            url: absolut(`/boxen/${box.slug}`),
            price: (box.preisCent / 100).toFixed(2),
            priceCurrency: "EUR",
            priceValidUntil: plusTage(heute, 90),
            availability: v.verfuegbar ? "https://schema.org/InStock" : "https://schema.org/PreOrder",
            itemCondition: "https://schema.org/NewCondition",
            eligibleCustomerType: "https://schema.org/Business",
            eligibleQuantity: { "@type": "QuantitativeValue", minValue: e.mindestmenge, unitCode: "C62" },
            seller: { "@id": `${SITE_URL}/#organisation` },
            shippingDetails: {
              "@type": "OfferShippingDetails",
              shippingRate: { "@type": "MonetaryAmount", value: ((e.versand.stufen.find((s) => box.gewichtGramm + e.versand.einzelUmkartonGramm <= s.bisGramm) ?? e.versand.stufen[0]).preisCent / 100).toFixed(2), currency: "EUR" },
              shippingDestination: { "@type": "DefinedRegion", addressCountry: "DE" },
              deliveryTime: {
                "@type": "ShippingDeliveryTime",
                handlingTime: { "@type": "QuantitativeValue", minValue: 2, maxValue: e.fristen.vorlaufVersandWerktage, unitCode: "DAY" },
                transitTime: { "@type": "QuantitativeValue", minValue: 1, maxValue: 3, unitCode: "DAY" },
              },
            },
          },
        }}
      />
    </div>
  );
}
