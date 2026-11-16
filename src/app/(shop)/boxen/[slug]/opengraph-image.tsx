import { euro } from "@/lib/geld";
import { ogBild, ogGroesse } from "@/lib/og";
import { ladeKatalog } from "@/lib/server/katalog";

export const alt = "Geschenkbox von Dankeskiste";
export const size = ogGroesse;
export const contentType = "image/png";

export async function generateStaticParams() {
  const { boxen } = await ladeKatalog();
  return boxen.length ? boxen.map((b) => ({ slug: b.slug })) : [{ slug: "weihnachtskiste" }];
}

export default async function Bild({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { boxen } = await ladeKatalog();
  const box = boxen.find((b) => b.slug === slug);
  if (!box) return ogBild({ label: "Geschenkbox", titel: "Dankeskiste" });
  return ogBild({ label: `${box.kollektionName} · ${euro(box.preisCent)} je Box`, titel: "", kursiv: box.name, unter: box.kurz });
}
