import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BoxKarte } from "@/components/shop/box-karte";
import { Brotkrumen } from "@/components/shop/brotkrumen";
import { Pfeil } from "@/components/shop/zeichen";
import { datumLang, lieferStatus } from "@/lib/calc/deadlines";
import { euro } from "@/lib/geld";
import { ladeEinstellungen } from "@/lib/server/einstellungen";
import { ladeKatalog } from "@/lib/server/katalog";

export const ensureStatic = "navigation";

export async function generateStaticParams() {
  const { kollektionen } = await ladeKatalog();
  return kollektionen.length ? kollektionen.map((k) => ({ slug: k.slug })) : [{ slug: "weihnachten" }];
}

const SEO: Record<string, { titel: string; text: string }> = {
  weihnachten: { titel: "Weihnachtsgeschenke für Mitarbeiter und Kunden", text: "Weihnachtsboxen für Firmen von 29 bis 69 €: von Hand gepackt, mit Logo und Grußkarte. Bestellschluss für den Versand: 10. Dezember." },
  mitarbeiter: { titel: "Geschenkboxen für Mitarbeiter", text: "Mitarbeitergeschenke für Onboarding, Jubiläum, Geburtstag und Projektabschluss. Ab 5 Stück, mit Logo, auch direkt ins Homeoffice." },
  kunden: { titel: "Kundengeschenke unter 50 €", text: "Geschenkboxen für Kunden und Geschäftspartner: beide unter 50 €, mit Ihrem Logo und Grußkarte. Versand deutschlandweit." },
};

export async function generateMetadata({ params }: PageProps<"/kollektionen/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const { kollektionen } = await ladeKatalog();
  const k = kollektionen.find((x) => x.slug === slug);
  if (!k) return { title: "Kollektion nicht gefunden", robots: { index: false } };
  return {
    title: SEO[slug]?.titel ?? `${k.name} – Geschenkboxen für Firmen`,
    description: SEO[slug]?.text ?? `${k.name}: ${k.kurz} Von Hand gepackt in Schwetzingen, mit Logo und Grußkarte.`.slice(0, 155),
    alternates: { canonical: `/kollektionen/${slug}` },
  };
}

export default async function Kollektion({ params }: PageProps<"/kollektionen/[slug]">) {
  const { slug } = await params;
  const [{ kollektionen, boxen, heute }, e] = await Promise.all([ladeKatalog(), ladeEinstellungen()]);
  const k = kollektionen.find((x) => x.slug === slug);
  if (!k) notFound();
  const ks = boxen.filter((b) => b.kollektionSlug === slug);
  const istSaison = slug === e.saison.kollektionSlug && e.fristen.aktiv;
  const v = lieferStatus("versand", heute, e.fristen);
  return (
    <div className="rand pb-24 pt-8 lg:pt-12">
      <Brotkrumen pfad={[["Alle Boxen", "/boxen"], [k.name, `/kollektionen/${k.slug}`]]} />
      <div className="raster mt-8 gap-y-6 lg:mt-12">
        <div className="col-span-12 lg:col-span-7">
          <p className="label text-dunkel">Kollektion · {ks.length}&nbsp;{ks.length === 1 ? "Box" : "Boxen"} · ab {euro(Math.min(...ks.map((b) => b.preisCent)))}</p>
          <h1 className="mt-4 !text-[clamp(2.4rem,1.7rem+3.4vw,4.5rem)] text-oliv">{k.name}</h1>
        </div>
        <div className="col-span-12 lg:col-span-4 lg:col-start-9 lg:pt-10">
          <p>{k.beschreibung}</p>
          {istSaison && v.verfuegbar && v.saison ? (
            <p className="mt-4 border-l-2 border-dunkel pl-4">
              Bestellschluss Versand: <strong>{datumLang(e.fristen.versand.bestellschluss)}</strong> · persönliche Lieferung: <strong>{datumLang(e.fristen.persoenlich.bestellschluss)}</strong>
            </p>
          ) : null}
        </div>
      </div>
      <div className="raster mt-14 gap-y-14 border-t border-salbei pt-12">
        {ks.map((b, i) => (
          <div key={b.slug} className={ks.length > 2 && i === 0 ? "col-span-12 lg:col-span-8" : ks.length > 2 && i === 1 ? "col-span-12 sm:col-span-6 lg:col-span-4 lg:pt-20" : "col-span-12 sm:col-span-6 lg:col-span-4"}>
            <BoxKarte box={b} ebene="h2" gross={ks.length > 2 && i === 0} prio={i === 0} sizes={ks.length > 2 && i === 0 ? "(min-width: 1024px) 62vw, 92vw" : undefined} />
          </div>
        ))}
      </div>
      <div className="mt-20 flex flex-wrap items-center justify-between gap-6 border-t border-salbei pt-8">
        <p className="lead max-w-[46ch]">Ab {e.mindestmenge}&nbsp;Boxen, frei mischbar – auch mit Boxen aus anderen Kollektionen.</p>
        <Link href="/bestellen" className="knopf">Bestellung starten <Pfeil /></Link>
      </div>
    </div>
  );
}
