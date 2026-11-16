import { euro } from "@/lib/geld";
import { ogBild, ogGroesse } from "@/lib/og";
import { ladeKatalog } from "@/lib/server/katalog";

export const alt = "Kollektion von Dankeskiste";
export const size = ogGroesse;
export const contentType = "image/png";

export async function generateStaticParams() {
  const { kollektionen } = await ladeKatalog();
  return kollektionen.length ? kollektionen.map((k) => ({ slug: k.slug })) : [{ slug: "weihnachten" }];
}

export default async function Bild({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { kollektionen, boxen } = await ladeKatalog();
  const k = kollektionen.find((x) => x.slug === slug);
  if (!k) return ogBild({ label: "Kollektion", titel: "Dankeskiste" });
  const ks = boxen.filter((b) => b.kollektionSlug === slug);
  return ogBild({ label: `Kollektion · ${ks.length} Boxen ab ${euro(Math.min(...ks.map((b) => b.preisCent)))}`, titel: "Geschenkboxen", kursiv: k.name, unter: k.kurz });
}
