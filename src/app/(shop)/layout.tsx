import { Einwilligung } from "@/components/shop/consent";
import { Fuss } from "@/components/shop/fuss";
import { KampagneMerken } from "@/components/shop/kampagne";
import { Kopf } from "@/components/shop/kopf";
import { ladeEinstellungen } from "@/lib/server/einstellungen";
import { ladeKatalog } from "@/lib/server/katalog";

export default async function ShopLayout({ children }: LayoutProps<"/">) {
  const [katalog, e] = await Promise.all([ladeKatalog(), ladeEinstellungen()]);
  const kollektionen = katalog.kollektionen.map((k) => ({ slug: k.slug, name: k.name }));
  return (
    <>
      <a href="#inhalt" className="sprunglink">
        Zum Inhalt springen
      </a>
      <Kopf kollektionen={kollektionen} />
      <main id="inhalt" className="papier">
        {children}
      </main>
      <Fuss kontakt={e.kontakt} kollektionen={kollektionen} />
      <KampagneMerken />
      <Einwilligung />
    </>
  );
}
