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

export function BoxKarte({ box, sizes = "(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 92vw", gross = false, prio = false }: { box: ShopBox; sizes?: string; gross?: boolean; prio?: boolean }) {
  return (
    <article className="group relative flex h-full flex-col">
      <div className="overflow-hidden rounded-[2px] bg-salbei/25">
        <BoxBild box={box} sizes={sizes} prio={prio} className={`${gross ? "aspect-[4/3] lg:aspect-[16/11]" : "aspect-[4/3]"} w-full transition-transform duration-500 ease-out group-hover:scale-[1.02]`} />
      </div>
      <div className="mt-4 flex items-baseline justify-between gap-4 border-b border-salbei pb-3">
        <h3 className={gross ? "!text-[clamp(1.6rem,1.3rem+1.4vw,2.4rem)]" : "!text-[1.5rem]"}>
          <Link href={`/boxen/${box.slug}`} className="no-underline after:absolute after:inset-0">
            {box.name}
          </Link>
        </h3>
        <p className="zahl whitespace-nowrap font-serif text-[1.5rem] leading-none text-dunkel">{euro(box.preisCent)}</p>
      </div>
      <p className="klein mt-3 max-w-[46ch]">{box.kurz}</p>
      <p className="label mt-3 text-dunkel">
        {box.inhalt.reduce((s, x) => s + x.menge, 0)}&nbsp;Teile{box.alkohol ? " · auch ohne Alkohol" : " · ohne Alkohol"}
      </p>
    </article>
  );
}
