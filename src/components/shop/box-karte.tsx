import Link from "next/link";
import { Bild } from "@/components/bild";
import { euro } from "@/lib/geld";
import type { ShopBox } from "@/lib/server/katalog";

export function BoxBild({ box, art = "hero", sizes, prio, className = "" }: { box: ShopBox; art?: string; sizes: string; prio?: boolean; className?: string }) {
  const bild = box.bilder.find((b) => b.art === art) ?? box.bilder[0];
  if (!bild) {
    return (
      <div className={`flex items-center justify-center bg-salbei/35 ${className}`} role="img" aria-label={`Abbildung der Box „${box.name}“ folgt`}>
        <span className="label text-dunkel">Abbildung folgt</span>
      </div>
    );
  }
  return <Bild bild={bild} sizes={sizes} prio={prio} className={`object-cover ${className}`} />;
}

/**
 * Marke am Bild. „Bestseller“ steht bei Boxen, die nach echten Bestellungen vorn liegen;
 * solange es dazu keine Zahlen gibt, heißt die im Admin gesetzte Auszeichnung „Beliebt“.
 */
export function BoxMarke({ box, className = "" }: { box: ShopBox; className?: string }) {
  if (!box.bestseller) return null;
  return <span className={`stempelmarke ${className}`}>{box.bestsellerRang !== null && box.bestsellerRang <= 3 ? "Bestseller" : "Beliebt"}</span>;
}

export function BoxKarte({ box, sizes = "(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 92vw", gross = false, prio = false, ebene = "h3", kompakt = false }: { box: ShopBox; sizes?: string; gross?: boolean; prio?: boolean; ebene?: "h2" | "h3"; /** Am Handy schmal (zwei Karten nebeneinander): Name und Preis untereinander, ohne Beschreibung */ kompakt?: boolean }) {
  const Titel = ebene;
  return (
    <article className="group relative flex h-full flex-col">
      <div className="relative overflow-hidden rounded-[2px] bg-salbei/25">
        <BoxMarke box={box} className="absolute left-2.5 top-2.5 z-10" />
        <BoxBild box={box} sizes={sizes} prio={prio} className={`${gross ? "aspect-[4/3] lg:aspect-[16/11]" : "aspect-[4/3]"} w-full transition-transform duration-500 ease-out group-hover:scale-[1.02]`} />
      </div>
      <div className={`mt-4 flex justify-between border-b border-salbei pb-3 ${kompakt ? "flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-4" : "items-baseline gap-4"}`}>
        <Titel className={kompakt ? `!text-[1.1875rem] !leading-[1.2] !tracking-[-0.01em] sm:!text-[1.5rem] sm:!leading-[1.15] ${gross ? "lg:!text-[clamp(1.6rem,1.3rem+1.4vw,2.4rem)]" : ""}` : gross ? "!text-[clamp(1.6rem,1.3rem+1.4vw,2.4rem)] !leading-[1.15] !tracking-[-0.012em]" : "!text-[1.5rem] !leading-[1.15] !tracking-[-0.012em]"}>
          <Link href={`/boxen/${box.slug}`} className="no-underline after:absolute after:inset-0">
            {box.name}
          </Link>
        </Titel>
        <p className={`zahl whitespace-nowrap font-serif leading-none text-dunkel ${kompakt ? "text-[1.1875rem] sm:text-[1.5rem]" : "text-[1.5rem]"}`}>{euro(box.preisCent)}</p>
      </div>
      <p className={`klein mt-3 max-w-[46ch] ${kompakt ? "hidden sm:block" : ""}`}>{box.kurz}</p>
      <p className={`label mt-3 text-dunkel ${kompakt ? "hidden sm:block" : ""}`}>
        {box.inhalt.reduce((s, x) => s + x.menge, 0)}&nbsp;Teile{box.alkohol ? " · auch ohne Alkohol" : " · ohne Alkohol"}
      </p>
    </article>
  );
}
