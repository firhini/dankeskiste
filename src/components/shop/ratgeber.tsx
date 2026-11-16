import Link from "next/link";
import type { ReactNode } from "react";
import type { ShopBox } from "@/lib/server/katalog";
import { BoxKarte } from "./box-karte";
import { Brotkrumen } from "./brotkrumen";
import { Faq, type Frage } from "./faq";
import { Pfeil } from "./zeichen";

export function Ratgeber({ label, titel, vorspann, pfad, name, children, boxen, boxenTitel, fragen, schluss }: {
  label: string;
  titel: ReactNode;
  vorspann: string;
  pfad: string;
  name: string;
  children: ReactNode;
  boxen: ShopBox[];
  boxenTitel: ReactNode;
  fragen: Frage[];
  schluss: string;
}) {
  return (
    <div className="rand pb-24 pt-8 lg:pt-12">
      <Brotkrumen pfad={[[name, pfad]]} />
      <header className="raster mt-8 gap-y-6 lg:mt-12">
        <div className="col-span-12 lg:col-span-8">
          <p className="label text-dunkel">{label}</p>
          <h1 className="mt-4 !text-[clamp(2.3rem,1.6rem+3.4vw,4.5rem)] text-oliv">{titel}</h1>
        </div>
        <p className="lead col-span-12 lg:col-span-7">{vorspann}</p>
      </header>

      <div className="raster mt-12 gap-y-12 border-t border-salbei pt-12 lg:mt-16">
        <article className="col-span-12 space-y-5 lg:col-span-7 [&_h2]:!mt-12 [&_h2]:!text-[clamp(1.6rem,1.3rem+1.3vw,2.25rem)] [&_h2]:text-dunkel [&_h2:first-child]:!mt-0 [&_li]:mt-2 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:max-w-[65ch] [&_table]:w-full [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:max-w-[62ch]">
          {children}
        </article>
        <aside className="col-span-12 lg:col-span-4 lg:col-start-9">
          <div className="border border-dunkel p-6 lg:sticky lg:top-24">
            <p className="font-serif text-[1.75rem] leading-tight text-dunkel">In zehn Minuten bestellt</p>
            <ul className="klein mt-4 space-y-2">
              <li>Ab 5 Boxen, frei mischbar</li>
              <li>Logo-Sticker und Grußkarte inklusive</li>
              <li>Versand deutschlandweit oder persönliche Lieferung</li>
              <li>Keine Umsatzsteuer (§&nbsp;19 UStG)</li>
            </ul>
            <Link href="/bestellen" className="knopf mt-6 w-full">Bestellung starten <Pfeil /></Link>
            <Link href="/#anfrage" className="textlink klein mt-4 inline-block">Lieber erst ein Angebot anfragen</Link>
          </div>
        </aside>
      </div>

      {boxen.length ? (
        <section className="mt-20 border-t border-salbei pt-12" aria-labelledby="rg-boxen">
          <h2 id="rg-boxen" className="!text-[clamp(1.75rem,1.4rem+1.6vw,2.6rem)] text-oliv">{boxenTitel}</h2>
          <div className="raster mt-8 gap-y-12">
            {boxen.slice(0, 3).map((b) => (
              <div key={b.slug} className="col-span-12 sm:col-span-6 lg:col-span-4"><BoxKarte box={b} /></div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="raster mt-20 gap-y-8 border-t border-salbei pt-12" aria-labelledby="rg-faq">
        <h2 id="rg-faq" className="col-span-12 !text-[clamp(1.75rem,1.4rem+1.6vw,2.6rem)] text-oliv lg:col-span-4">Kurz gefragt</h2>
        <div className="col-span-12 lg:col-span-7 lg:col-start-6"><Faq fragen={fragen} /></div>
      </section>

      <div className="mt-20 flex flex-wrap items-center justify-between gap-6 border-t border-salbei pt-8">
        <p className="lead max-w-[46ch]">{schluss}</p>
        <Link href="/bestellen" className="knopf">Jetzt bestellen <Pfeil /></Link>
      </div>
    </div>
  );
}
