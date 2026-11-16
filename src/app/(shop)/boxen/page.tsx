import type { Metadata } from "next";
import Link from "next/link";
import { BoxKarte } from "@/components/shop/box-karte";
import { Brotkrumen } from "@/components/shop/brotkrumen";
import { euro } from "@/lib/geld";
import { ladeEinstellungen } from "@/lib/server/einstellungen";
import { ladeKatalog } from "@/lib/server/katalog";

export const ensureStatic = "navigation";

export const metadata: Metadata = {
  title: "Alle Geschenkboxen für Firmen",
  description: "Alle Geschenkboxen für Mitarbeiter und Kunden im Überblick: von 29 bis 75 €, ab 5 Stück, mit Logo-Sticker und Grußkarte. Von Hand gepackt.",
  alternates: { canonical: "/boxen" },
};

export default async function Boxen() {
  const [{ boxen, kollektionen }, e] = await Promise.all([ladeKatalog(), ladeEinstellungen()]);
  return (
    <div className="rand pb-24 pt-8 lg:pt-12">
      <Brotkrumen pfad={[["Alle Boxen", "/boxen"]]} />
      <div className="raster mt-8 gap-y-6 lg:mt-12">
        <h1 className="col-span-12 !text-[clamp(2.4rem,1.7rem+3.4vw,4.5rem)] text-oliv lg:col-span-7">
          {boxen.length} Boxen, <em>alle von Hand</em> gepackt
        </h1>
        <p className="lead col-span-12 lg:col-span-4 lg:col-start-9 lg:pt-4">
          Ab {e.mindestmenge}&nbsp;Stück, frei mischbar. Preise je Box ohne Umsatzsteuer (§&nbsp;19 UStG), Logo-Sticker und Grußkarte inklusive.
        </p>
      </div>
      <nav aria-label="Kollektionen" className="mt-10 flex flex-wrap gap-2 border-y border-salbei py-4">
        {kollektionen.map((k) => (
          <a key={k.slug} href={`#${k.slug}`} className="klein rounded-[2px] border border-salbei px-3 py-2 no-underline hover:border-dunkel">
            {k.name}
          </a>
        ))}
      </nav>
      {kollektionen.map((k) => {
        const ks = boxen.filter((b) => b.kollektionSlug === k.slug);
        return (
          <section key={k.slug} id={k.slug} className="scroll-mt-24 pt-16 lg:pt-24" aria-labelledby={`t-${k.slug}`}>
            <div className="mb-10 flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
              <div>
                <h2 id={`t-${k.slug}`} className="text-oliv">{k.name}</h2>
                <p className="mt-3 max-w-[56ch]">{k.kurz}</p>
              </div>
              <Link href={`/kollektionen/${k.slug}`} className="textlink">
                Zur Kollektion · ab {euro(Math.min(...ks.map((b) => b.preisCent)))}
              </Link>
            </div>
            <div className="raster gap-y-12">
              {ks.map((b) => (
                <div key={b.slug} className="col-span-12 sm:col-span-6 lg:col-span-4">
                  <BoxKarte box={b} />
                </div>
              ))}
            </div>
          </section>
        );
      })}
      <div className="mt-20 border-t border-salbei pt-8">
        <p className="lead max-w-[50ch]">
          Nichts Passendes dabei oder mehr als 250 Stück? <Link href="/#anfrage" className="textlink">Fragen Sie eine eigene Zusammenstellung an.</Link>
        </p>
      </div>
    </div>
  );
}
