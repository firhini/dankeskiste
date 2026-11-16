import { ogBild, ogGroesse } from "@/lib/og";

export const alt = "Firmengeschenke mit Logo – Dankeskiste";
export const size = ogGroesse;
export const contentType = "image/png";

export default function Bild() {
  return ogBild({ label: "Personalisierung", titel: "Firmengeschenke", kursiv: "mit Logo", unter: "Sticker und Grußkarte inklusive – schon ab 5 Boxen." });
}
